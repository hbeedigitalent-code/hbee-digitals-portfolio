// Offline testimonial behavior checks. No secrets, network, storage or production data.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..'), modules = new Map(), calls = []
let active, failure, rows = [], confirmDelete = false, authUser = { id: 'admin' }
let trustRow = { is_active: true, partner_logos: [{ name: 'Fixture Brand', logo: '/fixture.png', active: true }], testimonials: [{ name: 'Legacy', quote: 'Not a canonical source' }] }
const sample = { id: 'one', name: 'Fixture Person', position: 'Owner', company: 'Fixture Company', content: 'Helpful work.', image_url: '/avatar.png', display_order: 2, is_active: true, rating: 3, is_featured: true, source_reference: 'Keep stored evidence', role: 'Legacy role', avatar_url: '/legacy.png' }
const clone = value => JSON.parse(JSON.stringify(value))
const client = { auth: { getUser: async () => ({ data: { user: authUser }, error: null }) }, from(table) {
  assert.ok(['testimonials', 'trust_section'].includes(table), 'No portfolio, private projects or Client Portal access')
  const operations = [], query = {}
  for (const op of ['select', 'eq', 'order', 'limit', 'single', 'maybeSingle', 'insert', 'update', 'delete']) query[op] = (...args) => { operations.push([op, ...args]); return query }
  query.then = (resolve, reject) => Promise.resolve().then(() => {
    calls.push({ table, operations })
    if (failure) { const error = failure; failure = null; return { data: null, error } }
    if (table === 'trust_section') {
      assert.ok(!operations.some(op => ['insert', 'update', 'delete'].includes(op[0])), 'Testimonial controls never mutate trust state')
      return { data: trustRow.is_active ? clone(trustRow) : null, error: null }
    }
    let data = rows.filter(row => operations.every(([op, key, value]) => op !== 'eq' || row[key] === value))
    const insert = operations.find(op => op[0] === 'insert'), update = operations.find(op => op[0] === 'update')
    // Mirror the confirmed nullable integer column with legacy DEFAULT 5.
    if (insert) { const created = { id: 'new', rating: 5, ...clone(insert[1]) }; assert.ok(created.rating === null || (Number.isInteger(created.rating) && created.rating >= 1 && created.rating <= 5)); rows.push(created); data = [created] }
    if (update) data.forEach(row => Object.assign(row, clone(update[1])))
    if (operations.some(op => op[0] === 'delete')) rows = rows.filter(row => !data.includes(row))
    for (const [, key, options] of operations.filter(op => op[0] === 'order')) data.sort((a, b) => (Number(a[key]) - Number(b[key])) * (options?.ascending === false ? -1 : 1))
    const limit = operations.find(op => op[0] === 'limit'); if (limit) data = data.slice(0, limit[1])
    if (operations.some(op => op[0] === 'single')) return data.length === 1 ? { data: clone(data[0]), error: null } : { data: null, error: { message: 'No matching row' } }
    return { data: clone(data), error: null }
  }).then(resolve, reject)
  return query
}, storage: { from() { throw Error('No testimonial storage uploads or deletions') } } }
const hooks = { ...React,
  useState(initial) { if (!active) return React.useState(initial); const h = active, i = h.index++; if (!(i in h.state)) h.state[i] = initial; return [h.state[i], value => { h.state[i] = typeof value === 'function' ? value(h.state[i]) : value }] },
  useRef(initial) { const h = active, i = h.index++; return h.state[i] ||= { current: initial } },
  useEffect(fn, deps) { const h = active, i = h.index++; if (!h.state[i]) { h.state[i] = deps; h.effects.push(fn) } },
}
const navigations = []
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (modules.has(file)) return modules.get(file).exports
  const mod = { exports: {} }; modules.set(file, mod)
  const localRequire = name => {
    if (name === 'react') return hooks
    if (name === '@/lib/supabase') return { supabase: client }
    if (name === 'next/navigation') return { useRouter: () => ({ push: url => navigations.push(url) }) }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/image') return { __esModule: true, default: () => null }
    if (name.endsWith('/SiteReveal')) return { SiteReveal: ({ children }) => children }
    if (name.endsWith('/HbeeModuleGroup')) return { HbeeModuleGroup: () => null }
    if (name === './HomeDiagnostic') return { HomeDiagnostic: () => null }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.endsWith('.css')) return {}
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: localRequire, URL, console, confirm: () => confirmDelete }, { filename: file })
  return mod.exports
}
function nodes(node) { return Array.isArray(node) ? node.flatMap(nodes) : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [] }
function text(node) { return typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : '' }
function host(Component, props) { const h = { state: [], index: 0, effects: [], tree: null }; h.render = () => { active = h; h.index = 0; h.tree = Component(props); active = null; for (const effect of h.effects.splice(0)) effect(); return h.tree }; return h }
function find(h, predicate) { const node = nodes(h.tree).find(predicate); assert.ok(node, 'Expected control'); return node }
function button(h, label) { return find(h, node => node.type === 'button' && text(node) === label) }
function field(h, label) { const node = find(h, node => node.type === 'label' && text(node) === label); return nodes(node).find(node => ['input', 'textarea'].includes(node.type)) }
const tick = () => new Promise(resolve => setImmediate(resolve))
async function mount(Component) { const h = host(Component); h.render(); await tick(); h.render(); return h }
const submit = h => find(h, node => node.type === 'form').props.onSubmit({ preventDefault() {} })

;(async () => {
  const model = load('src/lib/testimonials.ts')
  assert.equal(model.testimonialForm().is_active, false)
  assert.equal(model.testimonialQuote({ ...sample, is_active: false }), null)
  assert.equal(model.testimonialQuote({ ...sample, content: '   ' }), null)
  for (const name of ['John Doe', ' jane   smith ', 'MIKE JOHNSON']) {
    assert.equal(model.testimonialQuote({ ...sample, name }), null, `${name} is excluded from public proof`)
    assert.throws(() => model.testimonialPayload({ ...model.testimonialForm(sample), name }), /Placeholder testimonial identities/)
  }
  const originalWords = '  Exact words.\nNot rewritten, shortened, or polished. <script>bad()</script> & "quoted"  '
  assert.equal(model.testimonialQuote({ ...sample, content: originalWords }).quote, originalWords)
  assert.equal(model.testimonialQuote({ ...sample, position: '', image_url: '' }).role, undefined)
  assert.equal(model.testimonialQuote({ ...sample, position: '', image_url: '' }).avatar, undefined)
  assert.equal(model.testimonialForm({ ...sample, position: null, image_url: null }).position, 'Legacy role')
  assert.equal(model.testimonialQuote({ ...sample, position: null, image_url: null }).avatar, '/legacy.png')
  const noRating = model.testimonialPayload(model.testimonialForm(sample))
  assert.ok(!('rating' in noRating)); assert.ok(!('is_featured' in noRating)); assert.ok(!('source_reference' in noRating))
  assert.throws(() => model.testimonialPayload({ ...model.testimonialForm(), name: 'x', content: 'x', display_order: '1.5' }))
  assert.throws(() => model.testimonialPayload({ ...model.testimonialForm(sample), image_url: 'javascript:bad()' }))
  for (const url of ['//remote.test/a', 'data:image/png,x', '/\\host/a', 'https://user:pass@remote.test/a']) assert.equal(model.testimonialImageUrl(url), undefined)
  const { getHomepageProof } = load('src/lib/site/home-data.ts'), { getHomepageBrands } = load('src/lib/site/trusted-brands-data.ts')
  rows = [{ ...sample, id: 'late', display_order: 3 }, { ...sample, id: 'early', display_order: 1, content: 'Short but genuine.' }, { ...sample, id: 'placeholder', display_order: 0, name: 'John Doe' }, { ...sample, id: 'hidden', display_order: 0, is_active: false }, { ...sample, id: 'invalid', display_order: 0, name: '' }]
  assert.deepEqual(clone(await getHomepageProof()).map(q => q.id), ['early', 'late'])
  const selection = calls.find(c => c.table === 'testimonials')
  assert.ok(selection.operations.some(op => op[0] === 'eq' && op[1] === 'is_active' && op[2] === true))
  trustRow.is_active = false; assert.equal((await getHomepageBrands()).length, 0); assert.equal((await getHomepageProof()).length, 2)
  trustRow.is_active = true; rows.forEach(row => { row.is_active = false }); assert.equal((await getHomepageBrands()).length, 1); assert.equal((await getHomepageProof()).length, 0)
  failure = { message: 'Mock public read denied' }; assert.deepEqual(clone(await getHomepageProof()), [])
  const { HomeProof } = load('src/components/site/home/HomeSections.tsx'), { TestimonialQuote } = load('src/components/site/proof/TestimonialQuote.tsx')
  const publicWithRating = rating => renderToStaticMarkup(React.createElement(HomeProof, { quotes: [model.testimonialQuote({ ...sample, rating })] }))
  assert.equal(publicWithRating(null), publicWithRating(5), 'Public presentation ignores rated versus unrated records')
  assert.equal(publicWithRating(1), publicWithRating(5), 'Historical rating values do not affect public presentation')
  assert.equal(HomeProof({ quotes: [] }), null)
  for (const count of [1, 2, 3]) {
    const quotes = Array.from({ length: count }, (_, index) => model.testimonialQuote({ ...sample, id: String(index) }))
    const html = renderToStaticMarkup(React.createElement(HomeProof, { quotes }))
    assert.equal((html.match(/<blockquote/g) || []).length, count)
    assert.ok(!/aria-roledescription="carousel"|<button|<svg|Rated|Verified|★/.test(html))
    assert.match(html, /Fixture Person/); assert.match(html, /Owner, Fixture Company/)
  }
  const escaped = renderToStaticMarkup(React.createElement(TestimonialQuote, { quote: model.testimonialQuote({ ...sample, content: originalWords }) }))
  assert.ok(escaped.includes('&lt;script&gt;')); assert.ok(!escaped.includes('<script>')); assert.ok(escaped.includes('Not rewritten, shortened, or polished.'))
  assert.ok(escaped.includes('object-contain')); assert.ok(escaped.includes('alt=""'))
  const escapedAttribution = renderToStaticMarkup(React.createElement(TestimonialQuote, { quote: model.testimonialQuote({ ...sample, name: '<img onerror="bad()">', position: '<script>bad()</script>', company: 'A & B' }) }))
  assert.ok(escapedAttribution.includes('&lt;img')); assert.ok(escapedAttribution.includes('&lt;script&gt;')); assert.ok(escapedAttribution.includes('A &amp; B'))
  const noImage = renderToStaticMarkup(React.createElement(TestimonialQuote, { quote: model.testimonialQuote({ ...sample, image_url: '' }) }))
  assert.ok(!noImage.includes('<img')); assert.match(noImage, /Fixture Person/)
  const portrait = host(load('src/components/site/proof/TestimonialImage.tsx').TestimonialImage, { src: '/broken.png' }); portrait.render()
  portrait.tree.props.onError(); assert.equal(portrait.render(), null)
  const proofSource = fs.readFileSync(path.join(root, 'src/components/site/home/HomeSections.tsx'), 'utf8').split('export function HomeProof')[1].split('export function HomePrinciples')[0]
  assert.ok(!/SiteReveal|rating|ReviewCarousel|TestimonialsSection|TrustSection/.test(proofSource))
  const config = require(path.join(root, 'next.config.js')), redirects = await config.redirects()
  assert.ok(redirects.some(r => r.source === '/reviews' && r.destination === '/work'))
  const prodFiles = ['src/app/(site)/page.tsx', 'src/components/site/home/HomeSections.tsx', 'src/lib/site/home-data.ts']
  for (const file of prodFiles) assert.ok(!/Austin Zarecky|Christiana Kwarteng|ReviewCarousel|TestimonialsSection/.test(fs.readFileSync(path.join(root, file), 'utf8')))

  rows = [clone(sample)]
  const Admin = load('src/app/admin/testimonials/page.tsx').default, admin = await mount(Admin)
  button(admin, 'Edit').props.onClick(); admin.render()
  assert.equal(field(admin, 'Role / title (optional)').props.value, sample.position)
  assert.ok(!nodes(admin.tree).some(n => n.type === 'select'), 'No rating requirement')
  field(admin, 'Testimonial quote').props.onChange({ target: { value: originalWords } }); admin.render()
  field(admin, 'Role / title (optional)').props.onChange({ target: { value: '' } }); admin.render()
  field(admin, 'Avatar / logo URL (optional)').props.onChange({ target: { value: '' } }); admin.render()
  await submit(admin); admin.render()
  assert.equal(rows[0].content, originalWords); assert.equal(rows[0].rating, 3); assert.equal(rows[0].is_featured, true)
  assert.equal(rows[0].source_reference, sample.source_reference); assert.equal(rows[0].role, sample.role)
  assert.equal(model.testimonialQuote(rows[0]).role, undefined); assert.equal(model.testimonialQuote(rows[0]).avatar, undefined)
  const saved = calls.at(-1).operations.find(op => op[0] === 'update')[1]
  assert.ok(!Object.hasOwn(saved, 'rating'), 'Edit payload must omit rating to preserve historical values')
  assert.deepEqual(Object.keys(saved).sort(), ['company', 'content', 'display_order', 'image_url', 'is_active', 'name', 'position'])
  button(admin, 'Hide').props.onClick(); await tick(); admin.render(); assert.equal(rows[0].is_active, false); assert.equal(trustRow.is_active, true)
  button(admin, 'New testimonial').props.onClick(); admin.render()
  assert.equal(field(admin, 'Visible on website').props.checked, false)
  field(admin, 'Name').props.onChange({ target: { value: 'Another fixture' } }); admin.render()
  field(admin, 'Testimonial quote').props.onChange({ target: { value: 'Another exact quote.' } }); admin.render()
  await submit(admin); admin.render(); assert.equal(rows.length, 2); assert.equal(rows[1].is_active, false)
  const createdPayload = calls.at(-1).operations.find(op => op[0] === 'insert')[1]
  assert.ok(Object.hasOwn(createdPayload, 'rating'), 'Create must explicitly override the legacy default')
  assert.equal(createdPayload.rating, null)
  assert.equal(rows[1].rating, null, 'New testimonials remain unrated despite the database default of 5')
  assert.deepEqual(rows[1].content, 'Another exact quote.')
  assert.equal(nodes(admin.tree).find(n => n.type?.name === 'TestimonialQuote').props.quote.name, 'Another fixture', 'Admin reflects saved display order')
  const before = calls.length; await button(admin, 'Delete').props.onClick(); assert.equal(calls.length, before, 'Delete cancellation prevents mutation')
  confirmDelete = true; await button(admin, 'Delete').props.onClick(); admin.render(); assert.equal(rows.length, 1)
  button(admin, 'Edit').props.onClick(); admin.render(); failure = { message: 'Mock save denied' }
  await submit(admin); admin.render(); assert.match(text(admin.tree), /Mock save denied/); assert.ok(nodes(admin.tree).some(n => n.type === 'form'))
  field(admin, 'Name').props.onChange({ target: { value: '   ' } }); admin.render(); const beforeInvalid = calls.length
  await submit(admin); admin.render(); assert.equal(calls.length, beforeInvalid); assert.match(text(admin.tree), /Name and testimonial quote are required/)
  field(admin, 'Name').props.onChange({ target: { value: 'Jane Smith' } }); admin.render()
  await submit(admin); admin.render(); assert.equal(calls.length, beforeInvalid); assert.match(text(admin.tree), /Placeholder testimonial identities/)
  const adminSource = fs.readFileSync(path.join(root, 'src/app/admin/testimonials/page.tsx'), 'utf8')
  assert.ok(!adminSource.includes('up to two')); assert.ok(adminSource.includes('up to three'))
  rows = []; const empty = await mount(Admin); assert.match(text(empty.tree), /No testimonials yet/)
  failure = { message: 'Mock admin read denied' }; const denied = await mount(Admin); assert.match(text(denied.tree), /Mock admin read denied/)
  authUser = null; await mount(Admin); assert.ok(navigations.includes('/admin/login'))
  assert.ok(calls.filter(c => c.operations.some(op => ['insert', 'update', 'delete'].includes(op[0]))).every(c => c.table === 'testimonials'))
  console.log('PASS: canonical testimonial source; independent brand/testimonial visibility; admin create/edit/order/validation/errors/delete confirmation; exact quote preservation and escaping; attribution/image clearing and failure fallback; empty/one/few static presentation; no rating defaults, inferred relationships, private-project/portal access, or active hard-coded review component. All external access mocked.')
})().catch(error => { console.error(error); process.exitCode = 1 })
