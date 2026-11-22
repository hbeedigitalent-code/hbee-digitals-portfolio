// Insights article share row — behaviour tests.
//
// OFFLINE. No browser and no DOM library is available here, so this proves what can be proved without one:
//   * the pure share logic (URL building and encoding, URL validation, copy, native share and its fallback);
//   * the REAL component rendered on the server with real React (SSR safety, markup, labels, links);
//   * the REAL component's click handlers, driven through a small single-pass hooks harness with faked navigator / clipboard /
//     document, so Copy, the "Link copied" feedback, the legacy fallback and native Share run the component's own code;
//   * static facts: exact placement (once, in the hero, before the body, never at the bottom), browser APIs read only on click,
//     and that nothing else (CMS, sanitizer, schema, other areas) changed.
// WHAT IT DOES NOT PROVE: real layout, tap targets on a device, or a real clipboard / share sheet. Those need a browser.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')
const ts = require('typescript')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const stripComments = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

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

// ── loader: TS/TSX → CommonJS, "@/" aliases, CSS modules as a name-returning proxy ──────────────────────────────────────────
const cache = new Map()
function load(relative, react) {
  // one cache entry per React implementation: every harness gets its OWN copy of the component, bound to its own hooks
  const key = relative + '|' + (react ? 'stub' + react.__id : 'real')
  if (cache.has(key)) return cache.get(key).exports
  const file = path.resolve(root, relative)
  const mod = { exports: {} }
  cache.set(key, mod)
  const requireFn = (name) => {
    if (name === 'react') return react || require('react')
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, k) => String(k) })
    if (name.startsWith('@/')) return load('src/' + name.slice(2) + (path.extname(name) ? '' : '.ts'), react)
    return require(name)
  }
  const js = ts.transpileModule(read(relative), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports)
  return mod.exports
}

const links = load('src/lib/site/share-links.ts')
const URL_ = 'https://hbeedigitals.com/insights/why-stores-lose-sales?utm_source=x&a=b#top'
const TITLE = 'Why stores lose sales — and "fix" #1 & what\'s next?'

;(async () => {
  console.log('Share links (pure)')

  await test('S1 LinkedIn and WhatsApp URLs are exact, encoded once, and decode back to the original title and URL', () => {
    const li = links.linkedInShareUrl(URL_)
    assert.equal(li, 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(URL_))
    const liParsed = new URL(li); assert.equal(liParsed.origin + liParsed.pathname, 'https://www.linkedin.com/sharing/share-offsite/'); assert.equal(liParsed.searchParams.get('url'), URL_)
    assert.equal([...liParsed.searchParams.keys()].join(), 'url', 'only the url parameter')
    const wa = links.whatsAppShareUrl(TITLE, URL_)
    assert.equal(wa, 'https://wa.me/?text=' + encodeURIComponent(TITLE + ' ' + URL_))
    const waParsed = new URL(wa); assert.equal(waParsed.host, 'wa.me'); assert.equal(waParsed.searchParams.get('text'), TITLE + ' ' + URL_, 'exactly "{title} {url}"')
    assert.ok(!/%25[0-9A-F]{2}/i.test(li + wa), 'nothing is double-encoded')
    assert.ok(!/[\s"<>]/.test(li + wa), 'no raw whitespace, quote or angle bracket in either URL')
    assert.equal(links.whatsAppShareUrl('  Padded title  ', URL_), 'https://wa.me/?text=' + encodeURIComponent('Padded title ' + URL_), 'the title is trimmed')
    assert.equal(new URL(links.whatsAppShareUrl('Café — naïve “quotes” 🚀', URL_)).searchParams.get('text'), 'Café — naïve “quotes” 🚀 ' + URL_, 'unicode survives')
  })

  await test('S2 only an absolute https address can be shared; everything else is refused', () => {
    assert.equal(links.isShareableUrl('https://hbeedigitals.com/insights/x'), true)
    for (const bad of ['http://hbeedigitals.com/x', 'javascript:alert(1)', 'data:text/html,x', '/insights/x', '//hbeedigitals.com/x', 'https://user:pw@hbeedigitals.com/x', '', '   ', null, undefined, 42, {}]) assert.equal(links.isShareableUrl(bad), false, String(bad))
  })

  await test('S3 copy: async Clipboard first; the legacy path only when it fails or is missing; never throws', async () => {
    const calls = []
    assert.equal(await links.copyText('T', { clipboard: { writeText: async (t) => calls.push(t) }, legacyCopy: () => assert.fail('legacy not needed') }), true); assert.deepEqual(calls, ['T'])
    assert.equal(await links.copyText('T', { clipboard: { writeText: async () => { throw new Error('denied') } }, legacyCopy: (t) => t === 'T' }), true, 'denied → legacy')
    assert.equal(await links.copyText('T', { clipboard: null, legacyCopy: () => true }), true, 'no clipboard → legacy')
    assert.equal(await links.copyText('T', { clipboard: {}, legacyCopy: () => true }), true, 'no writeText → legacy')
    assert.equal(await links.copyText('T', { clipboard: null, legacyCopy: () => false }), false)
    assert.equal(await links.copyText('T', { clipboard: null, legacyCopy: () => { throw new Error('x') } }), false)
    assert.equal(await links.copyText('T', {}), false)
  })

  await test('S4 native share gets {title, text, url}; a dismissed sheet is silent; any other failure, a refusal or no API falls back to copying the URL', async () => {
    let got = null
    const copied = []
    const base = { clipboard: { writeText: async (t) => copied.push(t) } }
    assert.equal(await links.shareOrCopy('  My title ', URL_, { ...base, share: async (d) => { got = d } }), 'shared')
    assert.deepEqual({ ...got }, { title: 'My title', text: 'My title', url: URL_ }); assert.equal(copied.length, 0, 'no copy when the native sheet works')
    assert.equal(await links.shareOrCopy('T', URL_, { ...base, share: async () => { const e = new Error('dismissed'); e.name = 'AbortError'; throw e } }), 'cancelled'); assert.equal(copied.length, 0, 'cancelling is not an error and does not copy')
    assert.equal(await links.shareOrCopy('T', URL_, { ...base, share: async () => { throw new Error('NotAllowedError-ish') } }), 'copied'); assert.deepEqual(copied, [URL_], 'the URL is copied, not the title')
    copied.length = 0
    assert.equal(await links.shareOrCopy('T', URL_, { ...base, share: async () => assert.fail('must not share'), canShare: () => false }), 'copied'); assert.deepEqual(copied, [URL_])
    copied.length = 0
    assert.equal(await links.shareOrCopy('T', URL_, { ...base }), 'copied', 'no Web Share API'); assert.deepEqual(copied, [URL_])
    assert.equal(await links.shareOrCopy('T', URL_, { clipboard: null, legacyCopy: () => false }), 'failed')
  })

  // ── the real component, server-rendered ────────────────────────────────────────────────────────────────────────────────
  console.log('\nComponent (server render, real React)')
  const React = require('react')
  const { renderToStaticMarkup } = require('react-dom/server')
  const Real = load('src/components/site/insights/ArticleShareActions.tsx').ArticleShareActions

  await test('S5 SSR: no window, navigator or document needed; four labelled controls; exact links; safe external attributes', () => {
    assert.equal(typeof window, 'undefined'); assert.equal(typeof document, 'undefined')
    const html = renderToStaticMarkup(React.createElement(Real, { title: TITLE, url: URL_ }))
    assert.match(html, /Share this insight/)
    for (const label of ['Copy link', 'Share on LinkedIn', 'Share on WhatsApp', 'Share article']) assert.ok(html.includes(`aria-label="${label}"`), 'labelled: ' + label)
    const esc = (s) => s.replace(/&/g, '&amp;')
    assert.ok(html.includes(`href="${esc(links.linkedInShareUrl(URL_))}"`), 'LinkedIn href'); assert.ok(html.includes(`href="${esc(links.whatsAppShareUrl(TITLE, URL_))}"`) || html.includes(`href="${esc(links.whatsAppShareUrl(TITLE, URL_)).replace(/'/g, '&#x27;')}"`), 'WhatsApp href')
    assert.equal((html.match(/target="_blank"/g) || []).length, 2, 'exactly the two external links open a new tab'); assert.equal((html.match(/rel="noopener noreferrer"/g) || []).length, 2)
    assert.equal((html.match(/<button type="button"/g) || []).length, 2, 'Copy and Share are real buttons'); assert.equal((html.match(/<a /g) || []).length, 2)
    assert.equal((html.match(/<svg[^>]*aria-hidden="true"/g) || []).length, 4, 'four decorative inline SVGs, hidden from assistive tech'); assert.ok(!/<(img|script)/.test(html))
    assert.match(html, /<ul[^>]*aria-labelledby="/); assert.match(html, /role="status"[^>]*aria-live="polite"/); assert.ok(!/undefined|\[object/.test(html))
    assert.ok(!html.includes('Link copied'), 'idle state announces nothing')
    // identical output twice: nothing in the first render depends on the browser, so hydration cannot differ
    assert.equal(html.replace(/id="[^"]*"/g, ''), renderToStaticMarkup(React.createElement(Real, { title: TITLE, url: URL_ })).replace(/id="[^"]*"/g, ''))
  })

  await test('S6 invalid input renders nothing instead of a broken link', () => {
    for (const props of [{ title: TITLE, url: 'http://hbeedigitals.com/x' }, { title: TITLE, url: '' }, { title: TITLE, url: 'javascript:alert(1)' }, { title: '   ', url: URL_ }]) assert.equal(renderToStaticMarkup(React.createElement(Real, props)), '', JSON.stringify(props))
  })

  // ── the real component's click handlers, through a single-pass hooks harness ──────────────────────────────────────────────
  console.log('\nComponent (click behaviour, faked browser APIs)')
  let harnessCount = 0
  function harness() {
    const store = { state: [], refs: [], effects: [], cleanups: [], timers: [], i: 0, r: 0 }
    const hooks = {
      useState: (init) => { const idx = store.i++; if (!(idx in store.state)) store.state[idx] = typeof init === 'function' ? init() : init; return [store.state[idx], (v) => { store.state[idx] = typeof v === 'function' ? v(store.state[idx]) : v }] },
      useRef: (init) => { const idx = store.r++; if (!(idx in store.refs)) store.refs[idx] = { current: init }; return store.refs[idx] },
      useEffect: (fn) => { store.effects.push(fn) }, useCallback: (fn) => fn, useId: () => ':r0:',
    }
    const reactStub = { ...React, ...hooks, __id: ++harnessCount }
    const Comp = load('src/components/site/insights/ArticleShareActions.tsx', reactStub).ArticleShareActions
    const render = (props) => { store.i = 0; store.r = 0; store.effects = []; return Comp(props) }
    return { store, render }
  }
  const find = (node, pred, out = []) => { if (!node || typeof node !== 'object') return out; if (pred(node)) out.push(node); const kids = node.props && node.props.children; for (const k of [].concat(kids || [])) find(k, pred, out); return out }
  const control = (tree, label) => find(tree, (n) => n.props && n.props['aria-label'] === label || (n.props && n.props.title === label))[0]
  const statusText = (tree) => find(tree, (n) => n.props && n.props.role === 'status')[0].props.children
  const withGlobals = async (nav, doc, fn) => {
    const realNav = Object.getOwnPropertyDescriptor(globalThis, 'navigator'); const realTimeout = globalThis.setTimeout, realClear = globalThis.clearTimeout
    const timers = []; globalThis.setTimeout = (f, ms) => { timers.push({ f, ms }); return timers.length }; globalThis.clearTimeout = () => {}
    Object.defineProperty(globalThis, 'navigator', { value: nav, configurable: true, writable: true })
    if (doc) globalThis.document = doc
    try { return await fn(timers) } finally {
      if (realNav) Object.defineProperty(globalThis, 'navigator', realNav); else delete globalThis.navigator
      delete globalThis.document; globalThis.setTimeout = realTimeout; globalThis.clearTimeout = realClear
    }
  }
  const PROPS = { title: TITLE, url: URL_ }

  await test('S7 Copy link: copies the canonical URL, swaps the accessible name to "Link copied", announces it, and resets itself', async () => {
    const written = []
    await withGlobals({ clipboard: { writeText: async (t) => { written.push(t) } } }, null, async (timers) => {
      const h = harness(); let tree = h.render(PROPS)
      assert.equal(control(tree, 'Copy link').props['aria-label'], 'Copy link'); assert.equal(statusText(tree), '')
      await control(tree, 'Copy link').props.onClick()
      assert.deepEqual(written, [URL_], 'the article URL, not the page the visitor is on')
      tree = h.render(PROPS)
      assert.equal(find(tree, (n) => n.props && n.props['aria-label'] === 'Link copied').length, 1, 'accessible name changed'); assert.equal(statusText(tree), 'Link copied'); assert.equal(find(tree, (n) => n.type === 'button' && n.props['data-state'] === 'copied').length, 1)
      assert.equal(timers.length, 1); assert.ok(timers[0].ms >= 1500 && timers[0].ms <= 4000, 'feedback is temporary')
      timers[0].f(); tree = h.render(PROPS)
      assert.equal(control(tree, 'Copy link').props['aria-label'], 'Copy link'); assert.equal(statusText(tree), '', 'back to idle')
    })
  })

  await test('S8 Copy link without the async Clipboard API falls back to a legacy copy and restores keyboard focus; if that fails too it says so without an alert', async () => {
    for (const [execResult, expected] of [[true, 'Link copied'], [false, 'Couldn’t copy the link']]) {
      const events = []; const area = { style: {}, setAttribute() {}, select: () => events.push('select'), setSelectionRange() {}, value: '' }
      let focused = false; const doc = { activeElement: { focus: () => { focused = true } }, createElement: () => area, body: { appendChild: () => events.push('append'), removeChild: () => events.push('remove') }, execCommand: (c) => { events.push(c); return execResult } }
      let alerted = false; globalThis.alert = () => { alerted = true }
      await withGlobals({}, doc, async () => {
        const h = harness(); await control(h.render(PROPS), 'Copy link').props.onClick()
        assert.equal(statusText(h.render(PROPS)), expected); assert.equal(area.value, URL_); assert.deepEqual(events, ['append', 'select', 'copy', 'remove']); assert.equal(focused, true, 'focus is given back')
      })
      assert.equal(alerted, false, 'no alert() is ever used'); delete globalThis.alert
    }
  })

  await test('S9 Share: native sheet receives the exact title and URL; a dismissed sheet is silent; no Web Share API copies the URL and says "Link copied"', async () => {
    const shared = [], written = []
    await withGlobals({ share: async (d) => { shared.push(d) }, clipboard: { writeText: async (t) => { written.push(t) } } }, null, async () => {
      const h = harness(); await control(h.render(PROPS), 'Share article').props.onClick()
      assert.equal(shared.length, 1); assert.deepEqual({ ...shared[0] }, { title: TITLE, text: TITLE, url: URL_ }); assert.equal(written.length, 0); assert.equal(statusText(h.render(PROPS)), '')
    })
    await withGlobals({ share: async () => { const e = new Error('x'); e.name = 'AbortError'; throw e }, clipboard: { writeText: async (t) => { written.push(t) } } }, null, async () => {
      const h = harness(); await control(h.render(PROPS), 'Share article').props.onClick(); assert.equal(written.length, 0, 'cancel does not copy'); assert.equal(statusText(h.render(PROPS)), '')
    })
    await withGlobals({ clipboard: { writeText: async (t) => { written.push(t) } } }, null, async () => {
      const h = harness(); await control(h.render(PROPS), 'Share article').props.onClick()
      assert.deepEqual(written, [URL_]); assert.equal(statusText(h.render(PROPS)), 'Link copied')
    })
  })

  await test('S10 the feedback timer is cleared on unmount', async () => {
    await withGlobals({ clipboard: { writeText: async () => {} } }, null, async () => {
      const h = harness(); let tree = h.render(PROPS); await control(tree, 'Copy link').props.onClick(); h.render(PROPS)
      let cleared = 0; const realClear = globalThis.clearTimeout; globalThis.clearTimeout = () => { cleared++ }
      const cleanup = h.store.effects[0](); assert.equal(typeof cleanup, 'function'); cleanup(); globalThis.clearTimeout = realClear
      assert.equal(cleared, 1)
    })
  })

  // ── placement, SSR discipline and scope ──────────────────────────────────────────────────────────────────────────────────
  console.log('\nPlacement and scope')
  await test('S11 exactly one share row, in the hero after title, meta and summary and before the body; none at the bottom; one reusable component', () => {
    const detail = read('src/components/site/insights/InsightDetail.tsx').split(String.fromCharCode(13)).join('')
    assert.equal((detail.match(/<ArticleShareActions/g) || []).length, 1, 'rendered once')
    const at = (s) => detail.indexOf(s)
    assert.ok(at('<h1 id="insight-title"') < at('<InsightMeta') && at('<InsightMeta') < at('{detail.excerpt &&') && at('{detail.excerpt &&') < at('<ArticleShareActions'), 'below title, meta and summary')
    const heroStart = at('function InsightHero'); const heroEnd = detail.indexOf('function ArticleToc', heroStart)
    assert.ok(at('<ArticleShareActions') > heroStart && at('<ArticleShareActions') < heroEnd, 'inside the hero component')
    assert.ok(detail.indexOf('<InsightHero') < detail.indexOf('<InsightArticleBody') && detail.indexOf('<InsightArticleBody') < detail.indexOf('<InsightsCta'), 'the page renders hero (with the share row), then the body, then the closing CTA')
    assert.ok(!detail.slice(detail.indexOf('<InsightsCta'), detail.indexOf('<InsightsCta') + 600).includes('ArticleShareActions'), 'nothing share-related in the closing CTA')
    assert.ok(!read('src/components/site/insights/InsightsSections.tsx').includes('ArticleShareActions'), 'the shared CTA block has no share row either')
    assert.match(detail, /url=\{`\$\{SITE_URL\}\$\{insightHref\(detail\.slug\)\}`\}/); assert.match(detail, /title=\{detail\.title\}/)
    const users = execSync('git grep -l --untracked "ArticleShareActions" -- "src/*.ts" "src/*.tsx"', { cwd: root }).toString().trim().split('\n').sort()
    assert.deepEqual(users, ['src/components/site/insights/ArticleShareActions.tsx', 'src/components/site/insights/InsightDetail.tsx'])
    assert.equal((read('src/app/(site)/insights/[slug]/page.tsx').match(/InsightDetailPage/g) || []).length, 2, 'the one article template serves every article')
  })

  await test('S12 browser APIs are read only on click: no window; navigator and document appear only inside the two click-time helpers', () => {
    const src = stripComments(read('src/components/site/insights/ArticleShareActions.tsx'))
    assert.match(src.split('\n')[0], /^'use client'/); assert.ok(!/\bwindow\b/.test(src))
    const lines = src.split('\n'); let inside = null; const offenders = []
    lines.forEach((l, n) => { if (/^function (legacyCopy|browserDeps)\b/.test(l)) inside = l; else if (/^}/.test(l)) inside = null; if (/\b(navigator|document)\b/.test(l) && !inside) offenders.push(n + 1 + ': ' + l.trim()) })
    assert.deepEqual(offenders, [], 'outside the click-time helpers: ' + offenders.join(' | '))
    assert.ok(!/useEffect\([^)]*(navigator|document)/.test(src) && !/useState\([^)]*(navigator|document)/.test(src), 'no browser state is read during render or in an initial state')
  })

  await test('S13 styling uses the site tokens, 44px targets, wraps cleanly, keeps the global focus ring and does not float', () => {
    const css = read('src/components/site/insights/insights.module.css'); const block = css.slice(css.indexOf('/* Share row'), css.indexOf('.bylineLink'))
    assert.ok(block.length > 300)
    assert.match(block, /\.shareBtn \{[^}]*width: 44px;[^}]*height: 44px;/s); assert.match(block, /\.share \{[^}]*flex-wrap: wrap;[^}]*max-width: 100%;/s); assert.match(block, /\.shareList \{[^}]*flex-wrap: wrap;/s)
    assert.ok(!/outline\s*:\s*(none|0)/.test(block), 'the focus ring is not removed'); assert.ok(!/position\s*:\s*(fixed|sticky|absolute)/.test(block), 'no floating rail')
    assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(block), 'no hard-coded colours: tokens only'); assert.match(block, /prefers-reduced-motion/)
    assert.match(read('src/styles/site-tokens.css'), /\[data-surface='site'\] :focus-visible \{[^}]*outline: 2px solid var\(--hb-focus\)/s)
  })

  await test('S14 scope: only the share component, its logic, its styles, the one article template and this test changed; no CMS, sanitizer, schema, portal, admin or BFCM file', () => {
    const changed = execSync('git status --porcelain --untracked-files=all', { cwd: root }).toString().split('\n').filter(Boolean).map((l) => l.slice(3).replace(/^"|"$/g, '')).filter((f) => !f.startsWith('campaign-assets/'))
    const allowed = new Set(['src/components/site/insights/ArticleShareActions.tsx', 'src/lib/site/share-links.ts', 'src/components/site/insights/insights.module.css', 'src/components/site/insights/InsightDetail.tsx', 'scripts/test-insight-share.cjs'])
    assert.deepEqual(changed.filter((f) => !allowed.has(f)), [], 'unexpected files changed')
    for (const forbidden of ['src/lib/blog-utils.ts', 'src/lib/site/insights-data.ts', 'src/components/site/insights/InsightArticleBody.tsx', 'package.json', 'package-lock.json']) assert.ok(!changed.includes(forbidden), forbidden + ' untouched')
    assert.ok(!changed.some((f) => /\.sql$|supabase|\/admin\/|client-portal|bfcm|growth-review/i.test(f)))
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  if (failures.length) process.exit(1)
})()
