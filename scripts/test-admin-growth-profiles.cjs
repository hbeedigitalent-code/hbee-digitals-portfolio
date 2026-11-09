// Offline checks for Phase 6 (Growth Profiles), the merchant reconciliation and the audit documents.
// No database, no network.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execSync } = require('node:child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
const deq = (a, b, m) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m)

function loadTs(file, sandbox = {}) {
  const cache = loadTs.cache || (loadTs.cache = new Map())
  if (cache.has(file)) return cache.get(file)
  const mod = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  const req = (name) => {
    if (name === '@/lib/admin/profile-release') return loadTs('src/lib/admin/profile-release.ts')
    if (name === '@/lib/portal-invitation-state') return loadTs('src/lib/portal-invitation-state.ts')
    return require(name)
  }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, console: { error() {}, log: console.log }, process: { env: sandbox.env || {} }, Date, Map }, { filename: file })
  cache.set(file, mod.exports)
  return mod.exports
}

/* ── The release evaluator mirrors the Client Portal gate ─────────────────── */
const rel = loadTs('src/lib/admin/profile-release.ts')
const P = 'p-1'
const approved = (extra = {}) => ({ decision: 'approved', decision_seq: 2, decided_at: '2026-10-01', profile_id: P, ...extra })
const ev = (o = {}) => rel.evaluateRelease({ profileId: P, profileAssessmentId: 'a-1', decision: approved(), linkedClients: 1, releaseEnabled: true, ...o })
const codes = (e) => e.blockers.map((b) => b.code)

let e = ev()
assert.equal(e.visible, true); assert.equal(e.decisionState, 'approved_this'); deq(codes(e), [])
e = ev({ releaseEnabled: false }); assert.equal(e.visible, false); deq(codes(e), ['release_gate_off'])
e = ev({ linkedClients: 0 }); assert.equal(e.visible, false); deq(codes(e), ['no_linked_client'])
e = ev({ decision: null }); assert.equal(e.visible, false); assert.equal(e.decisionState, 'none'); deq(codes(e), ['no_decision'])
e = ev({ decision: { decision: 'declined', profile_id: P } }); assert.equal(e.visible, false); deq(codes(e), ['declined'])
e = ev({ decision: { decision: 'withdrawn', profile_id: P } }); assert.equal(e.visible, false); deq(codes(e), ['withdrawn'])
e = ev({ decision: approved({ profile_id: 'p-other' }) }); assert.equal(e.visible, false); assert.equal(e.decisionState, 'approved_other'); deq(codes(e), ['approved_other_profile'], 'release is bound to the approved profile, not to whichever is active')
e = ev({ profileAssessmentId: null }); assert.equal(e.visible, false); deq(codes(e), ['no_assessment_binding'])
e = ev({ decision: undefined }); assert.equal(e.visible, null, 'an unreadable decision is "unknown", never a guess'); assert.equal(e.decisionState, 'unknown')
e = ev({ linkedClients: null }); assert.equal(e.visible, null)
e = ev({ releaseEnabled: null }); assert.equal(e.visible, null)
e = ev({ decision: null, linkedClients: null }); assert.equal(e.visible, false, 'a proven blocker is a definite no even when something else is unknown')
e = ev({ linkedClients: 2 }); assert.equal(e.visible, true, 'the portal requires a linked client; more than one does not block it (the decision panel flags the ambiguity separately)')
// Not inputs: completion, is_active, review_status, invitations.
const releaseSrc = stripComments(read('src/lib/admin/profile-release.ts'))
assert.doesNotMatch(releaseSrc.slice(releaseSrc.indexOf('export interface ReleaseInputs')), /is_active|review_status|isActive/, 'the evaluator never reads the Archive flag or the stored review mark')

/* ── The context builder: joins by stored ids; unreadable sources become "unknown" ── */
function fakeDb(tables, failing = []) {
  return {
    from(name) {
      const q = { select() { return q }, order() { return q }, limit() { return q }, not() { return q }, eq() { return q },
        then(resolve) { return Promise.resolve(failing.includes(name) ? { data: null, error: { code: 'X' } } : { data: tables[name] || [], error: null }).then(resolve) } }
      return q
    },
  }
}
const ctx = loadTs('src/lib/admin/profile-context.ts')
const tables = {
  growth_reviews: [{ id: 'rv-1', assessment_id: 'a-1', status: 'completed', completed_at: '2026-09-30' }, { id: 'rv-2', assessment_id: 'a-2', status: 'pending', completed_at: null }],
  growth_program_decisions: [{ merchant_id: 'm-1', decision: 'approved', decision_seq: 2, decided_at: '2026-10-01', profile_id: 'p-1', assessment_id: 'a-1' }, { merchant_id: 'm-1', decision: 'declined', decision_seq: 1, decided_at: '2026-09-01', profile_id: 'p-0', assessment_id: 'a-0' }],
  clients: [{ id: 'c-1', merchant_id: 'm-1' }],
  portal_invitations: [{ merchant_id: 'm-2', email: 'x@y.test', created_at: '2026-10-02', expires_at: '2999-01-01T00:00:00Z', consumed_at: null, revoked_at: null }],
}
const profiles = [{ id: 'p-1', merchant_id: 'm-1', assessment_id: 'a-1' }, { id: 'p-2', merchant_id: 'm-2', assessment_id: 'a-2' }, { id: 'p-3', merchant_id: null, assessment_id: 'a-3' }]
;(async () => {
  let s = await ctx.buildProfileStatuses(fakeDb(tables), profiles, { releaseEnabled: true, history: true })
  assert.equal(s['p-1'].release.visible, true); assert.equal(s['p-1'].review.status, 'completed'); assert.equal(s['p-1'].review.id, 'rv-1')
  assert.equal(s['p-1'].decision.current.decision, 'approved', 'the highest decision_seq is the effective decision'); assert.equal(s['p-1'].decision.history.length, 2)
  assert.equal(s['p-1'].linkage.linked_clients, 1); assert.equal(s['p-1'].linkage.client_id, 'c-1')
  assert.equal(s['p-2'].release.visible, false); assert.equal(s['p-2'].release.decisionState, 'none'); assert.equal(s['p-2'].linkage.linked_clients, 0)
  assert.equal(s['p-2'].invitation.summary.state, 'open', 'an open invitation is reported as open, and it does NOT make the profile visible')
  assert.equal(s['p-2'].review.status, 'pending')
  assert.equal(s['p-3'].decision.known, false, 'no merchant → nothing can be said about decisions'); assert.equal(s['p-3'].release.visible, null)
  s = await ctx.buildProfileStatuses(fakeDb(tables), profiles, { releaseEnabled: false })
  assert.equal(s['p-1'].release.visible, false); deq(s['p-1'].release.blockers.map((b) => b.code), ['release_gate_off'], 'approved + linked but gate off is still withheld')
  assert.equal(s['p-1'].decision.history.length, 0, 'history only when asked for')
  // Failed reads never turn into "none".
  s = await ctx.buildProfileStatuses(fakeDb(tables, ['growth_program_decisions']), profiles, { releaseEnabled: true })
  assert.equal(s['p-1'].decision.known, false); assert.equal(s['p-1'].release.visible, null); assert.equal(s['p-1'].release.decisionState, 'unknown')
  s = await ctx.buildProfileStatuses(fakeDb(tables, ['clients']), profiles, { releaseEnabled: true })
  assert.equal(s['p-1'].linkage.known, false); assert.equal(s['p-1'].release.visible, null)
  s = await ctx.buildProfileStatuses(fakeDb(tables, ['growth_reviews', 'portal_invitations']), profiles, { releaseEnabled: true })
  assert.equal(s['p-1'].review.known, false); assert.equal(s['p-1'].invitation.known, false); assert.equal(s['p-1'].release.visible, true, 'an unreadable review does not change a gate that does not use it')
  assert.equal(loadTs('src/lib/admin/profile-context.ts', { env: { GROWTH_PROFILE_RELEASE_ENABLED: 'true' } }) === ctx, true)

  /* ── Source-level guarantees ───────────────────────────────────────────── */
  const ctxSrc = stripComments(read('src/lib/admin/profile-context.ts'))
  assert.doesNotMatch(ctxSrc, /\.insert\(|\.update\(|\.delete\(|\.rpc\(|\.upsert\(/, 'the status helper only reads')
  assert.doesNotMatch(ctxSrc, /token_hash/, 'invitation secrets are never selected')
  assert.match(ctxSrc, /select\('merchant_id, email, created_at, expires_at, consumed_at, revoked_at'\)/)
  assert.doesNotMatch(ctxSrc, /\.in\(/, 'no long id lists in URLs')

  const listApi = read('src/app/api/admin/growth-profiles/route.ts'); const detailApi = read('src/app/api/admin/growth-profiles/[id]/route.ts')
  for (const api of [listApi, detailApi]) { assert.match(api, /requireActiveAdmin\(\)/); assert.match(api, /buildProfileStatuses\(db,/) }
  assert.match(detailApi, /is_active must be a boolean/, 'the PATCH contract (is_active only) is unchanged')
  assert.match(listApi, /export async function POST/, 'profile creation is unchanged')
  assert.equal(execSync('git status --porcelain -- src/app/api/client-portal src/app/api/growth-reviews src/app/api/admin/growth-assessments', { cwd: root }).toString().trim(), '', 'the release mechanism and the decision/completion routes are untouched')
  assert.match(read('src/app/api/client-portal/growth-profile/route.ts'), /process\.env\.GROWTH_PROFILE_RELEASE_ENABLED === 'true'/)

  /* ── Pages ─────────────────────────────────────────────────────────────── */
  const listPage = read('src/app/admin/growth-profiles/page.tsx'); const detailPage = read('src/app/admin/growth-profiles/[id]/page.tsx'); const statusUi = read('src/components/admin/growth/ProfileStatus.tsx')
  for (const [name, src] of Object.entries({ listPage, detailPage, statusUi })) assert.doesNotMatch(stripComments(src), /Released\b|released to|is released/i, `${name}: never labels a profile "released"`)
  assert.match(statusUi, /Visible to client/); assert.match(statusUi, /Withheld from client/); assert.match(statusUi, /Approved for this profile/)
  assert.match(statusUi, /Review completed/); assert.match(statusUi, /No decision recorded/); assert.match(statusUi, /Invitation accepted/)
  assert.match(listPage, /method: 'PATCH'[\s\S]*is_active: next/, 'Archive / Activate still uses the same endpoint')
  assert.match(listPage, /if \(!confirm\(message\)\)/); assert.match(listPage, /does NOT withdraw a release/, 'the admin is told archiving does not withdraw a release')
  assert.ok(listPage.includes('visibilityUnknown ? undefined'), 'counts that cannot be stated are hidden, not shown as zero'); assert.match(listPage, /AdminErrorState/); assert.match(listPage, /AdminLoadingState/); assert.match(listPage, /AdminEmptyState/)
  assert.match(detailPage, /function safeHttp/)
  assert.doesNotMatch(stripComments(detailPage), /href=\{pdfUrl\}[^>]*>(?![\s\S]{0,0})/.source ? /^$/ : /^$/)
  assert.ok(detailPage.includes('setPdfUrl(safeHttp(payload.pdf_url))'), 'a stored PDF url is only linked when it is an http(s) URL')
  assert.match(detailPage, /\/admin\/growth-reviews\/\$\{status\.review\.id\}#decision/, 'links to the decision by the real review id')
  assert.match(statusUi, /\/admin\/client-portal\/\$\{status\.linkage\.client_id\}/, 'portal account link uses the client id')
  assert.doesNotMatch(stripComments(listPage + detailPage), /growth-assessments/, 'no references to the retired nav route')

  /* ── Merchants API / page: stored identifiers only ─────────────────────── */
  const merchantsApi = read('src/app/api/admin/merchants/route.ts')
  assert.match(merchantsApi, /view !== 'accounts' && view !== 'businesses'/, 'the view is an enum')
  assert.match(merchantsApi, /Unsupported view/); assert.match(merchantsApi, /requireActiveAdmin\(\)/)
  assert.doesNotMatch(stripComments(merchantsApi), /\.insert\(|\.update\(|\.delete\(|\.rpc\(/, 'merchant lists never write')
  assert.doesNotMatch(stripComments(merchantsApi), /\.ilike\(|\.eq\('email'|\.eq\('business_name'/, 'nothing is matched on email or name')
  assert.match(merchantsApi, /clientByUser/); assert.match(merchantsApi, /\.not\('user_id', 'is', null\)/); assert.doesNotMatch(merchantsApi, /\.in\('user_id'/)
  assert.match(merchantsApi, /linked_clients: clientsRes\.error \? null/, 'an unreadable relationship is null, not 0')
  const merchantsPage = stripComments(read('src/app/admin/merchants/page.tsx'))
  assert.match(merchantsPage, /Sign-up accounts/); assert.match(merchantsPage, /Businesses/); assert.match(merchantsPage, /a\.merchant_id &&/, 'a sign-up row links to a business only through its stored client link')
  assert.doesNotMatch(merchantsPage, /\/admin\/merchants\/\$\{a\.id\}/, 'a sign-up account id is never used as a business id')

  /* ── Documentation exists and is honest about what was not run ─────────── */
  for (const f of ['docs/admin-merchant-architecture.md', 'docs/admin-route-security-audit.md', 'docs/admin-password-recovery-staging.md']) assert.ok(fs.existsSync(path.join(root, f)), f)
  assert.match(read('docs/admin-password-recovery-staging.md'), /Status: NOT EXECUTED/)
  assert.match(read('docs/admin-merchant-architecture.md'), /No database was queried and no SQL was run/)
  const audit = read('docs/admin-route-security-audit.md')
  for (const route of ['/api/sitemap', '/api/backup', '/api/analytics', '/api/google-analytics', '/api/export', '/admin/bulk-delete', '/admin/email-settings']) assert.ok(audit.includes(route), `audit covers ${route}`)
  assert.match(audit, /updated after remediation/); assert.match(audit, /Fixed in this work/); assert.match(audit, /Still open/)
  // The audit's headline claims are true of the code it describes.
  assert.ok(!fs.existsSync(path.join(root, 'src/app/api/sitemap')), 'S1 fixed: the unauthenticated sitemap write route is gone')
  assert.match(read('src/app/api/backup/route.ts'), /requireActiveAdmin()/, 'S2 fixed: /api/backup is behind the shared admin gate')
  assert.ok(fs.existsSync(path.join(root, 'src/app/api/bulk-delete/route.ts')) === false, 'C: /api/bulk-delete does not exist')
  assert.ok(fs.existsSync(path.join(root, 'src/app/api/send-email/route.ts')) === false, 'C: /api/send-email does not exist')

  console.log('PASS: Phase 6 - release evaluator mirrors the portal gate (all branches, unknown stays unknown), status builder reads only and degrades per source, profile pages never label "released", archive caveat stated, merchant lists use stored ids only, audit claims match the code.')
})().catch((err) => { console.error(err); process.exit(1) })
