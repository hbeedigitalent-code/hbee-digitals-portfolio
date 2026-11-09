// Negative-authorization tests for the privileged /api routes. Offline: the REAL requireActiveAdmin() and the REAL
// 2FA-cookie signer/verifier run; only their I/O (session lookup, cookies, database) is replaced.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const exists = (f) => fs.existsSync(path.join(root, f))
// Line-based: drops whole comment lines only, so a stray "/*" inside a string or path can never swallow real code.
const stripComments = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

const ADMIN = '11111111-1111-4111-8111-111111111111'
const OTHER = '22222222-2222-4222-8222-222222222222'
const realNow = Date.now()
const state = { user: null, cookie: undefined, adminRow: null, adminErr: null, secret: 'unit-test-secret-not-a-real-one', serviceKey: 'svc-placeholder', now: null }
const log = []

class FakeDate extends Date { static now() { return state.now ?? realNow } }
const env = new Proxy({}, { get: (_, k) => ({ ADMIN_2FA_COOKIE_SECRET: state.secret || undefined, SUPABASE_SERVICE_ROLE_KEY: state.serviceKey || undefined, NEXT_PUBLIC_SUPABASE_URL: 'http://db.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', NODE_ENV: 'test' })[k] })

function makeDb() {
  return {
    from(table) {
      const q = {
        select(columns) { log.push({ table, select: columns }); return q },
        eq() { return q }, order() { return q }, limit() { return q }, gte() { return q }, not() { return q },
        async maybeSingle() { return table === 'admin_users' ? { data: state.adminRow, error: state.adminErr } : { data: null, error: null } },
        then(resolve) { resolve({ data: [], error: null, count: 0 }) },
      }
      return q
    },
  }
}

function makeLoader() {
  const cache = new Map()
  const db = makeDb()
  const anon = makeDb()
  function load(relative) {
    let file = path.resolve(root, relative)
    if (!path.extname(file)) file += '.ts'
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }; cache.set(file, mod)
    const requireFn = (name) => {
      if (name === 'next/server') return { NextResponse: class extends Response { static json(value, options) { return Response.json(value, options) } } }
      if (name === 'next/headers') return { cookies: () => ({ get: (n) => (n === 'admin_2fa_verified' && state.cookie !== undefined ? { value: state.cookie } : undefined) }) }
      if (name === '@/lib/supabase-server') return { createServerSupabaseClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user } }) } }) }
      if (name === '@/lib/supabase') return { supabase: anon }
      if (name === '@supabase/supabase-js') return { createClient: () => db }
      if (name.startsWith('@/')) return load('src/' + name.slice(2))
      return require(name)
    }
    const js = ts.transpileModule(read(path.relative(root, file)), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
    vm.runInNewContext(js, {
      require: requireFn, module: mod, exports: mod.exports, console: { error() {}, log: console.log, warn() {} }, process: { env }, Response, Request, URL, Date: FakeDate,
      crypto: require('node:crypto').webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob, Map, Set, JSON, Promise, Buffer, setTimeout,
    }, { filename: file })
    return mod.exports
  }
  return { load, anon }
}

async function signFor(loader, userId) { return loader.load('src/lib/admin-2fa-cookie.ts').signAdmin2FACookie(userId) }

/** Each scenario: how the request looks, and the one response a safe system must give. */
const SCENARIOS = [
  { name: 'unauthenticated', setup: async () => { state.user = null }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'ordinary authenticated user (no 2FA cookie)', setup: async () => { state.user = { id: OTHER } }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'admin with a forged 2FA cookie', setup: async () => { state.user = { id: ADMIN }; state.cookie = 'forged.cookie' }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'admin presenting a cookie signed for a different user', setup: async (l) => { state.user = { id: ADMIN }; state.cookie = await signFor(l, OTHER) }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'admin with an expired 2FA cookie', setup: async (l) => { state.user = { id: ADMIN }; state.cookie = await signFor(l, ADMIN); state.now = realNow + 13 * 3600e3 }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'incomplete 2FA (cookie missing for a real admin)', setup: async () => { state.user = { id: ADMIN }; state.adminRow = { user_id: ADMIN } }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'signing secret missing (fails closed)', setup: async (l) => { state.user = { id: ADMIN }; state.cookie = await signFor(l, ADMIN); state.secret = '' }, status: 401, error: 'Not authenticated', reads: 0 },
  { name: 'valid 2FA but no admin_users row (client / non-admin role)', setup: async (l) => { state.user = { id: OTHER }; state.cookie = await signFor(l, OTHER); state.adminRow = null }, status: 403, error: 'Not authorized', adminLookupOnly: true },
  { name: 'valid 2FA but the admin lookup errors', setup: async (l) => { state.user = { id: ADMIN }; state.cookie = await signFor(l, ADMIN); state.adminErr = { code: 'XX000' } }, status: 403, error: 'Not authorized', adminLookupOnly: true },
  { name: 'valid admin but the privileged client is unavailable', setup: async (l) => { state.user = { id: ADMIN }; state.cookie = await signFor(l, ADMIN); state.serviceKey = '' }, status: 500, error: 'Server configuration error', reads: 0 },
]

function resetState() { Object.assign(state, { user: null, cookie: undefined, adminRow: null, adminErr: null, secret: 'unit-test-secret-not-a-real-one', serviceKey: 'svc-placeholder', now: null }); log.length = 0 }

const ROUTES = [
  { name: 'GET /api/backup', file: 'src/app/api/backup/route.ts', call: (m) => m.GET() },
  { name: 'GET /api/analytics', file: 'src/app/api/analytics/route.ts', call: (m) => m.GET() },
  { name: 'POST /api/export', file: 'src/app/api/export/route.ts', call: (m) => m.POST(new Request('https://x.test/api/export', { method: 'POST', body: JSON.stringify({ table: 'services', format: 'json' }) })) },
]

async function main() {
  let checks = 0
  /* ── Every denial scenario, against every protected route ─────────────────── */
  for (const route of ROUTES) {
    for (const sc of SCENARIOS) {
      resetState()
      const loader = makeLoader()
      await sc.setup(loader)
      const mod = loader.load(route.file)
      const res = await route.call(mod)
      const body = await res.json()
      const label = `${route.name} — ${sc.name}`
      assert.equal(res.status, sc.status, `${label}: status`)
      assert.deepEqual(body, { error: sc.error }, `${label}: a generic body and nothing else (no table names, codes or hints)`)
      const dataReads = log.filter((e) => e.table !== 'admin_users')
      assert.equal(dataReads.length, 0, `${label}: no data was read before authorization`)
      assert.equal(loader.anon === undefined || true, true)
      if (sc.reads === 0) assert.equal(log.length, 0, `${label}: nothing at all was queried (2FA is checked before any admin_users read)`)
      if (sc.adminLookupOnly) assert.deepEqual([...new Set(log.map((e) => e.table))], ['admin_users'], `${label}: only the membership lookup ran`)
      checks++
    }
  }

  /* ── 401 and "incomplete 2FA" are indistinguishable from "no session" ─────── */
  {
    const bodies = new Set()
    for (const i of [0, 1, 5]) { resetState(); const l = makeLoader(); await SCENARIOS[i].setup(l); bodies.add(JSON.stringify(await (await l.load('src/app/api/backup/route.ts').GET()).json())) }
    assert.equal(bodies.size, 1, 'no session, no cookie and a real admin without the cookie all produce the identical response')
  }

  /* ── Permitted admin behaviour is preserved ──────────────────────────────── */
  resetState()
  let loader = makeLoader()
  state.user = { id: ADMIN }; state.cookie = await signFor(loader, ADMIN); state.adminRow = { user_id: ADMIN }
  let res = await loader.load('src/app/api/backup/route.ts').GET()
  assert.equal(res.status, 200); assert.deepEqual(await res.json(), { posts: [] })
  const backupSelect = log.find((e) => e.table === 'blog_posts').select
  assert.notEqual(backupSelect, '*'); assert.ok(!/\*/.test(backupSelect), 'an explicit column list, never *')
  assert.ok(!/email|password|token|secret|author/i.test(backupSelect), 'no credential or contact column is exported')
  assert.ok(/content/.test(backupSelect) && /slug/.test(backupSelect), 'the content fields a backup needs are present')

  resetState(); loader = makeLoader()
  state.user = { id: ADMIN }; state.cookie = await signFor(loader, ADMIN); state.adminRow = { user_id: ADMIN }
  res = await loader.load('src/app/api/analytics/route.ts').GET()
  assert.equal(res.status, 200); const analytics = await res.json()
  assert.equal(analytics.success, true); assert.equal(analytics.chartData.length, 30)
  assert.deepEqual(Object.keys(analytics.stats).sort(), ['blog', 'messages', 'projects', 'subscribers'])
  assert.ok(!JSON.stringify(analytics).includes('@'), 'aggregates only: no address or message text in the response')
  assert.deepEqual([...new Set(log.map((e) => e.table))].sort(), ['admin_users', 'blog_posts', 'contact_submissions', 'portfolio_items', 'subscribers'])

  resetState(); loader = makeLoader()
  state.user = { id: ADMIN }; state.cookie = await signFor(loader, ADMIN); state.adminRow = { user_id: ADMIN }
  res = await loader.load('src/app/api/export/route.ts').POST(new Request('https://x.test/api/export', { method: 'POST', body: JSON.stringify({ table: 'not_a_table' }) }))
  assert.equal(res.status, 400, 'an authorised admin still cannot export an arbitrary table'); assert.deepEqual(await res.json(), { error: 'Unsupported export table' })
  assert.equal(log.filter((e) => e.table !== 'admin_users').length, 0)
  console.log(`  ${checks} denial scenarios across ${ROUTES.length} routes passed; permitted-admin behaviour preserved`)

  /* ── The removed routes are really gone ─────────────────────────────────── */
  assert.ok(!exists('src/app/api/sitemap'), 'POST /api/sitemap (unauthenticated file write) is removed')
  assert.ok(!exists('src/app/api/google-analytics'), 'the fabricated-metrics endpoint is removed')
  assert.ok(!exists('public/sitemap.xml'), 'no static sitemap file shadows the generated one')
  assert.ok(exists('src/app/sitemap.ts'), 'the sitemap is still generated by app/sitemap.ts')
  function walk(d) { return fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name])) }
  for (const f of walk('src/app/api').filter((x) => x.endsWith('.ts'))) assert.ok(!/fs\/promises|writeFile|writeFileSync|from 'fs'/.test(read(f)), `${f}: no API route writes to the filesystem`)
  assert.ok(!/api\/sitemap/.test(stripComments(read('src/app/admin/seo/page.tsx'))), 'the SEO page no longer calls the removed route')
  assert.doesNotMatch(stripComments(read('src/app/api/backup/route.ts')), /createServerSupabaseClient|@\/lib\/supabase'/, 'backup no longer reads as the anonymous / caller role')
  assert.doesNotMatch(stripComments(read('src/app/api/analytics/route.ts')), /@\/lib\/supabase'/, 'analytics no longer uses the anonymous client')

  /* ── Coverage: no privileged route is left unguarded ────────────────────── */
  // Routes that are intentionally reachable without the admin gate, each with the reason and the control that replaces it.
  const OTHER_CONTROL = {
    '/api/admin/logout': 'only clears the caller\'s own 2FA cookie',
    '/api/growth-assessment': 'public form: Turnstile + rate limit + payload validation',
    '/api/contact': 'public form: Turnstile + rate limit', '/api/onboarding': 'public form: Turnstile + rate limit', '/api/subscribe': 'public form: Turnstile + rate limit',
    '/api/unsubscribe': 'signed token', '/api/track-click': 'signed email tracking', '/api/track-open': 'signed email tracking',
    '/api/auth/confirm': 'one-time Supabase token', '/api/portal-invitation/open': 'one-time invitation token (no session)', '/api/portal-invitation/accept': 'signed-in user + verified invitation',
    '/api/account/provision': 'signed-in user, identity from the session only',
    '/api/cron/email-events': 'cron secret', '/api/cron/uploads/cleanup': 'cron secret',
    '/api/uploads/initiate': 'authorizeUploadTarget (admin+2FA or owning client)', '/api/uploads/finalize': 'authorizeUploadTarget', '/api/uploads/cancel': 'authorizeUploadTarget',
  }
  const routes = walk('src/app/api').filter((x) => x.endsWith('route.ts')).map((f) => ({ f, route: f.replace('src/app', '').replace('/route.ts', ''), src: stripComments(read(f)) }))
  const problems = []
  for (const { f, route, src } of routes) {
    if (route.startsWith('/api/client-portal/')) {
      if (!/auth\.getUser\(\)/.test(src)) problems.push(`${route}: client-portal route without a session check`)
      continue
    }
    if (OTHER_CONTROL[route]) continue
    if (route.startsWith('/api/admin/2fa/')) { if (!/auth\.getUser\(\)/.test(src) || !/admin_users/.test(src)) problems.push(`${route}: 2FA route without session + admin membership`); continue }
    if (route.startsWith('/api/notifications')) { if (!/verifyAdmin2FACookie/.test(src) || !/auth\.getUser\(\)/.test(src)) problems.push(`${route}: notifications without session + 2FA cookie`); continue }
    const shared = /from '@\/lib\/admin-api-auth'/.test(src) && /requireActiveAdmin\(\)/.test(src)
    const inline = /verifyAdmin2FACookie/.test(src) && /admin_users/.test(src) && /auth\.getUser\(\)/.test(src)
    if (!shared && !inline) problems.push(`${route}: privileged route with NO verified admin + 2FA guard (${f})`)
    if (shared) {
      const gate = src.indexOf('requireActiveAdmin()'), firstData = src.search(/\.from\(|\.rpc\(/)
      if (firstData !== -1 && gate > firstData) problems.push(`${route}: reads data before the admin gate runs`)
    }
  }
  assert.deepEqual(problems, [], 'authorization coverage problems:\n' + problems.join('\n'))
  const inlineCopies = routes.filter(({ route, src }) => route.startsWith('/api/admin/') && !route.startsWith('/api/admin/2fa/') && !(/from '@\/lib\/admin-api-auth'/.test(src) && /requireActiveAdmin\(\)/.test(src)) && route !== '/api/admin/logout')
  console.log(`  coverage: ${routes.length} routes classified; ${inlineCopies.length} admin routes still carry their own inline copy of the gate (verified present, not yet consolidated)`)

  console.log('PASS: negative authorization - unauthenticated, ordinary user, forged / foreign / expired / missing 2FA, non-admin role, failed lookup and missing config are all denied with generic 401/403/500 before any data read; permitted admin behaviour preserved; unauthenticated sitemap write and fake analytics removed; every privileged route has a verified guard.')
}
main().catch((e) => { console.error(e); process.exit(1) })
