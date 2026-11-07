// Offline checks for the Insight reading-progress line. No browser, network or database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')
function load(file, mocks = {}) {
  const output = ts.transpileModule(read(file), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText
  const mod = { exports: {} }
  const localRequire = (name) => {
    if (name in mocks) return mocks[name]
    throw new Error(`Unexpected dependency: ${name}`)
  }
  vm.runInNewContext(output, { module: mod, exports: mod.exports, require: localRequire, console, Number, Math, window: globalThis.window, document: globalThis.document, ResizeObserver: globalThis.ResizeObserver }, { filename: file })
  return mod.exports
}

/* -- Calculation ------------------------------------------------ */
const { readingProgress } = load('src/components/site/insights/reading-progress.ts')
// Hero above the article, Related/CTA/footer below it. Header 80px, viewport 800px.
const layout = { viewportHeight: 800, headerHeight: 80, articleTop: 700, articleHeight: 3000 }
const at = (scrollY, extra = {}) => readingProgress({ ...layout, scrollY, ...extra })
const startScroll = 700 - 80
const endScroll = 700 + 3000 - 800
assert.equal(at(0), 0, 'page top is 0%')
assert.equal(at(startScroll), 0, 'article top under the header is 0%')
assert.ok(at(startScroll + 1) > 0 && at(startScroll + 1) < 0.01, 'progress starts increasing immediately')
assert.ok(Math.abs(at((startScroll + endScroll) / 2) - 0.5) < 1e-9, 'midpoint is 50%')
assert.ok(at(1500) > at(1000) && at(2000) > at(1500), 'progress increases monotonically while reading')
assert.equal(at(endScroll), 1, 'article end reaching the viewport bottom is 100%')
assert.equal(at(-50), 0, 'never below 0')
assert.equal(at(endScroll + 5000), 1, 'never above 1: Related Insights, CTA and footer scroll past at 100%')
// Dynamic height: a taller article (images loaded) re-scales the same scroll position.
assert.ok(at(1500, { articleHeight: 6000 }) < at(1500), 'recalculation after the article grows lowers progress at the same position')
assert.equal(readingProgress({ ...layout, scrollY: 0, articleHeight: 0 }), 0, 'empty article is 0')
assert.equal(readingProgress({ ...layout, scrollY: NaN }), 0, 'invalid measurement is 0')
assert.equal(readingProgress({ ...layout, articleHeight: 300, scrollY: 0 }), 0, 'short article not yet reached')
assert.equal(readingProgress({ ...layout, articleHeight: 300, scrollY: 700 }), 1, 'short article that fits in view counts as read once reached')

/* -- Component behaviour (effect run against a fake DOM) -------- */
let effect
const fakeReact = { useRef: () => fakeReact.ref, useEffect: (fn) => { effect = fn } }
const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }

const listeners = new Map()
const observed = []
let disconnected = false
let cancelledFrame = null
const scheduled = []
const bar = { style: {} }
fakeReact.ref = { current: bar }
const win = {
  scrollY: 1500,
  innerHeight: 800,
  addEventListener: (name, fn, options) => listeners.set(name, { fn, options }),
  removeEventListener: (name, fn) => { if (listeners.get(name) && listeners.get(name).fn === fn) listeners.delete(name) },
  requestAnimationFrame: (fn) => { scheduled.push(fn); return scheduled.length },
  cancelAnimationFrame: (id) => { cancelledFrame = id },
}
const main = { id: 'main' }
// getBoundingClientRect().top is viewport-relative: document top 700 minus scroll.
const article = { getBoundingClientRect: () => ({ top: 700 - win.scrollY, height: 3000 }), closest: () => main }
const header = { getBoundingClientRect: () => ({ height: 80 }) }
globalThis.window = win
globalThis.document = {
  getElementById: (id) => (id === 'insight-article' ? article : null),
  querySelector: (selector) => (selector === '[data-surface="site"] > header' ? header : null),
  fonts: { ready: Promise.resolve() },
}
globalThis.ResizeObserver = class {
  observe(el) { observed.push(el) }
  disconnect() { disconnected = true }
}

const { InsightReadingProgress } = load('src/components/site/insights/InsightReadingProgress.tsx', {
  react: fakeReact,
  'react/jsx-runtime': jsx,
  './reading-progress': { readingProgress },
  './insights.module.css': { progress: 'progress', progressBar: 'progressBar' },
})
const tree = InsightReadingProgress({ articleId: 'insight-article' })
assert.equal(tree.props['aria-hidden'], 'true', 'decorative: hidden from assistive tech')
assert.equal(tree.props.role, undefined, 'no progressbar role, so no live announcements')
assert.equal(JSON.stringify(tree).includes('%'), false, 'no percentage text')

const cleanup = effect()
assert.equal(bar.style.transform, `scaleX(${readingProgress({ ...layout, scrollY: 1500 })})`, 'initial paint measures the article')
assert.equal(listeners.get('scroll').options.passive, true, 'scroll listener is passive')
assert.ok(listeners.has('resize'), 'viewport resize is handled')
assert.deepEqual(observed, [article, main], 'article and surrounding main are observed for dynamic height')
win.scrollY = 3000
listeners.get('scroll').fn()
listeners.get('scroll').fn()
assert.equal(scheduled.length, 1, 'scroll bursts are coalesced into one animation frame')
scheduled.shift()()
assert.equal(bar.style.transform, `scaleX(${readingProgress({ ...layout, scrollY: 3000 })})`, 'frame update writes the transform directly')
listeners.get('resize').fn()
assert.equal(scheduled.length, 1, 'resize schedules a recalculation')
cleanup()
assert.equal(listeners.size, 0, 'all window listeners removed on unmount')
assert.equal(disconnected, true, 'observer disconnected on unmount')
assert.equal(cancelledFrame, 1, 'pending animation frame cancelled on unmount')

/* -- Source guards ---------------------------------------------- */
const component = read('src/components/site/insights/InsightReadingProgress.tsx')
const css = read('src/components/site/insights/insights.module.css')
const block = css.slice(css.indexOf('.progress {'))
assert.ok(!/useState/.test(component), 'no React state updates on scroll')
assert.ok(!/scrollHeight|document\.body/.test(component), 'never measured from whole-document height')
assert.match(block, /var\(--hb-blue\)/, 'existing Hbee blue token')
assert.ok(!/#[0-9a-f]{3,8}\b/i.test(block), 'no arbitrary hex colour')
assert.match(block, /top: calc\(var\(--hb-header-height\) \+ 1px\)/, 'anchored from the real header height token, not a magic number')
assert.match(block, /height: 4px/)
assert.match(block, /top: -4px/, 'bottom edge stays on the header boundary; the extra pixel grows upward into the header, never into the content')
assert.match(block, /pointer-events: none/)
assert.ok(!/transition|animation/.test(block), 'no motion to disable: reduced-motion users still get accurate updates')
const detail = read('src/components/site/insights/InsightDetail.tsx')
assert.match(detail, /<InsightReadingProgress articleId=\{ARTICLE_ID\} \/>/)
assert.match(detail, /<InsightArticleBody html=\{detail\.html\} id=\{ARTICLE_ID\} \/>/)
assert.ok(!read('src/components/site/layout/SiteHeader.tsx').includes('Progress'), 'global header untouched')

console.log('PASS: Insight reading progress - article-bounded 0-100% clamp, related/footer independence, dynamic-height recalculation, rAF coalescing, listener/observer cleanup, decorative a11y, token/offset guards.')
