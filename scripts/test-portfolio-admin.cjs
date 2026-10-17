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
    if (name === 'next/navigation') return { notFound: () => { throw Error('NEXT_NOT_FOUND') }, useParams: () => ({ id: 'sample-id' }), useRouter: () => ({ push: href => navigations.push(href) }) }
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === 'next/image') return { __esModule: true, default: MockImage }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.endsWith('/motion/SiteReveal')) return { SiteReveal: ({ children }) => React.createElement('div', null, children) }
    if (name === '@/components/ImageUpload') return { __esModule: true, default: stubUpload }
    if (name === '@/components/admin/PortfolioGallery') return { __esModule: true, default: stubGallery }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const MockFormData = class { constructor(form) { this.form = form } get(key) { return this.form[key] } }
  vm.runInNewContext(js, { module: mod, exports: mod.exports, require: localRequire, URL, URLSearchParams, console, crypto: require('node:crypto').webcrypto, confirm: () => true, FormData: MockFormData, process: { env: testEnv }, ...(file.endsWith('WorkFilter.tsx') ? { window: browser } : {}) }, { filename: file })
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
  find(concurrent, n => n.type === 'input' && n.props.type !== 'number' && n.props.value === '').props.onChange({ target: { value: 'Uploaded asset alt' } }); concurrent.render()
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
  const emptyAlt = find(concurrent, n => n.type === 'input' && n.props.type !== 'number' && n.props.value === '')
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
  console.log('PASS: Phase B/C regression checks plus revision conflict/increment contract, stale replacement rejection, explicit clearing, empty preservation, pending/late upload safety, failed-save retry, failed/inconsistent load protection, and SQL/ACL static expectations. PostgreSQL execution/RLS remain unverified.')
})().catch(error => { console.error(error); process.exitCode = 1 })
