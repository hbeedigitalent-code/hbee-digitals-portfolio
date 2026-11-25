// Offline checks for Admin Media Library Batch 1 (foundation): no environment, network, production data or SQL execution.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const root = path.resolve(__dirname, '..')
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8')

// ── minimal TS/TSX loader with @/ alias and mockable supabase ────────────────────────────────────────────────
const modules = new Map()
let currentDb = null
function load(file) {
  file = path.resolve(root, file)
  if (!path.extname(file)) file = ['.ts', '.tsx'].map((ext) => file + ext).find(fs.existsSync)
  if (modules.has(file)) return modules.get(file).exports
  const mod = { exports: {} }; modules.set(file, mod)
  const out = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText
  const localRequire = (name) => {
    if (name === '@/lib/supabase') return { supabase: new Proxy({}, { get: (_, key) => currentDb?.[key] }) }
    if (name === 'next/link') return { __esModule: true, default: (props) => React.createElement('a', { href: props.href }, props.children) }
    if (name.startsWith('@/')) return load('src/' + name.slice(2))
    if (name.startsWith('.')) return load(path.relative(root, path.resolve(path.dirname(file), name)))
    return require(name)
  }
  new Function('exports', 'require', 'module', '__filename', out)(mod.exports, localRequire, mod, file)
  return mod.exports
}
const types = load('src/lib/media/media-types.ts')
const validation = load('src/lib/media/media-validation.ts')
const library = load('src/lib/media/media-library.ts')
const prepare = load('src/lib/media/media-prepare.ts')
const checksum = load('src/lib/media/media-checksum.ts')

// ── byte fixtures ────────────────────────────────────────────────────────────────────────────────────────────
const bytes = (...values) => Uint8Array.from(values)
const pad = (head, length = 64) => { const out = new Uint8Array(length); out.set(head); return out }
const ascii = (text) => [...text].map((c) => c.charCodeAt(0))
const PNG = pad(bytes(137, 80, 78, 71, 13, 10, 26, 10))
const JPEG = pad(bytes(255, 216, 255, 224))
const WEBP = pad(bytes(...ascii('RIFF'), 0, 0, 0, 0, ...ascii('WEBP')))
const AVIF = pad(bytes(0, 0, 0, 24, ...ascii('ftypavif')))
const SVG = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>')
const HTML = new TextEncoder().encode('<!DOCTYPE html><html></html>')

// ── SQL static safety ────────────────────────────────────────────────────────────────────────────────────────
const sql = {
  pre: read('scripts/admin-media-00-preflight-readonly.sql'), fwd: read('scripts/admin-media-01-forward.sql'),
  back: read('scripts/admin-media-02-rollback.sql'), verify: read('scripts/admin-media-03-verify-readonly.sql'),
}
const strip = (text) => text.replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''")
for (const [name, text] of Object.entries(sql)) assert.ok(/NOT EXECUTED/.test(text), `${name} is marked as a draft that was not executed`)
for (const name of ['pre', 'verify']) {
  const code = strip(sql[name])
  assert.ok(!/\b(insert|update|delete|drop|alter|create|grant|revoke|truncate|begin|commit)\b/i.test(code), `${name} is strictly read-only`)
}
{
  const code = strip(sql.fwd)
  assert.match(sql.fwd, /enable row level security/i)
  assert.equal((sql.fwd.match(/create policy/gi) || []).length, 3, 'exactly three policies')
  for (const policy of ['media_assets_admin_select', 'media_assets_admin_insert', 'media_assets_admin_update']) assert.match(sql.fwd, new RegExp(policy))
  assert.equal((sql.fwd.match(/admin_users au where au\.user_id = auth\.uid\(\) and au\.is_active = true/g) || []).length, 4, 'every policy tests an ACTIVE admin (select, insert, update using+check)')
  assert.ok(!/for delete|for all|to anon|to public|using \(true\)|with check \(true\)/i.test(sql.fwd), 'no delete/all/anon/public/true policy')
  assert.ok(!/grant[^;]*\bdelete\b|grant[^;]*\btruncate\b/i.test(sql.fwd), 'no delete/truncate grant')
  assert.match(sql.fwd, /revoke all on public\.media_assets from anon/)
  assert.match(sql.fwd, /grant select, insert, update on public\.media_assets to authenticated/)
  assert.ok(!/\bstorage\./i.test(code), 'forward SQL never touches storage')
  assert.ok(!/alter table (?!public\.media_assets)/i.test(code) && !/drop table/i.test(code) && !/\bdelete from\b|\binsert into\b|\bupdate public\./i.test(code), 'only the new table is created/altered, no data written')
  assert.ok(!/client[_-]portal|merchant|invoice|proposal|project-files|onboarding/i.test(code), 'no Client Portal / private-file objects')
  for (const category of types.MEDIA_CATEGORIES) assert.ok(sql.fwd.includes(`'${category}'`), `category ${category} in SQL`)
  assert.ok(!/svg/i.test(code), 'SVG is not an allowed MIME type')
  assert.match(sql.fwd, /security invoker/)
  assert.ok(!/security definer/i.test(code))
  assert.match(sql.fwd, /media_assets_alt_required/)
  assert.match(sql.fwd, /unique \(bucket, object_path\)/)
  assert.match(sql.fwd, /immutable/)
}
{
  const code = strip(sql.back)
  assert.match(sql.back, /v_rows = 0/, 'structure dropped only when empty')
  assert.ok(!/\bstorage\./i.test(code) && !/delete from/i.test(code))
  assert.match(sql.back, /drop policy if exists media_assets_admin_select/)
}
for (const text of Object.values(sql)) assert.ok(text.includes('Hbee admin media library Batch 1 v1') || text === sql.pre)
assert.match(sql.verify, /no DELETE policy/)
assert.match(sql.verify, /anon has NO privilege/)

// ── categories ───────────────────────────────────────────────────────────────────────────────────────────────
assert.deepEqual([...types.MEDIA_CATEGORIES].sort(), ['bgc_video', 'brand_logo', 'general', 'graphic', 'insight_image', 'project_image', 'ugc_video', 'video'])
assert.ok(types.IMAGE_CATEGORIES.every((c) => types.isMediaCategory(c) && types.isImageCategory(c)))
assert.ok(!types.isImageCategory('video') && !types.isImageCategory('bgc_video') && !types.isMediaCategory('hero'))

// ── image validation ─────────────────────────────────────────────────────────────────────────────────────────
const check = (head, declaredType, size = 1000) => validation.validateImageBytes({ size, declaredType, head })
assert.equal(check(PNG, 'image/png').extension, 'png')
assert.equal(check(JPEG, 'image/jpeg').extension, 'jpg')
assert.equal(check(JPEG, 'image/jpg').mime, 'image/jpeg')
assert.equal(check(WEBP, 'image/webp').extension, 'webp')
assert.equal(check(AVIF, 'image/avif').extension, 'avif')
assert.equal(check(PNG, '').mime, 'image/png', 'a missing declared type falls back to the sniffed type')
assert.equal(check(PNG, 'application/octet-stream').mime, 'image/png')
assert.throws(() => check(SVG, 'image/svg+xml'), /SVG/)
assert.throws(() => check(SVG, 'image/png'), /SVG|markup/, 'an SVG renamed to .png with a PNG type is still rejected')
assert.throws(() => check(HTML, 'image/png'), /not accepted/)
assert.throws(() => check(PNG, 'image/jpeg'), /contents are image\/png/, 'declared type must match the real bytes')
assert.throws(() => check(pad(bytes(1, 2, 3)), 'image/png'), /not a supported image/)
assert.throws(() => check(PNG, 'image/png', 0), /empty/)
assert.throws(() => check(PNG, 'image/png', validation.MEDIA_IMAGE_MAX_BYTES + 1), /MB or smaller/)
assert.ok(!validation.MEDIA_IMAGE_ACCEPT.includes('svg') && !validation.MEDIA_IMAGE_ACCEPT.includes('gif'))
assert.throws(() => validation.validateDimensions(0, 10)); assert.throws(() => validation.validateDimensions(20001, 10)); validation.validateDimensions(800, 600)

// ── filenames and paths ──────────────────────────────────────────────────────────────────────────────────────
assert.equal(validation.sanitizeFileBase('../../Étoile Logo (Final).PNG'), 'etoile-logo-final')
assert.equal(validation.sanitizeFileBase('C:\\fakepath\\My File.svg.png'), 'my-file-svg')
assert.equal(validation.sanitizeFileBase('.png'), 'image'); assert.equal(validation.sanitizeFileBase(''), 'image')
assert.ok(validation.sanitizeFileBase('x'.repeat(300)).length <= 60)
assert.ok(!/[^a-z0-9-]/.test(validation.sanitizeFileBase('a/b\\c<script>"\'; DROP.png')))
const token = '123e4567-e89b-12d3-a456-426614174000'
const pathFor = (category, name, mime) => validation.buildObjectPath(category, name, mime, token)
assert.equal(pathFor('brand_logo', 'Acme Logo.PNG', 'image/png'), `media/brand-logos/acme-logo-${token}.png`)
assert.equal(pathFor('graphic', 'x.jpg', 'image/jpeg').split('/').slice(0, 2).join('/'), 'media/graphics')
assert.equal(pathFor('project_image', 'x', 'image/webp').split('/').slice(0, 2).join('/'), 'media/project-images')
assert.equal(pathFor('general', 'x', 'image/avif').split('/').slice(0, 2).join('/'), 'media/general')
assert.equal(pathFor('insight_image', 'x', 'image/png').split('/')[1], 'insight-images')
assert.match(pathFor('brand_logo', 'evil.svg', 'image/png'), /\.png$/, 'extension follows the sniffed type, not the name')
assert.throws(() => pathFor('video', 'x', 'image/png'), /category/); assert.throws(() => validation.buildObjectPath('general', 'x', 'image/png', '../x'), /token/)
for (const category of types.IMAGE_CATEGORIES) assert.ok(validation.isSafeObjectPath(pathFor(category, 'A b.png', 'image/png')))
for (const bad of ['../x.png', '/x.png', 'a//b.png', 'a/b/', '', 'a/../b.png', 'a<b>.png']) assert.ok(!validation.isSafeObjectPath(bad), bad)

// ── metadata ─────────────────────────────────────────────────────────────────────────────────────────────────
const meta = (patch = {}) => ({ title: 'Acme', category: 'brand_logo', alt_text: 'Acme logo', is_decorative: false, caption: '', ...patch })
assert.deepEqual(validation.validateMediaMetadata(meta()), {})
assert.ok(validation.validateMediaMetadata(meta({ title: '  ' })).title)
assert.ok(validation.validateMediaMetadata(meta({ category: 'nope' })).category)
assert.ok(validation.validateMediaMetadata(meta({ category: 'bgc_video' })).category, 'video categories are not uploadable in Batch 1')
assert.ok(validation.validateMediaMetadata(meta({ alt_text: '' })).alt_text, 'alt text is required')
assert.deepEqual(validation.validateMediaMetadata(meta({ alt_text: '', is_decorative: true })), {}, 'explicit decorative exception')
assert.ok(validation.validateMediaMetadata(meta({ alt_text: 'x'.repeat(301) })).alt_text)
const row = validation.buildInsertRow({ meta: meta({ alt_text: 'ignored', is_decorative: true }), category: 'brand_logo', objectPath: 'media/brand-logos/a.png', publicUrl: 'https://example.test/a.png', mime: 'image/png', size: 5, width: 2, height: 3, checksum: null })
assert.equal(row.alt_text, '', 'decorative rows store no alt text'); assert.equal(row.bucket, 'project-images'); assert.equal(row.status, 'active'); assert.ok(!('created_by' in row), 'created_by comes from the database default')

// ── checksum + prepare ───────────────────────────────────────────────────────────────────────────────────────
;(async () => {
  assert.equal(await checksum.sha256Hex(new TextEncoder().encode('abc').buffer), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
  const file = (head, name, type) => new File([head], name, { type })
  const ok = await prepare.prepareImageFile(file(PNG, 'a.png', 'image/png'), { readDimensions: async () => ({ width: 640, height: 480 }) })
  assert.equal(ok.mime, 'image/png'); assert.equal(ok.width, 640); assert.equal(ok.checksum.length, 64)
  await assert.rejects(prepare.prepareImageFile(file(SVG, 'a.png', 'image/png'), { readDimensions: async () => ({ width: 1, height: 1 }) }), /SVG|markup/)
  await assert.rejects(prepare.prepareImageFile(file(PNG, 'a.png', 'image/png'), { readDimensions: async () => { throw new Error('could not decode') } }), /could not decode/)
  await assert.rejects(prepare.prepareImageFile(file(PNG, 'a.png', 'image/png'), { readDimensions: async () => ({ width: 99999, height: 1 }) }), /dimensions/)

  // ── mock database ──────────────────────────────────────────────────────────────────────────────────────────
  const makeDb = (tables = {}, storage = {}) => {
    const log = []
    const db = {
      log,
      from(table) {
        const ops = []
        const q = new Proxy({}, { get(_, op) {
          if (op === 'then') return (resolve, reject) => Promise.resolve().then(() => {
            assert.ok(!ops.some(([name]) => name === 'delete'), 'the Media Library never deletes rows')
            log.push({ table, ops }); const handler = tables[table]
            return handler ? handler(ops) : { data: [], error: null }
          }).then(resolve, reject)
          return (...args) => { ops.push([op, ...args]); return q }
        } })
        return q
      },
      storage: { from(bucket) {
        return {
          async upload(key, file, options) { log.push({ storage: 'upload', bucket, key, options }); return { error: storage.uploadError || null } },
          getPublicUrl(key) { return { data: { publicUrl: storage.url ?? `https://example.test/storage/v1/object/public/${bucket}/${key}` } } },
          async remove() { assert.fail('the Media Library must never remove storage objects') },
        }
      } },
    }
    return db
  }
  const asset = (patch = {}) => ({ id: '11111111-1111-4111-8111-111111111111', kind: 'image', category: 'brand_logo', title: 'Acme', alt_text: 'Acme logo', is_decorative: false, caption: '', bucket: 'project-images', object_path: 'media/brand-logos/acme-1.png', public_url: 'https://example.test/storage/v1/object/public/project-images/media/brand-logos/acme-1.png', mime_type: 'image/png', size_bytes: 10, width: 1, height: 1, duration_seconds: null, poster_asset_id: null, checksum: 'a'.repeat(64), status: 'active', created_by: null, created_at: '', updated_at: '', ...patch })

  // list + search escaping
  let db = makeDb({ media_assets: () => ({ data: [asset()], error: null }) })
  const listed = await library.listMediaAssets(db, { search: '100%_x', category: 'brand_logo', kind: 'image', status: 'active' })
  assert.equal(listed.length, 1)
  const listOps = db.log[0].ops
  assert.deepEqual(listOps.find(([n]) => n === 'ilike'), ['ilike', 'title', '%100\\%\\_x%'])
  assert.ok(listOps.some((o) => o[0] === 'eq' && o[1] === 'status' && o[2] === 'active') && listOps.some((o) => o[0] === 'eq' && o[1] === 'category' && o[2] === 'brand_logo'))
  assert.ok(!listOps.some((o) => o[0] === 'select' && o[1] === '*'), 'explicit column list')
  await assert.rejects(library.listMediaAssets(db, { category: 'hero' }), /Unknown category/)

  // duplicate detection by checksum
  db = makeDb({ media_assets: () => ({ data: [asset()], error: null }) })
  assert.equal((await library.findAssetsByChecksum(db, 'a'.repeat(64))).length, 1)
  assert.ok(db.log[0].ops.some((o) => o[0] === 'eq' && o[1] === 'checksum'))
  db = makeDb({}); assert.deepEqual(await library.findAssetsByChecksum(db, null), []); assert.deepEqual(await library.findAssetsByChecksum(db, "x' or 1=1"), []); assert.equal(db.log.length, 0, 'invalid checksums never reach the database')

  // upload: path, bucket, options, insert row, no overwrite, no removal, no silent duplicate blocking
  db = makeDb({ media_assets: (ops) => ({ data: { ...asset(), ...ops.find(([n]) => n === 'insert')[1] }, error: null }) })
  const uploaded = await library.uploadImageAsset(db, { file: file(PNG, 'Acme Logo.PNG', 'image/png'), mime: 'image/png', width: 10, height: 20, checksum: 'b'.repeat(64), category: 'brand_logo', meta: meta(), token })
  const up = db.log.find((entry) => entry.storage === 'upload')
  assert.equal(up.bucket, 'project-images'); assert.equal(up.key, `media/brand-logos/acme-logo-${token}.png`)
  assert.equal(up.options.upsert, false); assert.equal(up.options.contentType, 'image/png')
  const inserted = db.log.find((entry) => entry.table === 'media_assets').ops.find(([n]) => n === 'insert')[1]
  assert.equal(inserted.bucket, 'project-images'); assert.equal(inserted.checksum, 'b'.repeat(64)); assert.equal(inserted.width, 10); assert.equal(inserted.status, 'active'); assert.equal(uploaded.title, 'Acme')
  await assert.rejects(library.uploadImageAsset(db, { file: file(PNG, 'a.png', 'image/png'), mime: 'image/png', width: 1, height: 1, checksum: null, category: 'brand_logo', meta: meta({ alt_text: '' }), token }), /Describe the image/)
  db = makeDb({}, { uploadError: { message: 'new row violates row-level security policy' } })
  await assert.rejects(library.uploadImageAsset(db, { file: file(PNG, 'a.png', 'image/png'), mime: 'image/png', width: 1, height: 1, checksum: null, category: 'general', meta: meta(), token }), /does not have permission/)
  db = makeDb({ media_assets: () => ({ data: null, error: { message: 'boom' } }) })
  await assert.rejects(library.uploadImageAsset(db, { file: file(PNG, 'a.png', 'image/png'), mime: 'image/png', width: 1, height: 1, checksum: null, category: 'general', meta: meta(), token }), (error) => /uploaded \(media\/general\//.test(error.message))
  db = makeDb({}, { url: 'http://insecure.test/x.png' })
  await assert.rejects(library.uploadImageAsset(db, { file: file(PNG, 'a.png', 'image/png'), mime: 'image/png', width: 1, height: 1, checksum: null, category: 'general', meta: meta(), token }), /HTTPS/)

  // archive / restore: status flag only
  db = makeDb({ media_assets: () => ({ data: asset({ status: 'archived' }), error: null }) })
  const archived = await library.archiveAsset(db, asset().id)
  assert.equal(archived.status, 'archived')
  const archiveOps = db.log[0].ops
  assert.deepEqual(archiveOps.find(([n]) => n === 'update'), ['update', { status: 'archived' }], 'archive writes only the status')
  assert.ok(archiveOps.some((o) => o[0] === 'eq' && o[1] === 'status' && o[2] === 'active'))
  assert.ok(!db.log.some((entry) => entry.storage), 'archive never touches storage')
  db = makeDb({ media_assets: () => ({ data: asset(), error: null }) }); await library.restoreAsset(db, asset().id)
  assert.deepEqual(db.log[0].ops.find(([n]) => n === 'update'), ['update', { status: 'active' }])
  db = makeDb({ media_assets: () => ({ data: null, error: null }) }); await assert.rejects(library.archiveAsset(db, asset().id), /no longer active/)
  await assert.rejects(library.archiveAsset(db, 'not-a-uuid'), /Invalid asset id/)
  assert.ok(!/\.delete\(|\.remove\(|removeBucket|emptyBucket/.test(read('src/lib/media/media-library.ts')), 'no delete / storage removal code exists in the library')
  assert.ok(!/\.delete\(|\.remove\(/.test(read('src/app/admin/media/page.tsx') + read('src/components/admin/media/MediaUploader.tsx') + read('src/components/admin/media/MediaPicker.tsx')))

  // metadata update never sends file identity
  db = makeDb({ media_assets: () => ({ data: asset({ title: 'New' }), error: null }) })
  await library.updateAssetMetadata(db, asset(), { title: 'New' })
  const patch = db.log[0].ops.find(([n]) => n === 'update')[1]
  assert.deepEqual(Object.keys(patch).sort(), ['alt_text', 'caption', 'category', 'is_decorative', 'title'])
  await assert.rejects(library.updateAssetMetadata(db, asset(), { alt_text: '' }), /Describe the image/)

  // usage scan
  const a = asset()
  const tables = {
    blog_posts: () => ({ data: [{ id: 'p1', title: 'Post', slug: 'post', featured_image: a.public_url, og_image: null, content: '<p>none</p>' }, { id: 'p2', title: 'Other', content: `<img src="${a.public_url}">` }], error: null }),
    portfolio_items: () => ({ data: [{ id: 'w1', title: 'Case', gallery_images: [a.public_url] }, { id: 'w2', title: 'Unrelated', image_url: 'https://elsewhere.test/x.png' }], error: null }),
    portfolio_media: () => ({ data: [], error: null }),
    trust_section: () => ({ data: [{ id: 1, partner_logos: JSON.stringify([{ name: 'Acme', logo: a.public_url, asset_id: a.id }, { name: 'Other', logo: '/o.png' }]) }], error: null }),
    hero_section: () => ({ data: [{ id: 2, background_image: a.public_url }], error: null }),
    team_members: () => ({ data: null, error: { message: 'permission denied' } }),
    about_page: () => ({ data: [{ id: 3, about_image: a.object_path }], error: null }),
  }
  const scan = await library.scanAssetUsage(makeDb(tables), a)
  const where = scan.usages.map((u) => `${u.area}:${u.field}`).sort()
  assert.deepEqual(where, ['About page:about_image', 'Hero:background_image', 'Insights:content', 'Insights:featured_image', 'Portfolio:gallery_images', 'Trusted Brands:partner_logos'])
  assert.equal(scan.usages.find((u) => u.field === 'partner_logos').detail, 'Brand: Acme')
  assert.deepEqual(scan.unscanned.map((u) => u.area), ['Team'], 'a table that cannot be read is reported, not hidden')
  assert.ok(scan.usages.every((u) => u.href.startsWith('/admin/')))

  // ── Batch 2: usage scan sees the references the Insights and Portfolio integrations create ──────────────────────
  {
    const b = asset({ public_url: 'https://example.test/storage/v1/object/public/project-images/media/insight-images/hero-1.png', object_path: 'media/insight-images/hero-1.png' })
    const figure = ['<figure>', '  <img src="' + b.public_url + '" alt="Hero" width="1200" height="630" loading="lazy" />', '  <figcaption>Cap</figcaption>', '</figure>'].join('\n')
    const batch2 = {
      blog_posts: () => ({ data: [{ id: 'p1', title: 'Social', og_image: b.public_url, featured_image: null, content: '<p>x</p>' }, { id: 'p2', title: 'Inline', content: '<p>Intro</p>\n\n' + figure }, { id: 'p3', title: 'Clean', content: '<p>no image</p>' }], error: null }),
      portfolio_items: () => ({ data: [{ id: 'w1', title: 'Cover', image_url: b.public_url, before_image: '', gallery_images: [] }, { id: 'w2', title: 'Gallery', gallery_images: ['/a.png', b.public_url] }, { id: 'w3', title: 'BeforeAfter', before_image: b.public_url, after_image: 'https://other.test/x.png' }], error: null }),
      portfolio_media: () => ({ data: [{ id: 'm1', portfolio_id: 'w9', title: 'Creative', image_url: b.public_url }], error: null }),
      trust_section: () => ({ data: [], error: null }), hero_section: () => ({ data: [], error: null }), team_members: () => ({ data: [], error: null }), about_page: () => ({ data: [], error: null }),
    }
    const found = await library.scanAssetUsage(makeDb(batch2), b)
    assert.deepEqual(found.usages.map((u) => u.area + ':' + u.label + ':' + u.field).sort(), [
      'Insights:Inline:content', 'Insights:Social:og_image',
      'Portfolio creative media:Creative:image_url',
      'Portfolio:BeforeAfter:before_image', 'Portfolio:Cover:image_url', 'Portfolio:Gallery:gallery_images'])
    assert.equal(found.usages.find((u) => u.label === 'Creative').href, '/admin/portfolio/w9')
    assert.equal(found.unscanned.length, 0)
  }

  // ── components (server-rendered initial state; effects do not run) ──────────────────────────────────────────
  currentDb = makeDb({ media_assets: () => ({ data: [], error: null }) })
  const { default: MediaPicker } = load('src/components/admin/media/MediaPicker.tsx')
  const { default: MediaUploader } = load('src/components/admin/media/MediaUploader.tsx')
  const { default: MediaPage } = load('src/app/admin/media/page.tsx')
  assert.equal(renderToStaticMarkup(React.createElement(MediaPicker, { open: false, onClose() {}, onSelect() {} })), '', 'closed picker renders nothing')
  const pickerHtml = renderToStaticMarkup(React.createElement(MediaPicker, { open: true, onClose() {}, onSelect() {}, selectedId: asset().id }))
  assert.match(pickerHtml, /role="dialog"/); assert.match(pickerHtml, /aria-modal="true"/); assert.match(pickerHtml, /aria-labelledby=/)
  assert.match(pickerHtml, /role="tablist"/); assert.match(pickerHtml, /type="search"/); assert.match(pickerHtml, /All categories/)
  assert.ok(!/Video|Background video|UGC/.test(pickerHtml), 'no video categories in the picker')
  const keepOpenHtml = renderToStaticMarkup(React.createElement(MediaPicker, { open: true, keepOpen: true, onClose() {}, onSelect() {} }))
  assert.match(keepOpenHtml, />Done</); assert.ok(!/>Close</.test(keepOpenHtml), 'a multi-select picker offers Done')
  assert.match(pickerHtml, />Close</)
  const { default: MediaImageField } = load('src/components/admin/media/MediaImageField.tsx')
  const emptyField = renderToStaticMarkup(React.createElement(MediaImageField, { label: 'Cover', value: '', onChange() {} }))
  assert.match(emptyField, /Choose from Media Library/); assert.match(emptyField, /No image selected/); assert.ok(!/Remove image/.test(emptyField))
  const filledField = renderToStaticMarkup(React.createElement(MediaImageField, { label: 'Cover', value: 'https://legacy.test/old.png', urlLabel: 'Cover URL', onChange() {} }))
  assert.match(filledField, /Replace image/); assert.match(filledField, /Remove image/); assert.match(filledField, /Advanced: Cover URL/); assert.match(filledField, /value="https:\/\/legacy\.test\/old\.png"/)
  assert.ok(!/storage\.from|\.remove\(|\.delete\(/.test(read('src/components/admin/media/MediaImageField.tsx')), 'removing an image reference never deletes a file')
  const uploaderHtml = renderToStaticMarkup(React.createElement(MediaUploader, { onUploaded() {} }))
  assert.match(uploaderHtml, /accept="image\/png,image\/jpeg,image\/webp,image\/avif"/); assert.match(uploaderHtml, /SVG is not accepted/); assert.match(uploaderHtml, /drag and drop/)
  const pageHtml = renderToStaticMarkup(React.createElement(MediaPage))
  for (const text of ['Media Library', 'Upload image', 'Search by name', 'All categories', 'All types', 'Archived', 'Grid', 'List']) assert.ok(pageHtml.includes(text), text)
  assert.ok(!/hard delete|Delete asset/i.test(pageHtml), 'no delete control')

  // ── navigation, redirect, scope ────────────────────────────────────────────────────────────────────────────
  const nav = read('src/components/admin/shell/admin-nav.ts')
  assert.match(nav, /label: 'Media Library', href: '\/admin\/media'/)
  assert.match(read('next.config.js'), /source: '\/admin\/images', destination: '\/admin\/media', permanent: false/)
  const scoped = [...['src/lib/media/media-types.ts', 'src/lib/media/media-validation.ts', 'src/lib/media/media-library.ts', 'src/lib/media/media-prepare.ts', 'src/app/admin/media/page.tsx', 'src/components/admin/media/MediaUploader.tsx', 'src/components/admin/media/MediaPicker.tsx'].map(read)].join('\n')
  assert.ok(!/client-portal|project-files|proposal-files|onboarding-files|client-portal-files|service_role|SUPABASE_SERVICE/.test(scoped), 'no Client Portal, private bucket or service-role code in the media library')
  // Batch 3 adds video (site-media) in its own modules. The IMAGE upload path stays exactly as it was: it never targets
  // the video bucket and never accepts a video type.
  const imagePath = ['src/lib/media/media-validation.ts', 'src/lib/media/media-prepare.ts', 'src/components/admin/media/MediaUploader.tsx'].map(read).join('\n')
  assert.ok(!/site-media|SITE_MEDIA_BUCKET/.test(imagePath), 'image uploads never use the video bucket')
  assert.ok(!/<video|video\/mp4|video\/webm/.test(imagePath), 'the image upload path accepts no video type')
  assert.match(read('src/lib/media/media-library.ts'), /db\.storage\.from\(MEDIA_BUCKET\)/, 'images are still stored in project-images')
  assert.ok(!/blog-images|portfolio-images|team-avatars|'proofs'|'avatars'/.test(scoped), 'legacy buckets are not touched')
  console.log('admin media foundation checks passed')
})().catch((error) => { console.error(error); process.exit(1) })
