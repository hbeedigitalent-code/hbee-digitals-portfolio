// src/lib/emails/hbee-email.ts
//
// The Hbee Digitals transactional email design system (Phase 16.5).
//
// One reusable visual system for lifecycle email — Assessment Received first,
// then (in later phases) Review Update, Approval, Decline, Portal Invitation,
// Proposal and the rest. It is the email-safe translation of the public site:
// Royal Blue carries structure, Signal Orange is the one action / signal
// colour, Cloud and Mist are the quiet surfaces.
//
// RELATIONSHIP TO layout.ts
//   This EVOLVES the shared layout rather than replacing it. Escaping, trusted
//   absolute URLs, the configured-origin rule, sending, sender identity and
//   the delivery outcome all come from layout.ts unchanged. Templates that have
//   not migrated keep rendering through layout.ts exactly as before — moving
//   one template never restyles another.
//
// HOW IT IS BUILT
//   A template describes its message as a list of blocks. The HTML and the
//   plain-text alternative are both rendered from that same list, so the two
//   cannot drift apart (the property layout.ts introduced, kept here).
//
// EMAIL-CLIENT CONSTRAINTS THIS RESPECTS
//   - Table layout, inline styles on every element. The <style> block only
//     tightens spacing on narrow screens; nothing depends on it.
//   - Every coloured surface carries both bgcolor and background-color, so
//     clients that rewrite colours (dark mode) keep text and surface paired.
//   - No web fonts, SVG, background images, flexbox, grid or animation.
//   - The centered PNG mark has explicit dimensions and meaningful alt text.
//     A small live-text brand label keeps the header branded with images blocked.
//   - Absolute https URLs only (via emailUrl / requireEmailOrigin).

import { emailLogoUrl, emailUrl, escapeHtml, foldHtmlLines, requireEmailOrigin } from '@/lib/emails/layout'

// ---------------------------------------------------------------------------
// Tokens — the approved Hbee brand palette, verbatim.
// ---------------------------------------------------------------------------
export const HBEE_EMAIL_COLORS = {
  royalBlue: '#0642B3',
  signalOrange: '#FC5D1C',
  deepBlue: '#07338F',
  electricBlue: '#1D6EFF',
  iceBlue: '#CFE0FF',
  mist: '#EAF2FF',
  night: '#061426',
  deepNavy: '#071A32',
  cloud: '#F7F9FC',
  white: '#FFFFFF',
  ink: '#111827',
  slate: '#475569',
  muted: '#718096',
  softBorder: '#DDE6F2',
} as const

const C = HBEE_EMAIL_COLORS

/**
 * Type stacks. Nothing is downloaded: the system UI faces (San Francisco,
 * Segoe UI, Roboto) are the closest installed match to Manrope / Inter, then
 * the universal fallbacks. Headings differ by weight and size, not family —
 * a heavy Helvetica/Arial stack reads wide and blunt on Windows.
 */
const BODY = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
const DISPLAY = BODY

// ---------------------------------------------------------------------------
// Status — a reusable panel for lifecycle states.
//
// Only 'received' is used in Phase 16.5. The others are defined so later
// templates share one treatment; their copy and use are decided when those
// emails migrate. None uses green: a status is information, not celebration.
// ---------------------------------------------------------------------------
export type HbeeEmailStatusTone = 'received' | 'review' | 'approved' | 'declined' | 'info'

const STATUS_TONES: Record<HbeeEmailStatusTone, { surface: string; rule: string; label: string; node: string }> = {
  // The answers have entered the review system: Royal Blue structure, one orange signal node (as on the site).
  received: { surface: C.mist, rule: C.royalBlue, label: C.royalBlue, node: C.signalOrange },
  review: { surface: C.mist, rule: C.electricBlue, label: C.deepBlue, node: C.electricBlue },
  approved: { surface: C.mist, rule: C.royalBlue, label: C.deepBlue, node: C.royalBlue },
  declined: { surface: C.cloud, rule: C.slate, label: C.slate, node: C.slate },
  info: { surface: C.cloud, rule: C.softBorder, label: C.slate, node: C.muted },
}

// ---------------------------------------------------------------------------
// Blocks
// ---------------------------------------------------------------------------
export type HbeeEmailBlock =
  | { type: 'paragraph'; text: string; tone?: 'body' | 'muted' }
  | { type: 'heading'; text: string }
  | { type: 'steps'; items: string[] }
  | { type: 'list'; items: string[] }
  | { type: 'facts'; rows: Array<{ label: string; value: string }> }
  | { type: 'callout'; title?: string; text: string }
  | { type: 'link'; label: string; url: string }
  | { type: 'divider' }

export interface HbeeEmailOptions {
  /** Inbox preview line. */
  preheader: string
  /** Lifecycle state shown at the top of the message. */
  status?: { tone: HbeeEmailStatusTone; label: string; detail?: string }
  /** The H1 of the message. */
  heading: string
  blocks: HbeeEmailBlock[]
  /** At most ONE primary action — omitted entirely when the email has none. */
  primaryAction?: { label: string; url: string }
  signoff: { name: string; title?: string }
  /** Why this message arrived. Required on every Hbee email. */
  reason: string
  supportEmail: string
  /** True only when a reply-to is really configured (layout.ts configuredReplyTo → RESEND_REPLY_TO). */
  repliesMonitored: boolean
  /** Optional quiet footer links (e.g. Client Portal). In-app paths only; none by default. */
  footerLinks?: Array<{ label: string; url: string }>
}

/** Collapse whitespace and drop control characters from a dynamic value. */
export function cleanText(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Plain text never carries markup: tags are removed, nothing is escaped. */
function plain(value: unknown): string {
  return cleanText(value).replace(/<[^>]*>/g, '')
}

// ---------------------------------------------------------------------------
// HTML primitives
// ---------------------------------------------------------------------------
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"'

function emailParagraph(text: string, tone: 'body' | 'muted' = 'body'): string {
  return `<p style="margin:0 0 16px;font-family:${BODY};font-size:16px;line-height:1.6;color:${tone === 'muted' ? C.slate : C.ink};">${escapeHtml(text)}</p>`
}

function emailHeading(text: string): string {
  return `<h2 style="margin:28px 0 14px;font-family:${DISPLAY};font-size:18px;line-height:1.35;font-weight:700;color:${C.night};">${escapeHtml(text)}</h2>`
}

function emailSteps(items: string[]): string {
  const rows = items
    .map(
      (item, i) =>
        `<tr>` +
        `<td width="34" valign="top" style="width:34px;padding:0 14px 14px 0;">` +
        `<table ${TABLE} width="34" style="border-collapse:separate;"><tr>` +
        `<td width="34" height="34" align="center" valign="middle" bgcolor="${C.white}" style="width:32px;height:32px;background-color:${C.white};border:1px solid ${C.royalBlue};border-radius:8px 8px 12px 8px;font-family:${DISPLAY};font-size:13px;line-height:32px;font-weight:700;color:${C.royalBlue};">${String(i + 1).padStart(2, '0')}</td>` +
        `</tr></table>` +
        `</td>` +
        `<td valign="top" style="padding:6px 0 14px;font-family:${BODY};font-size:16px;line-height:1.5;color:${C.ink};">${escapeHtml(item)}</td>` +
        `</tr>`,
    )
    .join('')
  return `<table ${TABLE} width="100%" style="margin:0 0 10px;border-collapse:collapse;">${rows}</table>`
}

function emailList(items: string[]): string {
  return (
    `<ul style="margin:0 0 16px;padding-left:20px;font-family:${BODY};font-size:16px;line-height:1.6;color:${C.ink};">` +
    items.map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`).join('') +
    `</ul>`
  )
}

function emailFacts(rows: Array<{ label: string; value: string }>): string {
  return (
    `<table ${TABLE} width="100%" style="margin:0 0 20px;border-collapse:collapse;">` +
    rows
      .map(
        (row) =>
          `<tr>` +
          `<td valign="top" style="width:40%;padding:8px 12px 8px 0;border-bottom:1px solid ${C.softBorder};font-family:${BODY};font-size:14px;line-height:1.5;color:${C.slate};">${escapeHtml(row.label)}</td>` +
          `<td valign="top" style="padding:8px 0;border-bottom:1px solid ${C.softBorder};font-family:${BODY};font-size:14px;line-height:1.5;font-weight:600;color:${C.ink};">${escapeHtml(row.value)}</td>` +
          `</tr>`,
      )
      .join('') +
    `</table>`
  )
}

function emailCallout(text: string, title?: string): string {
  return (
    `<table ${TABLE} width="100%" style="margin:8px 0 24px;border-collapse:separate;">` +
    `<tr><td bgcolor="${C.mist}" style="padding:16px 18px;background-color:${C.mist};border-left:3px solid ${C.royalBlue};border-radius:0 10px 10px 0;">` +
    (title
      ? `<p style="margin:0 0 6px;font-family:${DISPLAY};font-size:15px;line-height:1.4;font-weight:700;color:${C.night};">${escapeHtml(title)}</p>`
      : '') +
    `<p style="margin:0;font-family:${BODY};font-size:15px;line-height:1.6;color:${C.ink};">${escapeHtml(text)}</p>` +
    `</td></tr></table>`
  )
}

function secondaryLink(label: string, url: string): string {
  // A typographic chevron stays inside the link and needs no image or geometry.
  return `<p style="margin:0 0 20px;font-family:${BODY};font-size:15px;line-height:1.5;"><a href="${escapeHtml(emailUrl(url))}" target="_blank" rel="noopener" style="color:${C.royalBlue};font-weight:700;text-decoration:underline;">${escapeHtml(label)}&nbsp;<span aria-hidden="true" style="font-size:18px;line-height:1;">&#8250;</span></a></p>`
}

function emailDivider(): string {
  return `<table ${TABLE} width="100%" style="border-collapse:collapse;"><tr><td style="padding:8px 0 24px;"><div style="height:1px;line-height:1px;font-size:0;background-color:${C.softBorder};">&nbsp;</div></td></tr></table>`
}

function primaryButton(label: string, url: string): string {
  // Table-based so Outlook renders a filled block rather than a bare link.
  return (
    `<table ${TABLE} style="margin:8px 0 24px;border-collapse:separate;">` +
    `<tr><td align="center" bgcolor="${C.signalOrange}" style="border-radius:999px;background-color:${C.signalOrange};">` +
    `<a href="${escapeHtml(emailUrl(url))}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;font-family:${BODY};font-size:15px;line-height:1;font-weight:700;color:${C.night};text-decoration:none;border-radius:999px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  )
}

function statusPanel(status: NonNullable<HbeeEmailOptions['status']>): string {
  const t = STATUS_TONES[status.tone]
  return (
    `<table ${TABLE} width="100%" style="margin:0 0 22px;border-collapse:separate;">` +
    `<tr><td bgcolor="${t.surface}" style="padding:12px 16px;background-color:${t.surface};border-left:4px solid ${t.rule};border-radius:0 10px 10px 0;">` +
    `<table ${TABLE} style="border-collapse:collapse;"><tr>` +
    // The signal node sits in its own fixed-size table so the row height cannot stretch it.
    `<td valign="middle" width="12" style="width:12px;">` +
    `<table ${TABLE} width="12" style="border-collapse:collapse;"><tr>` +
    `<td width="12" height="7" bgcolor="${t.node}" style="width:12px;height:7px;background-color:${t.node};border-radius:2px 4px 4px 2px;font-size:0;line-height:7px;mso-line-height-rule:exactly;">&nbsp;</td>` +
    `</tr></table>` +
    `</td>` +
    `<td style="padding-left:10px;font-family:${BODY};font-size:14px;line-height:1.4;font-weight:700;letter-spacing:0.01em;color:${t.label};">${escapeHtml(status.label)}</td>` +
    `</tr></table>` +
    (status.detail
      ? `<p style="margin:6px 0 0;font-family:${BODY};font-size:14px;line-height:1.5;color:${C.slate};">${escapeHtml(status.detail)}</p>`
      : '') +
    `</td></tr></table>`
  )
}

function emailHeader(siteHref: string, logoSrc: string): string {
  return (
    `<tr><td align="center" bgcolor="${C.white}" style="padding:20px 32px;background-color:${C.white};border:1px solid ${C.softBorder};">` +
    `<a href="${escapeHtml(siteHref)}" target="_blank" rel="noopener" style="text-decoration:none;">` +
    `<img src="${escapeHtml(logoSrc)}" width="56" height="56" alt="Hbee Digitals" style="display:block;margin:0 auto;width:56px;height:56px;border:0;outline:none;text-decoration:none;" />` +
    `</a>\n` +
    `<p style="margin:8px 0 0;font-family:${BODY};font-size:13px;line-height:18px;font-weight:600;letter-spacing:0.02em;color:${C.slate};">Hbee Digitals</p>` +
    `</td></tr>`
  )
}

function emailSignoff(signoff: HbeeEmailOptions['signoff']): string {
  return (
    `<table ${TABLE} width="100%" style="border-collapse:collapse;"><tr><td style="padding-top:20px;border-top:1px solid ${C.softBorder};">` +
    `<p style="margin:0;font-family:${BODY};font-size:15px;line-height:1.5;color:${C.slate};">With thanks,</p>` +
    `<p style="margin:4px 0 0;font-family:${DISPLAY};font-size:16px;line-height:1.4;font-weight:700;color:${C.night};">${escapeHtml(signoff.name)}</p>` +
    (signoff.title
      ? `<p style="margin:2px 0 0;font-family:${BODY};font-size:14px;line-height:1.4;color:${C.slate};">${escapeHtml(signoff.title)}</p>`
      : '') +
    `</td></tr></table>`
  )
}

function supportSentence(options: HbeeEmailOptions): string {
  return options.repliesMonitored
    ? `Questions? Reply to this email or write to ${options.supportEmail}.`
    : `Questions? Write to ${options.supportEmail}.`
}

function emailFooter(options: HbeeEmailOptions, siteHref: string): string {
  const host = new URL(siteHref).host
  const support = escapeHtml(options.supportEmail)
  const supportLine = options.repliesMonitored
    ? `Questions? Reply to this email or write to <a href="mailto:${support}" style="color:${C.royalBlue};text-decoration:underline;">${support}</a>.`
    : `Questions? Write to <a href="mailto:${support}" style="color:${C.royalBlue};text-decoration:underline;">${support}</a>.`
  return (
    `<tr><td class="hb-foot" style="padding:22px 32px 8px;">` +
    `<p style="margin:0 0 10px;font-family:${BODY};font-size:13px;line-height:1.6;color:${C.slate};">${escapeHtml(options.reason)}</p>` +
    `<p style="margin:0 0 10px;font-family:${BODY};font-size:13px;line-height:1.6;color:${C.slate};">${supportLine}</p>` +
    `<p style="margin:0;font-family:${BODY};font-size:12px;line-height:1.6;color:${C.muted};">` +
    `<a href="${escapeHtml(siteHref)}" target="_blank" rel="noopener" style="color:${C.muted};text-decoration:underline;">${escapeHtml(host)}</a>` +
    (options.footerLinks ?? [])
      .map(
        (l) =>
          `&nbsp;&middot;&nbsp;<a href="${escapeHtml(emailUrl(l.url))}" target="_blank" rel="noopener" style="color:${C.muted};text-decoration:underline;">${escapeHtml(l.label)}</a>`,
      )
      .join('') +
    `&nbsp;&middot;&nbsp;&copy; ${new Date().getFullYear()} Hbee Digitals</p>` +
    `</td></tr>`
  )
}

function renderBlockHtml(block: HbeeEmailBlock): string {
  switch (block.type) {
    case 'paragraph':
      return emailParagraph(block.text, block.tone)
    case 'heading':
      return emailHeading(block.text)
    case 'steps':
      return emailSteps(block.items)
    case 'list':
      return emailList(block.items)
    case 'facts':
      return emailFacts(block.rows)
    case 'callout':
      return emailCallout(block.text, block.title)
    case 'link':
      return secondaryLink(block.label, block.url)
    case 'divider':
      return emailDivider()
  }
}

/** EmailShell: the full document. */
function buildHbeeEmailHtml(options: HbeeEmailOptions): string {
  const siteHref = requireEmailOrigin()
  const logoSrc = emailLogoUrl()

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en" dir="ltr">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="format-detection" content="telephone=no, date=no, address=no, email=no" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(options.heading)}</title>
<style type="text/css">
  /* Progressive only: narrower padding on phones. Nothing depends on it. */
  @media only screen and (max-width: 620px) {
    .hb-outer { padding: 12px 8px !important; }
    .hb-pad { padding-left: 20px !important; padding-right: 20px !important; }
    .hb-card { padding: 26px 20px 24px !important; }
    .hb-foot { padding-left: 20px !important; padding-right: 20px !important; }
    .hb-h1 { font-size: 24px !important; }
  }
  a[x-apple-data-detectors] { color: inherit !important; text-decoration: none !important; }
</style>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.cloud};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader: the inbox preview line, hidden in the body and padded so the
     following copy is not pulled into the preview. -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.cloud};opacity:0;">
${escapeHtml(options.preheader)}
${'&#8199;&#65279;&#847; '.repeat(30)}
</div>

<table ${TABLE} width="100%" bgcolor="${C.cloud}" style="background-color:${C.cloud};border-collapse:collapse;">
<tr>
<td align="center" class="hb-outer" style="padding:28px 12px;">

  <!--[if mso]><table ${TABLE} width="600" align="center"><tr><td><![endif]-->
  <table ${TABLE} width="600" style="width:100%;max-width:600px;border-collapse:separate;">

    ${emailHeader(siteHref, logoSrc)}

    <tr>
      <td bgcolor="${C.white}" class="hb-card" style="padding:30px 32px 28px;background-color:${C.white};border:1px solid ${C.softBorder};border-top:0;border-radius:0 0 14px 14px;">
        ${options.status ? statusPanel(options.status) : ''}
        <h1 class="hb-h1" style="margin:0 0 20px;font-family:${DISPLAY};font-size:28px;line-height:1.2;font-weight:700;letter-spacing:-0.02em;color:${C.night};">${escapeHtml(options.heading)}</h1>

        ${options.blocks.map(renderBlockHtml).join('\n        ')}

        ${options.primaryAction ? primaryButton(options.primaryAction.label, options.primaryAction.url) : ''}

        ${emailSignoff(options.signoff)}
      </td>
    </tr>

    ${emailFooter(options, siteHref)}

  </table>
  <!--[if mso]></td></tr></table><![endif]-->

</td>
</tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Plain text — rendered from the same blocks.
// ---------------------------------------------------------------------------
function renderBlockText(block: HbeeEmailBlock): string {
  switch (block.type) {
    case 'paragraph':
      return `${plain(block.text)}\n`
    case 'heading':
      return `\n${plain(block.text).toUpperCase()}\n`
    case 'steps':
      return block.items.map((item, i) => `${i + 1}. ${plain(item)}`).join('\n') + '\n'
    case 'list':
      return block.items.map((item) => `- ${plain(item)}`).join('\n') + '\n'
    case 'facts':
      return block.rows.map((r) => `${plain(r.label)}: ${plain(r.value)}`).join('\n') + '\n'
    case 'callout':
      return (block.title ? `${plain(block.title).toUpperCase()}\n` : '') + `${plain(block.text)}\n`
    case 'link':
      return `${plain(block.label)}: ${emailUrl(block.url)}\n`
    case 'divider':
      return '\n---\n'
  }
}

/** The full HTML document, with no line longer than the mail-safe limit (see foldHtmlLines in layout.ts). */
export function renderHbeeEmailHtml(options: HbeeEmailOptions): string {
  return foldHtmlLines(buildHbeeEmailHtml(options))
}

export function renderHbeeEmailText(options: HbeeEmailOptions): string {
  const lines: string[] = ['HBEE DIGITALS', '']
  if (options.status) lines.push(`[${plain(options.status.label)}]`)
  lines.push(plain(options.heading), '')
  for (const block of options.blocks) lines.push(renderBlockText(block))
  if (options.primaryAction) lines.push('', `${plain(options.primaryAction.label)}: ${emailUrl(options.primaryAction.url)}`)
  lines.push('', 'With thanks,', plain(options.signoff.name))
  if (options.signoff.title) lines.push(plain(options.signoff.title))
  lines.push('', '---', plain(options.reason), supportSentence(options), requireEmailOrigin())
  for (const l of options.footerLinks ?? []) lines.push(`${plain(l.label)}: ${emailUrl(l.url)}`)
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

/** Both bodies at once — spread into the provider payload. */
export function renderHbeeEmail(options: HbeeEmailOptions): { html: string; text: string } {
  return { html: renderHbeeEmailHtml(options), text: renderHbeeEmailText(options) }
}
