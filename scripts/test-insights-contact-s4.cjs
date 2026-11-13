// Offline Phase S4.2 checks (Insights + Contact). No environment, network, database or form submission.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup, renderToString } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

/* ── Loader: real TS modules, relative + "@/" imports resolved, listed modules mocked ── */
function stubComponent(name) {
  return function Stub(props) {
    const { children, href, as, id, className, ...rest } = props
    if (href) return React.createElement('a', { href, className }, children)
    if (name === 'SiteDisplayHeading') return React.createElement(as || 'h2', { id, className }, children)
    return React.createElement('div', { id, className, 'data-stub': name, 'aria-labelledby': rest['aria-labelledby'] }, children)
  }
}
const stubModule = () => new Proxy({ __esModule: true }, { get: (target, key) => (key in target ? target[key] : typeof key === 'string' ? stubComponent(key) : undefined) })
const cssProxy = new Proxy({}, { get: (t, key) => (key === '__esModule' ? undefined : key === 'default' ? t.__self : typeof key === 'string' ? key : undefined) })
cssProxy.__self = cssProxy

function makeLoader(mocks = {}) {
  const cache = new Map()
  function resolveFile(base) {
    for (const candidate of [base, base + '.ts', base + '.tsx', path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
      if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
    }
    throw new Error('Cannot resolve ' + base)
  }
  function load(file) {
    file = resolveFile(path.resolve(root, file))
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const localRequire = (name) => {
      if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name]
      if (name.endsWith('.css')) return cssProxy
      if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name))
      if (name.startsWith('@/')) return load(path.join('src', name.slice(2)))
      return require(name)
    }
    const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    }).outputText
    vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console, process, Date, URL, URLSearchParams, Intl, JSON, Math, Number, String, Array, Object, Set, Map, Promise, RegExp, Error, Symbol }, { filename: file })
    return mod.exports
  }
  return load
}

/* Mock Supabase: eq / neq / order / limit / maybeSingle over an in-memory blog_posts table. */
function mockSupabase(rows) {
  return {
    supabase: {
      from(table) {
        assert.equal(table, 'blog_posts')
        const ops = []
        const q = {}
        for (const op of ['select', 'eq', 'neq', 'order', 'limit', 'maybeSingle']) q[op] = (...args) => (ops.push([op, ...args]), q)
        q.then = (resolve, reject) => {
          let out = rows.filter((row) => ops.every(([op, a, b]) => (op === 'eq' ? row[a] === b : op === 'neq' ? row[a] !== b : true)))
          for (const [, key, options] of ops.filter((o) => o[0] === 'order').reverse())
            out = [...out].sort((x, y) => String(x[key]).localeCompare(String(y[key])) * (options?.ascending === false ? -1 : 1))
          const limit = ops.find((o) => o[0] === 'limit')
          if (limit) out = out.slice(0, limit[1])
          const result = ops.some((o) => o[0] === 'maybeSingle') ? { data: out[0] ?? null, error: null } : { data: out, error: null }
          return Promise.resolve(result).then(resolve, reject)
        }
        return q
      },
    },
  }
}

const plain = (v) => JSON.parse(JSON.stringify(v))
const deepEq = (a, b, m) => assert.deepEqual(plain(a), plain(b), m)
const NOW = new Date('2026-11-13T12:00:00Z')
const row = (slug, extra = {}) => ({
  id: slug, slug, title: `Title ${slug}`, excerpt: `About ${slug}`, content: '<p>' + 'word '.repeat(80) + '</p>', tags: ['Shopify'], author: 'Habeeb Ismaila',
  status: 'published', is_featured: false, read_time: '5 min read', published_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-01T10:00:00Z', ...extra,
})

;(async () => {
  /* ═══ Publication rule ═══ */
  const pub = makeLoader()('src/lib/site/insight-publication.ts')
  assert.equal(pub.isPubliclyEligible({ status: 'draft', published_at: null }, NOW), false, 'draft excluded')
  assert.equal(pub.isPubliclyEligible({ status: 'published', published_at: '2026-11-20T00:00:00Z' }, NOW), false, 'future-dated published row excluded')
  assert.equal(pub.isPubliclyEligible({ status: 'published', published_at: '2026-11-01T00:00:00Z' }, NOW), true, 'past published row included')
  assert.equal(pub.isPubliclyEligible({ status: 'published', published_at: null }, NOW), true, 'published with no date is included')
  assert.equal(pub.isPubliclyEligible({ status: 'published', published_at: '2026-11-13T12:00:00Z' }, NOW), true, 'published exactly now is included')
  assert.equal(pub.isFeatureEligible('november-2026-e-commerce-readiness', new Date('2026-11-30T23:59:59Z')), true, 'BFCM may lead through Nov 30')
  assert.equal(pub.isFeatureEligible('november-2026-e-commerce-readiness', new Date('2026-12-01T00:00:00Z')), false, 'BFCM may not lead from Dec 1')
  assert.equal(pub.isFeatureEligible('any-other-article', new Date('2030-01-01T00:00:00Z')), true, 'only listed slugs expire')

  const rows = [
    row('visible-one', { published_at: '2026-11-05T00:00:00Z' }),
    row('draft-one', { status: 'draft' }),
    row('future-one', { published_at: '2026-12-25T00:00:00Z' }),
  ]
  const dataLoader = makeLoader({ react: { ...React, cache: (fn) => fn }, '@/lib/supabase': mockSupabase(rows) })
  const data = dataLoader('src/lib/site/insights-data.ts')
  const hub = await data.getInsightsData()
  deepEq(hub.items.map((i) => i.slug), ['visible-one'], 'hub lists only draft-free, non-future rows')
  assert.equal(await data.getInsightDetail('future-one'), null, 'future-dated article route is 404')
  assert.equal(await data.getInsightDetail('draft-one'), null, 'draft article route is 404')
  assert.equal(await data.getInsightSeo('future-one'), null, 'future-dated article has no SEO payload')
  assert.ok(await data.getInsightDetail('visible-one'), 'public article resolves')

  // Related uses public rows only.
  const rel = data.toInsightDetail(row('main-a', { tags: ['Shopify'] }), [row('ok-b'), row('draft-c', { status: 'draft' }), row('future-d', { published_at: '2027-01-01T00:00:00Z' })], NOW)
  deepEq(rel.related.map((r) => r.slug), ['ok-b'], 'related excludes drafts and future-dated rows')

  // Sitemap applies the same rule.
  const sitemapLoader = makeLoader({
    '@/lib/supabase': mockSupabase([
      row('visible-one'), row('draft-one', { status: 'draft' }), row('future-one', { published_at: '2027-02-01T00:00:00Z' }),
    ]),
    '@/components/site/capability/capability-content': { CAPABILITY_DETAILS: {} },
    '@/lib/portfolio-creative': { portfolioCreativeEnabled: () => false },
  })
  // The sitemap also queries portfolio_items; give that table an empty result.
  const sitemapSupabase = mockSupabase([])
  const blog = mockSupabase([row('visible-one'), row('draft-one', { status: 'draft' }), row('future-one', { published_at: '2027-02-01T00:00:00Z' })])
  const sitemapMods = makeLoader({
    '@/lib/supabase': { supabase: { from: (t) => (t === 'blog_posts' ? blog.supabase.from(t) : { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) }) } },
    '@/components/site/capability/capability-content': { CAPABILITY_DETAILS: {} },
    '@/lib/portfolio-creative': { portfolioCreativeEnabled: () => false },
  })
  void sitemapLoader; void sitemapSupabase
  const sitemap = await sitemapMods('src/app/sitemap.ts').default()
  const urls = sitemap.map((entry) => entry.url)
  assert.ok(urls.includes('https://hbeedigitals.com/insights/visible-one'))
  assert.ok(!urls.includes('https://hbeedigitals.com/insights/draft-one'))
  assert.ok(!urls.includes('https://hbeedigitals.com/insights/future-one'), 'sitemap excludes future-dated rows')

  /* ═══ Seasonal lead ═══ */
  const lead = (now, list) => data.buildInsightsData(list, now).lead
  const bfcm = row('november-2026-e-commerce-readiness', { is_featured: true, published_at: '2026-11-01T00:00:00Z' })
  const newer = row('newer-evergreen', { published_at: '2026-11-07T00:00:00Z' })
  const olderFeatured = row('older-featured', { is_featured: true, published_at: '2026-06-01T00:00:00Z' })
  assert.equal(lead(new Date('2026-11-20T00:00:00Z'), [bfcm, newer, olderFeatured]).item.slug, 'november-2026-e-commerce-readiness', 'BFCM leads before expiry')
  const after = new Date('2026-12-01T00:00:00Z')
  assert.equal(lead(after, [bfcm, newer, olderFeatured]).item.slug, 'older-featured', 'after expiry the next explicitly featured article leads')
  assert.equal(lead(after, [bfcm, newer]).item.slug, 'newer-evergreen', 'with no other featured article the newest non-expired article leads')
  assert.equal(lead(after, [bfcm, newer]).reason, 'latest')
  assert.ok(data.buildInsightsData([bfcm, newer], after).items.some((i) => i.slug === bfcm.slug), 'expired seasonal article stays in the archive')

  /* ═══ Capability map ═══ */
  const caps = makeLoader()('src/lib/site/insight-capabilities.ts')
  const sixSlugs = ['brand-positioning', 'digital-systems', 'creative-ugc', 'discovery-traffic', 'commerce-experience', 'retention-growth']
  deepEq(caps.INSIGHT_CAPABILITIES.map((c) => c.slug).sort(), [...sixSlugs].sort())
  deepEq(caps.INSIGHT_CAPABILITIES.map((c) => c.name).sort(), ['Brand & Positioning', 'Creative & UGC', 'Digital Systems & Analytics', 'Retention & Customer Value', 'Traffic & Visibility', 'Website & Conversion'].sort())
  const expectedMap = {
    'brand-positioning-vs-brand-identity': ['brand-positioning'],
    'first-five-things-customers-should-understand-about-your-brand': ['brand-positioning'],
    'how-to-write-clear-ecommerce-value-proposition': ['brand-positioning'],
    'identify-shopify-conversion-friction': ['commerce-experience'],
    'ecommerce-conversion-mistakes-costing-sales': ['commerce-experience'],
    'how-to-build-product-pages-that-answer-buying-questions': ['commerce-experience'],
    'shopify-redesign-vs-optimization': ['commerce-experience', 'digital-systems'],
    'types-of-ugc-ecommerce-brand-needs': ['creative-ugc'],
    'why-shopify-store-not-appearing-google': ['discovery-traffic'],
    'klaviyo-flows-shopify-store-needs-first': ['retention-growth'],
    'november-2026-e-commerce-readiness': [],
    'q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale': [],
  }
  for (const [slug, expected] of Object.entries(expectedMap)) deepEq([...caps.insightCapabilitiesFor(slug)], expected, `${slug} capability mapping`)
  assert.equal(Object.keys(caps.INSIGHT_CAPABILITY_MAP).length, 12, 'every current article is mapped (or explicitly null)')
  assert.equal(caps.insightCapabilitiesFor('unmapped-future-article').length, 0)

  /* ═══ Filter state ═══ */
  const filter = makeLoader()('src/lib/site/insights-filter.ts')
  for (const slug of sixSlugs) assert.equal(filter.insightFilterState(new URLSearchParams(`capability=${slug}`)).capability, slug)
  assert.equal(filter.insightFilterState(new URLSearchParams('capability=growth-operations')).capability, 'all', 'unknown capability falls back to all')
  assert.equal(filter.insightFilterState(new URLSearchParams('topic=brand-positioning')).capability, 'brand-positioning', 'legacy topic= that equals a capability slug is honoured')
  assert.equal(filter.insightFilterState(new URLSearchParams('topic=discovery')).capability, 'all', 'stale legacy topic falls back safely')
  assert.equal(filter.insightFilterState(new URLSearchParams('q=klaviyo')).query, 'klaviyo')
  assert.equal(filter.matchesCapability('commerce-experience|digital-systems', 'digital-systems'), true, 'secondary capability matches')
  assert.equal(filter.matchesCapability('commerce-experience|digital-systems', 'creative-ugc'), false)
  assert.equal(filter.matchesCapability('', 'all'), true)
  assert.equal(filter.insightFilterUrl('https://hbeedigitals.com/insights?topic=x', 'creative-ugc', '').search, '?capability=creative-ugc')

  /* ═══ Navigation shares the hub's keys ═══ */
  const nav = makeLoader()('src/components/site/navigation.ts')
  const insightsMenu = nav.NAV_MENUS['/insights']
  const menuLinks = insightsMenu.columns.flatMap((c) => c.links).filter((l) => l.href.startsWith('/insights?'))
  assert.equal(menuLinks.length, 6)
  for (const link of menuLinks) assert.ok(sixSlugs.includes(new URL(link.href, 'https://x.test').searchParams.get('capability')), `${link.href} uses a real capability key`)
  assert.ok(!menuLinks.some((l) => /topic=|growth-operations|discovery$/.test(l.href)), 'no stale pre-S1 topic links')

  /* ═══ Hub rendering ═══ */
  const rendererMocks = {
    react: { ...React, cache: (fn) => fn },
    'next/link': { __esModule: true, default: ({ href, children, ...p }) => React.createElement('a', { href, ...p }, children) },
    'next/navigation': { useSearchParams: () => new URLSearchParams('') },
    'lucide-react': stubModule(),
    '@/lib/supabase': mockSupabase([]),
    '@/lib/emails/layout': { configuredReplyTo: () => null },
    './ContactForm': { ContactForm: () => React.createElement('form', { 'data-form': 'contact' }) },
    '../motion/SiteReveal': stubModule(), '../primitives/SiteButton': stubModule(), '../primitives/SiteContainer': stubModule(),
    '../primitives/SiteImage': stubModule(), '../primitives/SiteIcons': stubModule(), '../primitives/SiteSection': stubModule(),
    '../primitives/SiteTypography': stubModule(), '../module/HbeeModule': stubModule(), '../home/home.module.css': cssProxy,
    './InsightReadingProgress': { InsightReadingProgress: () => null },
  }
  const load = makeLoader(rendererMocks)
  const sections = load('src/components/site/insights/InsightsSections.tsx')
  const items = data.buildInsightsData([row('visible-one', { is_featured: true }), row('shopify-redesign-vs-optimization', { published_at: '2026-11-07T00:00:00Z' })], NOW)
  const hero = renderToStaticMarkup(React.createElement(sections.InsightsHero, { lead: items.lead }))
  assert.equal((hero.match(/<h1\b/g) || []).length, 1, 'hub has one H1')
  const h1 = hero.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  assert.equal(h1, 'Ecommerce Growth Insights for Shopify and Online Brands')
  assert.match(hero, /Hbee Digitals publishes practical guidance on positioning, conversion, systems, creative, visibility and\s+retention for Shopify and ecommerce brands/)
  assert.ok(!/Practical insights for/.test(hero), 'old generic H1 is gone')

  // Server-visible capability links: render the hub's Browser the way Next emits it during a
  // static render (useSearchParams bails out → the Suspense fallback is the server HTML).
  const bailout = makeLoader({ ...rendererMocks, 'next/navigation': { useSearchParams: () => { throw new Promise(() => {}) } } })
  const browserHtml = renderToString(React.createElement(bailout('src/components/site/insights/InsightsBrowser.tsx').InsightsBrowser, { total: 2 }, React.createElement('ul', null)))
  for (const slug of sixSlugs) assert.ok(browserHtml.includes(`href="/insights?capability=${slug}#insights-collection"`), `server HTML links ${slug}`)
  assert.ok(!/type="search"/.test(browserHtml), 'search is a client-only enhancement')
  assert.match(browserHtml, /aria-label="Browse insights by capability"/)

  const collection = renderToStaticMarkup(React.createElement(sections.InsightsCollection, { data: items }))
  assert.match(collection, /data-capabilities="commerce-experience\|digital-systems"/, 'cards carry primary|secondary capability keys')
  assert.ok(!/data-topics=/.test(collection), 'twelve free-text tags are not exposed as filters')
  const empty = renderToStaticMarkup(React.createElement(sections.InsightsCollection, { data: { items: [], topics: [] } }))
  assert.match(empty, /Insights will appear here as new articles are published\./)
  assert.ok(!/isolated preview|preview environment/i.test(empty + read('src/components/site/insights/InsightsSections.tsx')), 'no developer/environment wording')

  const bridge = renderToStaticMarkup(React.createElement(sections.InsightsCapabilityBridge))
  for (const slug of sixSlugs) assert.ok(bridge.includes(`href="/services/${slug}"`), `bridge links ${slug}`)
  const cta = renderToStaticMarkup(React.createElement(sections.InsightsCta, { eyebrow: 'e', headline: 'h', copy: 'c' }))
  assert.equal((cta.match(/href="\/growth-review"/g) || []).length, 1, 'one Growth Review action')
  assert.ok(!/href="\/contact"|Talk to Our Team/.test(cta), 'Contact is not a competing equal action')

  // Hub page: metadata + JSON-LD.
  const hubPage = makeLoader({
    ...rendererMocks,
    '@/lib/supabase': mockSupabase([row('a-one'), row('shopify-redesign-vs-optimization', { published_at: '2026-11-07T00:00:00Z' })]),
    '@/lib/site/seo': { pageMetadata: (input) => input },
    '@/components/site/insights/InsightsSections': { InsightsCapabilityBridge: () => null, InsightsCollection: () => null, InsightsCta: () => null, InsightsHero: () => null },
  })('src/app/(site)/insights/page.tsx')
  assert.ok(!/brand, commerce, customer experience, creative, discovery, retention/.test(hubPage.metadata.description), 'stale old-six-area description replaced')
  assert.ok(hubPage.metadata.description.length <= 160)
  assert.match(hubPage.metadata.description, /Shopify and ecommerce brands/)
  const hubTree = await hubPage.default()
  const hubScripts = [].concat(hubTree.props.children).filter((c) => c && c.type === 'script').map((c) => JSON.parse(c.props.dangerouslySetInnerHTML.__html))
  const collectionPage = hubScripts.find((s) => s['@type'] === 'CollectionPage')
  assert.ok(collectionPage, 'CollectionPage emitted')
  assert.equal(collectionPage.mainEntity['@type'], 'ItemList')
  assert.equal(collectionPage.mainEntity.itemListElement.length, 2, 'ItemList lists the public hub articles')
  assert.equal(collectionPage.mainEntity.itemListElement[0].url.startsWith('https://hbeedigitals.com/insights/'), true)
  deepEq(collectionPage.publisher, { '@id': 'https://hbeedigitals.com#organization' })
  assert.ok(hubScripts.some((s) => s['@type'] === 'BreadcrumbList'))
  const hubJson = JSON.stringify(hubScripts)
  assert.ok(!/"Blog"|FAQPage|"@type":"Organization"/.test(hubJson), 'no Blog / FAQPage / duplicate Organization')

  /* ═══ Article template ═══ */
  const detailLoad = load('src/components/site/insights/InsightDetail.tsx')
  const body = '<h1>Body H1</h1><h2>One</h2><p>' + 'word '.repeat(60) + '</p><h2>Two</h2><h3>Three</h3><p>x</p>'
  const article = (slug, extra = {}, candidates = []) => data.toInsightDetail(row(slug, { content: body, ...extra }), candidates, NOW)
  const render = (detail) => renderToStaticMarkup(React.createElement(detailLoad.InsightDetailPage, { detail }))

  const redesign = article('shopify-redesign-vs-optimization', { published_at: '2026-11-07T06:00:00Z', updated_at: '2026-11-07T07:00:00Z' })
  const html = render(redesign)
  assert.equal((html.match(/<h1\b/g) || []).length, 1, 'article has one H1 (in-body H1 demoted)')
  assert.match(html, /aria-label="Breadcrumb"/)
  assert.match(html, /href="\/insights"[^>]*>Insights<\/a>/)
  assert.match(html, /aria-current="page"[^>]*><span title="Title shopify-redesign-vs-optimization">/)
  assert.match(html, /By <a[^>]*href="\/about"[^>]*>Habeeb Ismaila<\/a>/, 'byline links to /about')
  assert.ok(!/Back to Insights/.test(html), 'generic back link replaced')
  assert.ok(!/Last updated/.test(html), 'same-day update is not shown')
  assert.match(html, /Related Hbee capability/)
  assert.match(html, /href="\/services\/commerce-experience"[^>]*>Website &amp; Conversion/)
  assert.match(html, /Also relevant:[\s\S]*href="\/services\/digital-systems"[^>]*>Digital Systems &amp; Analytics/, 'secondary capability shown quietly')
  assert.ok(html.indexOf('About shopify-redesign-vs-optimization') > html.indexOf('<time'), 'stored excerpt sits under the metadata')

  const updated = article('brand-positioning-vs-brand-identity', { published_at: '2026-11-01T10:00:00Z', updated_at: '2026-11-07T06:00:00Z' })
  assert.equal(updated.updatedAt, 'Nov 7, 2026')
  assert.match(render(updated), /Last updated Nov 7, 2026/)
  assert.equal(article('x-slug-a', { published_at: '2026-11-07T00:10:00Z', updated_at: '2026-11-07T23:50:00Z' }).updatedAt, undefined, 'same calendar day: no redundant updated date')
  assert.equal(article('x-slug-b', { published_at: '2026-11-07T23:00:00Z', updated_at: '2026-11-08T01:00:00Z' }).updatedAt, 'Nov 8, 2026', 'next calendar day counts as updated')

  const cross = article('q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale')
  deepEq(cross.capabilityLinks, [], 'cross-capability article has no capability block')
  assert.ok(!/Related Hbee capability/.test(render(cross)))

  const noAuthor = article('x-slug-c', { author: '' })
  assert.ok(!/By <a/.test(render(noAuthor)) && !/By /.test(render(noAuthor)), 'no author → no byline')

  // Conditional Growth Review block.
  const reviewSlugs = ['identify-shopify-conversion-friction', 'ecommerce-conversion-mistakes-costing-sales', 'shopify-redesign-vs-optimization', 'q3-growth-readiness-why-most-ecommerce-stores-struggle-to-scale', 'november-2026-e-commerce-readiness']
  for (const slug of reviewSlugs) {
    const d = article(slug)
    assert.equal(d.showGrowthReview, true, `${slug} ends in diagnosis/prioritisation`)
    assert.equal((render(d).match(/href="\/growth-review"/g) || []).length, 1, `${slug} shows one Growth Review block`)
  }
  for (const slug of Object.keys(expectedMap).filter((s) => !reviewSlugs.includes(s))) {
    const d = article(slug)
    assert.equal(d.showGrowthReview, false, `${slug} has no forced diagnostic CTA`)
    assert.ok(!/href="\/growth-review"/.test(render(d)), `${slug} renders no Growth Review block`)
  }

  // Related ordering: shared capability first, then shared tags, never unrelated.
  const mine = row('identify-shopify-conversion-friction', { tags: ['Conversion Optimization'] })
  const related = data.toInsightDetail(mine, [
    row('how-to-build-product-pages-that-answer-buying-questions', { tags: ['Shopify'], published_at: '2026-10-01T00:00:00Z' }), // same capability
    row('shared-tag-newer', { tags: ['Conversion Optimization'], published_at: '2026-11-10T00:00:00Z' }), // tag only
    row('why-shopify-store-not-appearing-google', { tags: ['Shopify SEO'] }), // unrelated
  ], NOW).related.map((r) => r.slug)
  deepEq(related, ['how-to-build-product-pages-that-answer-buying-questions', 'shared-tag-newer'])
  assert.equal(data.toInsightDetail(row('lonely-article', { tags: ['Unique'] }), [row('other', { tags: ['Different'] })], NOW).related.length, 0, 'no manufactured related content')
  assert.ok(article('many-a', { tags: ['Shopify'] }, ['r1', 'r2', 'r3', 'r4', 'r5'].map((s) => row(s))).related.length <= 3)

  /* ═══ Author / publisher schema ═══ */
  const seoNamed = await dataLoader('src/lib/site/insights-data.ts').getInsightSeo('visible-one')
  deepEq(JSON.parse(JSON.stringify(seoNamed.blogPostingLd.author)), { '@type': 'Person', name: 'Habeeb Ismaila', url: 'https://hbeedigitals.com/about' })
  const noAuthorRows = [row('no-author-article', { author: null })]
  const seoNone = await makeLoader({ react: { ...React, cache: (fn) => fn }, '@/lib/supabase': mockSupabase(noAuthorRows) })('src/lib/site/insights-data.ts').getInsightSeo('no-author-article')
  deepEq(JSON.parse(JSON.stringify(seoNone.blogPostingLd.author)), { '@id': 'https://hbeedigitals.com#organization' }, 'missing author → Organization reference')
  assert.ok(!JSON.stringify(seoNone.blogPostingLd).includes('"Person"'), 'no invented Person')
  for (const seo of [seoNamed, seoNone]) {
    assert.equal(seo.blogPostingLd['@type'], 'BlogPosting')
    deepEq(JSON.parse(JSON.stringify(seo.blogPostingLd.publisher)), { '@id': 'https://hbeedigitals.com#organization' })
    assert.equal(seo.breadcrumbLd['@type'], 'BreadcrumbList')
    assert.ok(!/FAQPage/.test(JSON.stringify(seo)), 'no FAQPage markup')
  }
  assert.equal(seoNone.author, 'Hbee Digitals', 'metadata author text still falls back to the publisher name')

  /* ═══ Contact ═══ */
  const contactSections = load('src/components/site/contact/ContactSections.tsx')
  const intro = renderToStaticMarkup(React.createElement(contactSections.ContactIntro))
  const ways = renderToStaticMarkup(React.createElement(contactSections.ContactOtherWays))
  assert.equal((intro.match(/<h1\b/g) || []).length, 1)
  assert.equal(intro.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)[1].replace(/<[^>]+>/g, '').trim(), 'Contact Hbee Digitals')
  assert.match(intro, /Already know what you want to talk about\? Tell us about the project, service, partnership or question and\s+we’ll take it from there\./)
  assert.ok(!/12–24|12-24|Typically replies/i.test(intro + ways), 'no response-time promise on the page')
  assert.equal(((intro + ways).match(/href="\/growth-review"/g) || []).length, 1, 'exactly one Growth Review bridge')
  assert.match(intro, /Not sure what needs fixing\?/)
  assert.match(ways, /Already know the service\?/)
  for (const slug of sixSlugs) assert.ok(ways.includes(`href="/services/${slug}"`), `contact links ${slug}`)
  assert.match(ways, /href="\/client-login"/, 'Client Portal route kept')
  assert.ok(intro.includes('data-form="contact"'), 'the form is still the page form')

  for (const file of ['src/components/site/contact/ContactForm.tsx', 'src/components/site/contact/ContactSections.tsx', 'src/lib/emails/contact-acknowledgement.ts', 'src/app/(site)/contact/page.tsx'])
    assert.ok(!/12–24|12-24/.test(read(file)), `${file} carries no 12–24 hour promise`)

  const formSource = read('src/components/site/contact/ContactForm.tsx')
  for (const field of ['name', 'email', 'company', 'website', 'enquiryType', 'budget', 'timeline', 'message']) assert.match(formSource, new RegExp(`'${field}'`), `form keeps ${field}`)
  assert.match(formSource, /const REQUIRED: EnquiryField\[\] = \['name', 'email', 'enquiryType', 'message'\]/, 'budget and timeline stay optional')
  assert.match(formSource, /form_type: 'enquiry'/)

  const contactPage = makeLoader({ ...rendererMocks, '@/lib/site/seo': { pageMetadata: (input) => input }, '@/components/site/contact/ContactSections': { ContactIntro: () => null, ContactOtherWays: () => null } })('src/app/(site)/contact/page.tsx')
  const contactTree = contactPage.default()
  const contactScripts = contactTree.props.children.filter((c) => c && c.type === 'script').map((c) => JSON.parse(c.props.dangerouslySetInnerHTML.__html))
  const contactLd = contactScripts.find((s) => s['@type'] === 'ContactPage')
  assert.ok(contactLd, 'ContactPage emitted')
  deepEq(contactLd.publisher, { '@id': 'https://hbeedigitals.com#organization' })
  assert.ok(contactScripts.some((s) => s['@type'] === 'BreadcrumbList'))
  assert.ok(!/LocalBusiness|areaServed|FAQPage|"@type":"Organization"/.test(JSON.stringify(contactScripts)), 'no LocalBusiness / areaServed / FAQPage / duplicate Organization')
  assert.equal(contactPage.metadata.absoluteTitle, 'Contact Hbee Digitals | Start a Conversation')
  assert.ok(contactPage.metadata.description.length <= 160 && !/12–24/.test(contactPage.metadata.description))

  console.log('S4.2 Insights + Contact checks passed')
})().catch((error) => {
  console.error(error)
  process.exit(1)
})
