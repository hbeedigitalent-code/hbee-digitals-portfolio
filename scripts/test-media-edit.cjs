// Offline checks for the Media Library trim / crop workflow. Uses real PNG bytes generated with sharp (a dev dependency).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const sharp = require('sharp')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const cache = new Map()
function load(file) {
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }; cache.set(file, mod)
  const code = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const req = name => name.startsWith('./') ? load('src/lib/media/' + name.slice(2) + '.ts') : require(name)
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require: req, TextDecoder, Uint8Array, crypto: require('node:crypto').webcrypto, console }, { filename: file })
  return mod.exports
}
const edit = load('src/lib/media/media-edit.ts')
const prepare = load('src/lib/media/media-prepare.ts')
const validation = load('src/lib/media/media-validation.ts')

async function rgba(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
  return { data, width: info.width, height: info.height }
}
const fileOf = (buffer, name, type) => ({ name, type, size: buffer.length, slice: (a, b) => ({ arrayBuffer: async () => buffer.subarray(a, b).buffer.slice(buffer.byteOffset + a, buffer.byteOffset + Math.min(b, buffer.length)) }), arrayBuffer: async () => buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.length) })

;(async () => {
  // ── Auto-trim: a transparent PNG with a mark in the middle ──
  const mark = await sharp({ create: { width: 40, height: 20, channels: 4, background: { r: 10, g: 60, b: 200, alpha: 1 } } }).png().toBuffer()
  const padded = await sharp({ create: { width: 200, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: mark, left: 70, top: 50 }]).png().toBuffer()
  const px = await rgba(padded)
  assert.equal(edit.hasTransparency(px.data, px.width, px.height), true)
  const bounds = edit.findOpaqueBounds(px.data, px.width, px.height)
  assert.deepEqual({ ...bounds }, { left: 70, top: 50, width: 40, height: 20 }, 'exact opaque bounds')
  const padded2 = edit.addBreathingRoom(bounds, px.width, px.height)
  assert.equal(padded2.left, 69); assert.equal(padded2.top, 49); assert.equal(padded2.width, 42); assert.equal(padded2.height, 22, '~2% (min 1px) breathing room')
  assert.ok(padded2.width < px.width && padded2.height < px.height, 'never grows past the image')
  assert.equal(edit.findOpaqueBounds(new Uint8Array(4 * 4 * 4), 4, 4), null, 'fully transparent image has nothing to trim')
  assert.ok(edit.coversImage({ left: 0, top: 0, width: 200, height: 120 }, 200, 120))
  const nearEdge = edit.addBreathingRoom({ left: 0, top: 0, width: 100, height: 100 }, 100, 100)
  assert.deepEqual({ ...nearEdge }, { left: 0, top: 0, width: 100, height: 100 }, 'clamped to the image')

  // ── Opaque white-background logos are NEVER trimmed automatically; the option is conservative and opt-in ──
  const white = await sharp({ create: { width: 200, height: 120, channels: 3, background: '#ffffff' } })
    .composite([{ input: await sharp({ create: { width: 60, height: 30, channels: 3, background: '#112233' } }).png().toBuffer(), left: 20, top: 10 }]).png().toBuffer()
  const wpx = await rgba(white)
  assert.equal(edit.hasTransparency(wpx.data, wpx.width, wpx.height), false)
  assert.equal(edit.findOpaqueBounds(wpx.data, wpx.width, wpx.height).width, 200, 'an opaque image has no transparent margin to find')
  const bg = edit.detectUniformBackground(wpx.data, wpx.width, wpx.height)
  assert.deepEqual({ ...bg }, { r: 255, g: 255, b: 255 })
  assert.deepEqual({ ...edit.findBackgroundBounds(wpx.data, wpx.width, wpx.height, bg) }, { left: 20, top: 10, width: 60, height: 30 })
  // A white detail inside a coloured mark does not shrink the proposal below the mark.
  const ring = await sharp({ create: { width: 200, height: 120, channels: 3, background: '#ffffff' } })
    .composite([{ input: await sharp({ create: { width: 80, height: 80, channels: 3, background: '#cc2200' } }).composite([{ input: await sharp({ create: { width: 40, height: 40, channels: 3, background: '#ffffff' } }).png().toBuffer(), left: 20, top: 20 }]).png().toBuffer(), left: 60, top: 20 }]).png().toBuffer()
  const rpx = await rgba(ring)
  assert.deepEqual({ ...edit.findBackgroundBounds(rpx.data, rpx.width, rpx.height, edit.detectUniformBackground(rpx.data, rpx.width, rpx.height)) }, { left: 60, top: 20, width: 80, height: 80 }, 'inner white detail is kept')
  // Not uniform corners (photo / gradient / mixed) or transparent corners: no solid-background option at all.
  const gradient = Buffer.alloc(40 * 40 * 4, 255); for (let y = 0; y < 40; y += 1) for (let x = 0; x < 40; x += 1) { const i = (y * 40 + x) * 4; gradient[i] = x * 6; gradient[i + 1] = y * 6; gradient[i + 2] = 90 }
  assert.equal(edit.detectUniformBackground(gradient, 40, 40), null)
  assert.equal(edit.detectUniformBackground(px.data, px.width, px.height), null, 'transparent corners are handled by auto-trim, not solid-trim')

  // ── Large images: analysis maps back to full resolution; output is only ever downscaled ──
  assert.deepEqual({ ...edit.mapRectToSource({ left: 10, top: 10, width: 20, height: 20 }, 0.5, 1000, 1000) }, { left: 18, top: 18, width: 44, height: 44 })
  assert.equal(edit.outputScale(1000, 1000), 1); assert.ok(edit.outputScale(10000, 10000) < 1); assert.ok(edit.outputScale(10000, 10000) * 10000 * edit.outputScale(10000, 10000) * 10000 <= edit.MAX_OUTPUT_PIXELS + 1)
  assert.ok(edit.SCAN_MAX_SIDE <= 4096)
  assert.deepEqual({ ...edit.clampRect({ left: -5, top: 3.4, width: 9999, height: 0 }, 100, 50) }, { left: 0, top: 3, width: 100, height: 1 }, 'crop is clamped inside the image, minimum 1 × 1')

  // ── Cropped output is a real, valid file that passes the EXISTING validation, with a fresh checksum ──
  const cropped = await sharp(padded).extract({ left: padded2.left, top: padded2.top, width: padded2.width, height: padded2.height }).png().toBuffer()
  assert.equal(edit.editedMime('image/webp'), 'image/png'); assert.equal(edit.editedMime('image/avif'), 'image/png'); assert.equal(edit.editedMime('image/png'), 'image/png'); assert.equal(edit.editedMime('image/jpeg'), 'image/jpeg')
  assert.equal(edit.editedFileName('Acme Logo.webp', 'image/png'), 'Acme Logo-edited.png'); assert.equal(edit.editedFileName('a/b/mark-edited.png', 'image/png'), 'mark-edited.png'); assert.equal(edit.editedFileName('x.png', 'image/jpeg'), 'x-edited.jpg')
  const meta = await sharp(cropped).metadata()
  const edited = fileOf(cropped, edit.editedFileName('logo.png', 'image/png'), 'image/png')
  const prepared = await prepare.prepareImageFile(edited, { readDimensions: async () => ({ width: meta.width, height: meta.height }) })
  assert.equal(prepared.mime, 'image/png'); assert.equal(prepared.width, 42); assert.equal(prepared.height, 22)
  const original = await prepare.prepareImageFile(fileOf(padded, 'logo.png', 'image/png'), { readDimensions: async () => ({ width: 200, height: 120 }) })
  assert.match(prepared.checksum, /^[0-9a-f]{64}$/); assert.notEqual(prepared.checksum, original.checksum, 'checksum is recalculated on the edited bytes')
  const jpegOut = await sharp(padded).flatten({ background: '#fff' }).jpeg().toBuffer()
  assert.equal((await prepare.prepareImageFile(fileOf(jpegOut, 'a-edited.jpg', 'image/jpeg'), { readDimensions: async () => ({ width: 1, height: 1 }) })).mime, 'image/jpeg')
  // Validation is unchanged: SVG / markup and mismatched bytes are still rejected, edited or not.
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>')
  await assert.rejects(prepare.prepareImageFile(fileOf(svg, 'logo-edited.png', 'image/png'), { readDimensions: async () => ({ width: 1, height: 1 }) }), /SVG|markup/)
  await assert.rejects(prepare.prepareImageFile(fileOf(svg, 'logo.svg', 'image/svg+xml'), { readDimensions: async () => ({ width: 1, height: 1 }) }), /SVG|markup/)
  await assert.rejects(prepare.prepareImageFile(fileOf(cropped, 'x.png', 'image/jpeg'), { readDimensions: async () => ({ width: 1, height: 1 }) }), /contents are/)
  assert.ok(!('image/svg+xml' in validation.MEDIA_IMAGE_TYPES), 'SVG is still not an accepted type')

  // ── Wiring ──
  const uploader = read('src/components/admin/media/MediaUploader.tsx')
  assert.match(uploader, /async function load\(next: File, source: 'picked' \| 'edited' \| 'restored'\)[\s\S]*?await prepareImageFile\(next\)/, 'every file, picked or edited, goes through prepareImageFile')
  assert.match(uploader, /findAssetsByChecksum\(supabase, result\.checksum\)/, 'duplicate check uses the edited file checksum')
  assert.match(uploader, /onApply=\{\(edited\) => void load\(edited, 'edited'\)\}/)
  assert.match(uploader, /dynamic\(\(\) => import\('\.\/MediaImageEditor'\)/, 'the crop library loads only when the editor is opened')
  assert.match(uploader, /Trim or crop/); assert.match(uploader, /Use original/)
  assert.match(uploader, /uploadImageAsset\(supabase, \{\s*file,/, 'upload still goes through the existing asset registration')
  const editor = read('src/components/admin/media/MediaImageEditor.tsx')
  assert.match(editor, /from 'react-image-crop'/); assert.doesNotMatch(editor, /aspect=/, 'free aspect ratio: no forced square / landscape / portrait')
  for (const label of ['Reset', 'Apply', 'Cancel', 'Auto-trim transparent edges']) assert.ok(editor.includes(label), label)
  const editorCode = editor.replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(editorCode, /filter|brightness|contrast|rotate|fillText/i, 'no filters, colour edits, rotation or text')
  assert.doesNotMatch(editorCode, /supabase|\.storage|uploadImageAsset/, 'the editor never uploads')
  for (const file of ['src/components/admin/media/MediaImageEditor.tsx', 'src/components/admin/media/MediaUploader.tsx', 'src/lib/media/media-edit.ts'])
    assert.ok(!/\.delete\(|\.remove\(|removeBucket|emptyBucket/.test(read(file)), file + ' introduces no storage deletion')
  assert.match(read('src/components/admin/media/MediaPicker.tsx'), /<MediaUploader /, 'MediaPicker (and so Trusted Brands) still uses the one uploader')
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.dependencies['react-image-crop'], '11.1.2')
  console.log('PASS: media trim/crop - transparent auto-trim, conservative opt-in solid trim, valid cropped output re-validated with a new checksum, SVG still rejected')
})().catch(error => { console.error(error); process.exit(1) })
