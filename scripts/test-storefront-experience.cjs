// Offline Phase 1 checks. No environment, data/storage writes or external fetches.
const assert = require('node:assert/strict')
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm')
const ts = require('typescript'), React = require('react'), postcss = require('postcss')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..'), modules = new Map(), events = new Map(), scrolls = [], navigations = []
let active, storedConsent = null, reduced = false, focused = false, onDocumentResize, resizeDisconnected = false
let observerAvailable = true
const intersections = [], preferenceEvents = new Map()
const preference = {
  get matches() { return reduced },
  addEventListener: (name, callback) => preferenceEvents.set(name, callback),
  removeEventListener: name => preferenceEvents.delete(name),
}
class MockIntersectionObserver {
  constructor(callback, options) { this.callback = callback; this.options = options; this.disconnected = false; intersections.push(this) }
  observe(node) { this.node = node }
  disconnect() { this.disconnected = true }
}
const documentElement = { scrollHeight: 2600 }
class MockResizeObserver {
  constructor(callback) { onDocumentResize = callback }
  observe(element) { assert.equal(element, documentElement) }
  disconnect() { resizeDisconnected = true }
}
const browser = {
  scrollY: 0, innerHeight: 800,
  localStorage: { getItem: () => storedConsent },
  addEventListener: (name, handler) => events.set(name, handler),
  removeEventListener: name => events.delete(name),
  matchMedia: () => preference, scrollTo: options => scrolls.push(options),
}
const hooks = { ...React,
  useState(initial) { if (!active) return React.useState(initial); const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = initial; return [h.state[i], value => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value }] },
  useRef(initial) { if (!active) return React.useRef(initial); const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = { current: initial }; return h.state[i] },
  useEffect(fn) { if (!active) return React.useEffect(fn); const h = active, i = h.index++; if (!h.state[i]) { h.state[i] = true; h.effects.push(fn) } },
}
const MockImage = ({ fill, priority, unoptimized, ...props }) => React.createElement('img', props)
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (modules.has(file)) return modules.get(file).exports
  const mod = { exports: {} }; modules.set(file, mod)
  const localRequire = name => {
    if (name === 'react') return hooks
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/image') return { __esModule: true, default: MockImage }
    if (name === '@/components/site/fonts') return { manrope: { variable: 'test-manrope' } }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.endsWith('.css')) return {}
    if (name.includes('supabase')) throw Error('No database access in presentation tests')
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: localRequire, URL, get IntersectionObserver() { return observerAvailable ? MockIntersectionObserver : undefined }, ResizeObserver: MockResizeObserver, window: browser, document: { documentElement, getElementById: id => id === 'main-content' ? { focus: options => { assert.equal(options.preventScroll, true); focused = true } } : null }, console }, { filename: file })
  return mod.exports
}
function host(Component, node) { const h = { index: 0, state: [], effects: [], cleanups: [], tree: null }; h.render = () => { active = h; h.index = 0; h.tree = Component(); active = null; if (node && h.tree?.ref) h.tree.ref.current = node; for (const effect of h.effects.splice(0)) { const cleanup = effect(); if (cleanup) h.cleanups.push(cleanup) } return h.tree }; return h }
const render = (Component, props) => renderToStaticMarkup(React.createElement(Component, props))

const { SiteFooter } = load('src/components/site/layout/SiteFooter.tsx')
const nav = load('src/components/site/navigation.ts')
const footer = render(SiteFooter)
for (const column of nav.FOOTER_COLUMNS) for (const link of column.links) assert.ok(footer.includes(`href="${link.href}"`), link.href)
for (const link of nav.LEGAL_LINKS) assert.ok(footer.includes(`href="${link.href}"`))
assert.ok(footer.includes(`mailto:${nav.CONTACT_EMAIL}`))
assert.equal((footer.match(/<details/g) || []).length, nav.FOOTER_COLUMNS.length)
assert.ok(!footer.includes('<details open'), 'Mobile groups start collapsed without JS')
assert.match(footer, /data-newsletter-slot="reserved"/)
assert.ok(!/<form|type="email"|Subscribed|successfully subscribed/.test(footer), 'No nonfunctional signup form or fake success')
assert.ok(!/instagram.com|linkedin.com|youtube.com|x.com/.test(footer), 'No invented social profiles')
const customFooter = render(SiteFooter, { social: [{ label: 'Provided profile', href: 'https://example.test/profile' }] })
assert.match(customFooter, /https:\/\/example.test\/profile/)
assert.match(customFooter, /noopener noreferrer/)
assert.ok(footer.includes('class="wordmark"'))
const wordmark = footer.match(/<p[^>]*class="wordmark"[^>]*>(.*?)<\/p>/)[1]
assert.equal(wordmark.replace(/<[^>]*>/g, ''), 'The Hbee Digitals')
assert.match(wordmark, /aria-hidden="true"/)
assert.equal((wordmark.match(/class="character"/g) || []).length, 'The Hbee Digitals'.length)
const letterIndices = [...wordmark.matchAll(/--wordmark-index:(\d+)/g)].map(match => Number(match[1]))
assert.deepEqual(letterIndices, Array.from({ length: 17 }, (_, i) => i), 'Each character, including spaces, has a sequential delay')
assert.match(footer, /<svg[^>]*aria-hidden="true"[^>]*class="boundary"/)
assert.match(footer, /vector-effect="non-scaling-stroke"/)
const footerCss = postcss.parse(fs.readFileSync(path.join(root, 'src/components/site/layout/site-footer.module.css'), 'utf8'))
footerCss.walkRules(rule => {
  if ((rule.selector.includes('.link:') || rule.selector.includes('.contact:')) && /hover|focus-visible/.test(rule.selector)) {
    assert.deepEqual(rule.nodes.map(node => node.prop), ['color'], 'Footer link feedback only changes text color; site keyboard focus ring remains')
  }
})
const wordmarkCss = footerCss.nodes.find(node => node.selector === '.wordmark')
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'font-weight' && node.value === '700'))
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'font-style' && node.value === 'normal'))
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'color' && node.value === 'var(--hb-orange)'))
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'text-align' && node.value === 'center'))
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'opacity' && node.value === '0.4'))
assert.ok(wordmarkCss.nodes.some(node => node.prop === 'font-size' && node.value === 'clamp(2rem, 11vw, 10rem)'))
const boundaryCss = footerCss.nodes.find(node => node.selector === '.boundary')
assert.ok(boundaryCss.nodes.some(node => node.prop === 'color' && node.value === 'var(--hb-blue)'))
assert.ok(!boundaryCss.nodes.some(node => /animation|transition/.test(node.prop)), 'Boundary is a static finished path, including reduced motion')
const staggerCss = footerCss.nodes.find(node => node.selector === ".wordmark[data-wordmark='revealed'] .character")
assert.ok(staggerCss.nodes.some(node => node.prop === 'animation' && node.value.includes('380ms') && node.value.includes('42ms') && !node.value.includes('infinite')))
const reducedCss = footerCss.nodes.find(node => node.type === 'atrule' && node.params === '(prefers-reduced-motion: reduce)')
const staticCharacters = reducedCss.nodes.find(node => node.selector === '.wordmark .character')
for (const [prop, value] of [['animation', 'none'], ['opacity', '1'], ['transform', 'none']]) assert.ok(staticCharacters.nodes.some(node => node.prop === prop && node.value === value && node.important))

const { FooterWordmark } = load('src/components/site/layout/FooterWordmark.tsx')
const wordmarkNode = { identity: 'wordmark-container' }
const signature = host(FooterWordmark, wordmarkNode)
signature.render(); signature.render()
assert.equal(signature.tree.type, 'p'); assert.equal(signature.tree.props.className, 'wordmark')
const observer = intersections.at(-1)
assert.equal(observer.node, wordmarkNode, 'Observe the wordmark itself, not the footer; works without a surface motion gate')
assert.equal(signature.tree.props['data-wordmark'], 'waiting')
observer.callback([{ isIntersecting: false }]); signature.render(); assert.equal(signature.tree.props['data-wordmark'], 'waiting')
observer.callback([{ isIntersecting: true }]); signature.render(); assert.equal(signature.tree.props['data-wordmark'], 'revealed')
assert.equal(observer.disconnected, true)
observer.callback([{ isIntersecting: false }]); signature.render(); assert.equal(signature.tree.props['data-wordmark'], 'revealed', 'Leaving view does not reset or loop the animation')
reduced = true; preferenceEvents.get('change')(); signature.render(); assert.equal(signature.tree.props['data-wordmark'], 'static')
observer.callback([{ isIntersecting: true }]); signature.render(); assert.equal(signature.tree.props['data-wordmark'], 'static', 'Queued intersection cannot restart after reduced-motion change')
for (const cleanup of signature.cleanups) cleanup(); assert.equal(preferenceEvents.size, 0)
const countBeforeReduced = intersections.length, staticSignature = host(FooterWordmark, wordmarkNode)
staticSignature.render(); staticSignature.render(); assert.equal(staticSignature.tree.props['data-wordmark'], 'static'); assert.equal(intersections.length, countBeforeReduced)
reduced = false; observerAvailable = false
const unsupportedSignature = host(FooterWordmark, wordmarkNode)
unsupportedSignature.render(); unsupportedSignature.render(); assert.equal(unsupportedSignature.tree.props['data-wordmark'], 'static', 'No observer falls back to a finished wordmark')
observerAvailable = true

const { SiteScrollToTop } = load('src/components/site/layout/SiteScrollToTop.tsx')
const consent = load('src/lib/cookie-consent.ts')
const utility = host(SiteScrollToTop)
assert.equal(utility.render(), null); utility.render()
browser.scrollY = 900; events.get('scroll')(); assert.equal(utility.render(), null, 'Cookie controls take priority before consent choice')
events.get(consent.COOKIE_CONSENT_EVENT)(); utility.render()
assert.equal(utility.tree.props['aria-label'], 'Scroll to top')
const progressRing = () => utility.tree.props.children[0].props.children.props
assert.equal(progressRing().strokeDashoffset, 50, 'Halfway down the scrollable distance draws half the ring')
assert.equal(progressRing().stroke, 'var(--hb-orange)')
browser.scrollY = 1800; events.get('scroll')(); utility.render(); assert.equal(progressRing().strokeDashoffset, 0)
browser.scrollY = 3000; events.get('scroll')(); utility.render(); assert.equal(progressRing().strokeDashoffset, 0, 'Overscroll is clamped')
browser.scrollY = 900; documentElement.scrollHeight = 4400; onDocumentResize(); utility.render(); assert.equal(progressRing().strokeDashoffset, 75, 'Async document growth updates progress')
documentElement.scrollHeight = 800; onDocumentResize(); utility.render(); assert.equal(progressRing().strokeDashoffset, 100, 'Non-scrollable page cannot divide by zero')
documentElement.scrollHeight = 2600; onDocumentResize(); utility.render()
utility.tree.props.onClick(); assert.equal(scrolls.at(-1).behavior, 'smooth'); assert.equal(focused, true)
reduced = true; utility.tree.props.onClick(); assert.equal(scrolls.at(-1).behavior, 'instant')
assert.match(utility.tree.props.className, /safe-area-inset-bottom/)
browser.scrollY = 0; events.get('scroll')(); assert.equal(utility.render(), null)
browser.scrollY = 900; events.get('scroll')(); utility.render(); assert.ok(utility.tree)
storedConsent = null; events.get('storage')({ key: consent.COOKIE_CONSENT_KEY }); assert.equal(utility.render(), null)
storedConsent = 'declined'; events.get('storage')({ key: consent.COOKIE_CONSENT_KEY }); assert.ok(utility.render())
browser.innerHeight = 2000; events.get('resize')(); assert.equal(utility.render(), null)
for (const cleanup of utility.cleanups) cleanup(); assert.equal(events.size, 0); assert.equal(resizeDisconnected, true)

const { SiteNotFound } = load('src/components/site/not-found/SiteNotFound.tsx')
const missing = render(SiteNotFound)
assert.equal((missing.match(/<h1/g) || []).length, 1)
assert.match(missing, /Looks like this/); assert.match(missing, /connection broke/)
assert.match(missing, /href="\/"/); assert.match(missing, /href="\/work"/)
assert.match(missing, /Return Home/); assert.match(missing, /Explore Our Work/)
assert.match(missing, /aria-hidden="true"/); assert.match(missing, /\/svgs\/logo.png/)
assert.ok(!/<form|type="search"/.test(missing), 'No fake search experience')
const rootMissing = load('src/app/not-found.tsx')
assert.equal(rootMissing.metadata.robots, null)
const rootHtml = render(rootMissing.default)
assert.match(rootHtml, /data-surface="site"/); assert.equal((rootHtml.match(/<main/g) || []).length, 1)
const siteMissing = render(load('src/app/(site)/not-found.tsx').default)
assert.ok(!siteMissing.includes('<header'), 'Site-level boundary reuses its existing chrome')

const { TestimonialQuote } = load('src/components/site/proof/TestimonialQuote.tsx')
const quoteHtml = render(TestimonialQuote, { quote: { id: 'fixture', name: 'Fixture', quote: '<script>exact wording</script>' } })
assert.match(quoteHtml, /&lt;script&gt;exact wording&lt;\/script&gt;/)
assert.match(quoteHtml, /aria-hidden="true"/); assert.match(quoteHtml, /rounded-br-/)
assert.ok(!/rating|★/.test(quoteHtml))
for (const file of ['src/components/site/layout/site-footer.module.css', 'src/components/site/not-found/not-found.module.css']) {
  const css = postcss.parse(fs.readFileSync(path.join(root, file), 'utf8'))
  assert.ok(css.nodes.some(node => node.type === 'atrule' && node.params === '(prefers-reduced-motion: reduce)'), 'Interactive presentation has reduced-motion handling')
}
const layout = fs.readFileSync(path.join(root, 'src/app/(site)/layout.tsx'), 'utf8')
assert.match(layout, /<SiteScrollToTop \/>/); assert.ok(!fs.readFileSync(path.join(root, 'src/components/site/layout/SiteFooter.tsx'), 'utf8').includes('SiteScrollToTop'))
const homeData = fs.readFileSync(path.join(root, 'src/lib/site/home-data.ts'), 'utf8')
assert.ok(homeData.includes(".eq('featured', true)"), 'Homepage work query requires explicit featuring')
assert.ok(homeData.includes('.filter((row) => row.featured === true)'), 'Homepage work defensively excludes unfeatured rows')
assert.ok(homeData.includes(".eq('is_featured', true)"), 'Homepage insight query requires editorial featuring')
assert.ok(homeData.includes('.filter((row) => row.is_featured === true)'), 'Homepage insights defensively exclude unfeatured rows')
assert.ok(!/row\.metric_(?:value|label)/.test(homeData), 'Homepage work does not publish unverified CMS metrics')
const blogEditor = fs.readFileSync(path.join(root, 'src/components/admin/BlogPostEditor.tsx'), 'utf8')
assert.ok(blogEditor.includes('https://hbeedigitals.com/growth-review'))
assert.ok(!blogEditor.includes('https://hbeedigitals.com/contact'))
const structuredData = fs.readFileSync(path.join(root, 'src/components/StructuredData.tsx'), 'utf8')
assert.ok(structuredData.includes('https://facebook.com/thehbeedigitals'))
assert.ok(structuredData.includes('https://instagram.com/thehbeedigitals'))
for (const genericProfile of ['https://facebook.com\"', 'https://instagram.com\"', 'linkedin.com', 'twitter.com', 'x.com']) assert.ok(!structuredData.includes(genericProfile), `No generic or unverified sameAs profile: ${genericProfile}`)
const rootLayout = fs.readFileSync(path.join(root, 'src/app/layout.tsx'), 'utf8')
assert.ok(!rootLayout.includes("creator: '@hbeedigitals'"), 'No unverified X creator metadata')
console.log('PASS: footer config/links/native mobile disclosures/newsletter reservation/editorial wordmark/color-only hover; scroll progress/clamping/document resize/cookie priority/safe area/reduced motion/focus/cleanup; root and site 404 semantics/actions/branding; quote escaping/visual treatment; reduced-motion CSS. No browser screenshots, animation, or HTTP routing assertions.')
