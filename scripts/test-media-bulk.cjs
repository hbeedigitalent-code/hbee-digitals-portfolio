// Offline checks for the multi-file upload queue: real PNG bytes (sharp), fake storage / database / TUS. No network.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const sharp = require('sharp')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co'
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const req = name => name.startsWith('./') ? load('src/lib/media/' + name.slice(2) + '.ts') : require(name)
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, process, TextDecoder, Uint8Array, URL, crypto: require('node:crypto').webcrypto, console }, { filename: file })
  return mod.exports
}
const q = load('src/lib/media/bulk-queue.ts')
const clone = value => JSON.parse(JSON.stringify(value))
const fileOf = (buffer, name, type) => ({
  name, type, size: buffer.length,
  slice: (a, b) => ({ arrayBuffer: async () => Uint8Array.from(buffer.subarray(a, b)).buffer }),
  arrayBuffer: async () => Uint8Array.from(buffer).buffer,
})
const ascii = text => [...text].map(c => c.charCodeAt(0))
const MP4 = Buffer.from([0, 0, 0, 24, ...ascii('ftypisom'), 0, 0, 2, 0, ...ascii('isomavc1')])
const POSTER = { id: '223e4567-e89b-42d3-a456-426614174000', kind: 'image', status: 'active', title: 'Poster' }

function fakeDb({ failStorage = [], failInsert = [] } = {}) {
  const stored = [], inserted = []
  const db = {
    stored, inserted,
    auth: { async getSession() { return { data: { session: { access_token: 'jwt' } }, error: null } } },
    storage: { from: bucket => ({
      async upload(key, file, options) { assert.equal(options.upsert, false); if (failStorage.some(n => key.includes(n))) return { error: { message: 'network fetch failed' } }; stored.push(`${bucket}/${key}`); return { error: null } },
      getPublicUrl: key => ({ data: { publicUrl: `https://example.supabase.co/${bucket}/${key}` } }),
      async remove() { assert.fail('the queue never deletes stored files') },
    }) },
    from(table) {
      assert.equal(table, 'media_assets')
      let row
      const chain = {
        select: () => chain, eq: () => chain,
        in: async () => ({ data: [POSTER], error: null }),
        insert(value) { row = value; return chain },
        async single() { if (failInsert.includes(row.title)) { failInsert.splice(failInsert.indexOf(row.title), 1); return { data: null, error: { message: 'permission denied' } } } inserted.push(row); return { data: { id: 'id-' + inserted.length, ...row }, error: null } },
        delete: () => assert.fail('no delete'),
      }
      return chain
    },
  }
  return db
}

;(async () => {
  // ── Limits ──
  assert.equal(q.BULK_MAX_FILES, 20); assert.equal(q.BULK_MAX_TOTAL_BYTES, 300 * 1048576)
  const many = Array.from({ length: 25 }, (_, i) => ({ name: `f${i}.png`, size: 10 }))
  const cut = q.acceptFiles([], many); assert.equal(cut.accepted.length, 20); assert.equal(cut.rejected.length, 5); assert.match(cut.rejected[0], /up to 20 files/)
  const nearly = Array.from({ length: 19 }, () => ({ file: { size: 1 }, phase: 'idle' }))
  assert.equal(q.acceptFiles(nearly, many).accepted.length, 1)
  assert.equal(q.acceptFiles(nearly.map(i => ({ ...i, phase: 'uploaded' })), many).accepted.length, 20, 'finished files free their place')
  const big = Array.from({ length: 8 }, (_, i) => ({ name: `v${i}.mp4`, size: 40 * 1048576 }))
  const bytes = q.acceptFiles([], big); assert.equal(bytes.accepted.length, 7); assert.match(bytes.rejected[0], /300 MB/)

  // ── Kind detection and per-file validation: one mixed selection ──
  const png = async color => sharp({ create: { width: 40, height: 20, channels: 4, background: color } }).png().toBuffer()
  const files = [
    fileOf(await png('#0642b3'), 'logo-one.png', 'image/png'),
    fileOf(await png('#ff5500'), 'Flyer_two.png', 'image/png'),
    fileOf(await png('#0642b3'), 'logo-one-copy.png', 'image/png'),
    fileOf(MP4, 'ugc clip.mp4', 'video/mp4'),
    fileOf(MP4.subarray(0, 20).length ? Buffer.concat([MP4, Buffer.from([1])]) : MP4, 'background.mp4', 'video/mp4'),
    fileOf(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'), 'vector.svg', 'image/svg+xml'),
  ]
  const kinds = []
  for (const f of files) kinds.push(q.guessKind(f, new Uint8Array(await f.slice(0, 64).arrayBuffer())))
  assert.deepEqual(kinds, ['image', 'image', 'image', 'video', 'video', 'image'])
  assert.equal(q.guessKind({ name: 'x.mov', type: '' }), 'video', 'unsupported video goes to the video validator for a clear message')
  const deps = { readDimensions: async () => ({ width: 40, height: 20 }), readVideo: async () => ({ duration: 12, width: 720, height: 1280 }) }
  let items = files.map((f, i) => q.newQueueItem(f, 'k' + i, kinds[i], { image: 'brand_logo', video: 'ugc_video' }))
  assert.equal(q.queueState(items[0]), 'checking')
  items = await Promise.all(items.map(async item => {
    try { return { ...item, prepared: await q.prepareQueueFile(item.file, item.kind, deps), phase: 'idle' } }
    catch (error) { return { ...item, invalid: error.message, phase: 'idle' } }
  }))
  items = q.markRepeats(items)
  assert.match(items[5].invalid, /SVG/, 'one invalid file does not affect the others')
  assert.ok(items.slice(0, 5).every(i => !i.invalid && /^[0-9a-f]{64}$/.test(i.prepared.checksum)))
  assert.equal(items[0].title, 'logo one'); assert.equal(items[1].title, 'Flyer two', 'titles come from cleaned file names')
  assert.equal(items[0].altText, '', 'alt text is never invented')
  assert.equal(q.queueState(items[0]), 'attention', 'alt text must be reviewed')
  assert.equal(q.queueState(items[2]), 'duplicate', 'same bytes earlier in the batch')
  assert.equal(items[0].sameAsEarlier, false)
  assert.equal(q.queueState(items[3]), 'ready', 'a content video needs no poster')
  assert.equal(items[3].category, 'ugc_video')

  // ── Batch defaults and per-file override ──
  items = q.applyCategory(items, 'image', 'graphic')
  assert.ok(items.filter(i => i.kind === 'image').every(i => i.category === 'graphic')); assert.equal(items[3].category, 'ugc_video')
  items = q.applyCategory(items, 'video', 'brand_logo'); assert.equal(items[3].category, 'ugc_video', 'an image category cannot be applied to videos')
  items[1] = { ...items[1], category: 'brand_logo', altText: 'Flyer', caption: 'Per file' }
  items[0] = { ...items[0], altText: 'Logo' }
  items[2] = { ...items[2], altText: 'Logo copy' }
  items[4] = { ...items[4], category: 'bgc_video' }
  assert.equal(q.queueState(items[4]), 'attention', 'background video needs a poster'); assert.match(q.metadataProblems(items[4]).join(), /poster/)
  items[3] = { ...items[3], duplicates: [{ id: 'old', title: 'Old', status: 'active' }] }
  assert.equal(q.queueState(items[3]), 'duplicate')
  items[3] = { ...items[3], allowDuplicate: true }; assert.equal(q.queueState(items[3]), 'ready', 'Upload anyway')
  assert.deepEqual(clone(q.queueSummary(items)), { total: 6, ready: 3, attention: 2, duplicate: 1, uploaded: 0, failed: 0, cancelled: 0, active: 0, checking: 0 })

  // ── Partial failure: successes stay, one failure is retried, duplicates never block ──
  const db = fakeDb({ failInsert: ['Flyer two'] })
  const state = new Map(items.map(i => [i.key, i]))
  const update = (key, patch) => state.set(key, { ...state.get(key), ...patch })
  let tus
  const createUpload = (file, options) => ({ start() { options.onProgress(5, 10); tus = options; options.onSuccess() }, abort() {} })
  let n = 0
  const up = { token: () => `0f8fad5b-d9cb-469f-a165-7086772895${String(n++).padStart(2, '0')}`, video: { createUpload } }
  const added = await q.runQueue(db, items.map(i => i.key), k => state.get(k), update, up)
  assert.equal(added.length, 2, 'the logo and the UGC clip succeeded')
  assert.deepEqual([...state.values()].map(i => q.queueState(i)), ['uploaded', 'failed', 'duplicate', 'uploaded', 'attention', 'attention'])
  const failed = state.get('k1')
  assert.match(failed.error, /uploaded \(media\/brand-logos\/flyer-two-/, 'the orphan object path is reported')
  assert.match(failed.storedPath, /^media\/brand-logos\//)
  assert.equal(db.stored.length, 2, 'two images stored (one still unregistered); nothing deleted')
  assert.equal(tus.metadata.bucketName, 'site-media'); assert.equal(state.get('k3').progress, 1)
  // Retry registers the stored file without sending it again.
  const retried = await q.runQueue(db, ['k1'], k => state.get(k), update, up)
  assert.equal(retried.length, 1); assert.equal(db.stored.length, 2, 'not uploaded a second time'); assert.equal(retried[0].object_path, failed.storedPath)
  assert.equal(retried[0].caption, 'Per file', 'per-file metadata is kept')
  // A storage failure leaves no stored path and can simply be retried.
  const flaky = fakeDb({ failStorage: ['logo-one-copy'] })
  update('k2', { allowDuplicate: true })
  await q.runQueue(flaky, ['k2'], k => state.get(k), update, up)
  assert.equal(state.get('k2').phase, 'failed'); assert.equal(state.get('k2').storedPath, ''); assert.equal(flaky.inserted.length, 0)
  // Background video with a poster uploads.
  update('k4', { poster: POSTER }); const bg = await q.runQueue(db, ['k4'], k => state.get(k), update, up)
  assert.equal(bg[0].poster_asset_id, POSTER.id); assert.equal(bg[0].category, 'bgc_video')

  // ── Cancel ──
  update('k3', { phase: 'idle', storedPath: '', asset: null })
  let handle, abort = 0
  const pending = q.runQueue(db, ['k3'], k => state.get(k), update, { token: up.token, video: { createUpload: (file, options) => ({ start() { handle.options = options }, abort() { abort += 1; handle.options.onError(new Error('aborted')) } }) }, onHandle: h => { if (h) handle = h } })
  await new Promise(r => setTimeout(r, 20))
  update('k3', { phase: 'cancelled' }); handle.cancel()
  assert.equal((await pending).length, 0); assert.equal(state.get('k3').phase, 'cancelled'); assert.equal(abort, 1)
  // A file cancelled while waiting is skipped.
  update('k0', { phase: 'cancelled' }); assert.equal((await q.runQueue(db, ['k0'], k => state.get(k), update, up)).length, 0)

  // ── Component wiring: per-file edit, safe batch trim, use existing, retry, limits ──
  const ui = read('src/components/admin/media/BulkUploader.tsx')
  assert.match(ui, /type="file" multiple/); assert.match(ui, /onDrop=/)
  assert.match(ui, /<MediaImageEditor key=\{edited\.key\}/, 'crop / trim is per file')
  assert.match(ui, /Auto-trim transparent space for eligible files/); assert.match(ui, /transparentTrim/)
  assert.ok(!/backgroundTrim/.test(ui), 'the batch action never trims solid or white backgrounds')
  assert.match(ui, /item\.prepared\?\.mime !== 'image\/jpeg'/); assert.match(ui, /Use original/, 'a trim can be undone before upload')
  assert.match(ui, /await replaceFile\(item, new File/, 'edited files are validated and hashed again')
  assert.match(ui, /Use existing asset/); assert.match(ui, /Upload anyway/); assert.match(ui, /BULK_MAX_FILES/)
  assert.match(ui, /preparing\.current = preparing\.current\.then/, 'files are read one at a time')
  assert.match(ui, /state === 'uploading' && item\.kind === 'video'/, 'only a transfer that can really be interrupted offers Cancel')
  assert.ok(!/\.delete\(|\.remove\(/.test(ui.replace(/urls\.current\.\w+\(/g, '')) , 'no delete')
  console.log('PASS: bulk upload - limits, mixed validation, defaults and overrides, duplicates, partial failure, registration retry, cancel, per-file edit and safe batch trim')
})().catch(error => { console.error(error); process.exit(1) })
