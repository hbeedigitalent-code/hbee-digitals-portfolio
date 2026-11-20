// src/lib/commerce/pdf.ts
//
// SERVER-ONLY. Proposal and invoice PDFs, generated on demand with pdf-lib from AUTHORITATIVE, IMMUTABLE records (a proposal
// VERSION snapshot, an issued invoice's own rows). Nothing is rendered from a browser, nothing is screenshotted, nothing is
// stored: no bucket, no persisted copy, no permanent URL. The functions below take plain values; the routes that call them
// load the values themselves, after authorization, and pass ONLY the fields allowed in a document. There is deliberately
// no parameter for internal notes, admin identity, change-request text or any secret, so none can be printed by accident.
//
// Fonts: the built-in Helvetica faces (WinAnsi). That keeps the file small and needs no font file on the server, at the
// price of a restricted character set — sanitizePdfText() maps anything the font cannot encode to "?" so unusual client
// text can never make generation throw. Amounts are printed with their ISO code (NGN 1,250.00), never a currency glyph.

import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { formatMoney } from '@/lib/commerce/money'

if (typeof window !== 'undefined') {
  throw new Error('pdf.ts is server-only and must not be imported by client code')
}

const NAVY = rgb(0.043, 0.086, 0.157)
const ORANGE = rgb(0.976, 0.451, 0.086)
const GREY = rgb(0.4, 0.44, 0.5)
const LIGHT = rgb(0.93, 0.94, 0.96)
const RULE = rgb(0.82, 0.85, 0.89)
const W = 595.28
const H = 841.89
const MARGIN = 48
const CONTENT_W = W - MARGIN * 2
export const PDF_TEMPLATE_VERSION = 'v1'

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

class Writer {
  pdf!: PDFDocument
  regular!: PDFFont
  bold!: PDFFont
  pages: PDFPage[] = []
  page!: PDFPage
  y = 0
  constructor(private docLabel: string, private docNumber: string) {}

  static async create(docLabel: string, docNumber: string): Promise<Writer> {
    const w = new Writer(docLabel, docNumber)
    w.pdf = await PDFDocument.create()
    w.pdf.setTitle(sanitizePdfText(`${docLabel} ${docNumber}`))
    w.pdf.setAuthor('Hbee Digitals')
    w.pdf.setProducer('Hbee Digitals')
    w.pdf.setCreator('Hbee Digitals')
    w.regular = await w.pdf.embedFont(StandardFonts.Helvetica)
    w.bold = await w.pdf.embedFont(StandardFonts.HelveticaBold)
    w.addPage(true)
    return w
  }

  addPage(first = false) {
    this.page = this.pdf.addPage([W, H])
    this.pages.push(this.page)
    this.y = H - MARGIN
    if (first) {
      this.page.drawRectangle({ x: MARGIN, y: this.y - 4, width: 28, height: 4, color: ORANGE })
      this.y -= 26
      this.page.drawText('Hbee Digitals', { x: MARGIN, y: this.y, size: 20, font: this.bold, color: NAVY })
      const label = sanitizePdfText(this.docLabel.toUpperCase())
      this.page.drawText(label, { x: W - MARGIN - this.bold.widthOfTextAtSize(label, 11), y: this.y + 6, size: 11, font: this.bold, color: GREY })
      const num = sanitizePdfText(this.docNumber)
      this.page.drawText(num, { x: W - MARGIN - this.regular.widthOfTextAtSize(num, 10), y: this.y - 8, size: 10, font: this.regular, color: NAVY })
      this.y -= 34
    } else {
      this.page.drawText('Hbee Digitals', { x: MARGIN, y: this.y - 8, size: 10, font: this.bold, color: NAVY })
      const num = sanitizePdfText(`${this.docLabel} ${this.docNumber}`)
      this.page.drawText(num, { x: W - MARGIN - this.regular.widthOfTextAtSize(num, 9), y: this.y - 8, size: 9, font: this.regular, color: GREY })
      this.y -= 30
    }
  }

  ensure(space: number) {
    if (this.y - space < MARGIN + 36) this.addPage()
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

  paragraph(text: string, opts: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; x?: number; width?: number; gap?: number } = {}) {
    const size = opts.size ?? 10
    const font = opts.bold ? this.bold : this.regular
    const x = opts.x ?? MARGIN
    const lines = this.wrap(text, font, size, opts.width ?? CONTENT_W)
    for (const l of lines) {
      this.ensure(size + 4)
      if (l) this.page.drawText(l, { x, y: this.y - size, size, font, color: opts.color ?? NAVY })
      this.y -= size * 1.45
    }
    this.y -= opts.gap ?? 0
  }

  heading(text: string) {
    this.ensure(40)
    this.y -= 8
    this.page.drawText(sanitizePdfText(text.toUpperCase()), { x: MARGIN, y: this.y - 10, size: 9, font: this.bold, color: ORANGE })
    this.y -= 14
    this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: W - MARGIN, y: this.y }, thickness: 0.6, color: RULE })
    this.y -= 8
  }

  /** two columns of label / value pairs */
  facts(left: Array<[string, string]>, right: Array<[string, string]>) {
    const colW = CONTENT_W / 2 - 8
    const rows = Math.max(left.length, right.length)
    for (let i = 0; i < rows; i++) {
      const cells: Array<[string, string] | undefined> = [left[i], right[i]]
      let rowH = 0
      const prepared = cells.map((c) => (c ? this.wrap(c[1], this.regular, 10, colW) : []))
      rowH = Math.max(...prepared.map((p) => p.length), 1) * 14 + 12
      this.ensure(rowH)
      cells.forEach((c, idx) => {
        if (!c) return
        const x = MARGIN + idx * (colW + 16)
        this.page.drawText(sanitizePdfText(c[0]), { x, y: this.y - 8, size: 8, font: this.bold, color: GREY })
        prepared[idx].forEach((l, li) => this.page.drawText(l, { x, y: this.y - 20 - li * 14, size: 10, font: this.regular, color: NAVY }))
      })
      this.y -= rowH
    }
  }

  lineTable(currency: string, lines: Array<{ title: string; description?: string | null; quantity: string; unit_price: string; amount: string }>) {
    const cols = { desc: MARGIN, qty: MARGIN + 290, price: MARGIN + 350, amt: W - MARGIN }
    const descW = 276
    this.ensure(30)
    this.page.drawRectangle({ x: MARGIN, y: this.y - 20, width: CONTENT_W, height: 20, color: LIGHT })
    const head = (t: string, x: number, right = false) => {
      const s = sanitizePdfText(t)
      this.page.drawText(s, { x: right ? x - this.bold.widthOfTextAtSize(s, 8) : x + 6, y: this.y - 14, size: 8, font: this.bold, color: GREY })
    }
    head('DESCRIPTION', cols.desc); head('QTY', cols.qty + 40, true); head('UNIT PRICE', cols.price + 76, true); head('AMOUNT', cols.amt - 6, true)
    this.y -= 24
    for (const l of lines) {
      const t = this.wrap(l.title, this.bold, 10, descW - 6)
      const d = l.description ? this.wrap(l.description, this.regular, 9, descW - 6) : []
      const h = Math.max(t.length * 13 + d.length * 12 + 10, 24)
      this.ensure(h)
      t.forEach((s, i) => this.page.drawText(s, { x: cols.desc + 6, y: this.y - 12 - i * 13, size: 10, font: this.bold, color: NAVY }))
      d.forEach((s, i) => this.page.drawText(s, { x: cols.desc + 6, y: this.y - 12 - t.length * 13 - i * 12 + 2, size: 9, font: this.regular, color: GREY }))
      const right = (s: string, x: number) => {
        const v = sanitizePdfText(s)
        this.page.drawText(v, { x: x - this.regular.widthOfTextAtSize(v, 10), y: this.y - 12, size: 10, font: this.regular, color: NAVY })
      }
      right(String(Number(l.quantity)), cols.qty + 40)
      right(formatMoney(l.unit_price, currency), cols.price + 76)
      right(formatMoney(l.amount, currency), cols.amt - 6)
      this.y -= h
      this.page.drawLine({ start: { x: MARGIN, y: this.y }, end: { x: W - MARGIN, y: this.y }, thickness: 0.4, color: RULE })
    }
    this.y -= 6
  }

  totals(rows: Array<{ label: string; value: string; strong?: boolean }>) {
    this.ensure(rows.length * 18 + 10)
    for (const r of rows) {
      const font = r.strong ? this.bold : this.regular
      const size = r.strong ? 12 : 10
      const v = sanitizePdfText(r.value)
      if (r.strong) this.page.drawRectangle({ x: W - MARGIN - 250, y: this.y - 20, width: 250, height: 22, color: LIGHT })
      this.page.drawText(sanitizePdfText(r.label), { x: W - MARGIN - 240, y: this.y - 14, size, font, color: r.strong ? NAVY : GREY })
      this.page.drawText(v, { x: W - MARGIN - 8 - font.widthOfTextAtSize(v, size), y: this.y - 14, size, font, color: NAVY })
      this.y -= r.strong ? 26 : 18
    }
  }

  async finish(): Promise<Uint8Array> {
    const total = this.pages.length
    this.pages.forEach((p, i) => {
      p.drawLine({ start: { x: MARGIN, y: 44 }, end: { x: W - MARGIN, y: 44 }, thickness: 0.5, color: RULE })
      const host = (process.env.NEXT_PUBLIC_SITE_URL || '').replace(/^https?:\/\//, '').replace(/\/+$/, '')
      p.drawText(sanitizePdfText(`Hbee Digitals${host ? '  ·  ' + host : ''}`), { x: MARGIN, y: 30, size: 8, font: this.regular, color: GREY })
      const right = sanitizePdfText(`${this.docNumber}  ·  Page ${i + 1} of ${total}`)
      p.drawText(right, { x: W - MARGIN - this.regular.widthOfTextAtSize(right, 8), y: 30, size: 8, font: this.regular, color: GREY })
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
  /** Shown as a status stripe for a draft preview; omitted for a client-facing document. */
  watermark?: string | null
}

export async function buildProposalPdf(i: ProposalPdfInput): Promise<Uint8Array> {
  const w = await Writer.create('Proposal', i.number)
  w.paragraph(i.title, { size: 17, bold: true, gap: 4 })
  if (i.watermark) w.paragraph(i.watermark, { size: 9, bold: true, color: ORANGE, gap: 2 })
  w.facts(
    [['PREPARED FOR', i.preparedFor.business ? `${i.preparedFor.name}\n${i.preparedFor.business}` : i.preparedFor.name], ['ISSUE DATE', formatDate(i.issueDate)]],
    [['PROPOSAL / VERSION', `${i.number}  ·  version ${i.version}`], ['VALID UNTIL', i.expiresAt ? formatDate(i.expiresAt) : 'No expiry date']],
  )
  if (i.summary) { w.heading('Summary'); w.paragraph(i.summary) }
  if (i.scope) { w.heading('Scope'); w.paragraph(i.scope) }
  if (i.deliverables) { w.heading('Deliverables'); w.paragraph(i.deliverables) }
  if (i.timeline) { w.heading('Timeline'); w.paragraph(i.timeline) }
  w.heading('Investment')
  w.lineTable(i.currency, i.lines)
  const rows = [{ label: 'Subtotal', value: formatMoney(i.subtotal, i.currency) }]
  if (Number(i.discount) > 0) rows.push({ label: 'Discount', value: '-' + formatMoney(i.discount, i.currency) })
  rows.push({ label: `Total (${i.currency})`, value: formatMoney(i.total, i.currency), strong: true } as { label: string; value: string; strong?: boolean })
  w.totals(rows)
  if (i.paymentTerms) { w.heading('Payment terms'); w.paragraph(i.paymentTerms) }
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
  const w = await Writer.create('Invoice', i.number)
  w.facts(
    [['BILL TO', i.billTo.business ? `${i.billTo.name}\n${i.billTo.business}` : i.billTo.name], ['PROJECT', i.project.reference ? `${i.project.name}\nRef ${i.project.reference}` : i.project.name]],
    [['INVOICE', `${i.number}${i.proposalNumber ? `\nProposal ${i.proposalNumber}` : ''}`], ['ISSUED / DUE', `${formatDate(i.issueDate)}  /  ${formatDate(i.dueDate)}\nStatus: ${i.statusLabel}`]],
  )
  w.heading('Items')
  w.lineTable(i.currency, i.lines)
  const rows: Array<{ label: string; value: string; strong?: boolean }> = [{ label: 'Subtotal', value: formatMoney(i.subtotal, i.currency) }]
  if (Number(i.discount) > 0) rows.push({ label: 'Discount', value: '-' + formatMoney(i.discount, i.currency) })
  if (Number(i.tax) > 0) rows.push({ label: 'Tax', value: formatMoney(i.tax, i.currency) })
  rows.push({ label: 'Total', value: formatMoney(i.total, i.currency) })
  rows.push({ label: 'Paid', value: formatMoney(i.paid, i.currency) })
  rows.push({ label: `Balance due (${i.currency})`, value: formatMoney(i.balance, i.currency), strong: true })
  w.totals(rows)
  if (i.payments && i.payments.length > 0) {
    w.heading('Payments received')
    for (const p of i.payments) {
      w.paragraph(`${formatDate(p.paid_at)}   ${formatMoney(p.amount, i.currency)}${p.method ? '   ' + p.method : ''}${p.reference ? '   Ref ' + p.reference : ''}`, { size: 9 })
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
