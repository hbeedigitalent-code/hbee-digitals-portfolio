// Offline checks for Admin Media Batch 3 (video). No network, storage, database or real uploads.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const req = name => name.startsWith('./') ? load('src/lib/media/' + name.slice(2) + '.ts') : require(name)
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, process, TextDecoder, Uint8Array, URL, console }, { filename: file })
  return mod.exports
}
const video = load('src/lib/media/media-video.ts')
const library = load('src/lib/media/media-library.ts')
const types = load('src/lib/media/media-types.ts')
const clone = value => JSON.parse(JSON.stringify(value))

const ascii = text => [...text].map(c => c.charCodeAt(0))
const MP4 = Uint8Array.from([0, 0, 0, 24, ...ascii('ftypisom'), 0, 0, 2, 0, ...ascii('isomavc1')])
const WEBM = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x84, ...ascii('webm'), 0, 0])
const MKV = Uint8Array.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x82, 0x88, ...ascii('matroska')])
const MOV = Uint8Array.from([0, 0, 0, 20, ...ascii('ftypqt  '), 0, 0, 0, 0])
const AVIF = Uint8Array.from([0, 0, 0, 28, ...ascii('ftypavif'), 0, 0, 0, 0])
const SVG = Uint8Array.from(ascii('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))
const PNG = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 0])

const UUID = '123e4567-e89b-42d3-a456-426614174000'
const POSTER = '223e4567-e89b-42d3-a456-426614174000'

/** Minimal fake Supabase client recording every operation. */
function fakeDb({ poster = { id: POSTER, kind: 'image', status: 'active' }, token = 'jwt-token', insertError = null, rows = {} } = {}) {
  const ops = []
  return {
    ops,
    auth: { async getSession() { return { data: { session: token ? { access_token: token } : null }, error: null } } },
    storage: { from: bucket => ({ getPublicUrl: key => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/${bucket}/${key}` } }), async remove() { assert.fail('video code must never remove storage objects') }, async upload() { assert.fail('video bytes go through TUS, not upload()') } }) },
    from(table) {
      const q = { table, calls: [] }
      const chain = new Proxy(q, { get(target, key) {
        if (key === 'then') return undefined
        if (key === 'calls' || key === 'table') return target[key]
        if (key === 'delete') return () => assert.fail('no delete')
        return (...args) => {
          target.calls.push([key, ...args])
          const done = () => {
            ops.push({ table, calls: target.calls })
            const insert = target.calls.find(c => c[0] === 'insert'), update = target.calls.find(c => c[0] === 'update')
            if (insert) return { data: insertError ? null : { id: UUID, ...insert[1] }, error: insertError }
            if (update) return { data: { id: UUID, ...update[1] }, error: null }
            if (table === 'media_assets' && target.calls.some(c => c[0] === 'in')) return { data: poster ? [poster] : [], error: null }
            return { data: rows[table] ?? [], error: null }
          }
          if (['single', 'maybeSingle', 'in', 'limit'].includes(key)) return Promise.resolve(done())
          return chain
        }
      } })
      return chain
    },
  }
}

;(async () => {
  // ── Types, categories, limits ──
  assert.deepEqual(Object.keys(video.VIDEO_TYPES).sort(), ['video/mp4', 'video/webm'], 'only MP4 and WebM')
  assert.deepEqual([...types.VIDEO_CATEGORIES], ['video', 'bgc_video', 'ugc_video'])
  assert.deepEqual(clone(types.VIDEO_FOLDERS), { video: 'videos', bgc_video: 'background', ugc_video: 'ugc' })
  assert.equal(types.SITE_MEDIA_BUCKET, 'site-media'); assert.equal(types.MEDIA_BUCKET, 'project-images', 'images are unchanged')
  assert.equal(video.VIDEO_MAX_BYTES, 40 * 1024 * 1024); assert.ok(video.VIDEO_MAX_BYTES < 50 * 1024 * 1024)

  // ── Content sniffing: bytes decide, never names ──
  assert.equal(video.sniffVideoMime(MP4), 'video/mp4'); assert.equal(video.sniffVideoMime(WEBM), 'video/webm')
  for (const bytes of [MKV, MOV, AVIF, SVG, PNG, new Uint8Array(4)]) assert.equal(video.sniffVideoMime(bytes), null)
  const check = (head, declaredType, fileName, size = 1000) => video.validateVideoBytes({ size, declaredType, head, fileName })
  assert.deepEqual(clone(check(MP4, 'video/mp4', 'a.mp4')), { mime: 'video/mp4', extension: 'mp4', size: 1000 })
  assert.equal(check(MP4, '', 'clip.M4V').mime, 'video/mp4'); assert.equal(check(WEBM, 'video/webm', 'a.webm').extension, 'webm')
  assert.throws(() => check(MP4, 'video/mp4', 'a.mp4', 0), /empty/)
  assert.throws(() => check(MP4, 'video/mp4', 'a.mp4', video.VIDEO_MAX_BYTES + 1), /40 MB or smaller/)
  assert.throws(() => check(SVG, 'video/mp4', 'a.mp4'), /SVG|markup/)
  assert.throws(() => check(PNG, 'video/mp4', 'a.mp4'), /Upload an MP4 or WebM/)
  assert.throws(() => check(MOV, 'video/quicktime', 'a.mov'), /Upload an MP4 or WebM/)
  assert.throws(() => check(MP4, 'video/webm', 'a.mp4'), /contents are video\/mp4/)
  assert.throws(() => check(MP4, 'video/mp4', 'a.exe'), /\.exe/)

  // ── Metadata and poster rules ──
  const meta = { title: 'Clip', category: 'video', caption: '' }
  assert.deepEqual(clone(video.validateVideoMetadata(meta, { hasPoster: false })), {})
  assert.ok(video.validateVideoMetadata({ ...meta, title: ' ' }, { hasPoster: true }).title)
  assert.ok(video.validateVideoMetadata({ ...meta, category: 'brand_logo' }, { hasPoster: true }).category)
  assert.ok(video.validateVideoMetadata({ ...meta, category: 'bgc_video' }, { hasPoster: false }).poster, 'background video requires a poster')
  assert.ok(video.videoWarnings('bgc_video', { size: 9 * 1048576, duration: 30, width: 3840, height: 2160 }, true).length === 3)
  assert.ok(video.videoWarnings('ugc_video', { size: 100, duration: 10, width: 720, height: 1280 }, false).some(w => /poster/.test(w)))

  // ── Path and row ──
  const token = '0f8fad5b-d9cb-469f-a165-70867728950e'
  assert.equal(video.buildVideoObjectPath('bgc_video', '../My Clip.MOV', 'video/mp4', token), `background/my-clip-${token}.mp4`)
  assert.throws(() => video.buildVideoObjectPath('general', 'a', 'video/mp4', token), /category/)
  assert.throws(() => video.buildVideoObjectPath('video', 'a', 'video/mp4', '../x'), /token/)
  const row = video.buildVideoInsertRow({ meta: { title: ' T ', category: 'bgc_video', caption: ' c ' }, category: 'bgc_video', objectPath: 'background/x.mp4', publicUrl: 'https://x/y', mime: 'video/mp4', size: 10, width: 1280, height: null, duration: 12.3456, checksum: null, posterAssetId: 'nope' })
  assert.equal(row.kind, 'video'); assert.equal(row.bucket, 'site-media'); assert.equal(row.title, 'T')
  assert.equal(row.width, null); assert.equal(row.height, null, 'dimensions are stored only as a pair (database constraint)')
  assert.equal(row.duration_seconds, 12.35); assert.equal(row.poster_asset_id, null); assert.equal(row.alt_text, '')

  // ── Resumable upload: session token, never overwrite, progress, cancel ──
  let options, started = 0, aborted = []
  const createUpload = (file, o) => { options = o; return { start() { started += 1 }, abort(t) { aborted.push(t) } } }
  const progress = []
  const handle = video.startVideoUpload(fakeDb(), { file: { name: 'a.mp4' }, mime: 'video/mp4', category: 'ugc_video', token, onProgress: f => progress.push(f) }, { createUpload })
  await new Promise(r => setImmediate(r))
  assert.equal(started, 1)
  assert.equal(options.endpoint, 'https://example.supabase.co/storage/v1/upload/resumable')
  assert.equal(options.headers.authorization, 'Bearer jwt-token', 'the signed-in admin session authorises the upload (RLS)')
  assert.equal(options.headers['x-upsert'], 'false'); assert.equal(options.chunkSize, 6 * 1024 * 1024)
  assert.equal(options.metadata.bucketName, 'site-media'); assert.equal(options.metadata.objectName, `ugc/a-${token}.mp4`); assert.equal(options.metadata.contentType, 'video/mp4')
  assert.ok(options.retryDelays.length > 1, 'transient failures are retried')
  options.onProgress(5, 10); options.onProgress(10, 10); options.onSuccess(); await handle.promise
  assert.deepEqual(progress, [0.5, 1])
  const second = video.startVideoUpload(fakeDb(), { file: { name: 'a.mp4' }, mime: 'video/mp4', category: 'video', token }, { createUpload })
  await new Promise(r => setImmediate(r))
  second.cancel(); assert.deepEqual(aborted, [true]); options.onError(new Error('aborted')); await assert.rejects(second.promise, /cancelled/i)
  await assert.rejects(video.startVideoUpload(fakeDb({ token: null }), { file: { name: 'a.mp4' }, mime: 'video/mp4', category: 'video', token }, { createUpload }).promise, /session has expired/)
  const third = video.startVideoUpload(fakeDb(), { file: { name: 'a.mp4' }, mime: 'video/mp4', category: 'video', token }, { createUpload })
  await new Promise(r => setImmediate(r)); options.onError(new Error('new row violates row-level security policy')); await assert.rejects(third.promise, /permission/)

  // ── Registration and editing ──
  const base = { objectPath: 'videos/a.mp4', mime: 'video/mp4', category: 'video', size: 10, meta, width: 10, height: 10, duration: 3, checksum: null, posterAssetId: null }
  const db = fakeDb(); const saved = await video.registerVideoAsset(db, base)
  assert.equal(saved.kind, 'video'); assert.match(saved.public_url, /site-media\/videos\/a\.mp4$/)
  await assert.rejects(video.registerVideoAsset(fakeDb(), { ...base, category: 'bgc_video', meta: { ...meta, category: 'bgc_video' } }), /poster/)
  await video.registerVideoAsset(fakeDb(), { ...base, posterAssetId: POSTER })
  await assert.rejects(video.registerVideoAsset(fakeDb({ poster: { id: POSTER, kind: 'video', status: 'active' } }), { ...base, posterAssetId: POSTER }), /image/)
  await assert.rejects(video.registerVideoAsset(fakeDb({ poster: { id: POSTER, kind: 'image', status: 'archived' } }), { ...base, posterAssetId: POSTER }), /archived/)
  await assert.rejects(video.registerVideoAsset(fakeDb({ insertError: { message: 'permission denied' } }), base), /uploaded \(videos\/a\.mp4\)/, 'a failed registration names the stored file and deletes nothing')
  const asset = { id: UUID, kind: 'video', category: 'video', title: 'T', caption: '', poster_asset_id: null }
  const updated = await video.updateVideoMetadata(fakeDb(), asset, { poster_asset_id: POSTER, title: 'New' })
  assert.equal(updated.poster_asset_id, POSTER); assert.deepEqual(Object.keys(clone(updated)).sort(), ['caption', 'category', 'id', 'poster_asset_id', 'title'], 'only descriptive fields and the poster are written')
  await assert.rejects(video.updateVideoMetadata(fakeDb(), { ...asset, category: 'bgc_video', poster_asset_id: POSTER }, { poster_asset_id: null }), /poster/)
  await assert.rejects(video.updateVideoMetadata(fakeDb(), asset, { poster_asset_id: UUID }), /own poster/)
  await assert.rejects(video.updateVideoMetadata(fakeDb(), { ...asset, kind: 'image' }, {}), /not a video/)

  // ── Usage scan: video URLs in content tables, and posters referenced by id; archive is a status flag ──
  const stored = { id: UUID, kind: 'video', bucket: 'site-media', object_path: 'videos/a.mp4', public_url: 'https://example.supabase.co/storage/v1/object/public/site-media/videos/a.mp4' }
  const rows = { hero_section: [{ id: 'h', video_url: stored.public_url }], portfolio_media: [{ id: 'm', portfolio_id: 'p', video_url: stored.public_url }], video_testimonials: [{ id: 'v', media_url: stored.public_url }] }
  const scan = await library.scanAssetUsage(fakeDb({ rows }), stored)
  assert.deepEqual(clone(scan.usages.map(u => u.area)).sort(), ['Hero', 'Portfolio creative media', 'Video proofs'])
  const posterScan = await library.scanAssetUsage(fakeDb({ rows: { media_assets: [{ id: UUID, title: 'Intro', poster_asset_id: POSTER }] } }), { id: POSTER, kind: 'image', bucket: 'project-images', object_path: 'media/general/p.png', public_url: 'https://x/p.png' })
  assert.ok(posterScan.usages.some(u => u.area === 'Video poster' && u.label === 'Intro'))
  for (const file of ['src/lib/media/media-video.ts', 'src/lib/media/media-library.ts']) assert.ok(!/\.delete\(|\.remove\(|removeBucket|emptyBucket/.test(read(file)), file + ' has no hard delete')
  assert.ok(!/client-portal|project-files|proposal-files|onboarding-files|client-portal-files|service_role|SUPABASE_SERVICE/.test(read('src/lib/media/media-video.ts')), 'no Client Portal, private bucket or service-role access')

  // ── Public rendering primitive: poster first; no autoplay for reduced motion, phones or data saver ──
  const policyMod = { exports: {} }
  vm.runInNewContext(ts.transpileModule(read('src/components/site/media/video-policy.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module: policyMod, exports: policyMod.exports })
  const allowed = policyMod.exports.backgroundVideoAllowed
  const desktop = { reducedMotion: false, narrow: false, saveData: false }
  assert.equal(allowed(desktop), true)
  assert.equal(allowed({ ...desktop, reducedMotion: true }), false, 'reduced motion shows the poster only')
  assert.equal(allowed({ ...desktop, reducedMotion: true, allowMobile: true }), false)
  assert.equal(allowed({ ...desktop, narrow: true }), false, 'phones get the poster by default')
  assert.equal(allowed({ ...desktop, narrow: true, allowMobile: true }), true)
  assert.equal(allowed({ ...desktop, saveData: true }), false)
  const bg = read('src/components/site/media/BackgroundVideo.tsx')
  const element = bg.slice(bg.indexOf('{playing && <video'), bg.indexOf('</video>'))
  for (const attribute of ['muted', 'loop', 'playsInline', 'preload="metadata"', 'poster={poster}', 'tabIndex={-1}']) assert.ok(element.includes(attribute), 'background video ' + attribute)
  assert.ok(!/\bcontrols\b/.test(element), 'background video has no controls')
  assert.match(bg, /useState\(false\)[\s\S]*const playing = allowed && !failed/, 'nothing but the poster until the client allows playback')
  assert.match(bg, /aria-hidden="true"/); assert.match(bg, /Pause background video/)
  const content = read('src/components/site/media/ContentVideo.tsx')
  assert.match(content, /<video[^>]*controls/); assert.ok(!/autoPlay|\bloop\b|\bmuted\b/.test(content), 'foreground video never autoplays')
  assert.match(content, /kind="captions"/); assert.match(content, /Transcript/)

  // ── Admin workflow wiring (the multi-file queue; behaviour is covered in test-media-bulk.cjs) ──
  const uploader = read('src/components/admin/media/BulkUploader.tsx')
  assert.match(uploader, /<progress/); assert.match(uploader, /Cancel remaining/); assert.match(uploader, /'Retry saving' : 'Retry'/)
  assert.ok(uploader.includes("<PosterField poster={item.poster} required={item.category === 'bgc_video'}"))
  assert.ok(uploader.includes('token: () => crypto.randomUUID()'), 'every attempt uses a new path')
  assert.ok(/<video src=\{url\}[^>]*controls/.test(uploader), 'each queued video can be previewed')
  const posterField = read('src/components/admin/media/PosterField.tsx')
  assert.match(posterField, /<MediaPicker/); assert.ok(!/kind="video"/.test(posterField), 'posters are picked from images'); assert.match(posterField, /Clear poster/)
  const picker = read('src/components/admin/media/MediaPicker.tsx')
  assert.match(picker, /kind = 'image', open,/, 'existing pickers still choose images by default')
  const page = read('src/app/admin/media/page.tsx')
  assert.match(page, /Upload media/); assert.match(page, /<BulkUploader /); assert.match(page, /updateVideoMetadata\(/); assert.match(page, /updateAssetMetadata\(/, 'image editing unchanged')
  assert.match(page, /if \(asset\.kind === 'video'\) return <span/, 'the grid does not download videos')
  assert.match(page, /<video[^>]*controls[^>]*preload="metadata"/)
  for (const file of ['BulkUploader.tsx', 'PosterField.tsx', 'MediaPicker.tsx']) assert.ok(!/\.delete\(|\.remove\(|autoPlay/.test(read('src/components/admin/media/' + file)), file + ': no delete, no autoplay')
  // Nothing outside the media library was wired up in this batch.
  for (const file of ['src/components/site/home/HomeHero.tsx', 'src/components/site/home/HomeHeroSystem.tsx', 'src/app/admin/hero/page.tsx']) assert.ok(!/BackgroundVideo|ContentVideo|site-media|video_url/.test(read(file)), file + ' is unchanged for video')

  // ── SQL drafts (never executed here) ──
  const sql = name => read(`scripts/admin-media-video-${name}.sql`)
  const code = text => text.split('\n').filter(line => !line.trim().startsWith('--')).join('\n')
  const forward = code(sql('01-forward'))
  assert.match(forward, /values \('site-media', 'site-media', true, 41943040, array\['video\/mp4', 'video\/webm'\]\)/)
  assert.equal((forward.match(/create policy/g) || []).length, 2); assert.ok(!/for (update|delete|all)\b|to anon|to public|using \(true\)/i.test(forward))
  assert.equal((forward.match(/bucket_id = 'site-media'/g) || []).length, 2); assert.equal((forward.match(/au\.is_active = true/g) || []).length, 2)
  assert.ok(!/project-images|proofs|project-files|proposal-files|onboarding|client-portal|alter table|drop table|delete from|update storage/i.test(forward), 'no other bucket or table is touched')
  const rollback = code(sql('02-rollback'))
  assert.ok(!/delete from|storage\.buckets|drop table/i.test(rollback), 'rollback deletes no object and no bucket')
  for (const name of ['00-preflight-readonly', '03-verify-readonly']) assert.ok(!/\b(insert into|update\s+\w|delete from|drop |alter |create |grant |revoke |truncate )/i.test(code(sql(name)).replace(/'[^']*'/g, "''")), name + ' is read-only')
  console.log('PASS: media video - MP4/WebM sniffing, limits, poster rules, resumable upload with admin session, registration, usage scan, no delete, SQL drafts scoped to site-media')
})().catch(error => { console.error(error); process.exit(1) })
