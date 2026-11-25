// Offline checks for the showcase hardening pass: video captions / transcript, project-deletion cleanup, batch duplicates.
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
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map(ext => file + ext).find(fs.existsSync)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const req = name => {
    if (name === 'next/link') return { __esModule: true, default: 'a' }
    if (name.endsWith('.module.css')) return new Proxy({}, { get: (_, key) => key === '__esModule' ? false : String(key) })
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, process, URL, TextDecoder, Uint8Array, BigInt, console }, { filename: file })
  return mod.exports
}
const clone = value => JSON.parse(JSON.stringify(value))
const ID = n => `${String(n).padStart(8, '0')}-e89b-42d3-a456-426614174000`

/** A small in-memory database that records everything and can never delete a library asset or a stored file. */
function fakeDb(tables, { fail = {} } = {}) {
  const ops = []
  return {
    ops, tables,
    storage: { from() { assert.fail('storage is never touched') } },
    from(table) {
      const filters = []; let action = 'select', payload, columns
      const run = () => {
        ops.push({ table, action, filters: clone(filters), payload, columns })
        const key = `${action} ${table}`
        if (fail[key]) return { data: null, error: { message: fail[key] } }
        const rows = tables[table] ?? []
        const match = row => filters.every(([op, k, v]) => op === 'eq' ? String(row[k]) === String(v) : v.includes(row[k]))
        if (action === 'delete') {
          assert.notEqual(table, 'media_assets', 'a library asset is never deleted')
          const gone = rows.filter(match); tables[table] = rows.filter(row => !match(row)); return { data: gone.map(r => ({ id: r.id })), error: null }
        }
        if (action === 'update') { const hit = rows.filter(match); hit.forEach(r => Object.assign(r, payload)); return { data: hit[0] ?? null, error: null } }
        return { data: rows.filter(match), error: null }
      }
      const chain = {
        select(value) { columns = value; return chain }, eq(k, v) { filters.push(['eq', k, v]); return chain }, in(k, v) { filters.push(['in', k, v]); return chain },
        order: () => chain, limit: () => chain, delete() { action = 'delete'; return chain }, update(v) { action = 'update'; payload = v; return chain },
        maybeSingle() { const r = run(); return Promise.resolve({ ...r, data: Array.isArray(r.data) ? r.data[0] ?? null : r.data }) },
        single() { return chain.maybeSingle() }, then(resolve, reject) { return Promise.resolve(run()).then(resolve, reject) },
      }
      return chain
    },
  }
}

;(async () => {
  // ═════ Video accessibility ═════
  const a11y = load('src/lib/media/video-accessibility.ts')
  for (const ok of ['https://hbeedigitals.com/captions/clip.vtt', 'https://cdn.test/a/B.VTT?v=2', 'https://cdn.test/a.vtt#x']) assert.ok(a11y.isCaptionsUrl(ok), ok)
  for (const bad of ['http://cdn.test/a.vtt', 'https://cdn.test/a.srt', 'https://cdn.test/a.vtt.exe', 'https://cdn.test/page?file=a.vtt', 'javascript:alert(1)', 'data:text/vtt,WEBVTT', '//cdn.test/a.vtt', '/captions/a.vtt',
    'https://user:pw@cdn.test/a.vtt', 'https://cdn.test/a b.vtt', 'https://cdn.test/a".vtt', 'https://cdn.test/<a>.vtt', 'https://cdn.test/' + 'a'.repeat(2100) + '.vtt', '', null, 4]) assert.equal(a11y.isCaptionsUrl(bad), false, String(bad).slice(0, 40))
  assert.deepEqual(clone(a11y.cleanAccessibility({ captions_url: '  ', transcript: ' \r\n ' })), { value: { captions_url: null, transcript: null } }, 'both optional; blank stores nothing')
  assert.deepEqual(clone(a11y.cleanAccessibility({ captions_url: ' https://c.test/a.vtt ', transcript: 'Line one\r\nLine two <script>x</script>' })), { value: { captions_url: 'https://c.test/a.vtt', transcript: 'Line one\nLine two <script>x</script>' } }, 'plain text is kept as typed')
  assert.match(a11y.cleanAccessibility({ captions_url: 'http://c.test/a.vtt', transcript: '' }).error, /HTTPS/)
  assert.match(a11y.cleanAccessibility({ captions_url: '', transcript: 'x'.repeat(20001) }).error, /20,000/)

  const video = load('src/lib/media/media-video.ts')
  const types = load('src/lib/media/media-types.ts')
  assert.ok(!/captions_url|transcript/.test(types.MEDIA_COLUMNS), 'the live library does not depend on the new columns (safe to deploy before the migration)')
  const asset = { id: ID(1), kind: 'video', category: 'ugc_video', title: 'Clip', caption: '', poster_asset_id: null }
  const db = fakeDb({ media_assets: [{ ...asset, captions_url: null, transcript: null }] })
  assert.deepEqual(clone(await video.getVideoAccessibility(db, ID(1))), { captions_url: null, transcript: null })
  await assert.rejects(video.getVideoAccessibility(fakeDb({}, { fail: { 'select media_assets': 'column media_assets.captions_url does not exist' } }), ID(1)), /migration has not been run/)
  await video.updateVideoMetadata(db, asset, { title: 'Clip 2' })
  assert.ok(!('captions_url' in db.ops.at(-1).payload) && !('transcript' in db.ops.at(-1).payload), 'not touched unless the fields were loaded and edited')
  await video.updateVideoMetadata(db, asset, { accessibility: { captions_url: 'https://c.test/a.vtt', transcript: 'Hello' } })
  assert.equal(db.ops.at(-1).payload.captions_url, 'https://c.test/a.vtt'); assert.equal(db.ops.at(-1).payload.transcript, 'Hello')
  await assert.rejects(video.updateVideoMetadata(db, asset, { accessibility: { captions_url: 'https://c.test/a.txt', transcript: '' } }), /\.vtt/)

  const model = load('src/lib/site/showcase-model.ts')
  const row = (extra) => ({ placement_id: 'p', kind: 'video', url: 'https://x.test/a.mp4', mime_type: 'video/mp4', display_type: 'ugc_video', custom_label: '', title: 'Clip', caption: '', poster_url: null, ...extra })
  const [plain] = model.toShowcaseItems([row({})])
  assert.equal(plain.captionsUrl, null); assert.equal(plain.transcript, null, 'nothing is fabricated')
  const [full] = model.toShowcaseItems([row({ captions_url: 'https://x.test/a.vtt', transcript: 'Said <img src=x onerror=alert(1)> aloud' })])
  assert.equal(model.toShowcaseItems([row({ captions_url: 'javascript:alert(1)' })])[0].captionsUrl, null)
  const [image] = model.toShowcaseItems([row({ kind: 'image', url: 'https://x.test/a.png', mime_type: 'image/png', display_type: 'logo_design', captions_url: 'https://x.test/a.vtt', transcript: 'x' })])
  assert.equal(image.captionsUrl, null); assert.equal(image.transcript, null)
  const { MediaShowcase } = load('src/components/site/media/MediaShowcase.tsx')
  const render = list => renderToStaticMarkup(React.createElement(MediaShowcase, { items: list, id: 's', eyebrow: 'e', heading: 'h' }))
  const without = render([plain])
  assert.ok(!/<track|<details|crossorigin/i.test(without), 'no track, transcript or CORS mode without data')
  const withBoth = render([full])
  assert.match(withBoth, /<track kind="captions" src="https:\/\/x\.test\/a\.vtt" srcLang="en" label="English" default=""\/>/i)
  assert.match(withBoth, /<details class="transcript"><summary>Transcript/, 'closed disclosure')
  assert.ok(!/<details[^>]*\bopen\b/.test(withBoth))
  assert.match(withBoth, /Said &lt;img src=x onerror=alert\(1\)&gt; aloud/); assert.ok(!/<img src=x/.test(withBoth), 'transcript is text, never markup')
  assert.ok(withBoth.indexOf('</video>') < withBoth.indexOf('<details'), 'the transcript sits below the player, outside the frame')
  assert.ok(!/autoplay/i.test(withBoth))
  assert.ok(!/dangerouslySetInnerHTML/.test(read('src/components/site/media/MediaShowcase.tsx') + read('src/components/site/media/ContentVideo.tsx')))
  assert.ok(!/captions|<track|transcript/i.test(read('src/components/site/media/BackgroundVideo.tsx')), 'background video is unaffected')
  const page = read('src/app/admin/media/page.tsx')
  assert.match(page, /Accessibility \(optional\)/); assert.match(page, /Use captions for spoken\/dialogue video where available\./); assert.match(page, />Captions URL</); assert.match(page, />Transcript</)
  assert.match(page, /category === 'bgc_video'\s*\?/); assert.match(page, /access && accessDirty && category !== 'bgc_video'/)
  assert.ok(!/captions[^\n]{0,40}required|required[^\n]{0,40}captions/i.test(page))

  // ═════ Project deletion ═════
  const { deletePortfolioProject } = load('src/lib/admin/portfolio-delete.ts')
  const library = load('src/lib/media/media-library.ts')
  const PROJECT = ID(50), OTHER = ID(51), UGC = ID(1)
  const world = () => ({
    portfolio_items: [{ id: PROJECT, client_name: 'Project X' }, { id: OTHER, client_name: 'Project Y' }],
    media_assets: [{ id: UGC, kind: 'video', public_url: 'https://x.test/ugc.mp4' }],
    media_placements: [
      { id: 'a', media_asset_id: UGC, target_type: 'project', target_key: PROJECT, display_type: 'ugc_video', custom_label: '', is_active: true },
      { id: 'b', media_asset_id: UGC, target_type: 'service', target_key: 'creative-ugc', display_type: 'ugc_video', custom_label: '', is_active: true },
      { id: 'c', media_asset_id: UGC, target_type: 'site', target_key: 'work', display_type: 'ugc_video', custom_label: '', is_active: true },
      { id: 'd', media_asset_id: UGC, target_type: 'project', target_key: OTHER, display_type: 'ugc_video', custom_label: '', is_active: true },
    ],
  })
  const store = fakeDb(world())
  assert.deepEqual(clone(await deletePortfolioProject(store, PROJECT)), {})
  assert.deepEqual(store.tables.media_placements.map(r => r.id), ['b', 'c', 'd'], 'only the deleted project\'s references; the same asset stays on Work, the service page and another project')
  assert.equal(store.tables.media_assets.length, 1)
  assert.ok(store.ops.every(op => op.table !== 'media_assets'), 'the library is not touched at all')
  assert.ok(store.ops.findIndex(op => op.table === 'portfolio_items' && op.action === 'delete') < store.ops.findIndex(op => op.table === 'media_placements'), 'project first, references second')
  const usage = await library.placementUsage(store, UGC)
  assert.deepEqual(clone(usage.map(u => `${u.area}: ${u.label}`)).sort(), ['Creative & UGC: Selected work', 'Work: Creative Portfolio', 'Work: Project Y'], 'Used In is correct afterwards')
  // Nothing is removed unless the project really was deleted.
  for (const failing of [fakeDb({ ...world(), portfolio_items: [] }), fakeDb(world(), { fail: { 'delete portfolio_items': 'permission denied' } })]) {
    await assert.rejects(deletePortfolioProject(failing, PROJECT))
    assert.equal(failing.tables.media_placements.length, 4)
  }
  assert.match((await deletePortfolioProject(fakeDb(world(), { fail: { 'delete media_placements': 'permission denied' } }), PROJECT)).warning, /could not be removed/)
  assert.deepEqual(clone(await deletePortfolioProject(fakeDb(world(), { fail: { 'delete media_placements': "Could not find the table 'public.media_placements' in the schema cache" } }), PROJECT)), {}, 'works before the migration')
  // A reference left behind some other way is labelled, and is not counted as a place.
  const stale = fakeDb({ ...world(), portfolio_items: [{ id: OTHER, client_name: 'Project Y' }] })
  const listed = await library.placementUsage(stale, UGC)
  const ghost = listed.find(u => u.stale)
  assert.equal(ghost.label, 'Deleted project (stale reference, not public)'); assert.equal(ghost.href, '/admin/portfolio'); assert.equal(listed.filter(u => !u.stale).length, 3)
  const unreadable = await library.placementUsage(fakeDb(world(), { fail: { 'select portfolio_items': 'network' } }), UGC)
  assert.ok(unreadable.every(u => !u.stale), 'a failed project read never declares a project deleted')
  assert.match(page, /filter\(\(usage\) => !usage\.stale\)/)
  for (const file of ['src/app/admin/portfolio/page.tsx', 'src/app/admin/portfolio/[id]/page.tsx', 'src/app/admin/before-after/page.tsx']) {
    assert.match(read(file), /deletePortfolioProject\(supabase, id\)/, file)
    assert.ok(!/from\('portfolio_items'\)\s*\.delete\(/.test(read(file)), file + ' has no direct delete')
  }
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)])
  const direct = walk(path.join(root, 'src')).filter(file => /\.tsx?$/.test(file) && /from\('portfolio_items'\)\s*\.delete\(/.test(fs.readFileSync(file, 'utf8'))).map(file => path.relative(root, file).replace(/\\/g, '/'))
  assert.deepEqual(direct, ['src/lib/admin/portfolio-delete.ts'], 'one deletion path')

  // ═════ Batch duplicates ═════
  const queue = load('src/lib/media/bulk-queue.ts')
  const item = (key, checksum, extra = {}) => ({ ...queue.newQueueItem({ name: key + '.png', size: 1, type: 'image/png' }, key, 'image', { image: 'brand_logo', video: 'video' }), phase: 'idle', altText: 'x', prepared: { mime: 'image/png', size: 1, width: 1, height: 1, duration: null, checksum }, ...extra })
  let items = queue.markRepeats([item('logo-a', 'aaa'), item('flyer', 'bbb'), item('logo-a-copy', 'aaa')])
  assert.deepEqual(clone(items.map(queue.queueState)), ['ready', 'ready', 'duplicate'])
  items = items.map(i => i.key === 'logo-a' ? { ...i, phase: 'uploaded' } : i)
  items = queue.markRepeats(queue.offerAssetToRepeats(items, { id: 'new', title: 'logo a', status: 'active', checksum: 'aaa' }))
  assert.deepEqual(clone(items.map(i => i.duplicates.map(d => d.id))), [[], [], ['new']], 'only the later copy is offered the new asset')
  assert.equal(queue.queueState(items[2]), 'duplicate', 'it is not uploaded a second time by default'); assert.equal(queue.queueState(items[1]), 'ready', 'unrelated files carry on')
  assert.equal(queue.offerAssetToRepeats(items, { id: 'new', checksum: 'aaa' })[2].duplicates.length, 1, 'offered once')
  assert.equal(queue.offerAssetToRepeats(items, { id: 'n2', checksum: null }), items)

  console.log('PASS: media hardening - captions URL and plain-text transcript, track only when supplied, project deletion removes only its references, stale handling, in-batch duplicate reuse')
})().catch(error => { console.error(error); process.exit(1) })
