// Offline checks for public showcases (Work, project and service pages) and their Admin wiring. No network or database.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const cache = new Map()
let rpc = async () => ({ data: [], error: null })
const calls = []
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const req = name => {
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name === '@/lib/supabase') return { supabase: { rpc: (fn, args) => { calls.push([fn, args]); return rpc(fn, args) }, from: () => assert.fail('public showcases read only through the function') } }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, URL, console }, { filename: file })
  return mod.exports
}
const clone = value => JSON.parse(JSON.stringify(value))
const row = (n, extra = {}) => ({ placement_id: 'p' + n, kind: 'image', url: `https://x.test/${n}.png`, mime_type: 'image/png', width: 800, height: 800, alt_text: 'Alt ' + n, poster_url: null, display_type: 'logo_design', custom_label: '', title: '', caption: '', project_slug: null, project_name: null, ...extra })
const rows = [
  row(1),
  row(2, { display_type: 'social_flyer', width: 1080, height: 1350, title: 'Weekend offer', caption: 'Flyer', project_slug: 'spec-gt', project_name: 'SpecGT' }),
  row(3, { display_type: 'campaign_creative', width: 3000, height: 400 }),
  row(4, { kind: 'video', url: 'https://x.test/4.mp4', mime_type: 'video/mp4', width: 720, height: 1280, display_type: 'ugc_video', poster_url: 'https://x.test/poster.jpg', alt_text: '' }),
  row(5, { display_type: 'other', custom_label: 'Menu Design', alt_text: '' }),
]

;(async () => {
  const model = load('src/lib/site/showcase-model.ts')
  const items = model.toShowcaseItems(rows)
  assert.deepEqual(clone(items.map(i => i.label)), ['Logo Design', 'Social Media Flyer', 'Campaign Creative', 'UGC Video', 'Menu Design'], 'order is kept; labels come from the placement')
  assert.deepEqual(clone(items[1].project), { href: '/work/spec-gt', name: 'SpecGT' }); assert.equal(items[0].project, null, 'a related project is optional')
  assert.equal(items[4].alt, 'Menu Design', 'there is always a text alternative')
  for (const bad of [row(6, { url: 'http://x.test/a.png' }), row(7, { url: 'javascript:alert(1)' }), row(8, { display_type: 'unknown' }), row(9, { kind: 'audio' }), row(10, { kind: 'video', mime_type: 'video/quicktime' }), null, 4])
    assert.equal(model.toShowcaseItems([bad]).length, 0)
  assert.equal(model.toShowcaseItems([row(11, { project_slug: '../admin' })])[0].project, null)
  assert.equal(model.toShowcaseItems(null).length, 0)
  // Mixed proportions: natural ratio, limited at both extremes, never stretched.
  assert.equal(model.frameRatio(items[0]), 1); assert.equal(model.frameRatio(items[1]), 0.8)
  assert.equal(model.frameRatio(items[2]), 16 / 9); assert.equal(model.frameRatio(items[3]), 9 / 16)
  assert.equal(model.frameRatio({ kind: 'video', width: null, height: null }), 16 / 9)

  // ── Loader: one public function, empty on any failure (safe before the migration) ──
  const { getShowcase } = load('src/lib/site/showcase-data.ts')
  rpc = async () => ({ data: rows, error: null })
  assert.equal((await getShowcase({ type: 'site', key: 'work', slot: 'creative_showcase' })).length, 5)
  assert.deepEqual(clone(calls.at(-1)), ['get_media_showcase', { p_target_type: 'site', p_target_key: 'work', p_slot: 'creative_showcase' }])
  rpc = async () => ({ data: null, error: { message: 'function does not exist' } }); assert.equal((await getShowcase({ type: 'service', key: 'creative-ugc', slot: 'showcase' })).length, 0)
  rpc = async () => { throw new Error('network') }; assert.equal((await getShowcase({ type: 'project', key: 'x', slot: 'project_media' })).length, 0)

  // ── Rendering ──
  const { MediaShowcase } = load('src/components/site/media/MediaShowcase.tsx')
  const render = (list) => renderToStaticMarkup(React.createElement(MediaShowcase, { items: list, id: 'creative-work', eyebrow: 'Creative portfolio', heading: 'Selected creative work' }))
  assert.equal(render([]), '', 'an empty showcase renders nothing at all')
  const html = render(items)
  assert.match(html, /Selected creative work/); assert.equal((html.match(/<article/g) || []).length, 5)
  assert.equal((html.match(/<img /g) || []).length, 4); assert.equal((html.match(/loading="lazy"/g) || []).length, 4)
  assert.equal((html.match(/<video/g) || []).length, 1); assert.match(html, /<video[^>]*controls/); assert.match(html, /preload="none"/)
  assert.match(html, /poster="https:\/\/x\.test\/poster\.jpg"/); assert.ok(!/autoplay/i.test(html), 'no autoplay')
  assert.match(html, /href="\/work\/spec-gt"[^>]*>View project: (<!-- -->)?SpecGT/); assert.equal((html.match(/View project/g) || []).length, 1)
  assert.match(html, /alt="Alt 2"/); assert.match(html, /width="1080" height="1350"/, 'natural size is declared (no layout shift)')
  assert.match(html, /--ratio:0\.8/); assert.match(html, /data-columns="3"/); assert.match(render(items.slice(0, 1)), /data-columns="1"/)
  assert.ok(!/Client Campaign/i.test(html))
  const css = read('src/components/site/media/media-showcase.module.css')
  assert.match(css, /object-fit: contain/); assert.ok(!/object-fit: (cover|fill)/.test(css)); assert.ok(!/columns:\s*\d|masonry/.test(css.replace(/data-columns/g, '')))
  assert.ok(!/useEffect|SiteScene|--hb-p/.test(read('src/components/site/media/MediaShowcase.tsx')), 'existing reveal only; no new scroll choreography')

  // ── Wiring: Work, both project routes ──
  const work = read('src/app/(site)/work/page.tsx')
  assert.match(work, /getShowcase\(\{ type: 'site', key: 'work', slot: 'creative_showcase' \}\)/)
  assert.ok(work.indexOf('<WorkCollection') < work.indexOf('<MediaShowcase') && work.indexOf('<MediaShowcase') < work.indexOf('<WorkCta'), 'below the case studies, which are unchanged')
  for (const file of ['src/app/(site)/work/[slug]/page.tsx', 'src/app/(site)/case-studies/[slug]/page.tsx']) assert.match(read(file), /getShowcase\(\{ type: 'project', key: params\.slug, slot: 'project_media' \}\)/, file)
  assert.match(read('src/components/site/work/WorkDetail.tsx'), /<WorkEvidence detail=\{detail\} \/>\s*<ProjectMedia items=\{showcase\} \/>/, 'legacy evidence stays; placed media is added after it')
  assert.ok(!/portfolioCreativeEnabled/.test(read('src/lib/site/showcase-data.ts') + read('src/components/site/media/MediaShowcase.tsx')), 'independent of the creative feature flag')

  // ── Admin: one manager for all targets; multi-select; reference-only removal ──
  const manager = read('src/components/admin/media/PlacementManager.tsx')
  assert.match(manager, /<MediaPicker open=\{picking\} kind="all" multiple allowUpload=\{false\}/)
  for (const text of ['Add from Media Library', 'Display label', 'Custom label', 'Related project', 'Move up', 'Move down', 'Show on website', 'Hide', 'Confirm remove', 'Archived in the library']) assert.ok(manager.includes(text), text)
  assert.match(manager, /type !== 'project' && <label[^>]*>Related project/)
  assert.ok(!/archiveAsset|storage\.from|from\('media_assets'\)\.(update|delete)/.test(manager))
  assert.equal((manager.match(/<button /g) || []).length, (manager.match(/<button type="button"/g) || []).length, 'no button can submit the surrounding project form')
  const picker = read('src/components/admin/media/MediaPicker.tsx')
  assert.match(picker, /multiple = false/); assert.match(picker, /Add selected/); assert.match(picker, /disabled=\{!!blocked\}/)
  for (const file of ['src/components/admin/media/MediaImageField.tsx', 'src/components/admin/media/PosterField.tsx', 'src/app/admin/trust/page.tsx']) assert.ok(!/<MediaPicker[^>]*\bmultiple\b/.test(read(file)), file + ' stays single-select')
  assert.match(read('src/components/admin/PortfolioGallery.tsx'), /<MediaPicker open=\{pickerOpen\} keepOpen multiple[\s\S]*onSelectMany=\{addAssets\}/)
  assert.match(read('src/app/admin/portfolio/[id]/page.tsx'), /<PlacementManager target=\{projectMedia\(id\)\}/)
  assert.match(read('src/app/admin/portfolio/showcase/page.tsx'), /target=\{WORK_SHOWCASE\}/)
  console.log('PASS: media showcase - mixed media and proportions, empty sections hidden, poster-first video, project links, Work and project wiring, admin multi-select')
})().catch(error => { console.error(error); process.exit(1) })
