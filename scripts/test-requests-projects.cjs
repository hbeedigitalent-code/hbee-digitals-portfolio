// S6.3 — Requests & Projects: behaviour tests.
//
// OFFLINE. The REAL route handlers run against an in-memory database; the SQL functions of
// scripts/requests-projects-01-forward.sql are MODELLED in JavaScript (see rpc_model) and checked against the SQL
// text. What this does NOT prove: real RLS, grants, triggers or SQL bodies — those need the staging run of the
// verifier. The harness below is a deliberate copy of scripts/test-portal-access.cjs so that suite stays untouched.
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
    { id: uuid(), client_id: CLIENT_A, title: 'A request', status: 'open', project_id: 'aaaaaaaa-0000-4000-8000-000000000001' },
    { id: uuid(), client_id: CLIENT_B, title: 'B secret request', status: 'open', project_id: 'bbbbbbbb-0000-4000-8000-000000000001' },
  ]
  t.project_invoices = [
    { id: uuid(), project_id: 'aaaaaaaa-0000-4000-8000-000000000001', invoice_number: 'INV-A', amount: 10, currency: 'USD', status: 'sent' },
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
  for (const n of ['thread_messages', 'activity_events', 'project_team_assignments', 'admin_users', 'project_deliverables', 'project_milestones', 'notifications', 'upload_batches', 'upload_sessions', 'growth_profile_pdfs', 'portal_invitations', 'merchant_accounts']) t[n] = t[n] || []
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
        const list = (Array.isArray(q.payload) ? q.payload : [q.payload]).map((p) => ({ id: uuid(), created_at: new Date().toISOString(), ...(name === 'clients' ? { status: 'Active' } : {}), ...(name === 'project_deliverables' ? { status: 'ready' } : {}), ...p }))
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
      gte() { return api }, lte() { return api }, order() { return api }, or() { return api },
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
      // ── S6.3 JS MODELS of the SQL functions in scripts/requests-projects-01-forward.sql. They mirror the SQL
      // statement for statement; scripts/test-requests-projects.cjs also checks the SQL text for the same rules.
      // They are NOT the database: real behaviour needs the staging walkthrough.
      if (name === 'create_portal_request') {
        const c = rows('clients').find((r) => r.id === args.p_client_id)
        if (!c) return { data: { status: 'client_not_found' }, error: null }
        if (String(c.status || '').trim().toLowerCase() === 'suspended') return { data: { status: 'suspended' }, error: null }
        if (!c.merchant_id || !rows('merchants').some((m) => m.id === c.merchant_id)) return { data: { status: 'not_connected' }, error: null }
        state.rpcCalls.push(name)
        if (rows('projects').some((p) => p.project_id === args.p_reference)) return { data: null, error: { code: '23505', message: 'duplicate' } } // whole function rolls back
        const rid = uuid(), pid = uuid()
        rows('project_requests').push({ id: rid, client_id: c.id, title: args.p_title, description: args.p_description, status: 'open', project_id: pid, last_activity_at: new Date().toISOString(), created_at: new Date().toISOString() })
        rows('projects').push({ id: pid, client_id: c.id, project_id: args.p_reference, title: args.p_title, project_name: args.p_title, status: 'Pending Review', progress: 0 })
        const ev = (o) => rows('activity_events').push({ id: uuid(), created_at: new Date().toISOString(), client_id: c.id, project_id: pid, request_id: rid, metadata: {}, ...o })
        ev({ actor_user_id: args.p_actor_user_id, actor_role: 'client', action: 'request_submitted', summary: 'Request submitted', visibility: 'client' })
        ev({ actor_role: 'system', action: 'project_created', summary: 'Project record created and awaiting review', visibility: 'client' })
        return { data: { status: 'created', request_id: rid, project_id: pid }, error: null }
      }
      const norm = (s) => load('src/lib/requests/request-status.ts').normalizeRequestStatus(s)
      if (name === 'post_request_message') {
        const r = rows('project_requests').find((x) => x.id === args.p_request_id)
        if (!r) return { data: { status: 'not_found' }, error: null }
        if (!['client', 'admin'].includes(args.p_author_role)) return { data: { status: 'invalid_role' }, error: null }
        const internal = args.p_author_role === 'client' ? false : !!args.p_internal
        if (args.p_author_role === 'client' && r.client_id !== args.p_client_id) return { data: { status: 'not_found' }, error: null }
        if (args.p_client_key) {
          const dup = rows('thread_messages').find((m) => m.author_user_id === args.p_author_user_id && m.client_key === args.p_client_key)
          if (dup) return { data: { status: 'posted', message_id: dup.id, duplicate: true, request_status: norm(r.status) }, error: null }
        }
        const prev = norm(r.status)
        if (prev === 'closed' && !internal) return { data: { status: 'closed', request_status: prev }, error: null }
        if (args.p_attachment_file_id && !rows('project_files').some((f) => f.id === args.p_attachment_file_id && f.client_id === r.client_id)) return { data: { status: 'invalid_attachment' }, error: null }
        const m = { id: uuid(), request_id: r.id, project_id: r.project_id, client_id: r.client_id, author_user_id: args.p_author_user_id, author_role: args.p_author_role, body: String(args.p_body).trim(), is_internal: internal, attachment_file_id: args.p_attachment_file_id, client_key: args.p_client_key, read_by_client_at: args.p_author_role === 'client' ? 'now' : null, read_by_admin_at: args.p_author_role === 'admin' ? 'now' : null, created_at: new Date(Date.now() + rows('thread_messages').length).toISOString() }
        rows('thread_messages').push(m)
        let next = prev
        if (!internal) { if (args.p_author_role === 'admin' && ['open', 'in_review'].includes(prev)) next = 'answered'; else if (args.p_author_role === 'client' && prev === 'answered') next = 'open' }
        if (next !== prev) r.status = next
        if (args.p_author_role === 'admin' && !internal) r.response = m.body
        r.last_activity_at = new Date().toISOString()
        rows('activity_events').push({ id: uuid(), client_id: r.client_id, project_id: r.project_id, request_id: r.id, actor_role: args.p_author_role, action: internal ? 'internal_note_added' : args.p_author_role === 'admin' ? 'admin_replied' : 'client_replied', summary: 'x', visibility: internal ? 'internal' : 'client', created_at: new Date().toISOString() })
        return { data: { status: 'posted', message_id: m.id, request_status: next, previous_status: prev, duplicate: false }, error: null }
      }
      if (name === 'set_request_status') {
        const r = rows('project_requests').find((x) => x.id === args.p_request_id)
        if (!r) return { data: { status: 'not_found' }, error: null }
        if (args.p_actor_role === 'client' && r.client_id !== args.p_client_id) return { data: { status: 'not_found' }, error: null }
        const prev = norm(r.status)
        if (prev === args.p_new_status) return { data: { status: 'unchanged', request_status: prev }, error: null }
        if (args.p_actor_role === 'client' && !(prev === 'answered' && args.p_new_status === 'closed')) return { data: { status: 'not_allowed', request_status: prev }, error: null }
        r.status = args.p_new_status
        const id = uuid()
        rows('activity_events').push({ id, client_id: r.client_id, request_id: r.id, actor_role: args.p_actor_role, action: 'request_status_changed', summary: 'Request status changed to ' + args.p_new_status, visibility: 'client', created_at: new Date().toISOString() })
        return { data: { status: 'changed', request_status: args.p_new_status, previous_status: prev, event_id: id }, error: null }
      }
      if (name === 'mark_request_read') {
        let n = 0
        for (const m of rows('thread_messages')) {
          if (m.request_id !== args.p_request_id) continue
          if (args.p_reader_role === 'client' && m.client_id === args.p_client_id && m.author_role === 'admin' && !m.is_internal && !m.read_by_client_at) { m.read_by_client_at = 'now'; n++ }
          if (args.p_reader_role === 'admin' && m.author_role === 'client' && !m.read_by_admin_at) { m.read_by_admin_at = 'now'; n++ }
        }
        return { data: n, error: null }
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
  ['client-portal/settings', 'GET'], ['client-portal/settings', 'PATCH', {}, { full_name: 'Renamed' }],
  ['client-portal/project-requests', 'POST', {}, REQ_BODY],
  ['uploads/initiate', 'POST', {}, UPLOAD_BODY],
]

;(async () => {
  console.log('S6.3 requests & projects tests')
  const RID_A = () => state.tables.project_requests.find((r) => r.client_id === CLIENT_A).id
  const RID_B = () => state.tables.project_requests.find((r) => r.client_id === CLIENT_B).id
  const setup = () => { resetState(); db = makeDb(); cache.clear(); state.rpcCalls = [] }
  const adminReq = (rid) => ({ id: rid })
  const MS = 'client-portal/requests/[id]/messages'

  console.log('\nA. Request creation (atomic RPC)')
  await test('A1 connected client: request + project created together, linked, events written, Admin notified', async () => {
    setup(); as(USER_A)
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 200); assert.ok(r.json.requestId)
    const req = state.tables.project_requests.find((x) => x.id === r.json.requestId)
    const proj = state.tables.projects.find((p) => p.id === req.project_id)
    assert.ok(proj && proj.client_id === CLIENT_A && /^PROJ-/.test(proj.project_id))
    assert.equal(state.tables.activity_events.filter((e) => e.request_id === req.id).length, 2)
    const n = state.tables.notifications.filter((x) => x.recipient_scope === 'admin')
    assert.equal(n.length, 1); assert.equal(n[0].link, '/admin/requests/' + req.id)
  })
  await test('A2 unconnected and suspended accounts are refused and nothing is written', async () => {
    setup(); as(USER_NEW)
    const before = [count('project_requests'), count('projects')]
    let r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 403); assert.equal(r.json.code, 'not_connected')
    as(USER_A); state.tables.clients.find((c) => c.id === CLIENT_A).status = 'Suspended'
    r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 403); assert.equal(r.json.code, 'account_suspended')
    assert.deepEqual([count('project_requests'), count('projects')], before)
  })
  await test('A3 a forged client_id / merchant_id / status in the body is ignored', async () => {
    setup(); as(USER_A)
    const r = await call('client-portal/project-requests', 'POST', { body: { ...REQ_BODY, client_id: CLIENT_B, merchant_id: MERCHANT_B, status: 'closed' } })
    assert.equal(r.status, 200)
    const req = state.tables.project_requests.find((x) => x.id === r.json.requestId)
    assert.equal(req.client_id, CLIENT_A); assert.equal(req.status, 'open')
  })
  await test('A4 a reference clash rolls everything back and the route retries; exhausted retries leave NOTHING', async () => {
    setup(); as(USER_A)
    state.tables.projects.push({ id: uuid(), client_id: CLIENT_B, project_id: 'PROJ-CLASH000' })
    const gen = load('src/lib/projects/project-reference.ts')
    assert.ok(typeof gen.generateProjectReference === 'function')
    const orig = db.rpc
    db.rpc = async (n, a) => (n === 'create_portal_request' ? { data: null, error: { code: '23505' } } : orig(n, a))
    const before = [count('project_requests'), count('projects')]
    const r = await call('client-portal/project-requests', 'POST', { body: REQ_BODY })
    assert.equal(r.status, 500); assert.deepEqual([count('project_requests'), count('projects')], before)
    assert.equal(count('notifications'), 0)
  })
  await test('A5 the route performs NO direct request/project inserts (atomicity lives in one RPC) and notification is idempotent', async () => {
    const src = stripComments(read('src/app/api/client-portal/project-requests/route.ts'))
    assert.match(src, /rpc\('create_portal_request'/)
    assert.doesNotMatch(src, /from\('project_requests'\)|from\('projects'\)/)
    setup()
    const { createNotification } = load('src/lib/notifications/createNotification.ts')
    const p = { scope: 'admin', type: 'project_request_created', title: 't', message: 'm', entityType: 'project_request', entityId: uuid() }
    await createNotification(p); await createNotification(p)
    assert.equal(count('notifications'), 1)
  })

  console.log('\nB. Threads')
  await test('B1 client sees own public messages; internal notes never appear; client B gets 404 on A\'s thread', async () => {
    setup(); state.admin = true
    const rid = RID_A()
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body: { body: 'Public reply' } })
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body: { body: 'SECRET internal', internal: true } })
    state.admin = false; as(USER_A)
    const r = await call('client-portal/requests/[id]', 'GET', { params: { id: rid } })
    assert.equal(r.status, 200)
    const text = JSON.stringify(r.json)
    assert.ok(text.includes('Public reply')); assert.ok(!text.includes('SECRET')); assert.ok(!text.includes('is_internal')); assert.ok(!/internal/i.test(JSON.stringify(r.json.activity)))
    as(USER_B)
    const other = await call('client-portal/requests/[id]', 'GET', { params: { id: rid } })
    assert.equal(other.status, 404); assert.ok(!JSON.stringify(other.json).includes('Public reply'))
  })
  await test('B2 a client cannot spoof Admin: author_role / is_internal / client_id in the body are ignored', async () => {
    setup(); as(USER_A)
    const rid = RID_A()
    const r = await call(MS, 'POST', { params: { id: rid }, body: { body: 'hi', author_role: 'admin', internal: true, is_internal: true, client_id: CLIENT_B } })
    assert.equal(r.status, 200)
    const m = state.tables.thread_messages[0]
    assert.equal(m.author_role, 'client'); assert.equal(m.is_internal, false); assert.equal(m.client_id, CLIENT_A)
  })
  await test('B3 a client cannot post on another client\'s request (404, nothing written)', async () => {
    setup(); as(USER_A)
    const r = await call(MS, 'POST', { params: { id: RID_B() }, body: { body: 'intruder' } })
    assert.equal(r.status, 404); assert.equal(count('thread_messages'), 0)
  })
  await test('B4 admin reply answers the request, mirrors legacy response, notifies the client; internal note does neither', async () => {
    setup(); state.admin = true; const rid = RID_A()
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body: { body: 'note', internal: true } })
    assert.equal(state.tables.project_requests.find((x) => x.id === rid).status, 'open'); assert.equal(count('notifications'), 0)
    const r = await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body: { body: 'Here you go' } })
    assert.equal(r.status, 200)
    const row = state.tables.project_requests.find((x) => x.id === rid)
    assert.equal(row.status, 'answered'); assert.equal(row.response, 'Here you go')
    const n = state.tables.notifications; assert.equal(n.length, 1); assert.equal(n[0].recipient_id, CLIENT_A); assert.equal(n[0].recipient_scope, 'client')
  })
  await test('B5 unread: admin reply is unread for the client until read; list count follows; admin unread for client messages', async () => {
    setup(); state.admin = true; const rid = RID_A()
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body: { body: 'Reply' } })
    state.admin = false; as(USER_A)
    let list = await call('client-portal/requests', 'GET')
    assert.equal(list.json.requests.find((x) => x.id === rid).unreadReplies, 1)
    await call('client-portal/requests/[id]/read', 'POST', { params: { id: rid } })
    list = await call('client-portal/requests', 'GET'); assert.equal(list.json.requests.find((x) => x.id === rid).unreadReplies, 0)
    await call(MS, 'POST', { params: { id: rid }, body: { body: 'Thanks' } })
    state.admin = true
    const inbox = await call('admin/requests', 'GET', { url: '/api/admin/requests' })
    assert.equal(inbox.json.requests.find((x) => x.id === rid).unreadFromClient, 1)
  })
  await test('B6 transitions: client reply re-opens answered; client may close only answered; closed refuses replies; admin can reopen', async () => {
    setup(); const rid = RID_A(); as(USER_A)
    let r = await call('client-portal/requests/[id]/status', 'POST', { params: { id: rid }, body: { status: 'closed' } })
    assert.equal(r.status, 409)
    state.tables.project_requests.find((x) => x.id === rid).status = 'answered'
    await call(MS, 'POST', { params: { id: rid }, body: { body: 'one more thing' } })
    assert.equal(state.tables.project_requests.find((x) => x.id === rid).status, 'open')
    state.tables.project_requests.find((x) => x.id === rid).status = 'answered'
    r = await call('client-portal/requests/[id]/status', 'POST', { params: { id: rid }, body: { status: 'closed' } })
    assert.equal(r.status, 200)
    r = await call(MS, 'POST', { params: { id: rid }, body: { body: 'after close' } }); assert.equal(r.status, 409); assert.equal(r.json.code, 'request_closed')
    r = await call('client-portal/requests/[id]/status', 'POST', { params: { id: rid }, body: { status: 'open' } }); assert.equal(r.status, 400)
    state.admin = true
    r = await call('admin/requests/[id]/status', 'POST', { params: adminReq(rid), body: { status: 'open' } })
    assert.equal(r.status, 200); assert.equal(state.tables.project_requests.find((x) => x.id === rid).status, 'open')
  })
  await test('B7 retry with the same clientKey creates ONE message and ONE notification', async () => {
    setup(); state.admin = true; const rid = RID_A()
    const body = { body: 'Once', clientKey: 'key-12345678' }
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body })
    await call('admin/requests/[id]/messages', 'POST', { params: adminReq(rid), body })
    assert.equal(count('thread_messages'), 1); assert.equal(count('notifications'), 1)
  })
  await test('B8 invalid / oversized / empty bodies are refused; suspended and unconnected cannot post', async () => {
    setup(); as(USER_A); const rid = RID_A()
    for (const body of [{ body: '' }, { body: 'x'.repeat(5001) }, { body: 'ok', clientKey: '!' }, { body: 'ok', attachmentFileId: 'nope' }, null]) {
      assert.equal((await call(MS, 'POST', { params: { id: rid }, body })).status, 400)
    }
    state.tables.clients.find((c) => c.id === CLIENT_A).status = 'Suspended'
    assert.equal((await call(MS, 'POST', { params: { id: rid }, body: { body: 'hi' } })).json.code, 'account_suspended')
    as(USER_NEW); assert.equal((await call(MS, 'POST', { params: { id: rid }, body: { body: 'hi' } })).json.code, 'not_connected')
  })
  await test('B9 admin routes require the admin gate; no client can reach them', async () => {
    setup(); as(USER_A); state.admin = false
    for (const [rel, m, p, b] of [['admin/requests', 'GET'], ['admin/requests/[id]', 'GET', adminReq(RID_A())], ['admin/requests/[id]/messages', 'POST', adminReq(RID_A()), { body: 'x' }], ['admin/requests/[id]/status', 'POST', adminReq(RID_A()), { status: 'closed' }]]) {
      assert.equal((await call(rel, m, { params: p || {}, body: b })).status, 401, rel)
    }
  })

  console.log('\nC. Projects, milestones, deliverables')
  const PA = 'aaaaaaaa-0000-4000-8000-000000000001', PB = 'bbbbbbbb-0000-4000-8000-000000000001'
  await test('C1 admin edits name/description; client_id / start_date refused; client reads own project only', async () => {
    setup(); state.admin = true
    let r = await call('admin/projects/[project_id]', 'PATCH', { params: { project_id: PA }, body: { project_name: 'Renamed site', description: 'New text' } })
    assert.equal(r.status, 200)
    const p = state.tables.projects.find((x) => x.id === PA); assert.equal(p.project_name, 'Renamed site'); assert.equal(p.title, 'Renamed site')
    for (const f of ['client_id', 'start_date']) assert.equal((await call('admin/projects/[project_id]', 'PATCH', { params: { project_id: PA }, body: { [f]: 'x' } })).status, 400)
    assert.equal((await call('admin/projects/[project_id]', 'PATCH', { params: { project_id: PA }, body: { progress: 101 } })).status, 400)
    state.admin = false; as(USER_A)
    assert.equal((await call('client-portal/projects/[id]', 'GET', { params: { id: PB } })).status, 404)
  })
  await test('C2 status change records a client-visible event and notifies that client only', async () => {
    setup(); state.admin = true
    await call('admin/projects/[project_id]', 'PATCH', { params: { project_id: PA }, body: { status: 'In Progress', progress: 40 } })
    const ev = state.tables.activity_events.filter((e) => e.project_id === PA)
    assert.ok(ev.some((e) => e.action === 'project_status_changed' && e.visibility === 'client'))
    assert.ok(state.tables.notifications.length >= 1 && state.tables.notifications.every((n) => n.recipient_id === CLIENT_A))
  })
  await test('C3 milestones: admin CRUD + reorder; cross-project id is 404; client has no write route', async () => {
    setup(); state.admin = true
    const mk = async (t) => (await call('admin/projects/[project_id]/milestones', 'POST', { params: { project_id: PA }, body: { title: t } })).json.milestone
    const m1 = await mk('Design'), m2 = await mk('Build')
    assert.equal(m1.sort_order, 1); assert.equal(m2.sort_order, 2)
    let r = await call('admin/projects/[project_id]/milestones/reorder', 'POST', { params: { project_id: PA }, body: { orderedIds: [m2.id, m1.id] } })
    assert.equal(r.status, 200); assert.equal(state.tables.project_milestones.find((m) => m.id === m2.id).sort_order, 1)
    r = await call('admin/projects/[project_id]/milestones/reorder', 'POST', { params: { project_id: PA }, body: { orderedIds: [m2.id] } }); assert.equal(r.status, 409)
    r = await call('admin/projects/[project_id]/milestones/[milestone_id]', 'PATCH', { params: { project_id: PB, milestone_id: m1.id }, body: { status: 'completed' } }); assert.equal(r.status, 404)
    r = await call('admin/projects/[project_id]/milestones/[milestone_id]', 'PATCH', { params: { project_id: PA, milestone_id: m1.id }, body: { status: 'completed' } })
    assert.equal(r.status, 200); assert.ok(state.tables.project_milestones.find((m) => m.id === m1.id).completed_at)
    assert.ok(state.tables.notifications.some((n) => n.type === 'milestone_completed' && n.recipient_id === CLIENT_A))
    assert.equal((await call('admin/projects/[project_id]/milestones/[milestone_id]', 'DELETE', { params: { project_id: PA, milestone_id: m1.id } })).status, 200)
    assert.doesNotMatch(read('src/app/api/client-portal/projects/[id]/route.ts'), /export async function (POST|PATCH|PUT|DELETE)/)
    state.admin = false; as(USER_A)
    assert.equal((await call('admin/projects/[project_id]/milestones', 'POST', { params: { project_id: PA }, body: { title: 'x' } })).status, 401)
  })
  await test('C4 deliverables: admin CRUD, drafts hidden from the client everywhere, other client\'s file refused, https only', async () => {
    setup(); state.admin = true
    const add = (b) => call('admin/projects/[project_id]/deliverables', 'POST', { params: { project_id: PA }, body: b })
    const draft = (await add({ title: 'Draft logo', status: 'draft', fileId: FILE_A })).json.deliverable
    const ready = (await add({ title: 'Final logo', status: 'ready', fileId: FILE_A })).json.deliverable
    assert.equal((await add({ title: 'Stolen', fileId: 'bbbbbbbb-1111-4000-8000-000000000001' })).status, 400)
    assert.equal((await add({ title: 'Bad link', externalUrl: 'http://evil.test/x' })).status, 400)
    assert.equal((await add({ title: 'Ok link', externalUrl: 'https://example.com/x' })).status, 201)
    assert.equal(state.tables.notifications.filter((n) => n.type === 'deliverable_ready').length, 2)
    state.admin = false; as(USER_A)
    const detail = await call('client-portal/projects/[id]', 'GET', { params: { id: PA } })
    state.tables.project_deliverables.forEach((d) => { if (d.status === undefined) d.status = 'ready' })
    const ids = detail.json.deliverables.map((d) => d.id)
    assert.ok(!ids.includes(draft.id) && ids.includes(ready.id))
    assert.equal((await call('client-portal/deliverables/[id]/signed-url', 'GET', { params: { id: draft.id } })).status, 404)
    assert.equal((await call('client-portal/deliverables/[id]/signed-url', 'GET', { params: { id: ready.id } })).status, 200)
    as(USER_B); assert.equal((await call('client-portal/deliverables/[id]/signed-url', 'GET', { params: { id: ready.id } })).status, 404)
    state.admin = true
    assert.equal((await call('admin/projects/[project_id]/deliverables/[deliverable_id]', 'PATCH', { params: { project_id: PB, deliverable_id: ready.id }, body: { title: 'x2' } })).status, 404)
    assert.equal((await call('admin/projects/[project_id]/deliverables/[deliverable_id]', 'DELETE', { params: { project_id: PA, deliverable_id: ready.id } })).status, 200)
  })
  await test('C5 team: only active admins can be assigned; assign is idempotent; client route exposes a count, never identity', async () => {
    setup(); state.admin = true; state.tables.admin_users = [{ user_id: ADMIN, is_active: true }, { user_id: USER_B, is_active: false }]
    const post = (id) => call('admin/projects/[project_id]/team', 'POST', { params: { project_id: PA }, body: { admin_user_id: id } })
    assert.equal((await post(ADMIN)).status, 200); assert.equal((await post(USER_B)).status, 409)
    assert.equal((await call('admin/projects/[project_id]/team', 'GET', { params: { project_id: PA } })).json.team.length, 1)
    assert.doesNotMatch(stripComments(read('src/app/api/client-portal/projects/[id]/route.ts')), /admin_user_id|admin_users/)
  })

  await test('C6 public portfolio rows (no client_id) cannot be renamed, given milestones, deliverables or a team', async () => {
    setup(); state.admin = true
    const PUB = 'cccccccc-0000-4000-8000-000000000001'
    state.tables.projects.push({ id: PUB, client_id: null, project_id: null, project_name: 'Public case study', title: 'Public case study', status: 'published', progress: 0, description: 'public copy' })
    let r = await call('admin/projects/[project_id]', 'PATCH', { params: { project_id: PUB }, body: { project_name: 'Hijacked', description: 'x' } })
    assert.equal(r.status, 409); assert.equal(r.json.code, 'not_client_project')
    assert.equal(state.tables.projects.find((p) => p.id === PUB).project_name, 'Public case study')
    for (const [rel, m, b] of [['milestones', 'POST', { title: 'No' }], ['deliverables', 'POST', { title: 'No' }], ['team', 'POST', { admin_user_id: ADMIN }]]) {
      r = await call('admin/projects/[project_id]/' + rel, m, { params: { project_id: PUB }, body: b })
      assert.equal(r.status, 409, rel); assert.equal(r.json.code, 'not_client_project')
    }
    assert.equal(count('project_milestones'), 0); assert.equal(count('project_deliverables'), 0); assert.equal(count('project_team_assignments'), 0)
  })

  console.log('\nD. Files ownership')
  await test('D1 client cannot delete Hbee-supplied or unclassified files; can delete its own', async () => {
    setup(); as(USER_A)
    const f = state.tables.project_files.find((x) => x.id === FILE_A)
    for (const role of ['admin', null, undefined]) {
      f.uploaded_by_role = role
      const r = await call('client-portal/files/[id]', 'DELETE', { params: { id: FILE_A } })
      assert.equal(r.status, 403, String(role)); assert.equal(r.json.code, 'file_not_deletable')
      assert.ok(state.tables.project_files.some((x) => x.id === FILE_A))
    }
    f.uploaded_by_role = 'client'
    assert.equal((await call('client-portal/files/[id]', 'DELETE', { params: { id: FILE_A } })).status, 200)
  })
  console.log('\nE. Activity & dashboard')
  await test('E1 dashboard shows client-visible events and answered requests; never internal events or other clients\' events', async () => {
    setup(); const rid = RID_A()
    state.tables.activity_events.push(
      { id: uuid(), client_id: CLIENT_A, request_id: rid, visibility: 'client', summary: 'Visible event', created_at: new Date().toISOString() },
      { id: uuid(), client_id: CLIENT_A, request_id: rid, visibility: 'internal', summary: 'INTERNAL event', created_at: new Date().toISOString() },
      { id: uuid(), client_id: CLIENT_B, request_id: RID_B(), visibility: 'client', summary: 'B EVENT', created_at: new Date().toISOString() })
    state.tables.project_requests.find((x) => x.id === rid).status = 'answered'
    as(USER_A)
    const r = await call('client-portal/dashboard', 'GET'); assert.equal(r.status, 200)
    const t = JSON.stringify(r.json)
    assert.ok(t.includes('Visible event')); assert.ok(!t.includes('INTERNAL')); assert.ok(!t.includes('B EVENT'))
    assert.ok(r.json.attention.some((a) => a.kind === 'request' && a.href === '/client-portal/requests/' + rid))
  })
  await test('E2 activity is append-only in application code: nothing updates or deletes activity_events', async () => {
    const files = []
    const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p) } }
    walk('src')
    for (const f of files) assert.doesNotMatch(stripComments(read(f)), /from\('activity_events'\)\s*\.\s*(update|delete|upsert)/, f)
  })

  console.log('\nF. SQL package (static) and model parity')
  const fwd = read('scripts/requests-projects-01-forward.sql')
  await test('F1 forward SQL: server-only tables, append-only, no client-authored internal notes, definer functions pinned and service_role-only', async () => {
    for (const t of ['thread_messages', 'activity_events', 'project_team_assignments']) {
      assert.match(fwd, new RegExp('ALTER TABLE public\\.' + t + '\\s+ENABLE ROW LEVEL SECURITY'))
    }
    assert.doesNotMatch(fwd, /CREATE POLICY/i)
    assert.match(fwd, /REVOKE ALL ON public\.thread_messages, public\.activity_events, public\.project_team_assignments FROM PUBLIC, anon, authenticated/)
    assert.match(fwd, /GRANT SELECT, INSERT ON public\.activity_events TO service_role/)
    assert.match(fwd, /NOT \(is_internal AND author_role = 'client'\)/)
    assert.match(fwd, /BEFORE UPDATE OR DELETE ON public\.activity_events/); assert.match(fwd, /BEFORE TRUNCATE ON public\.activity_events/)
    assert.equal((fwd.match(/SECURITY DEFINER SET search_path = pg_catalog, public/g) || []).length, 4)
    assert.equal((fwd.match(/GRANT EXECUTE ON FUNCTION[^\n]+TO service_role/g) || []).length, 5)
    assert.doesNotMatch(fwd, /GRANT EXECUTE[^\n]+TO (anon|authenticated|PUBLIC)/i)
    assert.doesNotMatch(stripComments(fwd.replace(/--.*$/gm, '')), /\b(DROP TABLE|DELETE FROM|TRUNCATE TABLE)\b/i)
  })
  await test('F2 the SQL status mapping equals the JS mapping for every legacy value', async () => {
    const { normalizeRequestStatus } = load('src/lib/requests/request-status.ts')
    const block = fwd.slice(fwd.indexOf('CREATE FUNCTION public.hbee_request_status'), fwd.indexOf('CREATE FUNCTION public.create_portal_request'))
    const map = {}
    for (const m of block.matchAll(/WHEN '([^']+)' THEN '([a-z_]+)'/g)) map[m[1]] = m[2]
    assert.ok(Object.keys(map).length >= 12)
    for (const [k, v] of Object.entries(map)) assert.equal(normalizeRequestStatus(k), v, k)
    for (const k of ['', null, undefined, 'weird', 'OPEN', ' Open ']) assert.equal(normalizeRequestStatus(k), 'open')
  })
  await test('F3 rollback guards data loss and the verifier is a single read-only statement', async () => {
    const rb = read('scripts/requests-projects-02-rollback.sql'); const v = read('scripts/requests-projects-03-verify-readonly.sql'); const pf = read('scripts/requests-projects-00-preflight-readonly.sql')
    assert.match(rb, /hbee\.allow_data_loss/)
    for (const s of [v, pf]) { const body = s.replace(/--.*$/gm, '').replace(/'[^']*'/g, "''"); assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i); assert.equal((body.match(/;/g) || []).length, 1) }
  })

  await test('F4 production reconciliation: completed_at is asserted not added; rollback never drops it; guards abort on unexpected shapes', async () => {
    const rb = read('scripts/requests-projects-02-rollback.sql').replace(/--.*$/gm, '')
    const code = fwd.replace(/--.*$/gm, '')
    assert.doesNotMatch(code, /ADD COLUMN completed_at/i)
    assert.doesNotMatch(rb, /completed_at/i)
    assert.match(code, /completed_at is % \(expected a date\/time type\)/)
    assert.match(code, /unexpected CHECK constraint\(s\)/)
    assert.match(code, /the mapper does not know/)
    assert.match(code, /admin_users\.user_id is not unique/)
    assert.match(code, /projects_status_check is missing or does not allow/)
    // Only top-level statements rewrite existing rows (function bodies and DO blocks run later / only assert).
    const top = code.replace(/\$\$[\s\S]*?\$\$/g, '')
    const updates = (top.match(/UPDATE public\.[a-z_]+ [^;]*;/gi) || []).map((u) => u.replace(/\s+/g, ' ').slice(0, 100))
    assert.equal(updates.length, 3, updates.join(' | '))
    assert.ok(updates.some((u) => /project_requests SET last_activity_at/.test(u)) && updates.some((u) => /project_milestones m SET sort_order/.test(u)))
    // the one project_files UPDATE is the conservative, evidence-gated client backfill (see G4)
    assert.equal(updates.filter((u) => /project_files f SET uploaded_by_role = 'client'/.test(u)).length, 1)
  })
  await test('F5 the 00b reconciliation script is one read-only statement and does not read message bodies, emails or paths', async () => {
    const raw = read('scripts/requests-projects-00b-reconcile-readonly.sql')
    const body = raw.replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''")
    assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
    assert.equal((body.match(/;/g) || []).length, 1)
    assert.match(raw, /pg_get_functiondef/)
    assert.doesNotMatch(raw, /SELECT[^\n]*\b(message|attachment_url|email)\b[^\n]*FROM public\.project_messages/i)
  })
  await test('F5b no S6.3 SQL asks for a column-level DELETE privilege (22023), and 00b s2priv checks table-level too', async () => {
    for (const f of ['00', '00b-reconcile', '01-forward', '03-verify']) {
      const name = require('node:fs').readdirSync(path.join(root, 'scripts')).find((n) => n.startsWith('requests-projects-' + f))
      const sql = read('scripts/' + name).replace(/--.*$/gm, '')
      assert.doesNotMatch(sql, /has_any_column_privilege\([^)]*'(DELETE|TRUNCATE|REFERENCES|TRIGGER)'/i, name)
      assert.doesNotMatch(sql, /has_column_privilege\([^)]*'DELETE'/i, name)
    }
    const b = read('scripts/requests-projects-00b-reconcile-readonly.sql')
    const s2 = b.slice(b.indexOf('s2priv AS ('), b.indexOf('s3 AS ('))
    for (const p of ['SELECT', 'INSERT', 'UPDATE']) assert.match(s2, new RegExp("has_any_column_privilege\\(x\\.role, r\\.oid, '" + p + "'\\) OR has_table_privilege\\(x\\.role, r\\.oid, '" + p + "'\\)"))
    assert.match(s2, /CASE WHEN has_table_privilege\(x\.role, r\.oid, 'DELETE'\) THEN 'DELETE'/)
    const v = read('scripts/requests-projects-03-verify-readonly.sql')
    assert.match(v, /has_table_privilege\(r\.role, to_regclass\('public\.' \|\| x\.t\), 'DELETE'\)/)
  })
  await test('F5c no S6.3 SQL concatenates or string-aggregates an uncast catalog "char" column (42725), and the first assertion is the explicit-cast form', async () => {
    const CHAR_COLS = 'relkind|contype|polcmd|prokind|tgenabled|relpersistence|typtype|typcategory|attidentity|attgenerated|provolatile|proparallel|confupdtype|confdeltype|confmatchtype|relreplident'
    const bad = new RegExp('(?:\\b(?:[a-z_]+\\.)?(?:' + CHAR_COLS + ')\\b(?!\\s*::)\\s*\\|\\|)|(?:\\|\\|\\s*(?:[a-z_]+\\.)?(?:' + CHAR_COLS + ')\\b(?!\\s*::))', 'i')
    for (const n of require('node:fs').readdirSync(path.join(root, 'scripts')).filter((x) => /^requests-projects-.*\.sql$/.test(x))) {
      const sql = read('scripts/' + n).replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''")
      assert.doesNotMatch(sql, bad, n + ' concatenates an uncast "char" column')
      assert.doesNotMatch(sql, /string_agg\(\s*(?:[a-z_]+\.)?(?:relkind|contype)\b(?!\s*::)/i, n)
    }
    assert.match(fwd, /c\.relname::text \|\| ':' \|\| c\.relkind::text/)
    // the guard really catches the original defect
    assert.match("string_agg(c.relname || ':' || c.relkind, ', ')".replace(/'(?:[^']|'')*'/g, "''"), bad)
  })
  await test('F6 verifier covers the browser-write-path, file-ownership and append-only guarantees', async () => {
    const v = read('scripts/requests-projects-03-verify-readonly.sql')
    for (const needle of ['project_files / project_requests: no browser write privilege', "project_files_uploaded_by_role_check", 'activity_events: triggers refuse UPDATE, DELETE and TRUNCATE', 'no policies (server-only)', 'EXECUTE: service_role yes', 'internal notes cannot be client-authored']) {
      assert.ok(v.includes(needle), needle)
    }
  })

  console.log('\nG. finalize_upload ownership, historical backfill, effective-RLS verifier')
  const rollbackSql = read('scripts/requests-projects-02-rollback.sql')
  const verifySql = read('scripts/requests-projects-03-verify-readonly.sql')
  const code01 = fwd.replace(/--.*$/gm, '')

  // A representative finalize_upload body (production's real body is NOT in the repo; the forward migration edits
  // the LIVE text). This only exercises the transformation rules, with \m / \M expressed as \b for JavaScript.
  const SAMPLE = [
    'CREATE OR REPLACE FUNCTION public.finalize_upload(p_upload_id uuid, p_actor uuid)',
    ' RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO \'public\', \'pg_temp\'',
    'AS $function$',
    'DECLARE v_s upload_sessions%ROWTYPE; v_uploaded_by text; v_file uuid;',
    'BEGIN',
    '  SELECT * INTO v_s FROM upload_sessions WHERE id = p_upload_id FOR UPDATE;',
    '  IF v_s.context = \'client_file\' THEN',
    '    v_uploaded_by := v_s.uploader_role;',
    '    INSERT INTO public.project_files (client_id, project_id, file_name, file_url, uploaded_by, uploaded_at)',
    '    VALUES (v_s.client_id, v_s.project_id, v_s.file_name, v_s.object_path, v_uploaded_by, now())',
    '    RETURNING id INTO v_file;',
    '  ELSE',
    '    INSERT INTO public.proposal_files (proposal_id, file_name) VALUES (v_s.proposal_id, v_s.file_name) RETURNING id INTO v_file;',
    '  END IF;',
    '  RETURN jsonb_build_object(\'status\', \'finalized\', \'file_id\', v_file);',
    'END $function$',
  ].join('\n')
  function transform(def) {
    const stmt = (def.match(/INSERT\s+INTO\s+(?:public\.)?project_files\b[^;]*;/i) || [])[0]
    assert.ok(stmt, 'isolates the project_files INSERT')
    let next = stmt.replace(/\buploaded_by\b/, 'uploaded_by, uploaded_by_role')
    next = next.replace(/\bv_uploaded_by\b/, 'v_uploaded_by, v_s.uploader_role')
    const back = next.replace('uploaded_by, uploaded_by_role', 'uploaded_by').replace('v_uploaded_by, v_s.uploader_role', 'v_uploaded_by')
    assert.equal(back, stmt, 'only two insertions')
    return { stmt, next, out: def.replace(stmt, next) }
  }

  await test('G1 finalize_upload is edited IN PLACE (two tokens), not rewritten, and its shape is asserted before and after', async () => {
    assert.doesNotMatch(code01, /CREATE (OR REPLACE )?FUNCTION public\.finalize_upload/i, 'no hand-written finalize_upload body')
    for (const needle of ['pg_get_functiondef(v_oid)', 'EXECUTE v_new', "'uploaded_by, uploaded_by_role'", "'v_uploaded_by, v_s.uploader_role'",
      'exactly ONE public.finalize_upload', 'p_upload_id uuid, p_actor uuid', "search_path=public, pg_temp", 'INSERT INTO project_files exactly once',
      'differs from the original by more than the two insertions', 'finalize_upload signature / security / search_path / ACL / owner changed',
      'INSERT INTO public.s63_function_backups']) {
      assert.ok(code01.includes(needle) || fwd.includes(needle), needle)
    }
    assert.doesNotMatch(code01, /finalize_upload\s*\(\s*uuid\s*,\s*uuid\s*,/i, 'no extra argument / overload')
    assert.ok(fwd.indexOf('ADD COLUMN uploaded_by_role') < fwd.indexOf('EXECUTE v_new'), 'the column exists before the function that writes it')
    const r = transform(SAMPLE)
    assert.match(r.next, /uploaded_by, uploaded_by_role, uploaded_at\)/)
    assert.match(r.next, /v_uploaded_by, v_s\.uploader_role, now\(\)\)/)
    assert.equal((r.out.match(/uploaded_by_role/g) || []).length, 1)
    assert.ok(r.out.includes('INSERT INTO public.proposal_files (proposal_id, file_name) VALUES'), 'the proposal branch is untouched')
    assert.ok(r.out.includes('v_uploaded_by := v_s.uploader_role;'), 'the original assignment is kept')
  })

  await test('G2 no post-RPC ownership UPDATE remains: a successful finalize can never be turned into a failure by a second write', async () => {
    const fin = stripComments(read('src/app/api/uploads/finalize/route.ts'))
    assert.doesNotMatch(fin, /uploaded_by_role/)
    assert.doesNotMatch(fin, /from\('project_files'\)\s*\.\s*(update|insert|upsert)/)
    for (const f of ['src/app/api/uploads/initiate/route.ts', 'src/app/api/uploads/cancel/route.ts', 'src/lib/uploads/upload-session.ts']) {
      assert.doesNotMatch(stripComments(read(f)), /uploaded_by_role/, f)
    }
    assert.match(fin, /rpc\('finalize_upload'/)
    assert.match(fin, /outcome === 'finalized' \|\| outcome === 'already_finalized'/)
  })

  await test('G3 rollback restores the ORIGINAL finalize_upload from the saved copy BEFORE dropping uploaded_by_role', async () => {
    const rb = rollbackSql.replace(/--.*$/gm, '')
    const restore = rb.indexOf('EXECUTE v_def')
    const dropCol = rb.indexOf('DROP COLUMN IF EXISTS uploaded_by_role')
    const dropBackup = rb.indexOf('DROP TABLE IF EXISTS public.s63_function_backups')
    assert.ok(restore > 0 && dropCol > restore, 'restore happens before the column is dropped')
    assert.ok(dropBackup > restore, 'the backup is dropped only after it was used')
    assert.match(rb, /IS DISTINCT FROM v_def/, 'the restored definition is compared with the saved one')
    assert.match(rb, /no saved original of finalize_upload/, 'no backup -> abort, never a guessed body')
    assert.doesNotMatch(rb, /CREATE (OR REPLACE )?FUNCTION public\.finalize_upload/i)
    assert.doesNotMatch(rb, /completed_at/)
  })

  await test('G4 historical backfill is deterministic: 19 proven client files are classified, the 6 without evidence stay NULL', async () => {
    // JS model of the forward UPDATE predicate, run on a fixture shaped like production (25 files, 19 client sessions, 6 none).
    const clients = [{ id: 'c1', user_id: 'u1' }, { id: 'c2', user_id: 'u2' }]
    const admins = [{ user_id: 'a1' }]
    const files = [], sessions = []
    for (let i = 0; i < 19; i++) {
      const c = clients[i % 2]
      files.push({ id: 'f' + i, client_id: c.id, uploaded_by: 'client', uploaded_by_role: null })
      sessions.push({ result_file_id: 'f' + i, uploader_role: 'client', client_id: c.id, uploader_user_id: c.user_id })
    }
    for (let i = 19; i < 25; i++) files.push({ id: 'f' + i, client_id: 'c1', uploaded_by: 'client', uploaded_by_role: null }) // role word says client, NO session
    const classify = (f) => {
      const ss = sessions.filter((s) => s.result_file_id === f.id)
      const c = clients.find((x) => x.id === f.client_id)
      return f.uploaded_by_role == null && ss.length === 1 &&
        ss.some((s) => s.uploader_role === 'client' && s.client_id === f.client_id && c && s.uploader_user_id === c.user_id) &&
        !ss.some((s) => admins.some((a) => a.user_id === s.uploader_user_id))
    }
    for (const f of files) if (classify(f)) f.uploaded_by_role = 'client'
    assert.equal(files.filter((f) => f.uploaded_by_role === 'client').length, 19)
    assert.equal(files.filter((f) => f.uploaded_by_role === null).length, 6)
    assert.ok(files.slice(19).every((f) => f.uploaded_by === 'client' && f.uploaded_by_role === null), 'uploaded_by is never used to classify')
    // ambiguity stays protected
    const amb = { id: 'x', client_id: 'c1', uploaded_by_role: null }
    sessions.push({ result_file_id: 'x', uploader_role: 'client', client_id: 'c1', uploader_user_id: 'u1' }, { result_file_id: 'x', uploader_role: 'client', client_id: 'c1', uploader_user_id: 'u1' })
    assert.equal(classify(amb), false, 'two sessions = ambiguous = not classified')
    sessions.push({ result_file_id: 'y', uploader_role: 'client', client_id: 'c1', uploader_user_id: 'a1' })
    assert.equal(classify({ id: 'y', client_id: 'c1', uploaded_by_role: null }), false, 'a client-role session by an admin login is not classified')
    // the SQL carries the same conditions
    const upd = (code01.match(/UPDATE public\.project_files f[\s\S]*?;/) || [''])[0]
    for (const needle of ["SET uploaded_by_role = 'client'", 'f.uploaded_by_role IS NULL', ') = 1', "s.uploader_role = 'client'", 's.client_id = f.client_id', 's.uploader_user_id = c.user_id', 'NOT EXISTS']) {
      assert.ok(upd.includes(needle), needle)
    }
    assert.doesNotMatch(upd, /\buploaded_by\b(?!_role)/, 'the free-text uploaded_by column is never read')
    assert.doesNotMatch(code01, /uploaded_by_role\s*=\s*'admin'/, 'nothing is ever backfilled as admin')
    assert.match(fwd, /RAISE NOTICE 'project_files: %/)
  })

  await test('G5 the known production projects_status_check does not block the migration and is never replaced', async () => {
    const PRODUCTION = "CHECK ((status = ANY (ARRAY['draft'::text, 'published'::text, 'Pending Review'::text, 'Onboarding'::text, 'Assets Required'::text, 'In Review'::text, 'In Progress'::text, 'Awaiting Client Feedback'::text, 'Revision Stage'::text, 'Completed'::text, 'Archived'::text])))"
    const listed = (fwd.match(/ARRAY\['Pending Review'[^\]]*\]/) || [''])[0].match(/'[^']+'/g).map((s) => s.slice(1, -1))
    assert.equal(listed.length, 9)
    for (const s of listed) assert.ok(PRODUCTION.includes("'" + s + "'::text"), s + ' is allowed by the production constraint')
    const { OPERATIONAL_PROJECT_STATUSES } = load('src/lib/projects/project-status.ts')
    for (const s of OPERATIONAL_PROJECT_STATUSES) assert.ok(PRODUCTION.includes("'" + s + "'::text"), s)
    // the unexpected-CHECK guard scans three tables and projects is not one of them
    const guard = (code01.match(/conrelid::regclass::text IN \(([^)]*)\)/) || [])[1] || ''
    assert.ok(guard.includes('project_requests') && !guard.includes("'projects'"), guard)
    assert.doesNotMatch(code01, /DROP CONSTRAINT[^;]*projects_status_check|ALTER TABLE public\.projects/i)
  })

  await test('G6 verifier is effective-RLS-aware: confined grants pass, client-effective writes/reads fail (model of the SQL rule on production policy shapes)', async () => {
    // JS mirror of the verifier's `eff` / `bad` logic.
    const ADMIN_Q = "(EXISTS ( SELECT 1 FROM admin_users WHERE ((admin_users.user_id = auth.uid()) AND (admin_users.is_active = true))))"
    const policies = [
      { tbl: 'project_deliverables', cmd: 'ALL', q: ADMIN_Q, wc: ADMIN_Q, roles: ['authenticated'] },
      { tbl: 'project_deliverables', cmd: 'SELECT', q: '(project_id IN ( SELECT p.id FROM projects p WHERE (p.client_id = current_client_id())))', wc: '', roles: ['authenticated'] },
      { tbl: 'project_milestones', cmd: 'ALL', q: ADMIN_Q, wc: ADMIN_Q, roles: ['authenticated'] },
      { tbl: 'project_milestones', cmd: 'SELECT', q: '(project_id IN ( SELECT p.id FROM projects p WHERE (p.client_id = current_client_id())))', wc: '', roles: ['authenticated'] },
      { tbl: 'projects', cmd: 'ALL', q: ADMIN_Q, wc: ADMIN_Q, roles: ['authenticated'] },
      { tbl: 'projects', cmd: 'SELECT', q: '(client_id = current_client_id())', wc: '', roles: ['authenticated'] },
      { tbl: 'projects', cmd: 'SELECT', q: "((status = 'published'::text) AND (client_id IS NULL))", wc: '', roles: ['anon', 'authenticated'] },
      { tbl: 'notifications', cmd: 'UPDATE', q: "((recipient_scope = 'client'::text) AND (recipient_id = current_client_id()))", wc: '', roles: ['authenticated'] },
      { tbl: 'notifications', cmd: 'UPDATE', q: ADMIN_Q + " AND (recipient_scope = 'admin'::text)", wc: '', roles: ['authenticated'] },
    ]
    const grants = { // production: raw privileges the authenticated role holds
      project_deliverables: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], project_milestones: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'],
      project_messages: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'], projects: ['SELECT', 'UPDATE'], notifications: ['SELECT', 'UPDATE'],
    }
    const isAdmin = (s) => /admin_users/i.test(s) && /is_active/i.test(s)
    function badOnes(list) {
      const out = []
      for (const p of list) for (const role of ['anon', 'authenticated']) {
        const applies = p.roles.includes(role)
        const ops = p.cmd === 'ALL' ? ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] : [p.cmd]
        for (const op of ops) {
          const holds = role === 'authenticated' ? (grants[p.tbl] || []).includes(op) : (p.tbl === 'projects' && op === 'SELECT')
          const confined =
            (op === 'SELECT' ? isAdmin(p.q) || /auth\.uid\(\)|current_client_id\(\)/.test(p.q) || (p.tbl === 'projects' && /status\s*=\s*'published'/.test(p.q) && /client_id\s+IS\s+NULL/i.test(p.q))
              : op === 'INSERT' ? (p.cmd === 'ALL' && p.wc === '' ? isAdmin(p.q) : isAdmin(p.wc)) : isAdmin(p.q)) ||
            (p.tbl === 'notifications' && op !== 'SELECT' && /recipient_scope/.test(p.q) && /recipient_id/.test(p.q))
          if (applies && holds && !confined) out.push(p.tbl + ':' + op + ':' + role)
        }
      }
      return out
    }
    assert.deepEqual(badOnes(policies), [], 'production shapes: broad grants are confined by RLS -> no exposure')
    // a client-effective write and an unscoped read are both caught
    assert.deepEqual(badOnes([...policies, { tbl: 'project_milestones', cmd: 'ALL', q: 'true', wc: 'true', roles: ['authenticated'] }]).filter((x) => x.startsWith('project_milestones')).sort(),
      ['project_milestones:DELETE:authenticated', 'project_milestones:INSERT:authenticated', 'project_milestones:SELECT:authenticated', 'project_milestones:UPDATE:authenticated'])
    assert.ok(badOnes([...policies, { tbl: 'projects', cmd: 'SELECT', q: 'true', wc: '', roles: ['anon'] }]).includes('projects:SELECT:anon'), 'anon reading client projects is flagged')
    assert.ok(badOnes([...policies, { tbl: 'notifications', cmd: 'UPDATE', q: 'true', wc: '', roles: ['authenticated'] }]).includes('notifications:UPDATE:authenticated'), 'cross-client notification writes are flagged')
    // static: the SQL has the same rule and no longer treats a raw grant as a failure
    for (const needle of ['bad AS (SELECT * FROM eff WHERE applies AND holds AND NOT confined)', 'confined', "'effective RLS: no client-effective WRITE on '", "'effective RLS: no cross-client / unscoped READ on '",
      'client-effective INSERT/UPDATE/DELETE on project_deliverables or project_milestones', 'a client cannot mutate another client', 'anonymous access is limited to published rows with no client',
      'finalize_upload: stamps uploaded_by_role', 'finalize_upload: exactly one overload', 'historical files: unknown (NULL)', 'notification idempotency', 'completed_at kept']) {
      assert.ok(verifySql.includes(needle), needle)
    }
    assert.doesNotMatch(verifySql.replace(/--.*$/gm, ''), /no browser write path around the server rules/)
  })

  await test('G7 deliverables always carry a file or https link (file_url is NOT NULL): create without one is refused, clearing is refused, no placeholder is ever inserted', async () => {
    setup(); state.admin = true
    const url = 'admin/projects/[project_id]/deliverables'
    const add = (b) => call(url, 'POST', { params: { project_id: PA }, body: b })
    assert.equal((await add({ title: 'Nothing attached' })).status, 400)
    assert.equal((await add({ title: 'Cleared', fileId: '' })).status, 400)
    assert.equal(count('project_deliverables'), 0)
    const ok = (await add({ title: 'With file', fileId: FILE_A })).json.deliverable
    assert.ok(ok)
    for (const row of state.tables.project_deliverables) assert.ok(typeof row.file_url === 'string' && row.file_url.trim().length > 0, 'file_url is never empty or null')
    const upd = (b) => call('admin/projects/[project_id]/deliverables/[deliverable_id]', 'PATCH', { params: { project_id: PA, deliverable_id: ok.id }, body: b })
    assert.equal((await upd({ fileId: null })).status, 400)
    assert.equal((await upd({ externalUrl: null })).status, 400)
    assert.equal((await upd({ externalUrl: 'https://example.com/v2' })).status, 200)
    assert.ok(state.tables.project_deliverables.every((r) => typeof r.file_url === 'string' && r.file_url.length > 0))
    assert.equal((await upd({ title: 'Renamed only' })).status, 200)
    const src = stripComments(read('src/app/api/admin/projects/[project_id]/deliverables/route.ts'))
    assert.doesNotMatch(src, /file_url:\s*(''|""|'#'|'n\/a')/)
  })

  await test('G8 notifications: every S6.3 write goes through createNotification (deterministic idempotency key); none inserts directly', async () => {
    const files = []
    const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p) } }
    for (const d of ['src/app/api/admin/requests', 'src/app/api/admin/projects', 'src/app/api/client-portal/requests', 'src/app/api/client-portal/project-requests', 'src/lib/requests']) walk(d)
    for (const f of files) assert.doesNotMatch(stripComments(read(f)), /from\('notifications'\)\s*\.\s*insert/, f)
    const cn = stripComments(read('src/lib/notifications/createNotification.ts'))
    assert.match(cn, /idempotency_key: idempotencyKey/)
    // every S6.3 notification names a UUID entity, which is what makes its key deterministic and retry-safe
    for (const f of files) {
      const src = stripComments(read(f))
      const calls = (src.match(/createNotification\(\{/g) || []).length
      assert.ok((src.match(/entityId:/g) || []).length >= calls, f + ': every createNotification names an entity id')
    }
  })

  console.log('\nH. Verifier classification regressions (production run: 6 FAILs that were classifier defects)')
  const vSql = read('scripts/requests-projects-03-verify-readonly.sql')
  // JS mirror of the verifier's rules, kept deliberately small so each regression is explicit.
  const V = {
    admin: (s) => (/admin_users/i.test(s) && /is_active/i.test(s)) || /is_active_admin\s*\(/i.test(s),
    svc: (s) => /auth\.role\(\)\s*=\s*'service_role'/i.test(s),
    // USING must pin scope + own id (plain, sub-select or reversed form); WITH CHECK must keep it, or be absent (PostgreSQL then applies USING).
    // Same canonicalization and patterns as the verifier's qc / wcc: casts dropped, parentheses -> spaces, '=' spaced,
    // whitespace collapsed; then both equalities required, and a pure conjunction (no OR, no NOT). (\m / \M are \b here.)
    canon: (s) => String(s || '').replace(/::(?:text|character varying|varchar)/gi, '').replace(/[()]/g, ' ').replace(/\s*=\s*/g, ' = ').replace(/\s+/g, ' ').trim(),
    notifPin: (s) => {
      const c = V.canon(s)
      return /recipient_scope = 'client'/i.test(c) &&
        /recipient_id = (?:SELECT )?(?:public\.)?current_client_id\b|current_client_id (?:AS current_client_id )?= recipient_id\b/i.test(c) &&
        !/\bOR\b/i.test(c) && !/\bNOT\b/i.test(c)
    },
    notifOwned: (q, wc) => V.notifPin(q) && (!wc || V.notifPin(wc)),
    own: (q) => /auth\.uid\(\)|current_client_id\(\)/i.test(q),
    // true => the (policy, op, role) is a client-effective path (a verifier FAIL)
    bad(p, op, role, holds) {
      const applies = role === 'anon' ? p.roles.some((r) => ['public', 'anon'].includes(r)) : p.roles.some((r) => ['public', 'authenticated'].includes(r))
      const wc = p.wc || ''
      const confined =
        (op === 'SELECT' ? V.admin(p.q) || V.own(p.q) : op === 'INSERT' ? (p.cmd === 'ALL' && wc === '' ? V.admin(p.q) : V.admin(wc)) : V.admin(p.q)) ||
        (op === 'INSERT' ? (p.cmd === 'ALL' && wc === '' ? V.svc(p.q) : V.svc(wc)) : V.svc(p.q)) ||
        (p.tbl === 'notifications' && op !== 'SELECT' && V.notifOwned(p.q, wc))
      return applies && holds && !confined
    },
    // activity_events: grant layer (62) and trigger layer (61) are separate checks
    grantLayer: (held) => (held.includes('UPDATE') || held.includes('DELETE') || held.includes('TRUNCATE') ? 'FAIL' : 'PASS'),
    serviceReadAdd: (held) => (held.includes('SELECT') && held.includes('INSERT') ? 'PASS' : 'FAIL'),
    triggerLayer: (defs) => (defs.some((d) => /BEFORE UPDATE OR DELETE/i.test(d)) && defs.some((d) => /BEFORE TRUNCATE/i.test(d)) ? 'PASS' : 'FAIL'),
  }

  await test('H1 append-only: service_role SELECT+INSERT, no UPDATE/DELETE/TRUNCATE grant, and refusing triggers = PASS; a held grant is reported as it is, with the privileges listed', async () => {
    const triggers = ['CREATE TRIGGER activity_events_no_update BEFORE UPDATE OR DELETE ON public.activity_events FOR EACH ROW EXECUTE FUNCTION ...',
      'CREATE TRIGGER activity_events_no_truncate BEFORE TRUNCATE ON public.activity_events FOR EACH STATEMENT EXECUTE FUNCTION ...']
    assert.equal(V.serviceReadAdd(['SELECT', 'INSERT']), 'PASS')
    assert.equal(V.grantLayer(['SELECT', 'INSERT']), 'PASS')
    assert.equal(V.triggerLayer(triggers), 'PASS')
    assert.equal(V.grantLayer(['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']), 'FAIL', 'a real default-privilege grant is a FAIL, not a PASS')
    assert.equal(V.triggerLayer(triggers.slice(0, 1)), 'FAIL', 'a missing TRUNCATE trigger is a FAIL')
    // static: three separate rows, and the detail is computed from the live privileges (not a fixed sentence)
    for (const needle of ["60, 'activity_events: service_role holds SELECT and INSERT'", "61, 'activity_events: triggers refuse UPDATE, DELETE and TRUNCATE'", "62, 'activity_events: service_role holds no UPDATE / DELETE / TRUNCATE grant'"]) assert.ok(vSql.includes(needle), needle)
    assert.match(vSql, /'service_role holds: ' \|\| coalesce\(nullif\(concat_ws/)
    assert.doesNotMatch(vSql.replace(/--.*$/gm, ''), /'UPDATE\/DELETE are not granted, and a trigger refuses them as well'/, 'no fixed sentence that contradicts the verdict')
    // the optional hardening script is narrow and unexecuted
    const h = read('scripts/requests-projects-05-optional-harden-service-grants-PRODUCTION.sql').replace(/--.*$/gm, '')
    assert.match(h, /REVOKE UPDATE, DELETE, TRUNCATE ON public\.activity_events FROM service_role;/)
    assert.match(h, /REVOKE ALL ON public\.s63_function_backups FROM service_role;/)
    assert.doesNotMatch(h, /\b(DROP|DELETE FROM|TRUNCATE TABLE|ALTER|CREATE|UPDATE public)\b/i)
  })

  await test('H2 a pure immutable status helper need not be SECURITY DEFINER; the four operational functions still must be', async () => {
    const fwdFn = (fwd.match(/CREATE FUNCTION public\.hbee_request_status[\s\S]*?\$\$;/) || [''])[0]
    assert.match(fwdFn, /LANGUAGE sql IMMUTABLE SET search_path = pg_catalog/)
    assert.doesNotMatch(fwdFn, /SECURITY DEFINER/, 'the helper is deliberately not SECURITY DEFINER and is not altered to satisfy the verifier')
    assert.match(vSql, /f\.sig NOT LIKE 'public\.hbee_request_status\(%'/, 'the SECURITY DEFINER requirement excludes the helper')
    assert.match(vSql, /73, 'hbee_request_status\(text\): pure immutable SQL helper/)
    assert.match(vSql, /l\.lanname = 'sql' AND p\.provolatile = 'i'/)
    // its EXECUTE rule (service_role only) is still enforced for all five functions
    assert.match(vSql, /72, 'EXECUTE: service_role yes, anon\/authenticated\/PUBLIC no: ' \|\| sig/)
    for (const sig of ['create_portal_request', 'post_request_message', 'set_request_status', 'mark_request_read']) assert.ok(vSql.includes('public.' + sig + '('), sig)
    assert.equal((fwd.match(/SECURITY DEFINER SET search_path = pg_catalog, public/g) || []).length, 4, 'exactly the four operational functions are SECURITY DEFINER')
  })

  await test('H3 authenticated-role policies gated by is_active_admin() are ADMIN-ONLY, not client-effective (notifications_admin_select / _update)', async () => {
    const adminSel = { tbl: 'notifications', cmd: 'SELECT', roles: ['authenticated'], q: "((recipient_scope = 'admin'::text) AND is_active_admin())" }
    const adminUpd = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: "((recipient_scope = 'admin'::text) AND is_active_admin())" }
    assert.equal(V.bad(adminSel, 'SELECT', 'authenticated', true), false)
    assert.equal(V.bad(adminUpd, 'UPDATE', 'authenticated', true), false)
    // an ungated authenticated policy is still caught, and an is_active_admin() mention does not rescue a policy that lacks it
    assert.equal(V.bad({ ...adminSel, q: "(recipient_scope = 'admin'::text)" }, 'SELECT', 'authenticated', true), true)
    assert.equal(V.bad({ ...adminSel, q: 'true' }, 'SELECT', 'authenticated', true), true)
    assert.match(vSql, /is_active_admin\\s\*\\\(/, 'the SQL classifier recognises the helper')
  })

  await test('H4 a PUBLIC policy gated by auth.role() = service_role grants nothing to an authenticated browser user', async () => {
    const svc = { tbl: 'project_requests', cmd: 'ALL', roles: ['public'], q: "(auth.role() = 'service_role'::text)", wc: "(auth.role() = 'service_role'::text)" }
    for (const op of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) for (const role of ['anon', 'authenticated']) assert.equal(V.bad(svc, op, role, true), false, op + ' as ' + role)
    // the own-client SELECT policy remains the browser read path
    assert.equal(V.bad({ tbl: 'project_requests', cmd: 'SELECT', roles: ['authenticated'], q: '(client_id IN ( SELECT clients.id FROM clients WHERE (clients.user_id = auth.uid())))' }, 'SELECT', 'authenticated', true), false)
    // but PUBLIC alone, or a different predicate, is not a free pass
    assert.equal(V.bad({ ...svc, q: 'true', wc: 'true' }, 'SELECT', 'authenticated', true), true)
    assert.equal(V.bad({ ...svc, q: "(auth.role() = 'authenticated'::text)", wc: '' }, 'SELECT', 'authenticated', true), true)
    assert.match(vSql, /svc_q/); assert.match(vSql, /auth\\\.role\\\(\\\)/)
  })

  await test('H5 client notification policies pinned to recipient_scope = client AND recipient_id = current_client_id() are not a cross-client path; unscoped ones are', async () => {
    const own = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: "((recipient_scope = 'client'::text) AND (recipient_id = current_client_id()))" }
    assert.equal(V.bad(own, 'UPDATE', 'authenticated', true), false)
    assert.equal(V.bad({ ...own, cmd: 'SELECT' }, 'SELECT', 'authenticated', true), false)
    // an active-admin policy is not a client path either
    assert.equal(V.bad({ ...own, q: "((recipient_scope = 'admin'::text) AND is_active_admin())" }, 'UPDATE', 'authenticated', true), false)
    // dropping either half of the pin, or pinning to something else, IS a cross-client path
    assert.equal(V.bad({ ...own, q: "(recipient_scope = 'client'::text)" }, 'UPDATE', 'authenticated', true), true)
    assert.equal(V.bad({ ...own, q: '(recipient_id = current_client_id())' }, 'UPDATE', 'authenticated', true), true)
    assert.equal(V.bad({ ...own, q: "((recipient_scope = 'client'::text) AND (recipient_id IS NOT NULL))" }, 'UPDATE', 'authenticated', true), true)
    assert.equal(V.bad({ ...own, q: 'true' }, 'DELETE', 'authenticated', true), true)
    assert.ok(vSql.includes("p.qc ~* 'recipient_scope = ''client'''"))
    assert.ok(vSql.includes("recipient_id = (?:SELECT )?(?:public\\.)?current_client_id\\M"))
  })

  await test('J1 the EXACT production notifications_client_update expression is recognised, via canonicalization — and nothing is loosened to a keyword search', async () => {
    const PROD = "(((recipient_scope)::text = 'client'::text) AND (recipient_id = current_client_id()))"
    assert.equal(V.canon(PROD), "recipient_scope = 'client' AND recipient_id = current_client_id")
    const own = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: PROD, wc: PROD }
    assert.equal(V.bad(own, 'UPDATE', 'authenticated', true), false, 'production policy: not a client-effective exposure')
    assert.equal(V.bad({ ...own, wc: '' }, 'UPDATE', 'authenticated', true), false, 'inherited WITH CHECK')
    // formatting variants PostgreSQL / people may produce
    for (const q of [
      "((recipient_scope)::text = 'client'::text) AND (recipient_id = current_client_id())",
      "(  (recipient_scope::text='client'::text)   AND   (recipient_id=current_client_id())  )",
      "(('client'::text = (recipient_scope)::text) AND (recipient_id = current_client_id()))".replace("'client'::text = (recipient_scope)::text", "(recipient_scope)::text = 'client'::text"),
      "(((recipient_scope)::text = 'client'::text) AND (recipient_id = ( SELECT current_client_id() AS current_client_id)))",
      "(((recipient_scope)::text = 'client'::text) AND (current_client_id() = recipient_id))",
      "(((recipient_scope)::text = 'client'::text) AND (recipient_id = public.current_client_id()))",
    ]) assert.equal(V.bad({ ...own, q, wc: '' }, 'UPDATE', 'authenticated', true), false, q)
    // ...and every unsafe variant still fails
    const unsafe = {
      'scope only, no ownership': "(((recipient_scope)::text = 'client'::text))",
      'ownership only, no scope': '((recipient_id = current_client_id()))',
      'USING (true)': 'true',
      'no ownership predicate at all': "(status = 'unread'::text)",
      'wrong scope': "(((recipient_scope)::text = 'admin'::text) AND (recipient_id = current_client_id()))",
      'someone else\'s id': "(((recipient_scope)::text = 'client'::text) AND (recipient_id = other_id))",
      'OR bypass': "(((recipient_scope)::text = 'client'::text) OR (recipient_id = current_client_id()))",
      'OR true': "((((recipient_scope)::text = 'client'::text) AND (recipient_id = current_client_id())) OR true)",
      'negated ownership': "(((recipient_scope)::text = 'client'::text) AND (NOT (recipient_id = current_client_id())))",
      'not-equal ownership': "(((recipient_scope)::text = 'client'::text) AND (recipient_id <> current_client_id()))",
      'keyword soup': "(client_note ~~ '%client current_client_id%'::text)",
    }
    for (const [name, q] of Object.entries(unsafe)) assert.equal(V.bad({ ...own, q, wc: '' }, 'UPDATE', 'authenticated', true), true, 'USING: ' + name)
    // WITH CHECK that lets the row move to another recipient / scope
    for (const [name, wc] of Object.entries({
      'CHECK true': 'true',
      'CHECK drops scope': '((recipient_id = current_client_id()))',
      'CHECK drops ownership': "(((recipient_scope)::text = 'client'::text))",
      'CHECK re-scopes to admin': "(((recipient_scope)::text = 'admin'::text) AND (recipient_id = current_client_id()))",
    })) assert.equal(V.bad({ ...own, wc }, 'UPDATE', 'authenticated', true), true, name)
    // an unscoped authenticated UPDATE policy, as a full row-243 / row-244 evaluation
    const rows = (pols) => {
      const exists = pols.some((p) => ['UPDATE', 'ALL'].includes(p.cmd) && !V.admin(p.q) && V.notifOwned(p.q, p.wc))
      const offender = pols.some((p) => V.bad(p, p.cmd, 'authenticated', true))
      return { r243: exists && !offender ? 'PASS' : 'FAIL', r244: offender ? 'FAIL' : 'PASS' }
    }
    const ADMIN = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: "(((recipient_scope)::text = 'admin'::text) AND is_active_admin())", wc: "(((recipient_scope)::text = 'admin'::text) AND is_active_admin())" }
    assert.deepEqual(rows([ADMIN, own]), { r243: 'PASS', r244: 'PASS' }, 'both remaining rows PASS on the production policy set')
    assert.deepEqual(rows([ADMIN, own, { ...own, q: 'true', wc: 'true' }]), { r243: 'FAIL', r244: 'FAIL' })
    // static: canonical form is built once, in the same order, and the patterns are exact equalities, not keywords
    const body = vSql.replace(/--.*$/gm, '')
    assert.ok(body.includes("'::(?:text|character varying|varchar)', '', 'gi'") && body.includes("'[()]', ' ', 'g'") && body.includes("'\\s*=\\s*', ' = ', 'g'") && body.includes("'\\s+', ' ', 'g'"))
    assert.ok(body.includes("p.qc !~* '\\mOR\\M'") && body.includes("p.qc !~* '\\mNOT\\M'") && body.includes("p.wcc !~* '\\mOR\\M'"))
    assert.doesNotMatch(body, /ILIKE\s+'%client%'|~\*\s+'client'|~\*\s+'current_client_id'/)
  })

  await test('H6 the verifier SQL is still one read-only statement and the corrected rules did not weaken the real failures', async () => {
    const body = vSql.replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''")
    assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
    assert.equal((body.match(/;/g) || []).length, 1)
    // still-FAIL cases: a client-effective write on milestones, an anon-readable client project, a world-readable notification
    assert.equal(V.bad({ tbl: 'project_milestones', cmd: 'ALL', roles: ['authenticated'], q: 'true', wc: 'true' }, 'INSERT', 'authenticated', true), true)
    assert.equal(V.bad({ tbl: 'projects', cmd: 'SELECT', roles: ['anon'], q: 'true' }, 'SELECT', 'anon', true), true)
    assert.equal(V.bad({ tbl: 'notifications', cmd: 'SELECT', roles: ['authenticated'], q: 'true' }, 'SELECT', 'authenticated', true), true)
    assert.ok(vSql.includes("OVERALL"))
  })

  console.log('\nI. Second production verifier run (4 remaining FAILs)')

  await test('I1 trigger check reads pg_trigger flags, not deparsed text: PostgreSQL prints "BEFORE DELETE OR UPDATE", which the old text match could not recognise', async () => {
    // pg_trigger.tgtype bits: 1 ROW, 2 BEFORE, 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE
    const ROW = 1, BEFORE = 2, DELETE = 8, UPDATE = 16, TRUNCATE = 32
    // derive the expected flags from the forward migration's own CREATE TRIGGER statements
    const trg = (name) => (code01.match(new RegExp('CREATE TRIGGER ' + name + '[^;]*;')) || [''])[0].replace(/\s+/g, ' ')
    const flags = (t) => (/BEFORE/.test(t) ? BEFORE : 0) | (/FOR EACH ROW/.test(t) ? ROW : 0) | (/\bUPDATE\b/.test(t.split(' ON ')[0]) ? UPDATE : 0) | (/\bDELETE\b/.test(t.split(' ON ')[0]) ? DELETE : 0) | (/\bTRUNCATE\b/.test(t.split(' ON ')[0]) ? TRUNCATE : 0)
    const upd = flags(trg('activity_events_no_update')), trunc = flags(trg('activity_events_no_truncate'))
    assert.equal(upd, ROW | BEFORE | UPDATE | DELETE)
    assert.equal(trunc, BEFORE | TRUNCATE)
    const model = (types) => ({
      has_update: types.some((t) => (t & BEFORE) && (t & ROW) && (t & UPDATE)),
      has_delete: types.some((t) => (t & BEFORE) && (t & ROW) && (t & DELETE)),
      has_truncate: types.some((t) => (t & BEFORE) && !(t & ROW) && (t & TRUNCATE)),
    })
    assert.deepEqual(model([upd, trunc]), { has_update: true, has_delete: true, has_truncate: true })
    assert.equal(model([upd]).has_truncate, false, 'a missing TRUNCATE trigger is still caught')
    assert.equal(model([trunc]).has_update, false, 'a missing UPDATE/DELETE trigger is still caught')
    assert.equal(model([ROW | UPDATE | DELETE, trunc]).has_update, false, 'an AFTER trigger cannot refuse the write')
    // the defect: the deparsed text order is DELETE before UPDATE, so the old literal could never match a correct trigger
    assert.doesNotMatch('CREATE TRIGGER activity_events_no_update BEFORE DELETE OR UPDATE ON public.activity_events FOR EACH ROW EXECUTE FUNCTION activity_events_append_only()', /BEFORE UPDATE OR DELETE/)
    const body = vSql.replace(/--.*$/gm, '')
    assert.doesNotMatch(body, /pg_get_triggerdef/, 'the verifier no longer parses deparsed trigger text')
    for (const needle of ['tgc AS (', '(t.tgtype & 2) = 2', '(t.tgtype & 16) = 16', '(t.tgtype & 8) = 8', '(t.tgtype & 32) = 32', "t.tgfoid = to_regproc('public.activity_events_append_only')", "t.tgenabled IN ('O', 'A')", "raise\\s+exception"]) assert.ok(body.includes(needle), needle)
    // the trigger function really only raises, so a passing trigger really refuses
    const fnBody = (code01.match(/CREATE FUNCTION public\.activity_events_append_only[\s\S]*?\$\$;/) || [''])[0]
    assert.match(fnBody, /RAISE EXCEPTION/); assert.doesNotMatch(fnBody, /\bRETURN\b/i)
  })

  await test('I2 notifications: own-recipient client UPDATE is REQUIRED and passes; unscoped / half-scoped / WITH-CHECK-drifting policies fail; admin policies are not client paths', async () => {
    const USING = "((recipient_scope = 'client'::text) AND (recipient_id = current_client_id()))"
    const own = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: USING, wc: USING }
    assert.equal(V.bad(own, 'UPDATE', 'authenticated', true), false, 'USING + WITH CHECK both pinned')
    assert.equal(V.bad({ ...own, wc: '' }, 'UPDATE', 'authenticated', true), false, 'no WITH CHECK = PostgreSQL applies USING to the new row')
    assert.equal(V.bad({ ...own, q: "((recipient_scope = 'client'::text) AND (recipient_id = ( SELECT current_client_id() AS current_client_id)))", wc: '' }, 'UPDATE', 'authenticated', true), false, 'sub-select form')
    assert.equal(V.bad({ ...own, q: "((recipient_scope = 'client'::text) AND (current_client_id() = recipient_id))", wc: '' }, 'UPDATE', 'authenticated', true), false, 'reversed comparison')
    // failures
    assert.equal(V.bad({ ...own, q: 'true', wc: 'true' }, 'UPDATE', 'authenticated', true), true, 'unscoped authenticated UPDATE')
    assert.equal(V.bad({ ...own, q: "(recipient_scope = 'client'::text)", wc: '' }, 'UPDATE', 'authenticated', true), true, 'missing recipient_id')
    assert.equal(V.bad({ ...own, q: '(recipient_id = current_client_id())', wc: '' }, 'UPDATE', 'authenticated', true), true, 'missing recipient_scope')
    assert.equal(V.bad({ ...own, wc: '(recipient_id = current_client_id())' }, 'UPDATE', 'authenticated', true), true, 'WITH CHECK that drops the scope lets a row be re-scoped')
    assert.equal(V.bad({ ...own, wc: 'true' }, 'UPDATE', 'authenticated', true), true, 'WITH CHECK true lets a client move its row to someone else')
    assert.equal(V.bad({ ...own, cmd: 'DELETE', wc: '' }, 'DELETE', 'authenticated', true), false, 'a pinned DELETE would also be own-scoped')
    // row 243 = existence AND no offender; row 244 = no offender. An admin policy is not the client path.
    const rows = (pols) => {
      const exists = pols.some((p) => ['UPDATE', 'ALL'].includes(p.cmd) && !V.admin(p.q) && V.notifOwned(p.q, p.wc))
      const offender = pols.some((p) => (p.cmd === 'ALL' ? ['INSERT', 'UPDATE', 'DELETE'] : [p.cmd]).filter((o) => o !== 'SELECT').some((o) => V.bad(p, o, 'authenticated', true)))
      return { r243: exists && !offender ? 'PASS' : 'FAIL', r244: offender ? 'FAIL' : 'PASS' }
    }
    const ADMIN = { tbl: 'notifications', cmd: 'UPDATE', roles: ['authenticated'], q: "((recipient_scope = 'admin'::text) AND is_active_admin())", wc: "((recipient_scope = 'admin'::text) AND is_active_admin())" }
    assert.deepEqual(rows([ADMIN, own]), { r243: 'PASS', r244: 'PASS' }, 'production shape')
    assert.deepEqual(rows([ADMIN]), { r243: 'FAIL', r244: 'PASS' }, 'clients could not mark their own notifications read -> the required boundary is missing')
    assert.deepEqual(rows([ADMIN, own, { ...own, q: 'true', wc: 'true' }]), { r243: 'FAIL', r244: 'FAIL' }, 'an extra unscoped policy fails both')
    // static: no generic "no client-effective write" requirement remains for notifications, and the new rows exist
    const body = vSql
    assert.match(body, /WHERE g\.tbl <> 'notifications'/)
    assert.ok(body.includes("243, 'notifications: client UPDATE is own-recipient scoped"))
    assert.ok(body.includes("244, 'a client cannot mutate another client''s notifications"))
    assert.match(body, /left\(pl\.q, 160\)/, 'an offending policy is reported with its expression so a miss is diagnosable')
  })

  await test('I3 the optional hardening script runs exactly two REVOKEs, touches nothing the application needs, and re-checks it', async () => {
    const raw = read('scripts/requests-projects-05-optional-harden-service-grants-PRODUCTION.sql').replace(/--.*$/gm, '')
    const outsideDo = raw.replace(/DO \$\$[\s\S]*?END \$\$;/g, '')
    const revokes = (outsideDo.match(/REVOKE[^;]*;/g) || []).map((s) => s.replace(/\s+/g, ' '))
    assert.deepEqual(revokes, ['REVOKE UPDATE, DELETE, TRUNCATE ON public.activity_events FROM service_role;', 'REVOKE ALL ON public.s63_function_backups FROM service_role;'])
    assert.doesNotMatch(outsideDo, /\b(GRANT|DROP|ALTER|CREATE|INSERT|UPDATE public|DELETE FROM|TRUNCATE TABLE)\b/i)
    assert.doesNotMatch(outsideDo, /\b(anon|authenticated)\b|\bPUBLIC\b/, 'browser roles (and the PUBLIC pseudo-role) are not touched')
    assert.match(raw, /BEGIN;[\s\S]*COMMIT;/)
    // the application only ever INSERTs and SELECTs activity_events, so SELECT + INSERT must survive (asserted inside the script)
    assert.match(raw, /has_table_privilege\('service_role', 'public\.activity_events', 'SELECT'\)[\s\S]*'INSERT'\)/)
    const files = []
    const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(e.name)) files.push(p) } }
    walk('src')
    for (const f of files) {
      const src = stripComments(read(f))
      assert.doesNotMatch(src, /from\('activity_events'\)\s*\.\s*(update|delete|upsert)/, f)
      assert.doesNotMatch(src, /s63_function_backups/, f + ': the application never touches the function backup')
    }
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  if (failures.length) process.exit(1)
})()
