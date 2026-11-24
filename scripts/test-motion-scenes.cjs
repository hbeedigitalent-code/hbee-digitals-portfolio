// Offline checks for the reversible scroll-progress foundation and the homepage scenes. No browser, network or data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
function loadTs(file) {
  const mod = { exports: {} }
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: () => ({}) }, { filename: file })
  return mod.exports
}

const m = loadTs('src/components/site/motion/scene-progress.ts')
const range = { anchor: 'center', from: 0.85, to: 0.35 }
const scene = { docTop: 2000, height: 400 }
const at = (scrollY, r = range, extra = {}) => m.sceneProgress(scene, { scrollY, viewportHeight: 1000, ...extra }, r)

// ── Normalised, clamped, snapped ──
// anchor (scene centre = docTop + 200 = 2200); p = 0 when centre is at 850px of the viewport, 1 at 350px.
assert.equal(at(0), 0, 'far above: exactly 0')
assert.equal(at(1350), 0, 'centre at 850px: start of range')
assert.equal(at(1850), 1, 'centre at 350px: end of range')
assert.equal(at(5000), 1, 'far past: exactly 1 (settled, never > 1)')
const mid = at(1600)
assert.ok(mid > 0.45 && mid < 0.55, 'halfway is about 0.5, got ' + mid)
// ── Reversible: a pure function of scroll offset, so down and back up trace the same path ──
const down = [], up = []
for (let y = 1300; y <= 1900; y += 25) down.push(at(y))
for (let y = 1900; y >= 1300; y -= 25) up.push(at(y))
assert.deepEqual(down, up.slice().reverse(), 'scrolling back retraces the same progress values')
assert.ok(down.every((v, i) => i === 0 || v >= down[i - 1]), 'monotonic while scrolling down')
// ── Snap zones: resting states are exact ──
assert.equal(m.snapProgress(0.019), 0); assert.equal(m.snapProgress(0.981), 1); assert.equal(m.snapProgress(0.5), 0.5)
// ── Anti-jitter ──
assert.equal(m.shouldWriteProgress(0.5, 0.501), false, 'sub-epsilon change is not written')
assert.equal(m.shouldWriteProgress(0.5, 0.51), true)
assert.equal(m.shouldWriteProgress(0.999, 1), true, 'reaching an end state always writes')
assert.equal(m.shouldWriteProgress(null, 0.3), true)
assert.equal(m.shouldWriteProgress(1, 1), false)
assert.equal(m.formatProgress(0), '0'); assert.equal(m.formatProgress(1), '1'); assert.equal(m.formatProgress(0.12345), '0.123')
// ── Anchors and the short-last-scene guarantee ──
assert.equal(m.rawSceneProgress({ docTop: 1000, height: 300 }, { scrollY: 0, viewportHeight: 1000 }, { anchor: 'top', from: 1, to: 0.5 }), 0)
const footer = { docTop: 3000, height: 200 }
const lastRange = { anchor: 'top', from: 0.98, to: 0.5, settleAtEnd: true }
const endScroll = { scrollY: 3200 - 1000 + 0, viewportHeight: 1000, documentHeight: 3200 }
assert.ok(m.rawSceneProgress(footer, { ...endScroll, documentHeight: 99999 }, lastRange) < 1, 'without reaching the end it is still partial')
assert.equal(m.sceneProgress(footer, endScroll, lastRange), 1, 'a scene too short to reach its range still settles at the page end')

// ── Controller / component wiring ──
const controller = read('src/components/site/motion/scene-controller.ts')
assert.match(controller, /addEventListener\('scroll', schedule, \{ passive: true \}\)/, 'one passive scroll listener')
assert.match(controller, /requestAnimationFrame/); assert.match(controller, /IntersectionObserver/); assert.match(controller, /ResizeObserver/)
const frameBody = controller.slice(controller.indexOf('function tick()'), controller.indexOf('function schedule()'))
assert.doesNotMatch(frameBody, /getBoundingClientRect|offsetTop|offsetHeight|clientHeight/, 'no layout reads inside the frame')
assert.ok(controller.indexOf('function measure(') > -1 && /getBoundingClientRect/.test(controller.slice(controller.indexOf('function measure('), controller.indexOf('function measureViewport'))), 'bounds are measured once, off the frame path')
assert.match(controller, /reducedMotion\(\) \|\| typeof IntersectionObserver === 'undefined'[\s\S]{0,120}data-scene-static[\s\S]{0,40}return \(\) => \{\}/, 'reduced motion registers nothing and starts no listeners')
assert.match(controller, /function onPreference[\s\S]{0,200}release/, 'switching to reduced motion mid-session releases scenes')
assert.doesNotMatch(controller, /smooth-?scroll|lenis|gsap|framer/i, 'no global smooth-scroll or animation library')
const scenes = read('src/components/site/motion/SiteScene.tsx')
assert.match(scenes, /registerScene/); assert.match(scenes, /data-scene=\{disabled \? undefined : ''\}/, 'a disabled scene has no scene attribute, so no hidden start state')
const tokens = read('src/styles/site-tokens.css')
const sceneCss = tokens.slice(tokens.indexOf('/* ── Scenes: reversible'))
assert.match(sceneCss, /\[data-scene\] \{\s*--hb-p: 1;/, 'default (no JS / unhydrated) is the complete state')
assert.match(sceneCss, /\[data-motion-ready\] \[data-scene\] \{\s*--hb-p: 0;/, 'start state only behind the pre-paint gate')
assert.match(sceneCss, /prefers-reduced-motion: reduce\) \{\s*\[data-surface='site'\] \[data-scene\] \{ --hb-p: 1 !important/, 'reduced motion forces the final state')
assert.match(sceneCss, /\[data-scene-static\] \{ --hb-p: 1 !important/)
assert.match(sceneCss, /will-change: transform, opacity/); assert.match(sceneCss, /\[data-scene-active\]/, 'will-change only while a scene is active')
assert.doesNotMatch(sceneCss, /transition\s*:/, 'no CSS transition fights the scroll-linked values')
assert.match(sceneCss, /--hb-depth-blur: 0px/, 'blur is removed below desktop')

// ── Growth System rail ──
const growth = read('src/components/site/home/HomeGrowthSystem.tsx')
assert.match(growth, /<SiteScene[^>]*anchor="center"/); assert.doesNotMatch(growth, /data-motion="(rail|step)"/, 'one-shot rail/step reveals replaced')
assert.match(growth, /STAGES\.map/); assert.match(growth, /data-layer/); assert.doesNotMatch(growth, /sticky|position:s*fixed/i, 'section is not pinned')
const homeCss = read('src/components/site/home/home.module.css')
assert.match(homeCss, /\.trackLine \{[^}]*transform: scaleX\(var\(--k, 1\)\)/, 'rail draw is driven by progress (and reverses with it)')
assert.match(homeCss, /\.stage \{[^}]*opacity: var\(--k, 1\)/)
assert.doesNotMatch(homeCss.slice(homeCss.indexOf('.trackLine {\n  transform-origin')), /\.track(Line|Signal)[^{]*\{[^}]*transition/, 'rail has no transition')
// ── Signature Problem field ──
const field = read('src/components/site/home/HomeModuleField.tsx')
for (const key of ['brand', 'experience', 'technology', 'creative', 'discovery', 'growth']) assert.ok(field.includes(`key: '${key}'`), `field keeps ${key}`)
assert.match(field, /\/brand\/modules\/\$\{m\.key\}\.webp/, 'the six real module images are used')
assert.doesNotMatch(field, /hbee-system\.webp/, 'does not imitate the baked Hero artwork')
assert.match(field, /HbeeModuleGlyph/, 'central glyph preserved')
assert.match(field, /<SiteScene as="figure" anchor="center" from=\{0\.8\} to=\{0\.46\} compact=\{\{ from: 0\.85, to: 0\.45 \}\}/, 'reversible scene wiring')
assert.equal((field.match(/soft: true/g) || []).length, 2, 'only two back layers are blurred')
assert.match(field, /data-layer=""[\s\S]{0,80}styles\.item|className=\{cn\(styles\.item/, 'modules are scene layers')
assert.doesNotMatch(field, /SiteReveal/, 'one-shot reveal replaced by the scene')
assert.doesNotMatch(field, /Clarity|Confidence|Decision|Capacity/, 'Conditions words are deliberately left out (they are listed in the next section)')
const modulesCss = read('src/components/site/home/home-modules.module.css')
assert.match(modulesCss, /\.item \{[\s\S]*?translate3d\(calc\(var\(--tx, 0\) \* var\(--k, 1\) \* 1%\)/, 'scattered → ring is transform driven by progress')
assert.doesNotMatch(modulesCss.slice(modulesCss.indexOf('.item {'), modulesCss.indexOf('@keyframes drift')), /transition\s*:/, 'no transition fights the scroll')
assert.doesNotMatch(modulesCss.slice(modulesCss.indexOf('.item {')), /[{;]\s*(top|left|width|height)\s*:[^;]*var\(--k/, 'no layout property is animated')
assert.match(modulesCss, /@media \(max-width: 767px\)[\s\S]*?--mx: -8px; --my: 10px[\s\S]*?--my: 16px/, 'mobile local movement is at most 16px')
assert.match(modulesCss.slice(modulesCss.indexOf('@media (max-width: 767px)')), /\.lines, \.fieldGlyph \{ display: none; \}[\s\S]*\.fieldRail \{\s*display: block/, 'mobile drops the ring and uses a simple rail')
assert.doesNotMatch(modulesCss.slice(modulesCss.indexOf('@media (max-width: 767px)')), /blur\(/, 'no blur on mobile')
assert.match(modulesCss, /--amp: calc\(var\(--amp0, 0px\) \* \(1 - var\(--k, 1\)\)\)/, 'ambient drift settles to still when connected')
const problem = read('src/components/site/home/HomeProblem.tsx')
assert.match(problem, /HomeModuleField/); assert.match(problem, /SYMPTOMS\.map/, 'problem copy and symptoms unchanged')
// Hero untouched by this phase.
for (const file of ['HomeHero.tsx', 'HomeHeroSystem.tsx']) assert.doesNotMatch(read('src/components/site/home/' + file), /SiteScene|data-layer|--hb-p/, file + ' is untouched')

// ── Footer crest + homepage choreography ──
const mode = loadTs('src/components/site/layout/footer-motion-mode.ts').footerMotionMode
assert.equal(mode('/'), 'full'); assert.equal(mode(null), 'calm')
for (const path of ['/privacy', '/terms', '/cookies', '/unsubscribe', '/growth-review/received']) assert.equal(mode(path), 'static', path)
for (const path of ['/insights', '/insights/some-article', '/services', '/services/brand-positioning', '/work', '/about', '/contact']) assert.equal(mode(path), 'calm', path)
const footerSrc = read('src/components/site/layout/SiteFooter.tsx')
assert.match(footerSrc, /<footer data-tone="night"/, 'semantic footer remains'); assert.match(footerSrc, /<FooterCrest \/>/, 'the shared crest renders on every public page')
assert.match(footerSrc, /<details key=\{column\.title\}>/, 'mobile accordions are untouched')
assert.match(footerSrc, /aria-label="Legal"/)
const motionSrc = read('src/components/site/layout/FooterMotion.tsx')
assert.match(motionSrc, /<SiteScene anchor="top" from=\{1\} to=\{0\.5\} settleAtEnd disabled=\{mode !== 'full'\}/, 'choreography is homepage-only, reversible and always settles at the page end')
assert.match(motionSrc, /IntersectionObserver[\s\S]*data-offscreen/, 'crest drift pauses off-screen')
const layers = footerSrc.match(/data-layer=""/g) || []
assert.ok(layers.length >= 7, 'brand, newsletter, nav columns, contact, social and legal rows are layers')
assert.match(footerSrc, /layer\(0\.55, 0\.95\)/, 'legal row settles last')
const crestSrc = read('src/components/site/layout/FooterCrest.tsx')
assert.match(crestSrc, /aria-hidden="true"/); assert.doesNotMatch(crestSrc, /Math\.sin|Math\.cos|\bQ\d|\bC\d|<canvas|webgl/i, 'stepped geometry, not a sine wave; no canvas/WebGL')
assert.equal((crestSrc.match(/<path /g) || []).length, 2, 'two layered surfaces')
const fcss = read('src/components/site/layout/site-footer.module.css')
assert.match(fcss, /:global\(\[data-scene\]\) \.rise \{/, 'entrance styles exist only inside a scene')
assert.match(fcss, /@media \(max-width: 767px\) \{ \.motion \{ --footer-lateral: 0;/, 'no lateral column motion on mobile')
assert.doesNotMatch(fcss.slice(fcss.indexOf('/* Homepage footer entrance'), fcss.indexOf('@media (max-width: 767px) { .motion')), /transition\s*:/, 'no CSS transition on scene-driven properties')
assert.ok(!/will-change/.test(fcss.replace(/\.crestLayer \{ will-change: auto; \}|\[data-scene-active\] \.crest \{ will-change: transform, opacity; \}/g, '')), 'no permanent will-change')

console.log('PASS: motion scenes foundation + Growth System rail + Problem field + footer crest')
