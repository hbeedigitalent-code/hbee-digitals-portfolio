// Client Portal Overview visual refinement (Batch A) — behaviour and structure tests.
//
// OFFLINE. Real pure model, real components rendered on the server with real React (CSS modules are a name-returning proxy), and static
// facts about the CSS. WHAT IT DOES NOT PROVE: real layout, contrast or focus rendering — those were checked in a headless browser separately.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const exists = (f) => fs.existsSync(path.join(root, f))

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

const cache = new Map()
function resolveFile(base) {
  for (const c of [base, base + '.ts', base + '.tsx', base + '/index.ts', base + '/index.tsx']) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c
  }
  throw new Error('cannot resolve ' + base)
}
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const requireFn = (name) => {
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, k) => (k === '__esModule' ? false : String(k)) })
    if (name.startsWith('@/')) return load(resolveFile(path.join(root, 'src', name.slice(2))))
    if (name.startsWith('.')) return load(resolveFile(path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports)
  return mod.exports
}
const L = (f) => load(path.join(root, f))

const model = L('src/lib/client-portal/overview-model.ts')
const status = L('src/lib/client-portal/portal-status.ts')
const { PortalStatus, PortalToneMark } = L('src/components/client-portal/PortalStatus.tsx')
const { PortalSurface } = L('src/components/client-portal/PortalSurface.tsx')
const EmptyStateMod = L('src/components/client-portal/EmptyState.tsx')
const { OverviewView } = L('src/components/client-portal/overview/OverviewView.tsx')

const NOW = new Date('2026-11-22T12:00:00Z')
const ago = (mins) => new Date(NOW.getTime() - mins * 60000).toISOString()
const project = (o = {}) => ({ id: 'p1', code: 'PROJ-1', name: 'Website Conversion Review', status: 'In Progress', progress: 35, description: null, startDate: null, expectedCompletion: null, ...o })
const inv = (ctx = 'Payment due · USD 350.00') => ({ kind: 'invoice', title: 'Invoice HBD-INV-1', context: ctx, href: '/client-portal/invoices/i1' })
const req = { kind: 'request', title: 'Store audit access', context: 'Hbee replied to your request', href: '/client-portal/requests/r1' }
const prop = { kind: 'proposal', title: 'Proposal A', context: 'Proposal awaiting your response', href: '/client-portal/proposals/pr1' }
const base = {
  client: { firstName: 'Alex', businessName: 'More Apparel' },
  priority: null,
  growth: {
    state: 'ready',
    snapshot: {
      score: 62,
      classification: 'Developing',
      lowestKey: 'retention',
      pillars: [
        { key: 'visibility', label: 'Visibility', value: 70 },
        { key: 'retention', label: 'Retention', value: 38 },
      ],
    },
  },
  attention: [inv(), req],
  activeWork: { history: false, projects: [project(), project({ id: 'p2', name: 'Second project' })] },
  activity: [0, 1, 2, 3, 4, 5].map((i) => ({ type: 'update', title: 'Event ' + i, context: null, at: ago(30 + i * 60), href: null })),
  files: [],
  deliverables: [],
  proposal: { id: 'pr1', title: 'Growth Implementation', status: 'sent', total: 350, currency: 'USD', sentAt: ago(2880), expiresAt: null },
  unavailable: [],
}
const clear = { ...base, attention: [], proposal: null }
const first = { ...clear, activeWork: { history: false, projects: [] }, activity: [], growth: { state: 'no_assessment', snapshot: null } }
const html = (data) => renderToStaticMarkup(React.createElement(OverviewView, { data, now: NOW }))
const count = (s, re) => (s.match(re) || []).length

;(async () => {
  console.log('Overview model (pure)')

  await test('M1 engagement: newest active project is primary, the rest are "others"', () => {
    const e = model.engagementOf(base)
    assert.equal(e.project.id, 'p1')
    assert.deepEqual([...e.others.map((o) => o.id)], ['p2'])
    assert.equal(e.history, false)
    const none = model.engagementOf(first)
    assert.equal(none.project, null)
    assert.equal(none.history, false)
    assert.equal(model.engagementOf({ activeWork: { history: true, projects: [project()] } }).history, true)
  })

  await test('M2 nextStep prefers what the client must do, else a neutral explanation', () => {
    for (const s of ['In Progress', 'Awaiting Client Feedback', 'Completed', 'Planning', null]) {
      const n = model.nextStep(s)
      if (n) assert.ok(n.label && n.text, String(s))
    }
    assert.equal(model.nextStep('Awaiting Client Feedback').label, 'Needs from you')
  })

  await test('M3 documentChips: open proposal and first invoice only; overdue invoice is an alert', () => {
    assert.equal(model.documentChips(clear).length, 0)
    const c = model.documentChips(base)
    assert.deepEqual([...c.map((x) => x.kind)], ['proposal', 'invoice'])
    assert.equal(c[1].tone, 'needs-you')
    assert.equal(c[1].statusLabel, 'Payment due')
    const o = model.documentChips({ proposal: null, attention: [inv('Overdue · USD 360.00 to pay')] })
    assert.equal(o[0].tone, 'alert')
    assert.equal(o[0].statusLabel, 'Overdue')
  })

  await test('M4 attentionRows: at most three, server order kept, only an overdue invoice is an alert', () => {
    const rows = model.attentionRows([inv('Overdue · x'), req, prop, inv()])
    assert.equal(rows.length, 3)
    assert.equal(model.ATTENTION_LIMIT, 3)
    assert.deepEqual([...rows.map((r) => r.tone)], ['alert', 'needs-you', 'needs-you'])
    assert.deepEqual([...rows.map((r) => r.actionLabel)], ['View', 'Reply', 'Review'])
    assert.equal(model.attentionRows([]).length, 0)
  })

  await test('M5 workspaceTiles: six tiles, six distinct icons, status words and never a count', () => {
    for (const d of [base, clear, first]) {
      const t = model.workspaceTiles(d)
      assert.equal(t.length, 6)
      assert.equal(new Set(t.map((x) => x.icon)).size, 6, 'distinct icons')
      assert.deepEqual([...t.map((x) => x.key)], ['projects', 'requests', 'proposals', 'invoices', 'files', 'growth-profile'])
      for (const x of t) {
        if (x.key === 'growth-profile') continue
        assert.ok(!/\d/.test(x.line.replace(/Latest:.*/, '')), x.key + ': ' + x.line)
      }
    }
  })

  await test('M6 activityRows maps every item; mobile limit is four', () => {
    assert.equal(model.activityRows(base.activity, NOW.getTime()).length, 6)
    assert.equal(model.ACTIVITY_MOBILE_LIMIT, 4)
  })

  console.log('Status and surface')

  await test('S1 every tone map returns a known tone; unknown input is not a tone', () => {
    assert.deepEqual([...status.PORTAL_TONES], ['working', 'needs-you', 'done', 'neutral', 'alert'])
    for (const t of ['info', 'needs', 'done', 'muted']) assert.ok(status.isPortalTone(status.toneFromProjectTone(t)), t)
    assert.equal(status.isPortalTone('bogus'), false)
    for (const f of [status.toneForInvoice, status.toneForProposal, status.toneForRequest]) {
      assert.ok(status.isPortalTone(f('anything')) && status.isPortalTone(f(null)))
    }
  })

  await test('S2 PortalStatus prints the words and an aria-hidden shape for every tone', () => {
    for (const tone of status.PORTAL_TONES) {
      const out = renderToStaticMarkup(React.createElement(PortalStatus, { tone }, 'Words here'))
      assert.ok(out.includes('Words here'), tone)
      assert.ok(/aria-hidden="true"/.test(out), tone + ' shape is decorative')
      assert.ok(/aria-hidden="true"/.test(renderToStaticMarkup(React.createElement(PortalToneMark, { tone }))), tone)
    }
  })

  await test('S3 PortalSurface applies variant and compact classes and renders its children', () => {
    const out = renderToStaticMarkup(React.createElement(PortalSurface, { variant: 'blue', compact: true }, React.createElement('p', null, 'inside')))
    assert.ok(out.includes('inside'))
    assert.ok(/blue/.test(out))
    assert.ok(/compact/.test(out))
  })

  await test('S4 EmptyState renders title and description; default and named export agree', () => {
    assert.equal(EmptyStateMod.default, EmptyStateMod.EmptyState)
    const out = renderToStaticMarkup(React.createElement(EmptyStateMod.default, { title: 'All clear', description: 'Nothing waits on you.' }))
    assert.ok(out.includes('All clear') && out.includes('Nothing waits on you.'))
  })

  console.log('Overview view (SSR)')

  await test('V1 active: one h1 and the sections appear in the intended order', () => {
    const out = html(base)
    assert.equal(count(out, /<h1[ >]/g), 1)
    const lower = out.toLowerCase()
    const idx = ['<h1', 'current engagement', 'needs your attention', 'your workspace', 'recent activity', 'growth profile snapshot'].map((s) => lower.indexOf(s))
    assert.ok(idx.every((i) => i >= 0), JSON.stringify(idx))
    assert.deepEqual(idx, [...idx].sort((a, b) => a - b), 'section order')
  })

  await test('V2 active: six tiles, project shown and linked, other projects listed', () => {
    const out = html(base)
    assert.equal(count(out, /data-tile/g), 6)
    assert.ok(out.includes('Website Conversion Review'))
    assert.ok(out.includes('/client-portal/projects/p1'))
    assert.ok(out.includes('Second project'))
  })

  await test('V3 clear: calm "All clear", no attention rows', () => {
    const out = html(clear)
    assert.ok(/all clear/i.test(out))
    assert.ok(!out.includes('Store audit access'))
  })

  await test('V4 first run: start-a-request action, no project link', () => {
    const f = html(first)
    assert.ok(/start a request/i.test(f))
    assert.ok(!f.includes('/client-portal/projects/p'))
  })

  await test('V5 exactly one primary action per state', () => {
    for (const [name, d] of [['active', base], ['clear', clear], ['first', first]]) {
      assert.equal(count(html(d), /class="[^"]*\bprimary\b[^"]*"/g), 1, name)
    }
  })

  console.log('Shell, CSS and removal facts')

  await test('C1 shell and tokens: portal rhythm and status tokens exist and the shell uses them', () => {
    const css = read('src/components/client-portal/portal-shell.module.css')
    assert.ok(/--hb-portal-topbar/.test(css) && /--hb-portal-canvas-pad/.test(css))
    assert.ok(/\.section\s*\{[^}]*display:\s*none/.test(css), 'section title hidden on desktop')
    const tokens = read('src/styles/portal-tokens.css')
    for (const t of ['--hb-portal-gap', '--hb-portal-pad', '--hb-portal-canvas-pad', '--hb-portal-topbar', '--hb-portal-needs-text', '--hb-portal-alert-text']) {
      assert.ok(tokens.includes(t), t)
    }
  })

  await test('C2 activity CSS limit equals ACTIVITY_MOBILE_LIMIT + 1', () => {
    const css = read('src/components/client-portal/overview/overview.module.css')
    assert.ok(css.includes('nth-child(n + ' + (model.ACTIVITY_MOBILE_LIMIT + 1) + ')'))
  })

  await test('C3 old dashboard.module.css is gone and nothing references it', () => {
    assert.equal(exists('src/app/client-portal/dashboard.module.css'), false)
    const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    for (const f of walk('src').filter((f) => /\.(tsx?|css)$/.test(f))) assert.ok(!/dashboard\.module\.css/.test(read(f)), f)
  })

  await test('C4 the temporary visual fixture is not present', () => {
    assert.equal(exists('src/app/zz-portal-fixture'), false)
  })

  await test('C5 page.tsx keeps the single dashboard endpoint and renders OverviewView', () => {
    const p = read('src/app/client-portal/page.tsx')
    assert.ok(p.includes("'/api/client-portal/dashboard'") && p.includes('<OverviewView'))
    assert.equal(count(p, /fetch\(/g), 1)
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  process.exit(failures.length ? 1 : 0)
})()
