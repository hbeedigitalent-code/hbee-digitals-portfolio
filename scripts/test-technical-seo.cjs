// Offline Phase B2 checks. No environment, database, storage or network writes.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

function loadTypeScript(file, mocks = {}) {
  const source = read(file)
  const output = ts.transpileModule(source, {
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
    return require(name)
  }
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console, Date, URL }, { filename: file })
  return mod.exports
}

const capabilitySlugs = [
  'brand-positioning',
  'digital-systems',
  'creative-ugc',
  'discovery-traffic',
  'commerce-experience',
  'retention-growth',
]

async function main() {
  const queryCalls = []
  const rows = {
    portfolio_items: [
      { slug: 'valid-case-study', client_name: 'Valid Client', updated_at: '2026-09-01T12:00:00Z' },
      { slug: 'valid-without-date', title: 'Valid title', updated_at: 'not-a-date' },
      { slug: 'portfolio', client_name: 'Reserved' },
      { slug: 'bad/path', client_name: 'Invalid' },
      { slug: 'missing-client', client_name: '   ' },
    ],
    blog_posts: [
      { slug: 'published-insight', title: 'Published insight', updated_at: '2026-09-02T12:00:00Z', published_at: '2026-08-20T12:00:00Z' },
      { slug: 'published-fallback-date', title: 'Fallback date', updated_at: 'invalid', published_at: '2026-08-21T12:00:00Z' },
      { slug: 'external-canonical', title: 'Cross-post', canonical_url: 'https://publisher.example/original', published_at: '2026-08-21T12:00:00Z' },
      { slug: 'bad/insight', title: 'Bad slug', published_at: '2026-08-21T12:00:00Z' },
      { slug: 'missing-title', title: '   ', published_at: '2026-08-21T12:00:00Z' },
    ],
  }
  let creativeOn = false
  const caseStudyRows = [{ slug: 'valid-case-study' }]
  const supabase = {
    from(table) {
      const call = { table, operations: [] }
      queryCalls.push(call)
      const chain = {
        select(fields) { call.operations.push(['select', fields]); return chain },
        eq(field, value) { call.operations.push(['eq', field, value]); return chain },
        then(resolve) {
          // The flag-on Case Study lookup is its own query (select 'slug, is_case_study').
          const selected = call.operations.find((op) => op[0] === 'select')?.[1]
          return Promise.resolve(resolve({ data: String(selected).includes('is_case_study') ? caseStudyRows : rows[table], error: null }))
        },
      }
      return chain
    },
  }
  const text = (value) => typeof value === 'string' && value.trim() ? value.trim() : undefined
  const isValidPortfolioSlug = (slug) => typeof slug === 'string' && /^[a-z0-9_]+(?:-[a-z0-9_]+)*$/.test(slug) && slug !== 'portfolio'
  const insightCanonical = (slug, stored) => {
    if (!stored) return `https://hbeedigitals.com/insights/${slug}`
    try {
      const url = new URL(stored)
      return /(^|\.)hbeedigitals\.com$/i.test(url.hostname) ? `https://hbeedigitals.com/insights/${slug}` : url.toString().replace(/\/$/, '')
    } catch {
      return `https://hbeedigitals.com/insights/${slug}`
    }
  }
  const sitemapModule = loadTypeScript('src/app/sitemap.ts', {
    '@/lib/supabase': { supabase },
    '@/components/site/capability/capability-content': { CAPABILITY_DETAILS: Object.fromEntries(capabilitySlugs.map((slug) => [slug, {}])) },
    '@/lib/site/home-data': { text, isValidPortfolioSlug },
    '@/lib/blog-utils': { insightCanonical },
    '@/lib/portfolio-creative': { portfolioCreativeEnabled: () => creativeOn },
  })
  const sitemap = await sitemapModule.default()
  const byUrl = new Map(sitemap.map((entry) => [entry.url, entry]))

  const staticPaths = ['', '/services', '/work', '/how-we-work', '/insights', '/about', '/growth-review', '/contact', '/privacy', '/terms', '/cookies']
  for (const route of staticPaths) {
    const entry = byUrl.get(`https://hbeedigitals.com${route}`)
    assert.ok(entry, `Sitemap includes ${route || '/'}`)
    assert.equal(entry.lastModified, undefined, 'Code-owned pages do not claim request-time freshness')
  }
  for (const slug of capabilitySlugs) {
    const entry = byUrl.get(`https://hbeedigitals.com/services/${slug}`)
    assert.ok(entry, `Sitemap includes capability ${slug}`)
    assert.equal(entry.lastModified, undefined)
  }
  assert.ok(!byUrl.has('https://hbeedigitals.com/case-studies'), 'Flag off: no Case Studies route in the sitemap')
  assert.ok(!queryCalls.some((c) => c.operations.some((op) => op[0] === 'select' && String(op[1]).includes('is_case_study'))), 'Flag off: the sitemap never reads is_case_study')
  assert.equal(byUrl.get('https://hbeedigitals.com/work/valid-case-study').lastModified.toISOString(), '2026-09-01T12:00:00.000Z')
  assert.equal(byUrl.get('https://hbeedigitals.com/work/valid-without-date').lastModified, undefined)
  assert.ok(!byUrl.has('https://hbeedigitals.com/work/portfolio'))
  assert.ok(!byUrl.has('https://hbeedigitals.com/work/bad/path'))
  assert.ok(!byUrl.has('https://hbeedigitals.com/work/missing-client'))
  assert.equal(byUrl.get('https://hbeedigitals.com/insights/published-insight').lastModified.toISOString(), '2026-09-02T12:00:00.000Z')
  assert.equal(byUrl.get('https://hbeedigitals.com/insights/published-fallback-date').lastModified.toISOString(), '2026-08-21T12:00:00.000Z')
  assert.ok(!byUrl.has('https://hbeedigitals.com/insights/external-canonical'))
  assert.ok(!byUrl.has('https://hbeedigitals.com/insights/bad/insight'))
  assert.ok(!byUrl.has('https://hbeedigitals.com/insights/missing-title'))
  assert.ok(sitemap.every((entry) => entry.url.startsWith('https://hbeedigitals.com') && !entry.url.includes('?')))
  assert.ok(sitemap.every((entry) => !/(\/admin|\/api|\/client-|\/unsubscribe|\/portfolio|\/blog)/.test(entry.url)))

  const portfolioQuery = queryCalls.find((call) => call.table === 'portfolio_items')
  const insightQuery = queryCalls.find((call) => call.table === 'blog_posts')
  assert.ok(portfolioQuery.operations.some((op) => op[0] === 'eq' && op[1] === 'is_active' && op[2] === true))
  assert.ok(portfolioQuery.operations.some((op) => op[0] === 'select' && /updated_at/.test(op[1])))
  assert.ok(insightQuery.operations.some((op) => op[0] === 'eq' && op[1] === 'status' && op[2] === 'published'))

  const robots = loadTypeScript('src/app/robots.ts').default()
  assert.deepEqual(Array.from(robots.rules[0].disallow), ['/admin', '/admin-2fa-challenge', '/client-portal', '/api'])
  assert.ok(!robots.rules[0].disallow.includes('/_next'))
  assert.equal(robots.sitemap, 'https://hbeedigitals.com/sitemap.xml')
  assert.equal(robots.host, 'https://hbeedigitals.com')

  const { pageMetadata } = loadTypeScript('src/lib/site/seo.ts', {
    '@/lib/blog-utils': { SITE_URL: 'https://hbeedigitals.com', DEFAULT_OG_IMAGE: '/svgs/og-image.jpg' },
  })
  const metadata = pageMetadata({ title: 'Work', description: 'Real work.', path: '/work' })
  assert.equal(metadata.alternates.canonical, 'https://hbeedigitals.com/work')
  assert.equal(metadata.openGraph.url, 'https://hbeedigitals.com/work')
  assert.equal(metadata.openGraph.images[0].url, 'https://hbeedigitals.com/svgs/og-image.jpg')
  assert.equal(metadata.twitter.card, 'summary_large_image')
  assert.ok(!metadata.alternates.canonical.includes('?'))

  const nextConfig = require(path.join(root, 'next.config.js'))
  const redirects = await nextConfig.redirects()
  const hostRedirect = redirects[0]
  assert.deepEqual(hostRedirect.has, [{ type: 'host', value: 'www.hbeedigitals.com' }])
  assert.equal(hostRedirect.destination, 'https://hbeedigitals.com/:path*')
  assert.equal(hostRedirect.permanent, true)
  const redirectMap = new Map(redirects.filter((redirect) => !redirect.has).map((redirect) => [redirect.source, redirect.destination]))
  for (const [source, destination] of redirectMap) {
    assert.notEqual(source, destination, `No redirect loop at ${source}`)
    if (destination.startsWith('/')) assert.ok(!redirectMap.has(destination), `${source} redirects in one hop, not through ${destination}`)
  }
  for (const [source, destination] of [
    ['/home', '/'], ['/index', '/'], ['/projects', '/work'], ['/portfolio', '/work'], ['/portfolio/:slug', '/work/:slug'],
    ['/blog', '/insights'], ['/blog/:slug', '/insights/:slug'], ['/process', '/how-we-work'],
    ['/growth-readiness', '/growth-review'], ['/assessment', '/growth-review'],
  ]) assert.equal(redirectMap.get(source), destination)

  const headerRules = await nextConfig.headers()
  const noindexSources = new Set(headerRules.filter((rule) => rule.headers.some((header) => header.key === 'X-Robots-Tag')).map((rule) => rule.source))
  for (const source of [
    '/admin/:path*', '/admin-2fa-challenge', '/client-portal/:path*', '/client-login', '/client-signup',
    '/client-confirmation', '/client-reset-password', '/portal-invitation', '/client-onboarding/:path*',
    '/growth-review/received', '/unsubscribe', '/api/:path*',
  ]) assert.ok(noindexSources.has(source), `X-Robots-Tag protects ${source}`)

  for (const layout of ['src/app/(client-auth)/layout.tsx', 'src/app/client-portal/layout.tsx', 'src/app/(utility)/layout.tsx']) {
    assert.match(read(layout), /export const metadata: Metadata = NOINDEX/)
  }
  const servicePage = read('src/app/(site)/services/[capability]/page.tsx')
  assert.match(servicePage, /'@type': 'Service'/)
  assert.match(servicePage, /'@type': 'BreadcrumbList'/)
  assert.match(servicePage, /provider: \{ '@id': `\$\{SITE_URL\}#organization` \}/)
  const structuredData = read('src/components/StructuredData.tsx')
  assert.match(structuredData, /https:\/\/hbeedigitals\.com#organization/)
  assert.ok(!structuredData.includes('ProfessionalService'), 'Global schema does not duplicate the Organization as a second business entity')

  const publicMetadataFiles = [
    'src/app/(site)/page.tsx', 'src/app/(site)/about/page.tsx', 'src/app/(site)/services/page.tsx',
    'src/app/(site)/services/[capability]/page.tsx', 'src/app/(site)/work/page.tsx', 'src/app/(site)/work/[slug]/page.tsx',
    'src/app/(site)/how-we-work/page.tsx', 'src/app/(site)/insights/page.tsx', 'src/app/(site)/insights/[slug]/page.tsx',
    'src/app/(site)/growth-review/page.tsx', 'src/app/(site)/contact/page.tsx',
  ]
  for (const file of publicMetadataFiles) assert.match(read(file), /pageMetadata\(|generateMetadata/, `${file} owns route metadata`)
  assert.match(read('src/lib/site/work-data.ts'), /\.eq\('is_active', true\)/)
  assert.match(read('src/lib/site/insights-data.ts'), /\.eq\('status', 'published'\)/)
  assert.match(read('src/lib/site/insights-data.ts'), /'@type': 'BlogPosting'/)

  for (const asset of ['public/svgs/og-image.jpg', 'public/svgs/twitter-image.jpg', 'public/favicon.ico', 'public/apple-touch-icon.png', 'public/site.webmanifest']) {
    assert.ok(fs.existsSync(path.join(root, asset)), `${asset} exists`)
  }
  for (const asset of ['public/svgs/og-image.jpg', 'public/svgs/twitter-image.jpg']) {
    const image = await sharp(path.join(root, asset)).metadata()
    assert.ok(image.width >= 1200 && image.height >= 630, `${asset} has social-card resolution`)
    assert.ok(Math.abs(image.width / image.height - 1200 / 630) < 0.01, `${asset} has 1.91:1 social-card aspect ratio`)
  }

    // Flag on: a Case Study is listed once, at its canonical page, plus the library route.
  creativeOn = true
  const flagged = new Map((await sitemapModule.default()).map((entry) => [entry.url, entry]))
  assert.ok(flagged.has('https://hbeedigitals.com/case-studies/valid-case-study'))
  assert.ok(!flagged.has('https://hbeedigitals.com/work/valid-case-study'), 'No duplicate /work URL for a Case Study')
  assert.ok(flagged.has('https://hbeedigitals.com/case-studies'))
  assert.ok(flagged.has('https://hbeedigitals.com/work/valid-without-date'), 'Standard Work keeps its /work URL')
  creativeOn = false

  console.log('PASS: canonical-only sitemap and truthful dates; active/published route eligibility; robots asset access; apex host and one-hop redirects; route-family noindex; public canonical/OG/Twitter metadata; current Service/Breadcrumb/Organization schema; Work/Insights guards; social and icon assets.')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
