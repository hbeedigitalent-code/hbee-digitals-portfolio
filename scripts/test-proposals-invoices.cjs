// S6.4 — Proposals v2, invoices and PDFs: behaviour tests.
//
// OFFLINE. The REAL route handlers, the shared Portal resolver, the notification writer, the money library and the PDF generator
// (pdf-lib) run. Only I/O is replaced by an in-memory database with JavaScript MODELS of the SQL functions of
// scripts/proposals-invoices-01-forward.sql. What this does NOT prove: the SQL itself, RLS, grants or triggers. That is the job of
// proposals-invoices-03-verify-readonly.sql and the staging run of proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql.
// The harness is a deliberate copy of scripts/test-requests-projects.cjs so that suite stays untouched.
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
    hooks: {},
    after: {},
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
  for (const n of ['proposal_line_items', 'proposal_versions', 'proposal_responses', 'invoice_line_items', 'invoice_payments', 'document_counters', 'proposal_files', 'merchant_status', 'thread_messages', 'activity_events', 'project_team_assignments', 'admin_users', 'project_deliverables', 'project_milestones', 'notifications', 'upload_batches', 'upload_sessions', 'growth_profile_pdfs', 'portal_invitations', 'merchant_accounts']) t[n] = t[n] || []
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
      const hook = state.hooks && state.hooks[name + ':' + q.mode]
      if (hook) { const err = hook(q, match()); if (err) return Promise.resolve({ data: null, error: err }) }
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
      const after = state.after && state.after[name + ':' + q.mode]
      if (after) after(out)
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
      // ── S6.4 JS MODELS of the SQL functions in scripts/proposals-invoices-01-forward.sql. They mirror it rule for rule; the SQL
      // itself is proved by scripts/proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql on staging. NOT the database.
      const $ = load('src/lib/commerce/money.ts')
      const nz = (v) => (v === undefined || v === null ? null : v)
      const oneOf = (v, a) => a.includes(v)
      const find = (t, id) => rows(t).find((r) => r.id === id)
      const evt = (o) => rows('activity_events').push({ id: uuid(), metadata: {}, created_at: new Date().toISOString(), ...o })
      const reply = (data) => ({ data, error: null })
      const dupe = () => ({ data: null, error: { code: '23505', message: 'duplicate' } })
      const money2 = (m) => $.minorToString(m)
      const lineAmt = (l) => money2($.lineAmountMinor(String(l.quantity), String(l.unit_price)))
      const totalsOf = (pid) => $.sumMinor(rows('proposal_line_items').filter((l) => l.proposal_id === pid).map((l) => $.toMinor(l.amount)))

      if (name === 'save_proposal_draft') {
        const snap = { p: rows('proposals').slice(), a: rows('activity_events').slice() }
        const res = (() => {
        const d = args.p_data
        if (!d || typeof d !== 'object') return reply({ status: 'invalid', field: 'data' })
        let p, created = false
        if (!args.p_proposal_id) {
          if (!rows('merchants').some((m) => m.id === args.p_merchant_id)) return reply({ status: 'invalid', field: 'merchant' })
          const title = String(d.title || '').trim()
          if (!title || title.length > 200) return reply({ status: 'invalid', field: 'title' })
          const cur = d.currency || 'USD'
          if (!oneOf(cur, ['USD', 'NGN', 'GBP', 'EUR'])) return reply({ status: 'invalid', field: 'currency' })
          if (rows('proposals').some((r) => r.proposal_number === args.p_proposal_number)) return dupe()
          p = { id: uuid(), merchant_id: args.p_merchant_id, client_id: args.p_client_id, proposal_number: args.p_proposal_number, title, status: 'draft', currency: cur, version: 1, discount_amount: '0.00', services: [], pricing: {}, created_by: args.p_actor, created_at: new Date().toISOString() }
          rows('proposals').push(p); created = true
        } else {
          p = find('proposals', args.p_proposal_id)
          if (!p) return reply({ status: 'not_found' })
          if (!oneOf(p.status, ['draft', 'changes_requested'])) return reply({ status: 'not_editable', current: p.status })
          if (args.p_client_id) p.client_id = args.p_client_id
        }
        const next = { ...p }
        for (const k of ['title', 'summary', 'scope', 'deliverables', 'timeline', 'terms', 'notes', 'revision_note']) if (k in d) next[k] = String(d[k] || '').trim() || null
        if ('currency' in d) { if (!oneOf(d.currency, ['USD', 'NGN', 'GBP', 'EUR'])) return reply({ status: 'invalid', field: 'currency' }); next.currency = d.currency }
        if ('discount_amount' in d) { if (!$.isPlainMoney(d.discount_amount)) return reply({ status: 'invalid', field: 'discount_amount' }); next.discount_amount = money2($.toMinor(d.discount_amount)) }
        if ('expires_at' in d) next.expires_at = d.expires_at || null
        if ('payment_terms' in d) next.pricing = { ...(next.pricing || {}), payment_terms: d.payment_terms }
        let newLines = null
        if ('line_items' in d) {
          if (!Array.isArray(d.line_items) || d.line_items.length > 100) return reply({ status: 'invalid', field: 'line_items' })
          for (const [i, l] of d.line_items.entries()) {
            if (!String(l.title || '').trim() || !$.isPlainQuantity(String(l.quantity)) || !$.isPlainMoney(String(l.unit_price))) return reply({ status: 'invalid', field: 'line_items', line: i + 1 })
          }
          newLines = d.line_items.map((l, i) => ({ id: uuid(), proposal_id: p.id, sort_order: i + 1, title: String(l.title).trim(), description: l.description || null, quantity: String(l.quantity), unit_price: String(l.unit_price), amount: lineAmt(l) }))
        }
        const sub = newLines ? $.sumMinor(newLines.map((l) => $.toMinor(l.amount))) : totalsOf(p.id)
        const disc = $.toMinor(next.discount_amount) ?? 0n
        if (disc > sub) return reply({ status: 'invalid', field: 'discount_amount', reason: 'exceeds_subtotal' })
        if (newLines) { state.tables.proposal_line_items = rows('proposal_line_items').filter((l) => l.proposal_id !== p.id).concat(newLines) }
        Object.assign(p, next, { subtotal: money2(sub), total: money2(sub - disc) })
        p.pricing = { ...(p.pricing || {}), total: p.total, currency: p.currency }
        if (created) evt({ client_id: args.p_client_id, actor_role: 'admin', entity_type: 'proposal', entity_id: p.id, action: 'proposal_created', summary: 'Proposal created', visibility: 'internal' })
        return reply({ status: 'saved', proposal_id: p.id, created, proposal_number: p.proposal_number, version: p.version, line_count: rows('proposal_line_items').filter((l) => l.proposal_id === p.id).length, subtotal: p.subtotal, discount_amount: p.discount_amount, total: p.total, currency: p.currency })
        })()
        if (!res.data || res.data.status !== 'saved') { state.tables.proposals = snap.p; state.tables.activity_events = snap.a }
        return res
      }
      if (name === 'send_proposal') {
        const p = find('proposals', args.p_proposal_id)
        if (!p) return reply({ status: 'not_found' })
        if (!oneOf(p.status, ['draft', 'changes_requested'])) return reply({ status: 'not_sendable', current: p.status })
        if (!p.client_id) return reply({ status: 'client_not_linked' })
        const lines = rows('proposal_line_items').filter((l) => l.proposal_id === p.id)
        if (!lines.length) return reply({ status: 'no_line_items' })
        const revised = p.status === 'changes_requested'
        const ver = revised ? p.version + 1 : p.version
        const sub = totalsOf(p.id)
        Object.assign(p, { status: 'sent', sent_at: new Date().toISOString(), version: ver, subtotal: money2(sub), total: money2(sub - ($.toMinor(p.discount_amount) ?? 0n)) })
        const v = { id: uuid(), proposal_id: p.id, version_number: ver, title: p.title, summary: p.summary || null, scope: p.scope || null, deliverables: p.deliverables || null, timeline: p.timeline || null, terms: p.terms || null, payment_terms: ((p.pricing || {}).payment_terms) || '', currency: p.currency, subtotal: p.subtotal, discount_amount: p.discount_amount, total: p.total, expires_at: p.expires_at || null, issue_date: p.issue_date || null, line_items: lines.map((l) => ({ title: l.title, description: l.description, quantity: l.quantity, unit_price: l.unit_price, amount: l.amount })), sent_at: p.sent_at }
        rows('proposal_versions').push(v)
        for (const r of rows('proposal_responses')) if (r.proposal_id === p.id && r.response_type === 'changes_requested' && !r.resolved_at) Object.assign(r, { resolved_at: 'now', resolved_in_version: ver })
        return reply({ status: 'sent', version_id: v.id, version: ver, revised, client_id: p.client_id, proposal_number: p.proposal_number, title: p.title })
      }
      if (name === 'mark_proposal_viewed') {
        const p = rows('proposals').find((r) => r.id === args.p_proposal_id && r.client_id === args.p_client_id)
        if (!p) return reply({ status: 'not_found' })
        if (p.status !== 'sent') return reply({ status: 'unchanged', current: p.status })
        p.status = 'viewed'
        return reply({ status: 'viewed', version: p.version })
      }
      const mkProject = (p, ref) => {
        if (rows('projects').some((x) => x.project_id === ref)) return null
        const proj = { id: uuid(), client_id: p.client_id, project_id: ref, project_name: p.title, title: p.title, status: 'Pending Review', progress: 0 }
        rows('projects').push(proj); return proj
      }
      if (name === 'approve_proposal') {
        state.rpcCalls = state.rpcCalls || []; state.rpcCalls.push(name)
        const p = rows('proposals').find((r) => r.id === args.p_proposal_id && r.client_id === args.p_client_id)
        if (!p) return reply({ status: 'not_found' })
        const c = find('clients', args.p_client_id)
        if (String(c.status || '').trim().toLowerCase() === 'suspended') return reply({ status: 'suspended' })
        if (!c.merchant_id) return reply({ status: 'not_connected' })
        if (p.status === 'approved') return p.approved_version === args.p_confirm_version ? reply({ status: 'already_approved', version: p.approved_version, project_id: p.converted_to_project_id, proposal_number: p.proposal_number, title: p.title }) : reply({ status: 'not_allowed', current: p.status })
        if (!oneOf(p.status, ['sent', 'viewed'])) return reply({ status: 'not_allowed', current: p.status })
        if (p.version !== args.p_confirm_version) return reply({ status: 'version_mismatch', current_version: p.version })
        if (p.expires_at && new Date(p.expires_at) < new Date()) return reply({ status: 'expired' })
        let project = p.converted_to_project_id, created = false
        if (project) { if (!rows('projects').some((x) => x.id === project && x.client_id === p.client_id)) return reply({ status: 'invalid_project_link' }) }
        else { const pr = mkProject(p, args.p_project_reference); if (!pr) return dupe(); project = pr.id; created = true }
        Object.assign(p, { status: 'approved', accepted_at: new Date().toISOString(), approved_version: p.version, approved_by: args.p_user_id, converted_to_project_id: project })
        return reply({ status: 'approved', version: p.version, project_id: project, project_created: created, proposal_number: p.proposal_number, title: p.title })
      }
      if (name === 'request_proposal_changes') {
        const p = rows('proposals').find((r) => r.id === args.p_proposal_id && r.client_id === args.p_client_id)
        if (!p) return reply({ status: 'not_found' })
        const reason = String(args.p_reason || '').trim()
        if (!reason || reason.length > 2000) return reply({ status: 'invalid_reason' })
        const dup = args.p_key && rows('proposal_responses').find((r) => r.proposal_id === p.id && r.idempotency_key === args.p_key)
        if (dup) return reply({ status: 'requested', response_id: dup.id, duplicate: true, version: p.version, proposal_number: p.proposal_number, title: p.title })
        if (!oneOf(p.status, ['sent', 'viewed'])) return reply({ status: 'not_allowed', current: p.status })
        const r = { id: uuid(), proposal_id: p.id, version_number: p.version, response_type: 'changes_requested', message: reason, client_id: p.client_id, idempotency_key: args.p_key || null, created_at: new Date().toISOString(), resolved_at: null, resolved_in_version: null }
        rows('proposal_responses').push(r); p.status = 'changes_requested'
        return reply({ status: 'requested', response_id: r.id, duplicate: false, version: p.version, proposal_number: p.proposal_number, title: p.title })
      }
      if (name === 'decline_proposal') {
        const p = rows('proposals').find((r) => r.id === args.p_proposal_id && r.client_id === args.p_client_id)
        if (!p) return reply({ status: 'not_found' })
        if (oneOf(p.status, ['declined', 'rejected'])) return reply({ status: 'declined', duplicate: true, version: p.version, proposal_number: p.proposal_number, title: p.title })
        if (!oneOf(p.status, ['sent', 'viewed'])) return reply({ status: 'not_allowed', current: p.status })
        rows('proposal_responses').push({ id: uuid(), proposal_id: p.id, version_number: p.version, response_type: 'declined', message: args.p_note || null, client_id: p.client_id, created_at: new Date().toISOString() })
        Object.assign(p, { status: 'declined', declined_at: new Date().toISOString() })
        return reply({ status: 'declined', duplicate: false, version: p.version, proposal_number: p.proposal_number, title: p.title })
      }
      if (name === 'convert_approved_proposal') {
        const p = find('proposals', args.p_proposal_id)
        if (!p) return reply({ status: 'not_found' })
        if (p.status !== 'approved') return reply({ status: 'not_approved', current: p.status })
        if (!p.client_id) return reply({ status: 'client_not_linked' })
        if (p.converted_to_project_id) return reply({ status: 'already_converted', project_id: p.converted_to_project_id })
        const pr = mkProject(p, args.p_project_reference); if (!pr) return dupe()
        p.converted_to_project_id = pr.id
        return reply({ status: 'converted', project_id: pr.id, proposal_number: p.proposal_number, title: p.title })
      }
      if (name === 'create_invoice') {
        const proj = find('projects', args.p_project_id)
        if (!proj) return reply({ status: 'not_found' })
        if (!proj.client_id) return reply({ status: 'not_client_project' })
        let cur = args.p_currency || 'USD', lines = [], disc = '0.00', p = null
        if (args.p_proposal_id) {
          p = find('proposals', args.p_proposal_id)
          if (!p) return reply({ status: 'proposal_not_found' })
          if (p.status !== 'approved' || !p.approved_version) return reply({ status: 'proposal_not_approved' })
          if (p.client_id !== proj.client_id || p.converted_to_project_id !== proj.id) return reply({ status: 'project_mismatch' })
          if (rows('project_invoices').some((i) => i.proposal_id === p.id && i.status !== 'void')) return reply({ status: 'already_invoiced' })
          const v = rows('proposal_versions').find((x) => x.proposal_id === p.id && x.version_number === p.approved_version)
          if (!v) return reply({ status: 'no_approved_version' })
          cur = v.currency; disc = v.discount_amount; lines = v.line_items
        }
        const year = new Date().getFullYear()
        const ctr = (state.tables.document_counters = state.tables.document_counters || [])
        let c = ctr.find((x) => x.kind === 'invoice' && x.year === year); if (!c) { c = { kind: 'invoice', year, last_value: 0 }; ctr.push(c) }
        c.last_value += 1
        const number = 'HBD-INV-' + year + '-' + String(c.last_value).padStart(4, '0')
        const inv = { id: uuid(), project_id: proj.id, invoice_number: number, amount: '0.00', subtotal: '0.00', discount_amount: '0.00', tax_amount: '0.00', currency: cur, status: 'draft', due_date: args.p_due_date || null, proposal_id: args.p_proposal_id || null, created_by: args.p_actor, created_at: new Date().toISOString() }
        rows('project_invoices').push(inv)
        lines.forEach((l, i) => rows('invoice_line_items').push({ id: uuid(), invoice_id: inv.id, sort_order: i + 1, title: l.title, description: l.description, quantity: l.quantity, unit_price: l.unit_price, line_amount: lineAmt(l) }))
        inv.discount_amount = disc
        state.recompute(inv)
        return reply({ status: 'created', invoice_id: inv.id, invoice_number: number })
      }
      if (name === 'issue_invoice') {
        const inv = find('project_invoices', args.p_invoice_id)
        if (!inv) return reply({ status: 'not_found' })
        if (inv.status !== 'draft') return reply({ status: 'not_draft', current: inv.status })
        if (!inv.due_date) return reply({ status: 'due_date_required' })
        if (!rows('invoice_line_items').some((l) => l.invoice_id === inv.id)) return reply({ status: 'no_line_items' })
        if ($.toMinor(inv.amount) <= 0n) return reply({ status: 'zero_total' })
        Object.assign(inv, { status: 'issued', issued_at: new Date().toISOString(), issue_date: inv.issue_date || new Date().toISOString().slice(0, 10) })
        const proj = find('projects', inv.project_id)
        return reply({ status: 'issued', invoice_number: inv.invoice_number, client_id: proj.client_id, amount: inv.amount, currency: inv.currency })
      }
      if (name === 'record_invoice_payment') {
        const amt = args.p_amount === null || args.p_amount === undefined ? null : $.toMinor(String(args.p_amount))
        if (amt === null || amt <= 0n) return reply({ status: 'invalid_amount' })
        const inv = find('project_invoices', args.p_invoice_id)
        if (!inv) return reply({ status: 'not_found' })
        const proj = find('projects', inv.project_id)
        const paidOf = () => $.sumMinor(rows('invoice_payments').filter((p) => p.invoice_id === inv.id).map((p) => $.toMinor(p.amount)))
        const dup = args.p_key && rows('invoice_payments').find((p) => p.invoice_id === inv.id && p.idempotency_key === args.p_key)
        if (dup) return reply({ status: 'recorded', duplicate: true, payment_id: dup.id, paid_total: money2(paidOf()), balance: money2($.toMinor(inv.amount) - paidOf()), invoice_status: inv.status })
        if (inv.status === 'void') return reply({ status: 'void' })
        if (!oneOf(inv.status, ['issued', 'partially_paid'])) return reply({ status: 'not_payable', current: inv.status })
        if (paidOf() + amt > $.toMinor(inv.amount)) return reply({ status: 'overpayment', balance: money2($.toMinor(inv.amount) - paidOf()) })
        const pay = { id: uuid(), invoice_id: inv.id, amount: money2(amt), paid_at: args.p_paid_at, method: args.p_method, reference: args.p_reference, note: args.p_note, idempotency_key: args.p_key || null, created_by: args.p_actor }
        rows('invoice_payments').push(pay)
        const bal = $.toMinor(inv.amount) - paidOf()
        inv.status = bal === 0n ? 'paid' : 'partially_paid'
        return reply({ status: 'recorded', duplicate: false, payment_id: pay.id, paid_total: money2(paidOf()), balance: money2(bal), invoice_status: inv.status, client_id: proj.client_id, invoice_number: inv.invoice_number, currency: inv.currency })
      }
      if (name === 'void_invoice') {
        const inv = find('project_invoices', args.p_invoice_id)
        if (!inv) return reply({ status: 'not_found' })
        if (inv.status === 'void') return reply({ status: 'void', duplicate: true })
        if (rows('invoice_payments').some((p) => p.invoice_id === inv.id)) return reply({ status: 'has_payments' })
        if (!oneOf(inv.status, ['draft', 'issued'])) return reply({ status: 'not_voidable', current: inv.status })
        const was = inv.status; inv.status = 'void'; inv.voided_at = new Date().toISOString()
        return reply({ status: 'voided', invoice_number: inv.invoice_number, client_id: find('projects', inv.project_id).client_id, was })
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
  // pdf-lib type-checks with instanceof Array; arrays from a separate vm realm fail that, so the PDF module runs in the main realm.
  if (/commerce[\\/]pdf\.ts$/.test(file)) {
    vm.runInThisContext('(function(require,module,exports,process){' + js + '\n})', { filename: file })(requireFn, mod, mod.exports, { env })
    return mod.exports
  }
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
  console.log('S6.4 proposals, invoices and PDFs')
  const money = () => load('src/lib/commerce/money.ts')
  const PA = 'aaaaaaaa-0000-4000-8000-000000000001', PB = 'bbbbbbbb-0000-4000-8000-000000000001'
  const SECRET_NOTE = 'INTERNAL-ONLY-MARKER-77'

  const setup = () => {
    resetState(); db = makeDb(); cache.clear(); state.rpcCalls = []
    state.tables.proposals = []; state.tables.project_invoices = []
    const $ = () => money()
    const parent = (id) => state.tables.project_invoices.find((i) => i.id === id)
    state.recompute = (inv) => {
      const m = $()
      const sub = m.sumMinor(state.tables.invoice_line_items.filter((l) => l.invoice_id === inv.id).map((l) => m.toMinor(l.line_amount)))
      inv.subtotal = m.minorToString(sub)
      inv.amount = m.minorToString(sub - (m.toMinor(inv.discount_amount) ?? 0n) + (m.toMinor(inv.tax_amount) ?? 0n))
    }
    const lineAmount = (l) => { const m = $(); return m.minorToString(m.lineAmountMinor(String(l.quantity), String(l.unit_price))) }
    state.hooks = {
      'invoice_line_items:insert': (q) => { for (const l of Array.isArray(q.payload) ? q.payload : [q.payload]) { const inv = parent(l.invoice_id); if (inv && inv.status !== 'draft') return { code: '55000' }; l.line_amount = lineAmount(l) } },
      'invoice_line_items:update': (q, hit) => { for (const r of hit) { const inv = parent(r.invoice_id); if (inv && inv.status !== 'draft') return { code: '55000' } } if ('quantity' in q.payload || 'unit_price' in q.payload) q.payload.__recalc = true },
      'invoice_line_items:delete': (q, hit) => { for (const r of hit) { const inv = parent(r.invoice_id); if (inv && inv.status !== 'draft') return { code: '55000' } } },
      'project_invoices:update': (q, hit) => {
        for (const r of hit) if (r.status !== 'draft') for (const k of ['amount', 'subtotal', 'discount_amount', 'tax_amount', 'due_date', 'issue_date', 'currency', 'project_id', 'invoice_number', 'proposal_id']) if (k in q.payload) return { code: '55000' }
      },
    }
    state.after = {
      'invoice_line_items:insert': (out) => { for (const l of out) { const inv = parent(l.invoice_id); if (inv) state.recompute(inv) } },
      'invoice_line_items:update': (out) => { for (const l of out) { if (l.__recalc !== undefined) delete l.__recalc; l.line_amount = lineAmount(l); const inv = parent(l.invoice_id); if (inv) state.recompute(inv) } },
      'invoice_line_items:delete': (out) => { for (const l of out) { const inv = parent(l.invoice_id); if (inv) state.recompute(inv) } },
      'project_invoices:update': (out) => { for (const r of out) { const inv = parent(r.id); if (inv && inv.status === 'draft') state.recompute(inv) } },
    }
  }
  const LINES = [{ title: 'Design', quantity: '2', unit_price: '10.10' }, { title: 'Build', quantity: '0.5', unit_price: '3.33' }]
  const draftBody = (extra = {}) => ({ merchant_id: MERCHANT_A, title: 'Website build', currency: 'USD', discount_amount: '1.87', line_items: LINES, terms: 'Net 14', notes: SECRET_NOTE, ...extra })
  const createDraft = async (extra) => { state.admin = true; const r = await call('admin/proposals', 'POST', { body: draftBody(extra) }); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.proposal.id }
  const send = async (id) => { state.admin = true; return call('admin/proposals/[id]/status', 'POST', { params: { id }, body: { status: 'sent' } }) }
  const P = (id) => state.tables.proposals.find((p) => p.id === id)
  const notes = (type) => state.tables.notifications.filter((n) => n.type === type)
  const asClient = (u = USER_A) => { state.admin = false; as(u) }
  const sentProposal = async (extra) => { const id = await createDraft(extra); const r = await send(id); assert.equal(r.status, 200, JSON.stringify(r.json)); return id }
  const approvedProposal = async () => { const id = await sentProposal(); asClient(); const r = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } }); assert.equal(r.status, 200, JSON.stringify(r.json)); return { id, projectId: r.json.projectId } }
  const pdfHas = (bytes, text) => pdfTextHas(bytes, text)
  const pdfHasOld = (bytes, text) => {
    const buf = Buffer.from(bytes)
    return buf.includes(Buffer.from(text, 'latin1')) || buf.includes(Buffer.from(Buffer.from(text, 'latin1').toString('hex').toUpperCase(), 'latin1')) || buf.includes(Buffer.from(Buffer.from(text, 'latin1').toString('hex'), 'latin1'))
  }
  const pdfBytes = async (res) => new Uint8Array(await res.arrayBuffer())

  // pdf-lib deflates page content and writes Helvetica text as hex strings; inflate every stream and look for the hex of the text.
  const zlib = require('node:zlib')
  const pdfCorpus = (bytes) => {
    const buf = Buffer.from(bytes), parts = [buf.toString('latin1')]
    let i = 0
    while ((i = buf.indexOf('stream', i)) !== -1) {
      let start = i + 6
      if (buf[start] === 13) start++
      if (buf[start] === 10) start++
      const end = buf.indexOf('endstream', start)
      if (end === -1) break
      try { parts.push(zlib.inflateSync(buf.subarray(start, end)).toString('latin1')) } catch {}
      i = end + 9
    }
    return parts.join('\n')
  }
  const pdfTextHas = (bytes, text) => {
    const c = pdfCorpus(bytes)
    return c.includes('(' + text + ')') || c.toUpperCase().includes(Buffer.from(text, 'latin1').toString('hex').toUpperCase())
  }
  console.log('\nA. Money')
  await test('A1 exact integer money: half-up cents like the database, no float drift, strict parsing', () => {
    const m = money()
    assert.equal(m.minorToString(m.lineAmountMinor('0.5', '3.33')), '1.67')
    assert.equal(m.minorToString(m.lineAmountMinor('2', '10.10')), '20.20')
    assert.equal(m.minorToString(m.sumMinor([m.toMinor('0.10'), m.toMinor('0.20')])), '0.30') // 0.1 + 0.2 in floats is 0.30000000000000004
    assert.equal(m.minorToString(m.toMinor(20.2)), '20.20')
    assert.equal(m.minorToString(m.sumMinor(Array.from({ length: 1000 }, () => m.toMinor('0.01')))), '10.00')
    for (const bad of ['1e3', '1,000.00', '1.234', '', 'abc', '-', '1.', '.5', '99999999999999999.00']) assert.ok(m.toMinor(bad) === null || bad === '99999999999999999.00', bad)
    assert.equal(m.isPlainMoney('12.5'), true); assert.equal(m.isPlainMoney('12.555'), false); assert.equal(m.isPlainQuantity('0'), false); assert.equal(m.isPlainQuantity('1.5'), true)
    assert.equal(m.formatMoney('1234.5', 'NGN'), 'NGN 1,234.50'); assert.equal(m.formatMoney(null, 'USD'), '—')
    assert.doesNotMatch(read('src/lib/commerce/money.ts').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n'), /parseFloat|toFixed/)
  })
  await test('A2 overdue is DERIVED from the due date, never stored', () => {
    const s = load('src/lib/commerce/invoice-status.ts')
    assert.equal(s.isOverdue({ status: 'issued', due_date: '2026-01-01' }, '2026-02-01'), true)
    assert.equal(s.isOverdue({ status: 'partially_paid', due_date: '2026-01-01' }, '2026-02-01'), true)
    for (const st of ['draft', 'paid', 'void']) assert.equal(s.isOverdue({ status: st, due_date: '2026-01-01' }, '2026-02-01'), false, st)
    assert.equal(s.isOverdue({ status: 'issued', due_date: '2026-02-01' }, '2026-02-01'), false, 'due today is not overdue')
    assert.equal(s.displayInvoiceStatus({ status: 'issued', due_date: '2026-01-01' }, '2026-02-01'), 'overdue')
    assert.ok(!s.INVOICE_STATUSES.includes('overdue'))
  })

  console.log('\nB. Proposal drafts (Admin)')
  await test('B1 a draft is priced by the server: forged totals, status, version, client and creator are ignored', async () => {
    setup()
    const id = await createDraft({ total: '1.00', subtotal: '1.00', status: 'approved', version: 9, client_id: CLIENT_B, created_by: 'x', accepted_at: 'now', converted_to_project_id: PB })
    const p = P(id)
    assert.equal(p.status, 'draft'); assert.equal(p.version, 1); assert.equal(p.client_id, CLIENT_A, 'client derived from the merchant')
    assert.equal(p.subtotal, '21.87'); assert.equal(p.total, '20.00'); assert.equal(p.created_by, ADMIN); assert.ok(!p.accepted_at && !p.converted_to_project_id)
    assert.match(p.proposal_number, /^PROP-\d{8}-[0-9A-F]{6}$/)
    assert.equal(state.tables.proposal_line_items.filter((l) => l.proposal_id === id).length, 2)
  })
  await test('B2 invalid money, currency, lines and merchants are refused and nothing is stored', async () => {
    setup(); state.admin = true
    const cases = [[{ line_items: [{ title: 'x', quantity: '1', unit_price: '1.234' }] }, 400], [{ currency: 'JPY' }, 400], [{ title: '' }, 400], [{ discount_amount: '5000' }, 400], [{ line_items: [{ title: 'x', quantity: '0', unit_price: '1' }] }, 400], [{ line_items: [{ title: 'x', quantity: '1', unit_price: '1e3' }] }, 400], [{ merchant_id: uuid() }, 404], [{ merchant_id: 'nope' }, 400]]
    for (const [extra, status] of cases) { const r = await call('admin/proposals', 'POST', { body: draftBody(extra) }); assert.equal(r.status, status, JSON.stringify(extra) + ' -> ' + JSON.stringify(r.json)) }
    assert.equal(count('proposals'), 0); assert.equal(count('proposal_line_items'), 0)
  })
  await test('B3 every Admin commercial route requires the active-admin gate', async () => {
    setup(); const id = await createDraft(); state.admin = false; as(USER_A)
    const probes = [['admin/proposals', 'POST', {}, draftBody()], ['admin/proposals/[id]', 'GET', { id }], ['admin/proposals/[id]', 'PATCH', { id }, { title: 'x' }], ['admin/proposals/[id]/status', 'POST', { id }, { status: 'sent' }],
      ['admin/proposals/[id]/convert', 'POST', { id }], ['admin/proposals/[id]/pdf', 'GET', { id }], ['admin/invoices', 'GET', {}], ['admin/invoices', 'POST', {}, { project_id: PA, currency: 'USD' }],
      ['admin/invoices/[id]', 'GET', { id }], ['admin/invoices/[id]', 'PATCH', { id }, { notes: 'x' }], ['admin/invoices/[id]/issue', 'POST', { id }], ['admin/invoices/[id]/payments', 'POST', { id }, { amount: '1', paid_at: '2026-01-01' }],
      ['admin/invoices/[id]/void', 'POST', { id }], ['admin/invoices/[id]/pdf', 'GET', { id }], ['admin/invoices/[id]/lines', 'POST', { id }, { title: 'x', unit_price: '1' }]]
    for (const [rel, m, p, b] of probes) assert.equal((await call(rel, m, { params: p, body: b })).status, 401, rel)
  })
  await test('B4 the draft can be edited; the editor reads the LIVE fields', async () => {
    setup(); const id = await createDraft(); state.admin = true
    const r = await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { title: 'Renamed', discount_amount: '0', line_items: [{ title: 'Only', quantity: '3', unit_price: '2.50' }], total: '999' } })
    assert.equal(r.status, 200, JSON.stringify(r.json)); assert.equal(P(id).total, '7.50'); assert.equal(P(id).title, 'Renamed')
    const g = await call('admin/proposals/[id]', 'GET', { params: { id } })
    assert.equal(g.json.draft.title, 'Renamed'); assert.equal(g.json.draftLines.length, 1); assert.equal(g.json.internal.notes, SECRET_NOTE, 'Admin sees internal notes')
  })

  console.log('\nC. Sending, versions, viewing')
  await test('C1 send snapshots version 1 and notifies the client once; a retry or a wrong transition does nothing', async () => {
    setup(); const id = await createDraft()
    assert.equal((await call('admin/proposals/[id]/status', 'POST', { params: { id }, body: { status: 'approved' } })).status, 400, 'Admin cannot approve on a client\'s behalf')
    assert.equal((await send(id)).status, 200)
    assert.equal(P(id).status, 'sent'); assert.equal(state.tables.proposal_versions.length, 1)
    assert.equal(state.tables.proposal_versions[0].line_items.length, 2); assert.equal(state.tables.proposal_versions[0].total, '20.00')
    const n = notes('proposal_sent'); assert.equal(n.length, 1); assert.equal(n[0].recipient_id, CLIENT_A); assert.equal(n[0].entity_type, 'proposal_version'); assert.equal(n[0].entity_id, state.tables.proposal_versions[0].id)
    assert.equal((await send(id)).status, 409); assert.equal(notes('proposal_sent').length, 1); assert.equal(state.tables.proposal_versions.length, 1)
  })
  await test('C2 a merchant with no client account cannot be sent to', async () => {
    setup(); const id = await createDraft({ merchant_id: MERCHANT_FREE })
    assert.equal(P(id).client_id, null)
    const r = await send(id); assert.equal(r.status, 409); assert.equal(r.json.code, 'client_not_linked'); assert.equal(P(id).status, 'draft')
  })
  await test('C3 after sending, the commercial terms cannot be edited through the API', async () => {
    setup(); const id = await sentProposal()
    const r = await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { title: 'sneaky', line_items: [{ title: 'x', quantity: '1', unit_price: '1' }] } })
    assert.equal(r.status, 409); assert.equal(r.json.code, 'not_editable'); assert.equal(P(id).title, 'Website build'); assert.equal(P(id).total, '20.00')
  })
  await test('C4 the client sees only their own delivered proposals, as the immutable version, without internal notes', async () => {
    setup(); const id = await sentProposal(); const draftId = await createDraft({ title: 'Hidden draft' })
    asClient()
    const list = await call('client-portal/proposals', 'GET'); assert.equal(list.status, 200)
    assert.deepEqual(list.json.proposals.map((p) => p.id), [id], 'the draft is not listed')
    const d = await call('client-portal/proposals/[id]', 'GET', { params: { id } }); assert.equal(d.status, 200)
    assert.equal(d.json.proposal.total, '20.00'); assert.equal(d.json.proposal.lines.length, 2); assert.equal(d.json.canDecide, true)
    assert.ok(!JSON.stringify(d.json).includes(SECRET_NOTE), 'internal notes never reach the client'); assert.ok(!('merchantId' in d.json.proposal) || d.json.proposal.merchantId === undefined)
    assert.equal((await call('client-portal/proposals/[id]', 'GET', { params: { id: draftId } })).status, 404, 'a draft is a 404')
    asClient(USER_B)
    assert.equal((await call('client-portal/proposals/[id]', 'GET', { params: { id } })).status, 404, 'another client gets nothing')
    assert.equal((await call('client-portal/proposals', 'GET')).json.proposals.length, 0)
  })
  await test('C5 viewing marks sent -> viewed once, for the owner only', async () => {
    setup(); const id = await sentProposal()
    asClient(USER_B); assert.equal((await call('client-portal/proposals/[id]/viewed', 'POST', { params: { id } })).status, 404); assert.equal(P(id).status, 'sent')
    asClient(); assert.equal((await call('client-portal/proposals/[id]/viewed', 'POST', { params: { id } })).json.status, 'viewed'); assert.equal((await call('client-portal/proposals/[id]/viewed', 'POST', { params: { id } })).json.status, 'unchanged')
  })

  console.log('\nD. The client decides')
  await test('D1 approval needs the confirmation and the version; a stale version is refused', async () => {
    setup(); const id = await sentProposal(); asClient()
    assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: {} })).status, 400)
    assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1 } })).status, 400, 'no confirm')
    const stale = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 5, confirm: true } }); assert.equal(stale.status, 409); assert.equal(stale.json.code, 'version_mismatch')
    assert.equal(P(id).status, 'sent')
  })
  await test('D2 approval is atomic and idempotent: one project, one notification, forged ids ignored', async () => {
    setup(); const id = await sentProposal(); asClient()
    const body = { version: 1, confirm: true, client_id: CLIENT_B, project_id: PB, status: 'sent', merchant_id: MERCHANT_B, total: '1' }
    const a = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body }); assert.equal(a.status, 200, JSON.stringify(a.json))
    const before = count('projects')
    const b = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body }); assert.equal(b.status, 200); assert.equal(b.json.alreadyApproved, true); assert.equal(b.json.projectId, a.json.projectId)
    assert.equal(count('projects'), before, 'no second project')
    const proj = state.tables.projects.find((p) => p.id === a.json.projectId); assert.equal(proj.client_id, CLIENT_A); assert.equal(proj.status, 'Pending Review')
    assert.equal(P(id).status, 'approved'); assert.equal(P(id).approved_version, 1); assert.equal(P(id).approved_by, USER_A); assert.equal(P(id).converted_to_project_id, proj.id)
    assert.equal(notes('proposal_approved').length, 1); assert.equal(state.tables.projects.filter((p) => p.client_id === CLIENT_B).length, 1, 'client B untouched')
  })
  await test('D3 unconnected and suspended accounts cannot decide; another client cannot approve', async () => {
    setup(); const id = await sentProposal()
    as(USER_NEW); state.admin = false
    for (const [rel, body] of [['approve', { version: 1, confirm: true }], ['request-changes', { reason: 'x' }], ['decline', { confirm: true }]]) {
      const r = await call('client-portal/proposals/[id]/' + rel, 'POST', { params: { id }, body }); assert.equal(r.status, 403, rel); assert.equal(r.json.code, 'not_connected', rel)
    }
    asClient(USER_B); assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } })).status, 404)
    asClient(); state.tables.clients.find((c) => c.id === CLIENT_A).status = 'Suspended'
    assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } })).json.code, 'account_suspended'); assert.equal(P(id).status, 'sent')
  })
  await test('D4 requested changes are a DURABLE record; a retry is a duplicate; the proposal cannot then be approved', async () => {
    setup(); const id = await sentProposal(); asClient()
    const body = { reason: '  Please add maintenance.\u0007  ', clientKey: 'key-0000-0001', status: 'approved', client_id: CLIENT_B }
    const r = await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body }); assert.equal(r.status, 200, JSON.stringify(r.json))
    const resp = state.tables.proposal_responses; assert.equal(resp.length, 1); assert.equal(resp[0].message, 'Please add maintenance.'); assert.equal(resp[0].version_number, 1); assert.equal(resp[0].client_id, CLIENT_A)
    assert.equal(P(id).status, 'changes_requested')
    const again = await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body }); assert.equal(again.json.duplicate, true); assert.equal(state.tables.proposal_responses.length, 1); assert.equal(notes('proposal_changes_requested').length, 1)
    assert.equal((await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body: { reason: '   ' } })).status, 400)
    const ap = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } }); assert.equal(ap.status, 409); assert.equal(ap.json.code, 'not_allowed')
  })
  await test('D5 revision trail: revise, resend as version 2 (a NEW notification), version 1 untouched, change request resolved, approve v2', async () => {
    setup(); const id = await sentProposal(); asClient()
    await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body: { reason: 'Cheaper please', clientKey: 'key-0000-0002' } })
    state.admin = true
    const edit = await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { discount_amount: '0', line_items: [{ title: 'Design', quantity: '2', unit_price: '10.10' }, { title: 'Care plan', quantity: '1', unit_price: '5.00' }] } })
    assert.equal(edit.status, 200, JSON.stringify(edit.json)); assert.equal(state.tables.proposal_versions[0].total, '20.00', 'the version the client saw is untouched by the edit')
    const s2 = await send(id); assert.equal(s2.status, 200); assert.equal(P(id).version, 2); assert.equal(state.tables.proposal_versions.length, 2)
    const sent = notes('proposal_sent').concat(notes('proposal_revised')); assert.equal(sent.length, 2, 'a revision notifies; it is not deduplicated against the first send')
    assert.equal(state.tables.proposal_responses[0].resolved_in_version, 2)
    asClient()
    assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } })).json.code, 'version_mismatch')
    const ok = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 2, confirm: true } }); assert.equal(ok.status, 200); assert.equal(P(id).approved_version, 2)
    const d = await call('client-portal/proposals/[id]', 'GET', { params: { id } }); assert.equal(d.json.proposal.total, '25.20', 'the approved version is what is shown')
  })
  await test('D6 declining needs a confirmation, is recorded, is terminal, and notifies once', async () => {
    setup(); const id = await sentProposal(); asClient()
    assert.equal((await call('client-portal/proposals/[id]/decline', 'POST', { params: { id }, body: {} })).status, 400)
    const r = await call('client-portal/proposals/[id]/decline', 'POST', { params: { id }, body: { confirm: true, note: 'Out of budget' } }); assert.equal(r.status, 200, JSON.stringify(r.json))
    assert.equal(P(id).status, 'declined'); assert.equal(state.tables.proposal_responses[0].response_type, 'declined'); assert.equal(state.tables.proposal_responses[0].message, 'Out of budget')
    const again = await call('client-portal/proposals/[id]/decline', 'POST', { params: { id }, body: { confirm: true } }); assert.equal(again.json.duplicate, true); assert.equal(notes('proposal_declined').length, 1)
    assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } })).status, 409)
  })
  await test('D7 an expired proposal cannot be approved', async () => {
    setup(); const id = await sentProposal(); P(id).expires_at = '2020-01-01T00:00:00Z'; asClient()
    const r = await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 1, confirm: true } }); assert.equal(r.status, 409); assert.equal(r.json.code, 'expired')
  })

  console.log('\nE. Conversion')
  await test('E1 an approved, unconverted proposal converts explicitly, once, to a client project; non-approved is refused', async () => {
    setup()
    const id = await sentProposal(); state.admin = true
    assert.equal((await call('admin/proposals/[id]/convert', 'POST', { params: { id } })).status, 409, 'not approved yet')
    // the historical record: approved, version 1, NOT converted
    Object.assign(P(id), { status: 'approved', approved_version: 1, converted_to_project_id: null })
    const before = count('projects')
    const a = await call('admin/proposals/[id]/convert', 'POST', { params: { id } }); assert.equal(a.status, 200, JSON.stringify(a.json)); assert.equal(a.json.converted, true)
    const b = await call('admin/proposals/[id]/convert', 'POST', { params: { id } }); assert.equal(b.json.converted, false); assert.equal(b.json.projectId, a.json.projectId)
    assert.equal(count('projects'), before + 1); assert.equal(state.tables.projects.find((p) => p.id === a.json.projectId).client_id, CLIENT_A)
  })

  console.log('\nF. Invoices')
  await test('F1 an invoice copies the APPROVED VERSION (not live rows), gets a unique consecutive number, and ignores forged fields', async () => {
    setup(); const { id, projectId } = await approvedProposal(); state.admin = true
    state.tables.proposal_line_items.push({ id: uuid(), proposal_id: id, title: 'LATER LIVE EDIT', quantity: '1', unit_price: '9999.00', amount: '9999.00' }) // mutable rows changed after approval
    const r = await call('admin/invoices', 'POST', { body: { project_id: projectId, proposal_id: id, due_date: '2030-01-31', amount: '1.00', status: 'paid', currency: 'NGN', client_id: CLIENT_B } })
    assert.equal(r.status, 201, JSON.stringify(r.json))
    const inv = state.tables.project_invoices[0]
    assert.match(inv.invoice_number, new RegExp('^HBD-INV-' + new Date().getFullYear() + '-0001$')); assert.equal(inv.status, 'draft'); assert.equal(inv.currency, 'USD', 'inherits the proposal currency'); assert.equal(inv.amount, '20.00')
    const lines = state.tables.invoice_line_items.filter((l) => l.invoice_id === inv.id); assert.deepEqual(lines.map((l) => l.title), ['Design', 'Build']); assert.ok(!lines.some((l) => /LATER/.test(l.title)))
    const second = await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'GBP' } }); assert.match(second.json.invoice.number, /-0002$/)
    assert.equal(new Set(state.tables.project_invoices.map((i) => i.invoice_number)).size, 2)
    const dup = await call('admin/invoices', 'POST', { body: { project_id: projectId, proposal_id: id } }); assert.equal(dup.status, 409); assert.equal(dup.json.code, 'already_invoiced')
  })
  await test('F2 invoices belong to approved proposals and client projects only', async () => {
    setup(); state.admin = true
    const notApproved = await sentProposal()
    assert.equal((await call('admin/invoices', 'POST', { body: { project_id: PA, proposal_id: notApproved } })).json.code, 'proposal_not_approved')
    state.tables.projects.push({ id: 'cccccccc-0000-4000-8000-000000000001', client_id: null, project_id: null, project_name: 'Public case study', status: 'published' })
    assert.equal((await call('admin/invoices', 'POST', { body: { project_id: 'cccccccc-0000-4000-8000-000000000001', currency: 'USD' } })).json.code, 'not_client_project')
    const { id } = await approvedProposal(); state.admin = true
    assert.equal((await call('admin/invoices', 'POST', { body: { project_id: PB, proposal_id: id } })).json.code, 'project_mismatch', 'the proposal\'s project only')
    assert.equal((await call('admin/invoices', 'POST', { body: { project_id: 'bad' } })).status, 400)
  })
  await test('F3 a draft is edited with exact arithmetic; forged amount/status are ignored; issue needs a due date and freezes the invoice', async () => {
    setup(); const { projectId } = await approvedProposal(); state.admin = true
    const c = await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'USD' } }); const iid = c.json.invoice.id
    const add = await call('admin/invoices/[id]/lines', 'POST', { params: { id: iid }, body: { title: 'Hosting', quantity: '3', unit_price: '1.10', line_amount: '1' } }); assert.equal(add.status, 201)
    assert.equal(state.tables.project_invoices[0].amount, '3.30', '3 x 1.10 = 3.30 computed by the database')
    assert.equal((await call('admin/invoices/[id]/lines', 'POST', { params: { id: iid }, body: { title: 'x', quantity: '1', unit_price: '1.234' } })).status, 400)
    assert.equal((await call('admin/invoices/[id]', 'PATCH', { params: { id: iid }, body: { amount: '999', status: 'paid' } })).status, 400, 'nothing editable in that body')
    assert.equal((await call('admin/invoices/[id]', 'PATCH', { params: { id: iid }, body: { discount_amount: '0.30', tax_amount: '0.50', payment_instructions: 'Bank X, 000', notes: 'Thanks', amount: '1' } })).status, 200)
    assert.equal(state.tables.project_invoices[0].amount, '3.50'); assert.equal(state.tables.project_invoices[0].status, 'draft')
    assert.equal((await call('admin/invoices/[id]/issue', 'POST', { params: { id: iid } })).json.code, 'due_date_required')
    await call('admin/invoices/[id]', 'PATCH', { params: { id: iid }, body: { due_date: '2030-02-01' } })
    const issued = await call('admin/invoices/[id]/issue', 'POST', { params: { id: iid } }); assert.equal(issued.status, 200, JSON.stringify(issued.json))
    assert.equal(notes('invoice_issued').length, 1); assert.equal(notes('invoice_issued')[0].recipient_id, CLIENT_A)
    assert.equal((await call('admin/invoices/[id]/issue', 'POST', { params: { id: iid } })).status, 409); assert.equal(notes('invoice_issued').length, 1)
    assert.equal((await call('admin/invoices/[id]', 'PATCH', { params: { id: iid }, body: { discount_amount: '0' } })).status, 409, 'issued figures are frozen')
    assert.equal((await call('admin/invoices/[id]/lines', 'POST', { params: { id: iid }, body: { title: 'x', quantity: '1', unit_price: '1' } })).status, 409, 'issued lines are frozen')
    const lineId = state.tables.invoice_line_items[0].id
    assert.equal((await call('admin/invoices/[id]/lines/[line_id]', 'DELETE', { params: { id: iid, line_id: lineId } })).status, 409)
    assert.equal(state.tables.project_invoices[0].amount, '3.50')
  })
  await test('F4 the payment ledger: partial, overpayment, zero/negative/sub-cent refused, idempotent retry, paid, nothing after', async () => {
    setup(); const { projectId } = await approvedProposal(); state.admin = true
    const iid = (await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'USD', due_date: '2030-02-01' } })).json.invoice.id
    await call('admin/invoices/[id]/lines', 'POST', { params: { id: iid }, body: { title: 'Work', quantity: '1', unit_price: '25.20' } })
    const pay = (b) => call('admin/invoices/[id]/payments', 'POST', { params: { id: iid }, body: { paid_at: '2026-01-15', ...b } })
    assert.equal((await pay({ amount: '5.00' })).json.code, 'not_payable', 'a draft takes no payment')
    await call('admin/invoices/[id]/issue', 'POST', { params: { id: iid } })
    for (const bad of [{ amount: '0' }, { amount: '-5' }, { amount: '0.001' }, { amount: 'abc' }, { amount: '' }]) assert.equal((await pay(bad)).status, 400, JSON.stringify(bad))
    assert.equal((await call('admin/invoices/[id]/payments', 'POST', { params: { id: iid }, body: { amount: '1', paid_at: 'tomorrow' } })).status, 400)
    const p1 = await pay({ amount: '5.00', method: 'bank', reference: 'R1', clientKey: 'pay-key-0000001' }); assert.equal(p1.status, 201, JSON.stringify(p1.json)); assert.equal(p1.json.invoice.status, 'partially_paid'); assert.equal(p1.json.invoice.balance, '20.20')
    const again = await pay({ amount: '5.00', clientKey: 'pay-key-0000001' }); assert.equal(again.status, 200); assert.equal(again.json.duplicate, true); assert.equal(state.tables.invoice_payments.length, 1); assert.equal(notes('payment_recorded').length, 1)
    const over = await pay({ amount: '20.21' }); assert.equal(over.status, 409); assert.equal(over.json.code, 'overpayment'); assert.equal(over.json.balance, '20.20')
    assert.equal((await call('admin/invoices/[id]/void', 'POST', { params: { id: iid }, body: {} })).json.code, 'has_payments')
    const last = await pay({ amount: '20.20', clientKey: 'pay-key-0000002' }); assert.equal(last.json.invoice.status, 'paid'); assert.equal(last.json.invoice.balance, '0.00')
    assert.equal(notes('invoice_paid').length, 1)
    assert.equal((await pay({ amount: '1' })).json.code, 'not_payable')
    assert.equal(state.tables.invoice_payments.length, 2)
  })
  await test('F5 void: a draft or unpaid issued invoice only; repeating is harmless; the reason stays out of the client\'s document', async () => {
    setup(); const { projectId } = await approvedProposal(); state.admin = true
    const iid = (await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'USD' } })).json.invoice.id
    const v = await call('admin/invoices/[id]/void', 'POST', { params: { id: iid }, body: { reason: SECRET_NOTE } }); assert.equal(v.status, 200)
    assert.equal(state.tables.project_invoices[0].status, 'void'); assert.equal((await call('admin/invoices/[id]/void', 'POST', { params: { id: iid }, body: {} })).json.duplicate, true)
    assert.ok(!JSON.stringify(state.tables.project_invoices).includes(SECRET_NOTE), 'the reason is never written to the invoice')
  })

  console.log('\nG. The client\'s invoices')
  const issuedFor = async (userRows = {}) => {
    const { projectId } = await approvedProposal(); state.admin = true
    const iid = (await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'USD', due_date: '2030-02-01' } })).json.invoice.id
    await call('admin/invoices/[id]/lines', 'POST', { params: { id: iid }, body: { title: 'Work', quantity: '1', unit_price: '100.00' } })
    await call('admin/invoices/[id]', 'PATCH', { params: { id: iid }, body: { payment_instructions: 'Pay to Hbee Bank 123', notes: 'Thanks for your business' } })
    await call('admin/invoices/[id]/issue', 'POST', { params: { id: iid } })
    return { iid, projectId }
  }
  await test('G1 a client lists and opens only their own DELIVERED invoices, with paid and balance from the ledger', async () => {
    setup(); const { iid, projectId } = await issuedFor()
    const draftId = (await call('admin/invoices', 'POST', { body: { project_id: projectId, currency: 'USD' } })).json.invoice.id
    await call('admin/invoices/[id]/payments', 'POST', { params: { id: iid }, body: { amount: '30.00', paid_at: '2026-01-10' } })
    asClient()
    const list = await call('client-portal/invoices', 'GET'); assert.equal(list.status, 200)
    assert.deepEqual(list.json.invoices.map((i) => i.id), [iid], 'the draft is invisible')
    assert.equal(list.json.invoices[0].paid, '30.00'); assert.equal(list.json.invoices[0].balance, '70.00'); assert.equal(list.json.invoices[0].status, 'partially_paid')
    const d = await call('client-portal/invoices/[id]', 'GET', { params: { id: iid } }); assert.equal(d.status, 200); assert.equal(d.json.invoice.paymentInstructions, 'Pay to Hbee Bank 123'); assert.equal(d.json.invoice.payments.length, 1)
    assert.ok(!('clientId' in d.json.invoice) && !('proposalId' in d.json.invoice), 'admin-only fields are not returned')
    assert.equal((await call('client-portal/invoices/[id]', 'GET', { params: { id: draftId } })).status, 404)
    asClient(USER_B)
    assert.equal((await call('client-portal/invoices/[id]', 'GET', { params: { id: iid } })).status, 404); assert.equal((await call('client-portal/invoices', 'GET')).json.invoices.length, 0)
  })
  await test('G2 overdue is shown, derived from the due date, while the stored status stays issued', async () => {
    setup(); const { iid } = await issuedFor(); state.tables.project_invoices[0].due_date = '2020-01-01'; asClient()
    const list = await call('client-portal/invoices', 'GET'); assert.equal(list.json.invoices[0].status, 'overdue'); assert.equal(list.json.invoices[0].statusLabel, 'Overdue')
    assert.equal(state.tables.project_invoices[0].status, 'issued', 'nothing was written by reading')
  })
  await test('G3 a suspended account cannot read invoices or proposals', async () => {
    setup(); await issuedFor(); asClient(); state.tables.clients.find((c) => c.id === CLIENT_A).status = 'Suspended'
    for (const rel of ['client-portal/invoices', 'client-portal/proposals']) assert.equal((await call(rel, 'GET')).json.code, 'account_suspended', rel)
  })

  console.log('\nH. PDFs')
  await test('H1 the proposal PDF is generated from the server record: number, version, currency and total are printed; internal notes are not', async () => {
    setup(); const id = await sentProposal(); asClient()
    const r = await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id } }); assert.equal(r.status, 200)
    assert.equal(r.res.headers.get('content-type'), 'application/pdf'); assert.match(r.res.headers.get('content-disposition'), /^attachment; filename="[A-Za-z0-9._-]+-v1\.pdf"$/); assert.match(r.res.headers.get('cache-control'), /no-store/)
    const bytes = await pdfBytes(r.res); assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-')
    const p = P(id)
    for (const t of [p.proposal_number, 'Website build', 'USD 20.00', 'USD 21.87', 'Design']) assert.ok(pdfHas(bytes, t), 'PDF should contain ' + t)
    assert.ok(!pdfHas(bytes, SECRET_NOTE), 'internal notes are never printed')
  })
  await test('H2 a draft previews for the Admin with a draft stamp; the client gets a 404 for it; another client gets a 404 for a sent one', async () => {
    setup(); const draft = await createDraft(); const sent = await sentProposal(); state.admin = true
    const a = await call('admin/proposals/[id]/pdf', 'GET', { params: { id: draft } }); assert.equal(a.status, 200); assert.ok(pdfHas(await pdfBytes(a.res), 'DRAFT PREVIEW'))
    asClient(); assert.equal((await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id: draft } })).status, 404)
    asClient(USER_B); assert.equal((await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id: sent } })).status, 404)
    as(USER_NEW); assert.equal((await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id: sent } })).status, 404)
  })
  await test('H3 the invoice PDF prints the invoice\'s own figures: number, items, total, paid, balance, payment instructions', async () => {
    setup(); const { iid } = await issuedFor(); await call('admin/invoices/[id]/payments', 'POST', { params: { id: iid }, body: { amount: '40.00', paid_at: '2026-01-10' } })
    asClient(); const r = await call('client-portal/invoices/[id]/pdf', 'GET', { params: { id: iid } }); assert.equal(r.status, 200)
    const bytes = await pdfBytes(r.res); assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-')
    for (const t of [state.tables.project_invoices[0].invoice_number, 'USD 100.00', 'USD 40.00', 'USD 60.00', 'Pay to Hbee Bank 123', 'Work']) assert.ok(pdfHas(bytes, t), 'PDF should contain ' + t)
    asClient(USER_B); assert.equal((await call('client-portal/invoices/[id]/pdf', 'GET', { params: { id: iid } })).status, 404)
    state.admin = true; assert.equal((await call('admin/invoices/[id]/pdf', 'GET', { params: { id: iid } })).status, 200)
  })
  await test('H4 unencodable text can never break generation, and the PDF layer has no field for internal data', async () => {
    const { sanitizePdfText, buildInvoicePdf, buildProposalPdf } = load('src/lib/commerce/pdf.ts')
    assert.equal(sanitizePdfText('Café — “ok” → \u{1F600} ₦5'), 'Café — “ok” ? ? ?5')
    const long = 'x'.repeat(400)
    const bytes = await buildProposalPdf({ number: 'N', version: 1, title: long, preparedFor: { name: 'A\u0000B' }, currency: 'NGN', lines: Array.from({ length: 60 }, (_, i) => ({ title: 'Item ' + i + ' ' + long.slice(0, 120), description: '→ ' + long, quantity: '1', unit_price: '1.00', amount: '1.00' })), subtotal: '60.00', discount: '0.00', total: '60.00', scope: long.repeat(40) })
    assert.ok(bytes.length > 1000); assert.equal(Buffer.from(bytes.slice(0, 5)).toString(), '%PDF-')
    assert.ok((await buildInvoicePdf({ number: 'I', statusLabel: 'Paid', billTo: { name: 'X' }, project: { name: 'P' }, currency: 'EUR', lines: [], subtotal: '0.00', discount: '0.00', tax: '0.00', total: '0.00', paid: '0.00', balance: '0.00' })).length > 500)
    assert.doesNotMatch(read('src/lib/commerce/pdf.ts'), /\bnotes\b\s*:\s*(?!.*string)[^\n]*proposal|internal_notes|admin_notes/i)
  })

  console.log('\nP. Payment terms belong to the immutable version')
  const clientView = async (id) => { asClient(); const r = await call('client-portal/proposals/[id]', 'GET', { params: { id } }); assert.equal(r.status, 200, JSON.stringify(r.json)); return r.json.proposal }
  await test('P1 a version snapshots its payment terms; a later draft edit cannot change what a sent version says (screen and PDF)', async () => {
    setup(); const id = await sentProposal({ payment_terms: '50% upfront' })
    assert.equal(state.tables.proposal_versions[0].payment_terms, '50% upfront')
    assert.equal((await clientView(id)).paymentTerms, '50% upfront')
    asClient()
    await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body: { reason: 'Different terms please', clientKey: 'key-pt-000001' } })
    state.admin = true
    const edit = await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { payment_terms: '30 days net' } }); assert.equal(edit.status, 200, JSON.stringify(edit.json))
    assert.equal(P(id).pricing.payment_terms, '30 days net', 'the live draft moved')
    assert.equal(state.tables.proposal_versions[0].payment_terms, '50% upfront', 'version 1 did not')
    assert.equal((await clientView(id)).paymentTerms, '50% upfront', 'the client still sees version 1 until a new version is sent')
    asClient(); const pdf1 = await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id } }); const b1 = await pdfBytes(pdf1.res)
    assert.ok(pdfHas(b1, '50% upfront') && !pdfHas(b1, '30 days net'), 'the PDF prints the version terms, not the draft terms')
  })
  await test('P2 resend creates version 2 with its OWN terms; version 1 keeps the original; the approved version keeps its terms for good', async () => {
    setup(); const id = await sentProposal({ payment_terms: '50% upfront' }); asClient()
    await call('client-portal/proposals/[id]/request-changes', 'POST', { params: { id }, body: { reason: 'x', clientKey: 'key-pt-000002' } })
    state.admin = true; await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { payment_terms: '30 days net' } }); assert.equal((await send(id)).status, 200)
    assert.deepEqual(state.tables.proposal_versions.map((v) => [v.version_number, v.payment_terms]), [[1, '50% upfront'], [2, '30 days net']])
    assert.equal((await clientView(id)).paymentTerms, '30 days net')
    asClient(); assert.equal((await call('client-portal/proposals/[id]/approve', 'POST', { params: { id }, body: { version: 2, confirm: true } })).status, 200)
    // after approval nothing may move: the API refuses edits, and even a tampered live row cannot change what is shown or printed
    state.admin = true; assert.equal((await call('admin/proposals/[id]', 'PATCH', { params: { id }, body: { payment_terms: 'free' } })).status, 409)
    P(id).pricing = { ...P(id).pricing, payment_terms: 'TAMPERED' }
    assert.equal((await clientView(id)).paymentTerms, '30 days net')
    asClient(); const pdf = await pdfBytes((await call('client-portal/proposals/[id]/pdf', 'GET', { params: { id } })).res)
    assert.ok(pdfHas(pdf, '30 days net') && !pdfHas(pdf, 'TAMPERED'))
    assert.equal(state.tables.proposal_versions[1].payment_terms, '30 days net'); assert.equal(state.tables.proposal_versions[0].payment_terms, '50% upfront')
  })
  await test('P3 a draft preview (never sent) shows the live terms; a delivered version never reads the legacy JSON', async () => {
    setup(); const id = await createDraft({ payment_terms: 'on delivery' }); state.admin = true
    const g = await call('admin/proposals/[id]', 'GET', { params: { id } }); assert.equal(g.json.draft.payment_terms, 'on delivery')
    const docs = stripComments(read('src/lib/commerce/documents.ts'))
    assert.match(docs, /paymentTerms:\s*snapshot\s*\?\s*str\(snapshot\.payment_terms\)/)
  })
  await test('P4 the SQL snapshots, backfills, freezes and verifies payment terms', () => {
    const noComments = (s) => s.replace(/--.*$/gm, '')
    const fwd = noComments(read('scripts/proposals-invoices-01-forward.sql')), ver = noComments(read('scripts/proposals-invoices-03-verify-readonly.sql')), beh = read('scripts/proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql')
    assert.match(fwd, /CREATE TABLE public\.proposal_versions \([\s\S]*?payment_terms\s+text NOT NULL DEFAULT ''[\s\S]*?\);/)
    assert.equal((fwd.match(/INSERT INTO public\.proposal_versions \([^)]*payment_terms/g) || []).length, 2, 'the legacy backfill and send_proposal both write it')
    assert.match(fwd, /'pricing' ->> 'payment_terms'/); assert.match(fwd, /does not carry its proposal payment terms/)
    assert.match(fwd, /CREATE TRIGGER proposal_versions_no_update BEFORE UPDATE OR DELETE ON public\.proposal_versions/)
    assert.match(ver, /proposal_versions','payment_terms','text'/); assert.match(ver, /carries the payment terms the client saw/)
    assert.match(beh, /version 2 carries its own payment terms; version 1 keeps the original/); assert.match(beh, /live payment terms of a sent proposal are frozen/)
  })

  console.log('\nJ. Dashboard money is aggregated exactly')
  await test('J1 0.10 + 0.20 is exactly 0.30, per currency, in integer minor units; nothing is added as a float', () => {
    const m = load('src/lib/admin/money.ts')
    const s = m.summariseMoney([{ amount: 0.1, currency: 'USD' }, { amount: '0.20', currency: 'USD' }, { amount: 5, currency: 'NGN' }])
    assert.equal(s.totals.find((t) => t.currency === 'USD').total, '0.30')
    assert.equal(s.totals.find((t) => t.currency === 'NGN').total, '5.00'); assert.equal(s.totals.length, 2, 'unlike currencies are never mixed')
    assert.match(m.describeMoney(m.summariseMoney([{ amount: 0.1, currency: 'USD' }, { amount: 0.2, currency: 'USD' }])), /0[.,]30/)
    const many = m.summariseMoney(Array.from({ length: 1000 }, () => ({ amount: '0.01', currency: 'EUR' })))
    assert.equal(many.totals[0].total, '10.00', '1000 x 0.01 has no float drift')
    const odd = m.summariseMoney([{ amount: '1.234', currency: 'USD' }, { amount: 'abc', currency: 'USD' }, { amount: null, currency: 'USD' }, { amount: 1, currency: null }])
    assert.equal(odd.totals.length, 0); assert.equal(odd.noAmountCount, 3); assert.equal(odd.unknownCurrencyCount, 1)
    const src = stripComments(read('src/lib/admin/money.ts')); assert.doesNotMatch(src, /total\s*\+=|Number\(row\.amount\)/, 'no number-based accumulation')
  })

  console.log('\nI. Static guarantees')
  const walk = (d, out = []) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = d + '/' + e.name; if (e.isDirectory()) walk(p, out); else if (/\.(ts|tsx)$/.test(e.name)) out.push(p) } return out }
  await test('I1 no browser-side commercial write remains: no page or component writes proposals / project_invoices through Supabase', () => {
    for (const f of [...walk('src/app').filter((x) => !x.startsWith('src/app/api')), ...walk('src/components')]) {
      const src = stripComments(read(f))
      assert.doesNotMatch(src, /from\('(proposals|project_invoices|invoice_payments|invoice_line_items|proposal_line_items|proposal_versions|proposal_responses)'\)\s*\.\s*(update|insert|delete|upsert)/, f)
    }
    assert.doesNotMatch(stripComments(read('src/app/admin/proposals/[id]/page.tsx')), /\.update\(|\.insert\(|\.delete\(/)
  })
  await test('I2 every new route resolves its caller first (requireActiveAdmin or the Portal resolver) and never reads an identity or a price from the body', () => {
    const routes = walk('src/app/api').filter((f) => !f.endsWith('proposals/options/route.ts') && !/proposals\/\[id\]\/files\//.test(f)).filter((f) => /\/(admin\/(invoices|proposals)|client-portal\/(invoices|proposals))\/.*route\.ts$|\/admin\/(invoices|proposals)\/route\.ts$|\/client-portal\/(invoices|proposals)\/route\.ts$/.test('/' + f))
    assert.ok(routes.length >= 20, routes.length + ' routes found')
    for (const f of routes) {
      const src = stripComments(read(f))
      assert.match(src, /requireActiveAdmin\(\)|resolvePortalClient\(/, f)
      // an Admin may name the project / merchant to create against (validated server-side); nothing else identity- or price-like
      assert.doesNotMatch(src, /body\??\.(client_id|total|subtotal|amount_paid|balance|approved_by|approved_version|created_by)/, f)
      if (!/admin\/(invoices|proposals)\/route\.ts$/.test(f)) assert.doesNotMatch(src, /body\??\.(merchant_id|project_id)/, f)
    }
    for (const f of routes.filter((x) => x.includes('client-portal/proposals') && /(approve|request-changes|decline|viewed)/.test(x))) assert.match(stripComments(read(f)), /requireConnected:\s*true/, f)
  })
  await test('I3 money is never added with JavaScript numbers in the commercial code, and nothing is persisted or exposed as a file', () => {
    for (const f of walk('src/lib/commerce')) {
      const src = stripComments(read(f))
      assert.doesNotMatch(src, /parseFloat|\.toFixed\(|Number\([^)]*\)\s*[-+*]\s*Number\(/, f)
      assert.doesNotMatch(src, /storage\s*\.\s*from|getPublicUrl|createSignedUrl|writeFile/, f + ': a PDF is generated on demand, never stored')
    }
    for (const f of walk('src/app/api').filter((x) => x.endsWith('/pdf/route.ts'))) assert.doesNotMatch(stripComments(read(f)), /storage|upload|\.insert\(/, f)
  })
  await test('I4 every S6.4 notification names a deterministic entity and goes through the single writer', () => {
    const n = stripComments(read('src/lib/commerce/notify.ts'))
    assert.equal((n.match(/createNotification\(/g) || []).length, 1, 'one call site: send()')
    assert.equal((n.match(/entityId: o\./g) || []).length, 4)
    assert.match(n, /entityType: 'proposal_version'/)
    for (const f of walk('src/app/api').filter((x) => /commerce|invoices|proposals/.test(x))) assert.doesNotMatch(stripComments(read(f)), /from\('notifications'\)\s*\.\s*insert/, f)
  })
  await test('I5 overdue is derived everywhere: nothing queries a stored status of overdue', () => {
    for (const f of ['src/app/admin/dashboard/page.tsx', 'src/app/admin/workspace/page.tsx']) {
      const s = stripComments(read(f)); assert.doesNotMatch(s, /eq\('status',\s*'overdue'\)/, f); assert.match(s, /todayInBusinessZone\(\)/, f)
    }
    assert.doesNotMatch(read('scripts/proposals-invoices-01-forward.sql').replace(/--.*$/gm, ''), /'overdue'/)
  })
  await test('I6 the dependency change is exactly pdf-lib (pinned) and the lockfile agrees', () => {
    const pkg = JSON.parse(read('package.json')); assert.equal(pkg.dependencies['pdf-lib'], '1.17.1')
    const lock = JSON.parse(read('package-lock.json')); assert.ok(lock.packages['node_modules/pdf-lib'], 'lockfile entry'); assert.equal(lock.packages['node_modules/pdf-lib'].version, '1.17.1')
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  if (failures.length) process.exit(1)
})()
