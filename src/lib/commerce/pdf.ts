// src/lib/commerce/pdf.ts
//
// SERVER-ONLY. Proposal and invoice PDFs, generated on demand with pdf-lib from AUTHORITATIVE, IMMUTABLE records (a proposal
// VERSION snapshot, an issued invoice's own rows). Nothing is rendered from a browser, nothing is screenshotted, nothing is
// stored: no bucket, no persisted copy, no permanent URL. The functions below take plain values; the routes that call them
// load the values themselves, after authorization, and pass ONLY the fields allowed in a document. There is deliberately
// no parameter for internal notes, admin identity, change-request text or any secret, so none can be printed by accident.
//
// HBEE COMMERCIAL DOCUMENT SYSTEM (template v2). One set of primitives (the Writer class below) carries the Hbee identity for
// every commercial document: the brand header with the canonical logo, continuation headers, section headings, the metadata
// panel, the branded line-item table (header repeated across pages), the money summary, callouts and the footer with
// "Page X of Y". Proposals and invoices differ only in what they place on that system. Colours are the website's own tokens
// (globals.css): accent blue #2563EB, navy #0B1220, CTA orange #EA580C, blue-50 #EFF6FF, orange-50 #FFF3EA.
//
// Money is NEVER computed here. Every amount printed is a value the caller passes in (from the version snapshot / issued
// invoice rows) and is only formatted.
//
// Logo: the owner-approved full lockup public/brand/hbee-digitals-logo-lockup.png (mark + wordmark + "Digital Growth Studio"), embedded
// as base64 (pdf-logo.ts), never fetched at runtime. It is the ONLY brand identity in the header: no icon, wordmark or tagline is
// drawn or typeset beside it, and it is placed at its native aspect ratio, unaltered.
// Fonts: the built-in Helvetica faces (WinAnsi). That keeps the file small and needs no font file on the server, at the
// price of a restricted character set (and no Manrope / Inter) — sanitizePdfText() maps anything the font cannot encode to "?"
// so unusual client text can never make generation throw. Amounts are printed with their ISO code (NGN 1,250.00).

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib'
import { formatMoney } from '@/lib/commerce/money'
import { HBEE_LOGO_PNG_BASE64, HBEE_LOGO_WIDTH, HBEE_LOGO_HEIGHT } from '@/lib/commerce/pdf-logo'

if (typeof window !== 'undefined') {
  throw new Error('pdf.ts is server-only and must not be imported by client code')
}

type Color = ReturnType<typeof rgb>
const hex = (h: string): Color => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255)

const NAVY = hex('#0B1220')
const BLUE = hex('#2563EB')
const BLUE_DEEP = hex('#1D4ED8')
const BLUE_50 = hex('#EFF6FF')
const BLUE_100 = hex('#DBEAFE')
const ORANGE = hex('#EA580C')
const ORANGE_DEEP = hex('#C2410C')
const ORANGE_50 = hex('#FFF3EA')
const GREY = hex('#5B6472')
const RULE = hex('#D5DBE5')
const WHITE = rgb(1, 1, 1)

const W = 595.28
const H = 841.89
const MARGIN = 48
const CONTENT_W = W - MARGIN * 2
const FOOTER_RULE_Y = 52 // the footer's rule; the footer text sits under it (see finish())
const FOOTER_CLEARANCE = 20 // clear space kept between the last line of content and the footer rule
const BOTTOM = FOOTER_RULE_Y + FOOTER_CLEARANCE // content never goes below this
const HEADING_HEIGHT = 12 + 19 + 9 // space above + heading line + rule and space below (see heading())
const SITE_HOST = 'hbeedigitals.com'
// The lockup file carries its own clear space. Measured ink bounds, as a fraction of the file: the VISIBLE artwork starts 5.16% in from the
// left and spans 19.89% .. 81.49% of the height. Placement uses them only to line the artwork up with the page margin and with the
// right-hand block; the image itself is never cropped, recoloured or stretched (width and height always scale together).
const LOGO_INK = { left: 0.0516, top: 0.1989, bottom: 0.1851 }
const LOGO_RATIO = HBEE_LOGO_HEIGHT / HBEE_LOGO_WIDTH
const LOGO_W_FIRST = 230 // page one: prominent; the tagline stays legible
const LOGO_W_CONT = 160 // continuation pages: lighter, tagline still legible
export const PDF_TEMPLATE_VERSION = 'v2'
export const PROPOSAL_NEXT_STEPS =
  'Review this proposal and approve it through your Hbee Digitals Client Portal. Once approved, your project workspace will be created and onboarding can begin.'

const WINANSI_EXTRA = new Set([0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178])

/** Replace everything the Helvetica / WinAnsi font cannot encode; normalise line breaks and tabs. */
export function sanitizePdfText(input: unknown): string {
  const s = typeof input === 'string' ? input : input == null ? '' : String(input)
  let out = ''
  for (const ch of s.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')) {
    const c = ch.codePointAt(0) as number
    if (ch === '\n' || (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WINANSI_EXTRA.has(c)) out += ch
    else out += '?'
  }
  return out
}

function formatDate(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—'
  const d = new Date(value.length === 10 ? value + 'T12:00:00Z' : value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-GB', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', year: 'numeric' })
}

export interface DocumentIdentity {
  /** PROPOSAL / INVOICE */
  label: string
  number: string
  /** e.g. "Version 2" — a quiet line under the number */
  sub?: string | null
  /** a status pill under the number (omitted when null) */
  status?: { text: string; tone: 'blue' | 'orange' } | null
}

export interface MetaCell { label: string; value: string }
export type SummaryRow = { label: string; value: string; tone?: 'quiet' | 'normal' | 'bold' | 'strong' }

class Writer {
  pdf!: PDFDocument
  regular!: PDFFont
  bold!: PDFFont
  logo!: PDFImage
  pages: PDFPage[] = []
  page!: PDFPage
  y = 0
  constructor(private ident: DocumentIdentity) {}

  static async create(ident: DocumentIdentity): Promise<Writer> {
    const w = new Writer(ident)
    w.pdf = await PDFDocument.create()
    w.pdf.setTitle(sanitizePdfText(`${ident.label} ${ident.number}`))
    w.pdf.setAuthor('Hbee Digitals')
    w.pdf.setProducer('Hbee Digitals')
    w.pdf.setCreator('Hbee Digitals')
    w.pdf.setSubject(sanitizePdfText(`${ident.label} ${ident.number}`))
    w.regular = await w.pdf.embedFont(StandardFonts.Helvetica)
    w.bold = await w.pdf.embedFont(StandardFonts.HelveticaBold)
    // decoded here (not in pdf-logo.ts) so the bytes are a plain Uint8Array of this realm
    w.logo = await w.pdf.embedPng(new Uint8Array(Buffer.from(HBEE_LOGO_PNG_BASE64, 'base64')))
    w.addPage(true)
    return w
  }

  // ── primitives ────────────────────────────────────────────────────────────
  text(s: string, x: number, y: number, size: number, font: PDFFont, color: Color) {
    const t = sanitizePdfText(s).replace(/\n/g, ' ')
    if (t) this.page.drawText(t, { x, y, size, font, color })
  }
  textRight(s: string, xRight: number, y: number, size: number, font: PDFFont, color: Color) {
    const t = sanitizePdfText(s).replace(/\n/g, ' ')
    if (t) this.page.drawText(t, { x: xRight - font.widthOfTextAtSize(t, size), y, size, font, color })
  }
  rect(x: number, y: number, width: number, height: number, color: Color) {
    this.page.drawRectangle({ x, y, width, height, color })
  }
  hrule(y: number, color: Color = RULE, thickness = 0.6, x1 = MARGIN, x2 = W - MARGIN) {
    this.page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness, color })
  }
  /** the Hbee "module" motif: a blue block and an orange block, echoing the mark */
  modules(x: number, y: number, unit: number) {
    this.rect(x, y, unit, unit, BLUE)
    this.rect(x + unit + 2, y, unit, unit, ORANGE)
  }
  pill(text: string, xRight: number, yBottom: number, tone: 'blue' | 'orange') {
    const t = sanitizePdfText(text.toUpperCase())
    const size = 7.5
    const w = this.bold.widthOfTextAtSize(t, size) + 16
    this.rect(xRight - w, yBottom, w, 15, tone === 'orange' ? ORANGE_50 : BLUE_50)
    this.rect(xRight - w, yBottom, 2.5, 15, tone === 'orange' ? ORANGE : BLUE)
    this.text(t, xRight - w + 9, yBottom + 4.6, size, this.bold, tone === 'orange' ? ORANGE_DEEP : BLUE_DEEP)
  }

  // ── header (page one) and continuation header ────────────────────────────
  addPage(first = false) {
    this.page = this.pdf.addPage([W, H])
    this.pages.push(this.page)
    this.rect(0, H - 6, W, 6, BLUE)
    this.rect(MARGIN, H - 6, 44, 6, ORANGE)
    if (first) {
      const lw = LOGO_W_FIRST, lh = lw * LOGO_RATIO
      const top = H - 14 // image top edge, just under the colour band
      // x is shifted left by the file's own left clear space so the VISIBLE artwork sits on the page margin
      this.page.drawImage(this.logo, { x: MARGIN - lw * LOGO_INK.left, y: top - lh, width: lw, height: lh })
      const mid = top - lh * ((LOGO_INK.top + (1 - LOGO_INK.bottom)) / 2) // vertical centre of the visible artwork
      this.textRight(this.ident.label.toUpperCase(), W - MARGIN, mid + 8, 20, this.bold, BLUE)
      this.textRight(this.ident.number, W - MARGIN, mid - 8, 10.5, this.bold, NAVY)
      if (this.ident.sub) this.textRight(this.ident.sub, W - MARGIN, mid - 21, 9, this.regular, GREY)
      const pillY = this.ident.sub ? mid - 43 : mid - 30
      if (this.ident.status) this.pill(this.ident.status.text, W - MARGIN, pillY, this.ident.status.tone)
      // the rule sits under the lowest thing in the header: the lockup artwork or the status pill
      const ruleY = Math.min(top - lh * (1 - LOGO_INK.bottom) - 14, this.ident.status ? pillY - 10 : Infinity)
      this.hrule(ruleY, BLUE_100, 1)
      this.y = ruleY - 20
    } else {
      const lw = LOGO_W_CONT, lh = lw * LOGO_RATIO
      const top = H - 12
      this.page.drawImage(this.logo, { x: MARGIN - lw * LOGO_INK.left, y: top - lh, width: lw, height: lh })
      const mid = top - lh * ((LOGO_INK.top + (1 - LOGO_INK.bottom)) / 2)
      this.textRight(`${this.ident.label} ${this.ident.number}`, W - MARGIN, mid - 3, 9, this.regular, GREY)
      this.hrule(top - lh * (1 - LOGO_INK.bottom) - 10, BLUE_100, 1)
      this.y = top - lh * (1 - LOGO_INK.bottom) - 28
    }
  }

  /** Moves to a new page when `space` does not fit; returns true when it did. */
  ensure(space: number): boolean {
    if (this.y - space < BOTTOM) { this.addPage(); return true }
    return false
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
    const lines: string[] = []
    for (const para of sanitizePdfText(text).split('\n')) {
      if (para.trim() === '') { lines.push(''); continue }
      let line = ''
      for (const word of para.split(/\s+/).filter(Boolean)) {
        let w = word
        // a single token wider than the column is broken by character
        while (font.widthOfTextAtSize(w, size) > maxWidth) {
          // binary search for the longest prefix that fits (linear search is quadratic on a very long unbroken token)
          let lo = 1, hi = w.length - 1
          while (lo < hi) {
            const mid = (lo + hi + 1) >> 1
            if (font.widthOfTextAtSize(w.slice(0, mid), size) <= maxWidth) lo = mid
            else hi = mid - 1
          }
          const cut = lo
          if (line) { lines.push(line); line = '' }
          lines.push(w.slice(0, cut))
          w = w.slice(cut)
        }
        const candidate = line ? line + ' ' + w : w
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate
        else { lines.push(line); line = w }
      }
      lines.push(line)
    }
    return lines
  }

  paragraph(text: string, opts: { size?: number; bold?: boolean; color?: Color; x?: number; width?: number; gap?: number; lead?: number } = {}) {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.regular
    const x = opts.x ?? MARGIN
    const lead = opts.lead ?? 1.45
    for (const l of this.wrap(text, font, size, opts.width ?? CONTENT_W)) {
      // a line needs its own glyph box (ascent + descender), not the leading that follows it: the last line of a section may sit
      // right above the safe bottom margin, and a short final section is not pushed onto a new page for a few points of line spacing
      this.ensure(size * 1.25)
      if (l) this.page.drawText(l, { x, y: this.y - size, size, font, color: opts.color ?? NAVY })
      this.y -= size * lead
    }
    this.y -= opts.gap ?? 0
  }

  /** The document title block (proposal title): large navy type. */
  title(text: string) {
    this.paragraph(text, { size: 20, bold: true, lead: 1.22, gap: 10 })
  }

  /**
   * Section heading: a small orange module, a blue heading, a quiet rule. Kept with the first line of what follows: the space it
   * reserves is the heading's own height plus `firstBlock` (default: one line of body text), so a heading is never stranded at the
   * foot of a page, and a short section that genuinely fits above the footer stays on the current page.
   */
  heading(text: string, firstBlock = 13) {
    this.ensure(HEADING_HEIGHT + firstBlock)
    this.y -= 12
    this.rect(MARGIN, this.y - 10, 6, 6, ORANGE)
    this.text(text, MARGIN + 13, this.y - 11, 11.5, this.bold, BLUE_DEEP)
    this.y -= 19
    this.hrule(this.y)
    this.y -= 9
  }

  /** A tinted panel of label / value cells in `cols` columns. */
  metaPanel(cells: MetaCell[], cols: number, opts: { size?: number; weights?: number[] } = {}) {
    const size = opts.size ?? 10
    const pad = 14
    const gap = 14
    const weights = opts.weights && opts.weights.length === cols ? opts.weights : Array.from({ length: cols }, () => 1)
    const unit = (CONTENT_W - pad * 2 - gap * (cols - 1)) / weights.reduce((a, b) => a + b, 0)
    const widths = weights.map((x) => x * unit)
    const offsets = widths.map((_, i) => widths.slice(0, i).reduce((a, b) => a + b + gap, 0))
    const rows: MetaCell[][] = []
    for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols))
    const prepared = rows.map((r) => r.map((c, ci) => this.wrap(c.value, this.bold, size, widths[ci])))
    const heights = prepared.map((r) => 12 + Math.max(...r.map((p) => p.length), 1) * (size + 3.5) + 9)
    const total = heights.reduce((a, b) => a + b, 0) + pad - 2
    this.ensure(total + 8)
    const top = this.y
    this.rect(MARGIN, top - total, CONTENT_W, total, BLUE_50)
    this.rect(MARGIN, top - total, 3, total, ORANGE)
    let rowTop = top - pad + 2
    rows.forEach((r, ri) => {
      r.forEach((c, ci) => {
        const x = MARGIN + pad + offsets[ci]
        this.text(c.label.toUpperCase(), x, rowTop - 8, 7, this.bold, GREY)
        prepared[ri][ci].forEach((l, li) => this.text(l, x, rowTop - 8 - 13 - li * (size + 3.5), size, this.bold, NAVY))
      })
      rowTop -= heights[ri]
    })
    this.y = top - total - 16
  }

  /** A highlighted note: tone orange (draft indicator) or blue (next steps). */
  callout(heading: string | null, body: string, tone: 'blue' | 'orange') {
    const size = 9.5
    const lines = this.wrap(body, heading ? this.regular : this.bold, size, CONTENT_W - 32)
    const h = 14 + (heading ? 15 : 0) + lines.length * (size + 4) + 8
    this.ensure(h + 8)
    const top = this.y
    this.rect(MARGIN, top - h, CONTENT_W, h, tone === 'orange' ? ORANGE_50 : BLUE_50)
    this.rect(MARGIN, top - h, 3, h, tone === 'orange' ? ORANGE : BLUE)
    let ty = top - 18
    if (heading) { this.text(heading, MARGIN + 16, ty, 10.5, this.bold, tone === 'orange' ? ORANGE_DEEP : BLUE_DEEP); ty -= 15 }
    lines.forEach((l, i) => this.text(l, MARGIN + 16, ty - i * (size + 4), size, heading ? this.regular : this.bold, tone === 'orange' ? ORANGE_DEEP : NAVY))
    this.y = top - h - 14
  }

  // ── line-item table ───────────────────────────────────────────────────────
  private cols = { qty: MARGIN + 326, price: MARGIN + 422, amt: W - MARGIN - 8 }
  private tableHead() {
    this.rect(MARGIN, this.y - 22, CONTENT_W, 22, BLUE)
    const head = (t: string, xRight: number) => this.textRight(t, xRight, this.y - 14.5, 7.5, this.bold, WHITE)
    this.text('DESCRIPTION', MARGIN + 8, this.y - 14.5, 7.5, this.bold, WHITE)
    head('QTY', this.cols.qty); head('UNIT PRICE', this.cols.price); head('AMOUNT', this.cols.amt)
    this.y -= 22
  }

  private rowPrep(l: PdfLineItem, ts: number) {
    const descW = 262
    const t = this.wrap(l.title, this.bold, ts, descW)
    const d = l.description ? this.wrap(l.description, this.regular, ts - 1.5, descW) : []
    return { t, d, h: Math.max(t.length * (ts + 3) + d.length * (ts + 2) + 12, 26) }
  }

  /** Height of a whole line table (header + rows), to decide whether a short table can be kept on one page. */
  tableHeight(lines: PdfLineItem[], opts: { compact?: boolean } = {}): number {
    const ts = opts.compact ? 9.5 : 10
    return 22 + lines.reduce((a, l) => a + this.rowPrep(l, ts).h, 0) + 12
  }

  /** Height of the money summary for these rows. */
  summaryHeight(rows: SummaryRow[]): number {
    return rows.reduce((a, r) => a + (r.tone === 'strong' ? 40 : 19), 0) + 12
  }

  /** Moves to a new page unless the next `height` fits here — but only when it CAN fit on one page; longer blocks flow naturally. */
  keepTogether(height: number) {
    if (height <= H - 62 - BOTTOM - 40) this.ensure(height)
  }

  lineTable(currency: string, lines: PdfLineItem[], opts: { compact?: boolean } = {}) {
    const ts = opts.compact ? 9.5 : 10
    const rowPrep = (l: PdfLineItem) => this.rowPrep(l, ts)
    const first = lines[0] ? rowPrep(lines[0]).h : 26
    this.ensure(22 + Math.min(first, 120)) // the header is never left alone at the foot of a page
    this.tableHead()
    for (const l of lines) {
      const { t, d, h } = rowPrep(l)
      // a row is never split across pages: when it does not fit, it moves whole and the header is repeated
      if (this.ensure(h)) this.tableHead()
      t.forEach((s, i) => this.text(s, MARGIN + 8, this.y - 15 - i * (ts + 3), ts, this.bold, NAVY))
      d.forEach((s, i) => this.text(s, MARGIN + 8, this.y - 15 - t.length * (ts + 3) - i * (ts + 2) + 2, ts - 1.5, this.regular, GREY))
      this.textRight(String(Number(l.quantity)), this.cols.qty, this.y - 15, ts - 0.5, this.regular, NAVY)
      this.textRight(formatMoney(l.unit_price, currency), this.cols.price, this.y - 15, ts - 0.5, this.regular, NAVY)
      this.textRight(formatMoney(l.amount, currency), this.cols.amt, this.y - 15, ts - 0.5, this.bold, NAVY)
      this.y -= h
      this.hrule(this.y, RULE, 0.5)
    }
    this.y -= 12
  }

  /** The money summary: subordinate rows, then the strongest row as a blue panel with an orange accent. Printed as given. */
  summary(rows: SummaryRow[]) {
    const bw = 262
    const x0 = W - MARGIN - bw
    const rowH = (r: SummaryRow) => (r.tone === 'strong' ? 40 : 19)
    this.ensure(rows.reduce((a, r) => a + rowH(r), 0) + 6)
    for (const r of rows) {
      const tone = r.tone ?? 'normal'
      if (tone === 'strong') {
        this.y -= 4
        this.rect(x0, this.y - 32, bw, 32, BLUE)
        this.rect(x0, this.y - 32, 4, 32, ORANGE)
        this.text(r.label, x0 + 16, this.y - 20, 10, this.bold, WHITE)
        this.textRight(r.value, x0 + bw - 12, this.y - 21, 14, this.bold, WHITE)
        this.y -= 36
      } else {
        const font = tone === 'bold' ? this.bold : this.regular
        const size = tone === 'quiet' ? 9 : 10
        this.text(r.label, x0 + 12, this.y - 13, size, font, tone === 'bold' ? NAVY : GREY)
        this.textRight(r.value, x0 + bw - 12, this.y - 13, size, font, tone === 'quiet' ? GREY : NAVY)
        this.y -= 19
        this.hrule(this.y + 2, RULE, 0.4, x0, x0 + bw)
      }
    }
    this.y -= 12
  }

  /** A left / right row (a payment received): kept on one page. */
  pairRow(left: string, right: string) {
    this.ensure(22)
    this.text(left, MARGIN + 2, this.y - 13, 9.5, this.regular, NAVY)
    this.textRight(right, W - MARGIN - 2, this.y - 13, 9.5, this.bold, NAVY)
    this.y -= 21
    this.hrule(this.y + 3, RULE, 0.4)
  }

  async finish(): Promise<Uint8Array> {
    const total = this.pages.length
    this.pages.forEach((p, i) => {
      this.page = p
      this.hrule(FOOTER_RULE_Y, RULE, 0.6)
      this.modules(MARGIN, 33, 5)
      this.text(`Hbee Digitals  ·  ${SITE_HOST}`, MARGIN + 17, 33, 8, this.regular, GREY)
      this.textRight(`${this.ident.number}  ·  Page ${i + 1} of ${total}`, W - MARGIN, 33, 8, this.regular, GREY)
    })
    return this.pdf.save()
  }
}

export interface PdfLineItem { title: string; description?: string | null; quantity: string; unit_price: string; amount: string }

export interface ProposalPdfInput {
  number: string
  version: number
  title: string
  preparedFor: { name: string; business?: string | null }
  issueDate?: string | null
  expiresAt?: string | null
  currency: string
  summary?: string | null
  scope?: string | null
  deliverables?: string | null
  timeline?: string | null
  terms?: string | null
  paymentTerms?: string | null
  lines: PdfLineItem[]
  subtotal: string
  discount: string
  total: string
  /** Set ONLY for a draft preview (an unsent proposal): the draft banner and the DRAFT pill. Never set for a client-facing document. */
  watermark?: string | null
  /** A short state worth showing on a delivered document (e.g. "Approved"); omitted while it is simply out for review. */
  statusLabel?: string | null
  /** Print the client-facing Next steps panel (only while the proposal still awaits the client's decision). */
  showNextSteps?: boolean
}

export async function buildProposalPdf(i: ProposalPdfInput): Promise<Uint8Array> {
  const isDraft = !!i.watermark
  const status = isDraft
    ? { text: 'Draft', tone: 'orange' as const }
    : i.statusLabel
      ? { text: i.statusLabel, tone: 'blue' as const }
      : null
  const w = await Writer.create({ label: 'Proposal', number: i.number, sub: `Version ${i.version}`, status })
  w.title(i.title)
  if (i.watermark) w.callout(null, i.watermark, 'orange')
  w.metaPanel(
    [
      { label: 'Prepared for', value: i.preparedFor.name },
      { label: 'Business', value: i.preparedFor.business || '—' },
      { label: 'Proposal', value: i.number },
      { label: 'Version', value: `Version ${i.version}` },
      // a draft has no issue date until it is sent (the database sets it at that moment); nothing is invented in the meantime
      { label: 'Issue date', value: i.issueDate ? formatDate(i.issueDate) : isDraft ? 'Set when sent' : '—' },
      { label: 'Valid until', value: i.expiresAt ? formatDate(i.expiresAt) : 'No expiry date' },
    ],
    3,
  )
  if (i.summary) { w.heading('Summary'); w.paragraph(i.summary) }
  if (i.scope) { w.heading('Scope'); w.paragraph(i.scope) }
  if (i.deliverables) { w.heading('Deliverables'); w.paragraph(i.deliverables) }
  if (i.timeline) { w.heading('Timeline'); w.paragraph(i.timeline) }
  const rows: SummaryRow[] = [{ label: 'Subtotal', value: formatMoney(i.subtotal, i.currency), tone: 'quiet' }]
  if (Number(i.discount) > 0) rows.push({ label: 'Discount', value: '-' + formatMoney(i.discount, i.currency), tone: 'quiet' })
  rows.push({ label: `Total (${i.currency})`, value: formatMoney(i.total, i.currency), tone: 'strong' })
  // a pricing table that fits on one page is never split from its heading or its totals
  w.keepTogether(54 + w.tableHeight(i.lines) + w.summaryHeight(rows))
  w.heading('Investment')
  w.lineTable(i.currency, i.lines)
  w.summary(rows)
  if (i.paymentTerms) { w.heading('Payment terms'); w.paragraph(i.paymentTerms) }
  if (i.showNextSteps) { w.y -= 6; w.callout('Next steps', PROPOSAL_NEXT_STEPS, 'blue') }
  if (i.terms) { w.heading('Terms'); w.paragraph(i.terms, { size: 9 }) }
  return w.finish()
}

export interface InvoicePdfInput {
  number: string
  statusLabel: string
  billTo: { name: string; business?: string | null }
  project: { name: string; reference?: string | null }
  proposalNumber?: string | null
  issueDate?: string | null
  dueDate?: string | null
  currency: string
  lines: PdfLineItem[]
  subtotal: string
  discount: string
  tax: string
  total: string
  paid: string
  balance: string
  paymentInstructions?: string | null
  notes?: string | null
  payments?: Array<{ paid_at: string; amount: string; method?: string | null; reference?: string | null }>
}

export async function buildInvoicePdf(i: InvoicePdfInput): Promise<Uint8Array> {
  const settled = /^(paid|void)/i.test(i.statusLabel)
  const w = await Writer.create({ label: 'Invoice', number: i.number, sub: null, status: { text: i.statusLabel, tone: settled ? 'blue' : 'orange' } })
  w.metaPanel(
    [
      { label: 'From', value: 'Hbee Digitals\n' + SITE_HOST },
      { label: 'Bill to', value: i.billTo.business ? `${i.billTo.name}\n${i.billTo.business}` : i.billTo.name },
    ],
    2,
  )
  const refs: MetaCell[] = [
    { label: 'Issue date', value: formatDate(i.issueDate) },
    { label: 'Due date', value: formatDate(i.dueDate) },
    { label: 'Project', value: i.project.reference ? `${i.project.name}\nRef ${i.project.reference}` : i.project.name },
  ]
  if (i.proposalNumber) refs.push({ label: 'Proposal', value: i.proposalNumber })
  w.metaPanel(refs, refs.length, { size: 9.5, weights: refs.length === 4 ? [1, 1, 1.45, 1.55] : [1, 1, 1.6] })
  const rows: SummaryRow[] = [{ label: 'Subtotal', value: formatMoney(i.subtotal, i.currency), tone: 'quiet' }]
  if (Number(i.discount) > 0) rows.push({ label: 'Discount', value: '-' + formatMoney(i.discount, i.currency), tone: 'quiet' })
  if (Number(i.tax) > 0) rows.push({ label: 'Tax', value: formatMoney(i.tax, i.currency), tone: 'quiet' })
  rows.push({ label: 'Total', value: formatMoney(i.total, i.currency), tone: 'bold' })
  rows.push({ label: 'Paid', value: formatMoney(i.paid, i.currency), tone: 'normal' })
  rows.push({ label: `Balance due (${i.currency})`, value: formatMoney(i.balance, i.currency), tone: 'strong' })
  w.keepTogether(54 + w.tableHeight(i.lines, { compact: true }) + w.summaryHeight(rows))
  w.heading('Items')
  w.lineTable(i.currency, i.lines, { compact: true })
  w.summary(rows)
  if (i.payments && i.payments.length > 0) {
    w.heading('Payments received')
    for (const p of i.payments) {
      w.pairRow(`${formatDate(p.paid_at)}${p.method ? '   ' + p.method : ''}${p.reference ? '   Ref ' + p.reference : ''}`, formatMoney(p.amount, i.currency))
    }
  }
  if (i.paymentInstructions) { w.heading('Payment instructions'); w.paragraph(i.paymentInstructions) }
  if (i.notes) { w.heading('Notes'); w.paragraph(i.notes, { size: 9 }) }
  return w.finish()
}

/** A safe download file name: ASCII letters, digits, dot, dash and underscore only. */
export function pdfFileName(kind: 'proposal' | 'invoice', number: string, version?: number): string {
  const safe = String(number || kind).replace(/[^A-Za-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || kind
  return `${safe}${version ? `-v${version}` : ''}.pdf`
}
