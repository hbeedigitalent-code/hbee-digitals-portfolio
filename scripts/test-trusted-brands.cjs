// Offline behavior checks: no environment, production data, network, or real uploads.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const postcss = require('postcss')
const root = path.resolve(__dirname, '..')
const modules = new Map()
let active, row, failure, uploadFailure, heldUpload
const calls = [], storageCalls = []
const original = { id: 'trust-id', is_active: true, partner_logos: [{ name: 'Sample A', logo: '/a.png', active: true, legacy_note: 'preserved' }, { name: 'Sample B', logo: 'https://example.test/b.svg', active: false }], testimonials: [{ quote: 'Untouched' }], headline: 'Legacy copy', stats: ['Untouched'], cta_text: 'Legacy CTA' }
const clone = value => JSON.parse(JSON.stringify(value))
const client = {
  from(table) {
    assert.equal(table, 'trust_section', 'No testimonials, portfolio, Insights, portal, or other tables')
    const operations = [], query = {}
    for (const op of ['select', 'eq', 'update', 'insert', 'single', 'maybeSingle']) query[op] = (...args) => { operations.push([op, ...args]); return query }
    query.then = (resolve, reject) => Promise.resolve().then(() => {
      calls.push(operations)
      if (failure) { const error = failure; failure = null; return { data: null, error } }
      if (operations.some(op => op[0] === 'eq' && op[1] === 'is_active' && row?.is_active !== op[2])) return { data: null, error: null }
      const update = operations.find(op => ['update', 'insert'].includes(op[0]))
      if (update) {
        if (update[0] === 'insert') row = { id: 'new-trust', ...clone(update[1]) }
        else if (row && operations.some(op => op[0] === 'eq' && op[1] === 'id' && op[2] === row.id)) Object.assign(row, clone(update[1]))
        else return { data: null, error: { message: 'No matching row' } }
      }
      return { data: row ? clone(row) : null, error: null }
    }).then(resolve, reject)
    return query
  },
  storage: { from(bucket) {
    assert.equal(bucket, 'project-images')
    return {
      async upload(key, file, options) { storageCalls.push({ bucket, key, file, options }); if (heldUpload) await heldUpload; return { error: uploadFailure } },
      getPublicUrl(key) { return { data: { publicUrl: 'https://example.test/project-images/' + key } } },
    }
  } },
}
const hooks = { ...React,
  useState(initial) { const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = initial; return [h.state[i], value => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value }] },
  useRef(initial) { const h = active, i = h.index++; return h.state[i] ||= { current: initial } },
  useEffect(fn, deps) { const h = active, i = h.index++; if (!h.state[i]) { h.state[i] = deps; h.effects.push(fn) } },
}
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (modules.has(file)) return modules.get(file).exports
  const mod = { exports: {} }; modules.set(file, mod)
  const localRequire = name => {
    if (name === 'react') return hooks
    if (name === '@/lib/supabase') return { supabase: client }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: localRequire, URL, Uint8Array, crypto: require('node:crypto').webcrypto, console }, { filename: file })
  return mod.exports
}
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [] }
function text(node) { return typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '' }
function host(Component) { const h = { state: [], index: 0, effects: [], tree: null }; h.render = () => { active = h; h.index = 0; h.tree = Component(); active = null; for (const effect of h.effects.splice(0)) effect(); return h.tree }; return h }
function find(h, predicate) { const found = nodes(h.tree).find(predicate); assert.ok(found, 'Expected UI control'); return found }
function button(h, label) { return find(h, n => n.type === 'button' && text(n) === label) }
function input(h, label, index = 0) { const labels = nodes(h.tree).filter(n => n.type === 'label' && text(n) === label); assert.ok(labels[index], label); return nodes(labels[index]).find(n => n.type === 'input') }
const tick = () => new Promise(resolve => setImmediate(resolve))
async function mount(Component) { const h = host(Component); h.render(); await tick(); h.render(); return h }
const submit = h => find(h, n => n.type === 'form').props.onSubmit({ preventDefault() {} })
const bytesFile = (type, bytes, name = 'logo.bad-extension') => ({ name, type, size: bytes.length, slice() { return { arrayBuffer: async () => Uint8Array.from(bytes).buffer } } })

;(async () => {
  const helpers = load('src/lib/trusted-brands.ts')
  assert.deepEqual(clone(helpers.parseTrustLogos(JSON.stringify(original.partner_logos))), original.partner_logos)
  assert.equal(helpers.parseTrustLogos([{ name: 'Old', logo: '/old.png' }])[0].active, true)
  assert.throws(() => helpers.parseTrustLogos('broken'))
  assert.throws(() => helpers.parseTrustLogos({}))
  const publicRows = [null, 42, [], { name: '', logo: '/bad.png' }, { name: 'No image' }, { name: 'Bad', logo: 'javascript:alert(1)' }, { name: 'Hidden', logo: '/hidden.png', active: false }, { name: 'Wrong visibility', logo: '/bad.png', active: 'false' }, { name: 'Last', logo: '/last.webp', url: 'https://example.test' }, { name: 'First', logo: 'https://example.test/first.svg' }]
  const brands = helpers.publicTrustBrands({ is_active: true, partner_logos: JSON.stringify(publicRows) })
  assert.deepEqual(clone(brands).map(b => b.name), ['Last', 'First'], 'Stored order remains authoritative')
  assert.equal(brands[0].url, 'https://example.test')
  for (const is_active of [false, null, undefined, 'true']) assert.equal(helpers.publicTrustBrands({ is_active, partner_logos: original.partner_logos }).length, 0)
  for (const raw of ['broken', {}, [], null]) assert.equal(helpers.publicTrustBrands({ is_active: true, partner_logos: raw }).length, 0)
  for (const url of ['//evil.test/x', '/\\evil', 'data:image/svg+xml,abc', 'javascript:bad()', 'https://user:pass@example.test/x', 'https://exa mple.test/x']) assert.equal(helpers.trustLogoUrl(url), undefined)
  assert.equal(helpers.publicTrustBrands({ is_active: true, partner_logos: [{ name: 'Plain', logo: '/plain.png', url: 'javascript:bad()' }] })[0].url, undefined)
  assert.deepEqual(clone(helpers.trustLogoUpload({ type: 'image/jpeg', size: 20 }, 'abc')), { bucket: 'project-images', path: 'trust-logos/abc.jpg' })
  for (const file of [{ type: 'image/svg+xml', size: 10 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 5242881 }]) assert.throws(() => helpers.trustLogoUpload(file, 'abc'))
  const png = [137,80,78,71,13,10,26,10,0,0,0,0]
  helpers.verifyTrustLogoBytes(Uint8Array.from(png).buffer, 'image/png')
  helpers.verifyTrustLogoBytes(Uint8Array.from([255,216,255]).buffer, 'image/jpeg')
  helpers.verifyTrustLogoBytes(Uint8Array.from([82,73,70,70,0,0,0,0,87,69,66,80]).buffer, 'image/webp')
  assert.throws(() => helpers.verifyTrustLogoBytes(Uint8Array.from([60,115,118,103]).buffer, 'image/png'))

  const { getHomepageBrands } = load('src/lib/site/trusted-brands-data.ts')
  row = clone(original); assert.equal((await getHomepageBrands()).length, 1)
  assert.ok(calls.at(-1).some(op => op[0] === 'select' && op[1] === 'partner_logos,is_active'))
  row.is_active = false; assert.equal((await getHomepageBrands()).length, 0)
  row = null; assert.equal((await getHomepageBrands()).length, 0)
  failure = { message: 'Denied' }; assert.equal((await getHomepageBrands()).length, 0)
  const { HomeTrustedBrands, TRUST_MARQUEE_MIN } = load('src/components/site/home/HomeTrustedBrands.tsx')
  assert.equal(HomeTrustedBrands({ brands: [] }), null)
  const staticTree = HomeTrustedBrands({ brands })
  assert.equal(nodes(staticTree).filter(n => n.type === 'img').length, 2)
  assert.equal(nodes(staticTree).filter(n => n.type === 'a').length, 1)
  assert.equal(nodes(staticTree).filter(n => n.type === 'input').length, 0)
  assert.ok(text(staticTree).includes('Selected brands we’ve supported'))
  const many = Array.from({ length: TRUST_MARQUEE_MIN }, (_, index) => ({ name: 'Fixture ' + index, logo: '/fixture-' + index + '.png', ...(index === 0 ? { url: 'https://example.test' } : {}) }))
  const movingTree = HomeTrustedBrands({ brands: many })
  assert.equal(nodes(movingTree).filter(n => n.type === 'img').length, 12)
  assert.equal(nodes(movingTree).filter(n => n.type === 'a').length, 1, 'Copies contain no duplicate links or tab stops')
  const duplicate = nodes(movingTree).find(n => n.props?.className === 'duplicate')
  assert.equal(duplicate.props['aria-hidden'], 'true')
  assert.ok(nodes(duplicate).filter(n => n.type === 'img').every(n => n.props.alt === ''))
  assert.ok(nodes(movingTree).filter(n => n.type === 'img' && n.props.alt).every(n => n.props.alt.startsWith('Fixture')))
  const rendered = renderToStaticMarkup(React.createElement(HomeTrustedBrands, { brands: many }))
  assert.match(rendered, /type="checkbox"/); assert.match(rendered, /for="pause-trusted-brands"/)
  assert.ok(!rendered.includes('<script'), 'SSR presentation and native pause require no JS')
  assert.ok(!/Shopify|Google|BigCommerce|WooCommerce|Magento|Salesforce/.test(rendered))
  const css = postcss.parse(fs.readFileSync(path.join(root, 'src/components/site/home/trusted-brands.module.css'), 'utf8'))
  const declarations = []; css.walkDecls(d => declarations.push(d))
  assert.ok(declarations.some(d => d.prop === 'object-fit' && d.value === 'contain'))
  assert.ok(!declarations.some(d => d.prop === 'filter'), 'No forced grayscale or inversion')
  for (const declaration of declarations.filter(d => d.prop === 'animation')) {
    assert.equal(declaration.parent.parent.name, 'media')
    assert.equal(declaration.parent.parent.params, '(prefers-reduced-motion: no-preference)', 'Reduced-motion defaults to static wrapping')
    if (declaration.parent.selector.includes(':focus-within')) assert.equal(declaration.value, 'none')
    else assert.equal(declaration.value, 'trust-travel 85s linear infinite')
  }
  assert.ok(declarations.some(d => d.prop === 'display' && d.value === 'none' && d.parent.selector.includes('.duplicate') && d.parent.parent.type === 'root'))
  assert.ok(declarations.some(d => d.prop === 'animation-play-state' && d.value === 'paused' && [':hover', ':focus-within', ':checked'].every(value => d.parent.selector.includes(value))))
  assert.ok(declarations.some(d => d.prop === 'flex-wrap' && d.value === 'wrap' && d.parent.parent.type === 'root'))
  const homepage = fs.readFileSync(path.join(root, 'src/app/(site)/page.tsx'), 'utf8')
  assert.ok(homepage.indexOf('<HomeBridge />') < homepage.indexOf('<HomeTrustedBrands brands={brands} />'))
  assert.ok(homepage.indexOf('<HomeTrustedBrands brands={brands} />') < homepage.indexOf('<HomeProblem />'))
  assert.ok(homepage.includes('getHomepageBrands()')); assert.ok(!homepage.includes('PartnerMarquee'))
  assert.ok(fs.readFileSync(path.join(root, 'src/app/admin/layout.tsx'), 'utf8').includes("{ name: 'Trusted Brands', href: '/admin/trust', icon: 'security' }"))

  const Admin = load('src/app/admin/trust/page.tsx').default
  row = clone(original)
  const admin = await mount(Admin)
  assert.ok(!nodes(admin.tree).some(n => n.type === 'textarea'), 'No testimonial/legacy JSON editor')
  assert.equal(input(admin, 'Brand name').props.value, 'Sample A')
  find(admin, n => n.type === 'button' && n.props['aria-label'] === 'Move brand 2 up').props.onClick(); admin.render()
  assert.equal(input(admin, 'Brand name').props.value, 'Sample B')
  input(admin, 'Hidden on website').props.onChange({ target: { checked: true } }); admin.render()
  input(admin, 'Brand website (optional)').props.onChange({ target: { value: 'https://brand.example' } }); admin.render()
  await submit(admin); admin.render()
  assert.equal(row.partner_logos[0].name, 'Sample B'); assert.equal(row.partner_logos[0].active, true)
  assert.equal(row.partner_logos[0].url, 'https://brand.example')
  assert.equal(row.partner_logos[1].legacy_note, 'preserved')
  assert.deepEqual(row.testimonials, original.testimonials); assert.equal(row.headline, original.headline); assert.deepEqual(row.stats, original.stats)
  const payload = calls.at(-1).find(op => op[0] === 'update')[1]
  assert.deepEqual(Object.keys(payload).sort(), ['is_active', 'partner_logos', 'updated_at'])
  input(admin, 'Trust section visible on website').props.onChange({ target: { checked: false } }); admin.render()
  await submit(admin); admin.render(); assert.equal(row.is_active, false)
  assert.equal(helpers.publicTrustBrands(row).length, 0)
  input(admin, 'Trust section visible on website').props.onChange({ target: { checked: true } }); admin.render()
  await submit(admin); admin.render(); assert.equal(row.is_active, true)
  const fileInput = () => find(admin, n => n.type === 'input' && n.props.type === 'file')
  let release; heldUpload = new Promise(resolve => { release = resolve })
  const uploadPromise = fileInput().props.onChange({ target: { files: [bytesFile('image/png', png)] } })
  await tick(); admin.render()
  assert.equal(find(admin, n => n.type === 'fieldset').props.disabled, true)
  const callsBefore = calls.length; await submit(admin); assert.equal(calls.length, callsBefore, 'Save blocked during upload')
  release(); heldUpload = null; await uploadPromise; await tick(); admin.render()
  assert.equal(storageCalls.length, 1); assert.match(storageCalls[0].key, /^trust-logos\/[a-zA-Z0-9-]+\.png$/)
  assert.equal(storageCalls[0].options.upsert, false); assert.equal(storageCalls[0].options.contentType, 'image/png')
  assert.match(input(admin, 'Logo URL').props.value, /^https:\/\/example.test\/project-images\/trust-logos\//)
  await submit(admin); admin.render(); assert.equal(row.partner_logos[0].logo, input(admin, 'Logo URL').props.value)
  const uploadsBefore = storageCalls.length
  fileInput().props.onChange({ target: { files: [bytesFile('image/svg+xml', [60,115,118,103])] } }); await tick(); admin.render()
  assert.equal(storageCalls.length, uploadsBefore); assert.match(text(admin.tree), /SVG uploads are not supported/)
  fileInput().props.onChange({ target: { files: [bytesFile('image/png', [60,115,118,103])] } }); await tick(); admin.render()
  assert.equal(storageCalls.length, uploadsBefore); assert.match(text(admin.tree), /file contents do not match/)
  uploadFailure = { message: 'Mock upload denied' }; fileInput().props.onChange({ target: { files: [bytesFile('image/png', png)] } }); await tick(); admin.render()
  assert.match(text(admin.tree), /Mock upload denied/); uploadFailure = null
  failure = { message: 'Mock save denied' }; await submit(admin); admin.render(); assert.match(text(admin.tree), /Mock save denied/)
  button(admin, 'Add brand').props.onClick(); admin.render(); const beforeInvalid = calls.length
  await submit(admin); admin.render(); assert.equal(calls.length, beforeInvalid); assert.match(text(admin.tree), /Each brand needs a name/)
  row = { ...clone(original), partner_logos: 'broken' }; const corrupt = await mount(Admin)
  assert.ok(!nodes(corrupt.tree).some(n => n.type === 'form'), 'Corrupt load cannot overwrite stored data')
  row = null; const empty = await mount(Admin); assert.match(text(empty.tree), /No brands yet/)
  await submit(empty); empty.render(); assert.ok(row.id); assert.deepEqual(row.partner_logos, [])
  failure = { message: 'Mock read denied' }; const denied = await mount(Admin); assert.match(text(denied.tree), /Mock read denied/)
  console.log('PASS: trusted brands parsing/order/visibility, server reads/empty states, admin edits/saves/errors, raster uploads/path mapping, static/marquee SSR, native pause/reduced-motion CSS, hidden noninteractive duplicates, links/alt/containment, homepage/sidebar placement, and no testimonial crossover. All external access mocked; browser animation/layout not exercised.')
})().catch(error => { console.error(error); process.exitCode = 1 })
