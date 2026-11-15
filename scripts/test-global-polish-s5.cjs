/**
 * S5.2 — global consistency, premium motion and release polish.
 * Source-level assertions (no browser): motion semantics, reduced-motion fallbacks, content-stays-in-DOM,
 * homepage diagnostic model, Work, navigation, CTAs, public email and structured data.
 * Visual smoothness is reviewed in the browser, not here.
 */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8').replace(/\r\n/g, '\n')
const walk = (dir, out = []) => {
  for (const e of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) walk(rel, out)
    else if (/\.(tsx?|css)$/.test(e.name)) out.push(rel)
  }
  return out
}
const siteSource = walk('src/components/site').filter((f) => /\.tsx?$/.test(f))

/* ── Motion system ─────────────────────────────────────────────── */
const tokens = read('src/styles/site-tokens.css')
const s52Start = tokens.indexOf('/* ── S5.2 pacing')
assert.ok(s52Start > -1, 'S5.2 pacing block present')
const s52 = tokens.slice(s52Start)
const reducedStart = tokens.indexOf("@media (prefers-reduced-motion: reduce) {\n  [data-surface='site'] [data-motion],")
assert.ok(reducedStart > -1 && reducedStart < s52Start, 'the reduced-motion reset precedes (and with !important overrides) the S5.2 pacing rules')
assert.match(tokens.slice(reducedStart, s52Start), /transition: none !important;[\s\S]*opacity: 1 !important;[\s\S]*transform: none !important/, 'reduced motion: content visible, no travel')

for (const seq of ['editorial', 'cards', 'system', 'process']) assert.ok(s52.includes(`data-sequence='${seq}'`) || seq === 'editorial', `sequence preset ${seq}`)
assert.match(s52, /--hb-step-reveal: 55ms/, 'phones use a shorter stagger')
assert.match(s52, /min\(var\(--hb-order, var\(--hb-motion-index, 0\)\), 5\)/, 'batch order is capped so nothing waits long')
assert.match(tokens, /\[data-motion='left'\]\[data-revealed='false'\]/, 'left-origin motion exists')
assert.doesNotMatch(s52, /infinite|filter\s*:|blur\(|bounce|elastic|rotate\(|perspective/, 'no looping, blur, bounce or rotation in the new motion')
// An eyebrow's clip-path hides its own box from IntersectionObserver, so it must never be a SELF-triggered reveal (it would stay invisible).
assert.doesNotMatch(siteSource.map(read).join('\n'), /<SiteReveal[^>]*motion="eyebrow"/, 'eyebrow motion only as a descendant of a reveal group')
// Hero entrance: pure CSS, only when motion is allowed, so content is visible with no JS and under reduced motion.
assert.match(s52, /@media \(prefers-reduced-motion: no-preference\) \{\s*\[data-surface='site'\] \[data-hero-copy\] > \*/, 'hero entrance only under no-preference')
// Hidden start states in the whole file remain gated behind data-motion-ready (nothing permanently invisible without JS).
const hiddenOutsideGate = tokens
  .replace(/\[data-surface='site'\]\[data-motion-ready\][^{]*\{[^}]*\}/g, '')
  .replace(/@keyframes[^{]*\{[\s\S]*?\n\}\n/g, '')
assert.doesNotMatch(hiddenOutsideGate.slice(hiddenOutsideGate.indexOf('/* ── Motion: REVEAL')), /\n\s*opacity:\s*0\s*;/, 'no un-gated hidden start state')

const reveal = read('src/components/site/motion/SiteReveal.tsx')
assert.equal((reveal.match(/new IntersectionObserver/g) || []).length, 1, 'ONE shared observer for all reveals')
assert.match(reveal, /unobserve\(entry\.target\)/, 'each element plays once and is released')
assert.match(reveal, /--hb-order/, 'elements entering together are sequenced in reading order')
assert.match(reveal, /!root\?\.hasAttribute\('data-motion-ready'\)[\s\S]*setRevealed\(true\)/, 'no motion gate (reduced motion / no JS gate) means revealed immediately')
assert.match(reveal, /sequence\?: SiteSequence/); assert.match(reveal, /data-sequence=\{sequence\}/)
for (const s of ['editorial', 'cards', 'system', 'process']) assert.ok(reveal.includes(`'${s}'`), `SiteSequence includes ${s}`)
assert.doesNotMatch(reveal, /addEventListener\(['"]scroll/, 'no raw scroll handlers')

// Motion stays presentation-only: no component renders its copy only after an effect / state.
for (const f of ['src/components/site/motion/SiteReveal.tsx']) assert.match(read(f), /\{children\}/, 'children always rendered into the DOM')

// Heroes opt in to the CSS entrance on their copy column.
for (const f of [
  'src/components/site/home/HomeHero.tsx', 'src/components/site/services/ServicesHero.tsx', 'src/components/site/capability/CapabilityHero.tsx',
  'src/components/site/how-we-work/HowWeWorkSections.tsx', 'src/components/site/growth-review/GrowthReviewSections.tsx', 'src/components/site/about/AboutSections.tsx',
  'src/components/site/contact/ContactSections.tsx', 'src/components/site/insights/InsightsSections.tsx', 'src/components/site/work/WorkSections.tsx',
  'src/components/site/work/CaseStudySections.tsx', 'src/components/site/work/WorkDetail.tsx', 'src/components/site/insights/InsightDetail.tsx',
]) assert.match(read(f), /data-hero-copy/, `${f} marks its hero copy`)

// Article body stays static; only chrome around it moves.
const detail = read('src/components/site/insights/InsightDetail.tsx')
const bodyLine = detail.split('\n').find((l) => l.includes('<InsightArticleBody'))
assert.ok(bodyLine && !/SiteReveal/.test(bodyLine), 'the article body is not wrapped in a reveal')
assert.doesNotMatch(read('src/components/site/insights/InsightArticleBody.tsx'), /data-motion|SiteReveal/, 'article body has no motion')

// Contact: calm. The form fields themselves are not staggered.
assert.doesNotMatch(read('src/components/site/contact/ContactForm.tsx'), /data-motion|SiteReveal/, 'no per-field motion on the contact form')
assert.doesNotMatch(read('src/components/site/growth-review/GrowthReviewForm.tsx'), /data-motion|SiteReveal/, 'no per-control motion on the Growth Review form')

// Insights filtering settles quickly and respects reduced motion.
const browser = read('src/components/site/insights/InsightsBrowser.tsx')
assert.match(browser, /prefers-reduced-motion: reduce/); assert.match(browser, /duration: 280/)

// Process stages remain ordered and sequenced.
assert.match(read('src/components/site/how-we-work/HowWeWorkSections.tsx'), /motion="step" index=\{i\}/, 'five stages resolve in order')

/* ── Shared figure fix ───────────────────────────────────────────── */
const moduleCss = read('src/components/site/module/hbee-module.module.css')
const figureRule = moduleCss.match(/\n\.figure \{[^}]*\}/)[0]
assert.match(figureRule, /margin-block: 0;/); assert.doesNotMatch(figureRule, /\n\s*margin: 0;/, 'the shorthand no longer cancels consumer mx-auto')

/* ── Homepage closing diagnostic ─────────────────────────────────── */
const homeSections = read('src/components/site/home/HomeSections.tsx')
assert.match(homeSections, /<CapabilityDiagnosticSystem variant="home"/); assert.doesNotMatch(homeSections, /<DiagnosticSystem|from '\.\.\/growth-review\/DiagnosticSystem'/)
const diag = read('src/components/site/growth-review/CapabilityDiagnosticSystem.tsx')
assert.match(diag, /'hero' \| 'received' \| 'idle' \| 'home'/)
assert.match(diag, /home: `The connected Hbee system the Growth Review looks across: \$\{NAMES\}/)
const diagCss = read('src/components/site/growth-review/diagnostic-hero.module.css')
const homeCss = diagCss.slice(diagCss.indexOf(".figure[data-variant='home'] .pulse"))
assert.match(homeCss, /\[data-variant='home'\] \.pulse \{ display: none; \}/, 'home variant has no scan')
assert.doesNotMatch(homeCss.slice(0, homeCss.indexOf('@media (prefers-reduced-motion')).replace(/\/\*[\s\S]*?\*\//g, ''), /infinite|hubSignal|signal/i, 'home variant: no looping, no orange signal')
const homeRendered = [homeSections, ...['HomeHero', 'HomeBridge', 'HomeConditions', 'HomeDiagnostic', 'HomeProblem', 'HomeGrowthSystem', 'HomeCapabilities', 'HomeSelectedWork'].map((n) => read(`src/components/site/home/${n}.tsx`)), read('src/components/site/home/home-content.ts')].join('\n')
assert.doesNotMatch(homeRendered, /Visibility, Conversion, Retention|Authority and Scalability|five areas/, 'no five-area model on the homepage')
{
  const entities = read('src/components/site/services/capability-entities.ts')
  for (const name of ['Brand & Positioning', 'Website & Conversion', 'Digital Systems & Analytics', 'Creative & UGC', 'Traffic & Visibility', 'Retention & Customer Value']) assert.ok(entities.includes(name), `${name} in the canonical entity list`)
}

/* ── Work ─────────────────────────────────────────────────────────── */
const workSections = read('src/components/site/work/WorkSections.tsx')
assert.doesNotMatch(siteSource.map(read).join('\n'), /isolated preview/i, 'no developer environment wording anywhere on the public site')
assert.doesNotMatch(read('src/components/site/work/WorkSystem.tsx'), /label: 'Strategy'/); assert.match(read('src/components/site/work/WorkSystem.tsx'), /label: 'Brand'/)
assert.match(workSections, /Ecommerce Work/); assert.match(workSections, /Four representative modules/)
assert.doesNotMatch(workSections, /through strategy, design, technology and creative/)
assert.match(workSections, /const rest = items\.filter\(\(i\) => i !== featured\)/, 'Featured project is excluded from the general grid')
const workPage = read('src/app/(site)/work/page.tsx')
assert.match(workPage, /Ecommerce Work & Case Studies/); assert.match(workPage, /type: 'CollectionPage'/); assert.match(workPage, /ld\+json/)
assert.match(read('src/app/(site)/case-studies/page.tsx'), /type: 'CollectionPage'/)
for (const f of ['src/app/(site)/work/[slug]/page.tsx', 'src/app/(site)/case-studies/[slug]/page.tsx']) assert.match(read(f), /pageJsonLd\(/, `${f} emits WebPage + BreadcrumbList`)
assert.doesNotMatch(workPage + read('src/lib/site/page-schema.ts'), /Review|aggregateRating|AggregateRating/, 'no review/results schema')
const homeData = read('src/lib/site/home-data.ts')
assert.match(homeData, /href: portfolioCreativeEnabled\(\) && row\.is_case_study === true \? `\/case-studies\/\$\{slug\}` : `\/work\/\$\{slug\}`/, 'featured work links straight to the canonical case-study page')
for (const f of ['src/components/site/home/HomeSelectedWork.tsx', 'src/components/site/services/ServicesWork.tsx']) {
  const s = read(f); assert.match(s, /href=\{item\.href\}/); assert.doesNotMatch(s, /caseStudyHref/)
}

/* ── Navigation ───────────────────────────────────────────────────── */
const navSrc = read('src/components/site/navigation.ts')
const nav = {}
{
  const js = ts.transpileModule(navSrc, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('exports', 'require', 'module', js)(m.exports, (n) => {
    if (n.endsWith('insight-capabilities')) return { INSIGHT_CAPABILITIES: [], insightCapabilityHref: (s) => `/insights?capability=${s}` }
    if (n.endsWith('services-content')) return { SERVICE_GROUPS: [] }
    throw new Error(n)
  }, m)
  Object.assign(nav, m.exports)
}
assert.equal(nav.isNavActive('/case-studies', '/work'), true); assert.equal(nav.isNavActive('/case-studies/beautovia-essence-transformation', '/work'), true)
assert.equal(nav.isNavActive('/work/sobrii', '/work'), true); assert.equal(nav.isNavActive('/workshop', '/work'), false); assert.equal(nav.isNavActive('/insights', '/work'), false)
assert.equal(PRIMARY_COUNT(nav.PRIMARY_NAV), 6, 'no new top-level navigation item')
function PRIMARY_COUNT(list) { return list.length }
const workMenu = nav.NAV_MENUS['/work']
const workLabels = workMenu.columns.flatMap((c) => c.links.map((l) => l.label))
assert.deepEqual(workLabels.filter((l) => l !== 'Case Studies'), ['All Work', 'Beauty', 'Beverage'], 'Work menu lists only categories that exist')
for (const gone of ['Ecommerce', 'Apparel', 'Technology', 'Concepts & Explorations', 'Food & Beverage']) assert.ok(!workLabels.includes(gone), `${gone} removed`)
assert.match(read('src/components/site/layout/SiteNav.tsx'), /isNavActive/); assert.match(read('src/components/site/layout/SiteDesktopNav.tsx'), /isNavActive/)

/* ── CTA normalisation ────────────────────────────────────────────── */
const allSite = siteSource.map((f) => `\n/*${f}*/\n` + read(f)).join('')
for (const stale of ['Explore Our Work', 'Explore Our Capabilities', 'Talk to Hbee', 'Explore case studies', 'Explore all work']) assert.ok(!allSite.includes(stale), `stale CTA "${stale}" removed`)
assert.match(read('src/components/site/capability/CapabilityHero.tsx'), /Start Growth Review/); assert.doesNotMatch(read('src/components/site/capability/CapabilityHero.tsx'), /Start a Growth Review/)
assert.match(read('src/components/site/services/ServicesHero.tsx'), /Explore Services/)
assert.match(read('src/components/site/home/HomeSections.tsx'), /Talk to Our Team/)
assert.equal(nav.PRIMARY_CTA.label, 'Start Growth Review')
{ // Work links are not styled as conversion actions on the Services page.
  const sw = read('src/components/site/services/ServicesWork.tsx')
  assert.doesNotMatch(sw, /ALL_WORK_HREF\} variant="conversion"/)
}

/* ── Public email ─────────────────────────────────────────────────── */
assert.equal(nav.CONTACT_EMAIL, 'contact@hbeedigitals.com')
assert.doesNotMatch(read('src/lib/site/footer-data.ts'), /contactEmail:/, 'the CMS contact_email no longer overrides the public footer')
assert.doesNotMatch(allSite, /hello@hbeedigitals\.com/, 'no hello@ on the public site components')
assert.match(read('src/components/StructuredData.tsx'), /email: "contact@hbeedigitals\.com"/)
assert.match(read('src/lib/emails/layout.ts'), /hello@hbeedigitals\.com/, 'internal reply-to fallback untouched')

/* ── Structured data ──────────────────────────────────────────────── */
const sd = read('src/components/StructuredData.tsx')
assert.equal((sd.match(/"@type": "Organization"/g) || []).length, 1, 'one Organization node'); assert.equal((sd.match(/"@type": "WebSite"/g) || []).length, 1, 'one WebSite node')
assert.match(sd, /"@id": "https:\/\/hbeedigitals\.com#website"/)
{
  const js = ts.transpileModule(read('src/lib/site/page-schema.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const m = { exports: {} }
  new Function('exports', 'require', 'module', js)(m.exports, () => ({ SITE_URL: 'https://hbeedigitals.com' }), m)
  assert.equal(m.exports.WEBSITE_ID, 'https://hbeedigitals.com#website')
  const [page, crumbs] = m.exports.pageJsonLd({ path: '/work', name: 'Work', description: 'd', breadcrumb: 'Work', type: 'CollectionPage' }).map((s) => JSON.parse(s))
  assert.equal(page['@type'], 'CollectionPage'); assert.deepEqual(page.isPartOf, { '@id': 'https://hbeedigitals.com#website' }); assert.deepEqual(page.publisher, { '@id': 'https://hbeedigitals.com#organization' })
  assert.deepEqual(crumbs.itemListElement.map((i) => i.name), ['Home', 'Work'])
  const detailLd = JSON.parse(m.exports.pageJsonLd({ path: '/case-studies/x', name: 'X', description: 'd', breadcrumb: 'X', trail: [{ name: 'Work', path: '/work' }, { name: 'Case Studies', path: '/case-studies' }] })[1])
  assert.deepEqual(detailLd.itemListElement.map((i) => [i.position, i.name]), [[1, 'Home'], [2, 'Work'], [3, 'Case Studies'], [4, 'X']])
}
for (const f of ['src/app/(site)/services/page.tsx', 'src/app/(site)/contact/page.tsx', 'src/lib/site/insights-data.ts']) assert.match(read(f), /isPartOf: \{ '@id': `\$\{SITE_URL\}#website` \}/, `${f} references the WebSite node`)

/* ── Root fallback metadata ───────────────────────────────────────── */
assert.doesNotMatch(read('src/app/layout.tsx'), /Premium websites, Shopify optimization/)
assert.match(read('src/app/layout.tsx'), /digital growth studio for Shopify and ecommerce brands/)

/* ── Accessibility ────────────────────────────────────────────────── */
assert.match(read('src/components/site/how-we-work/HowWeWorkSections.tsx'), /<nav aria-label="Client Portal sections \(illustration\)"/)

console.log('S5.2 global polish tests passed')
