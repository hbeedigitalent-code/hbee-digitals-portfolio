// Offline Phase B3 checks. No environment, database, storage or network access.
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

function loadTypeScript(file, mocks) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText
  const mod = { exports: {} }
  const localRequire = (name) => {
    if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name]
    throw new Error(`Unexpected page dependency: ${name}`)
  }
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console, Map, Promise }, { filename: file })
  return mod.exports
}

const slugs = [
  'brand-positioning',
  'digital-systems',
  'creative-ugc',
  'discovery-traffic',
  'commerce-experience',
  'retention-growth',
]
const plain = (value) => JSON.parse(JSON.stringify(value))
const { CAPABILITY_DETAILS, capabilityIdentity, relatedCapabilities } = load('src/components/site/capability/capability-content.ts')
const { CAPABILITY_GROUPS } = load('src/components/site/home/home-content.ts')

assert.deepEqual(plain(Object.keys(CAPABILITY_DETAILS)), slugs, 'Only the six approved capability routes exist')
assert.deepEqual(plain(CAPABILITY_GROUPS.flatMap((group) => group.capabilities.map((capability) => capability.slug))), slugs)

const titles = new Set()
const descriptions = new Set()
const brandPositioningInsight = 'brand-positioning-vs-brand-identity'
const brandClarityInsight = 'first-five-things-customers-should-understand-about-your-brand'
const conversionInsight = 'ecommerce-conversion-mistakes-costing-sales'
const productPageInsight = 'how-to-build-product-pages-that-answer-buying-questions'
const seasonalInsight = 'q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale'
const novemberSeasonalInsight = 'november-2026-e-commerce-readiness'
const valuePropositionInsight = 'how-to-write-clear-ecommerce-value-proposition'
const redesignInsight = 'shopify-redesign-vs-optimization'
const ugcInsight = 'types-of-ugc-ecommerce-brand-needs'
const searchInsight = 'why-shopify-store-not-appearing-google'
const frictionInsight = 'identify-shopify-conversion-friction'
const klaviyoInsight = 'klaviyo-flows-shopify-store-needs-first'
const approvedPublishedInsights = new Set([
  brandPositioningInsight,
  brandClarityInsight,
  valuePropositionInsight,
  redesignInsight,
  ugcInsight,
  searchInsight,
  conversionInsight,
  productPageInsight,
  frictionInsight,
  klaviyoInsight,
])
const expectedInsights = {
  'brand-positioning': [brandPositioningInsight, brandClarityInsight, valuePropositionInsight],
  'digital-systems': [],
  'creative-ugc': [ugcInsight],
  'discovery-traffic': [searchInsight],
  'commerce-experience': [conversionInsight, productPageInsight, frictionInsight, redesignInsight],
  'retention-growth': [klaviyoInsight],
}
const bannedClaims = /\b(?:10x|skyrocket|dominate|guaranteed|world-class|best agency|number one|#1)\b/i
const unsupportedProof = /(?<![\w.])\+?\d+(?:\.\d+)?\s*(?:%|x\b|per\s?cent\b)/i
// Guard self-check: the proof regex must catch performance-proof formats and leave ordinary numerals alone.
for (const claim of ['conversion increased 20%', 'revenue grew 3x', 'ROAS improved 2.5x', 'up +20% on last year', 'a 20 percent lift']) {
  assert.ok(unsupportedProof.test(claim), 'unsupportedProof rejects: ' + claim)
}
for (const fine of ['Four steps from audit to launch', 'Updated in 2026', 'A 1920x1080 hero image', 'Version 2.5 of the template', 'Shopify 2.0 themes', 'Review 8 areas in order']) {
  assert.ok(!unsupportedProof.test(fine), 'unsupportedProof allows: ' + fine)
}

for (const slug of slugs) {
  const detail = CAPABILITY_DETAILS[slug]
  const identity = capabilityIdentity(slug)
  assert.ok(identity, `${slug} has one shared identity`)
  assert.equal(detail.slug, slug)
  assert.ok(detail.hero.headline.trim() && detail.hero.headlineAccent.trim(), `${slug} has one human-led H1 identity`)
  assert.ok(detail.hero.summary.length >= 100, `${slug} has a commercially explicit hero summary`)
  assert.ok(detail.opportunity.bestFor.length >= 80, `${slug} identifies who the capability is for`)
  assert.equal(detail.faq.length, 3, `${slug} answers three real buyer questions`)
  assert.ok(detail.cta.secondaryLabel.startsWith('Discuss '), `${slug} has a direct-project CTA`)
  assert.deepEqual(plain(detail.insightSlugs), expectedInsights[slug], `${slug} has only strongly relevant published Insight assignments`)
  assert.ok(detail.insightSlugs.every((insightSlug) => approvedPublishedInsights.has(insightSlug)), `${slug} has no fabricated or unverified Insight slug`)
  assert.ok(!detail.insightSlugs.includes(seasonalInsight), `${slug} does not use seasonal Q3 content as generic acquisition support`)
  assert.ok(!detail.insightSlugs.includes(novemberSeasonalInsight), `${slug} does not use the November campaign article as evergreen capability support`)
  assert.equal(relatedCapabilities(slug).length, 5, `${slug} links to the other five approved capabilities`)

  const content = JSON.stringify(detail)
  assert.ok(!bannedClaims.test(content), `${slug} has no inflated marketing claims`)
  assert.ok(!unsupportedProof.test(content), `${slug} has no unsupported numerical proof`)
  assert.ok(!/lorem ipsum|\bTBD\b|placeholder/i.test(content), `${slug} has no placeholder copy`)

  assert.ok(!titles.has(detail.seo.title), `${slug} SEO title is unique`)
  assert.ok(!descriptions.has(detail.seo.description), `${slug} meta description is unique`)
  titles.add(detail.seo.title)
  descriptions.add(detail.seo.description)
  assert.ok(`${detail.seo.title} | Hbee Digitals`.length <= 60, `${slug} title stays within a sensible result length`)
  assert.ok(detail.seo.description.length >= 120 && detail.seo.description.length <= 160, `${slug} description is useful and concise`)
}

const expectedTerms = {
  'brand-positioning': /ecommerce.+positioning/i,
  'digital-systems': /Shopify stores and ecommerce systems/i,
  'creative-ugc': /UGC videos?, product demonstrations?/i,
  'discovery-traffic': /Shopify and ecommerce SEO/i,
  'commerce-experience': /Shopify conversion and ecommerce customer experience/i,
  'retention-growth': /Shopify email marketing and Klaviyo lifecycle systems/i,
}
for (const slug of slugs) assert.match(CAPABILITY_DETAILS[slug].hero.summary, expectedTerms[slug], `${slug} visibly supports its primary intent`)

const pageMetadata = (input) => ({
  title: input.title,
  description: input.description,
  alternates: { canonical: `https://hbeedigitals.com${input.path}` },
  openGraph: { url: `https://hbeedigitals.com${input.path}`, title: `${input.title} | Hbee Digitals`, description: input.description },
  twitter: { title: `${input.title} | Hbee Digitals`, description: input.description },
})
const page = loadTypeScript('src/app/(site)/services/[capability]/page.tsx', {
  'react/jsx-runtime': require('react/jsx-runtime'),
  '@/lib/site/seo': { pageMetadata },
  '@/lib/site/insights-data': { getInsightsData: async () => ({ items: [], topics: [] }) },
  '@/lib/site/portfolio-creative-data': { getCapabilityWork: async () => [] },
  '@/components/site/capability/CapabilityDetailPage': { CapabilityDetailPage: () => null },
  '@/components/site/capability/capability-content': { CAPABILITY_DETAILS, capabilityIdentity },
  '@/lib/blog-utils': { SITE_URL: 'https://hbeedigitals.com' },
})

for (const slug of slugs) {
  const metadata = page.generateMetadata({ params: { capability: slug } })
  assert.equal(metadata.title, CAPABILITY_DETAILS[slug].seo.title)
  assert.equal(metadata.description, CAPABILITY_DETAILS[slug].seo.description)
  assert.equal(metadata.alternates.canonical, `https://hbeedigitals.com/services/${slug}`)
  assert.equal(metadata.openGraph.url, metadata.alternates.canonical)
  assert.equal(metadata.twitter.description, metadata.description)
}

// Resolution: mapped slugs only, mapping order, missing/unpublished dropped, no fallback.
async function resolvedInsights(slug, publishedSlugs) {
  const items = publishedSlugs.map((itemSlug) => ({ id: itemSlug, slug: itemSlug, title: `Title of ${itemSlug}`, href: `/insights/${itemSlug}` }))
  const resolver = loadTypeScript('src/app/(site)/services/[capability]/page.tsx', {
    'react/jsx-runtime': require('react/jsx-runtime'),
    '@/lib/site/seo': { pageMetadata },
    '@/lib/site/insights-data': { getInsightsData: async () => ({ items, topics: [] }) },
    '@/lib/site/portfolio-creative-data': { getCapabilityWork: async () => [] },
    '@/components/site/capability/CapabilityDetailPage': { CapabilityDetailPage: () => null },
    '@/components/site/capability/capability-content': { CAPABILITY_DETAILS, capabilityIdentity },
    '@/lib/blog-utils': { SITE_URL: 'https://hbeedigitals.com' },
  })
  const tree = await resolver.default({ params: { capability: slug } })
  const children = [].concat(tree.props.children)
  const props = children.find((child) => child && child.props && 'insights' in child.props).props
  resolvedInsights.lastPublished = Object.keys(props.insightTitles)
  resolvedInsights.lastTitles = { ...props.insightTitles }
  return props.insights.map((item) => item.slug)
}
const allPublished = [...approvedPublishedInsights, seasonalInsight, novemberSeasonalInsight, 'unmapped-published-article'].reverse()
;(async () => {
  for (const slug of slugs) {
    assert.deepEqual(plain(await resolvedInsights(slug, allPublished)), expectedInsights[slug], `${slug} resolves exactly its approved Insights in mapping order`)
    assert.deepEqual(plain(await resolvedInsights(slug, [])), [], `${slug} renders no Insight block when nothing is published`)
    assert.deepEqual(plain(await resolvedInsights(slug, [seasonalInsight, novemberSeasonalInsight, 'unmapped-published-article'])), [], `${slug} has no unrelated or seasonal fallback`)
  }
  assert.deepEqual(plain(await resolvedInsights('commerce-experience', [frictionInsight, conversionInsight])), [conversionInsight, frictionInsight], 'A missing or unpublished mapped article is dropped without disturbing order')
  // Editorial Insight links inside semantic content are passed to the renderer only when published.
  await resolvedInsights('digital-systems', [frictionInsight, 'unmapped-published-article'])
  assert.deepEqual(plain(resolvedInsights.lastPublished), [frictionInsight], 'A linked Insight that is published is available to the renderer')
  assert.equal(resolvedInsights.lastTitles[frictionInsight], `Title of ${frictionInsight}`, 'The link label is the published post’s real title, not a slug-derived string')
  await resolvedInsights('digital-systems', ['unmapped-published-article'])
  assert.deepEqual(plain(resolvedInsights.lastPublished), [], 'A linked Insight that is not published is never rendered as a link')
  await resolvedInsights('digital-systems', [])
  assert.deepEqual(plain(resolvedInsights.lastPublished), [], 'No published Insights means no editorial Insight links')
  assert.deepEqual(expectedInsights['brand-positioning'].length +expectedInsights['digital-systems'].length + expectedInsights['creative-ugc'].length + expectedInsights['discovery-traffic'].length + expectedInsights['commerce-experience'].length + expectedInsights['retention-growth'].length, 10)
  console.log('PASS: capability → Insight resolution (exact mappings, order, safe omission, no fallback, seasonal/broad articles unmapped)')
})().catch((error) => { console.error(error); process.exit(1) })

const heroSource = read('src/components/site/capability/CapabilityHero.tsx')
const sectionsSource = read('src/components/site/capability/CapabilitySections.tsx')
const fitSource = read('src/components/site/capability/CapabilitySystemFit.tsx')
const pageSource = read('src/app/(site)/services/[capability]/page.tsx')
assert.equal((heroSource.match(/<h1\b/g) || []).length, 1, 'Shared capability hero renders one H1')
assert.match(heroSource, /href=\{GROWTH_REVIEW_HREF\}/)
assert.match(heroSource, /href=\{CONTACT_HREF\}/)
assert.match(sectionsSource, /href=\{GROWTH_REVIEW_HREF\}/)
assert.match(sectionsSource, /href=\{CONTACT_HREF\}/)
assert.match(sectionsSource, /insight\.href/)
assert.match(sectionsSource, /insights\.length > 0/, 'Capability pages omit the Insights block when no relevant article is available')
assert.match(fitSource, /`\/services\/\$\{capability\.slug\}`/)
assert.match(pageSource, /'@type': 'Service'/)
assert.match(pageSource, /'@type': 'BreadcrumbList'/)
assert.ok(!pageSource.includes("'@type': 'FAQPage'"), 'B3 does not add FAQ structured data')
assert.match(pageSource, /detail\.seo\.description/)
assert.match(pageSource, /detail\?\.insightSlugs\.length \|\| linkedInsightSlugs\.length \? getInsightsData\(\) : Promise\.resolve/, 'Pages with no mapped or linked Insights avoid unnecessary content reads')

const changedCommercialSources = [
  'src/components/site/capability/capability-content.ts',
  'src/components/site/capability/CapabilityDetailPage.tsx',
  'src/components/site/capability/CapabilityHero.tsx',
  'src/components/site/capability/CapabilitySections.tsx',
  'src/app/(site)/services/[capability]/page.tsx',
].map(read).join('\n')
const retiredRouteLiterals = [...changedCommercialSources.matchAll(/['"`](\/(?:portfolio|blog|web-development|e-commerce-solutions|seo-optimization)(?:\/[^'"`]*)?)['"`]/g)]
assert.deepEqual(retiredRouteLiterals.map((match) => match[1]), [], 'No retired service URL literal introduced')

console.log('PASS: six capability routes; unique commercial metadata/canonicals; one H1 identity; visible intent support; restrained Work/Insights/sibling links; dual CTAs; buyer FAQs; no retired routes, placeholders, inflated claims or unsupported numerical proof; Service/Breadcrumb compatibility.')
