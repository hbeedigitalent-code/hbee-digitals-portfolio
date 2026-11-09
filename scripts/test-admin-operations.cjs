// Offline checks for the A1 closure and Phase A2 (Growth Review, Inquiries, Merchant relationships).
// No database, no network.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { execSync } = require('node:child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const exists = (f) => fs.existsSync(path.join(root, f))
// The logic modules run in a separate VM realm, so compare by value through JSON.
const deq = (a, b, m) => assert.deepStrictEqual(JSON.parse(JSON.stringify(a)), JSON.parse(JSON.stringify(b)), m)
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

function loadTs(file) {
  const mod = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require, console, Intl, Date, TextEncoder }, { filename: file })
  return mod.exports
}

/* ── Currency: never assumed, never mixed ─────────────────────────────────── */
const money = loadTs('src/lib/admin/money.ts')
const mixed = money.summariseMoney([
  { amount: 100, currency: 'NGN' }, { amount: '250.5', currency: 'ngn ' }, { amount: 40, currency: 'USD' },
  { amount: 70, currency: null }, { amount: 9, currency: 'ZZZ1' }, { amount: null, currency: 'USD' }, { amount: 'abc', currency: 'USD' },
])
deq(JSON.parse(JSON.stringify(mixed.totals)), [{ currency: 'NGN', total: 350.5, count: 2 }, { currency: 'USD', total: 40, count: 1 }], 'one total per currency, never combined')
assert.equal(mixed.unknownCurrencyCount, 2, 'a missing or invalid currency is counted but never summed or invented')
assert.equal(mixed.noAmountCount, 2)
const line = money.describeMoney(mixed)
assert.match(line, /NGN/); assert.match(line, /\$40\.00/, 'USD appears only because that invoice stored USD'); assert.match(line, /2 with no currency recorded/)
assert.doesNotMatch(line, /70|9\.00/, 'amounts with no valid currency never appear as money')
assert.equal(money.describeMoney(money.summariseMoney([{ amount: 70, currency: null }, { amount: 9 }])), '2 with no currency recorded', 'with no trustworthy currency there is no monetary figure at all')
assert.equal(money.describeMoney(money.summariseMoney([])), null, 'no rows → no money statement (the caller falls back to a count)')
assert.equal(money.describeMoney(money.summariseMoney([{ amount: 5 }])), '1 with no currency recorded', 'an amount with no currency is not given one')
assert.equal(money.normaliseCurrency('xx'), null); assert.equal(money.normaliseCurrency('eur'), 'EUR')
for (const f of ['src/app/admin/dashboard/page.tsx', 'src/app/admin/workspace/page.tsx']) {
  const src = stripComments(read(f))
  assert.doesNotMatch(src, /\$\$\{|\$\{[^}]*\}\.toLocaleString|`\$\$/, `${f} no hard-coded dollar formatting`)
  assert.doesNotMatch(src, /Revenue Pipeline/, `${f} no mislabelled revenue total`)
  assert.match(src, /summariseMoney/, `${f} uses the currency-safe summary`)
}
assert.match(read('src/app/admin/dashboard/page.tsx'), /select\('status, amount, currency'\)/, 'currency is read with the amount')

/* ── Dark mode: kept, but not offered ─────────────────────────────────────── */
const shell = read('src/components/admin/shell/AdminShell.tsx')
assert.match(shell, /export const ADMIN_THEME_TOGGLE_ENABLED = false/, 'the theme toggle is switched off')
assert.match(shell, /\{ADMIN_THEME_TOGGLE_ENABLED && \(/, 'the toggle renders only when enabled')
assert.match(read('src/app/admin/layout.tsx'), /if \(!ADMIN_THEME_TOGGLE_ENABLED\) return/, 'a stored dark preference is ignored while disabled')
assert.match(read('src/styles/admin-tokens.css'), /data-admin-theme='dark'/, 'the dark tokens are kept')

/* ── Password recovery: recovery only, boundaries intact ──────────────────── */
assert.ok(exists('src/app/admin/reset-password/page.tsx'), 'the page the login links to now exists')
const reset = read('src/app/admin/reset-password/page.tsx')
const resetCode = stripComments(reset)
assert.doesNotMatch(resetCode, /signUp\(|sign[\s-]?up|create (an )?(admin )?account|register|signInWithPassword|inviteUserByEmail/i, 'recovery never registers, provisions or signs in')
assert.match(resetCode, /supabase\.auth\.updateUser\(\{ password \}\)/, 'uses the existing auth mechanism (same as the Client Portal reset)')
assert.match(resetCode, /updateUser[\s\S]*supabase\.auth\.signOut\(\)/, 'the recovery session is ended after the password changes')
assert.match(resetCode, /AdminAuthShell/, 'uses the Admin auth visual shell')
for (const text of ['Choose a new password', 'This reset link is not valid', 'Password updated', 'Checking your reset link', 'do not match', 'role="alert"']) assert.ok(resetCode.includes(text) || reset.includes(text), `state present: ${text}`)
assert.match(resetCode, /hasError/); assert.match(resetCode, /PASSWORD_RECOVERY/); assert.match(resetCode, /setTimeout/, 'an unconfirmed link times out to the invalid state')
assert.match(resetCode, /\/admin\/login\?reset=1/); assert.match(read('src/app/admin/login/page.tsx'), /get\('reset'\) === '1'/)
// Password policy: one source, 12 characters, on every ADMIN password form (the Client Portal's are not governed by it).
const policy = loadTs('src/lib/admin/password-policy.ts')
assert.equal(policy.ADMIN_PASSWORD_MIN_LENGTH, 12)
assert.match(policy.adminPasswordError('short-pass'), /at least 12/); assert.equal(policy.adminPasswordError('a'.repeat(11)) !== null, true); assert.equal(policy.adminPasswordError('a'.repeat(12)), null)
assert.match(policy.adminPasswordError('x'.repeat(73)), /no more than 72/); assert.match(policy.adminPasswordError('é'.repeat(37)), /no more than 72/, 'the limit is in bytes')
assert.equal(policy.adminPasswordError('correct horse battery staple'), null, 'a passphrase is accepted: length, not composition')
assert.match(resetCode, /adminPasswordError\(password\)/); assert.doesNotMatch(resetCode, /MIN_PASSWORD_LENGTH = 6/)
const profileCode = stripComments(read('src/app/admin/profile/page.tsx'))
assert.match(profileCode, /adminPasswordError\(newPassword\)/); assert.doesNotMatch(profileCode, /newPassword\.length < 6|minLength=\{6\}/, 'the admin profile form no longer accepts 6')
for (const f of ['src/app/(client-auth)/client-reset-password/page.tsx', 'src/app/(client-auth)/client-signup/page.tsx']) assert.equal(execSync('git status --porcelain -- "' + f + '"', { cwd: root }).toString().trim(), '', f + ' (Client Portal) untouched by the admin policy')
// Recovery hardening: only Supabase's own PASSWORD_RECOVERY event accepts a link; a plain existing session never does.
assert.doesNotMatch(resetCode, /getSession\(/, 'an already-signed-in admin with an expired or used link must not get a password form')
assert.match(resetCode, /event === 'PASSWORD_RECOVERY'/); assert.doesNotMatch(resetCode, /event === 'SIGNED_IN'/)
assert.match(resetCode, /supabase\.auth\.onAuthStateChange[\s\S]*recoveryListeners/, 'the event is captured at module load, so it cannot be missed')
assert.match(resetCode, /fetch\('\/api\/admin\/logout', \{ method: 'POST' \}\)/, 'a 2FA cookie left by an earlier session is cleared')
assert.equal((resetCode.match(/clearTwoFactorCookie\(\)/g) || []).length >= 3, true, 'cleared when the link is accepted and again after the password changes')
assert.match(resetCode, /await clearTwoFactorCookie\(\)\s*await supabase\.auth\.signOut\(\)/, 'cookie cleared, then the recovery session is ended (global scope by default)')

const mw = read('src/middleware.ts')
assert.match(mw, /if \(pathname === '\/admin\/reset-password'\) return NextResponse\.next\(\)/, 'only the exact recovery path is exempt')
assert.equal((mw.match(/return NextResponse\.next\(\)/g) || []).length, 3, 'exactly three early passes: out-of-scope paths, login, reset-password')
assert.doesNotMatch(mw, /startsWith\('\/admin\/reset|startsWith\('\/admin\/login/, 'no prefix bypass')
assert.match(read('src/app/admin/layout.tsx'), /pathname === '\/admin\/login' \|\| pathname === '\/admin\/reset-password'/)
assert.match(mw, /ADMIN_2FA_COOKIE_NAME[\s\S]*verifyAdmin2FACookie/, '2FA enforcement is untouched')

/* ── Growth Review queue logic ────────────────────────────────────────────── */
const q = loadTs('src/lib/admin/growth-review-queue.ts')
const R = (id, status, created, extra = {}) => ({ id, status, created_at: created, merchant_id: extra.mid ?? 'm-' + id, assessment_id: 'a-' + id, merchant: 'merchant' in extra ? extra.merchant : { business_name: 'Biz ' + id, contact_name: 'Ada ' + id, email: id + '@x.test', industry: 'Beauty', country: 'NG' }, assessment: extra.assessment ?? { review_status: 'pending', hgri_score: 55 }, ...extra.row })
const rows = [R('1', 'pending', '2026-10-01'), R('2', 'in_progress', '2026-10-03'), R('3', 'completed', '2026-10-02', { assessment: { review_status: 'approved' }, row: { hgri_score: 71, growth_classification: 'Growth Ready' } }), R('4', 'completed', '2026-09-01', { merchant: [{ business_name: 'Array Embed', email: 'arr@x.test' }], assessment: [{ review_status: 'rejected' }] }), R('5', 'pending', '2026-10-05', { merchant: null })]
assert.equal(q.needsReview('pending'), true); assert.equal(q.needsReview('in_progress'), true); assert.equal(q.needsReview('completed'), false); assert.equal(q.needsReview('anything-else'), false)
deq(JSON.parse(JSON.stringify(q.queueCounts(rows))), { all: 5, 'needs-review': 3, pending: 2, in_progress: 1, completed: 2 })
deq(q.filterReviews(rows, { filter: 'needs-review', query: '' }).map((r) => r.id), ['1', '2', '5'])
deq(q.filterReviews(rows, { filter: 'completed', query: '' }).map((r) => r.id), ['3', '4'])
deq(q.filterReviews(rows, { filter: 'all', query: 'array embed' }).map((r) => r.id), ['4'], 'search reaches an array-shaped embed')
deq(q.filterReviews(rows, { filter: 'all', query: '2@x.test' }).map((r) => r.id), ['2'])
deq(q.filterReviews(rows, { filter: 'all', query: '', merchantId: 'm-3' }).map((r) => r.id), ['3'], 'a merchant filter uses the stored merchant id')
deq(q.sortReviews(rows, 'newest').map((r) => r.id), ['5', '2', '3', '1', '4']); deq(q.sortReviews(rows, 'oldest').map((r) => r.id), ['4', '1', '3', '2', '5'])
assert.equal(q.businessName(rows[4]), 'Unnamed business', 'a missing name is stated, never invented')
assert.equal(q.reviewScore(rows[0]), 55, 'falls back to the assessment score'); assert.equal(q.reviewScore(rows[2]), 71, 'the review score wins'); assert.equal(q.reviewScore(rows[3]), null)
assert.equal(q.storedDecisionMark(rows[2]), 'approved'); assert.equal(q.storedDecisionMark(rows[3]), 'rejected'); assert.equal(q.storedDecisionMark(rows[0]), null, 'only approved / rejected are named')
assert.equal(q.reviewStatusLabel('in_progress'), 'In progress'); assert.equal(q.reviewStatusLabel('weird_value'), 'weird value')
assert.ok(q.UUID_RE.test('3f2b8c1e-1111-4222-8333-444455556666')); assert.ok(!q.UUID_RE.test('not-a-uuid'))

const queue = read('src/components/admin/growth/GrowthReviewQueue.tsx')
assert.match(queue, /fetch\('\/api\/admin\/growth-reviews\?status=all'/, 'same admin-gated route')
assert.match(queue, /Marked approved/); assert.doesNotMatch(queue, /Approved by|was approved by/i, 'never claims provenance the list cannot know')
assert.match(queue, /AdminErrorState/, 'a failed read is an error, not an empty queue')
assert.ok(read('src/app/admin/growth-reviews/page.tsx').includes('<GrowthReviewQueue />'))
const aliasPage = stripComments(read('src/app/admin/growth-assessments/page.tsx'))
assert.ok(aliasPage.includes("redirect(qs ? `/admin/growth-reviews?${qs}` : '/admin/growth-reviews')"), 'the old list URL forwards, keeping its query string (e.g. ?merchant=<id>)')
assert.ok(aliasPage.includes('query.append(key, v)'), 'repeated parameters are kept too')
assert.ok(!/fetch\(|supabase|method:/.test(aliasPage), 'the alias page does nothing but forward')
const resolver = read('src/app/admin/growth-assessments/[id]/page.tsx')
assert.match(resolver, /r\.assessment_id === params\.id/); assert.match(resolver, /router\.replace\(`\/admin\/growth-reviews\/\$\{match\.id\}`\)/); assert.doesNotMatch(resolver, /method: 'POST'|method: 'PATCH'|method: 'DELETE'/, 'the resolver writes nothing')
assert.match(read('src/app/admin/dashboard/page.tsx'), /href: `\/admin\/growth-reviews\/\$\{r\.id\}`/, 'dashboard links to the review id, not the assessment id')
assert.doesNotMatch(read('src/app/admin/dashboard/page.tsx'), /growth-assessments\/\$\{/, 'no assessment-id link that the review editor cannot load')

/* ── Review detail: every gate preserved, cross-links real ────────────────── */
const detail = read('src/app/admin/growth-reviews/[id]/page.tsx')
const detailCode = stripComments(detail)
assert.match(detailCode, /fetch\(`\/api\/admin\/growth-reviews\/\$\{params\.id\}`/); assert.match(detailCode, /method: 'PATCH'/)
assert.match(detailCode, /fetch\(`\/api\/growth-reviews\/\$\{params\.id\}\/complete`/, 'completion still goes through the single server route')
assert.match(detailCode, /if \(!confirm\('Complete this review\?[\s\S]*does NOT approve/, 'completion still asks for confirmation and says it is not an approval')
assert.match(detailCode, /profile_already_released[\s\S]*confirm\(/, 'replacing released content still needs a second confirmation')
assert.doesNotMatch(detailCode, /\balert\(/, 'browser alerts replaced by in-page notices')
assert.match(detailCode, /isCompleted && assessment\?\.id/, 'the decision panel only appears once the review is completed')
assert.match(detailCode, /\/admin\/merchants\/\$\{merchant\.id\}/, 'merchant link follows the stored id')
assert.doesNotMatch(detailCode, /status: 'completed'|completed_at:/, 'the page cannot set completion fields itself')
for (const label of ['Who is this business?', 'What did Hbee find?', 'What has happened?', 'Next: record the programme decision', 'AssessmentAnswers']) assert.ok(detail.includes(label), `detail answers: ${label}`)

const panel = read('src/components/admin/ProgramDecisionPanel.tsx')
const panelCode = stripComments(panel)
deq([...panelCode.matchAll(/value: '(approved|declined|withdrawn)'/g)].map((m) => m[1]), ['approved', 'declined', 'withdrawn'], 'exactly the three decisions the schema allows')
assert.equal((panelCode.match(/\/api\/admin\/growth-assessments\/\$\{assessmentId\}\/decision/g) || []).length, 2, 'load + record: the one gated endpoint')
assert.match(panelCode, /if \(!acknowledge && !confirm\(confirmText\)\) return/, 'every decision is confirmed')
assert.match(panelCode, /acknowledgeUnverifiedHistory: true/); assert.match(panelCode, /requiresAcknowledgement/)
assert.match(panelCode, /\/api\/admin\/clients\/link-merchant/); assert.match(panelCode, /confirm\(`Link /, 'linking is deliberate and confirmed')
assert.match(panelCode, /\/api\/admin\/growth-assessments\/\$\{assessmentId\}\/invite/)
assert.match(panelCode, /\/admin\/client-portal\/\$\{linkedClient\.id\}/, 'portal account link uses the client id')
assert.match(panelCode, /\/admin\/growth-profiles\/\$\{linkage\.profile\.id\}/); assert.match(panelCode, /\/admin\/merchants\/\$\{linkage\.merchant_id\}/)
assert.doesNotMatch(panelCode, /\.from\(|supabase/, 'the panel never writes the decision itself')

/* ── Inquiries: same access, honest states, no invented links ─────────────── */
const inq = loadTs('src/lib/admin/inquiries.ts')
const I = (id, read, extra = {}) => ({ id, full_name: 'Name ' + id, email: id + '@x.test', message: 'Hello ' + id, is_read: read, created_at: '2026-10-0' + id, ...extra })
const inquiries = [I('1', false, { company: 'Glow Co', service: 'Starting a project' }), I('2', true), I('3', false, { message: 'Need help\n—\nEstimated budget: $1,000' })]
deq(JSON.parse(JSON.stringify(inq.inquiryCounts(inquiries))), { all: 3, unread: 2, read: 1 })
deq(inq.filterInquiries(inquiries, { filter: 'unread', query: '' }).map((i) => i.id), ['1', '3']); deq(inq.filterInquiries(inquiries, { filter: 'read', query: '' }).map((i) => i.id), ['2'])
deq(inq.filterInquiries(inquiries, { filter: 'all', query: 'glow' }).map((i) => i.id), ['1']); deq(inq.filterInquiries(inquiries, { filter: 'all', query: 'starting a project' }).map((i) => i.id), ['1'])
assert.equal(inq.inquiryPreview(inquiries[2].message), 'Need help', 'the appended enquiry details are not part of the list preview')
const inqPage = stripComments(read('src/app/admin/inquiries/page.tsx'))
assert.match(inqPage, /supabase\.from\('contact_submissions'\)\.select\('\*'\)/); assert.match(inqPage, /update\(\{ is_read: true \}\)/); assert.match(inqPage, /\.delete\(\)\.eq\('id', message\.id\)/)
assert.match(inqPage, /if \(!confirm\(`Delete the inquiry/, 'deleting is confirmed'); assert.match(inqPage, /AdminErrorState/, 'a failed read is not an empty inbox')
assert.doesNotMatch(inqPage, /merchant|client_id|\/admin\/client-portal|\/admin\/crm/i, 'no relationship is invented: contact_submissions stores no identifier')
assert.doesNotMatch(inqPage, /is_read: false/, 'no invented "mark unread" action')

/* ── Merchant relationships: real identifiers only ────────────────────────── */
const merchantPage = stripComments(read('src/app/admin/merchants/[id]/page.tsx'))
assert.match(merchantPage, /\/admin\/client-portal\/\$\{client\.id\}/, 'client link uses the client id')
assert.doesNotMatch(merchantPage, /client-portal\/\$\{merchant\.id\}/, 'the merchant id is no longer passed off as a client id')
assert.doesNotMatch(merchantPage, /growth-assessments\/new/, 'no link to a route that does not exist')
assert.match(merchantPage, /r\.assessment_id === assessment\.id/, 'review found by the stored assessment id'); assert.match(merchantPage, /growth-reviews\?merchant=\$\{merchant\.id\}/)
assert.match(merchantPage, /clients === null[\s\S]*Could not be determined/, '"unknown" is shown differently from "none linked"')
const merchantApi = read('src/app/api/admin/merchants/[merchant_id]/route.ts')
assert.match(merchantApi, /requireActiveAdmin\(\)/); assert.match(merchantApi, /\.from\('clients'\)[\s\S]*\.eq\('merchant_id', merchantId\)/); assert.match(merchantApi, /\.from\('growth_reviews'\)[\s\S]*\.eq\('merchant_id', merchantId\)/)
assert.match(merchantApi, /clients: clientsError \? null/, 'a failed relationship read is reported as unknown, not as none')
assert.match(read('src/app/admin/client-portal/[client_id]/page.tsx'), /client\.merchant_id &&[\s\S]*\/admin\/merchants\/\$\{client\.merchant_id\}/, 'client → merchant follows clients.merchant_id')
// The list APIs and decision route are unchanged by A2.
for (const f of ['src/app/api/admin/growth-reviews/route.ts', 'src/app/api/admin/growth-assessments/[id]/decision/route.ts', 'src/app/api/admin/growth-reviews/[id]/route.ts', 'src/app/api/growth-reviews/[id]/complete/route.ts', 'src/app/api/admin/clients/link-merchant/route.ts', 'src/app/api/contact/route.ts']) {
  assert.equal(execSync(`git status --porcelain -- "${f}"`, { cwd: root }).toString().trim(), '', `${f} untouched`)
}

/* ── Client Portal and security boundaries untouched ──────────────────────── */
for (const p of ['src/app/client-portal', 'src/components/client-portal', 'src/styles/portal-tokens.css', 'src/app/(client-auth)', 'src/app/api/client-portal']) {
  assert.equal(execSync(`git status --porcelain -- "${p}"`, { cwd: root }).toString().trim(), '', `${p} untouched`)
}
assert.equal(execSync('git status --porcelain -- src/lib/admin-2fa-cookie.ts', { cwd: root }).toString().trim(), '', 'the 2FA cookie signer/verifier is untouched (the 2FA ROUTES were hardened separately; see test-admin-2fa.cjs)')

/* ── Unlisted-route inventory exists and covers all 13 ────────────────────── */
const inventory = read('docs/admin-unlisted-routes.md')
const nav = loadTs('src/components/admin/shell/admin-nav.ts')
for (const r of nav.UNLISTED_ROUTES) assert.ok(inventory.includes('`' + r.prefix + '`'), `inventory covers ${r.prefix}`)
assert.equal(nav.UNLISTED_ROUTES.length, 13)
assert.match(inventory, /Audit only/)

console.log('PASS: A1 closure + A2 - currency never assumed or mixed; dark mode kept but not offered; recovery-only password reset with exact-path exemption; review queue/inquiry logic; decision gates, confirmations and real-ID cross-links preserved; Client Portal and API gates untouched.')
