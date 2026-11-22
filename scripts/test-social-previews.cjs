// Social-preview images (Open Graph / Twitter) — behaviour tests.
//
//   node scripts/test-social-previews.cjs                      offline: the real raster, the metadata helpers, the real page
//                                                              generateMetadata functions (CMS data stubbed), and the real card route
//                                                              with the real renderer (article data stubbed)
//   node scripts/test-social-previews.cjs --live [origin]      ALSO fetch production (or `origin`) with crawler user agents and check the
//                                                              tags and the image files. Run it after a deploy. It does not prove that
//                                                              WhatsApp / LinkedIn have refreshed THEIR cached preview.
//
// WHAT THIS DOES NOT PROVE: how a given app lays the card out, or that a platform's own cache has been refreshed.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')
const ts = require('typescript')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
process.chdir(root)
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const stripComments = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

// Windows-only: Next 14's compiled next/og breaks on path.join('file:///…') (see scripts/build-og-default.cjs). Production is Linux.
const nodePath = require('node:path')
const nativeJoin = nodePath.join
nodePath.join = (...p) => (typeof p[0] === 'string' && p[0].startsWith('file:') ? nodePath.posix.join(...p) : nativeJoin(...p))

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

// ── loader: TS/TSX → CommonJS with "@/" aliases and per-test module overrides ──────────────────────────────────────────────
let loadId = 0
function makeLoader(overrides = {}) {
  const id = ++loadId
  const cache = new Map()
  function load(relative) {
    const file = path.resolve(root, relative)
    if (cache.has(file)) return cache.get(file).exports
    const mod = { exports: {} }
    cache.set(file, mod)
    const requireFn = (name) => {
      if (Object.prototype.hasOwnProperty.call(overrides, name)) return overrides[name]
      if (name.startsWith('@/')) {
        const base = 'src/' + name.slice(2)
        for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) if (fs.existsSync(path.join(root, base + ext))) return load(base + ext)
        throw new Error('cannot resolve ' + name + ' (loader ' + id + ')')
      }
      return require(name)
    }
    const js = ts.transpileModule(read(relative), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
    }).outputText
    new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports)
    return mod.exports
  }
  return load
}

// ── helpers ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function jpegSize(b) {
  assert.ok(b[0] === 0xff && b[1] === 0xd8, 'JPEG signature')
  let i = 2
  while (i < b.length) {
    if (b[i] !== 0xff) { i++; continue }
    const m = b[i + 1]
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }
    i += 2 + b.readUInt16BE(i + 2)
  }
  throw new Error('no JPEG frame header')
}
const pngSize = (b) => { assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'PNG signature'); return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) } }
const isHttps = (u) => { try { return new URL(u).protocol === 'https:' } catch { return false } }

const DEFAULT_FILE = 'public/og/hbee-og-default.jpg'
const SITE = 'https://hbeedigitals.com'

;(async () => {
  const load = makeLoader()
  const social = load('src/lib/site/social-image.ts')
  const seo = load('src/lib/site/seo.ts')

  console.log('Default image (the real file)')

  await test('P1 the default is a REAL 1200×630 JPEG, plainly encoded and small — not an SVG, not a renamed file, not 1.4 MB', async () => {
    const b = fs.readFileSync(path.join(root, DEFAULT_FILE))
    assert.ok(!/^\s*(<\?xml|<svg)/i.test(b.subarray(0, 200).toString('utf8')), 'not SVG')
    assert.deepEqual(jpegSize(b), { width: 1200, height: 630 }, 'true pixel size')
    const meta = await sharp(b).metadata()
    assert.equal(meta.format, 'jpeg'); assert.equal(meta.width, 1200); assert.equal(meta.height, 630); assert.equal(meta.isProgressive, false, 'baseline JPEG')
    assert.ok(b.length < 200 * 1024, 'under 200 KB, got ' + Math.round(b.length / 1024) + ' KB')
    assert.ok(Math.abs(1200 / 630 - 1.905) < 0.01)
  })

  await test('P2 the retired image is no longer referenced by any code: nothing declares /svgs/og-image.jpg or /svgs/twitter-image.jpg', () => {
    const files = execSync('git ls-files "src/**/*.ts" "src/**/*.tsx"', { cwd: root }).toString().trim().split('\n').concat(['src/lib/site/social-image.ts', 'src/lib/site/og-card.tsx', 'src/app/og/[kind]/[slug]/route.tsx'])
    const hits = files.filter((f) => fs.existsSync(path.join(root, f)) && /svgs\/(og-image|twitter-image)\.jpg/.test(stripComments(read(f))))
    assert.deepEqual(hits, [])
    assert.equal(social.DEFAULT_SOCIAL_IMAGE_PATH, '/og/hbee-og-default.jpg'); assert.equal(load('src/lib/blog-utils.ts').DEFAULT_OG_IMAGE, social.DEFAULT_SOCIAL_IMAGE_PATH)
  })

  console.log('\nMetadata helper and root layout')

  await test('P3 pageMetadata: the default image, true dimensions and type, absolute https, Twitter large card, correct canonical, one image', () => {
    const cases = [['/', SITE], ['/growth-review', SITE + '/growth-review'], ['/bfcm-readiness-checklist', SITE + '/bfcm-readiness-checklist'], ['/services', SITE + '/services'], ['/how-we-work', SITE + '/how-we-work'], ['/about', SITE + '/about'], ['/work', SITE + '/work'], ['/insights', SITE + '/insights']]
    for (const [p, canonical] of cases) {
      const m = seo.pageMetadata({ title: 'T', description: 'D', path: p })
      assert.equal(m.alternates.canonical, canonical, p + ' canonical unchanged'); assert.equal(m.openGraph.url, canonical)
      assert.equal(m.openGraph.images.length, 1, p + ' exactly one og image'); const img = m.openGraph.images[0]
      assert.equal(img.url, SITE + '/og/hbee-og-default.jpg'); assert.ok(isHttps(img.url)); assert.equal(img.width, 1200); assert.equal(img.height, 630); assert.equal(img.type, 'image/jpeg'); assert.ok(img.alt && img.alt.length > 20, 'a descriptive alt')
      assert.equal(m.twitter.card, 'summary_large_image'); assert.equal(m.twitter.images.length, 1); assert.equal(m.twitter.images[0].url, img.url); assert.equal(m.twitter.images[0].alt, img.alt)
    }
    // a deliberate custom image is used as given, with its own (true) size
    const card = social.generatedSocialImage('insights', 'my-article', 'Alt text', ['Title'])
    const c = seo.pageMetadata({ title: 'T', description: 'D', path: '/insights/my-article', socialImage: card })
    assert.equal(c.openGraph.images[0].url, card.url); assert.equal(c.twitter.images[0].url, card.url)
  })

  await test('P4 the root layout inherits the same default (so a page that declares nothing still has a real 1200×630 image) and declares no conflicting image', () => {
    const layout = stripComments(read('src/app/layout.tsx'))
    assert.match(layout, /defaultSocialImage\(\)/); assert.ok(!/og-image|twitter-image/.test(layout))
    assert.equal((layout.match(/images:/g) || []).length, 2, 'one for openGraph, one for twitter')
  })

  console.log('\nGenerated cards (articles and projects)')

  await test('P5 card URLs: absolute https, versioned by content, a true 1200×630 PNG, deterministic; only known kinds and safe slugs', () => {
    const a = social.generatedSocialImage('insights', 'product-page-questions-before-black-friday', 'Alt', ['7 Product Page Questions'])
    assert.match(a.url, /^https:\/\/hbeedigitals\.com\/og\/insights\/product-page-questions-before-black-friday\?v=[0-9a-f]{8}$/)
    assert.deepEqual([a.width, a.height, a.type], [1200, 630, 'image/png'])
    assert.equal(a.url, social.generatedSocialImage('insights', 'product-page-questions-before-black-friday', 'Different alt', ['7 Product Page Questions']).url, 'same content, same URL')
    assert.notEqual(a.url, social.generatedSocialImage('insights', 'product-page-questions-before-black-friday', 'Alt', ['A changed title']).url, 'an edited title is a new URL, so no stale preview')
    assert.notEqual(a.url, social.generatedSocialImage('work', 'product-page-questions-before-black-friday', 'Alt', ['7 Product Page Questions']).url)
    assert.ok(social.isCardKind('insights') && social.isCardKind('work') && !social.isCardKind('admin') && !social.isCardKind(undefined))
    for (const bad of ['', 'UPPER', 'has space', '../x', 'a/b', 'x_y', '-lead', 'trail-', 'a--b']) assert.equal(social.CARD_SLUG_PATTERN.test(bad), false, JSON.stringify(bad))
    assert.equal(social.CARD_SLUG_PATTERN.test('first-five-things-customers-should-understand-about-your-brand'), true)
  })

  await test('P6 title fitting: sizes by length, word-boundary truncation, no control characters, emoji or unsupported symbols; never empty', () => {
    assert.deepEqual({ ...social.fitCardTitle('Short title') }, { text: 'Short title', fontSize: 76 })
    assert.equal(social.fitCardTitle('x'.repeat(41)).fontSize, 64); assert.equal(social.fitCardTitle('x'.repeat(71)).fontSize, 56)
    const long = social.fitCardTitle('Why your Shopify store is not appearing in Google — and the seven things to check first, even if your product pages are already well optimised for conversion')
    assert.ok(long.text.length <= 100 && long.text.endsWith('…') && !/\s…$/.test(long.text), long.text); assert.equal(long.fontSize, 56)
    assert.equal(social.fitCardTitle('Klaviyo flows 🚀 your\n\tShopify store ✅ needs first').text, 'Klaviyo flows your Shopify store needs first')
    assert.equal(social.fitCardTitle('Café — “quotes” & €5').text, 'Café — “quotes” & €5', 'accents, dashes, curly quotes and the euro survive')
    for (const empty of ['', '   ', null, undefined, '🚀🚀']) assert.equal(social.fitCardTitle(empty).text, 'Hbee Digitals')
  })

  console.log('\nPage metadata (the real generateMetadata functions)')
  const PORTRAIT = 'https://pxcickkwopkpbqofjmlg.supabase.co/storage/v1/object/public/blog-images/1795363323680-flyer-03-nov22-1080x1350.png'
  const noop = () => null

  await test('P7 an Insights article with a PORTRAIT 1080×1350 featured image: the preview is the generated 1200×630 card, never the raw image; canonical, og:url and Twitter correct', async () => {
    const slug = 'product-page-questions-before-black-friday'
    const insightSeo = { title: 'SEO title', description: 'Desc', ogTitle: '7 Product Page Questions to Answer Before Black Friday', ogDescription: 'OG desc', author: 'Hbee', keywords: [], canonical: SITE + '/insights/' + slug, image: PORTRAIT, imageAlt: 'portrait alt', publishedAt: '2026-11-22', modifiedAt: '2026-11-22', blogPostingLd: {}, breadcrumbLd: {} }
    const l = makeLoader({ 'next/navigation': { notFound: noop }, '@/components/site/insights/InsightDetail': { InsightDetailPage: noop }, '@/lib/site/insights-data': { getInsightSeo: async (s) => (s === slug ? insightSeo : null), getInsightDetail: async () => null } })
    const meta = await l('src/app/(site)/insights/[slug]/page.tsx').generateMetadata({ params: { slug } })
    const og = meta.openGraph; assert.equal(og.images.length, 1); const img = og.images[0]
    assert.match(img.url, new RegExp('^https://hbeedigitals\\.com/og/insights/' + slug + '\\?v=[0-9a-f]{8}$')); assert.ok(!img.url.includes('supabase'), 'the CMS image is not the preview')
    assert.deepEqual([img.width, img.height, img.type], [1200, 630, 'image/png'], 'declared size is the TRUE size of the card')
    assert.ok(/Hbee Digitals Insights/.test(img.alt))
    assert.equal(meta.twitter.card, 'summary_large_image'); assert.equal(meta.twitter.images[0].url, img.url)
    assert.equal(meta.alternates.canonical, insightSeo.canonical); assert.equal(og.url, insightSeo.canonical); assert.equal(og.type, 'article'); assert.equal(og.title, insightSeo.ogTitle)
    assert.ok(!JSON.stringify(meta).includes(PORTRAIT), 'the portrait image appears nowhere in the social metadata')
    assert.deepEqual({ ...(await l('src/app/(site)/insights/[slug]/page.tsx').generateMetadata({ params: { slug: 'missing' } })) }.title, 'Article not found')
    // the page body and structured data still use the real featured image (untouched)
    assert.match(read('src/app/(site)/insights/[slug]/page.tsx'), /blogPostingLd/)
  })

  await test('P8 work and case-study pages get the same treatment: a generated card with true dimensions instead of an unmeasured hero image', async () => {
    const workSeo = { title: 'Zappyo', description: 'Selected work', image: 'https://x.supabase.co/a.jpg', imageAlt: 'hero' }
    const l = makeLoader({
      'next/navigation': { notFound: noop, redirect: noop }, '@/components/site/work/WorkDetail': { WorkDetailPage: noop }, '@/components/site/work/CaseStudySections': { CaseStudyPage: noop },
      '@/lib/portfolio-creative': { portfolioCreativeEnabled: () => true }, '@/lib/site/page-schema': { pageJsonLd: noop },
      '@/lib/site/work-data': { getWorkSeo: async (s) => (s === 'zappyo' ? workSeo : null), getWorkDetail: async () => null, getNextWork: async () => null, getRelatedWork: async () => [] },
    })
    for (const [file, p] of [['src/app/(site)/work/[slug]/page.tsx', '/work/zappyo'], ['src/app/(site)/case-studies/[slug]/page.tsx', '/case-studies/zappyo']]) {
      const meta = await l(file).generateMetadata({ params: { slug: 'zappyo' } }); const img = meta.openGraph.images[0]
      assert.match(img.url, /^https:\/\/hbeedigitals\.com\/og\/work\/zappyo\?v=[0-9a-f]{8}$/, file); assert.deepEqual([img.width, img.height, img.type], [1200, 630, 'image/png'])
      assert.equal(meta.alternates.canonical, SITE + p); assert.equal(meta.openGraph.url, SITE + p); assert.equal(meta.twitter.images[0].url, img.url); assert.ok(!JSON.stringify(meta).includes('supabase'))
    }
  })

  console.log('\nThe card route (real renderer, article data stubbed)')
  const png = async (res) => Buffer.from(await res.arrayBuffer())
  const params = (kind, slug) => ({ params: { kind, slug } })

  await test('P9 GET /og/insights/{slug}: a real 1200×630 PNG, small, correctly typed and cached; titles come from the stored record; work cards use the project name', async () => {
    const seen = []
    const stubs = {
      '@/lib/site/insights-data': { getInsightSeo: async (s) => (s === 'good-article' ? { ogTitle: '7 Product Page Questions to Answer Before Black Friday' } : null) },
      '@/lib/site/work-data': { getWorkSeo: async (s) => (s === 'zappyo' ? { title: 'Zappyo' } : null) },
    }
    const route = makeLoader(stubs)('src/app/og/[kind]/[slug]/route.tsx')
    for (const [kind, slug] of [['insights', 'good-article'], ['work', 'zappyo']]) {
      const res = await route.GET(new Request('https://hbeedigitals.com/og/' + kind + '/' + slug), params(kind, slug))
      assert.equal(res.status, 200, kind); assert.match(res.headers.get('content-type'), /^image\/png/)
      const cc = res.headers.get('cache-control'); assert.match(cc, /public/); assert.match(cc, /s-maxage=\d+/); assert.ok(!/no-store|private/.test(cc))
      const b = await png(res); assert.deepEqual(pngSize(b), { width: 1200, height: 630 }); assert.ok(b.length < 150 * 1024, kind + ' card ' + Math.round(b.length / 1024) + ' KB')
      const meta = await sharp(b).metadata(); assert.equal(meta.format, 'png'); seen.push(b)
    }
    assert.notDeepEqual(seen[0], seen[1], 'different content, different card')
    assert.equal(route.runtime, 'nodejs')
  })

  await test('P10 the route refuses unknown kinds, unsafe slugs and unpublished / missing records with a plain 404, and never reaches the database for a bad slug', async () => {
    let lookups = 0
    const route = makeLoader({ '@/lib/site/insights-data': { getInsightSeo: async () => { lookups++; return null } }, '@/lib/site/work-data': { getWorkSeo: async () => { lookups++; return null } } })('src/app/og/[kind]/[slug]/route.tsx')
    for (const [kind, slug] of [['admin', 'x'], ['insights', '../../etc/passwd'], ['insights', 'Bad_Slug'], ['work', 'a b'], ['insights', 'x'.repeat(200)], ['', 'x']]) {
      const res = await route.GET(new Request('https://hbeedigitals.com/x'), params(kind, slug)); assert.equal(res.status, 404, kind + '/' + slug); assert.match(res.headers.get('content-type'), /text\/plain/)
    }
    assert.equal(lookups, 0, 'no lookup for invalid input')
    const missing = await route.GET(new Request('https://hbeedigitals.com/x'), params('insights', 'not-published')); assert.equal(missing.status, 404); assert.equal(lookups, 1)
  })

  await test('P11 if a card cannot be rendered the static Hbee default is served instead (short cache); if that fails too, a clear 500 — never a broken image with a 200', async () => {
    const real = globalThis.fetch
    const stubs = { '@/lib/site/insights-data': { getInsightSeo: async () => ({ ogTitle: 'T' }) }, '@/lib/site/work-data': { getWorkSeo: async () => null }, '@/lib/site/og-card': { loadOgAssets: async () => { throw new Error('assets missing') }, renderTitleCard: () => null } }
    const route = makeLoader(stubs)('src/app/og/[kind]/[slug]/route.tsx')
    const jpeg = fs.readFileSync(path.join(root, DEFAULT_FILE)); const asked = []
    try {
      globalThis.fetch = async (u) => { asked.push(String(u)); return new Response(jpeg, { status: 200, headers: { 'content-type': 'image/jpeg' } }) }
      const ok = await route.GET(new Request('https://hbeedigitals.com/x'), params('insights', 'good-article'))
      assert.equal(ok.status, 200); assert.equal(ok.headers.get('content-type'), 'image/jpeg'); assert.match(ok.headers.get('cache-control'), /max-age=300/); assert.ok(!/s-maxage/.test(ok.headers.get('cache-control')), 'short cache only')
      assert.deepEqual(asked, [SITE + '/og/hbee-og-default.jpg']); assert.deepEqual(jpegSize(await png(ok)), { width: 1200, height: 630 })
      globalThis.fetch = async () => { throw new Error('network down') }
      const bad = await route.GET(new Request('https://hbeedigitals.com/x'), params('insights', 'good-article')); assert.equal(bad.status, 500); assert.equal(bad.headers.get('cache-control'), 'no-store')
    } finally { globalThis.fetch = real }
  })

  console.log('\nScope and relationships')

  await test('P12 the share row still shares the article\'s own Hbee URL (not a cross-post canonical, no tracking parameters); canonical rules and the sanitizer are untouched', () => {
    const detail = read('src/components/site/insights/InsightDetail.tsx')
    assert.match(detail, /url=\{`\$\{SITE_URL\}\$\{insightHref\(detail\.slug\)\}`\}/)
    const changed = execSync('git status --porcelain --untracked-files=all', { cwd: root }).toString().split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => !f.startsWith('campaign-assets/'))
    const allowed = new Set(['next.config.js', 'public/og/hbee-og-default.jpg', 'scripts/build-og-default.cjs', 'scripts/test-social-previews.cjs', 'scripts/test-technical-seo.cjs', 'scripts/test-insight-share.cjs', 'src/app/(site)/case-studies/[slug]/page.tsx', 'src/app/(site)/insights/[slug]/page.tsx', 'src/app/(site)/work/[slug]/page.tsx',
      'src/app/layout.tsx', 'src/app/og/[kind]/[slug]/route.tsx', 'src/assets/og/README.md', 'src/assets/og/Inter-500.ttf', 'src/assets/og/Manrope-700.ttf', 'src/assets/og/Manrope-800.ttf', 'src/assets/og/hbee-lockup.png', 'src/assets/og/hbee-system.jpg', 'src/lib/blog-utils.ts', 'src/lib/site/og-card.tsx', 'src/lib/site/seo.ts', 'src/lib/site/social-image.ts'])
    assert.deepEqual(changed.filter((f) => !allowed.has(f)), [], 'unexpected files changed')
    assert.ok(!changed.some((f) => /\.sql$|\/admin\/|client-portal|\/portal|growth-review\//i.test(f)), 'no SQL, admin, portal or Growth Review file')
    for (const forbidden of ['src/lib/site/insights-data.ts', 'src/lib/site/work-data.ts', 'src/components/site/insights/InsightArticleBody.tsx', 'package.json', 'package-lock.json']) assert.ok(!changed.includes(forbidden), forbidden + ' untouched')
    assert.equal(execSync('git diff --stat -- src/lib/blog-utils.ts', { cwd: root }).toString().includes('insightCanonical'), false)
    assert.match(read('src/lib/blog-utils.ts'), /export function insightCanonical\(slug: string, stored\?: string\) \{\s*const own = `\$\{SITE_URL\}\$\{insightHref\(slug\)\}`/)
  })

  await test('P13 the function bundle ships the card assets; every asset the renderer reads exists', () => {
    assert.match(read('next.config.js'), /outputFileTracingIncludes:\s*\{\s*'\/og\/\[kind\]\/\[slug\]': \['\.\/src\/assets\/og\/\*\*\/\*'\]/)
    const card = read('src/lib/site/og-card.tsx'); const used = [...card.matchAll(/join\(process\.cwd\(\), '([^']+)'\)/g)].map((m) => m[1])
    assert.equal(used.length, 5); for (const f of used) assert.ok(fs.existsSync(path.join(root, f)), f + ' exists')
    assert.ok(read('src/app/robots.ts') && !/\/og/.test(read('src/app/robots.ts')), 'robots does not block /og')
  })

  // ── optional: live crawler-style check ───────────────────────────────────────────────────────────────────────────────────
  const liveAt = process.argv.indexOf('--live')
  if (liveAt !== -1) {
    const origin = (process.argv[liveAt + 1] && !process.argv[liveAt + 1].startsWith('--') ? process.argv[liveAt + 1] : SITE).replace(/\/$/, '')
    console.log('\nLive (' + origin + ')')
    const UAS = { WhatsApp: 'WhatsApp/2.23.20.0 A', LinkedIn: 'LinkedInBot/1.0 (compatible; Mozilla/5.0; +http://www.linkedin.com)', Facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', Twitter: 'Twitterbot/1.0' }
    const pages = ['/', '/growth-review', '/bfcm-readiness-checklist', '/services', '/how-we-work', '/about', '/work', '/insights', '/insights/product-page-questions-before-black-friday']
    const imgCache = new Map()
    for (const p of pages) {
      await test('L ' + p + ' — tags and image for every crawler', async () => {
        for (const [name, ua] of Object.entries(UAS)) {
          const html = await (await fetch(origin + p, { headers: { 'user-agent': ua }, redirect: 'follow' })).text()
          const meta = (k) => [...html.matchAll(/<meta[^>]+>/g)].map((m) => m[0]).filter((t) => t.includes(k)).map((t) => (t.match(/content="([^"]*)"/) || [])[1])
          const img = meta('property="og:image"'); assert.equal(img.length, 1, name + ': exactly one og:image'); assert.ok(isHttps(img[0]), name + ': https'); assert.equal(meta('twitter:card')[0], 'summary_large_image'); assert.equal(meta('twitter:image"')[0], img[0])
          assert.equal(meta('og:image:width')[0], '1200'); assert.equal(meta('og:image:height')[0], '630'); assert.ok(meta('og:image:type')[0])
          if (!imgCache.has(img[0])) {
            const r = await fetch(img[0], { headers: { 'user-agent': ua } }); assert.equal(r.status, 200, 'image status'); const b = Buffer.from(await r.arrayBuffer())
            const dims = b[0] === 0xff ? jpegSize(b) : pngSize(b); imgCache.set(img[0], { type: r.headers.get('content-type'), size: b.length, dims })
          }
          const info = imgCache.get(img[0]); assert.match(info.type, /^image\/(jpeg|png)/); assert.deepEqual(info.dims, { width: 1200, height: 630 }, 'true size ' + JSON.stringify(info.dims) + ' for ' + img[0]); assert.ok(info.size < 300 * 1024, 'size ' + Math.round(info.size / 1024) + ' KB')
        }
      })
    }
  }

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  if (failures.length) process.exit(1)
})()
