// Offline behavior checks. All database/storage access is mocked; no environment or network access.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const root = path.resolve(__dirname, '..')
const cache = new Map()
const testEnv = {}
let active
let calls = []
let navigations = []
let response
let rpcResponse = () => ({ data: '1', error: null })
const browserEvents = new Map()
const browser = {
  location: { href: 'https://example.test/work?category=food-beverage', search: '?category=food-beverage' },
  addEventListener: (name, handler) => browserEvents.set(name, handler),
  removeEventListener: name => browserEvents.delete(name),
  history: { pushState: (_, __, value) => { const url = new URL(value); browser.location.href = url.href; browser.location.search = url.search } },
}
const sample = {
  id: 'sample-id', title: 'Example project', client_name: 'Example client', slug: 'example-project',
  category: 'Free category', industry: 'Free industry', project_type: 'Website', description: 'Description',
  brief: 'Context', challenge: '<p>Challenge</p>', solution: 'Solution', results_summary: 'Primary outcome',
  results: 'Legacy outcome', technologies_used: ['Example platform', 'Example tool'],
  website_url: 'https://example.com', image_url: '/cover.png', gallery_images: ['/one.png', '/two.png'],
  before_image: '/before.png', after_image: '/after.png', featured: true, is_active: true, is_before_after: true,
  display_order: 7, seo_title: 'Custom title', seo_description: 'Custom description',
  metric_label: '', metric_value: '', case_study_content: 'Legacy data stays stored', testimonial: 'Untouched',
  creative_revision: '0',
}
const mockedClient = {
  from(table) {
    assert.ok(['portfolio_items', 'portfolio_media', 'portfolio_capabilities'].includes(table), 'No private project, portal or other table access')
    const operations = []
    const query = {}
    for (const method of ['select', 'eq', 'in', 'order', 'limit', 'update', 'insert', 'delete', 'single', 'maybeSingle']) {
      query[method] = (...args) => { operations.push([method, ...args]); return query }
    }
    query.then = (resolve, reject) => {
      const call = { table, operations }
      calls.push(call)
      return Promise.resolve(response(call)).then(resolve, reject)
    }
    return query
  },
  rpc(name, args) {
    assert.equal(name, 'save_portfolio_creative')
    calls.push({ table: 'rpc', name, args, operations: [] })
    return Promise.resolve(rpcResponse(args))
  },
  storage: { from() { throw Error('Storage mutation attempted in offline test') } },
}
const imageSizes = {} // url -> [naturalWidth, naturalHeight]; absent => load error
class FakeImage { set src(v) { setImmediate(() => { const size = imageSizes[v]; if (size) { this.naturalWidth = size[0]; this.naturalHeight = size[1]; this.onload && this.onload() } else this.onerror && this.onerror() }) } }
const stubUpload = () => null
const stubGallery = () => null
const MockImage = ({ fill, priority, unoptimized, ...props }) => React.createElement('img', props)
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
    if (name === '@/lib/blog-utils') return { SITE_URL: 'https://hbeedigitals.com', DEFAULT_OG_IMAGE: '/og-image.png', absoluteUrl: value => 'https://hbeedigitals.com' + value }
    if (name === 'next/navigation') return { notFound: () => { throw Error('NEXT_NOT_FOUND') }, redirect: url => { throw Error('NEXT_REDIRECT:' + url) }, useParams: () => ({ id: 'sample-id' }), useRouter: () => ({ push: href => navigations.push(href) }) }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/image') return { __esModule: true, default: MockImage }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.endsWith('/motion/SiteReveal')) return { SiteReveal: ({ children }) => React.createElement('div', null, children) }
    if (name === './WorkFilter') return { WorkFilter: ({ children }) => React.createElement('div', null, children) } // server-rendered listing check; the real filter is tested directly below
    if (name === '@/components/ImageUpload') return { __esModule: true, default: stubUpload }
    if (name === '@/components/admin/PortfolioGallery') return { __esModule: true, default: stubGallery }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const MockFormData = class { constructor(form) { this.form = form } get(key) { return this.form[key] } }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: localRequire, URL, URLSearchParams, console, crypto: require('node:crypto').webcrypto, confirm: () => true, FormData: MockFormData, Image: FakeImage, setTimeout, clearTimeout, process: { env: testEnv }, ...(file.endsWith('WorkFilter.tsx') ? { window: browser } : {}) }, { filename: file })
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
  assert.equal(find(uploaderA, n => n.type === MockImage).props.className, 'object-contain')

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
  const creative = load('src/lib/portfolio-creative.ts')
  assert.deepEqual(plain(creative.CAPABILITY_SLUGS), plain(load('src/components/site/services/services-content.ts').SERVICE_GROUPS.flatMap(g => g.capabilities.map(c => c.slug))))
  const asset = { id: '00000000-0000-4000-8000-000000000001', asset_type: 'logo', image_url: '/logo.png', alt_text: 'Example logo', caption: '<script>caption</script>', display_order: 0, is_visible: true, fit_mode: 'cover', width: null, height: null }
  const flyer = { ...asset, id: '00000000-0000-4000-8000-000000000002', image_url: '/flyer.png', asset_type: 'flyer', fit_mode: 'auto', display_order: 1 }
  assert.equal(creative.validateCreativeMedia([asset], ['brand-positioning']), undefined)
  assert.match(creative.validateCreativeMedia([{ ...asset, asset_type: 'constructor' }], []), /asset type/)
  assert.match(creative.validateCreativeMedia([asset], ['invented-service']), /six approved/)
  assert.match(creative.validateCreativeMedia([asset], ['brand-positioning', 'brand-positioning']), /once/)
  assert.match(creative.validateCreativeMedia([{ ...asset, alt_text: '' }], []), /alt text/)
  assert.match(creative.validateCreativeMedia([{ ...asset, width: 100 }], []), /both width/)
  assert.equal(creative.mediaPresentation(asset).fit, 'contain', 'Logo cannot be cropped by explicit cover setting')
  assert.equal(creative.mediaPresentation(flyer).ratio, '3 / 4')
  assert.equal(creative.mediaPresentation({ ...flyer, width: 800, height: 1200 }).ratio, '800 / 1200')
  assert.deepEqual(plain(creative.reorderMedia([asset, flyer], 1, -1)).map(m => m.image_url), ['/flyer.png', '/logo.png'])
  const creativePayload = creative.creativeSavePayload('sample-id', [flyer, asset], ['brand-positioning'], '0')
  assert.equal(creativePayload.p_media[0].display_order, 0)
  assert.equal(creativePayload.p_media[1].caption, asset.caption)
  assert.equal(creativePayload.p_media[1].alt_text, asset.alt_text)
  assert.equal(creativePayload.p_capabilities[0], 'brand-positioning')
  const typedDetail = work.toWorkDetail(sample, [flyer, { ...asset, is_visible: false }])
  assert.deepEqual(plain(typedDetail.gallery).map(m => m.src), ['/flyer.png'])
  assert.equal(typedDetail.heroImage.src, sample.image_url)
  assert.equal(typedDetail.beforeAfter.length, 2)
  assert.deepEqual(plain(work.toWorkDetail(sample, [{ ...asset, is_visible: false }]).gallery).map(m => m.src), sample.gallery_images)
  assert.equal(work.toWorkDetail({ ...sample, image_url: '', featured_image: '/fallback.png' }, [asset]).heroImage.src, '/fallback.png')
  assert.equal(work.toWorkDetail({ ...sample, image_url: '/logo.png' }, [asset]).heroImage.creative.asset_type, 'logo', 'A typed logo used as cover retains its contained presentation on detail')
  const creativeData = load('src/lib/site/portfolio-creative-data.ts')
  calls = []
  assert.deepEqual(plain(await creativeData.getPortfolioMedia('sample-id')), [])
  assert.deepEqual(plain(await creativeData.getCapabilityWork('brand-positioning')), [])
  assert.equal(calls.length, 0, 'Default-off flag makes no schema-dependent queries')
  testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED = 'true'
  response = call => call.table === 'portfolio_media' ? { data: [flyer, asset], error: null }
    : call.table === 'portfolio_capabilities' ? { data: [{ portfolio_id: 'sample-id' }], error: null }
    : { data: [sample, { ...sample, id: 'unassigned' }, { ...sample, is_active: false }], error: null }
  const typedRead = await creativeData.getPortfolioMedia('sample-id')
  assert.deepEqual(plain(typedRead).map(m => m.asset_type), ['logo', 'flyer'])
  const attributed = await creativeData.getCapabilityWork('brand-positioning')
  assert.equal(attributed.length, 1); assert.equal(attributed[0].id, 'sample-id')
  assert.ok(calls.some(c => c.table === 'portfolio_media' && c.operations.some(op => op[0] === 'eq' && op[1] === 'is_visible' && op[2] === true)))
  assert.ok(calls.some(c => c.table === 'portfolio_capabilities' && c.operations.some(op => op[0] === 'eq' && op[1] === 'capability_slug' && op[2] === 'brand-positioning')))
  assert.ok(calls.some(c => c.table === 'portfolio_items' && c.operations.some(op => op[0] === 'eq' && op[1] === 'is_active' && op[2] === true)))
  assert.ok(calls.some(c => c.table === 'portfolio_items' && c.operations.some(op => op[0] === 'limit' && op[1] === 3)))
  const queryCount = calls.length
  assert.deepEqual(plain(await creativeData.getCapabilityWork('invented-service')), [])
  assert.equal(calls.length, queryCount)
  response = () => ({ data: null, error: { message: 'Missing schema' } })
  assert.deepEqual(plain(await creativeData.getPortfolioMedia('sample-id')), [])
  assert.deepEqual(plain(await creativeData.getCapabilityWork('brand-positioning')), [])
  response = call => call.table === 'portfolio_items' ? { data: { creative_revision: '0' }, error: null } : call.table === 'portfolio_media' ? { data: [asset], error: null } : { data: [{ capability_slug: 'brand-positioning' }], error: null }
  const CreativeEditor = load('src/components/admin/PortfolioCreativeMedia.tsx').default
  const creativeHost = host(CreativeEditor, { portfolioId: 'sample-id', disabled: false })
  creativeHost.render(); await tick(); creativeHost.render()
  assert.ok(flattenText(creativeHost.tree).includes('Asset 1'))
  const altControl = find(creativeHost, n => n.type === 'input' && n.props.value === asset.alt_text)
  altControl.props.onChange({ target: { value: 'Changed alt text' } }); creativeHost.render()
  const captionControl = find(creativeHost, n => n.type === 'textarea' && n.props.value === asset.caption)
  captionControl.props.onChange({ target: { value: 'Changed caption' } }); creativeHost.render()
  await button(creativeHost, 'Save creative media & capabilities').props.onClick(); creativeHost.render()
  const childSave = calls.filter(c => c.table === 'rpc').at(-1)
  assert.equal(childSave.args.p_media[0].alt_text, 'Changed alt text')
  assert.equal(childSave.args.p_media[0].caption, 'Changed caption')
  assert.deepEqual(plain(childSave.args.p_capabilities), ['brand-positioning'])
  assert.equal(childSave.args.p_expected_revision, '0')
  assert.equal(childSave.args.p_clear_media, false)
  assert.equal(childSave.args.p_clear_capabilities, false)

  // Offline RPC contract model. PostgreSQL execution/RLS is deliberately not
  // attempted; static checks below tie its safeguards to the SQL artifact.
  let serverState = { revision: 0n, media: [plain(asset)], capabilities: ['brand-positioning'] }
  const modelSave = args => {
    if (BigInt(args.p_expected_revision) !== serverState.revision) return { data: null, error: { code: '40001', message: 'Creative metadata conflict' } }
    if (args.p_media.length || args.p_clear_media) serverState.media = plain(args.p_media)
    if (args.p_capabilities.length || args.p_clear_capabilities) serverState.capabilities = plain(args.p_capabilities)
    serverState.revision++
    return { data: String(serverState.revision), error: null }
  }
  let saved = modelSave(creative.creativeSavePayload('sample-id', [], [], '0'))
  assert.equal(saved.data, '1')
  assert.equal(serverState.media.length, 1, 'Ordinary empty arrays preserve media')
  assert.deepEqual(serverState.capabilities, ['brand-positioning'], 'Ordinary empty arrays preserve assignments')
  const staleState = JSON.stringify({ ...serverState, revision: String(serverState.revision) })
  assert.equal(modelSave(creative.creativeSavePayload('sample-id', [], [], '0', true, true)).error.code, '40001')
  assert.equal(JSON.stringify({ ...serverState, revision: String(serverState.revision) }), staleState, 'Stale full replacement cannot mutate collections')
  assert.equal(modelSave(creative.creativeSavePayload('sample-id', [], [], '1', true, false)).data, '2')
  assert.equal(serverState.media.length, 0); assert.equal(serverState.capabilities.length, 1)
  assert.equal(modelSave(creative.creativeSavePayload('sample-id', [], [], '2', false, true)).data, '3')
  assert.equal(serverState.capabilities.length, 0)
  assert.throws(() => creative.creativeSavePayload('sample-id', [asset], [], '3', true), /empty collection/)
  assert.throws(() => creative.creativeRevision(Number.MAX_SAFE_INTEGER + 1), /revision/)

  async function freshCreative(overrides = {}) {
    response = call => call.table === 'portfolio_items' ? (overrides.parent || { data: { creative_revision: String(serverState.revision) }, error: null })
      : call.table === 'portfolio_media' ? (overrides.media || { data: plain(serverState.media), error: null })
      : (overrides.capabilities || { data: serverState.capabilities.map(capability_slug => ({ capability_slug })), error: null })
    const h = host(CreativeEditor, { portfolioId: 'sample-id', disabled: false })
    h.render(); await tick(); h.render(); return h
  }
  serverState = { revision: 0n, media: [plain(asset)], capabilities: ['brand-positioning'] }
  const childRepairStart = calls.length
  const absentMigration = await freshCreative({ parent: { data: null, error: { message: 'column creative_revision does not exist' } } })
  assert.match(flattenText(absentMigration.tree), /creative_revision does not exist/)
  const failedMedia = await freshCreative({ media: { data: null, error: { message: 'Media load failed' } } })
  assert.match(flattenText(failedMedia.tree), /Media load failed/)
  const failedCapabilities = await freshCreative({ capabilities: { data: null, error: { message: 'Capabilities load failed' } } })
  assert.match(flattenText(failedCapabilities.tree), /Capabilities load failed/)
  const invalidMedia = await freshCreative({ media: { data: [{ ...asset, alt_text: '' }], error: null } })
  assert.match(flattenText(invalidMedia.tree), /alt text/)
  for (const h of [absentMigration, failedMedia, failedCapabilities, invalidMedia]) assert.ok(!nodes(h.tree).some(n => n.type === 'button'), 'Failed load exposes no save control')
  let loadRevisionReads = 0
  response = call => call.table === 'portfolio_items' ? { data: { creative_revision: String(loadRevisionReads++) }, error: null } : { data: [], error: null }
  const inconsistentLoad = host(CreativeEditor, { portfolioId: 'sample-id', disabled: false })
  inconsistentLoad.render(); await tick(); inconsistentLoad.render()
  assert.match(flattenText(inconsistentLoad.tree), /changed while loading/)
  assert.ok(!nodes(inconsistentLoad.tree).some(n => n.type === 'button'))
  const beforeConflict = await freshCreative()
  find(beforeConflict, n => n.type === 'input' && n.props.value === asset.alt_text).props.onChange({ target: { value: 'Local stale edit' } }); beforeConflict.render()
  serverState.revision++ // A different editor committed after this snapshot loaded.
  rpcResponse = modelSave
  await button(beforeConflict, 'Save creative media & capabilities').props.onClick(); beforeConflict.render()
  assert.match(flattenText(beforeConflict.tree), /changed on the server/)
  assert.match(flattenText(beforeConflict.tree), /Unsaved creative changes/)
  assert.equal(serverState.media[0].alt_text, asset.alt_text)
  assert.equal(button(beforeConflict, 'Save creative media & capabilities').props.disabled, true)

  const concurrent = await freshCreative()
  const upload = () => find(concurrent, n => n.type === stubUpload && n.props.label === 'Upload new creative asset')
  upload().props.onUploadingChange(true); concurrent.render()
  assert.match(flattenText(concurrent.tree), /Uploading 1 asset/)
  const rpcCount = calls.filter(c => c.table === 'rpc').length
  await button(concurrent, 'Save creative media & capabilities').props.onClick()
  assert.equal(calls.filter(c => c.table === 'rpc').length, rpcCount, 'Pending upload blocks RPC even if handler is invoked')
  upload().props.onUpload('/uploaded.png'); upload().props.onUploadingChange(false); concurrent.render()
  // Empty text inputs in order: asset 1 title, asset 2 alt text (the new upload), asset 2 title.
  nodes(concurrent.tree).filter(n => n.type === 'input' && n.props.type !== 'number' && n.props.value === '')[1].props.onChange({ target: { value: 'Uploaded asset alt' } }); concurrent.render()
  rpcResponse = () => ({ data: null, error: { message: 'Metadata save failed' } })
  await button(concurrent, 'Save creative media & capabilities').props.onClick(); concurrent.render()
  assert.match(flattenText(concurrent.tree), /Metadata save failed/)
  assert.ok(nodes(concurrent.tree).some(n => n.type === 'input' && n.props.value === '/uploaded.png'))
  assert.match(flattenText(concurrent.tree), /Unsaved creative changes/)
  rpcResponse = modelSave
  await button(concurrent, 'Save creative media & capabilities').props.onClick(); concurrent.render()
  assert.equal(serverState.media.length, 2, 'Uploaded metadata remains retryable after failure')
  assert.match(flattenText(concurrent.tree), /No unsaved creative changes/)

  // Even a late callback arriving after save started must survive its response.
  find(concurrent, n => n.type === 'input' && n.props.value === asset.alt_text).props.onChange({ target: { value: 'Snapshot alt' } }); concurrent.render()
  let finishSave
  rpcResponse = args => new Promise(resolve => { finishSave = () => resolve(modelSave(args)) })
  const lateUpload = upload().props.onUpload
  const savePromise = button(concurrent, 'Save creative media & capabilities').props.onClick()
  lateUpload('/late-upload.png'); concurrent.render()
  finishSave(); await savePromise; concurrent.render()
  assert.ok(nodes(concurrent.tree).some(n => n.type === 'input' && n.props.value === '/late-upload.png'))
  assert.match(flattenText(concurrent.tree), /Newer local changes remain unsaved/)
  assert.match(flattenText(concurrent.tree), /Unsaved creative changes/)
  const emptyAlt = nodes(concurrent.tree).filter(n => n.type === 'input' && n.props.type !== 'number' && n.props.value === '')[2] // titles of assets 1-2, then asset 3 alt
  emptyAlt.props.onChange({ target: { value: 'Late asset alt' } }); concurrent.render()
  rpcResponse = modelSave
  await button(concurrent, 'Save creative media & capabilities').props.onClick(); concurrent.render()
  assert.equal(serverState.media.length, 3, 'Late upload can be saved against the returned revision')
  button(concurrent, 'Clear all assets on save').props.onClick(); concurrent.render()
  button(concurrent, 'Clear all capability assignments on save').props.onClick(); concurrent.render()
  await button(concurrent, 'Save creative media & capabilities').props.onClick(); concurrent.render()
  assert.equal(serverState.media.length, 0); assert.equal(serverState.capabilities.length, 0)
  const cleared = calls.filter(c => c.table === 'rpc').at(-1).args
  assert.equal(cleared.p_clear_media, true); assert.equal(cleared.p_clear_capabilities, true)
  assert.ok(!calls.slice(childRepairStart).some(c => c.table === 'portfolio_items' && c.operations.some(op => ['update','insert','delete'].includes(op[0]))), 'Creative failures/saves never submit parent business fields')

  const forwardSql = fs.readFileSync(path.join(root, 'scripts/portfolio-creative-01-forward.sql'), 'utf8')
  const verifySql = fs.readFileSync(path.join(root, 'scripts/portfolio-creative-03-verify.sql'), 'utf8')
  assert.ok(forwardSql.indexOf('for update;') < forwardSql.indexOf('current_revision <> p_expected_revision'))
  assert.ok(forwardSql.indexOf('current_revision <> p_expected_revision') < forwardSql.indexOf('insert into public.portfolio_media'))
  assert.match(forwardSql, /errcode='40001'/)
  assert.match(forwardSql, /jsonb_array_length\(p_media\) > 0 or p_clear_media/)
  assert.match(forwardSql, /cardinality\(p_capabilities\) > 0 or p_clear_capabilities/)
  assert.match(forwardSql, /before insert or update or delete/)
  assert.match(forwardSql, /creative_revision=creative_revision\+1/)
  assert.match(forwardSql, /aclexplode\(coalesce\(p.proacl,acldefault/)
  assert.match(forwardSql, /from public cascade/)
  assert.match(verifySql, /BLOCKER: UNEXPECTED RPC GRANT/)
  assert.match(verifySql, /x.grantee=0 then 'BLOCKER'/)
  assert.match(verifySql, /EFFECTIVE EXECUTE MISMATCH/)
  assert.match(verifySql, /pg_get_functiondef/)
  assert.match(verifySql, /pg_get_userbyid\(p.proowner\)/)
  assert.match(verifySql, /pg_indexes/)
  const { portfolioUploadExtension } = load('src/lib/portfolio-upload.ts')
  const fakeFile = (type, bytes, name = 'untrusted.svg') => ({ type, name, size: bytes.length, slice: () => ({ arrayBuffer: async () => Uint8Array.from(bytes).buffer }) })
  assert.equal(await portfolioUploadExtension(fakeFile('image/png', [137,80,78,71,13,10,26,10])), 'png', 'Extension follows MIME/header, not untrusted name')
  await assert.rejects(() => portfolioUploadExtension(fakeFile('image/svg+xml', [60,115,118,103])), /SVG/)
  await assert.rejects(() => portfolioUploadExtension(fakeFile('image/png', [60,115,118,103])), /contents/)
  const lifecycle = []
  let uploadedUrl = ''
  let uploadedPath = ''
  const originalStorage = mockedClient.storage
  mockedClient.storage = { from(bucket) {
    assert.equal(bucket, 'project-images')
    return { upload: async path => { uploadedPath = path; return { error: null } }, getPublicUrl: () => ({ data: { publicUrl: 'https://example.test/uploaded.png' } }) }
  } }
  const uploadLifecycle = host(ImageUpload, { label: 'Test upload', folder: 'portfolio', onUploadingChange: value => lifecycle.push(value), onUpload: url => { uploadedUrl = url } })
  uploadLifecycle.render()
  const pngFile = fakeFile('image/png', [137,80,78,71,13,10,26,10])
  find(uploadLifecycle, n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [pngFile] } })
  assert.deepEqual(lifecycle, [true], 'Upload starts reporting synchronously, before save can race')
  await tick(); uploadLifecycle.render()
  assert.deepEqual(lifecycle, [true, false])
  assert.equal(uploadedUrl, 'https://example.test/uploaded.png')
  assert.match(uploadedPath, /^portfolio\/.*\.png$/)
  const disabledUpload = host(ImageUpload, { label: 'Disabled upload', folder: 'portfolio', disabled: true, onUploadingChange() { throw Error('Disabled upload started') }, onUpload() {} })
  disabledUpload.render()
  find(disabledUpload, n => n.type === 'input' && n.props.type === 'file').props.onChange({ target: { files: [pngFile] } })
  find(disabledUpload, n => n.props?.onDrop).props.onDrop({ preventDefault() {}, dataTransfer: { files: [pngFile] } })
  mockedClient.storage = originalStorage
  const filter = load('src/lib/site/work-filter.ts')
  const categories = [{ key: 'food & beverage', label: 'Food & Beverage' }]
  assert.equal(filter.workCategoryFromQuery('food-beverage', categories), 'food & beverage')
  assert.equal(filter.workCategoryFromQuery('imaginary', categories), 'all')
  const { renderToStaticMarkup } = require('react-dom/server')
  const WorkDetailPage = load('src/components/site/work/WorkDetail.tsx').WorkDetailPage
  const html = renderToStaticMarkup(React.createElement(WorkDetailPage, { detail: work.toWorkDetail(sample, [asset, flyer]) }))
  assert.match(html, /object-fit:contain/)
  assert.match(html, /aspect-ratio:3 \/ 4/)
  assert.ok(html.includes('&lt;script&gt;caption&lt;/script&gt;'), 'Caption is escaped as text')
  assert.ok(!html.includes('<script>caption'))
  const capabilitySections = load('src/components/site/capability/CapabilitySections.tsx')
  const capabilityContent = load('src/components/site/capability/capability-content.ts').CAPABILITY_DETAILS['brand-positioning']
  const attributedHtml = renderToStaticMarkup(React.createElement(capabilitySections.CapabilityWork, { detail: capabilityContent, work: attributed }))
  assert.ok(attributedHtml.includes('/work/example-project'))
  const emptyHtml = renderToStaticMarkup(React.createElement(capabilitySections.CapabilityWork, { detail: capabilityContent }))
  assert.ok(emptyHtml.includes(capabilityContent.work.empty.replace(/&/g, '&amp;')))
  assert.ok(emptyHtml.includes('href="/work"'))
  const Filter = load('src/components/site/work/WorkFilter.tsx').WorkFilter
  const filterHost = host(Filter, { categories: [{ ...categories[0], count: 1 }], total: 2, children: null })
  filterHost.render(); filterHost.render()
  assert.equal(find(filterHost, n => n.type === 'select').props.value, 'food & beverage')
  find(filterHost, n => n.type === 'select').props.onChange({ target: { value: 'all' } }); filterHost.render()
  assert.equal(browser.location.search, '')
  browser.location.search = '?category=food-beverage'; browserEvents.get('popstate')(); filterHost.render()
  assert.equal(find(filterHost, n => n.type === 'select').props.value, 'food & beverage')
  response = call => call.table === 'portfolio_items' ? { data: sample, error: null } : { data: [asset], error: null }
  assert.equal((await work.getWorkDetail(sample.slug)).gallery[0].creative.asset_type, 'logo')
  const routes = load('src/app/(site)/services/[capability]/page.tsx')
  assert.equal(routes.generateStaticParams().length, 6)
  assert.equal(routes.dynamicParams, false)
  assert.equal(routes.revalidate, 300)
  assert.equal(routes.generateMetadata({ params: { capability: 'brand-positioning' } }).alternates.canonical, 'https://hbeedigitals.com/services/brand-positioning')
  const capabilityTemplate = load('src/components/site/capability/CapabilityDetailPage.tsx').CapabilityDetailPage
  assert.throws(() => capabilityTemplate({ slug: 'invented-service' }), /NEXT_NOT_FOUND/)
  const beforeReserved = calls.length
  assert.equal(await work.getWorkDetail('portfolio'), null)
  assert.equal(calls.length, beforeReserved)
  delete testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED
  calls = []
  const legacyDetail = await work.getWorkDetail(sample.slug)
  assert.deepEqual(plain(legacyDetail.gallery).map(m => m.src), sample.gallery_images)
  assert.ok(calls.every(call => call.table === 'portfolio_items'))
  // ── C1.8 public creative experience ──────────────────────────────────────
  const cls = load('src/lib/site/work-classification.ts')
  assert.equal(cls.engagementTypeOf('client'), 'client')
  for (const v of ['Client', 'CLIENT', ' client', 'studio_team', '', null, undefined, 1]) assert.equal(cls.engagementTypeOf(v), 'studio_team', 'only the exact string client is a client engagement')
  assert.equal(cls.projectStatusOf('ongoing'), 'ongoing'); assert.equal(cls.projectStatusOf('Ongoing'), 'completed'); assert.equal(cls.projectStatusOf(undefined), 'completed')
  assert.deepEqual(plain(cls.capabilityRefs(['retention-growth', 'bogus', 'brand-positioning', 'brand-positioning'])).map(c => c.slug), ['brand-positioning', 'retention-growth'])
  assert.equal(cls.capabilityRefs(['brand-positioning'])[0].name, 'Brand & Positioning')
  assert.equal(cls.videoPlayback('https://cdn.example.com/a/clip.mp4?x=1').mode, 'file')
  assert.equal(cls.videoPlayback('https://youtube.com/watch?v=1').mode, 'link')
  assert.equal(cls.videoPlayback('http://cdn.example.com/clip.mp4'), null); assert.equal(cls.videoPlayback('javascript:alert(1)'), null)

  const vid = { ...asset, id: '00000000-0000-4000-8000-000000000010', asset_type: 'social-creative', image_url: '/poster.png', alt_text: 'Poster alt', media_kind: 'video', title: 'Launch film', description: 'Thirty second launch film', video_url: 'https://cdn.example.com/launch.mp4', captions_url: 'https://cdn.example.com/launch.vtt', transcript: 'Line one\nLine two', display_order: 5, is_visible: true, fit_mode: 'auto', caption: '' }
  assert.equal(creative.validateCreativeMedia([vid], []), undefined)
  assert.match(creative.validateCreativeMedia([{ ...vid, video_url: null }], []), /video URL/)
  assert.match(creative.validateCreativeMedia([{ ...vid, title: ' ' }], []), /title and a description/)
  assert.match(creative.validateCreativeMedia([{ ...vid, video_url: 'http://x.test/a.mp4' }], []), /HTTPS/)
  assert.match(creative.validateCreativeMedia([{ ...asset, video_url: 'https://x.test/a.mp4' }], []), /Only video/)
  assert.equal(creative.readCreativeMedia([{ ...flyer }])[0].media_kind, 'image', 'rows without v3 columns read as images')

  const { renderToStaticMarkup: render } = require('react-dom/server')
  const Detail = load('src/components/site/work/WorkDetail.tsx').WorkDetailPage
  const mk = (row, media, caps, next) => render(React.createElement(Detail, { detail: work.toWorkDetail(row, media, caps && { capabilities: caps }), next }))
  const hiddenImg = { ...flyer, id: '00000000-0000-4000-8000-000000000020', image_url: '/hidden.png', is_visible: false }
  const second = { ...flyer, id: '00000000-0000-4000-8000-000000000021', image_url: '/second.png', display_order: 0, asset_type: 'logo' }
  const base = { ...sample, engagement_type: 'client', project_status: 'completed' }

  // Flag OFF: no creative model, no creative wording, identical legacy output.
  assert.equal(work.toWorkDetail(base).creative, undefined)
  assert.equal(work.buildWorkData([base]).items[0].creative, undefined)
  const legacyHtml = mk(base, [])
  for (const word of ['Client engagement', 'Studio work', 'Where Hbee', 'Next project', 'Progress so far']) assert.ok(!legacyHtml.includes(word), 'legacy has no ' + word)
  assert.ok(legacyHtml.includes('Client') && legacyHtml.includes('What was delivered') && legacyHtml.includes('Outcome'))

  // Client vs studio wording.
  const clientHtml = mk(base, [], [])
  assert.ok(clientHtml.includes('Client engagement') && clientHtml.includes('<dt>Client</dt>'))
  const studio = { ...base, engagement_type: 'studio_team' }
  const studioHtml = mk(studio, [], [])
  assert.ok(studioHtml.includes('Studio work') && !studioHtml.includes('Client engagement') && !studioHtml.includes('<dt>Client</dt>'))
  const unknownHtml = mk({ ...base, engagement_type: 'Client' }, [], [])
  assert.ok(!unknownHtml.includes('Client engagement') && unknownHtml.includes('Studio work'), 'mis-cased value is never client wording')
  const missingHtml = mk({ ...base, engagement_type: undefined, project_status: undefined }, [], [])
  assert.ok(missingHtml.includes('Studio work') && missingHtml.includes('Completed'))

  // Ongoing vs completed.
  const ongoingHtml = mk({ ...base, project_status: 'ongoing' }, [], [])
  assert.ok(ongoingHtml.includes('Ongoing') && ongoingHtml.includes('Progress so far') && ongoingHtml.includes('What is being built') && !ongoingHtml.includes('What was delivered') && !ongoingHtml.includes('>Outcome<'))
  assert.ok(clientHtml.includes('What was delivered') && clientHtml.includes('Outcome') && !clientHtml.includes('Progress so far'))

  // Media: hidden excluded, order respected, videos separated, poster/video metadata, captions, transcript.
  const media = [flyer, hiddenImg, second, vid, { ...vid, id: '00000000-0000-4000-8000-000000000030', is_visible: false, title: 'Hidden film' }]
  const d = work.toWorkDetail(base, media, { capabilities: [] })
  assert.deepEqual(plain(d.gallery).filter(g => g.creative).map(g => g.src), ['/second.png', '/flyer.png'], 'ordered by display_order, hidden and video excluded from stills')
  assert.equal(d.creative.videos.length, 1)
  const mediaHtml = render(React.createElement(Detail, { detail: d }))
  assert.ok(!mediaHtml.includes('/hidden.png') && !mediaHtml.includes('Hidden film'))
  assert.ok(mediaHtml.includes('poster="/poster.png"') && mediaHtml.includes('src="https://cdn.example.com/launch.mp4"') && mediaHtml.includes('type="video/mp4"'))
  assert.ok(mediaHtml.includes('Launch film') && mediaHtml.includes('Thirty second launch film') && mediaHtml.includes('<track kind="captions" src="https://cdn.example.com/launch.vtt"') && mediaHtml.includes('Transcript'))
  assert.ok(mediaHtml.includes('preload="none"') && !mediaHtml.includes('autoPlay') && !mediaHtml.includes('autoplay'))
  assert.ok(mediaHtml.includes('Logo'), 'asset kind label in creative mode')
  assert.equal(work.toWorkDetail(base, [{ ...vid, video_url: 'http://insecure.test/a.mp4' }, { ...vid, title: '' }], { capabilities: [] }).creative.videos.length, 0, 'invalid video rows are not shown')
  const linkHtml = mk(base, [{ ...vid, video_url: 'https://youtube.com/watch?v=abc' }], [])
  assert.ok(!linkHtml.includes('<video') && linkHtml.includes('href="https://youtube.com/watch?v=abc"') && linkHtml.includes('noopener'), 'hosted-player pages are linked, never embedded')
  assert.ok(work.toWorkDetail(base, [vid], { capabilities: [] }).gallery.every(g => g.src !== '/poster.png'), 'a video poster is not duplicated in the stills gallery')
  assert.deepEqual(plain(work.toWorkDetail(base, [vid], { capabilities: [] }).gallery).map(g => g.src), sample.gallery_images, 'legacy gallery still shown when only a video exists')

  // Capabilities: rendered with links; absent heading when none.
  const capHtml = mk(base, [], ['commerce-experience', 'brand-positioning', 'invented'])
  assert.ok(capHtml.includes('Where Hbee’s system was involved') && capHtml.includes('href="/services/brand-positioning"') && capHtml.includes('Commerce Experience') && !capHtml.includes('invented'))
  assert.ok(capHtml.indexOf('Brand &amp; Positioning') < capHtml.indexOf('Commerce Experience'))

  // Lean row: no empty optional sections or headings.
  const lean = { id: 'lean', slug: 'lean-project', client_name: 'Lean', is_active: true, engagement_type: 'studio_team' }
  const leanHtml = mk(lean, [], [])
  for (const word of ['Where Hbee', 'Creative in motion', 'A closer look', 'Outcome', 'Progress so far', 'Next project', 'Platforms', 'What was delivered', 'What is being built', 'The challenge']) assert.ok(!leanHtml.includes(word), 'no empty ' + word)
  assert.ok(leanHtml.includes('Lean'))
  assert.ok(mk({ ...base, technologies_used: ['Shopify', 'Klaviyo'] }, [], []).includes('Shopify, Klaviyo'))
  const nextHtml = mk(base, [], [], { client: 'Other', title: 'Other title', href: '/work/other', category: 'Fashion' })
  assert.ok(nextHtml.includes('Next project') && nextHtml.includes('href="/work/other"'))
  assert.ok(!render(React.createElement(Detail, { detail: work.toWorkDetail(base), next: { client: 'Other', href: '/work/other' } })).includes('Next project'), 'no next-project module without the flag')

  // Listing: classification, capability, cover fallback, ordering rules preserved.
  const idx = { capabilities: { a: ['creative-ugc', 'brand-positioning', 'digital-systems'] }, cover: { b: { src: '/typed-cover.png', alt: 'Typed cover alt' } } }
  const listing = work.buildWorkData([
    { ...sample, id: 'a', slug: 'a-proj', engagement_type: 'client', project_status: 'ongoing', featured: false },
    { ...sample, id: 'b', slug: 'b-proj', image_url: '', featured_image: '', after_image: '', engagement_type: 'studio_team', featured: false },
  ], idx)
  assert.equal(listing.items[0].creative.engagement, 'client'); assert.equal(listing.items[0].creative.status, 'ongoing')
  assert.deepEqual(plain(listing.items[0].creative.capabilities).map(c => c.slug), ['brand-positioning', 'digital-systems', 'creative-ugc'])
  assert.equal(listing.items[1].image.src, '/typed-cover.png'); assert.equal(listing.items[1].image.alt, 'Typed cover alt')
  assert.equal(listing.items[0].image.src, '/cover.png', 'parent cover wins over typed media')
  const Sections = load('src/components/site/work/WorkSections.tsx')
  const listHtml = render(React.createElement(Sections.WorkCollection, { data: listing }))
  assert.ok(listHtml.includes('Client engagement') && listHtml.includes('Studio work') && listHtml.includes('Ongoing') && listHtml.includes('Brand &amp; Positioning · Digital Systems') && listHtml.includes('+1'))
  const plainList = render(React.createElement(Sections.WorkCollection, { data: work.buildWorkData([sample]) }))
  assert.ok(!plainList.includes('Client engagement') && !plainList.includes('Studio work') && !plainList.includes('Ongoing'))
  assert.ok(render(React.createElement(Sections.WorkHero, { creative: true })).includes('Selected projects') && render(React.createElement(Sections.WorkHero, {})).includes('Case studies'))

  // Admin: classification saves ONLY its two columns; video fields survive the save payload.
  const vp = creative.creativeSavePayload('sample-id', [vid], [], '3').p_media[0]
  assert.equal(vp.media_kind, 'video'); assert.equal(vp.video_url, vid.video_url); assert.equal(vp.transcript, vid.transcript)
  assert.throws(() => creative.creativeSavePayload('sample-id', [{ ...vid, title: '' }], [], '3'), /title and a description/)
  response = call => call.table === 'portfolio_items' ? { data: { engagement_type: 'weird', project_status: null, id: 'sample-id' }, error: null } : { data: null, error: null }
  calls = []
  const cl = host(load('src/components/admin/PortfolioClassification.tsx').default, { portfolioId: 'sample-id', disabled: false })
  cl.render(); await tick(); cl.render()
  assert.equal(find(cl, n => n.props?.name === 'engagement_type' && n.props.value === 'studio_team').props.checked, true, 'unknown stored value loads as the safe studio default')
  assert.equal(find(cl, n => n.type === 'button').props.disabled, true, 'nothing to save until changed')
  find(cl, n => n.props?.name === 'engagement_type' && n.props.value === 'client').props.onChange(); find(cl, n => n.props?.name === 'project_status' && n.props.value === 'ongoing').props.onChange(); cl.render()
  calls = []
  await find(cl, n => n.type === 'button').props.onClick(); cl.render()
  const upd = calls.find(c => c.table === 'portfolio_items' && c.operations.some(op => op[0] === 'update'))
  assert.deepEqual(plain(upd.operations.find(op => op[0] === 'update')[1]), { engagement_type: 'client', project_status: 'ongoing', is_case_study: false })
  assert.ok(upd.operations.some(op => op[0] === 'eq' && op[1] === 'id' && op[2] === 'sample-id'))
  assert.match(flattenText(cl.tree), /Saved. Public pages/)

  // Data layer (flag on): bounded reads, hidden media filtered at the query, failures degrade.
  testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED = 'true'
  calls = []
  response = call => call.table === 'portfolio_capabilities' ? { data: [{ portfolio_id: 'p1', capability_slug: 'creative-ugc' }, { portfolio_id: 'p1', capability_slug: 'bogus' }], error: null }
    : call.table === 'portfolio_media' ? { data: [{ portfolio_id: 'p1', id: 'm2', image_url: '/m2.png', alt_text: 'm2', display_order: 2 }, { portfolio_id: 'p1', id: 'm1', image_url: '/m1.png', alt_text: 'm1', display_order: 1 }], error: null }
    : { data: [{ ...sample, id: 'p1', slug: 'p-one' }, { ...sample, id: 'p2', slug: 'p-two' }], error: null }
  const index = await creativeData.getWorkCreativeIndex(['p1'])
  assert.deepEqual(plain(index.capabilities), { p1: ['creative-ugc'] }); assert.equal(index.cover.p1.src, '/m1.png')
  assert.ok(calls.some(c => c.table === 'portfolio_media' && c.operations.some(op => op[0] === 'eq' && op[1] === 'is_visible' && op[2] === true)))
  const nextItem = await work.getNextWork('p-one'); assert.equal(nextItem.slug, 'p-two')
  assert.equal((await work.getNextWork('p-two')).slug, 'p-one', 'wraps')
  assert.equal(await work.getNextWork('missing'), null)
  const flagged = await work.getWorkData(); assert.ok(flagged.items[0].creative)
  response = call => call.table === 'portfolio_items' ? { data: [{ ...sample, id: 'p1', slug: 'p-one' }], error: null } : { data: null, error: { message: 'missing' } }
  const degraded = await work.getWorkData(); assert.ok(degraded.items[0].image.src === '/cover.png' && degraded.items[0].creative.capabilities.length === 0, 'creative read failure degrades to legacy fields')
  assert.equal(await work.getNextWork('p-one'), null, 'single project has no next')
  delete testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED
  calls = []; response = () => ({ data: [sample], error: null })
  assert.equal((await work.getWorkData()).items[0].creative, undefined); assert.ok(calls.every(c => c.table === 'portfolio_items'), 'flag off: no creative table reads from the listing')
  assert.equal(await creativeData.getWorkCreativeIndex(['x']), undefined)

  // ── C1.8.1 Work vs Case Studies ──────────────────────────────────────────
  assert.equal(cls.isCaseStudy(true), true)
  for (const v of [false, null, undefined, 'true', 1, 'yes']) assert.equal(cls.isCaseStudy(v), false, 'only boolean true is a Case Study')
  const csIdx = { capabilities: {}, cover: {} }
  const csRow = (over) => ({ ...sample, featured: false, ...over })
  const listing2 = work.buildWorkData([
    csRow({ id: 'cs1', slug: 'cs-one', is_case_study: true, engagement_type: 'client' }),
    csRow({ id: 'sw1', slug: 'sw-one', engagement_type: 'client' }),
    csRow({ id: 'sw2', slug: 'sw-two', is_case_study: false }),
    csRow({ id: 'cs2', slug: 'cs-studio', is_case_study: true, engagement_type: 'studio_team', project_status: 'ongoing' }),
  ], csIdx)
  const byId = Object.fromEntries(listing2.items.map(i => [i.id, i]))
  assert.equal(byId.cs1.href, '/case-studies/cs-one'); assert.equal(byId.cs1.creative.caseStudy, true)
  assert.equal(byId.sw1.href, '/work/sw-one', 'client + Standard Work stays a Standard Work page'); assert.equal(byId.sw1.creative.caseStudy, false)
  assert.equal(byId.sw2.href, '/work/sw-two')
  assert.equal(byId.cs2.href, '/case-studies/cs-studio'); assert.equal(byId.cs2.creative.engagement, 'studio_team')
  assert.equal(work.buildWorkData([csRow({ id: 'x', slug: 'x-proj', is_case_study: true })]).items[0].href, '/work/x-proj', 'flag off: never a Case Study route')
  assert.equal(work.buildWorkData([csRow({ id: 'x', slug: 'x-proj' })], csIdx).items[0].creative.caseStudy, false, 'missing column => Standard Work')
  assert.deepEqual(work.selectFeaturedCaseStudies([{ ...byId.cs1, featured: true }, { ...byId.sw1, featured: true }, { ...byId.cs2, featured: false }]).map(i => i.id), ['cs1'], 'only featured Case Studies qualify for a future homepage')
  assert.deepEqual(work.relatedWork(listing2.items, 'cs-one', 2).map(i => i.slug).includes('cs-one'), false)
  assert.equal(work.relatedWork(listing2.items, 'cs-one', 2).length, 2)

  const Sections2 = load('src/components/site/work/WorkSections.tsx')
  const csList = render(React.createElement(Sections2.WorkCollection, { data: listing2 }))
  assert.ok(csList.includes('Read case study') && csList.includes('View project') && !csList.includes('View the project'))
  assert.ok(csList.includes('href="/case-studies/cs-one"') && csList.includes('href="/work/sw-one"') && csList.includes('href="/work/sw-two"'), 'Work contains both kinds with the right destination')
  assert.ok(render(React.createElement(Sections2.WorkCollection, { data: work.buildWorkData([sample]) })).includes('View the project'), 'flag off keeps the legacy label')
  assert.ok(render(React.createElement(Sections2.WorkHero, { creative: true, caseStudies: true })).includes('href="/case-studies"'))
  assert.ok(!render(React.createElement(Sections2.WorkHero, { creative: true })).includes('/case-studies'))

  const CS = load('src/components/site/work/CaseStudySections.tsx')
  const caseItems = listing2.items.filter(i => i.creative.caseStudy)
  const csListing = render(React.createElement(CS.CaseStudiesCollection, { items: caseItems }))
  assert.ok(csListing.includes('Read case study') && csListing.includes('/case-studies/cs-one') && !csListing.includes('/work/sw-one'), 'listing holds Case Studies only')
  assert.ok(render(React.createElement(CS.CaseStudiesCollection, { items: [] })).includes('Case studies are on their way.'))

  const mockup = { ...asset, id: '00000000-0000-4000-8000-000000000040', asset_type: 'mockup', image_url: '/mock.png', alt_text: 'Laptop mockup', title: 'Homepage on laptop', description: 'Desktop presentation', caption: 'Presentation only', fit_mode: 'auto', display_order: 0 }
  const mockupHidden = { ...mockup, id: '00000000-0000-4000-8000-000000000041', image_url: '/mock-hidden.png', is_visible: false }
  const storefront = { ...flyer, id: '00000000-0000-4000-8000-000000000042', asset_type: 'storefront', image_url: '/store.png', alt_text: 'Storefront', display_order: 1 }
  const palette = { ...flyer, id: '00000000-0000-4000-8000-000000000043', asset_type: 'colour-palette', image_url: '/palette.png', alt_text: 'Palette', display_order: 2 }
  const logo2 = { ...asset, id: '00000000-0000-4000-8000-000000000044', image_url: '/logo2.png', display_order: 3 }
  const csBase = { ...sample, is_case_study: true, engagement_type: 'client', project_status: 'completed', gallery_images: [], before_image: '', after_image: '' }
  const csDetail = (row, media, caps = []) => work.toWorkDetail(row, media, { capabilities: caps })
  const csHtml = (row, media, related) => render(React.createElement(CS.CaseStudyPage, { detail: csDetail(row, media), related }))
  const full = csHtml(csBase, [storefront, mockupHidden, mockup, logo2, palette, vid], [byId.sw1])
  assert.ok(full.includes('Case study') && full.includes('href="/case-studies"') && full.includes('Back to all case studies'))
  assert.ok(full.includes('/mock.png') && full.includes('Homepage on laptop') && full.includes('Presentation only'), 'mockup renders with title, description and caption')
  assert.ok(!full.includes('/mock-hidden.png'), 'hidden mockup stays hidden')
  assert.ok(full.includes('Mockups show how the work is presented. They are not performance results.'))
  const at = (t) => full.indexOf(t)
  assert.ok(at('Presentation') > -1 && at('Website and storefront') > -1 && at('Brand identity') > -1)
  assert.ok(at('Presentation') < at('Website and storefront') && at('Website and storefront') < at('Brand identity'), 'groups follow the first appearance in editor order (mockup 0, storefront 1, identity 2)')
  assert.ok(at('/palette.png') < at('/logo2.png'), 'order inside a group follows display_order')
  assert.ok(full.includes('Related projects') && full.includes('href="/work/sw-one"') && full.includes('Creative in motion'))
  const reordered = csHtml(csBase, [{ ...mockup, display_order: 5 }, { ...storefront, display_order: 0 }])
  assert.ok(reordered.indexOf('Website and storefront') < reordered.indexOf('Presentation'), 'editor order controls the sequence, not a hardcoded one')
  const onlyOther = csHtml(csBase, [{ ...flyer, asset_type: 'other' }])
  assert.ok(!onlyOther.includes('More from the project'), 'a single generic group has no sub-heading')
  const leanCs = csHtml({ id: 'lean', slug: 'lean-cs', client_name: 'Lean', is_case_study: true }, [])
  for (const word of ['Related projects', 'A closer look', 'Creative in motion', 'The challenge', 'Outcome', 'Progress so far', 'Where Hbee', 'Presentation', 'Before and after']) assert.ok(!leanCs.includes(word), 'no empty module: ' + word)
  assert.ok(csHtml({ ...csBase, before_image: '/b.png', after_image: '/a.png' }, []).includes('Before and after'))
  // Ongoing and studio case studies.
  const ongoingCs = csHtml({ ...csBase, project_status: 'ongoing' }, [])
  assert.ok(ongoingCs.includes('Progress so far') && ongoingCs.includes('What is being built') && !ongoingCs.includes('What was delivered') && !ongoingCs.includes('>Outcome<'))
  const studioCs = csHtml({ ...csBase, engagement_type: 'studio_team', project_status: 'ongoing' }, [mockup])
  assert.ok(studioCs.includes('Studio work') && studioCs.includes('Case study') && !studioCs.includes('Client engagement') && !studioCs.includes('<dt>Client</dt>') && !/client/i.test(studioCs.replace(/example client/gi, '')), 'a studio Case Study never implies a client relationship')
  assert.ok(csHtml(csBase, []).includes('Client engagement'))

  assert.equal(creative.mediaPresentation(mockup).fit, 'contain', 'mockups are never cropped by default')
  assert.equal(creative.mediaPresentation({ ...mockup, fit_mode: 'cover' }).fit, 'cover', 'an explicit editor choice is respected')
  assert.equal(creative.mediaPresentation({ ...storefront, asset_type: 'brand-application' }).fit, 'contain')

  // Routes (flag gated; redirect so only one canonical page exists).
  const workRoute = load('src/app/(site)/work/[slug]/page.tsx')
  const csRoute = load('src/app/(site)/case-studies/[slug]/page.tsx')
  const csIndex = load('src/app/(site)/case-studies/page.tsx')
  const csRows = (over) => ({ data: { ...sample, id: 'r1', slug: 'route-proj', ...over }, error: null })
  testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED = 'true'
  response = call => call.table === 'portfolio_items' ? (call.operations.some(op => op[0] === 'maybeSingle') ? csRows({ is_case_study: true }) : { data: [{ ...sample, id: 'r1', slug: 'route-proj', is_case_study: true }, { ...sample, id: 'r2', slug: 'plain', is_case_study: false }], error: null }) : { data: [], error: null }
  await assert.rejects(workRoute.default({ params: { slug: 'route-proj' } }), /NEXT_REDIRECT:\/case-studies\/route-proj/, 'Standard Work URL of a Case Study redirects to the canonical page')
  const csPage = await csRoute.default({ params: { slug: 'route-proj' } }); assert.ok(csPage)
  const indexPage = await csIndex.default(); assert.ok(indexPage)
  assert.equal((await work.getCaseStudies()).map(i => i.slug).join(), 'route-proj', '/case-studies lists only Case Studies')
  assert.equal((await work.getWorkData()).items.length, 2, 'Work still lists every active project')
  response = call => call.table === 'portfolio_items' ? csRows({ is_case_study: false }) : { data: [], error: null }
  await assert.rejects(csRoute.default({ params: { slug: 'route-proj' } }), /NEXT_REDIRECT:\/work\/route-proj/, 'a non-Case Study never has a second page')
  assert.ok(await workRoute.default({ params: { slug: 'route-proj' } }), 'Standard Work renders under /work')
  response = call => call.table === 'portfolio_items' ? { data: null, error: null } : { data: [], error: null }
  await assert.rejects(csRoute.default({ params: { slug: 'missing' } }), /NEXT_NOT_FOUND/)
  response = call => call.table === 'portfolio_items' ? csRows({ is_case_study: undefined }) : { data: [], error: null }
  assert.ok(await workRoute.default({ params: { slug: 'route-proj' } }), 'column unavailable => Standard Work, no crash')
  delete testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED
  response = call => call.table === 'portfolio_items' ? csRows({ is_case_study: true }) : { data: [], error: null }
  await assert.rejects(csRoute.default({ params: { slug: 'route-proj' } }), /NEXT_NOT_FOUND/, 'flag off: /case-studies/[slug] does not exist')
  await assert.rejects(csIndex.default(), /NEXT_NOT_FOUND/, 'flag off: /case-studies does not exist')
  assert.ok(await workRoute.default({ params: { slug: 'route-proj' } }), 'flag off: /work/[slug] ignores is_case_study entirely')

  // Admin: Presentation type, safe default, and graceful fallback without the column.
  testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED = 'true'
  response = call => { const sel = call.operations.find(op => op[0] === 'select'); return sel && String(sel[1]).includes('is_case_study') ? { data: null, error: { message: 'column does not exist' } } : { data: { engagement_type: 'client', project_status: 'completed' }, error: null } }
  const cl2 = host(load('src/components/admin/PortfolioClassification.tsx').default, { portfolioId: 'sample-id', disabled: false })
  cl2.render(); await tick(); cl2.render(); await tick(); cl2.render()
  assert.equal(find(cl2, n => n.props?.name === 'presentation_type' && n.props.value === 'standard').props.checked, true, 'default is Standard Work')
  assert.equal(find(cl2, n => n.props?.name === 'presentation_type' && n.props.value === 'case_study').props.disabled, true, 'cannot choose Case Study before the column exists')
  assert.match(flattenText(cl2.tree), /Case Study database change has not been applied/)
  find(cl2, n => n.props?.name === 'project_status' && n.props.value === 'ongoing').props.onChange(); cl2.render()
  calls = []; response = () => ({ data: { id: 'sample-id' }, error: null })
  await find(cl2, n => n.type === 'button').props.onClick()
  assert.deepEqual(plain(calls.find(c => c.operations.some(op => op[0] === 'update')).operations.find(op => op[0] === 'update')[1]), { engagement_type: 'client', project_status: 'ongoing' }, 'unavailable column is never written')
  response = () => ({ data: { engagement_type: 'client', project_status: 'completed', is_case_study: false, id: 'sample-id' }, error: null })
  const cl3 = host(load('src/components/admin/PortfolioClassification.tsx').default, { portfolioId: 'sample-id', disabled: false })
  cl3.render(); await tick(); cl3.render()
  assert.match(flattenText(cl3.tree), /Standard Work/); assert.match(flattenText(cl3.tree), /Case Study/)
  find(cl3, n => n.props?.name === 'presentation_type' && n.props.value === 'case_study').props.onChange(); cl3.render()
  calls = []
  await find(cl3, n => n.type === 'button').props.onClick()
  assert.equal(plain(calls.find(c => c.operations.some(op => op[0] === 'update')).operations.find(op => op[0] === 'update')[1]).is_case_study, true)
  const mediaEditor = host(load('src/components/admin/PortfolioCreativeMedia.tsx').default, { portfolioId: 'sample-id', disabled: false })
  response = call => call.table === 'portfolio_items' ? { data: { creative_revision: '0' }, error: null } : call.table === 'portfolio_media' ? { data: [mockup], error: null } : { data: [], error: null }
  mediaEditor.render(); await tick(); mediaEditor.render()
  assert.match(flattenText(mediaEditor.tree), /Mockup \(presentation image\)/); assert.match(flattenText(mediaEditor.tree), /not performance results/)
  delete testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED

  // ── C1.8.2 completion ────────────────────────────────────────────────────
  // Framing: explicit fit wins; unknown/portrait/mockup contained; only KNOWN landscape web fills; tall images height-capped.
  const mp = (over) => creative.mediaPresentation({ ...asset, asset_type: 'storefront', fit_mode: 'auto', width: null, height: null, ...over })
  assert.equal(mp({}).fit, 'contain', 'unknown size => contained (never destructive cover)')
  assert.equal(mp({ width: 1600, height: 1000 }).fit, 'cover', 'known landscape website screenshot may fill its frame')
  assert.equal(mp({ width: 800, height: 1600 }).fit, 'contain', 'portrait mobile screenshot is contained')
  assert.equal(mp({ width: 800, height: 1600 }).ratio, '800 / 1600')
  assert.equal(mp({ width: 1440, height: 6000 }).maxHeight, '88vh', 'very tall pages are height-capped, not cropped')
  assert.equal(mp({ width: 1600, height: 1000 }).maxHeight, undefined)
  assert.equal(mp({ width: 800, height: 1600, fit_mode: 'cover' }).fit, 'cover', 'explicit editor choice is respected even for portrait')
  assert.equal(mp({ asset_type: 'mockup', width: 1600, height: 1000 }).fit, 'contain', 'landscape mockup still contained')
  assert.equal(mp({ asset_type: 'campaign-graphic', width: 1600, height: 1000 }).fit, 'contain')
  assert.equal(mp({ asset_type: 'logo', width: 800, height: 400, fit_mode: 'cover' }).fit, 'contain', 'artwork is always contained')
  const tallHtml = render(React.createElement(Detail, { detail: work.toWorkDetail({ ...sample, gallery_images: [] }, [{ ...asset, id: '00000000-0000-4000-8000-000000000050', asset_type: 'storefront', image_url: '/tall.png', width: 800, height: 1600, fit_mode: 'auto', is_visible: true }], { capabilities: [] }) }))
  assert.ok(/aspect-ratio:800 \/ 1600;max-height:88vh/.test(tallHtml) && /object-fit:contain/.test(tallHtml), 'portrait storefront renders contained with its real ratio')

  // Dimension detection helper.
  imageSizes['https://cdn.example.com/a.png'] = [1179, 2556]
  imageSizes['/huge.png'] = [30000, 100]
  assert.deepEqual(plain(await creative.detectImageSize('https://cdn.example.com/a.png')), { width: 1179, height: 2556 })
  assert.equal(await creative.detectImageSize('https://cdn.example.com/missing.png'), null, 'load failure resolves null')
  assert.equal(await creative.detectImageSize('/huge.png'), null, 'unusable dimensions resolve null')
  assert.equal(await creative.detectImageSize('javascript:alert(1)'), null)
  assert.equal(await creative.detectImageSize('http://insecure.test/a.png'), null)

  // Editor: detection on upload, manual dims preserved, forced detect, failure never blocks.
  testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED = 'true'
  const dimAsset = { ...asset, id: '00000000-0000-4000-8000-000000000060', image_url: 'https://cdn.example.com/a.png', alt_text: 'Portrait', width: null, height: null, is_visible: true }
  const manualAsset = { ...asset, id: '00000000-0000-4000-8000-000000000061', image_url: 'https://cdn.example.com/a.png', alt_text: 'Manual', width: 500, height: 500, display_order: 1 }
  response = call => call.table === 'portfolio_items' ? { data: { creative_revision: '0' }, error: null } : call.table === 'portfolio_media' ? { data: [dimAsset, manualAsset], error: null } : { data: [], error: null }
  const dimHost = host(load('src/components/admin/PortfolioCreativeMedia.tsx').default, { portfolioId: 'sample-id', disabled: false })
  dimHost.render(); await tick(); dimHost.render()
  assert.match(flattenText(dimHost.tree), /Detect missing image sizes/)
  assert.equal(button(dimHost, 'Save creative media & capabilities').props.disabled, true, 'loading never marks the form dirty')
  const numberInputs = () => nodes(dimHost.tree).filter(n => n.type === 'input' && n.props.type === 'number').map(n => n.props.value)
  assert.deepEqual(numberInputs(), ['', '', 500, 500])
  await button(dimHost, 'Detect missing image sizes').props.onClick(); await tick(); dimHost.render()
  assert.deepEqual(numberInputs(), [1179, 2556, 500, 500], 'missing sizes are filled; the manually sized asset is left alone')
  assert.match(flattenText(dimHost.tree), /Detected from the image/)
  assert.equal(button(dimHost, 'Save creative media & capabilities').props.disabled, false, 'a detected size is a real change to save')
  // Manual correction is kept (not re-detected on blur), and marked manual.
  const widthInput = nodes(dimHost.tree).filter(n => n.type === 'input' && n.props.type === 'number')[0]
  widthInput.props.onChange({ target: { value: '1000' } }); dimHost.render()
  assert.equal(numberInputs()[0], 1000)
  await nodes(dimHost.tree).find(n => n.type === 'input' && n.props.value === dimAsset.image_url).props.onBlur(); await tick(); dimHost.render()
  assert.equal(numberInputs()[0], 1000, 'blur does not overwrite a deliberate value')
  // Explicit "Detect size" overrides on request.
  await button(dimHost, 'Detect size for asset 1').props.onClick(); await tick(); dimHost.render()
  assert.equal(numberInputs()[0], 1179)
  // Failure is non-blocking.
  imageSizes['https://cdn.example.com/a.png'] = undefined
  await button(dimHost, 'Detect size for asset 2').props.onClick(); await tick(); dimHost.render()
  assert.match(flattenText(dimHost.tree), /Could not read the size/)
  assert.equal(numberInputs()[2], 500, 'failed detection leaves existing values alone')
  assert.equal(button(dimHost, 'Save creative media & capabilities').props.disabled, false, 'save is still available')
  // The payload carries the real dimensions.
  assert.equal(creative.creativeSavePayload('sample-id', [{ ...dimAsset, width: 1179, height: 2556 }], [], '0').p_media[0].height, 2556)
  delete testEnv.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED

  // Existing-field Case Study modules (process, services, testimonial, overview, technologies).
  const legacyCs = { ...csBase, is_case_study: true, engagement_type: 'client', brief: '', overview: 'Older overview text', technologies_used: null, technologies: ['Shopify', 'Klaviyo'], technology: 'ignored when technologies exist',
    services: ['Storefront design', { name: 'Email flows' }, { title: 'Analytics setup' }, 42, null],
    process: [{ title: 'Discover', description: 'Mapped the range.' }, 'Build', { name: 'Launch', text: 'Went live.' }, {}, 7],
    testimonial: 'They made the range far easier to understand and sell.' }
  const legacyCsDetail = work.toWorkDetail(legacyCs, [], { capabilities: [] })
  assert.equal(legacyCsDetail.context, 'Older overview text', 'overview is used as the brief when brief is empty (creative mode)')
  assert.deepEqual(plain(legacyCsDetail.creative.technologies), ['Shopify', 'Klaviyo'])
  assert.deepEqual(plain(legacyCsDetail.creative.services), ['Storefront design', 'Email flows', 'Analytics setup'])
  assert.deepEqual(plain(legacyCsDetail.creative.process).map(p => p.title), ['Discover', 'Build', 'Launch'])
  assert.equal(legacyCsDetail.creative.process[0].text, 'Mapped the range.'); assert.equal(legacyCsDetail.creative.process[1].text, undefined)
  assert.equal(legacyCsDetail.creative.testimonial.quote, 'They made the range far easier to understand and sell.'); assert.equal(legacyCsDetail.creative.testimonial.author, undefined, 'no invented attribution')
  assert.equal(work.toWorkDetail({ ...legacyCs, brief: '' }).context, undefined, 'flag off: overview fallback never applies')
  const legacyHtml2 = render(React.createElement(CS.CaseStudyPage, { detail: legacyCsDetail }))
  assert.ok(legacyHtml2.includes('How the work moved.') && legacyHtml2.includes('Discover') && legacyHtml2.includes('Mapped the range.'))
  assert.ok(legacyHtml2.includes('Client feedback') && legacyHtml2.includes('far easier to understand'))
  assert.ok(legacyHtml2.includes('Storefront design, Email flows, Analytics setup') && legacyHtml2.includes('Shopify, Klaviyo'))
  // Standard Work stays lightweight; studio never gets a testimonial; empty/malformed data renders nothing.
  const stdDetail = work.toWorkDetail({ ...legacyCs, is_case_study: false }, [], { capabilities: [] })
  assert.deepEqual(plain([stdDetail.creative.services, stdDetail.creative.process]), [[], []]); assert.equal(stdDetail.creative.testimonial, undefined)
  assert.equal(work.toWorkDetail({ ...legacyCs, engagement_type: 'studio_team' }, [], { capabilities: [] }).creative.testimonial, undefined, 'a studio project never shows client feedback')
  const emptyLegacy = render(React.createElement(CS.CaseStudyPage, { detail: work.toWorkDetail({ ...legacyCs, process: [], services: [], testimonial: '   ', technologies: [] , technology: '' }, [], { capabilities: [] }) }))
  for (const word of ['How the work moved', 'Client feedback', 'Services']) assert.ok(!emptyLegacy.includes(word), 'no empty module: ' + word)
  for (const bad of ['[]', '{"x":1}', '{"quote":""}', 'ok', '{broken']) assert.equal(work.testimonialOf({ testimonial: bad }), undefined, 'rejects ' + bad)
  assert.deepEqual(plain(work.testimonialOf({ testimonial: JSON.stringify({ quote: 'Great partner to work with.', author: 'A. Person', role: 'Founder' }) })), { quote: 'Great partner to work with.', author: 'A. Person', role: 'Founder' })
  assert.deepEqual(plain(work.processOf({ process: JSON.stringify([{ title: 'One' }]) })), [{ title: 'One' }], 'JSON-string jsonb is accepted')
  assert.equal(work.processOf({ process: 'not json' }).length, 0)
  assert.deepEqual(plain(work.technologiesOf({ technology: 'Shopify, Klaviyo; Gorgias' })), ['Shopify', 'Klaviyo', 'Gorgias'])

  console.log('PASS: Phase B/C regression checks plus revision conflict/increment contract, stale replacement rejection, explicit clearing, empty preservation, pending/late upload safety, failed-save retry, failed/inconsistent load protection, and SQL/ACL static expectations. PostgreSQL execution/RLS remain unverified.')
})().catch(error => { console.error(error); process.exitCode = 1 })
