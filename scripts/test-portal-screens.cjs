// Client Portal visual refinement (Batch B) — structure and behaviour-preservation tests.
//
// OFFLINE. Static facts about the screens plus the pure status mapping. WHAT IT DOES NOT PROVE: real layout, contrast, focus or mobile
// behaviour — those were checked in a headless browser against a temporary fixture that rendered the real pages with mocked payloads.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execSync } = require('node:child_process')
const ts = require('typescript')

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

const SCREENS = [
  'src/app/client-portal/projects/page.tsx',
  'src/app/client-portal/projects/[id]/page.tsx',
  'src/app/client-portal/proposals/page.tsx',
  'src/app/client-portal/proposals/[id]/page.tsx',
  'src/app/client-portal/requests/page.tsx',
  'src/app/client-portal/requests/[id]/page.tsx',
  'src/app/client-portal/invoices/page.tsx',
  'src/app/client-portal/invoices/[id]/page.tsx',
  'src/app/client-portal/files/page.tsx',
  'src/app/client-portal/settings/page.tsx',
  'src/app/client-portal/notifications/page.tsx',
]
const TSX = [
  ...SCREENS,
  'src/app/client-portal/project-request/page.tsx',
  'src/components/client-portal/ProjectRequestForm.tsx',
  'src/components/client-portal/SupportState.tsx',
  'src/components/client-portal/PortalPageHeader.tsx',
]

// every `import x from '<...>.module.css'` → { alias: absolute css path }
function cssImports(file) {
  const out = {}
  const src = read(file)
  for (const m of src.matchAll(/import\s+(\w+)\s+from\s+'([^']+\.module\.css)'/g)) {
    const target = m[2].startsWith('@/') ? path.join(root, 'src', m[2].slice(2)) : path.resolve(path.dirname(path.join(root, file)), m[2])
    out[m[1]] = target
  }
  return out
}
const classesIn = (cssFile) => new Set([...fs.readFileSync(cssFile, 'utf8').matchAll(/\.([A-Za-z_][\w-]*)/g)].map((m) => m[1]))
const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '')

;(async () => {
  console.log('Class references and composition')

  await test('R1 every styles.x / screens.x / prim.x a screen uses is defined in the module it imports', () => {
    for (const file of TSX) {
      const src = stripComments(read(file))
      const imports = cssImports(file)
      for (const [alias, cssFile] of Object.entries(imports)) {
        const defined = classesIn(cssFile)
        for (const m of src.matchAll(new RegExp('\\b' + alias + '\\.([A-Za-z_][\\w]*)', 'g'))) {
          assert.ok(defined.has(m[1]), `${file}: ${alias}.${m[1]} is not defined in ${path.relative(root, cssFile)}`)
        }
      }
    }
  })

  await test('R2 every `composes` target exists in the file it points to', () => {
    const dirs = ['src/components/client-portal', 'src/app/client-portal']
    const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    let seen = 0
    for (const f of dirs.flatMap(walk).filter((f) => f.endsWith('.module.css'))) {
      const css = stripComments(read(f))
      for (const m of css.matchAll(/composes:\s*([\w\s-]+?)\s+from\s+'([^']+)'/g)) {
        const target = path.resolve(path.dirname(path.join(root, f)), m[2])
        assert.ok(fs.existsSync(target), `${f}: missing ${m[2]}`)
        const defined = classesIn(target)
        for (const name of m[1].trim().split(/\s+/)) assert.ok(defined.has(name), `${f}: composes ${name} not in ${m[2]}`)
        seen++
      }
    }
    assert.ok(seen > 15, 'composition is actually used (' + seen + ')')
  })

  await test('R3 duplicated per-screen CSS is gone: projects.module.css and proposals.module.css are deleted and unreferenced', () => {
    for (const f of ['src/app/client-portal/projects/projects.module.css', 'src/app/client-portal/proposals/proposals.module.css']) assert.equal(exists(f), false, f)
    const walk = (d) => fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
    for (const f of walk('src').filter((f) => /\.(tsx?|css)$/.test(f))) assert.ok(!/(projects|proposals)\.module\.css/.test(read(f)), f)
  })

  await test('R4 the generic declarations no longer live in the per-screen files', () => {
    const files = read('src/app/client-portal/files/files.module.css')
    const detail = read('src/app/client-portal/projects/[id]/project-detail.module.css')
    const support = read('src/components/client-portal/support.module.css')
    for (const css of [files, detail]) {
      assert.ok(!/^\.panel\s*\{/m.test(css) && !/^\.eyebrow\s*\{/m.test(css) && !/^\.node\s*\{/m.test(css), 'no panel / eyebrow / node redefinition')
      assert.ok(!/^\.(primary|secondary)[^{]*\{[^}]*border-radius/m.test(css), 'no button redefinition')
    }
    assert.ok(!/^\.list\b|^\.item\b|^\.notif\b|^\.chip\b|^\.switch/m.test(support), 'list/notification/chip/switch rules removed from support')
    assert.ok(/composes:\s*panel from '\.\/portal-screens\.module\.css'/.test(support), 'support composes the shared panel')
  })

  console.log('Behaviour preserved (presentation only)')

  const endpoints = (src) => [...src.matchAll(/fetch\(\s*([`'][^`']+[`'])/g)].map((m) => m[1].replace(/\$\{[^}]+\}/g, '$')).sort()
  await test('B1 every screen calls exactly the same endpoints as the committed Batch A version', () => {
    for (const file of SCREENS) {
      const before = execSync(`git show 3f9ad0e:"${file}"`, { cwd: root }).toString()
      assert.deepEqual(endpoints(read(file)), endpoints(before), file)
    }
  })

  await test('B2 no screen touches Supabase or adds a data dependency; no screen imports a new API route', () => {
    for (const file of SCREENS) {
      const src = read(file)
      const before = execSync(`git show 3f9ad0e:"${file}"`, { cwd: root }).toString()
      const supa = (s) => (s.match(/supabase/gi) || []).length
      assert.equal(supa(src), supa(before), file + ' supabase references unchanged')
    }
    for (const f of execSync('git diff --name-only 3f9ad0e', { cwd: root }).toString().split('\n').filter(Boolean)) {
      assert.ok(!/^(src\/app\/api|supabase|scripts\/.*\.sql|src\/lib\/(commerce|requests|supabase)|middleware)/.test(f) || /\.cjs$/.test(f), 'backend untouched: ' + f)
    }
  })

  await test('B3 behaviour-bearing handlers are unchanged: proposal decisions, request reply/resolve, notification read, file delete', () => {
    const must = {
      'src/app/client-portal/proposals/[id]/page.tsx': ["decide('approve')", "decide('request-changes')", "decide('decline')", 'confirmed', 'doc.canDecide'],
      'src/app/client-portal/requests/[id]/page.tsx': ['markResolved', 'request.canClose', 'request.canReply', '/messages', '/status', '/read'],
      'src/app/client-portal/notifications/page.tsx': ['handleSelect', 'handleMarkAll', 'safeNotificationLink', '/api/notifications/read-all'],
      'src/app/client-portal/files/page.tsx': ['handleDownload', 'handleDelete', 'file.canDelete', 'FileUploader', 'client_file'],
      'src/app/client-portal/invoices/[id]/page.tsx': ["inv.status === 'issued'", 'paymentInstructions', 'inv.balance'],
    }
    for (const [file, needles] of Object.entries(must)) {
      const src = read(file)
      for (const n of needles) assert.ok(src.includes(n), file + ' keeps ' + n)
    }
  })

  await test('B4 void invoices stay hidden: the invoice screens add no void/draft rendering', () => {
    for (const f of ['src/app/client-portal/invoices/page.tsx', 'src/app/client-portal/invoices/[id]/page.tsx']) assert.ok(!/['"`](void|draft)['"`]/i.test(read(f)), f)
  })

  await test('B5 Settings keeps its read-only identity fields and Change Password, and does not bring back notification toggles', () => {
    const s = read('src/app/client-portal/settings/page.tsx')
    assert.ok(/value=\{profile\.fullName\} disabled readOnly/.test(s) && /value=\{profile\.businessName\} disabled readOnly/.test(s) && /value=\{profile\.email\} disabled readOnly/.test(s))
    assert.ok(s.includes('Change password') && s.includes('sendPasswordReset'))
    assert.ok(!/switch|toggle|notificationPrefs/i.test(s.replace(/\/\/.*$/gm, '')))
  })

  await test('B6 the Requests screens keep the client-facing status hint and use PortalStatus, not neutral chips', () => {
    const detail = read('src/app/client-portal/requests/[id]/page.tsx')
    assert.ok(detail.includes('request.statusHint') && detail.includes('PortalStatus'))
    assert.ok(read('src/app/client-portal/requests/page.tsx').includes('PortalStatus'))
    assert.ok(!/styles\.chip/.test(detail))
  })

  console.log('Visual-system discipline')

  await test('V1 no decorative 3D module on any refined screen (the Overview first-run render is the only one)', () => {
    for (const f of SCREENS) assert.ok(!/HbeeModuleGroup|HbeeModuleStandalone/.test(read(f)), f)
  })

  await test('V2 every status on a refined screen goes through PortalStatus; no per-screen status chip classes remain', () => {
    for (const f of SCREENS.filter((f) => !/settings|files/.test(f))) {
      const src = read(f)
      assert.ok(!/\bchip(Needs|Done|Muted|Approved|Changes|Expired)\b|styles\.chip\b|inlineStatus/.test(src), f + ' has no legacy chip')
    }
    for (const f of ['projects/page.tsx', 'projects/[id]/page.tsx', 'proposals/page.tsx', 'proposals/[id]/page.tsx', 'requests/page.tsx', 'requests/[id]/page.tsx', 'invoices/page.tsx', 'invoices/[id]/page.tsx', 'notifications/page.tsx']) {
      assert.ok(read('src/app/client-portal/' + f).includes('PortalStatus'), f)
    }
  })

  await test('V3 at most one dominant blue module: only project detail renders a blue PortalSurface, and only once', () => {
    for (const f of SCREENS) {
      const n = (read(f).match(/variant="blue"/g) || []).length
      assert.equal(n, f.includes('projects/[id]') ? 1 : 0, f)
    }
  })

  await test('V4 orange discipline: no screen CSS paints text with the raw Signal Orange token', () => {
    const files = ['src/components/client-portal/portal-screens.module.css', 'src/components/client-portal/commerce.module.css', 'src/components/client-portal/support.module.css', 'src/app/client-portal/files/files.module.css', 'src/app/client-portal/projects/[id]/project-detail.module.css']
    for (const f of files) {
      for (const line of stripComments(read(f)).split('\n')) {
        const m = line.match(/(^|[;{\s])color:\s*var\(--hb-orange\)/)
        assert.ok(!m, `${f}: orange text → ${line.trim().slice(0, 80)}`)
      }
    }
  })

  await test('V5 muted (low-contrast) text colour is not used for readable text on the shared layers', () => {
    for (const f of ['src/components/client-portal/portal-screens.module.css', 'src/app/client-portal/files/files.module.css', 'src/app/client-portal/projects/[id]/project-detail.module.css', 'src/components/client-portal/commerce.module.css']) {
      assert.ok(!/(^|[;{\s])color:\s*var\(--hb-muted\)/m.test(stripComments(read(f))), f)
    }
  })

  await test('V6 touch targets: row title links and file-name links are at least 44px tall', () => {
    const s = read('src/components/client-portal/portal-screens.module.css')
    assert.ok(/\.rowTitle > a \{[^}]*min-height: 2\.75rem/.test(s))
    assert.ok(/\.fileName a \{[^}]*min-height: 2\.75rem/.test(read('src/app/client-portal/projects/[id]/project-detail.module.css')))
    assert.ok(/\.filter \{[^}]*min-height: 2\.75rem/.test(s) && /\.dl \{[^}]*min-height: 2\.75rem/.test(s))
  })

  console.log('Status mapping')

  const sandbox = { exports: {} }
  new Function('module', 'exports', ts.transpileModule(read('src/lib/client-portal/portal-status.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(sandbox, sandbox.exports)
  const st = sandbox.exports

  await test('T1 invoices: overdue = alert, issued / partially paid = needs-you, paid = done', () => {
    assert.equal(st.toneForInvoice('overdue'), 'alert')
    assert.equal(st.toneForInvoice('issued'), 'needs-you')
    assert.equal(st.toneForInvoice('partially_paid'), 'needs-you')
    assert.equal(st.toneForInvoice('paid'), 'done')
  })

  await test('T2 requests: answered = needs-you, open / in review = working, closed = done', () => {
    assert.equal(st.toneForRequest('answered'), 'needs-you')
    assert.equal(st.toneForRequest('open'), 'working')
    assert.equal(st.toneForRequest('in_review'), 'working')
    assert.equal(st.toneForRequest('closed'), 'done')
  })

  await test('T3 proposals: sent / viewed = needs-you, approved = done, changes requested = working, declined / expired = neutral', () => {
    assert.equal(st.toneForProposal('sent'), 'needs-you')
    assert.equal(st.toneForProposal('viewed'), 'needs-you')
    assert.equal(st.toneForProposal('approved'), 'done')
    assert.equal(st.toneForProposal('changes_requested'), 'working')
    assert.equal(st.toneForProposal('declined'), 'neutral')
    assert.equal(st.toneForProposal('expired'), 'neutral')
  })

  console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
  process.exit(failures.length ? 1 : 0)
})()
