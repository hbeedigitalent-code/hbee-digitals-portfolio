// Offline Phase S1 checks (semantic Services architecture). No environment, database or network access.
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
const { CAPABILITY_ENTITIES, CAPABILITY_ORDER, MERCHANT_SYMPTOMS, MODULE_IMAGE } = load('src/components/site/services/capability-entities.ts')
const { SERVICE_GROUPS, SERVICES_HERO, SERVICES_FAQ, CONNECT_INTRO } = load('src/components/site/services/services-content.ts')
const { CAPABILITY_DETAILS } = load('src/components/site/capability/capability-content.ts')

/* ── 1. The six live routes are preserved; names and modules are the approved ones ── */
const expected = {
  'brand-positioning': ['Brand', 'Brand & Positioning'],
  'commerce-experience': ['Experience', 'Website & Conversion'],
  'digital-systems': ['Technology', 'Digital Systems & Analytics'],
  'creative-ugc': ['Creative', 'Creative & UGC'],
  'discovery-traffic': ['Discovery', 'Traffic & Visibility'],
  'retention-growth': ['Growth', 'Retention & Customer Value'],
}
assert.deepEqual(plain([...CAPABILITY_ORDER].sort()), Object.keys(expected).sort(), 'Exactly the six live capability slugs')
assert.deepEqual(plain(Object.keys(CAPABILITY_DETAILS)).sort(), Object.keys(expected).sort(), 'No route added or removed')
for (const [slug, [module, name]] of Object.entries(expected)) {
  const entity = CAPABILITY_ENTITIES[slug]
  assert.equal(entity.module, module, `${slug} module`)
  assert.equal(entity.name, name, `${slug} semantic name`)
  assert.equal(entity.href, `/services/${slug}`, `${slug} route unchanged`)
  assert.ok(MODULE_IMAGE[module].startsWith('/brand/modules/'), `${slug} uses a canonical module asset`)
  assert.ok(entity.definition.length >= 100, `${slug} has a self-contained definition`)
  assert.ok(entity.problems.length >= 2 && entity.coreWork.length >= 3, `${slug} lists problems and core work`)
  assert.ok(entity.adjacent.length === 3 && !entity.adjacent.includes(slug), `${slug} has three valid adjacent capabilities`)
  assert.ok(entity.adjacent.every((a) => CAPABILITY_ENTITIES[a]), `${slug} adjacency resolves`)
  assert.ok(entity.linkLabel.startsWith('Explore ') && entity.linkLabel.includes(name), `${slug} link text is descriptive`)
}

/* ── 2. One source of truth: groups, details and nav agree with the entities ── */
for (const group of SERVICE_GROUPS) {
  for (const capability of group.capabilities) {
    assert.equal(capability.name, CAPABILITY_ENTITIES[capability.slug].name, `${capability.slug} group name matches entity`)
  }
}
const nav = read('src/components/site/navigation.ts')
for (const [slug, [, name]] of Object.entries(expected)) {
  assert.ok(nav.includes(`label: '${name}', href: '/services/${slug}'`), `${slug} nav label uses the semantic name`)
}

/* ── 3. Hub: direct answer, symptoms route to real capabilities, no unsupported claims ── */
assert.ok(SERVICES_HERO.lede.startsWith('Hbee Digitals helps ecommerce brands'), 'Hub opens with a direct answer')
for (const name of Object.values(expected).map((v) => v[1].split(' & ')[0].toLowerCase())) {
  assert.ok(SERVICES_HERO.lede.toLowerCase().includes(name.split(' ')[0]), `Hero answer mentions ${name}`)
}
assert.ok(MERCHANT_SYMPTOMS.length >= 7)
for (const item of MERCHANT_SYMPTOMS) assert.ok(CAPABILITY_ENTITIES[item.capability], `symptom "${item.symptom}" routes to a real capability`)
const productOffer = MERCHANT_SYMPTOMS.find((item) => item.serviceArea === 'Product & Offer')
assert.equal(productOffer.capability, 'commerce-experience', 'Product & Offer routes into Website & Conversion')
assert.equal(productOffer.anchor, '#product-and-offer')
assert.equal(CONNECT_INTRO.points.length, 4)
assert.ok(SERVICES_FAQ.length >= 8)

const hubSource = read('src/app/(site)/services/page.tsx')
assert.ok(hubSource.includes('"@type"') === false && hubSource.includes("'CollectionPage'") && hubSource.includes("'ItemList'") && hubSource.includes("'BreadcrumbList'"))
assert.ok(!/FAQPage|aggregateRating|reviewRating|priceRange|\boffers\b|areaServed/.test(hubSource), 'Hub has no FAQ, review, price or area schema')

/* ── 4. Website & Conversion: the reference semantic page ── */
const wc = CAPABILITY_DETAILS['commerce-experience']
const s = wc.semantic
assert.ok(s, 'Website & Conversion provides semantic content')
assert.equal(`${s.h1.lead} ${s.h1.accent}`, 'Shopify Website Design & Conversion Optimization')
assert.ok(wc.seo.title.includes('Website Design & Conversion'), 'Title uses the semantic name')
assert.ok(!JSON.stringify(s).includes('/services/digital-systems"') || !/storefront builds/.test(JSON.stringify(s)), 'No storefront-build link to Digital Systems')
assert.ok(!/prioritis|catalogue|recognis/i.test(JSON.stringify([s, SERVICES_HERO, CONNECT_INTRO, SERVICES_FAQ])), 'US spelling in S1 content')
assert.ok(wc.seo.description.length <= 200)
const sentences = s.definition.split(/(?<=[.!?])\s+/).filter(Boolean)
assert.ok(sentences.length >= 2 && sentences.length <= 4, 'Direct answer is 2-4 sentences')
assert.ok(s.symptoms.items.length >= 5 && s.diagnose.items.length >= 6)
assert.equal(s.serviceArea.id, 'product-and-offer')
assert.ok(s.serviceArea.connection.link.href === '/services/brand-positioning', 'Product & Offer connects to Brand & Positioning')
const intents = new Set(s.questions.items.map((q) => q.intent))
for (const intent of ['Definition', 'Problem', 'Evaluation', 'Comparison', 'Commercial', 'Diagnostic']) assert.ok(intents.has(intent), `Question intent covered: ${intent}`)
for (const q of s.questions.items) {
  assert.ok(q.question.endsWith('?'), q.question)
  assert.ok(q.answer.length >= 150, `Answer is substantive: ${q.question}`)
}
const required = [
  'Why does a Shopify store get traffic but not sales?',
  'What should a Shopify conversion audit examine?',
  'What makes a product page convert better?',
  'When should a Shopify store be redesigned?',
  'What is the difference between a Shopify redesign and conversion optimization?',
  'What should be fixed before increasing ad spend?',
]
const asked = s.questions.items.map((q) => q.question.toLowerCase().replace('does a shopify conversion audit examine', 'should a shopify conversion audit examine'))
for (const question of required) {
  const normalised = question.toLowerCase()
  assert.ok(asked.some((a) => a === normalised || a.replace('what does a', 'what should a') === normalised), `Answers: ${question}`)
}

/* ── 5. Claims and link hygiene ── */
const copy = JSON.stringify([s, CAPABILITY_ENTITIES, MERCHANT_SYMPTOMS, SERVICES_HERO, CONNECT_INTRO, SERVICES_FAQ])
assert.ok(!/\b(?:10x|skyrocket|dominate|guaranteed?|world-class|best agency|#1)\b/i.test(copy.replace(/does not promise a specific[^"]*/i, '')), 'No inflated claims')
assert.ok(!/\b\d+(?:\.\d+)?\s*(?:%|x)\b/i.test(copy), 'No unsupported numeric proof')
assert.ok(!/learn more|click here|read more/i.test(copy), 'No generic link text')
const links = [...(s.serviceArea.links ?? []), ...s.questions.items.flatMap((q) => q.links ?? [])]
for (const link of links) {
  assert.ok(link.href.startsWith('/'), `Internal link: ${link.href}`)
  assert.ok(link.label.length >= 12, `Descriptive anchor: ${link.label}`)
}

/* ── 6. Module component: meaning is HTML, artwork is decorative, links are real anchors ── */
const card = read('src/components/site/module/CapabilityModuleCard.tsx')
assert.ok(/alt=""/.test(card) && /aria-hidden="true" className=\{styles\.media\}/.test(card), 'Artwork is decorative')
assert.ok(card.includes('<Link href={entity.href}') && card.includes('Hbee module: '), 'Crawlable link and module identity text')
assert.ok(card.includes("data-state={state}"), 'State is exposed')
const css = read('src/components/site/module/capability-module.module.css')
assert.ok(css.includes(':focus-within') && css.includes('prefers-reduced-motion') && css.includes('max-width: 479px'), 'Focus, reduced-motion and phone rules exist')

/* ── 7. Sitemap is unchanged: still derives from CAPABILITY_DETAILS ── */
assert.ok(read('src/app/sitemap.ts').includes('Object.keys(CAPABILITY_DETAILS)'))

console.log('Services semantic checks passed')
