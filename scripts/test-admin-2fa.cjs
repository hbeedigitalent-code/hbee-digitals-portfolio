// Offline tests for mandatory admin 2FA enrollment. The REAL 2FA routes, policy, cookie signer and admin gate run, with real
// speakeasy TOTP codes; only the session lookup, cookies, database and rate limiter are replaced.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const speakeasy = require('speakeasy')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const ADMIN = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'

const state = { user: null, adminRow: null, twoFA: null, twoFAReadError: false, cookie: undefined, policy: undefined, rateOk: true, retryAfter: 120 }
const log = []   // { table, op, payload? }

const envObj = () => ({ ADMIN_2FA_COOKIE_SECRET: 'unit-test-secret-not-real', SUPABASE_SERVICE_ROLE_KEY: 'svc', NEXT_PUBLIC_SUPABASE_URL: 'http://db.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', NODE_ENV: 'test', ADMIN_2FA_ENROLLMENT: state.policy })
const env = new Proxy({}, { get: (_, k) => envObj()[k] })

class NextResponse extends Response {
  constructor(body, init) { super(body, init); this.setCookies = []; this.cookies = { set: (n, v, o) => this.setCookies.push({ name: n, value: v, options: o }) } }
  static json(value, options) { return new NextResponse(JSON.stringify(value), { ...options, headers: { 'content-type': 'application/json', ...((options && options.headers) || {}) } }) }
}

function makeDb() {
  return {
    from(table) {
      const q = {
        _op: 'select',
        select() { log.push({ table, op: 'select' }); return q },
        eq() { return q }, order() { return q }, limit() { return q },
        update(payload) { q._op = 'update'; log.push({ table, op: 'update', payload }); if (state.twoFA) Object.assign(state.twoFA, payload); return q },
        insert(payload) { q._op = 'insert'; log.push({ table, op: 'insert', payload }); state.twoFA = { id: 't1', user_id: ADMIN, ...payload }; return q },
        async maybeSingle() {
          if (table === 'admin_users') return { data: state.adminRow, error: null }
          if (table === 'admin_2fa') return state.twoFAReadError ? { data: null, error: { code: 'XX000' } } : { data: state.twoFA ? { ...state.twoFA } : null, error: null }
          return { data: null, error: null }
        },
        then(resolve) { resolve({ data: null, error: null }) },
      }
      return q
    },
  }
}

function makeLoader() {
  const cache = new Map(); const db = makeDb()
  function load(relative) {
    let file = path.resolve(root, relative); if (!path.extname(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }; cache.set(file, mod)
    const requireFn = (name) => {
      if (name === 'next/server') return { NextResponse }
      if (name === 'next/headers') return { cookies: () => ({ get: (n) => (n === 'admin_2fa_verified' && state.cookie !== undefined ? { value: state.cookie } : undefined) }) }
      if (name === '@/lib/supabase-server') return { createServerSupabaseClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) }
      if (name === '@/lib/rate-limit') return { checkRateLimit: async () => (state.rateOk ? { ok: true, degraded: false } : { ok: false, retryAfterSeconds: state.retryAfter, degraded: false }) }
      if (name === '@supabase/supabase-js') return { createClient: () => db }
      if (name.startsWith('@/')) return load('src/' + name.slice(2))
      return require(name)
    }
    const js = ts.transpileModule(read(path.relative(root, file)), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, { require: requireFn, module: mod, exports: mod.exports, console: { error() {}, warn() {}, log: console.log }, process: { env }, Response, Request, URL, Date, crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob, Map, Set, JSON, Promise, Buffer, setTimeout }, { filename: file })
    return mod.exports
  }
  return { load }
}

function reset() { Object.assign(state, { user: { id: ADMIN, email: 'admin@hbee.test' }, adminRow: { user_id: ADMIN }, twoFA: null, twoFAReadError: false, cookie: undefined, policy: undefined, rateOk: true, retryAfter: 120 }); log.length = 0 }
const signed = (loader, uid = ADMIN) => loader.load('src/lib/admin-2fa-cookie.ts').signAdmin2FACookie(uid)
const post = (body) => new Request('https://x.test/api', { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })
const writes = () => log.filter((e) => e.table === 'admin_2fa' && e.op !== 'select')
const cookieOf = (res) => res.setCookies.find((c) => c.name === 'admin_2fa_verified')
const totp = (secret) => speakeasy.totp({ secret, encoding: 'base32' })

async function main() {
  let n = 0
  const ok = (c, m) => { assert.ok(c, m); n++ }
  const eq = (a, b, m) => { assert.equal(a, b, m); n++ }

  /* ── Policy (pure) ──────────────────────────────────────────────────────── */
  const L0 = makeLoader(); const policy = L0.load('src/lib/admin-2fa-policy.ts')
  eq(policy.enrollmentPolicy({}), 'required', 'unset means required'); eq(policy.enrollmentPolicy({ ADMIN_2FA_ENROLLMENT: 'optional' }), 'optional')
  for (const v of ['OPTIONAL', 'false', '0', 'off', '', 'no', 'true']) eq(policy.enrollmentPolicy({ ADMIN_2FA_ENROLLMENT: v }), 'required', `"${v}" does not relax the policy: only the exact word "optional" does`)
  const decide = (readFailed, enabled, pol) => policy.decideTwoFactorStatus({ readFailed, enabled, policy: pol }).kind
  eq(decide(true, true, 'required'), 'error'); eq(decide(true, false, 'optional'), 'error', 'an unreadable record fails closed even under the opt-out')
  eq(decide(false, true, 'required'), 'challenge'); eq(decide(false, true, 'optional'), 'challenge')
  eq(decide(false, false, 'required'), 'enroll'); eq(decide(false, false, 'optional'), 'stamp')
  eq(typeof policy.generateBackupCodes, 'undefined', 'no backup-code generator exists: backup codes are not issued')

  /* ── /status ────────────────────────────────────────────────────────────── */
  const status = async (setup) => { reset(); const l = makeLoader(); if (setup) await setup(l); const res = await l.load('src/app/api/admin/2fa/status/route.ts').GET(); return { res, body: await res.json() } }
  let r = await status(() => { state.user = null }); eq(r.res.status, 401)
  r = await status(() => { state.adminRow = null }); eq(r.res.status, 403); eq(cookieOf(r.res), undefined)
  r = await status(() => { state.twoFAReadError = true }); eq(r.res.status, 500, 'an unreadable admin_2fa record fails CLOSED'); eq(cookieOf(r.res), undefined, 'and stamps nothing')
  r = await status(() => { state.policy = 'optional'; state.twoFAReadError = true }); eq(r.res.status, 500, 'even under the opt-out'); eq(cookieOf(r.res), undefined)
  r = await status(() => { state.twoFA = { secret: 's', is_enabled: true } }); eq(r.res.status, 200); assert.deepEqual(r.body, { enabled: true, ready: false, enrollmentRequired: false }); eq(cookieOf(r.res), undefined, 'enabled: a code is required, nothing is stamped')
  r = await status(); assert.deepEqual(r.body, { enabled: false, ready: false, enrollmentRequired: true }); eq(cookieOf(r.res), undefined, 'THE FIX: an admin with no 2FA record is NOT stamped as verified'); n++
  r = await status(() => { state.twoFA = { secret: 's', is_enabled: false } }); eq(r.body.enrollmentRequired, true); eq(cookieOf(r.res), undefined, 'a record that is switched off counts as not enrolled')
  r = await status(() => { state.policy = 'optional' }); assert.deepEqual(r.body, { enabled: false, ready: true, enrollmentRequired: false }); ok(cookieOf(r.res), 'only the explicit opt-out keeps the legacy stamp')

  /* ── /setup: replacing an ENABLED factor needs a completed verification ──── */
  const setup = async (prep) => { reset(); const l = makeLoader(); if (prep) await prep(l); const res = await l.load('src/app/api/admin/2fa/setup/route.ts').POST(); return { res, body: await res.json() } }
  r = await setup(() => { state.user = null }); eq(r.res.status, 401)
  r = await setup(() => { state.adminRow = null }); eq(r.res.status, 403); eq(log.filter((e) => e.table === 'admin_2fa').length, 0, 'a non-admin never touches admin_2fa')
  r = await setup(() => { state.twoFA = { secret: 'VICTIM', is_enabled: true } }); eq(r.res.status, 403, 'password-only session cannot replace an enabled secret'); eq(writes().length, 0); eq(state.twoFA.secret, 'VICTIM', 'the victim secret is untouched')
  r = await setup(() => { state.twoFA = { secret: 'VICTIM', is_enabled: true }; state.cookie = 'forged.cookie' }); eq(r.res.status, 403); eq(state.twoFA.secret, 'VICTIM')
  r = await setup(async (l) => { state.twoFA = { secret: 'VICTIM', is_enabled: true }; state.cookie = await signed(l, OTHER) }); eq(r.res.status, 403, 'a cookie for another user does not count'); eq(state.twoFA.secret, 'VICTIM')
  r = await setup(async (l) => { state.twoFA = { secret: 'OLD', is_enabled: true }; state.cookie = await signed(l) }); eq(r.res.status, 200, 'a verified admin may rotate'); eq(writes()[0].op, 'update'); eq(writes()[0].payload.is_enabled, false)
  r = await setup(); eq(r.res.status, 200, 'first-time enrollment needs no cookie: that is how the cookie is earned'); eq(writes()[0].op, 'insert'); ok(r.body.secret && r.body.qrCode.startsWith('data:image'), 'secret + QR returned')
  r = await setup(() => { state.twoFA = { secret: null, is_enabled: false } }); eq(r.res.status, 200); eq(writes()[0].op, 'update')
  r = await setup(() => { state.twoFAReadError = true }); eq(r.res.status, 500); assert.deepEqual(r.body, { success: false, error: 'Setup failed' }); eq(writes().length, 0, 'a failed read never falls through to a write')

  /* ── /disable ───────────────────────────────────────────────────────────── */
  const disable = async (prep) => { reset(); const l = makeLoader(); if (prep) await prep(l); const res = await l.load('src/app/api/admin/2fa/disable/route.ts').POST(); return { res, body: await res.json() } }
  r = await disable(() => { state.twoFA = { secret: 'S', is_enabled: true } }); eq(r.res.status, 403); eq(r.body.error, policy.TWO_FACTOR_MESSAGES.mandatory); eq(writes().length, 0, 'password-only session cannot switch 2FA off')
  r = await disable(async (l) => { state.twoFA = { secret: 'S', is_enabled: true }; state.cookie = await signed(l) }); eq(r.res.status, 403, 'even a verified admin cannot switch it off while enrollment is mandatory'); eq(writes().length, 0); eq(state.twoFA.is_enabled, true)
  r = await disable(() => { state.policy = 'optional'; state.twoFA = { secret: 'S', is_enabled: true } }); eq(r.res.status, 403); eq(r.body.error, policy.TWO_FACTOR_MESSAGES.verifyFirst); eq(writes().length, 0, 'under the opt-out it still needs a completed verification')
  r = await disable(async (l) => { state.policy = 'optional'; state.twoFA = { secret: 'S', is_enabled: true }; state.cookie = await signed(l) }); eq(r.res.status, 200); eq(writes().length, 1)
  r = await disable(() => { state.adminRow = null }); eq(r.res.status, 403); eq(writes().length, 0)

  /* ── /verify (enrollment confirmation) and /login ───────────────────────── */
  const call = async (file, body, prep) => { reset(); const l = makeLoader(); if (prep) await prep(l); const res = await l.load(file).POST(post(body)); return { res, body: await res.json() } }
  const secret = speakeasy.generateSecret().base32
  r = await call('src/app/api/admin/2fa/verify/route.ts', { token: '000000' }, () => { state.twoFA = { secret, is_enabled: false } }); eq(r.res.status, 400); eq(cookieOf(r.res), undefined); eq(writes().length, 0, 'a wrong code enables nothing')
  r = await call('src/app/api/admin/2fa/verify/route.ts', { token: totp(secret) }, () => { state.twoFA = { secret, is_enabled: false } }); eq(r.res.status, 200); ok(cookieOf(r.res), 'proof of the code issues the verified cookie'); eq(writes()[0].payload.is_enabled, true); assert.deepEqual(Object.keys(r.body).sort(), ['success'], 'the response carries no backup codes'); assert.deepEqual(Object.keys(writes()[0].payload).sort(), ['is_enabled', 'updated_at'], 'enabling writes is_enabled only: no backup_codes'); n += 2
  r = await call('src/app/api/admin/2fa/verify/route.ts', { token: totp(secret) }, () => { state.twoFA = null }); eq(r.res.status, 400, 'no secret has been issued yet')
  r = await call('src/app/api/admin/2fa/verify/route.ts', { token: totp(secret) }, () => { state.twoFA = { secret, is_enabled: false }; state.rateOk = false }); eq(r.res.status, 429); ok(r.res.headers.get('retry-after')); eq(cookieOf(r.res), undefined); eq(log.filter((e) => e.table === 'admin_2fa').length, 0, 'rate limited before the secret is even read')
  r = await call('src/app/api/admin/2fa/login/route.ts', { token: totp(secret) }, () => { state.twoFA = { secret, is_enabled: true } }); eq(r.res.status, 200); ok(cookieOf(r.res))
  r = await call('src/app/api/admin/2fa/login/route.ts', { token: '123456' }, () => { state.twoFA = { secret, is_enabled: true } }); eq(r.res.status, 400); eq(cookieOf(r.res), undefined)
  r = await call('src/app/api/admin/2fa/login/route.ts', { token: totp(secret) }, () => { state.twoFA = { secret, is_enabled: true }; state.rateOk = false }); eq(r.res.status, 429, 'a correct code is still refused once the account is rate limited'); eq(cookieOf(r.res), undefined); eq(log.filter((e) => e.table === 'admin_2fa').length, 0)
  r = await call('src/app/api/admin/2fa/login/route.ts', { token: totp(secret) }, () => { state.twoFA = { secret, is_enabled: false } }); eq(r.res.status, 400, 'login does not issue a cookie for an un-enrolled account')

  /* ── End to end: password-only attacker vs enrolled victim ──────────────── */
  {
    reset(); const l = makeLoader()
    state.twoFA = { secret: 'VICTIM-SECRET', is_enabled: true }   // victim enrolled; attacker has the password (a session) but no code and no cookie
    const s1 = await l.load('src/app/api/admin/2fa/setup/route.ts').POST(); eq(s1.status, 403, 'attack step 1: replace the secret')
    const d1 = await l.load('src/app/api/admin/2fa/disable/route.ts').POST(); eq(d1.status, 403, 'attack step 2: switch 2FA off')
    const st = await (await l.load('src/app/api/admin/2fa/status/route.ts').GET()).json(); assert.deepEqual(st, { enabled: true, ready: false, enrollmentRequired: false }); n++
    const priv = await l.load('src/app/api/backup/route.ts').GET(); eq(priv.status, 401, 'attack step 3: the privileged API is still closed')
    eq(state.twoFA.secret, 'VICTIM-SECRET'); eq(state.twoFA.is_enabled, true); eq(writes().length, 0, 'nothing was changed')
  }

  /* ── End to end: mandatory enrollment of an un-enrolled admin ───────────── */
  {
    reset(); const l = makeLoader()
    eq((await l.load('src/app/api/backup/route.ts').GET()).status, 401, 'before enrollment: no admin API access')
    const st = await (await l.load('src/app/api/admin/2fa/status/route.ts').GET()).json(); eq(st.enrollmentRequired, true)
    const su = await l.load('src/app/api/admin/2fa/setup/route.ts').POST(); const { secret: newSecret } = await su.json(); eq(su.status, 200)
    eq((await l.load('src/app/api/backup/route.ts').GET()).status, 401, 'after setup but before proving a code: still closed')
    const bad = await l.load('src/app/api/admin/2fa/verify/route.ts').POST(post({ token: '000000' })); eq(bad.status, 400)
    eq((await l.load('src/app/api/backup/route.ts').GET()).status, 401, 'a wrong code opens nothing')
    const good = await l.load('src/app/api/admin/2fa/verify/route.ts').POST(post({ token: totp(newSecret) })); eq(good.status, 200)
    const issued = cookieOf(good); ok(issued)
    state.cookie = issued.value   // the browser now holds the cookie
    const after = await l.load('src/app/api/backup/route.ts').GET(); eq(after.status, 200, 'after completing enrollment the admin has full access'); ok(Array.isArray((await after.json()).posts))
    eq(state.twoFA.is_enabled, true)
    const again = await l.load('src/app/api/admin/2fa/disable/route.ts').POST(); eq(again.status, 403, 'and cannot turn it back off')
  }

  /* ── Source guarantees ──────────────────────────────────────────────────── */
  const challenge = read('src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx')
  ok(/result\.enrollmentRequired \? 'enroll-intro' : 'code-required'/.test(challenge), 'the challenge page enrols when the SERVER says so')
  const codeLines = (f) => read(f).split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
  for (const f of ['src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx', 'src/app/admin/profile/page.tsx', 'src/app/api/admin/2fa/verify/route.ts', 'src/app/api/admin/2fa/setup/route.ts', 'src/lib/admin-2fa-policy.ts']) ok(!/backupCodes|backup_codes|generateBackupCodes|backup code/i.test(codeLines(f)), f + ': backup codes are not generated, returned, stored or shown anywhere')
  ok(!/backup/i.test(codeLines('src/app/admin/profile/page.tsx')), 'the Profile page no longer lists backup codes')
  ok(challenge.includes('.replace(/\\D/g,'), 'the code input strips non-digits (it stripped the letter D before)')
  ok(/checkRateLimit\('adminTotp', user\.id\)/.test(read('src/app/api/admin/2fa/login/route.ts')) && /checkRateLimit\('adminTotp', user\.id\)/.test(read('src/app/api/admin/2fa/verify/route.ts')), 'TOTP attempts are limited per account')
  ok(/adminTotp: \{ requests: 8, window: '10 m' \}/.test(read('src/lib/rate-limit.ts')))
  for (const f of ['setup', 'verify', 'disable', 'login']) ok(!/error\.message|updateError\.message/.test(read(`src/app/api/admin/2fa/${f}/route.ts`).split('\n').filter((l) => /NextResponse\.json/.test(l)).join('\n')), `${f}: database error text is not echoed to the client`)
  ok(!/admin_2fa[\s\S]{0,40}ALTER|CREATE TABLE/i.test(read('src/lib/admin-2fa-policy.ts')), 'no schema change is part of this work')

  console.log(`PASS: mandatory admin 2FA - ${n} checks. Un-enrolled admins are never stamped; unreadable 2FA state fails closed; setup/disable cannot be used with a password-only session; TOTP attempts are rate limited; backup codes are neither issued nor shown; full enrollment flow and bypass attempt exercised end to end with real TOTP codes.`)
}
main().catch((e) => { console.error(e); process.exit(1) })
