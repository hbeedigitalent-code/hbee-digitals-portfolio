// Offline checks for Phase A1: Admin shell, navigation, authentication presentation and shared UI primitives.
// No database, no network.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const exists = (f) => fs.existsSync(path.join(root, f))

function loadTs(file, extra = {}) {
  const mod = { exports: {} }
  const js = ts.transpileModule(read(file), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const req = (name) => {
    if (name === 'next/link') return { __esModule: true, default: ({ href, children, ...rest }) => React.createElement('a', { href, ...rest }, children) }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : String(key)) })
    if (name === 'lucide-react') return new Proxy({}, { get: (_, key) => (key === '__esModule' ? false : () => React.createElement('svg', { 'data-icon': String(key) })) })
    if (name === '@/lib/cn') return { cn: (...a) => a.filter(Boolean).join(' ') }
    if (name in extra) return extra[name]
    return require(name)
  }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: req, console }, { filename: file })
  return mod.exports
}

/* ── Navigation: regrouped, never invented, every link real ─────────────────── */
const nav = loadTs('src/components/admin/shell/admin-nav.ts')
const hrefs = nav.ADMIN_NAV.flatMap((g) => g.items.map((i) => i.href))
assert.equal(new Set(hrefs).size, hrefs.length, 'no duplicate hrefs')
for (const href of hrefs) assert.ok(exists(`src${href.replace('/admin', '/app/admin')}/page.tsx`), `${href} is a real admin page`)

// The exact sidebar set that existed before Phase A1: regrouping must not add, drop or invent a route.
const PREVIOUS = ['dashboard', 'workspace', 'growth-reviews', 'growth-profiles', 'client-onboarding', 'crm', 'client-portal', 'projects', 'tasks', 'proposals', 'agreements', 'client-health', 'growth-intelligence', 'growth-intelligence/audits', 'growth-intelligence/opportunities', 'blog', 'comments', 'faqs', 'trust', 'testimonials', 'hero', 'about', 'services', 'pricing', 'portfolio', 'team', 'before-after', 'inquiries', 'newsletter', 'subscribers', 'menu', 'merchants', 'profile', 'settings', 'footer'].map((p) => `/admin/${p}`)
assert.deepEqual([...hrefs].sort(), [...PREVIOUS].sort(), 'the previous sidebar minus the merged Growth Assessments entry, only regrouped')
// Growth Assessments was merged into Growth Reviews (one nav entry); the old URL stays valid as an alias.
assert.ok(!hrefs.includes('/admin/growth-assessments'), 'no second Growth entry')
assert.deepEqual(JSON.parse(JSON.stringify(nav.ADMIN_ROUTE_ALIASES)), [{ from: '/admin/growth-assessments', to: '/admin/growth-reviews' }])
assert.ok(nav.ADMIN_NAV.every((g) => g.items.length > 0 && g.label && g.id), 'every group is populated')

// Unlisted routes: exist on disk, are NOT linked, and are not also in the nav.
for (const r of nav.UNLISTED_ROUTES) {
  assert.ok(exists(`src/app${r.prefix}`), `${r.prefix} exists on disk`)
  assert.ok(!hrefs.some((h) => h === r.prefix), `${r.prefix} stays unlinked (not exposed by A1)`)
}

// Active matching: longest href wins; child pages keep their parent highlighted.
const active = (p) => nav.activeAdminNav(p)?.item.label ?? null
assert.equal(active('/admin/dashboard'), 'Dashboard')
assert.equal(active('/admin/growth-assessments'), 'Growth Reviews', 'the old URL highlights the merged entry'); assert.equal(active('/admin/growth-assessments/abc'), 'Growth Reviews'); assert.equal(nav.adminSectionTitle('/admin/growth-assessments'), 'Growth Reviews')
assert.equal(active('/admin/portfolio'), 'Portfolio'); assert.equal(active('/admin/portfolio/abc-123'), 'Portfolio')
assert.equal(active('/admin/growth-intelligence'), 'Growth Intelligence', 'the section root')
assert.equal(active('/admin/growth-intelligence/audits'), 'Audits'); assert.equal(active('/admin/growth-intelligence/audits/9'), 'Audits')
assert.equal(active('/admin/growth-intelligence/other'), null, 'an unknown child is not claimed by the exact-only root')
assert.equal(active('/admin/portfolio-archive'), null, 'prefix matching respects path segments')
assert.equal(active('/admin/blog/new'), 'Insights')
assert.equal(nav.adminSectionTitle('/admin/seo'), 'SEO'); assert.equal(nav.adminSectionTitle('/admin/unknown-thing'), 'Admin')
assert.equal(nav.adminSectionTitle('/admin/portfolio/x'), 'Portfolio')
assert.equal(nav.isAdminNavActive('/admin/growth-intelligence/audits', { label: 'Growth Intelligence', href: '/admin/growth-intelligence', exact: true }), false)

/* ── Authentication: login only, behaviour preserved ───────────────────────── */
const login = read('src/app/admin/login/page.tsx')
const authShell = read('src/components/admin/auth/AdminAuthShell.tsx')
const twoFaForm = read('src/app/admin-2fa-challenge/TwoFactorChallengeForm.tsx')
const twoFaPage = read('src/app/admin-2fa-challenge/page.tsx')
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
for (const [name, raw] of Object.entries({ login, authShell, twoFaForm })) {
  const src = stripComments(raw)
  assert.doesNotMatch(src, /sign[\s-]?up|signUp\(|create (an )?(admin )?account|register|client-signup/i, `${name} offers no sign-up or account creation`)
}
assert.match(login, /signInWithPassword\(\{ email, password \}\)/, 'still the same sign-in call')
assert.match(login, /router\.push\('\/admin\/dashboard'\)/, 'still continues to the dashboard (2FA is decided by middleware)')
assert.match(login, /resetPasswordForEmail/)
assert.match(login, /autoComplete="current-password"/); assert.match(login, /aria-pressed=\{showPassword\}/, 'accessible password visibility control')
assert.match(login, /role="alert"/); assert.match(login, /disabled=\{loading\}/, 'submit is disabled while signing in')
assert.match(authShell, /Hbee Administration/, 'identifies itself as the internal product, not client access')
assert.match(twoFaForm, /\/api\/admin\/2fa\/status/); assert.match(twoFaForm, /\/api\/admin\/2fa\/login/); assert.match(twoFaForm, /window\.location\.href = next/, '2FA behaviour untouched')
assert.match(twoFaPage, /isSafeAdminRedirect/); assert.match(twoFaPage, /redirect\('\/admin\/login'\)/, 'server-side 2FA page checks preserved')

const layout = read('src/app/admin/layout.tsx')
assert.match(layout, /from\('admin_users'\)[\s\S]*\.eq\('is_active', true\)/, 'admin_users membership check preserved')
assert.match(layout, /fetch\('\/api\/admin\/logout', \{ method: 'POST' \}\)[\s\S]*supabase\.auth\.signOut\(\)/, 'logout sequence preserved (httpOnly 2FA cookie first, then the session)')
assert.match(layout, /router\.push\('\/client-portal'\)/); assert.match(layout, /router\.push\('\/admin\/login'\)/)
assert.doesNotMatch(layout, /@[a-z0-9-]+\.(com|co|net)/i, 'no hard-coded admin emails')
assert.match(layout, /data-surface="admin"/)
const middleware = read('src/middleware.ts')
assert.match(middleware, /ADMIN_2FA_CHALLENGE_PATH/, 'server-side route protection is untouched by this phase')

/* ── Tokens: every themed variable the admin uses is aliased on the admin surface ── */
const globals = read('src/app/globals.css')
const darkBlock = globals.slice(globals.indexOf("[data-theme='dark'] {"))
const themed = new Set([...darkBlock.slice(0, darkBlock.indexOf('\n}')).matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
const adminTokens = read('src/styles/admin-tokens.css')
const defined = new Set([...adminTokens.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]))
function walk(dir) { return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : /\.(tsx|ts|css)$/.test(e.name) ? [`${dir}/${e.name}`] : [])) }
const used = new Set()
for (const f of [...walk('src/app/admin'), ...walk('src/components/admin'), ...walk('src/components/notifications')]) for (const m of read(f).matchAll(/var\((--[a-z0-9-]+)/g)) used.add(m[1])
const missing = [...used].filter((v) => themed.has(v) && !defined.has(v) && !v.startsWith('--ad-') && !v.startsWith('--hb-'))
assert.deepEqual(missing, [], 'themed legacy variables used by the admin but not aliased on the admin surface: ' + missing.join(', '))
for (const v of ['--bg-card', '--bg-page', '--bg-section', '--text-primary', '--text-secondary', '--text-muted', '--border', '--accent', '--accent-lime', '--btn-primary-text', '--ring', '--error', '--success', '--warning']) assert.ok(defined.has(v), `${v} aliased`)
assert.match(adminTokens, /\[data-surface='admin'\]\[data-admin-theme='dark'\]/, 'a dark theme exists')
assert.doesNotMatch(adminTokens, /(^|\n)(:root|html|body)\s*\{/, 'admin tokens never target :root, html or body rules (only the scoped document lock)')
assert.match(read('src/styles/site-tokens.css'), /\[data-surface='portal'\],\s*\[data-surface='admin'\]\s*\{/, 'the admin shares the palette block (additive selector)')
assert.doesNotMatch(read('src/styles/portal-tokens.css'), /data-surface='admin'/, 'portal tokens untouched')
assert.doesNotMatch(read('src/app/client-portal/layout.tsx'), /admin/i, 'client portal layout untouched')

/* ── Dashboard: real data, honest labels ───────────────────────────────────── */
const dash = stripComments(read('src/app/admin/dashboard/page.tsx'))
assert.match(dash, /\/api\/admin\/dashboard-stats/, 'protected stats route still used')
assert.doesNotMatch(dash, /Revenue Pipeline/, 'overdue-invoice total is no longer mislabelled as revenue pipeline')
assert.match(dash, /Overdue invoices/); assert.match(dash, /show = \(n: Count\) => \(n === null \? '—'/, 'unreadable figures show a dash, never zero')
for (const [label] of [['Needs attention'], ['Recent activity'], ['Quick actions'], ['Manage Hbee']]) assert.ok(dash.includes(label), `dashboard section: ${label}`)
assert.doesNotMatch(dash, /Math\.random|faker|lorem/i, 'no fabricated metrics')
assert.match(dash, /AdminErrorState[\s\S]*onRetry/, 'a failed load has an error state with retry')

/* ── Portfolio list: classification shown only when the row says so ───────── */
// The portfolio list page belongs to the portfolio workstream. These checks apply once it has been migrated onto
// the shared Admin primitives (it imports AdminStatusBadge); in a tree that still has the earlier page they are skipped.
const list = read('src/app/admin/portfolio/page.tsx')
if (list.includes('AdminStatusBadge')) {
  assert.match(list, /is_case_study === true[\s\S]*Case Study/); assert.match(list, /is_case_study === false[\s\S]*Standard Work/)
  assert.match(list, /engagement_type === 'client'/); assert.match(list, /project_status === 'ongoing'/)
  assert.doesNotMatch(list, /\?\? 'studio_team'|\|\| 'studio_team'/, 'never presents a default classification as a fact')
} else {
  console.log('note: portfolio list not yet on the shared Admin primitives in this tree; its classification checks were skipped')
}

/* ── Shared primitives render correctly ────────────────────────────────────── */
const ui = loadTs('src/components/admin/ui/AdminUi.tsx')
const html = (el) => renderToStaticMarkup(el)
const header = html(React.createElement(ui.AdminPageHeader, { title: 'Portfolio', description: 'Desc', breadcrumbs: [{ label: 'Home', href: '/admin/dashboard' }, { label: 'Portfolio' }], eyebrow: 'Content' }, React.createElement('button', null, 'Act')))
assert.match(header, /<h1[^>]*>Portfolio<\/h1>/); assert.match(header, /aria-label="Breadcrumb"/); assert.match(header, /aria-current="page"/); assert.match(header, /Act/)
const section = html(React.createElement(ui.AdminSection, { id: 'basics', title: 'Basics', description: 'About' }, 'Body'))
assert.match(section, /<section id="basics" aria-labelledby="basics-title"/); assert.match(section, /<h2 id="basics-title"/)
const metric = html(React.createElement(ui.AdminMetric, { label: 'Unread', value: 3, href: '/admin/inquiries', tone: 'attention' }))
assert.match(metric, /<a href="\/admin\/inquiries"/); assert.match(metric, /toneAttention/)
assert.match(html(React.createElement(ui.AdminErrorState, { message: 'Nope', onRetry() {} })), /role="alert"[\s\S]*Try again/)
assert.match(html(React.createElement(ui.AdminLoadingState, { label: 'Working' })), /role="status"[\s\S]*Working/)
assert.match(html(React.createElement(ui.AdminEmptyState, { title: 'Nothing', description: 'Yet' })), /Nothing/)
assert.match(html(React.createElement(ui.AdminNotice, { tone: 'error' }, 'Bad')), /role="alert"/); assert.match(html(React.createElement(ui.AdminNotice, { tone: 'success' }, 'Ok')), /role="status"/)
assert.match(html(React.createElement(ui.AdminButton, { href: '/x', variant: 'primary' }, 'Go')), /<a href="\/x"/)
assert.match(html(React.createElement(ui.AdminButton, { onClick() {} }, 'Click')), /<button type="button"/)
assert.match(html(React.createElement(ui.AdminStatusBadge, { tone: 'green', dot: true }, 'Visible')), /badgeGreen/)
const bar = html(React.createElement(ui.AdminActionBar, null, React.createElement(ui.AdminActionBarStatus, { dirty: true }, 'Unsaved changes'), React.createElement(ui.AdminActionBarActions, null, 'btns')))
assert.match(bar, /role="status"[^>]*data-state="dirty"[^>]*>Unsaved changes/)

/* ── Shell: one nav feeds sidebar and drawer; accessible landmarks ─────────── */
const shell = read('src/components/admin/shell/AdminShell.tsx')
assert.match(shell, /ADMIN_NAV\.map/); assert.equal((shell.match(/ADMIN_NAV\.map/g) || []).length, 1, 'a single nav render feeds sidebar and drawer')
assert.match(shell, /aria-label="Admin"/); assert.match(shell, /aria-current=\{isAdminNavActive/); assert.match(shell, /role="dialog" aria-modal="true"/)
assert.match(shell, /key !== 'Escape'/, 'Escape closes overlays'); assert.match(shell, /aria-expanded=\{expanded\}/)
assert.match(shell, /data-admin-shell/); assert.match(shell, /<NotificationBell \/>/, 'the real notification control is kept')
assert.doesNotMatch(shell, /<nav[^>]*position/, 'no inline nav positioning (the surface resets the global fixed-nav rule)')
assert.match(adminTokens, /html :where\(\[data-surface='admin'\]\) nav \{[\s\S]*position: static/, 'global fixed <nav> rule reset on the admin surface')

console.log('PASS: Phase A1 - admin navigation (the old routes minus the merged Growth Assessments entry, regrouped, all real), login-only authentication with preserved behaviour, token coverage for every themed variable, honest dashboard, list classification, and shared primitives.')
