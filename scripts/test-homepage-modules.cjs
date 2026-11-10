// Offline checks for Phase H2: canonical 3D module assets and where they may (and may not) be used.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

;(async () => {
  /* ── Canonical assets: present, transparent, trimmed, not crushed ── */
  const sharp = require('sharp')
  const dir = 'public/brand/modules'
  const expected = { brand: [999, 1014], experience: [917, 915], technology: [1035, 1020], creative: [958, 951], discovery: [919, 909], growth: [1015, 992], 'hbee-system': [1170, 1109] }
  for (const [name, [w, h]] of Object.entries(expected)) {
    const file = path.join(root, dir, `${name}.webp`)
    assert.ok(fs.existsSync(file), `${name}.webp exists`)
    const meta = await sharp(file).metadata()
    assert.equal(meta.format, 'webp')
    assert.equal(meta.hasAlpha, true, `${name} keeps its alpha channel`)
    assert.deepEqual([meta.width, meta.height], [w, h], `${name} intrinsic size matches the width/height the components declare`)
    // Corners must be fully transparent: nothing was flattened onto a background.
    const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    for (const [x, y] of [[0, 0], [meta.width - 1, 0], [0, meta.height - 1], [meta.width - 1, meta.height - 1]]) assert.equal(data[(y * meta.width + x) * 4 + 3], 0, `${name} corner (${x},${y}) is transparent`)
  }

  /* ── Hero: the complete canonical system, real DOM copy, no CSS-built tiles ── */
  const hero = read('src/components/site/home/HomeHero.tsx')
  assert.match(hero, /HomeHeroSystem/); assert.doesNotMatch(hero, /HbeeModuleGroup/, 'hero no longer renders the CSS pseudo-3D group')
  assert.match(hero, /<h1/); assert.match(hero, /Start Growth Review/); assert.match(hero, /Explore Our Work/)
  const heroSystem = read('src/components/site/home/HomeHeroSystem.tsx')
  assert.match(heroSystem, /\/brand\/modules\/hbee-system\.webp/); assert.match(heroSystem, /priority/, 'the hero image is the LCP candidate')
  assert.match(heroSystem, /width=\{1170\}/); assert.match(heroSystem, /height=\{1109\}/, 'aspect ratio preserved')
  assert.doesNotMatch(heroSystem, /unoptimized/)

  /* ── Dark section: the six individual modules, a different composition ── */
  const field = read('src/components/site/home/HomeModuleField.tsx')
  for (const key of ['brand', 'experience', 'technology', 'creative', 'discovery', 'growth']) assert.ok(field.includes(`key: '${key}'`), `field has ${key}`)
  assert.match(field, /\/brand\/modules\/\$\{m\.key\}\.webp/)
  assert.doesNotMatch(field, /hbee-system\.webp/, 'the dark section must not reuse the Hero composition')
  const problem = read('src/components/site/home/HomeProblem.tsx')
  assert.match(problem, /HomeModuleField/); assert.doesNotMatch(problem, /HbeeModuleGroup/)

  /* ── Final Growth Review CTA: five diagnostic areas, never the six business modules ── */
  const sections = read('src/components/site/home/HomeSections.tsx')
  const cta = sections.slice(sections.indexOf('export function HomeFinalCta'))
  assert.match(cta, /DiagnosticSystem/); assert.doesNotMatch(cta, /HbeeModuleGroup|HomeModuleField|HomeHeroSystem|brand\/modules/, 'CTA does not use the six business modules')
  const diag = read('src/components/site/growth-review/growth-review-content.ts')
  for (const area of ['visibility', 'conversion', 'retention', 'authority', 'scalability']) assert.ok(new RegExp(`key: '${area}'`).test(diag), `diagnostic area ${area} still defined`)

  /* ── Motion: transform-only, gated, never touching the artwork ── */
  const css = read('src/components/site/home/home-modules.module.css')
  assert.equal((css.match(/@media \(prefers-reduced-motion: no-preference\)/g) || []).length, 2, 'every animation block is gated on no-preference')
  const outsideGate = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\r?\n\}\r?\n/g, '')
  assert.doesNotMatch(outsideGate, /animation\s*:/, 'no animation declared outside the reduced-motion gate')
  assert.doesNotMatch(css, /filter\s*:|mix-blend-mode|backdrop-filter|object-fit\s*:\s*(cover|fill)/, 'artwork is never filtered, blended, cropped or stretched')
  assert.doesNotMatch(css, /rotate|skew|perspective|scale\(1\.[1-9]/, 'no spin or perspective distortion of the approved angle')
  assert.match(css, /heroIn[\s\S]*?translate3d/)
  assert.doesNotMatch(css.match(/@keyframes heroIn[^}]*\}[^}]*\}/)[0], /opacity/, 'hero entrance cannot delay the LCP image')

  /* ── H1 flat surfaces preserved ── */
  assert.match(read('src/components/site/home/HomeCapabilities.tsx'), /hbee-surface\.module\.css/)
  assert.match(read('src/components/site/home/HomeDiagnostic.tsx'), /hbee-surface\.module\.css/)

  /* ── Phase H3: scroll motion grammar ── */
  const tokensH3 = read('src/styles/site-tokens.css')
  const h3Start = tokensH3.indexOf('/* ── H3 motion families')
  assert.ok(h3Start > -1, 'H3 motion block present')
  const h3 = tokensH3.slice(h3Start, tokensH3.indexOf('@media (prefers-reduced-motion: reduce)', h3Start))
  assert.ok(h3.length > 1500)
  for (const family of ['eyebrow', 'headline', 'soft', 'item', 'rule', 'card', 'visual', 'rail', 'step']) assert.ok(h3.includes(`[data-motion='${family}']`), `family ${family} defined`)
  // Hidden start states exist only under the pre-paint gate, so no-JS / reduced motion / failed hydration show content.
  const gatedH3 = h3.match(/\[data-surface='site'\]\[data-motion-ready\][^{]*\{[^}]*\}/g) || []
  assert.ok(gatedH3.length >= 8, 'hidden states are all behind data-motion-ready')
  const h3OutsideGate = h3.replace(/\[data-surface='site'\]\[data-motion-ready\][^{]*\{[^}]*\}/g, '')
  assert.doesNotMatch(h3OutsideGate, /opacity:\s*0\s*;|112%/, 'no hidden start state declared outside the gate')
  assert.doesNotMatch(h3, /infinite|filter\s*:|blur\(|rotate|skew|perspective|bounce|typewriter/, 'no looping, filtering, spinning or typing effects')
  assert.match(tokensH3, /@media \(prefers-reduced-motion: reduce\)[\s\S]*clip-path: none !important/, 'reduced motion also resets clip-path')
  assert.match(h3, /@media \(max-width: 767px\)[\s\S]*--hb-travel: 10px/, 'phones get shorter travel and tighter stagger')

  const revealH3 = read('src/components/site/motion/SiteReveal.tsx')
  assert.match(revealH3, /observer\.disconnect\(\)/, 'a reveal group plays once and disconnects (never replays)')
  assert.match(revealH3, /boundingClientRect\.bottom < 0/, 'content scrolled past quickly is still revealed, never left hidden')
  assert.doesNotMatch(revealH3, /setRevealed\(false\)/, 'nothing is hidden again after revealing')
  assert.doesNotMatch(revealH3, /addEventListener\(['"]scroll/, 'no continuous scroll handler')

  // Headlines reveal line by line in every named section; ids (aria-labelledby targets) are preserved.
  const homeDir = 'src/components/site/home/'
  const withLines = (src, id) => new RegExp(`id="${id}"[\\s\\S]{0,200}lines=`).test(src)
  for (const [file, id] of [['HomeProblem.tsx', 'home-problem-title'], ['HomeConditions.tsx', 'home-conditions-title'], ['HomeGrowthSystem.tsx', 'home-system-title'], ['HomeCapabilities.tsx', 'home-capabilities-title'], ['HomeSelectedWork.tsx', 'home-work-title'], ['HomeBridge.tsx', 'home-bridge-title']]) {
    assert.ok(withLines(read(homeDir + file), id), `${file} headline uses masked lines and keeps id ${id}`)
  }
  const secH3 = read(homeDir + 'HomeSections.tsx')
  for (const id of ['home-diagnostic-title', 'home-principles-title', 'home-insights-title', 'home-final-title']) assert.ok(withLines(secH3, id), `${id} masked lines`)
  assert.ok(!/SiteReveal/.test(secH3.split('export function HomeProof')[1].split('export function HomePrinciples')[0]), 'testimonials stay plainly visible (not reveal-gated)')
  assert.doesNotMatch(read(homeDir + 'HomeHero.tsx'), /data-motion|SiteReveal/, 'the Hero (LCP, approved in H2) is not gated or re-animated')

  // Sequences.
  const growthH3 = read(homeDir + 'HomeGrowthSystem.tsx')
  assert.ok(growthH3.indexOf('data-motion="rail"') > -1 && growthH3.indexOf('data-motion="step"') > growthH3.indexOf('data-motion="rail"'), 'Growth System: rail first, then steps')
  assert.match(read(homeDir + 'HomeConditions.tsx'), /data-motion="item"/)
  assert.match(read(homeDir + 'home.module.css'), /\.rail:global\(\[data-revealed='true'\]\)::before/, 'Conditions rail draws on reveal')
  assert.match(read(homeDir + 'HomeCapabilities.tsx'), /motion="card"/)
  const ctaH3 = secH3.slice(secH3.indexOf('export function HomeFinalCta'))
  const order = ['motionIndex={0}', 'motionIndex={1}', 'motionIndex={4}', "'--hb-motion-index': 5.5", 'motion="visual" index={6}'].map((t) => ctaH3.indexOf(t))
  assert.ok(order.every((n) => n > -1) && order.every((n, i) => i === 0 || n > order[i - 1]), 'final CTA order: eyebrow, headline, body, controls, diagnostic visual')
  assert.match(ctaH3, /data-gate-motion/, 'the diagnostic is held until the CTA reveal fires')
  assert.match(read('src/components/site/growth-review/growth-review.module.css'), /data-gate-motion[\s\S]{0,260}animation-play-state: paused/, 'gate is scoped to the homepage wrapper')

  // CTA -> footer separation: a deeper surface, an edge, a signal, more air; still night-toned.
  const footerCss = read('src/components/site/layout/site-footer.module.css')
  assert.match(footerCss, /\.footer \{[^}]*#030a15/, 'footer surface is deeper than the CTA Night (#061426)')
  assert.match(footerCss, /\.footer \{[^}]*border-top: 1px solid rgba\(29, 110, 255/, 'footer has an electric top edge')
  assert.match(footerCss, /\.footer::before \{[^}]*background: var\(--hb-orange\)/, 'one orange signal on the divider')
  assert.match(footerCss, /padding-block: clamp\(3\.75rem/, 'more air above the footer content')
  assert.match(read('src/components/site/layout/SiteFooter.tsx'), /data-tone="night"/)

  console.log('PASS: Phase H3 - motion families are gated, one-shot, compositor-only and mobile-reduced; headlines reveal by line; sequences ordered; final CTA visual held until reveal; CTA/footer separated.')

  console.log('PASS: Phase H2 - canonical 3D module assets are transparent, trimmed and intact; Hero uses the complete system, the dark section the six individual modules, the final CTA the five diagnostic areas; motion is gated, transform-only and non-destructive; H1 surfaces preserved.')
})().catch((e) => { console.error(e); process.exitCode = 1 })
