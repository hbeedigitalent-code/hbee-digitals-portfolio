// S6.2 — Portal access vs connected-client access: behaviour tests.
//
// OFFLINE. The REAL route handlers, the REAL shared resolver (src/lib/client-portal/portal-client.ts), the REAL
// provisioning, upload authorization, invitation code, notification helper, rate-limit table, redirect and
// signup-response helpers all run. Only I/O is replaced: the session, an in-memory database that mimics the
// Supabase query builder, storage, and the rate-limit counter backend.
//
// WHAT THIS DOES NOT PROVE: anything that lives in the real database — RLS, grants, constraints, the SQL bodies
// of link_client_to_merchant() / consume_portal_invitation(), the clients.status CHECK. The two RPCs are modelled
// in JavaScript below from their documented behaviour. Run the read-only preflight SQL for those.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const nodeCrypto = require('node:crypto')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const stripComments = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

let passed = 0
const failures = []
async function test(name, fn) {
  try {
    await fn()
    passed++
    console.log('  ok   ' + name)
  } catch (error) {
    failures.push({ name, error })
    console.log('  FAIL ' + name + '\n       ' + String(error && error.message).split('\n').join('\n       '))
  }
}

// ───────────────────────────────────────────────────────────── fixtures ──
const uuid = () => nodeCrypto.randomUUID()
const USER_A = uuid(), USER_B = uuid(), USER_NEW = uuid(), ADMIN = uuid()
const CLIENT_A = uuid(), CLIENT_B = uuid(), CLIENT_NEW = uuid()
const MERCHANT_A = uuid(), MERCHANT_B = uuid(), MERCHANT_FREE = uuid()

const state = {}
function resetState() {
  Object.assign(state, {
    user: null,
    admin: false,
    noService: false,
    cookies: {},
    tables: {},
    failures: {},
    uniques: { projects: ['project_id'], clients: [] },
    rl: {},
    notificationsFail: false,
    authUsers: {},
  })
  const t = state.tables
  t.clients = [
    { id: CLIENT_A, user_id: USER_A, merchant_id: MERCHANT_A, status: 'Active', full_name: 'Alice A', business_name: 'A Co', email: 'a@a.test' },
    { id: CLIENT_B, user_id: USER_B, merchant_id: MERCHANT_B, status: 'Active', full_name: 'Bob B', business_name: 'B Co', email: 'b@b.test' },
    { id: CLIENT_NEW, user_id: USER_NEW, merchant_id: null, status: 'Active', full_name: 'Nina New', business_name: 'New Co', email: 'new@new.test' },
  ]
  t.merchants = [
    { id: MERCHANT_A, business_name: 'A Co', email: 'a@a.test' },
    { id: MERCHANT_B, business_name: 'B Co', email: 'b@b.test' },
    { id: MERCHANT_FREE, business_name: 'Free Co', email: 'new@new.test' },
  ]
  t.projects = [
    { id: 'aaaaaaaa-0000-4000-8000-000000000001', client_id: CLIENT_A, project_id: 'PROJ-AAAA1111', project_name: 'A site', status: 'Active', progress: 10 },
    { id: 'bbbbbbbb-0000-4000-8000-000000000001', client_id: CLIENT_B, project_id: 'PROJ-BBBB1111', project_name: 'B secret', status: 'Active', progress: 50 },
  ]
  t.project_files = [
    { id: 'aaaaaaaa-1111-4000-8000-000000000001', client_id: CLIENT_A, project_id: null, file_name: 'a.pdf', file_url: 'client-files/' + CLIENT_A + '/a.pdf' },
    { id: 'bbbbbbbb-1111-4000-8000-000000000001', client_id: CLIENT_B, project_id: null, file_name: 'b-secret.pdf', file_url: 'client-files/' + CLIENT_B + '/b.pdf' },
  ]
  t.proposals = [
    { id: 'aaaaaaaa-2222-4000-8000-000000000001', client_id: CLIENT_A, merchant_id: MERCHANT_A, status: 'sent', title: 'A proposal', proposal_number: 'PROP-A' },
    { id: 'bbbbbbbb-2222-4000-8000-000000000001', client_id: CLIENT_B, merchant_id: MERCHANT_B, status: 'sent', title: 'B secret proposal', proposal_number: 'PROP-B' },
  ]
  t.project_requests = [
    { id: uuid(), client_id: CLIENT_A, title: 'A request', status: 'open' },
    { id: uuid(), client_id: CLIENT_B, title: 'B secret request', status: 'open' },
  ]
  t.project_invoices = [
    { id: uuid(), project_id: 'aaaaaaaa-0000-4000-8000-000000000001', invoice_number: 'INV-A', amount: 10, currency: 'USD', status: 'issued' },
    { id: uuid(), project_id: 'bbbbbbbb-0000-4000-8000-000000000001', invoice_number: 'INV-B-SECRET', amount: 99, currency: 'USD', status: 'sent' },
  ]
  t.growth_assessments = [
    { id: 'aaaaaaaa-3333-4000-8000-000000000001', merchant_id: MERCHANT_A },
    { id: 'bbbbbbbb-3333-4000-8000-000000000001', merchant_id: MERCHANT_B },
  ]
  t.growth_program_decisions = [
    { merchant_id: MERCHANT_A, decision: 'approved', decision_seq: 1, profile_id: 'aaaaaaaa-4444-4000-8000-000000000001', assessment_id: 'aaaaaaaa-3333-4000-8000-000000000001' },
    { merchant_id: MERCHANT_B, decision: 'approved', decision_seq: 1, profile_id: 'bbbbbbbb-4444-4000-8000-000000000001', assessment_id: 'bbbbbbbb-3333-4000-8000-000000000001' },
  ]
  t.growth_profiles = [
    { id: 'aaaaaaaa-4444-4000-8000-000000000001', merchant_id: MERCHANT_A, assessment_id: 'aaaaaaaa-3333-4000-8000-000000000001', title: 'A profile', hgri_score: 61 },
    { id: 'bbbbbbbb-4444-4000-8000-000000000001', merchant_id: MERCHANT_B, assessment_id: 'bbbbbbbb-3333-4000-8000-000000000001', title: 'B SECRET profile', hgri_score: 88 },
  ]
  for (const n of ['project_deliverables', 'project_milestones', 'notifications', 'upload_batches', 'upload_sessions', 'growth_profile_pdfs', 'portal_invitations', 'merchant_accounts']) t[n] = t[n] || []
}

// ───────────────────────────────────────────────── in-memory database ──
function makeDb() {
  const tbl = (n) => (state.tables[n] = state.tables[n] || [])
  function builder(name) {
    const q = { mode: 'select', filters: [], payload: null, lim: null, wantRows: false }
    const clone = (r) => ({ ...r })
    function exec(kind) {
      const failKey = name + ':' + q.mode
      if (state.failures[failKey]) return Promise.resolve({ data: null, error: { code: state.failures[failKey], message: 'forced' } })
      const rows = tbl(name)
      const match = () => rows.filter((r) => q.filters.every((f) => f(r)))
      let out
      if (q.mode === 'insert') {
        const list = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((p) => ({ id: uuid(), created_at: new Date().toISOString(), ...(name === 'clients' ? { status: 'Active' } : {}), ...p }))
        for (const row of list) {
          for (const col of state.uniques[name] || []) {
            if (row[col] != null && rows.some((r) => r[col] === row[col])) return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } })
          }
          if (name === 'notifications' && rows.some((r) => r.idempotency_key && r.idempotency_key === row.idempotency_key)) {
            return Promise.resolve({ data: null, error: { code: '23505', message: 'duplicate' } })
          }
        }
        for (const row of list) rows.push(row)
        out = q.wantRows || kind !== 'many' ? list.map(clone) : []
      } else if (q.mode === 'update') {
        const hit = match()
        for (const r of hit) Object.assign(r, q.payload)
        out = hit.map(clone)
      } else if (q.mode === 'delete') {
        const hit = match()
        state.tables[name] = rows.filter((r) => !hit.includes(r))
        out = hit.map(clone)
      } else {
        out = match().map(clone)
        if (q.lim != null) out = out.slice(0, q.lim)
      }
      if (kind === 'maybe') {
        if (out.length > 1) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'multiple' } })
        return Promise.resolve({ data: out[0] ?? null, error: null })
      }
      if (kind === 'single') {
        if (out.length !== 1) return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no row' } })
        return Promise.resolve({ data: out[0], error: null })
      }
      return Promise.resolve({ data: out, error: null, count: out.length })
    }
    const api = {
      select() { if (q.mode !== 'select') q.wantRows = true; return api },
      insert(p) { q.mode = 'insert'; q.payload = p; return api },
      update(p) { q.mode = 'update'; q.payload = p; return api },
      delete() { q.mode = 'delete'; return api },
      eq(c, v) { q.filters.push((r) => r[c] === v); return api },
      in(c, a) { q.filters.push((r) => a.includes(r[c])); return api },
      is(c, v) { q.filters.push((r) => (r[c] ?? null) === v); return api },
      not(c, op, v) { if (op === 'is') q.filters.push((r) => (r[c] ?? null) !== v); return api },
      ilike(c, v) { q.filters.push((r) => String(r[c] ?? '').toLowerCase() === String(v).toLowerCase()); return api },
      gte() { return api }, lte() { return api }, order() { return api },
      limit(n) { q.lim = n; return api },
      maybeSingle() { return exec('maybe') },
      single() { return exec('single') },
      then(res, rej) { return exec('many').then(res, rej) },
    }
    return api
  }
  return {
    from: builder,
    rpc: async (name, args) => {
      const rows = (n) => tbl(n)
      if (name === 'link_client_to_merchant') {
        const c = rows('clients').find((r) => r.id === args.p_client_id)
        const m = rows('merchants').find((r) => r.id === args.p_merchant_id)
        if (!c) return { data: { ok: false, reason: 'client_not_found' }, error: null }
        if (!m) return { data: { ok: false, reason: 'merchant_not_found' }, error: null }
        if (c.merchant_id === m.id) return { data: { ok: true, reason: 'already_linked', changed: false }, error: null }
        if (rows('clients').some((r) => r.merchant_id === m.id && r.id !== c.id)) return { data: { ok: false, reason: 'merchant_already_linked' }, error: null }
        if (c.merchant_id && !args.p_allow_relink) return { data: { ok: false, reason: 'client_already_linked' }, error: null }
        c.merchant_id = m.id
        return { data: { ok: true, reason: 'linked', changed: true }, error: null }
      }
      if (name === 'consume_portal_invitation') {
        const inv = rows('portal_invitations').find((r) => r.token_hash === args.p_token_hash)
        if (!inv || inv.revoked_at) return { data: { ok: false, reason: 'invalid' }, error: null }
        if (inv.consumed_at) return { data: { ok: false, reason: 'used' }, error: null }
        if (new Date(inv.expires_at) <= new Date()) return { data: { ok: false, reason: 'expired' }, error: null }
        if (String(args.p_user_email).toLowerCase() !== inv.email) return { data: { ok: false, reason: 'email_mismatch' }, error: null }
        const owned = rows('clients').filter((r) => r.user_id === args.p_user_id)
        if (owned.length !== 1) return { data: { ok: false, reason: owned.length ? 'client_ambiguous' : 'no_client' }, error: null }
        const link = await this_rpc('link_client_to_merchant', { p_client_id: owned[0].id, p_merchant_id: inv.merchant_id, p_actor: args.p_user_id, p_reason: 'invitation', p_allow_relink: false })
        if (!link.data.ok) return { data: { ok: false, reason: 'link_refused', link_reason: link.data.reason }, error: null }
        Object.assign(inv, { consumed_at: new Date().toISOString(), consumed_by_user: args.p_user_id, consumed_client_id: owned[0].id })
        return { data: { ok: true, reason: 'linked' }, error: null }
      }
      if (name === 'create_portal_request') {
        const c = rows('clients').find((r) => r.id === args.p_client_id)
        if (!c) return { data: { status: 'client_not_found' }, error: null }
        if (String(c.status || '').trim().toLowerCase() === 'suspended') return { data: { status: 'suspended' }, error: null }
        if (!c.merchant_id || !rows('merchants').some((m) => m.id === c.merchant_id)) return { data: { status: 'not_connected' }, error: null }
                if (rows('projects').some((p) => p.project_id === args.p_reference)) return { data: null, error: { code: '23505', message: 'duplicate' } } // whole function rolls back
        const rid = uuid(), pid = uuid()
        rows('project_requests').push({ id: rid, client_id: c.id, title: args.p_title, description: args.p_description, status: 'open', project_id: pid, last_activity_at: new Date().toISOString(), created_at: new Date().toISOString() })
        rows('projects').push({ id: pid, client_id: c.id, project_id: args.p_reference, title: args.p_title, project_name: args.p_title, status: 'Pending Review', progress: 0 })
        const ev = (o) => (state.tables.activity_events = state.tables.activity_events || []).push({ id: uuid(), created_at: new Date().toISOString(), client_id: c.id, project_id: pid, request_id: rid, metadata: {}, ...o })
        ev({ actor_user_id: args.p_actor_user_id, actor_role: 'client', action: 'request_submitted', summary: 'Request submitted', visibility: 'client' })
        ev({ actor_role: 'system', action: 'project_created', summary: 'Project record created and awaiting review', visibility: 'client' })
        return { data: { status: 'created', request_id: rid, project_id: pid }, error: null }
      }
      return { data: null, error: { code: 'XX000', message: 'unknown rpc ' + name } }
    },
    storage: {
      from: () => ({
        createSignedUploadUrl: async () => ({ data: { token: 'tok' }, error: null }),
        createSignedUrl: async () => ({ data: { signedUrl: 'https://signed.invalid/object' }, error: null }),
        remove: async () => ({ error: null }),
      }),
    },
    auth: { admin: { getUserById: async (id) => ({ data: { user: state.authUsers[id] ?? null }, error: null }) } },
  }
}
let db
const this_rpc = (n, a) => db.rpc(n, a)

// ─────────────────────────────────────────────────── module loader ──
const ENV = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://db.invalid', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon', SUPABASE_SERVICE_ROLE_KEY: 'svc',
  NEXT_PUBLIC_SITE_URL: 'https://site.test', GROWTH_PROFILE_RELEASE_ENABLED: 'true',
  PORTAL_INVITATION_SECRET: 'x'.repeat(64), ADMIN_2FA_COOKIE_SECRET: 'unit-test-secret-not-a-real-one', NODE_ENV: 'test',
}
const env = new Proxy({}, { get: (_, k) => (k === 'SUPABASE_SERVICE_ROLE_KEY' && state.noService ? undefined : ENV[k]) })

class NR extends Response {
  static json(value, options = {}) {
    const r = new NR(JSON.stringify(value), { status: options.status ?? 200, headers: { 'content-type': 'application/json', ...(options.headers || {}) } })
    r.cookies = { delete() {}, set() {} }
    return r
  }
  static redirect(url, status = 307) { return new NR(null, { status, headers: { location: String(url) } }) }
  static next() { const r = new NR(null, { status: 200, headers: { 'x-next': '1' } }); r.cookies = { set() {}, delete() {} }; return r }
}

const cache = new Map()
function load(relative) {
  let file = path.resolve(root, relative)
  if (!path.extname(file)) file += '.ts'
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const requireFn = (name) => {
    if (name === 'next/server') return { NextResponse: NR, NextRequest: Request }
    if (name === 'next/headers') return { cookies: () => ({ get: (n) => (state.cookies[n] !== undefined ? { value: state.cookies[n] } : undefined), delete() {}, set() {} }) }
    if (name === '@/lib/supabase-server') {
      return { createServerSupabaseClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) }
    }
    if (name === '@supabase/supabase-js') {
      return { createClient: () => ({ ...db, auth: { ...db.auth, verifyOtp: async () => ({ data: { user: state.confirmUser ?? null }, error: state.confirmUser ? null : { message: 'bad' } }), signUp: async (a) => state.signUp(a) } }) }
    }
    if (name === '@supabase/ssr') {
      return {
        createServerClient: () => ({
          auth: { getUser: async () => ({ data: { user: state.user } }) },
          from: (t) => {
            const q = { f: [], cols: '' }
            const api = { select(c) { q.cols = c; return api }, eq(c, v) { q.f.push([c, v]); return api }, async maybeSingle() { const r = (state.tables[t] || []).find((x) => q.f.every(([c, v]) => x[c] === v)); if (!r) return { data: null, error: state.middlewareError ? { code: 'X' } : null }; const o = {}; for (const c of q.cols.split(',').map((s) => s.trim())) o[c] = r[c]; return { data: state.middlewareStatusError && q.cols === 'status' ? null : o, error: state.middlewareStatusError && q.cols === 'status' ? { code: 'X' } : null } } }
            return api
          },
        }),
      }
    }
    if (name === '@upstash/ratelimit') return { Ratelimit: class { static slidingWindow() { return {} } } }
    if (name === '@upstash/redis') return { Redis: class {} }
    if (name === '@/lib/rate-limit') {
      const real = load('src/lib/rate-limit.ts')
      return {
        ...real,
        checkRateLimit: async (limitName, id) => {
          const cfg = real.RATE_LIMITS[limitName]
          const key = limitName + ':' + id
          state.rl[key] = (state.rl[key] || 0) + 1
          return state.rl[key] > cfg.requests ? { ok: false, retryAfterSeconds: 42, degraded: false } : { ok: true, degraded: false }
        },
      }
    }
    if (name === '@/lib/admin-api-auth') {
      const real = load('src/lib/admin-api-auth.ts')
      return {
        ...real,
        getPrivilegedClient: () => (state.noService ? null : db),
        requireActiveAdmin: async () => (state.admin ? { ok: true, db, userId: ADMIN } : { ok: false, response: NR.json({ error: 'Not authenticated' }, { status: 401 }) }),
      }
    }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(read(path.relative(root, file)), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, {
    require: requireFn, module: mod, exports: mod.exports, process: { env }, console: { error() {}, log() {}, warn() {} },
    Response, Request, Headers, URL, URLSearchParams, Date, crypto: nodeCrypto.webcrypto, TextEncoder, TextDecoder, Uint8Array, btoa, atob, setTimeout, Buffer,
    // admin-api-auth refuses to load where `window` exists; none is defined here.
  }, { filename: file })
  return mod.exports
}

// ─────────────────────────────────────────────────── call helpers ──
const route = (rel) => load('src/app/api/' + rel + '/route.ts')
const sess = (id, extra = {}) => ({ id, email: extra.email ?? id.slice(0, 8) + '@x.test', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: {}, ...extra })
const as = (userId, extra) => { state.user = sess(userId, extra) }
const req = (method, url, body) => new Request('http://localhost' + url, { method, headers: { 'content-type': 'application/json' }, body: body === undefined || method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body) })
// A NextRequest stand-in: the confirm route reads request.nextUrl.searchParams.
const nreq = (url) => { const r = new Request(url); r.nextUrl = new URL(url); return r }
async function call(rel, method, { params = {}, body, url = '/x' } = {}) {
  const handler = route(rel)[method]
  const res = await handler(req(method, url, body), { params })
  let json = null
  try { json = await res.clone().json() } catch { /* not json */ }
  return { status: res.status, json, headers: res.headers, res }
}
const REQ_BODY = { title: 'New site', service: 'Website Development', description: 'We need a site.' }
const count = (t) => (state.tables[t] || []).length
const UPLOAD_BODY = { context: 'client_file', files: [{ fileName: 'brief.pdf', size: 1000, contentType: 'application/pdf' }] }

// Every portal API route, as [file, method, params, body-factory]. Used by the suspension and isolation sweeps.
const FILE_A = 'aaaaaaaa-1111-4000-8000-000000000001', PROP_A = 'aaaaaaaa-2222-4000-8000-000000000001', PROJ_A = 'aaaaaaaa-0000-4000-8000-000000000001'
const ALL_PORTAL = [
  ['client-portal/me', 'GET'], ['client-portal/dashboard', 'GET'], ['client-portal/projects', 'GET'],
  ['client-portal/projects/[id]', 'GET', { id: PROJ_A }], ['client-portal/files', 'GET'], ['client-portal/files/[id]', 'DELETE', { id: FILE_A }],
  ['client-portal/files/[id]/signed-url', 'GET', { id: FILE_A }], ['client-portal/proposals', 'GET'], ['client-portal/proposals/[id]', 'GET', { id: PROP_A }],
  ['client-portal/proposals/[id]/approve', 'POST', { id: PROP_A }], ['client-portal/proposals/[id]/request-changes', 'POST', { id: PROP_A }, { reason: 'please change the scope' }],
  ['client-portal/proposals/[id]/viewed', 'POST', { id: PROP_A }], ['client-portal/proposals/[id]/files', 'GET', { id: PROP_A }],
  ['client-portal/requests', 'GET'], ['client-portal/invoices', 'GET'], ['client-portal/growth-profile', 'GET'],
  ['client-portal/settings', 'GET'], ['client-portal/settings', 'PATCH', {}, { whatsapp: '+1 234 567 8900' }],
  ['client-portal/project-requests', 'POST', {}, REQ_BODY],
  ['uploads/initiate', 'POST', {}, UPLOAD_BODY],
]

;(async () => {
  console.log('S6.2 portal access tests')

  // ── Scenario A — self-registration ───────────────────────────────────────
  console.log('\nA. self-registration → confirm → immediate Portal access')

  await test('A1 provisioning creates an ACTIVE, UNCONNECTED client for a confirmed user (no merchant link, no approval)', async () => {
    resetState(); db = makeDb(); cache.clear()
    const { provisionAccount } = load('src/lib/provision-account.ts')
    const fresh = uuid()
    const result = await provisionAccount({ id: fresh, email: 'self@reg.test', email_confirmed_at: '2026-01-01', user_metadata: { business_name: 'Self Reg Co', full_name: 'Sam', role: 'admin', status: 'Suspended', merchant_id: MERCHANT_A } })
    assert.equal(result.ok, true)
    const row = state.tables.clients.find((c) => c.user_id === fresh)
    assert.ok(row, 'clients row created')
    assert.equal(row.merchant_id ?? null, null, 'merchant_id stays null — metadata can never supply it')
    assert.equal(row.status, 'Active', 'normal state is Active; metadata cannot set status')
    assert.equal(row.business_name, 'Self Reg Co')
  })

  await test('A2 /api/auth/confirm provisions and redirects straight to the confirmation page (no approval screen)', async () => {
    resetState(); db = makeDb(); cache.clear()
    state.confirmUser = { id: uuid(), email: 'c@c.test', email_confirmed_at: '2026-01-01', user_metadata: { business_name: 'C Co' } }
    const res = await route('auth/confirm').GET(nreq('http://localhost/api/auth/confirm?token=abc&type=signup'))
    assert.match(res.headers.get('location'), /^https:\/\/site\.test\/client-confirmation\?confirmed=true$/)
    assert.equal(state.tables.clients.filter((c) => c.user_id === state.confirmUser.id).length, 1)
  })

  await test('A3 unconnected account: Overview, Settings, projects, files, proposals, requests, invoices, me all RENDER (200)', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    for (const [rel, method, params, body] of ALL_PORTAL.filter(([r, m]) => m === 'GET' && !r.includes('[id]'))) {
      const r = await call(rel, method, { params, body })
      assert.equal(r.status, 200, rel + ' should open for an unconnected account, got ' + r.status + ' ' + JSON.stringify(r.json))
    }
    // Finalization: name and business are managed by Hbee (identity is printed on invoices/proposals); the other profile fields stay editable.
    const settings = await call('client-portal/settings', 'PATCH', { body: { whatsapp: '+1 234 567 8900' } })
    assert.equal(settings.status, 200, 'profile/settings write is allowed while unconnected')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).whatsapp, '+1 234 567 8900')
  })

  await test('A4 /me reports connected:false and no approval wording is returned', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    const r = await call('client-portal/me', 'GET')
    assert.equal(r.json.client.connected, false)
    assert.doesNotMatch(JSON.stringify(r.json), /approv|pending|waiting/i)
  })

  await test('A5 Growth Profile for an unconnected account is the deterministic not_connected state (no email matching)', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    // A merchant exists whose email EQUALS this user's email. It must NOT be picked up.
    const r = await call('client-portal/growth-profile', 'GET')
    assert.equal(r.status, 200)
    assert.equal(r.json.state, 'not_connected')
    assert.doesNotMatch(stripComments(read('src/app/api/client-portal/growth-profile/route.ts')), /eq\('email'|\.email\b.*merchant/, 'growth-profile must not match by email')
  })

  await test('A6 connected-only actions are denied GRACEFULLY (403 { state: not_connected }) and write NOTHING', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    const before = { pr: count('project_requests'), pj: count('projects'), nt: count('notifications') }
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 403)
    assert.equal(r.json.state, 'not_connected')
    assert.equal(r.json.code, 'not_connected')
    assert.match(r.json.error, /ready/i)
    assert.equal(count('project_requests'), before.pr)
    assert.equal(count('projects'), before.pj)
    assert.equal(count('notifications'), before.nt)
  })

  await test('A7 an unconnected account cannot use project/client file storage (initiate, delete, signed upload)', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    const up = await call('uploads/initiate', 'POST', { body: UPLOAD_BODY })
    assert.equal(up.status, 403)
    assert.equal(up.json.code, 'not_connected')
    assert.equal(count('upload_batches'), 0)
    assert.equal(count('upload_sessions'), 0)
    const fin = await call('uploads/finalize', 'POST', { body: { batchId: uuid(), uploads: [] } })
    assert.ok([400, 403].includes(fin.status), 'finalize refused (' + fin.status + ')')
  })

  await test('A8 proposal actions are connected-only', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    for (const rel of ['approve', 'request-changes', 'viewed']) {
      const r = await call('client-portal/proposals/[id]/' + rel, 'POST', { params: { id: PROP_A }, body: { reason: 'please change the scope', version: 1, confirm: true } })
      assert.equal(r.status, 403, rel)
      assert.equal(r.json.state, 'not_connected')
    }
    assert.equal(state.tables.proposals.find((p) => p.id === PROP_A).status, 'sent', 'proposal untouched')
  })

  // ── Scenario F — direct API bypass ───────────────────────────────────────
  console.log('\nF. direct API bypass')

  await test('F1 forged client_id / merchant_id / status in the body do not authorize anything', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    const r = await call('client-portal/project-requests', 'POST', { body: { ...REQ_BODY, client_id: CLIENT_B, clientId: CLIENT_B, merchant_id: MERCHANT_B, merchantId: MERCHANT_B, status: 'approved' } })
    assert.equal(r.status, 403)
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, null)
    assert.equal(count('project_requests'), 2)
  })

  await test('F2 unauthenticated → 401 on every portal route; missing service key → 500, never a data answer', async () => {
    resetState(); db = makeDb(); cache.clear(); state.user = null
    for (const [rel, method, params, body] of ALL_PORTAL) {
      const r = await call(rel, method, { params, body })
      assert.equal(r.status, 401, rel + ' ' + method)
    }
    as(USER_A); state.noService = true
    const r = await call('client-portal/projects', 'GET')
    assert.equal(r.status, 500)
  })

  await test('F3 a connected account whose merchant_id points at a non-existent merchant is NOT connected', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id = uuid()
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 403)
    assert.equal(r.json.state, 'not_connected')
  })

  // ── Scenario B — admin connects the existing account ─────────────────────
  console.log('\nB. Admin connects an existing self-registered account')

  await test('B1 admin links the SAME auth user to a merchant; no second account; same login now has connected access', async () => {
    resetState(); db = makeDb(); cache.clear()
    const authBefore = state.tables.clients.map((c) => c.user_id).sort().join()
    const clientsBefore = count('clients')
    state.admin = true; state.user = null
    const link = await call('admin/clients/link-merchant', 'POST', { body: { clientId: CLIENT_NEW, merchantId: MERCHANT_FREE, reason: 'test' } })
    assert.equal(link.status, 200, JSON.stringify(link.json))
    assert.equal(count('clients'), clientsBefore, 'no second client row / account')
    assert.equal(state.tables.clients.map((c) => c.user_id).sort().join(), authBefore, 'same auth users')
    state.admin = false
    as(USER_NEW) // the same login, unchanged
    const me = await call('client-portal/me', 'GET')
    assert.equal(me.json.client.connected, true)
    const rq = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(rq.status, 200, JSON.stringify(rq.json))
    assert.equal(rq.json.ok, true)
    const owned = state.tables.project_requests.filter((r) => r.client_id === CLIENT_NEW)
    assert.equal(owned.length, 1)
  })

  await test('B2 owned records become visible after the link, per existing records (proposals keyed on client_id)', async () => {
    resetState(); db = makeDb(); cache.clear()
    state.tables.proposals.push({ id: uuid(), client_id: CLIENT_NEW, merchant_id: MERCHANT_FREE, status: 'sent', title: 'For Nina', proposal_number: 'PROP-N' })
    state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id = MERCHANT_FREE
    as(USER_NEW)
    const r = await call('client-portal/proposals', 'GET')
    assert.equal(r.status, 200)
    assert.equal(r.json.proposals.length, 1)
  })

  await test('B3 admin can disconnect explicitly; only the exact linked business is cleared; login and rows survive', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = true
    const bad = await call('admin/clients/[client_id]/disconnect', 'POST', { params: { client_id: CLIENT_A }, body: { merchantId: MERCHANT_A } })
    assert.equal(bad.status, 400, 'confirm:true is required')
    const wrong = await call('admin/clients/[client_id]/disconnect', 'POST', { params: { client_id: CLIENT_A }, body: { confirm: true, merchantId: MERCHANT_B } })
    assert.equal(wrong.status, 409, 'a stale/other merchant id disconnects nothing')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_A).merchant_id, MERCHANT_A)
    const ok = await call('admin/clients/[client_id]/disconnect', 'POST', { params: { client_id: CLIENT_A }, body: { confirm: true, merchantId: MERCHANT_A } })
    assert.equal(ok.status, 200)
    const row = state.tables.clients.find((c) => c.id === CLIENT_A)
    assert.equal(row.merchant_id, null)
    assert.equal(row.user_id, USER_A)
    state.admin = false; as(USER_A)
    const denied = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(denied.status, 403)
    assert.equal((await call('client-portal/projects', 'GET')).status, 200, 'the account itself still works')
  })

  await test('B4 create-business: duplicate email is refused with the existing candidate; a clean create links atomically; a DB refusal changes nothing', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = true
    // CLIENT_NEW email equals the "Free Co" merchant → duplicate
    const dup = await call('admin/clients/[client_id]/create-business', 'POST', { params: { client_id: CLIENT_NEW } })
    assert.equal(dup.status, 409)
    assert.equal(dup.json.error, 'business_exists')
    assert.equal(dup.json.candidates[0].id, MERCHANT_FREE)
    state.tables.merchants = state.tables.merchants.filter((m) => m.id !== MERCHANT_FREE)
    state.failures['merchants:insert'] = '23502'
    const refused = await call('admin/clients/[client_id]/create-business', 'POST', { params: { client_id: CLIENT_NEW } })
    assert.equal(refused.status, 409)
    assert.equal(refused.json.error, 'business_create_failed')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, null)
    delete state.failures['merchants:insert']
    const made = await call('admin/clients/[client_id]/create-business', 'POST', { params: { client_id: CLIENT_NEW } })
    assert.equal(made.status, 200, JSON.stringify(made.json))
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, made.json.merchantId)
  })

  await test('B5 admin client routes reject non-admins before touching data', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = false
    for (const [rel, params, body] of [
      ['admin/clients/[client_id]/status', { client_id: CLIENT_A }, { action: 'suspend' }],
      ['admin/clients/[client_id]/disconnect', { client_id: CLIENT_A }, { confirm: true, merchantId: MERCHANT_A }],
      ['admin/clients/[client_id]/create-business', { client_id: CLIENT_NEW }, {}],
      ['admin/clients/link-merchant', {}, { clientId: CLIENT_NEW, merchantId: MERCHANT_FREE }],
    ]) {
      const r = await call(rel, 'POST', { params, body })
      assert.equal(r.status, 401, rel)
    }
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_A).status, 'Active')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, null)
  })

  // ── Scenario C — invitation ──────────────────────────────────────────────
  console.log('\nC. Hbee invitation (optional path)')

  await test('C1 invitation issued → same user signs in with the invited, verified email → merchant is connected the same way', async () => {
    resetState(); db = makeDb(); cache.clear()
    const inv = load('src/lib/portal-invitations.ts')
    const issued = await inv.issuePortalInvitation(db, { merchantId: MERCHANT_FREE, actorId: ADMIN }, { deferEmail: true })
    assert.equal(issued.ok, true, JSON.stringify(issued))
    const token = inv.invitationToken(issued.invitationId)
    assert.ok(token)
    // The table stores only the hash — never the token.
    assert.ok(!JSON.stringify(state.tables.portal_invitations).includes(token))
    as(USER_NEW, { email: 'new@new.test' })
    state.cookies.hb_portal_invite = token
    const accepted = await call('portal-invitation/accept', 'POST')
    assert.equal(accepted.status, 200, JSON.stringify(accepted.json))
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, MERCHANT_FREE)
    const rq = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(rq.status, 200)
  })

  await test('C2 an invitation for another address does NOT connect (email is validation only, never a link)', async () => {
    resetState(); db = makeDb(); cache.clear()
    const inv = load('src/lib/portal-invitations.ts')
    const issued = await inv.issuePortalInvitation(db, { merchantId: MERCHANT_FREE, actorId: ADMIN }, { deferEmail: true })
    as(USER_NEW, { email: 'someone-else@elsewhere.test' })
    state.cookies.hb_portal_invite = inv.invitationToken(issued.invitationId)
    const r = await call('portal-invitation/accept', 'POST')
    assert.equal(r.status, 409)
    assert.equal(r.json.reason, 'email_mismatch')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_NEW).merchant_id, null)
  })

  await test('C3 self-registration needs no invitation and invitation needs no prior self-link (paths are independent)', async () => {
    const src = stripComments(read('src/middleware.ts')) + stripComments(read('src/lib/client-portal/portal-client.ts'))
    assert.doesNotMatch(src, /portal_invitations/)
    assert.doesNotMatch(stripComments(read('src/lib/provision-account.ts')), /portal_invitations/)
  })

  // ── Scenario D — isolation ───────────────────────────────────────────────
  console.log('\nD. isolation: Client A vs Client B')

  await test('D1 lists never contain B rows', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const dump = {}
    for (const rel of ['projects', 'files', 'proposals', 'requests', 'invoices', 'dashboard', 'growth-profile']) {
      dump[rel] = JSON.stringify((await call('client-portal/' + rel, 'GET')).json)
      assert.doesNotMatch(dump[rel], /secret|SECRET|BBBB|PROP-B|b@b\.test/i, rel + ' leaked B data')
    }
    assert.match(dump.projects, /A site/)
    assert.match(dump.invoices, /INV-A/)
    assert.match(dump['growth-profile'], /A profile/)
  })

  await test('D2 direct id access to B’s project / file / proposal / signed URL / delete is a 404 and changes nothing', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const B = { proj: 'bbbbbbbb-0000-4000-8000-000000000001', file: 'bbbbbbbb-1111-4000-8000-000000000001', prop: 'bbbbbbbb-2222-4000-8000-000000000001' }
    for (const [rel, method, id] of [
      ['client-portal/projects/[id]', 'GET', B.proj], ['client-portal/files/[id]/signed-url', 'GET', B.file], ['client-portal/files/[id]', 'DELETE', B.file],
      // S6.4: approve / request-changes / viewed now run in database functions; their foreign-proposal 404s are proved against the
      // S6.4 function models in scripts/test-proposals-invoices.cjs (C5, D3), which this older harness does not model.
      ['client-portal/proposals/[id]', 'GET', B.prop], ['client-portal/proposals/[id]/files', 'GET', B.prop],
    ]) {
      const r = await call(rel, method, { params: { id }, body: { reason: 'please change the scope', version: 1, confirm: true } })
      assert.equal(r.status, 404, rel + ' ' + method + ' returned ' + r.status)
    }
    assert.equal(state.tables.proposals.find((p) => p.id === B.prop).status, 'sent')
    assert.equal(count('project_files'), 2, 'B file not deleted')
  })

  await test('D3 a request cannot be filed against, or upload into, another client’s project', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const up = await call('uploads/initiate', 'POST', { body: { ...UPLOAD_BODY, projectId: 'bbbbbbbb-0000-4000-8000-000000000001' } })
    assert.equal(up.status, 404)
    const own = await call('uploads/initiate', 'POST', { body: { ...UPLOAD_BODY, projectId: PROJ_A } })
    assert.equal(own.status, 200, JSON.stringify(own.json))
    assert.ok(state.tables.upload_sessions.every((s) => s.client_id === CLIENT_A))
    assert.ok(state.tables.upload_sessions.every((s) => s.object_path.startsWith('client-files/' + CLIENT_A + '/')))
  })

  await test('D4 Growth Profile: a profile bound to another merchant is withheld as inconsistent, never shown', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    state.tables.growth_program_decisions.find((d) => d.merchant_id === MERCHANT_A).profile_id = 'bbbbbbbb-4444-4000-8000-000000000001'
    const r = await call('client-portal/growth-profile', 'GET')
    assert.equal(r.status, 409)
    assert.doesNotMatch(JSON.stringify(r.json), /SECRET/)
  })

  // ── Scenario E — suspension ──────────────────────────────────────────────
  console.log('\nE. suspension')

  await test('E1 Admin suspends → EVERY portal API refuses the account (403 suspended), reads and writes alike', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = true; state.user = null
    const s = await call('admin/clients/[client_id]/status', 'POST', { params: { client_id: CLIENT_A }, body: { action: 'suspend' } })
    assert.equal(s.status, 200, JSON.stringify(s.json))
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_A).status, 'Suspended')
    state.admin = false; as(USER_A)
    const before = { pr: count('project_requests'), pj: count('projects'), sess: count('upload_sessions') }
    for (const [rel, method, params, body] of ALL_PORTAL) {
      const r = await call(rel, method, { params, body })
      assert.equal(r.status, 403, rel + ' ' + method + ' → ' + r.status)
      assert.equal(r.json.state, 'suspended', rel + ' ' + method)
    }
    assert.equal(count('project_requests'), before.pr)
    assert.equal(count('projects'), before.pj)
    assert.equal(count('upload_sessions'), before.sess)
    assert.ok(!state.tables.clients.find((c) => c.id === CLIENT_A).whatsapp, 'settings PATCH did not apply')
  })

  await test('E2 suspension is case-insensitive and suspended + unconnected still reads as suspended', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_NEW)
    state.tables.clients.find((c) => c.id === CLIENT_NEW).status = 'suspended '
    const r = await call('client-portal/projects', 'GET')
    assert.equal(r.status, 403)
    assert.equal(r.json.state, 'suspended')
  })

  await test('E3 Admin reactivates → the same login works again, nothing was lost', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = true
    await call('admin/clients/[client_id]/status', 'POST', { params: { client_id: CLIENT_A }, body: { action: 'suspend' } })
    const again = await call('admin/clients/[client_id]/status', 'POST', { params: { client_id: CLIENT_A }, body: { action: 'suspend' } })
    assert.equal(again.json.changed, false, 'idempotent')
    const back = await call('admin/clients/[client_id]/status', 'POST', { params: { client_id: CLIENT_A }, body: { action: 'reactivate' } })
    assert.equal(back.status, 200)
    state.admin = false; as(USER_A)
    const r = await call('client-portal/projects', 'GET')
    assert.equal(r.status, 200)
    assert.match(JSON.stringify(r.json), /A site/)
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_A).merchant_id, MERCHANT_A, 'connection untouched')
  })

  await test('E4 a database that refuses the Suspended value is reported honestly, not faked', async () => {
    resetState(); db = makeDb(); cache.clear(); state.admin = true
    state.failures['clients:update'] = '23514'
    const r = await call('admin/clients/[client_id]/status', 'POST', { params: { client_id: CLIENT_A }, body: { action: 'suspend' } })
    assert.equal(r.status, 409)
    assert.equal(r.json.error, 'status_value_not_permitted')
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_A).status, 'Active')
  })

  await test('E5 middleware: suspended → /client-portal/suspended; unconnected & active → straight in; no client row → login; status read failure never breaks the existing check', async () => {
    resetState(); db = makeDb(); cache.clear()
    const mw = load('src/middleware.ts')
    const hit = async (pathname) => {
      const url = new URL('http://localhost' + pathname)
      url.clone = () => new URL(url.href)
      const res = await mw.middleware({ nextUrl: url, cookies: { getAll: () => [], get: () => undefined, set() {} }, headers: new Headers() })
      return { location: res.headers.get('location'), next: res.headers.get('x-next') === '1' }
    }
    as(USER_NEW)
    assert.equal((await hit('/client-portal')).next, true, 'unconnected account is let in')
    state.tables.clients.find((c) => c.id === CLIENT_NEW).status = 'Suspended'
    assert.match((await hit('/client-portal/projects')).location, /\/client-portal\/suspended$/)
    assert.equal((await hit('/client-portal/suspended')).next, true, 'no redirect loop')
    state.middlewareStatusError = true
    assert.equal((await hit('/client-portal')).next, true, 'a status read error falls through; the APIs still refuse')
    state.middlewareStatusError = false
    // Finalization: signed in but no client row → the login page's recovery path (account=no-profile), not a bare login form
    // that would bounce straight back; not signed in → login remembering the page. Only the PATHNAME travels.
    state.user = sess(uuid())
    const noRow = new URL((await hit('/client-portal/invoices')).location)
    assert.equal(noRow.pathname, '/client-login')
    assert.equal(noRow.searchParams.get('account'), 'no-profile')
    assert.equal(noRow.searchParams.get('next'), '/client-portal/invoices')
    state.user = null
    const noSession = new URL((await hit('/client-portal/requests?secret=1#x')).location)
    assert.equal(noSession.pathname, '/client-login')
    assert.equal(noSession.searchParams.get('next'), '/client-portal/requests', 'pathname only: no query string or fragment is carried')
    assert.equal(noSession.searchParams.get('account'), null)
  })

  // ── Request flow ─────────────────────────────────────────────────────────
  console.log('\nRequest flow')

  await test('R1 a connected request creates a request + project, a collision-safe reference and ONE admin notification', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    const reqRow = state.tables.project_requests.find((x) => x.title === 'New site')
    const proj = state.tables.projects.find((x) => x.project_name === 'New site')
    assert.equal(reqRow.client_id, CLIENT_A)
    assert.equal(proj.client_id, CLIENT_A)
    assert.equal(reqRow.project_id, proj.id)
    assert.match(proj.project_id, /^PROJ-[2-9A-HJKMNP-TV-Z]{8}$/)
    const notes = state.tables.notifications.filter((n) => n.type === 'project_request_created')
    assert.equal(notes.length, 1)
    assert.equal(notes[0].recipient_scope, 'admin')
    assert.equal(notes[0].entity_id, reqRow.id)
    assert.match(notes[0].message, /A Co/)
  })

  await test('R2 the admin notification is idempotent on the request id; its failure never fails the request', async () => {
    resetState(); db = makeDb(); cache.clear()
    const { createNotification } = load('src/lib/notifications/createNotification.ts')
    const id = uuid()
    const a = await createNotification({ scope: 'admin', type: 'project_request_created', title: 't', message: 'm', entityType: 'project_request', entityId: id })
    const b = await createNotification({ scope: 'admin', type: 'project_request_created', title: 't', message: 'm', entityType: 'project_request', entityId: id })
    assert.equal(a.ok && b.ok, true)
    assert.equal(count('notifications'), 1)
    state.failures['notifications:insert'] = 'XX000'
    as(USER_A)
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 200, 'client still succeeds')
  })

  await test('R3 S6.3: the request is ONE atomic RPC — a failure leaves nothing half-made and says so', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const orig = db.rpc
    db.rpc = async (n, a) => (n === 'create_portal_request' ? { data: null, error: { code: 'XX000', message: 'forced' } } : orig(n, a))
    const before = [count('project_requests'), count('projects')]
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 500)
    assert.equal(r.json.code, 'request_failed')
    assert.deepEqual([count('project_requests'), count('projects')], before, 'nothing written')
    assert.equal(count('notifications'), 0)
  })

  await test('R4 project references are crypto-random, well-formed and effectively collision-free', async () => {
    cache.clear()
    const { generateProjectReference, PROJECT_REFERENCE_PATTERN } = load('src/lib/projects/project-reference.ts')
    const seen = new Set()
    for (let i = 0; i < 20000; i++) {
      const ref = generateProjectReference()
      assert.match(ref, PROJECT_REFERENCE_PATTERN)
      seen.add(ref)
    }
    assert.equal(seen.size, 20000)
    assert.doesNotMatch(stripComments(read('src/app/api/client-portal/project-requests/route.ts')), /Date\.now/)
  })

  await test('R5 a reference already in use rolls the whole RPC back and is retried with a fresh one', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    let calls = 0
    const orig = db.rpc
    db.rpc = async (n, a) => { if (n !== 'create_portal_request') return orig(n, a); calls++; return calls === 1 ? { data: null, error: { code: '23505', message: 'dup' } } : orig(n, a) }
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 200, JSON.stringify(r.json))
    assert.equal(calls, 2, 'a second attempt was made after the unique violation')
    assert.equal(count('project_requests'), 3, 'exactly one request was created')
  })

  // ── Rate limits ──────────────────────────────────────────────────────────
  console.log('\nRate limits')

  await test('L1 project requests: invisible per-user limit, 429 + Retry-After, nothing written once limited, other users unaffected', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const { RATE_LIMITS } = load('src/lib/rate-limit.ts')
    const n = RATE_LIMITS.portalRequest.requests
    for (let i = 0; i < n; i++) assert.equal((await call('client-portal/project-requests', 'POST', { body: REQ_BODY })).status, 200)
    const before = count('project_requests')
    const limited = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(limited.status, 429)
    assert.equal(limited.json.code, 'rate_limited')
    assert.equal(limited.headers.get('retry-after'), '42')
    assert.equal(count('project_requests'), before)
    as(USER_B)
    assert.equal((await call('client-portal/project-requests', 'POST', { body: REQ_BODY })).status, 200)
  })

  await test('L2 upload-session creation is limited per client user; admin uploads are not limited here', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const { RATE_LIMITS } = load('src/lib/rate-limit.ts')
    for (let i = 0; i < RATE_LIMITS.portalUpload.requests; i++) assert.equal((await call('uploads/initiate', 'POST', { body: UPLOAD_BODY })).status, 200)
    const limited = await call('uploads/initiate', 'POST', { body: UPLOAD_BODY })
    assert.equal(limited.status, 429)
    assert.equal(limited.json.code, 'rate_limited')
  })

  await test('L3 limits are keyed on the verified user id and add no visible challenge', async () => {
    const src = stripComments(read('src/app/api/client-portal/project-requests/route.ts')) + stripComments(read('src/app/api/uploads/initiate/route.ts'))
    assert.match(src, /portal\.user\.id|uploaderUserId/)
    assert.doesNotMatch(src, /turnstile|captcha/i)
  })

  // ── Signup quality ───────────────────────────────────────────────────────
  console.log('\nSignup: enumeration and redirect safety')

  await test('S1 signup answers identically for a new and an already-registered address', async () => {
    resetState(); db = makeDb(); cache.clear()
    const svc = load('src/lib/services/merchant-auth-service.ts')
    const data = { business_name: 'X', contact_name: 'Y', email: 'x@y.test', password: 'secret1' }
    state.signUp = async () => ({ data: { user: { id: uuid() }, session: null }, error: null })
    const fresh = await svc.createMerchantAccount(data)
    for (const error of [
      { message: 'User already registered', status: 400 },
      { message: 'Something', code: 'user_already_exists' },
      { message: 'A user with this email address has already been registered', code: 'email_exists' },
    ]) {
      state.signUp = async () => ({ data: { user: null, session: null }, error })
      const dup = await svc.createMerchantAccount(data)
      assert.equal(dup.success, fresh.success)
      assert.equal(dup.message, fresh.message)
      assert.equal(dup.error, undefined)
    }
    // Supabase's other obfuscation: an existing confirmed address returns a user with no identities and NO error.
    state.signUp = async () => ({ data: { user: { id: uuid(), identities: [] }, session: null }, error: null })
    const obf = await svc.createMerchantAccount(data)
    assert.equal(obf.message, fresh.message)
  })

  await test('S2 other failures are generic or friendly and never echo Supabase wording or the address', async () => {
    resetState(); db = makeDb(); cache.clear()
    const { signUpOutcomeFor, SIGNUP_GENERIC_ERROR } = load('src/lib/client-portal/signup-response.ts')
    const weird = signUpOutcomeFor({ message: 'database error saving new user for leak@x.test' })
    assert.equal(weird.error, SIGNUP_GENERIC_ERROR)
    assert.doesNotMatch(JSON.stringify(weird), /leak@x\.test|database/)
    assert.match(signUpOutcomeFor({ code: 'weak_password', message: 'Password should be at least 6 characters' }).error, /password/i)
    assert.match(signUpOutcomeFor({ status: 429, message: 'x' }).error, /Too many/)
    assert.doesNotMatch(read('src/lib/services/merchant-auth-service.ts'), /already exists\. Please login/)
  })

  await test('S3 email confirmation is not weakened: provisioning happens only from a verified identity; unconfirmed users get no clients row via confirm', async () => {
    resetState(); db = makeDb(); cache.clear()
    state.confirmUser = null
    const res = await route('auth/confirm').GET(nreq('http://localhost/api/auth/confirm?token=bad'))
    assert.match(res.headers.get('location'), /error=verification_failed/)
    assert.equal(count('clients'), 3)
    const src = stripComments(read('src/app/api/account/provision/route.ts'))
    assert.match(src, /getUser/)
  })

  await test('S4 redirect_to: only local portal pages survive; every hostile form falls back; query and hash are dropped', async () => {
    cache.clear()
    const { safePortalRedirect, SAFE_REDIRECT_FALLBACK } = load('src/lib/client-portal/safe-redirect.ts')
    const ok = {
      '/client-confirmation': '/client-confirmation', '/client-portal': '/client-portal', '/client-portal/projects/123': '/client-portal/projects/123',
      '/client-login': '/client-login', '/client-reset-password': '/client-reset-password', '/portal-invitation': '/portal-invitation',
      '/client-portal?next=https://evil.test': '/client-portal', '/client-portal#x': '/client-portal',
    }
    for (const [input, expected] of Object.entries(ok)) assert.equal(safePortalRedirect(input), expected, input)
    for (const bad of [
      'https://evil.example', 'http://evil.example/client-portal', '//evil.example', '///evil.example', '/\\evil.example', '\\\\evil.example', '/client-portal\\..\\admin',
      'javascript:alert(1)', 'data:text/html,x', '/admin', '/admin/dashboard', '/client-portal/../admin', '/client-portal/%2e%2e/admin', '/client-portalx', '/client-portal@evil.example',
      '/api/auth/confirm', '', null, undefined, 42, {}, ' /client-portal', '/client-portal\n', '/client-portal\u0000', 'client-portal', '/' + 'a'.repeat(600),
    ]) assert.equal(safePortalRedirect(bad), SAFE_REDIRECT_FALLBACK, JSON.stringify(bad))
  })

  await test('S5 /api/auth/confirm never redirects off-site or outside the portal pages, whatever redirect_to says', async () => {
    resetState(); db = makeDb(); cache.clear()
    state.confirmUser = { id: uuid(), email: 'ok@ok.test', email_confirmed_at: '2026-01-01', user_metadata: {} }
    for (const hostile of ['https://evil.example', '//evil.example', '/\\evil.example', '/admin', '/client-portal/../admin', 'javascript:alert(1)']) {
      const res = await route('auth/confirm').GET(nreq('http://localhost/api/auth/confirm?token=t&redirect_to=' + encodeURIComponent(hostile)))
      const location = res.headers.get('location')
      assert.ok(location.startsWith('https://site.test/'), hostile + ' → ' + location)
      assert.match(location, /^https:\/\/site\.test\/client-confirmation\?/, hostile + ' → ' + location)
    }
    const good = await route('auth/confirm').GET(nreq('http://localhost/api/auth/confirm?token=t&redirect_to=' + encodeURIComponent('/client-portal')))
    assert.match(good.headers.get('location'), /^https:\/\/site\.test\/client-portal\?confirmed=true$/)
  })

  // ── Static guarantees ────────────────────────────────────────────────────
  console.log('\nStatic guarantees')

  await test('G1 every portal API route resolves the client through the shared resolver (no private copies of the lookup)', async () => {
    const dir = path.join(root, 'src/app/api/client-portal')
    const files = []
    ;(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : e.name === 'route.ts' && files.push(p) } })(dir)
    assert.ok(files.length >= 18, 'found ' + files.length)
    for (const f of files) {
      const src = stripComments(fs.readFileSync(f, 'utf8'))
      const rel = path.relative(root, f)
      assert.match(src, /resolvePortalClient\(/, rel + ' does not use the shared resolver')
      assert.doesNotMatch(src, /getServiceRoleClient/, rel + ' still carries a private service client')
      assert.doesNotMatch(src, /from\('clients'\)\s*\.select\([^)]*\)\s*\.eq\('user_id'/, rel + ' has its own clients lookup')
    }
  })

  await test('G2 the connected-only mutations ask for requireConnected', async () => {
    for (const rel of ['project-requests', 'files/[id]', 'proposals/[id]/approve', 'proposals/[id]/request-changes', 'proposals/[id]/viewed']) {
      assert.match(stripComments(read('src/app/api/client-portal/' + rel + '/route.ts')), /requireConnected:\s*true/, rel)
    }
    assert.match(stripComments(read('src/lib/uploads/upload-session.ts')), /requireConnected:\s*true/)
    for (const rel of ['settings', 'me']) assert.doesNotMatch(stripComments(read('src/app/api/client-portal/' + rel + '/route.ts')), /requireConnected/, rel + ' must stay open to unconnected accounts')
  })

  await test('G3 middleware does not require merchant_id to open the Portal, and the new admin routes use the shared admin gate', async () => {
    assert.doesNotMatch(stripComments(read('src/middleware.ts')), /merchant_id/)
    for (const rel of ['status', 'disconnect', 'create-business']) {
      assert.match(stripComments(read('src/app/api/admin/clients/[client_id]/' + rel + '/route.ts')), /await requireActiveAdmin\(\)/, rel)
    }
  })

  await test('G4 no new network surface: no Turnstile on signup, no new tables, no SQL executed by this suite', async () => {
    assert.doesNotMatch(read('src/lib/services/merchant-auth-service.ts') + read('src/app/(client-auth)/client-signup/page.tsx'), /turnstile/i)
    const diffNames = ['client_businesses', 'portal_access_requests']
    for (const f of ['src/lib/client-portal/portal-client.ts', 'src/app/api/admin/clients/[client_id]/create-business/route.ts']) {
      for (const n of diffNames) assert.ok(!read(f).includes(n), f + ' mentions ' + n)
    }
  })

  // ── Finalization, Batch 1 ────────────────────────────────────────────────
  console.log('\nFinalization: integrity and recovery')

  await test('Z1 identity is not client-editable: a CHANGE to name or business is refused (403) and nothing is written; an unchanged value is tolerated', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const before = JSON.stringify(state.tables.clients.find((c) => c.id === CLIENT_A))
    for (const body of [{ full_name: 'Someone Else' }, { business_name: 'Renamed Co' }, { full_name: 'Alice A', business_name: 'Hacked' }, { whatsapp: '+1 234 567 8900', business_name: 'Renamed Co' }]) {
      const r = await call('client-portal/settings', 'PATCH', { body })
      assert.equal(r.status, 403, JSON.stringify(body)); assert.equal(r.json.code, 'identity_locked'); assert.match(r.json.error, /only be changed by Hbee Digitals/)
    }
    assert.equal(JSON.stringify(state.tables.clients.find((c) => c.id === CLIENT_A)), before, 'a refused change wrote nothing — not even the other field in the same request')
    // a stale tab re-sending what is stored is not a change; the rest of the request still applies
    const ok = await call('client-portal/settings', 'PATCH', { body: { full_name: ' Alice A ', business_name: 'A Co', whatsapp: '+1 234 567 8900', country: 'Nigeria' } })
    assert.equal(ok.status, 200)
    const row = state.tables.clients.find((c) => c.id === CLIENT_A)
    assert.equal(row.full_name, 'Alice A'); assert.equal(row.business_name, 'A Co'); assert.equal(row.whatsapp, '+1 234 567 8900'); assert.equal(row.country, 'Nigeria')
    // the same applies to an unconnected account, and another client's row is never touched
    as(USER_NEW); assert.equal((await call('client-portal/settings', 'PATCH', { body: { business_name: 'Mine now' } })).status, 403)
    assert.equal(state.tables.clients.find((c) => c.id === CLIENT_B).business_name, 'B Co')
    // defence in depth: the validator itself no longer knows these fields
    const sd = load('src/lib/client-portal/support-display.ts')
    assert.equal(sd.validateSettingsPatch({ full_name: 'X', business_name: 'Y' }).ok, false, 'nothing left to update')
    assert.deepEqual({ ...sd.validateSettingsPatch({ full_name: 'X', whatsapp: '+1 234 567 8900' }).patch }, { whatsapp: '+1 234 567 8900' })
  })

  await test('Z2 the Settings page shows name and business read-only, never sends them, and offers the existing password-reset flow', () => {
    const page = read('src/app/client-portal/settings/page.tsx')
    assert.match(page, /id="settings-full-name"[^>]*disabled readOnly/); assert.match(page, /id="settings-business-name"[^>]*disabled readOnly/)
    assert.match(page, /Contact Hbee Digitals<\/Link> if these details need to be changed\./)
    const submit = page.slice(page.indexOf('async function handleSubmit'), page.indexOf('async function sendPasswordReset'))
    assert.doesNotMatch(submit, /full_name|business_name/, 'the form never sends identity')
    assert.match(page, /resetPasswordForEmail\(profile\.email, \{ redirectTo: `\$\{siteUrl\}\/client-reset-password` \}\)/)
    assert.match(page, /Change password/); assert.doesNotMatch(page, /updateUser|signInWithPassword/, 'no password is handled on this page')
  })

  await test('Z3 the dashboard reads the canonical proposal visibility set and still surfaces only a proposal awaiting a response', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const docs = load('src/lib/commerce/documents.ts')
    assert.deepEqual([...docs.CLIENT_VISIBLE_PROPOSAL_STATUSES].sort(), ['approved', 'changes_requested', 'converted', 'declined', 'expired', 'rejected', 'sent', 'viewed'])
    const src = stripComments(read('src/app/api/client-portal/dashboard/route.ts'))
    assert.match(src, /CLIENT_VISIBLE_STATUSES = CLIENT_VISIBLE_PROPOSAL_STATUSES/); assert.doesNotMatch(src, /\['sent', 'viewed', 'approved', 'changes_requested'\]/)
    for (const [i, status] of ['declined', 'expired', 'rejected', 'converted'].entries()) {
      state.tables.proposals.push({ id: 'aaaaaaaa-2222-4000-8000-00000000009' + i, client_id: CLIENT_A, merchant_id: MERCHANT_A, status, title: 'Old ' + status, proposal_number: 'PROP-OLD' + i, sent_at: '2026-01-01T00:00:00Z' })
    }
    const r = await call('client-portal/dashboard', 'GET'); assert.equal(r.status, 200)
    assert.equal(r.json.proposal.id, PROP_A, 'the sent proposal is the one surfaced')
    assert.ok(!JSON.stringify(r.json.attention).match(/Old (declined|expired|rejected|converted)/), 'closed proposals are never presented as work')
  })

  await test('Z4 login destinations: only a validated portal PATHNAME is ever returned to; everything else lands on the portal', () => {
    const ps = load('src/lib/client-portal/portal-session.ts')
    assert.equal(ps.postLoginDestination('/client-portal/invoices/abc'), '/client-portal/invoices/abc')
    assert.equal(ps.postLoginDestination('/portal-invitation'), '/portal-invitation')
    assert.equal(ps.postLoginDestination('/client-portal/requests?x=1#y'), '/client-portal/requests', 'query and fragment are dropped')
    for (const bad of [undefined, null, '', 'https://evil.example/client-portal', '//evil.example', '/\\evil.example', '/client-portal/../admin', '/client-portal/%2e%2e/admin', '/admin', '/client-login', '/client-confirmation', 'javascript:alert(1)', '/client-portalx', '/client-portal\n/x']) {
      assert.equal(ps.postLoginDestination(bad), '/client-portal', 'unsafe next must not be followed: ' + String(bad))
    }
    assert.equal(ps.loginUrlFor('/client-portal/projects/p1'), '/client-login?next=%2Fclient-portal%2Fprojects%2Fp1')
    assert.equal(ps.loginUrlFor('/client-portal'), '/client-login'); assert.equal(ps.loginUrlFor('/admin'), '/client-login'); assert.equal(ps.loginUrlFor('https://evil.example'), '/client-login')
  })

  await test('Z5 provisioning recovery is attempted ONCE per user per session; only an explicit retry repeats it; unusable storage never loops', async () => {
    const rec = load('src/lib/client-portal/account-recovery.ts')
    const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m } }
    let calls = 0, ok = true
    const fetchFn = async (url, init) => { calls++; assert.equal(url, '/api/account/provision'); assert.equal(init.method, 'POST'); assert.equal(init.body, undefined, 'no body: the caller names nothing'); return { ok } }
    const storage = mem()
    assert.equal(await rec.attemptProvisionOnce('u1', {}, { fetchFn, storage }), 'recovered'); assert.equal(calls, 1)
    assert.equal(await rec.attemptProvisionOnce('u1', {}, { fetchFn, storage }), 'skipped', 'a second automatic attempt is refused'); assert.equal(calls, 1)
    assert.equal(await rec.attemptProvisionOnce('u2', {}, { fetchFn, storage }), 'recovered', 'another user is independent'); assert.equal(calls, 2)
    ok = false; assert.equal(await rec.attemptProvisionOnce('u1', { force: true }, { fetchFn, storage }), 'failed', 'the Try again button repeats it'); assert.equal(calls, 3)
    // the marker is written BEFORE the request, so a crash mid-flight cannot retry on reload
    const s2 = mem()
    assert.equal(await rec.attemptProvisionOnce('u3', {}, { fetchFn: async () => { throw new Error('boom') }, storage: s2 }), 'failed', 'a network failure is a failed attempt, never a throw')
    assert.equal(await rec.attemptProvisionOnce('u3', {}, { fetchFn, storage: s2 }), 'skipped', 'and it is not retried automatically')
    // storage that cannot be written cannot enforce "once": no automatic attempt at all
    const n = calls
    assert.equal(await rec.attemptProvisionOnce('u4', {}, { fetchFn, storage: null }), 'skipped')
    assert.equal(await rec.attemptProvisionOnce('u4', {}, { fetchFn, storage: { getItem() { throw new Error('blocked') }, setItem() { throw new Error('blocked') } } }), 'skipped'); assert.equal(calls, n)
    assert.equal(await rec.attemptProvisionOnce('', {}, { fetchFn, storage }), 'skipped')
  })

  await test('Z6 the 401 guard sends an expired session to login (remembering the page) for portal APIs only, once, and restores fetch on cleanup', async () => {
    const g = load('src/lib/client-portal/portal-session-guard.ts')
    const assigned = []
    const mk = (status, pathname = '/client-portal/invoices') => {
      const win = { location: { origin: 'https://site.test', pathname, assign: (u) => assigned.push(u) } }
      win.fetch = async () => ({ status })
      return win
    }
    // portal API 401 → login, with the current page remembered
    let win = mk(401); const original = win.fetch; const off = g.installPortalSessionGuard(win)
    assert.notEqual(win.fetch, original)
    const res = await win.fetch('/api/client-portal/invoices'); assert.equal(res.status, 401, 'the response is passed through')
    assert.deepEqual(assigned, ['/client-login?next=%2Fclient-portal%2Finvoices'])
    await win.fetch('/api/client-portal/requests'); assert.equal(assigned.length, 1, 'redirects once, not per request')
    off(); assert.equal(win.fetch, original, 'cleanup restores fetch')
    // other responses and non-portal URLs are untouched
    for (const [status, url] of [[200, '/api/client-portal/me'], [403, '/api/client-portal/me'], [500, '/api/client-portal/me'], [401, '/api/other'], [401, 'https://evil.example/api/client-portal/x'], [401, '/api/uploads/finalize']]) {
      const w = mk(status); const before = assigned.length; g.installPortalSessionGuard(w); await w.fetch(url); assert.equal(assigned.length, before, status + ' ' + url)
    }
    assert.equal(g.isPortalApiRequest('/api/client-portal/me', 'https://site.test'), true); assert.equal(g.isPortalApiRequest('/api/account/provision', 'https://site.test'), false)
  })

  await test('Z7 friendly sign-in and reset messages: the raw Supabase wording is never shown, and bad credentials do not reveal whether an account exists', () => {
    const m = load('src/lib/client-portal/auth-messages.ts')
    const cases = [
      [{ message: 'Invalid login credentials', status: 400, code: 'invalid_credentials' }, m.LOGIN_MESSAGES.credentials],
      [{ message: 'Email not confirmed', code: 'email_not_confirmed' }, m.LOGIN_MESSAGES.unconfirmed],
      [{ message: 'Email rate limit exceeded', status: 429 }, m.LOGIN_MESSAGES.rateLimited],
      [{ message: 'For security purposes, you can only request this after 20 seconds', status: 429, code: 'over_request_rate_limit' }, m.LOGIN_MESSAGES.rateLimited],
      [new TypeError('Failed to fetch'), m.LOGIN_MESSAGES.network],
      [{ message: 'AuthRetryableFetchError: fetch failed' }, m.LOGIN_MESSAGES.network],
      [{ message: 'JWT expired weird internal 0xDEAD' }, m.LOGIN_MESSAGES.generic], [null, m.LOGIN_MESSAGES.generic], ['x', m.LOGIN_MESSAGES.generic],
    ]
    for (const [err, want] of cases) {
      const got = m.friendlyLoginError(err); assert.equal(got, want)
      assert.ok(!/AuthApiError|AuthRetryable|JWT|0xDEAD|Invalid login credentials|rate limit exceeded/i.test(got), 'raw text leaked: ' + got)
    }
    assert.equal(m.friendlyResetError({ status: 429 }), m.RESET_MESSAGES.rateLimited); assert.equal(m.friendlyResetError(new TypeError('Failed to fetch')), m.RESET_MESSAGES.network)
    assert.equal(m.friendlyResetError({ message: 'User not found' }), m.RESET_MESSAGES.generic)
    const login = read('src/app/(client-auth)/client-login/page.tsx')
    assert.doesNotMatch(stripComments(login), /err\.message|setError\(err instanceof Error/, 'the page never prints a raw error'); assert.match(login, /friendlyLoginError\(err\)/); assert.match(login, /friendlyResetError\(err\)/)
  })

  await test('Z8 stranded-account wiring: the middleware sends a profile-less user to the recovery path (no loop), the gate and login page recover once and always offer Try again / Contact / Sign out', () => {
    const mw = stripComments(read('src/middleware.ts'))
    assert.match(mw, /redirect\('\/client-login', \{ account: 'no-profile', next: pathname \}\)/); assert.match(mw, /redirect\(loginPath, isPortalArea \? \{ next: pathname \} : undefined\)/)
    const gate = stripComments(read('src/components/client-portal/PortalAuthGate.tsx'))
    assert.match(gate, /attemptProvisionOnce\(user\.id, \{ force: opts\.forceProvision \}\)/); assert.match(gate, /installPortalSessionGuard\(\)/)
    for (const label of ['Try again', 'Contact Hbee Digitals', 'Sign out']) assert.ok(gate.includes(label), 'gate offers: ' + label)
    assert.equal((gate.match(/attemptProvisionOnce\(/g) || []).length, 1, 'exactly one provisioning call site in the gate: no recursion, no loop')
    const login = stripComments(read('src/app/(client-auth)/client-login/page.tsx'))
    assert.match(login, /searchParams\.get\('account'\) !== 'no-profile'/); assert.match(login, /attemptProvisionOnce\(user\.id\)/); assert.match(login, /\{ force: true \}/)
    for (const label of ['Try again', 'Contact Hbee Digitals', 'Sign out']) assert.ok(login.includes(label), 'login recovery offers: ' + label)
    const route = stripComments(read('src/app/api/account/provision/route.ts'))
    assert.doesNotMatch(route, /request\.json|body/, 'the provisioning endpoint reads no body, so the recovery names nothing')
  })

  await test('Z10 an Admin account is NEVER provisioned as a client (endpoint and function); a normal client still self-recovers; a failed admin lookup refuses', async () => {
    resetState(); db = makeDb(); cache.clear()
    state.tables.admin_users = [{ user_id: ADMIN, is_active: true }, { user_id: 'dddddddd-0000-4000-8000-00000000000d', is_active: false }]
    const clientsBefore = count('clients'), merchantsBefore = count('merchants')
    // an active admin opening the recovery path
    as(ADMIN, { email: 'boss@hbee.test' })
    const a = await call('account/provision', 'POST'); assert.equal(a.status, 403); assert.equal(a.json.code, 'admin_account'); assert.match(a.json.error, /administrator/)
    // a deactivated admin is still an admin account
    as('dddddddd-0000-4000-8000-00000000000d'); assert.equal((await call('account/provision', 'POST')).status, 403)
    assert.equal(count('clients'), clientsBefore, 'no clients row created for an admin'); assert.equal(count('merchants'), merchantsBefore, 'no merchants row created for an admin')
    // the function itself refuses too (the confirmation path calls it directly)
    const prov = load('src/lib/provision-account.ts')
    const direct = await prov.provisionAccount({ id: ADMIN, email: 'boss@hbee.test', email_confirmed_at: '2026-01-01', user_metadata: {} })
    assert.equal(direct.ok, false); assert.equal(direct.reason, 'admin_account'); assert.equal(count('clients'), clientsBefore)
    // a failed admin lookup refuses (fail closed) and creates nothing
    const fresh = uuid(); state.failures['admin_users:select'] = 'XX000'; as(fresh, { email: 'fresh@x.test' })
    assert.equal((await call('account/provision', 'POST')).status, 500); assert.equal(count('clients'), clientsBefore)
    delete state.failures['admin_users:select']
    // normal client self-recovery is unchanged: created once, then idempotent
    const first = await call('account/provision', 'POST'); assert.equal(first.status, 200); assert.equal(first.json.client, 'created'); assert.equal(count('clients'), clientsBefore + 1)
    const again = await call('account/provision', 'POST'); assert.equal(again.status, 200); assert.equal(again.json.client, 'existing'); assert.equal(count('clients'), clientsBefore + 1)
  })

  await test('Z9 request submit: stays on a confirmation that links to the request thread; no timed redirect to Projects; the wording no longer says the project was "added"', async () => {
    resetState(); db = makeDb(); cache.clear(); as(USER_A)
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY }); assert.equal(r.status, 200); assert.match(r.json.requestId, /^[0-9a-f-]{36}$/)
    const form = read('src/components/client-portal/ProjectRequestForm.tsx'); const code = stripComments(form)
    assert.doesNotMatch(code, /setTimeout|router\.push|useRouter/, 'no automatic redirect')
    assert.match(code, /payload\.requestId/); assert.match(code, /\/client-portal\/requests\/\$\{requestId\}/); assert.match(code, /View your request/)
    assert.doesNotMatch(form, /Your project has been added|Taking you to your projects/)
    assert.match(form, /will reply on the request page/); assert.match(form, /Pending Review/)
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  if (failures.length) process.exit(1)
})()
