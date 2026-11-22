// Builds the static Hbee social-preview image: public/og/hbee-og-default.jpg (1200 × 630 JPEG).
//
//   node scripts/build-og-default.cjs                 write public/og/hbee-og-default.jpg
//   node scripts/build-og-default.cjs --sample "Title" [out.png]   render a sample title card (to inspect the generated-card design)
//
// It uses the SAME renderer as the generated article / project cards (src/lib/site/og-card.tsx) through Next's own `next/og`, so the
// default and the cards are one visual family. Brand inputs are the repository's approved assets only (see og-card.tsx). The PNG that
// ImageResponse produces is re-encoded with sharp (already a project dependency) to a small baseline (non-progressive) JPEG: link previews in
// WhatsApp and others reliably show images that are small and plainly encoded.
//
// Re-run it only when the design or its assets change, then commit the regenerated file.
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const sharp = require('sharp')

const root = path.resolve(__dirname, '..')
process.chdir(root)

// WINDOWS-ONLY WORKAROUND (local tool only; production runs on Linux and is unaffected). Next 14's compiled `next/og` locates its bundled
// font and wasm files with path.join(import.meta.url, '../file'). On Windows, path.join turns the `file:///c:/...` URL into `file:\c:\...`
// and the render fails with ERR_INVALID_URL. Joining `file:` URLs with POSIX rules, before next/og loads, avoids that.
const nodePath = require('node:path')
const nativeJoin = nodePath.join
nodePath.join = (...parts) => (typeof parts[0] === 'string' && parts[0].startsWith('file:') ? nodePath.posix.join(...parts) : nativeJoin(...parts))

const cache = new Map()
function load(relative) {
  const file = path.resolve(root, relative)
  if (cache.has(file)) return cache.get(file).exports
  const mod = { exports: {} }
  cache.set(file, mod)
  const requireFn = (name) => {
    if (name.startsWith('@/')) {
      const base = 'src/' + name.slice(2)
      for (const ext of ['.ts', '.tsx']) if (fs.existsSync(path.join(root, base + ext))) return load(base + ext)
      throw new Error('cannot resolve ' + name)
    }
    return require(name)
  }
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  new Function('require', 'module', 'exports', js)(requireFn, mod, mod.exports)
  return mod.exports
}

async function png(element, assets) {
  const { ImageResponse } = require('next/og')
  const res = new ImageResponse(element, { width: 1200, height: 630, fonts: assets.fonts })
  return Buffer.from(await res.arrayBuffer())
}

;(async () => {
  const card = load('src/lib/site/og-card.tsx')
  const assets = await card.loadOgAssets()
  const sample = process.argv.indexOf('--sample')
  if (sample !== -1) {
    const title = process.argv[sample + 1] || 'Seven product page questions to answer before Black Friday'
    const out = process.argv[sample + 2] || path.join(root, 'sample-card.png')
    const buf = await png(card.renderTitleCard(assets, { kicker: 'Insights', title }), assets)
    fs.writeFileSync(out, buf)
    const m = await sharp(buf).metadata()
    console.log('sample', out, m.width + 'x' + m.height, m.format, Math.round(buf.length / 1024) + 'KB')
    return
  }
  const raw = await png(card.renderDefaultCard(assets), assets)
  const out = path.join(root, 'public/og/hbee-og-default.jpg')
  fs.mkdirSync(path.dirname(out), { recursive: true })
  // Plain baseline JPEG: deliberately NOT mozjpeg, which forces progressive scans whatever `progressive` says.
  const jpg = await sharp(raw).flatten({ background: '#f7f9fc' }).jpeg({ quality: 84, progressive: false, chromaSubsampling: '4:2:0', optimiseCoding: true }).toBuffer()
  fs.writeFileSync(out, jpg)
  const m = await sharp(jpg).metadata()
  console.log('wrote', path.relative(root, out), m.width + 'x' + m.height, m.format, Math.round(jpg.length / 1024) + 'KB')
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
