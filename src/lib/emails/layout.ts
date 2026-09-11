// src/lib/emails/layout.ts
//
// The single branded layout every Hbee Digitals transactional email renders
// through. Before this, each template carried its own <head>, its own CSS and
// its own hand-written wordmark, so branding, spacing and dark-mode handling
// drifted between them and none of them had a plain-text alternative.
//
// WHAT THIS MODULE OWNS
//   - The outer table shell, header, footer and preheader.
//   - The brand palette and type scale.
//   - HTML escaping of every dynamic value.
//   - A plain-text alternative rendered from the SAME block list as the HTML,
//     so the two cannot fall out of sync.
//
// WHAT IT DOES NOT OWN
//   - Sending. Each template keeps its own Resend call, its own recipient and
//     its own subject, so no template's function contract changes.
//   - Authentication email. Supabase sends confirmation and recovery itself;
//     nothing here duplicates that.
//
// EMAIL-CLIENT CONSTRAINTS THIS RESPECTS
//   - Tables for layout, inline styles on every element. Outlook ignores most
//     of <style>, and Gmail strips it in some contexts.
//   - No flexbox, grid, shorthand background, or external stylesheet.
//   - Absolute https URLs only — a relative src or href is dead in an inbox.
//   - The logo is an <img> with width/height attributes and real alt text, so a
//     client with images off still shows the brand name.
//   - Buttons are table-based, so they render as a filled block in Outlook.

/** Characters that must never reach an email body unescaped. */
const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

/**
 * Escape a dynamic value for HTML. Every interpolation in every template goes
 * through this — merchant names, business names and free-text answers are all
 * attacker-controlled in the sense that they arrive from a public form.
 */
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

/** Plain-text rendering strips markup rather than escaping it. */
function stripTags(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value).replace(/<[^>]*>/g, '').trim()
}

// ---------------------------------------------------------------------------
// Trusted absolute URLs.
//
// THERE IS NO PRODUCTION FALLBACK, DELIBERATELY.
//
// An earlier version fell back to the hard-coded production origin whenever
// NEXT_PUBLIC_SITE_URL was missing or malformed. That silently pointed local and
// preview sends at production: a developer testing a confirmation or portal link
// would have been handed a live URL, and a misconfigured deployment would have
// looked healthy while sending wrong links.
//
// The origin must now be configured explicitly. When it is not, rendering
// raises EmailConfigurationError and the send is abandoned — loudly, in the
// logs — rather than guessing.
//
// It is still read only from configuration, never from a request header: a
// header must not decide where an email points.
// ---------------------------------------------------------------------------

/** Thrown when an actionable email cannot be rendered safely. */
export class EmailConfigurationError extends Error {
  readonly reason: string
  constructor(reason: string, message: string) {
    super(message)
    this.name = 'EmailConfigurationError'
    this.reason = reason
  }
}

/**
 * The configured site origin, or null when it is absent or unusable.
 *
 * Callers that merely want to know the state use this; callers that are about
 * to build a link use requireEmailOrigin() instead.
 */
export function emailOrigin(): string | null {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!configured) return null
  try {
    const url = new URL(configured)
    // Only absolute http(s) origins are usable in an email.
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.origin
  } catch {
    return null
  }
}

/**
 * The configured site origin, or throw.
 *
 * The message names the variable but never its value, so a misconfiguration is
 * diagnosable from the logs without printing configuration into them.
 */
export function requireEmailOrigin(): string {
  const origin = emailOrigin()
  if (!origin) {
    throw new EmailConfigurationError(
      'site_origin_missing',
      'NEXT_PUBLIC_SITE_URL is not set to a valid absolute http(s) origin, so ' +
        'email links cannot be built. Refusing to fall back to production.',
    )
  }
  return origin
}

/** Any leading `scheme:` — http, https, javascript, data, mailto, anything. */
const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i

/**
 * Absolute URL for an in-app path. Always safe to place in an href.
 *
 * Throws EmailConfigurationError when no origin is configured, so an actionable
 * email can never be rendered with a guessed destination.
 */
export function emailUrl(path: string): string {
  const origin = requireEmailOrigin()
  if (!path) return origin

  if (HAS_SCHEME.test(path)) {
    // Anything carrying a scheme is treated as absolute and accepted ONLY if
    // that scheme is http(s). Without this branch a value like
    // "javascript:alert(1)" fell through to the relative case below and was
    // concatenated onto the origin, putting the string into the message body.
    try {
      const url = new URL(path)
      return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : origin
    } catch {
      return origin
    }
  }

  return `${origin}${path.startsWith('/') ? '' : '/'}${path}`
}

// ---------------------------------------------------------------------------
// Brand palette. Restrained on purpose: navy for structure, one orange for the
// single primary action, greys for everything else.
// ---------------------------------------------------------------------------
const C = {
  navy: '#0B1628',
  orange: '#EA580C',
  orangeDark: '#C2410C',
  text: '#1F2937',
  muted: '#64748B',
  faint: '#94A3B8',
  border: '#E4E8EF',
  page: '#F5F7FA',
  card: '#FFFFFF',
  tint: '#F8FAFC',
} as const

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"

// ---------------------------------------------------------------------------
// Content blocks. Both renderers walk the same list, which is what keeps the
// plain-text alternative honest.
// ---------------------------------------------------------------------------
export type EmailBlock =
  | { type: 'paragraph'; text: string; muted?: boolean }
  | { type: 'heading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'facts'; rows: Array<{ label: string; value: string }> }
  | { type: 'callout'; title?: string; text: string }
  | { type: 'reference'; label: string; value: string }
  | { type: 'divider' }

export interface EmailLayoutOptions {
  /** Inbox preview line. Shown after the subject in most clients. */
  preheader: string
  /** Small label above the headline, e.g. "Assessment received". */
  eyebrow?: string
  /** The H1 of the message. */
  heading: string
  blocks: EmailBlock[]
  /** At most ONE primary action per email. */
  cta?: { label: string; url: string }
  /** Optional sign-off name and title. */
  signoff?: { name: string; title: string }
  /**
   * Plain explanation of why this message arrived. Required: every branded
   * email states its own reason rather than leaving the reader to guess.
   */
  reason: string
  /** Support address shown in the footer. */
  supportEmail: string
}

// ---------------------------------------------------------------------------
// HTML renderer
// ---------------------------------------------------------------------------
function renderBlockHtml(block: EmailBlock): string {
  const p = `margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;`

  switch (block.type) {
    case 'heading':
      return `<h2 style="margin:28px 0 12px;font-family:${FONT};font-size:18px;line-height:1.4;font-weight:700;color:${C.navy};">${escapeHtml(
        block.text,
      )}</h2>`

    case 'paragraph':
      return `<p style="${p}color:${block.muted ? C.muted : C.text};">${escapeHtml(block.text)}</p>`

    case 'list':
      return (
        `<ul style="margin:0 0 16px;padding-left:20px;font-family:${FONT};font-size:16px;line-height:1.6;color:${C.text};">` +
        block.items
          .map((item) => `<li style="margin:0 0 8px;">${escapeHtml(item)}</li>`)
          .join('') +
        `</ul>`
      )

    case 'facts':
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:collapse;">` +
        block.rows
          .map(
            (row) =>
              `<tr>` +
              `<td style="padding:8px 12px 8px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.muted};vertical-align:top;width:40%;">${escapeHtml(
                row.label,
              )}</td>` +
              `<td style="padding:8px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.text};font-weight:600;vertical-align:top;">${escapeHtml(
                row.value,
              )}</td>` +
              `</tr>`,
          )
          .join('') +
        `</table>`
      )

    case 'callout':
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:separate;">` +
        `<tr><td style="padding:16px 18px;background-color:${C.tint};border:1px solid ${C.border};border-radius:10px;">` +
        (block.title
          ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:14px;line-height:1.4;font-weight:700;color:${C.navy};">${escapeHtml(
              block.title,
            )}</p>`
          : '') +
        `<p style="margin:0;font-family:${FONT};font-size:14px;line-height:1.6;color:${C.muted};">${escapeHtml(
          block.text,
        )}</p>` +
        `</td></tr></table>`
      )

    case 'reference':
      return (
        `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:0 0 20px;border-collapse:separate;">` +
        `<tr><td align="center" style="padding:16px;background-color:${C.tint};border:1px solid ${C.border};border-radius:10px;">` +
        `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;line-height:1.4;letter-spacing:0.08em;text-transform:uppercase;color:${C.faint};">${escapeHtml(
          block.label,
        )}</p>` +
        `<p style="margin:0;font-family:'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace;font-size:14px;line-height:1.5;color:${C.navy};word-break:break-all;">${escapeHtml(
          block.value,
        )}</p>` +
        `</td></tr></table>`
      )

    case 'divider':
      return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="padding:8px 0 24px;"><div style="height:1px;background-color:${C.border};line-height:1px;font-size:0;">&nbsp;</div></td></tr></table>`
  }
}

function renderCtaHtml(cta: { label: string; url: string }): string {
  const href = emailUrl(cta.url)
  // Table-based so Outlook renders a real filled block rather than a bare link.
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;border-collapse:separate;">` +
    `<tr><td align="center" style="border-radius:8px;background-color:${C.orange};">` +
    `<a href="${escapeHtml(href)}" target="_blank" rel="noopener" ` +
    `style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:700;line-height:1;color:#FFFFFF;text-decoration:none;border-radius:8px;border:1px solid ${C.orangeDark};">` +
    `${escapeHtml(cta.label)}</a>` +
    `</td></tr></table>`
  )
}

export function renderEmailHtml(options: EmailLayoutOptions): string {
  const logoSrc = emailUrl('/email/hbee-logo.png')
  const siteHref = requireEmailOrigin()

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="x-apple-disable-message-reformatting" />
<meta name="color-scheme" content="light" />
<meta name="supported-color-schemes" content="light" />
<title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;width:100%;background-color:${C.page};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

<!-- Preheader: the inbox preview line. Hidden in the body, then padded so the
     client does not pull the following copy into the preview. -->
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.page};opacity:0;">
${escapeHtml(options.preheader)}
${'&#8199;&#65279;&#847; '.repeat(30)}
</div>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:${C.page};border-collapse:collapse;">
<tr>
<td align="center" style="padding:24px 12px;">

  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;border-collapse:collapse;">

    <!-- Header -->
    <tr>
      <td align="center" style="padding:8px 0 20px;">
        <a href="${escapeHtml(siteHref)}" target="_blank" rel="noopener" style="text-decoration:none;">
          <img src="${escapeHtml(logoSrc)}" width="44" height="44" alt="Hbee Digitals"
               style="display:block;margin:0 auto 10px;width:44px;height:44px;border:0;outline:none;text-decoration:none;" />
          <span style="font-family:${FONT};font-size:18px;font-weight:800;color:${C.navy};letter-spacing:-0.01em;">Hbee&nbsp;Digitals</span>
        </a>
      </td>
    </tr>

    <!-- Card -->
    <tr>
      <td style="background-color:${C.card};border:1px solid ${C.border};border-radius:14px;padding:32px 28px;">
        ${
          options.eyebrow
            ? `<p style="margin:0 0 10px;font-family:${FONT};font-size:12px;font-weight:700;line-height:1.3;letter-spacing:0.09em;text-transform:uppercase;color:${C.orange};">${escapeHtml(
                options.eyebrow,
              )}</p>`
            : ''
        }
        <h1 style="margin:0 0 20px;font-family:${FONT};font-size:23px;line-height:1.3;font-weight:800;color:${C.navy};">${escapeHtml(
          options.heading,
        )}</h1>

        ${options.blocks.map(renderBlockHtml).join('\n        ')}

        ${options.cta ? renderCtaHtml(options.cta) : ''}

        ${
          options.signoff
            ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
          <tr><td style="padding-top:8px;border-top:1px solid ${C.border};">
            <p style="margin:16px 0 0;font-family:${FONT};font-size:15px;line-height:1.5;color:${C.text};">
              <strong style="color:${C.navy};">${escapeHtml(options.signoff.name)}</strong><br />
              <span style="color:${C.muted};font-size:14px;">${escapeHtml(options.signoff.title)}</span>
            </p>
          </td></tr>
        </table>`
            : ''
        }
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="padding:22px 20px 8px;">
        <p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">${escapeHtml(
          options.reason,
        )}</p>
        <p style="margin:0 0 10px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};">
          Questions? Reply to this email or write to
          <a href="mailto:${escapeHtml(options.supportEmail)}" style="color:${C.orange};text-decoration:underline;">${escapeHtml(
            options.supportEmail,
          )}</a>.
        </p>
        <p style="margin:0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.faint};">
          <a href="${escapeHtml(siteHref)}" target="_blank" rel="noopener" style="color:${C.faint};text-decoration:underline;">hbeedigitals.com</a>
          &nbsp;&middot;&nbsp; &copy; ${new Date().getFullYear()} Hbee Digitals
        </p>
      </td>
    </tr>

  </table>

</td>
</tr>
</table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Plain-text renderer — built from the same blocks, so it always matches.
// ---------------------------------------------------------------------------
function renderBlockText(block: EmailBlock): string {
  switch (block.type) {
    case 'heading':
      return `\n${stripTags(block.text).toUpperCase()}\n`
    case 'paragraph':
      return `${stripTags(block.text)}\n`
    case 'list':
      return block.items.map((i) => `  - ${stripTags(i)}`).join('\n') + '\n'
    case 'facts':
      return block.rows.map((r) => `  ${stripTags(r.label)}: ${stripTags(r.value)}`).join('\n') + '\n'
    case 'callout':
      return (block.title ? `[${stripTags(block.title)}]\n` : '') + `${stripTags(block.text)}\n`
    case 'reference':
      return `${stripTags(block.label)}: ${stripTags(block.value)}\n`
    case 'divider':
      return '\n---\n'
  }
}

export function renderEmailText(options: EmailLayoutOptions): string {
  const lines: string[] = []
  lines.push('HBEE DIGITALS')
  lines.push('')
  if (options.eyebrow) lines.push(stripTags(options.eyebrow).toUpperCase())
  lines.push(stripTags(options.heading))
  lines.push('')
  for (const block of options.blocks) lines.push(renderBlockText(block))
  if (options.cta) {
    lines.push('')
    lines.push(`${stripTags(options.cta.label)}: ${emailUrl(options.cta.url)}`)
  }
  if (options.signoff) {
    lines.push('')
    lines.push(stripTags(options.signoff.name))
    lines.push(stripTags(options.signoff.title))
  }
  lines.push('')
  lines.push('---')
  lines.push(stripTags(options.reason))
  lines.push(`Questions? Reply to this email or write to ${options.supportEmail}.`)
  lines.push(requireEmailOrigin())
  return lines.join('\n').replace(/\n{3,}/g, '\n\n')
}

/** Both bodies at once. Templates spread this straight into resend.emails.send. */
export function renderEmail(options: EmailLayoutOptions): { html: string; text: string } {
  return { html: renderEmailHtml(options), text: renderEmailText(options) }
}

// ---------------------------------------------------------------------------
// Send outcome.
//
// Every template returns one of these. The value is additive — existing callers
// that ignore the return keep working unchanged — but it lets a caller, and the
// logs, distinguish the three cases that matter:
//
//   sent          the message reached Resend
//   skipped       Resend is not configured at all (ordinary in local dev)
//   configuration the message COULD NOT be built safely, e.g. no site origin
//   failed        Resend rejected it or the request threw
//
// A non-'sent' outcome NEVER means the caller should discard its own work. An
// assessment that was stored successfully stays stored; the email is a separate
// concern and its failure is reported, not escalated.
// ---------------------------------------------------------------------------
export type EmailOutcome = 'sent' | 'skipped' | 'configuration' | 'failed'

export interface EmailSendResult {
  ok: boolean
  outcome: EmailOutcome
  /** Short machine-readable reason, safe to log. Never contains configuration values. */
  reason?: string
  /**
   * The provider's id for an ACCEPTED message. Acceptance is not delivery —
   * see recordEmailLog() in email-log.ts.
   */
  providerId?: string | null
}

/**
 * Descriptor for the durable attempt record. Optional: a caller that passes
 * none still gets the same outcome, just without a row in email_logs.
 */
export interface DeliverLogDescriptor {
  templateSlug: string
  recipientEmail: string
  recipientName?: string | null
  subject: string
  sentBy?: string | null
  relatedInquiryId?: string | null
}

/**
 * Reads a Resend `{ data, error }` envelope.
 *
 * THIS IS A REAL BUG FIX, not defensive padding. The Resend SDK RESOLVES with
 * `{ data: null, error: {...} }` when the provider rejects a message — it only
 * throws for transport-level failures. The previous implementation awaited the
 * send and returned `{ ok: true, outcome: 'sent' }` unconditionally, so an
 * invalid recipient, an unverified sender or a rate-limit rejection was
 * reported to the caller as a successful send. Every provider rejection is now
 * surfaced as `failed`.
 */
function readProviderEnvelope(
  result: unknown,
): { rejected: false; providerId: string | null } | { rejected: true; message: string } {
  if (!result || typeof result !== 'object') return { rejected: false, providerId: null }

  const envelope = result as { data?: { id?: unknown } | null; error?: unknown }

  if ('error' in envelope && envelope.error) {
    const error = envelope.error as { message?: unknown; name?: unknown }
    const message =
      (typeof error.message === 'string' && error.message) ||
      (typeof error.name === 'string' && error.name) ||
      'provider rejected the message'
    return { rejected: true, message }
  }

  const id = envelope.data?.id
  return { rejected: false, providerId: typeof id === 'string' ? id : null }
}

/**
 * Wrap a template's render+send so a configuration problem is reported rather
 * than thrown at the caller, and never silently swallowed.
 *
 * `context` names the template for the log line. Nothing secret is logged: the
 * EmailConfigurationError message names variables, never their values, and
 * transport errors are reduced to their message.
 *
 * When `log` is supplied, every attempt — accepted or failed — is recorded in
 * email_logs so admins can see what happened without reading server logs. The
 * recording is best-effort and can never change the outcome returned here.
 *
 * `send` should RETURN the provider's response so a rejection can be detected.
 * A callback that returns nothing still works; it simply cannot be checked.
 */
export async function deliver(
  context: string,
  send: () => Promise<unknown>,
  log?: DeliverLogDescriptor,
): Promise<EmailSendResult> {
  const record = async (
    state: 'accepted' | 'failed' | 'configuration_error',
    resendId: string | null,
    errorMessage: string | null,
  ) => {
    if (!log) return
    try {
      // Imported lazily so this module stays free of the privileged client
      // unless an attempt is actually being recorded.
      const { recordEmailLog } = await import('@/lib/emails/email-log')
      await recordEmailLog(log, { state, resendId, errorMessage })
    } catch (error) {
      console.warn(`[email:${context}] attempt could not be recorded:`, error)
    }
  }

  try {
    const result = await send()
    const envelope = readProviderEnvelope(result)

    if (envelope.rejected) {
      console.error(`[email:${context}] NOT SENT — provider rejected: ${envelope.message}`)
      await record('failed', null, envelope.message)
      return { ok: false, outcome: 'failed', reason: 'provider_rejected' }
    }

    await record('accepted', envelope.providerId, null)
    return { ok: true, outcome: 'sent', providerId: envelope.providerId }
  } catch (error) {
    if (error instanceof EmailConfigurationError) {
      // Loud, actionable, and safe to put in a log or an admin surface.
      console.error(
        `[email:${context}] NOT SENT — configuration error (${error.reason}): ${error.message}`,
      )
      // A configuration failure means the message was never built, let alone
      // handed to a provider. It is still recorded, so the admin view shows
      // that an expected email did not go out rather than showing nothing.
      await record('configuration_error', null, 'configuration: ' + error.reason)
      return { ok: false, outcome: 'configuration', reason: error.reason }
    }
    const message = error instanceof Error ? error.message : 'unknown error'
    console.error(`[email:${context}] NOT SENT — delivery failed: ${message}`)
    await record('failed', null, message)
    return { ok: false, outcome: 'failed', reason: 'delivery_failed' }
  }
}

// ---------------------------------------------------------------------------
// Sender identity.
//
// The verified sending address stays exactly as configured — this module never
// substitutes one. replyTo is applied ONLY when RESEND_REPLY_TO_EMAIL is set,
// because an unverified or unmonitored reply address is worse than none. No
// address is hard-coded here.
// ---------------------------------------------------------------------------
export const DEFAULT_FROM = 'Hbee Digitals <noreply@send.hbeedigitals.com>'

export function emailFrom(): string {
  return process.env.RESEND_FROM_EMAIL || DEFAULT_FROM
}

/** Spread into the Resend payload; contributes nothing when unconfigured. */
export function emailReplyTo(): { replyTo: string } | Record<string, never> {
  const configured = process.env.RESEND_REPLY_TO_EMAIL?.trim()
  return configured ? { replyTo: configured } : {}
}

/**
 * The support address shown in the footer.
 *
 * Falls back to the documented Hbee support inbox. It is display-only — it is
 * never used as the sending identity, so it does not need domain verification.
 */
export function supportEmail(): string {
  return process.env.RESEND_REPLY_TO_EMAIL?.trim() || 'hello@hbeedigitals.com'
}
