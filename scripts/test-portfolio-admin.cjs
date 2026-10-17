// Offline behavior checks. All database/storage access is mocked; no environment or network access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const root = path.resolve(__dirname, '..')
const cache = new Map()
let active
let calls = []
let navigations = []
let response
const sample = {
  id: 'sample-id', title: 'Example project', client_name: 'Example client', slug: 'example-project',
  category: 'Free category', industry: 'Free industry', project_type: 'Website', description: 'Description',
  brief: 'Context', challenge: '<p>Challenge</p>', solution: 'Solution', results_summary: 'Primary outcome',
  results: 'Legacy outcome', technologies_used: ['Example platform', 'Example tool'],
  website_url: 'https://example.com', image_url: '/cover.png', gallery_images: ['/one.png', '/two.png'],
  before_image: '/before.png', after_image: '/after.png', featured: true, is_active: true, is_before_after: true,
  display_order: 7, seo_title: 'Custom title', seo_description: 'Custom description',
  metric_label: '', metric_value: '', case_study_content: 'Legacy data stays stored', testimonial: 'Untouched',
}
const mockedClient = {
  from(table) {
    assert.equal(table, 'portfolio_items', 'No project, portal or other table access')
    const operations = []
    const query = {}
    for (const method of ['select', 'eq', 'order', 'limit', 'update', 'insert', 'delete', 'single', 'maybeSingle']) {
      query[method] = (...args) => { operations.push([method, ...args]); return query }
    }
    query.then = (resolve, reject) => {
      const call = { table, operations }
      calls.push(call)
      return Promise.resolve(response(call)).then(resolve, reject)
    }
    return query
  },
  storage: { from() { throw Error('Storage mutation attempted in offline test') } },
}
const stubUpload = () => null
const stubGallery = () => null
const hooks = {
  ...React,
  cache: fn => fn,
  useCallback: fn => fn,
  useId() { const host = active; const index = host.index++; return host.state[index] ||= `image-${++hooks.nextId}` },
  nextId: 0,
  useState(initial) {
    const host = active; const index = host.index++
    if (!(index in host.state)) host.state[index] = typeof initial === 'function' ? initial() : initial
    return [host.state[index], value => { host.state[index] = typeof value === 'function' ? value(host.state[index]) : value }]
  },
  useRef(initial) { const host = active; const index = host.index++; return host.state[index] ||= { current: initial } },
  useEffect(effect, deps) {
    const host = active; const index = host.index++
    const previous = host.state[index]
    if (!previous || deps.some((value, i) => value !== previous[i])) { host.state[index] = deps; host.effects.push(effect) }
  },
}
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx', '.js'].map(ext => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const localRequire = name => {
    if (name === 'react') return hooks
    if (name === '@/lib/supabase') return { supabase: mockedClient }
    if (name === '@/lib/blog-utils') return { absoluteUrl: value => 'https://hbeedigitals.com' + value }
    if (name === 'next/navigation') return { useParams: () => ({ id: 'sample-id' }), useRouter: () => ({ push: href => navigations.push(href) }) }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/image') return { __esModule: true, default: 'img' }
    if (name === '@/components/ImageUpload') return { __esModule: true, default: stubUpload }
    if (name === '@/components/admin/PortfolioGallery') return { __esModule: true, default: stubGallery }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const MockFormData = class { constructor(form) { this.form = form } get(key) { return this.form[key] } }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: localRequire, URL, console, confirm: () => true, FormData: MockFormData, process: { env: {} } }, { filename: file })
  return mod.exports
}
function host(Component, props = {}) {
  const h = { state: [], index: 0, effects: [], tree: null }
  h.render = (next = props) => { props = next; active = h; h.index = 0; h.tree = Component(props); active = null; for (const effect of h.effects.splice(0)) effect(); return h.tree }
  return h
}
function nodes(node) {
  if (Array.isArray(node)) return node.flatMap(nodes)
  if (!node || typeof node !== 'object') return []
  return [node, ...nodes(node.props?.children)]
}
const flattenText = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(flattenText).join('') : node?.props ? flattenText(node.props.children) : ''
function find(h, predicate) { const node = nodes(h.tree).find(predicate); assert.ok(node, 'Expected control exists'); return node }
const button = (h, label) => find(h, n => n.type === 'button' && flattenText(n) === label)
const field = (h, name) => find(h, n => n.props?.name === name && typeof n.type === 'function')
const tick = () => new Promise(resolve => setImmediate(resolve))
const plain = value => JSON.parse(JSON.stringify(value))
const submit = () => ({ preventDefault() {} })

;(async () => {
  const editor = load('src/lib/admin/portfolio-editor.ts')
  const form = editor.loadPortfolioEditor(sample)
  assert.deepEqual(plain(editor.portfolioPayload(form)), Object.fromEntries(Object.keys(editor.EMPTY_PORTFOLIO).map(key => [key, sample[key]])))
  for (const legacy of ['case_study_content', 'testimonial', 'technology', 'result_metrics']) assert.ok(!(legacy in editor.portfolioPayload(form)))
  assert.ok(!('case_study_content' in editor.portfolioPayload({ ...form, case_study_content: 'must not write' })))
  assert.deepEqual(plain(editor.loadPortfolioEditor({ ...sample, gallery_images: JSON.stringify(sample.gallery_images) }).gallery_images), sample.gallery_images)
  assert.throws(() => editor.loadPortfolioEditor({ ...sample, gallery_images: [{ url: '/image.png' }] }), /array of strings/)
  assert.throws(() => editor.loadPortfolioEditor({ ...sample, gallery_images: 'invalid' }), /invalid stored JSON/)
  for (const url of ['https://example.com/image.png', '/images/item.svg']) assert.ok(editor.validPortfolioImage(url))
  for (const url of ['javascript:alert(1)', '//example.com/a', 'http://example.com/a', '/a b', '/\\evil']) assert.ok(!editor.validPortfolioImage(url))
  assert.ok(editor.validPortfolioWebsite(''))
  assert.ok(!editor.validPortfolioWebsite('http://example.com'))
  assert.equal(editor.validatePortfolio({ ...form, slug: 'portfolio' }).slug.length > 0, true)
  assert.ok(editor.validatePortfolio({ ...form, display_order: 1.5 }).display_order)
  assert.deepEqual(plain(editor.moveGalleryImage(['/a', '/b', '/c'], 1, -1)), ['/b', '/a', '/c'])
  assert.deepEqual(plain(editor.moveGalleryImage(['/a', '/b'], 0, -1)), ['/a', '/b'])

  response = call => call.operations.some(op => op[0] === 'single') ? { data: sample, error: null } : { data: [sample], error: null }
  const list = host(load('src/app/admin/portfolio/page.tsx').default)
  list.render(); await tick(); list.render()
  assert.equal(find(list, n => n.type === 'a' && flattenText(n) === 'Edit').props.href, '/admin/portfolio/sample-id')
  assert.equal(find(list, n => n.type === 'a' && flattenText(n) === 'View /work page').props.href, '/work/example-project')
  button(list, 'Create New Project').props.onClick(); list.render()
  const inputs = nodes(list.tree).filter(n => n.type === 'input' && 'value' in n.props)
  inputs[0].props.onChange({ target: { value: 'New example' } }); list.render()
  const createForm = find(list, n => n.type === 'form' && nodes(n).some(x => x.props?.id === 'create-slug-hint'))
  response = call => call.operations.some(op => op[0] === 'insert') ? { data: { id: 'created-id' }, error: null } : { data: [sample], error: null }
  await createForm.props.onSubmit(submit())
  assert.equal(navigations.at(-1), '/admin/portfolio/created-id')
  const create = calls.find(call => call.operations.some(op => op[0] === 'insert')).operations.find(op => op[0] === 'insert')[1][0]
  assert.deepEqual(plain(create), { title: 'New example', client_name: 'New example', slug: 'new-example', is_active: false, featured: false, display_order: 0 })
  list.render()
  await button(list, 'Hide').props.onClick(); list.render()
  await button(list, 'Unfeature').props.onClick(); list.render()
  assert.ok(calls.some(call => call.operations.some(op => op[0] === 'update' && op[1].is_active === false)))
  assert.ok(calls.some(call => call.operations.some(op => op[0] === 'update' && op[1].featured === false)))
  find(list, n => n.type === 'form' && nodes(n).some(x => x.props?.name === 'display_order')).props.onSubmit({ preventDefault() {}, currentTarget: { display_order: '12' } })
  await tick(); list.render()
  assert.ok(calls.some(call => call.operations.some(op => op[0] === 'update' && op[1].display_order === 12)))

  response = () => ({ data: sample, error: null })
  const detail = host(load('src/app/admin/portfolio/[id]/page.tsx').default)
  detail.render(); await tick(); detail.render()
  for (const key of ['title', 'slug', 'client_name', 'category', 'industry', 'project_type', 'description', 'brief', 'challenge', 'solution', 'results_summary', 'results', 'website_url', 'image_url', 'before_image', 'after_image', 'seo_title', 'seo_description']) assert.equal(field(detail, key).props.value, sample[key])
  assert.match(field(detail, 'results_summary').props.hint, /precedence/)
  assert.match(field(detail, 'results').props.hint, /only when/)
  assert.equal(field(detail, 'technologies_used').props.value, sample.technologies_used.join('\n'))
  assert.match(field(detail, 'technologies_used').props.hint, /not verified/)
  field(detail, 'challenge').props.onChange('Updated challenge'); detail.render()
  field(detail, 'solution').props.onChange('Updated solution'); detail.render()
  field(detail, 'results_summary').props.onChange('Updated public outcome'); detail.render()
  field(detail, 'seo_title').props.onChange('Updated SEO title'); detail.render()
  find(detail, n => n.type === stubGallery).props.onChange(['/two.png', '/one.png']); detail.render()
  await find(detail, n => n.type === 'form').props.onSubmit(submit()); detail.render()
  const update = calls.filter(call => call.operations.some(op => op[0] === 'update')).at(-1).operations.find(op => op[0] === 'update')[1]
  assert.equal(update.challenge, 'Updated challenge'); assert.equal(update.solution, 'Updated solution')
  assert.equal(update.results_summary, 'Updated public outcome'); assert.equal(update.results, sample.results)
  assert.equal(update.seo_title, 'Updated SEO title'); assert.equal(update.seo_description, sample.seo_description)
  assert.deepEqual(plain(update.gallery_images), ['/two.png', '/one.png'])
  assert.equal(update.featured, true); assert.equal(update.is_active, true); assert.equal(update.display_order, 7)
  assert.ok(!('case_study_content' in update)); assert.ok(!('testimonial' in update))
  assert.match(flattenText(detail.tree), /Portfolio item saved/)
  const writesBefore = calls.length
  field(detail, 'website_url').props.onChange('http://example.com'); detail.render()
  await find(detail, n => n.type === 'form').props.onSubmit(submit()); detail.render()
  assert.ok(field(detail, 'website_url').props.error)
  assert.equal(calls.length, writesBefore, 'Invalid data never reaches database')
  field(detail, 'website_url').props.onChange(''); detail.render()
  response = () => ({ data: null, error: { message: 'Mocked save failure' } })
  await find(detail, n => n.type === 'form').props.onSubmit(submit()); detail.render()
  assert.match(flattenText(detail.tree), /Mocked save failure/)
  assert.match(flattenText(detail.tree), /Unsaved changes/)
  response = () => ({ data: null, error: { message: 'Mocked load failure' } })
  const failed = host(load('src/app/admin/portfolio/[id]/page.tsx').default)
  failed.render(); await tick(); failed.render()
  assert.match(flattenText(failed.tree), /Mocked load failure/)
  assert.equal(nodes(failed.tree).filter(n => n.type === 'form').length, 0, 'A failed load cannot overwrite a record with defaults')

  const Gallery = load('src/components/admin/PortfolioGallery.tsx').default
  let galleryImages = ['/one.png', '/two.png']
  const galleryProps = () => ({ images: galleryImages, onChange: images => { galleryImages = images } })
  const gallery = host(Gallery, galleryProps())
  gallery.render()
  find(gallery, n => n.props?.['aria-label'] === 'Move image 2 up').props.onClick(); gallery.render(galleryProps())
  assert.deepEqual(plain(galleryImages), ['/two.png', '/one.png'])
  find(gallery, n => n.props?.['aria-label'] === 'Remove image 2').props.onClick(); gallery.render(galleryProps())
  find(gallery, n => n.props?.id === 'gallery-new-url').props.onChange({ target: { value: 'javascript:bad' } }); gallery.render(galleryProps())
  button(gallery, 'Add image').props.onClick(); gallery.render(galleryProps())
  assert.equal(galleryImages.length, 1); assert.match(flattenText(gallery.tree), /HTTPS image URL/)
  find(gallery, n => n.props?.id === 'gallery-new-url').props.onChange({ target: { value: '/three.png' } }); gallery.render(galleryProps())
  button(gallery, 'Add image').props.onClick(); gallery.render(galleryProps())
  assert.deepEqual(plain(galleryImages), ['/two.png', '/three.png'])
  const pendingUpload = find(gallery, n => n.type === stubUpload).props.onUpload
  galleryImages = ['/changed.png']; gallery.render(galleryProps())
  pendingUpload('/uploaded.png'); gallery.render(galleryProps())
  assert.deepEqual(plain(galleryImages), ['/changed.png', '/uploaded.png'], 'Upload completion preserves edits made while uploading')

  const ImageUpload = load('src/components/ImageUpload.tsx').default
  const uploaderA = host(ImageUpload, { currentImage: '/image.png', label: 'Cover', contain: true, onUpload() {} })
  const uploaderB = host(ImageUpload, { label: 'Before', onUpload() {} })
  uploaderA.render(); uploaderB.render()
  const uploadA = find(uploaderA, n => n.type === 'input' && n.props.type === 'file')
  const uploadB = find(uploaderB, n => n.type === 'input' && n.props.type === 'file')
  assert.notEqual(uploadA.props.id, uploadB.props.id)
  assert.equal(find(uploaderA, n => n.type === 'label').props.htmlFor, uploadA.props.id)
  assert.equal(find(uploaderA, n => n.type === 'button').props.type, 'button', 'Remove cannot submit the portfolio form')
  assert.equal(find(uploaderA, n => n.type === 'img').props.className, 'object-contain')

  const work = load('src/lib/site/work-data.ts')
  const publicDetail = work.toWorkDetail({ ...sample, ...update })
  assert.equal(publicDetail.outcome, 'Updated public outcome')
  assert.equal(publicDetail.constraint, 'Updated challenge'); assert.equal(publicDetail.approach, 'Updated solution')
  assert.equal(work.toWorkDetail({ ...sample, results_summary: '', results: 'Fallback outcome' }).outcome, 'Fallback outcome')
  assert.equal(work.toWorkDetail({ ...sample, results_summary: 'Growth of 50%', results: 'Qualitative fallback' }).outcome, undefined)
  assert.equal(work.toWorkDetail({ ...sample, results_summary: '', results: '' }).outcome, undefined)
  assert.equal(work.toWorkDetail({ ...sample, website_url: '' }).liveUrl, undefined)
  assert.equal(publicDetail.liveUrl, sample.website_url)
  assert.deepEqual(plain(publicDetail.gallery).map(image => image.src), ['/two.png', '/one.png'])
  assert.equal(publicDetail.beforeAfter.length, 2)
  assert.ok(!('capabilities' in publicDetail))
  assert.equal(work.toWorkDetail({ ...sample, slug: 'portfolio' }), null)
  const listed = work.buildWorkData([{ ...sample, featured: false }, { ...sample, id: 'featured', featured: true }])
  assert.equal(listed.items[0].id, 'featured')
  calls = []
  response = () => ({ data: [sample], error: null })
  await work.getWorkData()
  assert.ok(calls[0].operations.some(op => op[0] === 'eq' && op[1] === 'is_active' && op[2] === true))
  assert.ok(calls[0].operations.some(op => op[0] === 'order' && op[1] === 'display_order'))
  response = () => ({ data: { ...sample, ...update }, error: null })
  const seo = await work.getWorkSeo(sample.slug)
  assert.equal(seo.title, update.seo_title); assert.equal(seo.description, update.seo_description)
  response = () => ({ data: [sample], error: null })
  const home = await load('src/lib/site/home-data.ts').getFeaturedWork()
  assert.deepEqual(plain(home[0].services), sample.technologies_used)
  assert.ok(!('capabilities' in home[0]))
  console.log('PASS: list Edit, draft → detail creation, list visibility/feature actions, field load/save, challenge/solution, results precedence, gallery add/remove/reorder/upload serialization, URL validation, SEO, public adapters, active/order filters, and no portal/capability crossover.')
})().catch(error => { console.error(error); process.exitCode = 1 })
