// Offline Phase S3.1 checks (About page, entity alignment, How We Work + Growth Review hero systems).
// No environment, database or network access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
const cache = new Map()

function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map((extension) => file + extension).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const localRequire = (name) => {
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    throw new Error(`Unexpected dependency in content module: ${name}`)
  }
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console }, { filename: file })
  return mod.exports
}

const plain = (value) => JSON.parse(JSON.stringify(value))
/** Source without block and line comments, so rules apply to what ships. */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
function strings(value, out = []) {
  if (typeof value === 'string') out.push(value)
  else if (Array.isArray(value)) value.forEach((v) => strings(v, out))
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => strings(v, out))
  return out
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
    const rel = `${dir}/${entry.name}`
    if (entry.isDirectory()) walk(rel, out)
    else out.push(rel)
  }
  return out
}

const ABOUT = load('src/components/site/about/about-content.ts')
const HOW = load('src/components/site/how-we-work/how-we-work-content.ts')
const { CAPABILITY_ENTITIES, CAPABILITY_ORDER, MODULE_IMAGE } = load('src/components/site/services/capability-entities.ts')

const processSystem = read('src/components/site/how-we-work/ProcessSystem.tsx')
const howCss = read('src/components/site/how-we-work/how-we-work.module.css')
const diagnostic = read('src/components/site/growth-review/CapabilityDiagnosticSystem.tsx')
const diagnosticCss = read('src/components/site/growth-review/diagnostic-hero.module.css')
const aboutSections = read('src/components/site/about/AboutSections.tsx')
const aboutTeam = read('src/components/site/about/AboutTeam.tsx')
const aboutVisuals = read('src/components/site/about/AboutVisuals.tsx')
const aboutPage = read('src/app/(site)/about/page.tsx')
const schemaSrc = read('src/lib/site/page-schema.ts')

/* ═══ A. How We Work hero system ═══ */
assert.deepEqual(plain(HOW.PROCESS_STAGES.map((s) => s.name)), ['Assess', 'Prioritize', 'Build', 'Activate', 'Optimize'], 'Exactly the five stages, unrenamed')
assert.ok(/PROCESS_STAGES\.map/.test(processSystem), 'The hero renders the five stages from the one source')
assert.equal((stripComments(processSystem).match(/\{ x: \d+, y: [\d.]+, w: \d+ \}/g) || []).length, 15, 'Five stage boxes in each of three compositions')
const desktopBoxes = /const DESKTOP[\s\S]*?boxes: \[(.*?)\],\n/.exec(processSystem)[1]
const widths = [...desktopBoxes.matchAll(/w: (\d+)/g)].map((m) => +m[1])
assert.equal(widths.length, 5)
const build = widths[2]
assert.ok(widths.every((w, i) => i === 2 || build >= w * 1.4), 'Build is the dominant block (spatial anchor, at least 1.4x any other)')
assert.ok(widths[0] < widths[1] && widths[4] < widths[1], 'Assess and Optimize recede (smaller than Prioritize)')
assert.ok(/DEPTH = \[0, 2, 8, 4, 0\]/.test(processSystem), 'Build is nearest; Assess and Optimize sit furthest back')
assert.ok(/SIGNAL_INSERT = \[false, false, true, false, false\]/.test(processSystem), 'Exactly one Signal Insert (Build)')
assert.ok(/gloss/.test(stripComments(processSystem)) && /GLASS = \[true, false, true, false, true\]/.test(processSystem), 'Gloss on every stage; glass planes on the receded stages and Build')
const tablet = processSystem.slice(processSystem.indexOf('const TABLET'), processSystem.indexOf('const PHONE'))
const phone = processSystem.slice(processSystem.indexOf('const PHONE'), processSystem.indexOf('/* Depth'))
assert.ok(/ret:/.test(processSystem.slice(processSystem.indexOf('const DESKTOP'), processSystem.indexOf('const TABLET'))) && /ret:/.test(tablet), 'Return channel on desktop and tablet')
assert.ok(!/ret:/.test(phone), 'No return loop on phones')
assert.ok(/roundedPath/.test(processSystem) && /routeNode/.test(processSystem), 'Rounded orthogonal route with connection nodes')
assert.ok(/data-motion-ready/.test(howCss) && /procTravel/.test(howCss) && /procHit/.test(howCss) && /procReturn/.test(howCss), 'Gated motion: signal travel, per-stage response, one return pulse')
assert.ok(!/infinite/.test(howCss), 'No continuous animation on How We Work')
assert.ok(/prefers-reduced-motion: reduce[\s\S]*?\.routeSignal[\s\S]*?animation: none/.test(howCss) && /returnPulse \{ display: none/.test(howCss), 'Reduced motion: final state, no pulse')
assert.ok(/@container \(max-width: 400px\)/.test(howCss) && /min-width: 640px\) and \(max-width: 1023px/.test(howCss), 'Deliberate tablet (media) and phone (container) compositions')
assert.equal((read('src/components/site/how-we-work/HowWeWorkSections.tsx').match(/<h1\b/g) || []).length, 1, 'Still one H1 on How We Work')

/* ═══ B. Growth Review hero system ═══ */
const diagCode = stripComments(diagnostic)
assert.ok(/from 'next\/image'/.test(diagCode) && /MODULE_IMAGE\[m\]/.test(diagCode), 'The six canonical renders are placed as images')
assert.ok(!/HbeeModule\b/.test(diagCode), 'The CSS-built capability tiles are gone from the hero')
for (const slug of CAPABILITY_ORDER) {
  const file = MODULE_IMAGE[CAPABILITY_ENTITIES[slug].module]
  assert.ok(fs.existsSync(path.join(root, 'public', file)), `Canonical render exists: ${file}`)
}
assert.deepEqual(
  plain(CAPABILITY_ORDER.map((s) => CAPABILITY_ENTITIES[s].module).sort()),
  ['Brand', 'Creative', 'Discovery', 'Experience', 'Growth', 'Technology'],
  'The six canonical identities',
)
const desktopHero = /const DESKTOP: Layout = \{[\s\S]*?\n\}\n/.exec(diagCode)[0]
const heroW = [...desktopHero.matchAll(/(Brand|Experience|Creative|Technology|Discovery|Growth): \{ x: [\d.]+, y: [\d.]+, w: (\d+) \}/g)].map((m) => +m[2])
assert.equal(heroW.length, 6, 'Six placed modules')
assert.ok(new Set(heroW).size >= 4, 'Varied scale: not six equal tiles')
const hub = /hub: \{ x: (\d+), y: \d+, w: (\d+) \}/.exec(desktopHero)
assert.ok(Math.abs(+hub[1] + +hub[2] / 2 - 50) > 6, 'The hub is off-centre')
const phoneHero = /const PHONE: Layout = \{[\s\S]*?\n\}\n/.exec(diagCode)[0]
const phoneBoxes = [...phoneHero.matchAll(/(Brand|Experience|Creative|Technology|Discovery|Growth): \{ x: (\d+), y: (\d+), w: (\d+) \}/g)]
assert.equal(new Set(phoneBoxes.map((m) => m[2])).size, 2, 'Phones: two columns')
assert.equal(new Set(phoneBoxes.map((m) => m[3])).size, 3, 'Phones: three rows (a 2 x 3 grid)')
assert.equal(new Set(phoneBoxes.map((m) => m[4])).size, 1, 'Phones: six equal renders')
assert.ok(/SCAN_ORDER[\s\S]*?\['Creative', 'Discovery', 'Brand', 'Technology', 'Growth', 'Experience'\]/.test(diagCode), 'The scan order is deliberately not the reading order')
assert.ok(/hubSignal/.test(diagCode) && /variant === 'received'/.test(diagCode), 'The hub signal appears only in the confirmation state')
const cssCode = stripComments(diagnosticCss)
assert.ok(!/rotate\(|rotateX|rotateY|skew|scaleX|scaleY|hue-rotate|saturate\(|grayscale|brightness\(|contrast\(/.test(cssCode + diagCode), 'Renders are never rotated, skewed, stretched or recoloured')
assert.ok(!/\bscores?\b|pillars?|\b6 ?\/ ?6\b|out of|%\)?\s*</i.test(diagCode.replace(/\d+%/g, '')), 'No scoring semantics in the hero system')
assert.ok(/the diagnosis may point into any part/i.test(diagnostic), 'The caption keeps the meaning: where the diagnosis may lead')
assert.ok(/data-motion-ready/.test(diagnosticCss) && /dxScan/.test(diagnosticCss) && /dxLift/.test(diagnosticCss), 'Gated scan: pulse and a small lift, one module at a time')
assert.ok(/prefers-reduced-motion: reduce[\s\S]*?animation: none !important/.test(diagnosticCss) && /\.pulse \{ display: none/.test(diagnosticCss), 'Reduced motion: settled system, no scan')
assert.ok(/data-variant='idle'\] \.channel/.test(diagnosticCss) && /data-variant='idle'\] \.pulse/.test(diagnosticCss), 'Idle recovery state has no signal and muted channels')
assert.ok(/variant="idle"/.test(read('src/components/site/growth-review/ReceivedState.tsx')) && /receiptIsValid\(raw\)/.test(read('src/components/site/growth-review/ReceivedState.tsx')), 'Received/idle states and the receipt gate are intact')

/* ═══ C. About page ═══ */
assert.equal((stripComments(aboutSections).match(/<h1\b/g) || []).length, 1, 'About renders exactly one <h1>')
assert.equal(`${ABOUT.ABOUT_HERO.headline} ${ABOUT.ABOUT_HERO.headlineAccent}`, 'Hbee Digitals is a Digital Growth Studio for Shopify and Ecommerce Brands')
assert.ok(/Hbee Digitals/.test(ABOUT.ABOUT_HERO.headline) && /Shopify/.test(ABOUT.ABOUT_HERO.headlineAccent) && /Ecommerce/.test(ABOUT.ABOUT_HERO.headlineAccent), 'The company entity and its positioning are in the H1')
assert.ok(/ecommerce growth/i.test(ABOUT.ABOUT_HERO.lede), 'The lede explains what Hbee connects')
const aboutAll = [...strings(ABOUT), stripComments(aboutSections), stripComments(aboutTeam), stripComments(aboutVisuals)].join('\n')
assert.ok(!/growth partner/i.test(aboutAll), '"Growth partner" is not introduced as a second primary descriptor')
assert.ok(/absoluteTitle: TITLE/.test(aboutPage) && /Digital Growth Studio for Shopify/.test(aboutPage), 'About metadata states the entity')

assert.deepEqual(
  plain(CAPABILITY_ORDER.map((s) => CAPABILITY_ENTITIES[s].name).sort()),
  ['Brand & Positioning', 'Creative & UGC', 'Digital Systems & Analytics', 'Retention & Customer Value', 'Traffic & Visibility', 'Website & Conversion'],
  'The final six capability names (single source)',
)
assert.ok(/CAPABILITY_ORDER\.map/.test(aboutSections) && /href=\{entity\.href\}/.test(aboutSections) && /aria-label=\{entity\.linkLabel\}/.test(aboutSections), 'Each capability is linked, with a descriptive label')
assert.ok(/href="\/services"/.test(aboutSections) && /href="\/how-we-work"/.test(aboutSections) && /ALL_WORK_HREF/.test(aboutSections), 'Links to Services, How We Work and Work')
assert.ok(/\/how-we-work#\$\{stage\.id\}/.test(aboutSections) && /PROCESS_STAGES/.test(aboutSections), 'The five-stage bridge links to the real stage anchors')
for (const old of ['Creative thinking', 'Customer experience', 'Growth execution', 'Discovery & Traffic', 'Commerce Experience', 'Retention & Growth']) {
  assert.ok(!aboutAll.includes(old), `Stale capability/service vocabulary removed: ${old}`)
}
assert.ok(!/Digital Systems(?! & Analytics)/.test(aboutAll), 'Digital Systems is always "Digital Systems & Analytics"')

assert.equal((aboutSections.match(/href=\{GROWTH_REVIEW_HREF\}/g) || []).length, 2, 'Growth Review CTA only in the hero and the closing')
assert.equal((aboutSections.match(/href=\{CONTACT_HREF\}/g) || []).length, 2, 'Contact is the secondary action in the same two places')
assert.ok(!/fitNote|Not sure where you fit/.test(aboutSections + aboutAll), 'No repeated mid-page Growth Review prompt')

assert.ok(!/isolated preview|preview environment|team data is available/i.test(aboutAll), 'No developer-facing empty-state wording')
assert.ok(!/\b(CMS|database|environment|Supabase|loader)\b/i.test(strings(ABOUT.TEAM_EMPTY).join(' ')), 'The public empty state uses no implementation terms')
assert.ok(/TEAM_EMPTY/.test(aboutTeam), 'The team empty state reads from public-safe copy')
for (const person of ['Habeeb', 'Samson', 'Samuel', 'Emmanuel', 'Salam', 'Mubarak', 'Founder & CEO', 'Co-?founder', '\\bCEO\\b']) {
  assert.ok(!new RegExp(person).test(aboutAll + aboutPage), `No hardcoded team identity or title: ${person}`)
}
assert.ok(!/escrow/i.test(aboutAll), 'Escrow is not promoted anywhere on the page')
assert.ok(/team: TeamMember\[\]/.test(aboutTeam) && /getAboutData\(\)/.test(aboutPage), 'The team stays CMS-driven')

const claims = /\b(global|worldwide|international|beyond geographical|geographical|results we can stand behind|real impact|offices?|awards?|certified|certifications?|badges?|years of|West Africa)\b/i
assert.ok(!claims.test(aboutAll), 'No unsupported scale, outcome, award or geographic claims')
assert.ok(!fs.existsSync(path.join(root, 'src/components/site/about/world-map.ts')) && !/MapScene|ReachField|world-map/.test(aboutAll + aboutSections), 'The illustrative world map is removed')
assert.equal((aboutAll.match(/Abuja/g) || []).length, 2, 'Abuja is stated plainly in exactly the two places it is already factual (team context and one answer)')
// Layout utility classes (e.g. calc(100%_-_3rem)) are not copy.
const aboutCopy = aboutAll.replace(/calc\([^)]*\)/g, '').replace(/(width|height): '100%'/g, '')
assert.ok(!/\d+\s?%|\$\s?\d|\b\d+x\b|\b\d{2,}\+?\s*(clients|brands|stores|merchants|projects|businesses|years)\b/i.test(aboutCopy), 'No unsupported numeric proof')
assert.ok(/ALL_WORK_HREF/.test(aboutSections) && !/case-studies/.test(aboutAll), 'The proof bridge goes to the CMS-backed Work page (the flagged case-study route is not linked directly)')

assert.deepEqual(
  plain(ABOUT.ABOUT_QUESTIONS.map((q) => q.question)),
  [
    'What is Hbee Digitals?',
    'What does Hbee Digitals do?',
    'Who does Hbee Digitals work with?',
    'How does Hbee Digitals approach ecommerce growth?',
    'Who is behind Hbee Digitals?',
    'Where can I see Hbee Digitals’ work?',
  ],
  'The six About questions',
)
assert.ok(/<dl\b/.test(aboutSections), 'Questions are real HTML (a definition list)')
assert.equal(plain(ABOUT.PRINCIPLES.map((p) => p.name)).length, 6)
assert.ok(/Diagnosis before prescription/.test(aboutAll) && /Honest recommendations/.test(aboutAll), 'Operating principles, not generic agency values')

/* ═══ D. Structured data ═══ */
assert.ok(/pageJsonLd\(/.test(aboutPage) && /type: 'AboutPage'/.test(aboutPage) && /breadcrumb: 'About'/.test(aboutPage) && /application\/ld\+json/.test(aboutPage), 'About embeds AboutPage + BreadcrumbList')
assert.ok(/'BreadcrumbList'/.test(schemaSrc) && /'AboutPage'/.test(schemaSrc) && /about: \{ '@id': `\$\{SITE_URL\}#organization` \}/.test(stripComments(schemaSrc)), 'The existing Organization is referenced by @id')
assert.ok(!/'@type': 'Organization'|'Person'|FAQPage|aggregateRating|review|award|offers|price|areaServed/i.test(stripComments(schemaSrc) + stripComments(aboutPage)), 'No duplicate Organization, Person, FAQPage, ratings, awards, prices or areaServed')

/* ═══ E. Entity alignment ═══ */
const FINAL = 'Hbee Digitals is a digital growth studio for Shopify and ecommerce brands, connecting brand and positioning, website and conversion, digital systems and analytics, creative and UGC, traffic and visibility, and retention and customer value.'
const STALE = ['connecting brand, digital', ' systems, creative, discovery, commerce'].join('')
assert.ok(read('src/components/StructuredData.tsx').includes(FINAL), 'Organization schema carries the final description')
assert.ok(read('src/components/site/home/home-content.ts').includes(FINAL), 'Homepage direct-answer sentence is identical')
assert.ok(read('scripts/test-entity-clarity.cjs').includes(FINAL), 'The entity-clarity test pins the same sentence')
const scanned = [...walk('src'), ...walk('scripts')].filter((f) => /\.(ts|tsx|cjs|css)$/.test(f))
assert.deepEqual(scanned.filter((f) => fs.readFileSync(path.join(root, f), 'utf8').includes(STALE)), [], 'The stale capability sentence no longer appears anywhere')
assert.deepEqual(
  scanned.filter((f) => f !== 'scripts/test-about-entity-hero.cjs' && fs.readFileSync(path.join(root, f), 'utf8').includes(FINAL)).sort(),
  ['scripts/test-entity-clarity.cjs', 'src/components/StructuredData.tsx', 'src/components/site/home/home-content.ts'],
  'Exactly one coordinated description (Organization, homepage, entity test): no competing versions',
)

/* ═══ F. Spelling ═══ */
assert.ok(!/\b(optimis|prioritis|organis|recognis|analys(e|ed|ing)\b|colour|behaviour|centre|programme|favour|catalogue)/i.test(aboutAll), 'US English spelling on About')

console.log('S3.1 About, entity and hero-system semantic checks passed')
