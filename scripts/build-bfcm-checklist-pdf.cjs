// Builds public/downloads/Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf
// deterministically from the SAME checklist content the web page uses
// (src/components/site/bfcm-checklist/checklist-content.ts), so the PDF and the
// page cannot drift apart. Re-run after changing that content:
//
//   node scripts/build-bfcm-checklist-pdf.cjs
//
// Uses pdf-lib (already a dependency) with the standard Helvetica fonts and the
// approved lockup from public/brand. Fixed metadata dates keep the output stable.

const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const vm = require('node:vm')
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib')

const root = path.resolve(__dirname, '..')
const OUT = path.join(root, 'public/downloads/Hbee-Digitals-15-Point-BFCM-Readiness-Checklist.pdf')

function loadContent() {
  const file = path.join(root, 'src/components/site/bfcm-checklist/checklist-content.ts')
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(code, { module: mod, exports: mod.exports, require, console })
  return mod.exports
}

const hex = (h) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)
const BLUE = hex('#0642b3')
const DEEP = hex('#07338f')
const ORANGE = hex('#fc5d1c')
const INK = hex('#0b1426')
const SLATE = hex('#475569')
const MIST = hex('#eaf2ff')
const BORDER = hex('#cddcf3')
const WHITE = rgb(1, 1, 1)

const W = 595.28
const H = 841.89
const M = 48

function wrap(text, font, size, maxWidth) {
  const words = text.split(' ')
  const lines = []
  let line = ''
  for (const word of words) {
    const next = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(next, size) <= maxWidth) line = next
    else {
      if (line) lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

async function main() {
  const content = loadContent()
  const doc = await PDFDocument.create()
  const fixed = new Date('2026-11-21T00:00:00Z')
  doc.setTitle('15-Point BFCM Readiness Checklist — Hbee Digitals')
  doc.setAuthor('Hbee Digitals')
  doc.setSubject('Free checklist: is your store ready for Black Friday traffic?')
  doc.setCreator('Hbee Digitals')
  doc.setProducer('Hbee Digitals')
  doc.setCreationDate(fixed)
  doc.setModificationDate(fixed)

  const bold = await doc.embedFont(StandardFonts.HelveticaBold)
  const regular = await doc.embedFont(StandardFonts.Helvetica)
  const logo = await doc.embedPng(fs.readFileSync(path.join(root, 'public/brand/hbee-digitals-logo-lockup.png')))

  const pages = []
  function newPage() {
    const page = doc.addPage([W, H])
    pages.push(page)
    // top brand band
    page.drawRectangle({ x: 0, y: H - 6, width: W, height: 6, color: BLUE })
    page.drawRectangle({ x: 0, y: H - 6, width: 70, height: 6, color: ORANGE })
    const lh = 34
    page.drawImage(logo, { x: M, y: H - 22 - lh, width: lh * (2172 / 724), height: lh })
    page.drawText('hbeedigitals.com', { x: W - M - regular.widthOfTextAtSize('hbeedigitals.com', 9), y: H - 40, size: 9, font: regular, color: SLATE })
    return page
  }

  /* ── Page 1: title + intro + first three groups ── */
  let page = newPage()
  let y = H - 22 - 34 - 34

  page.drawRectangle({ x: M, y: y + 3, width: 14, height: 6, color: ORANGE })
  page.drawText(content.CL_HERO.eyebrow, { x: M + 22, y, size: 8.5, font: bold, color: SLATE })
  y -= 30
  page.drawText(content.CL_HERO.headline, { x: M, y, size: 25, font: bold, color: INK })
  y -= 30
  page.drawText(content.CL_HERO.headlineAccent, { x: M, y, size: 25, font: bold, color: BLUE })
  y -= 26
  for (const line of wrap(content.CL_HERO.lede + ' Open your store on your phone and tick each check as you confirm it.', regular, 11, W - 2 * M)) {
    page.drawText(line, { x: M, y, size: 11, font: regular, color: SLATE })
    y -= 15
  }
  y -= 10

  const itemWidth = W - 2 * M - 26

  function groupHeader(group, index) {
    page.drawRectangle({ x: M, y: y - 6, width: 22, height: 22, color: BLUE })
    const n = String(index + 1)
    page.drawText(n, { x: M + 11 - bold.widthOfTextAtSize(n, 11) / 2, y: y + 1, size: 11, font: bold, color: WHITE })
    page.drawText(group.name, { x: M + 32, y: y + 1, size: 13.5, font: bold, color: INK })
    y -= 22
  }

  function item(it) {
    const qLines = wrap(it.question, regular, 9.5, itemWidth)
    const height = 17 + qLines.length * 12.5 + 10
    // checkbox
    page.drawRectangle({ x: M, y: y - 11, width: 12, height: 12, borderColor: BLUE, borderWidth: 1.4, color: WHITE })
    page.drawText(it.number, { x: M + 26, y: y - 8, size: 8.5, font: bold, color: BLUE })
    page.drawText(it.title, { x: M + 26 + 18, y: y - 9, size: 11, font: bold, color: INK })
    let qy = y - 23
    for (const l of qLines) {
      page.drawText(l, { x: M + 26, y: qy, size: 9.5, font: regular, color: SLATE })
      qy -= 12.5
    }
    page.drawLine({ start: { x: M + 26, y: y - height + 6 }, end: { x: W - M, y: y - height + 6 }, thickness: 0.5, color: BORDER })
    y -= height
  }

  content.CHECKLIST_GROUPS.forEach((group, gi) => {
    // keep a group together: start a new page when it will not fit
    const need = 26 + group.items.length * 52
    if (y - need < 70) {
      page = newPage()
      y = H - 22 - 34 - 30
    }
    groupHeader(group, gi)
    for (const it of group.items) item(it)
    y -= 16
  })

  /* ── Growth Review panel (end of the last page) ── */
  const panelH = 118
  if (y - panelH < 60) {
    page = newPage()
    y = H - 22 - 34 - 30
  }
  const top = y - 4
  page.drawRectangle({ x: M, y: top - panelH, width: W - 2 * M, height: panelH, color: BLUE })
  page.drawRectangle({ x: M, y: top - panelH, width: 5, height: panelH, color: ORANGE })
  page.drawText(content.CL_FINAL.title, { x: M + 22, y: top - 28, size: 14.5, font: bold, color: WHITE })
  let py = top - 47
  for (const line of wrap(content.CL_FINAL.copy, regular, 10.5, W - 2 * M - 44)) {
    page.drawText(line, { x: M + 22, y: py, size: 10.5, font: regular, color: rgb(0.86, 0.91, 1) })
    py -= 14
  }
  const label = 'hbeedigitals.com/growth-review'
  const bw = bold.widthOfTextAtSize(label, 11) + 34
  page.drawRectangle({ x: M + 22, y: top - panelH + 16, width: bw, height: 26, color: ORANGE })
  page.drawText(label, { x: M + 22 + 17, y: top - panelH + 25, size: 11, font: bold, color: INK })
  page.drawText('Free. No account needed. No obligation.', { x: M + 22 + bw + 14, y: top - panelH + 25, size: 9.5, font: regular, color: rgb(0.86, 0.91, 1) })

  /* ── Footers ── */
  pages.forEach((p, i) => {
    p.drawLine({ start: { x: M, y: 40 }, end: { x: W - M, y: 40 }, thickness: 0.5, color: BORDER })
    p.drawText('Hbee Digitals — Connected growth in motion', { x: M, y: 26, size: 8, font: regular, color: SLATE })
    const t = `Page ${i + 1} of ${pages.length}`
    p.drawText(t, { x: W - M - regular.widthOfTextAtSize(t, 8), y: 26, size: 8, font: regular, color: SLATE })
  })

  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, await doc.save({ useObjectStreams: false }))
  console.log(`wrote ${path.relative(root, OUT)} — ${pages.length} page(s), ${fs.statSync(OUT).size} bytes`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
