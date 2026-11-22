// src/lib/commerce/transactional-email.ts
//
// SERVER-ONLY. The three client emails that go with an in-app notification: proposal sent / revised, invoice issued, payment recorded.
//
//   important event  →  in-app notification (notify.ts, unchanged)  →  one transactional email (this module)
//
// These are TRANSACTIONAL account / service messages. No preference, marketing flag or "email notifications" setting gates them.
//
// THE BUSINESS ACTION IS AUTHORITATIVE. Every function here is called AFTER the database transaction that caused it has committed,
// never throws, and reports a small safe result for the Admin page. A failed email never undoes, blocks or fails the proposal,
// invoice or payment. There is NO automatic retry: a failure is logged once and stops.
//
// REUSE, NOT A NEW FRAMEWORK. Rendering is the Hbee email system (hbee-email.ts); sending, the outcome and the durable attempt
// record are layout.ts `deliver()` → email_logs (email-log.ts). Nothing here adds a table or a column.
//
// WHO RECEIVES IT. The address is read on the server from the client's own record (clients.email). No address is ever accepted from
// the browser for these events.
//
// DUPLICATES. Each send carries a Resend idempotency key bound to the exact entity (proposal VERSION, invoice, payment), so a
// repeated request inside the provider's window returns the first message instead of mailing again. Underneath that, the business
// operations are already one-shot: send_proposal / issue_invoice refuse a second run, and record_invoice_payment reports a retried
// payment as `duplicate`, which the route does not email.
//
// CONTENT. Short, factual and linked: the portal and its PDF remain the source of truth. The invoice PDF is NOT attached (there is no
// proven attachment pattern in the email framework); the client downloads it from the portal.

import { Resend } from 'resend'
import { configuredReplyTo, deliver, emailFrom, supportEmail, type EmailSendResult } from '@/lib/emails/layout'
import { cleanText, renderHbeeEmail, type HbeeEmailBlock, type HbeeEmailOptions } from '@/lib/emails/hbee-email'
import { formatMoney } from '@/lib/commerce/money'
import type { EmailFeedback } from '@/lib/commerce/email-feedback'

if (typeof window !== 'undefined') {
  throw new Error('transactional-email.ts is server-only and must not be imported by client code')
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
/** A hung provider call must not hold the Admin request open for long. One bounded attempt, no retry. */
const SEND_TIMEOUT_MS = 8000

// ── recipient ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface Recipient {
  email: string
  firstName: string
  displayName: string | null
}

/** The client's address and first name, from the server-side client record. Null when there is no usable address. */
export async function loadRecipient(db: any, clientId: string): Promise<Recipient | null> {
  if (!UUID_RE.test(String(clientId || ''))) return null
  const { data, error } = await db.from('clients').select('email, full_name, business_name').eq('id', clientId).maybeSingle()
  if (error || !data) return null
  const email = typeof data.email === 'string' ? data.email.trim() : ''
  if (!EMAIL_RE.test(email)) return null
  const full = cleanText(data.full_name)
  return { email, firstName: full.split(' ')[0] || 'there', displayName: full || cleanText(data.business_name) || null }
}

// ── formatting ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** A date-only value (YYYY-MM-DD) as "5 December 2030". Fixed to UTC so the day never shifts with the server's time zone. */
export function emailDate(value: unknown): string | null {
  const m = typeof value === 'string' ? value.trim().match(/^(\d{4}-\d{2}-\d{2})/) : null
  if (!m) return null
  const d = new Date(`${m[1]}T00:00:00Z`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })
}

const title120 = (v: unknown) => cleanText(v).slice(0, 120) || 'your proposal'

function common(): Pick<HbeeEmailOptions, 'signoff' | 'supportEmail' | 'repliesMonitored'> {
  const replyTo = configuredReplyTo()
  return { signoff: { name: 'The Hbee Digitals Team' }, supportEmail: replyTo?.address ?? supportEmail(), repliesMonitored: replyTo !== null }
}

type Built = HbeeEmailOptions & { subject: string }

// ── 1. proposal sent / revised ─────────────────────────────────────────────────────────────────────────────────────────────
export interface ProposalEmailData {
  firstName: string
  proposalId: string
  number: string
  title: string
  revised: boolean
  version: number
}

export function buildProposalEmail(d: ProposalEmailData): Built {
  const title = title120(d.title)
  const number = cleanText(d.number)
  const blocks: HbeeEmailBlock[] = d.revised
    ? [
        { type: 'paragraph', text: `Hi ${cleanText(d.firstName) || 'there'},` },
        { type: 'paragraph', text: `We’ve updated your proposal for ${title}. The newest version${d.version > 1 ? ` (version ${d.version})` : ''} is ready for you to review.` },
        { type: 'paragraph', text: 'Open it in your portal to see what changed in the scope, pricing, payment terms and proposal details. You can then approve it, ask for further changes or decline.' },
      ]
    : [
        { type: 'paragraph', text: `Hi ${cleanText(d.firstName) || 'there'},` },
        { type: 'paragraph', text: `Your proposal for ${title} is ready to review.` },
        { type: 'paragraph', text: 'In your portal you can read the scope, pricing, payment terms and proposal details, then approve it, ask for changes or decline.' },
      ]
  if (number) blocks.push({ type: 'facts', rows: [{ label: 'Proposal', value: number }, { label: 'Title', value: title }] })
  return {
    subject: d.revised ? `Your revised Hbee Digitals proposal is ready — ${title}` : `Your Hbee Digitals proposal is ready — ${title}`,
    preheader: d.revised ? 'The newest version of your proposal is ready to review.' : 'Review the scope, pricing and payment terms in your portal.',
    status: { tone: 'review', label: d.revised ? 'Revised proposal' : 'Proposal ready', ...(number ? { detail: number } : {}) },
    heading: d.revised ? 'Your revised proposal is ready.' : 'Your proposal is ready to review.',
    blocks,
    primaryAction: { label: d.revised ? 'Review revised proposal' : 'Review proposal', url: `/client-portal/proposals/${d.proposalId}` },
    reason: 'You’re receiving this because Hbee Digitals sent you a proposal. It’s an account notification, so it isn’t affected by marketing preferences.',
    ...common(),
  }
}

// ── 2. invoice issued ──────────────────────────────────────────────────────────────────────────────────────────────────────
export interface InvoiceEmailData {
  firstName: string
  invoiceId: string
  number: string
  total: string
  balance: string
  currency: string
  dueDate: string | null
}

export function buildInvoiceIssuedEmail(d: InvoiceEmailData): Built {
  const number = cleanText(d.number)
  const due = emailDate(d.dueDate)
  const rows = [
    { label: 'Invoice', value: number },
    { label: 'Total', value: formatMoney(d.total, d.currency) },
    { label: 'Balance due', value: formatMoney(d.balance, d.currency) },
    { label: 'Due date', value: due ?? 'See your invoice' },
    { label: 'Currency', value: cleanText(d.currency) },
  ]
  return {
    subject: `Invoice ${number} from Hbee Digitals`,
    preheader: `${formatMoney(d.balance, d.currency)} due${due ? ` by ${due}` : ''}.`,
    status: { tone: 'info', label: 'Invoice issued', detail: number },
    heading: `Invoice ${number}`,
    blocks: [
      { type: 'paragraph', text: `Hi ${cleanText(d.firstName) || 'there'},` },
      { type: 'paragraph', text: `Hbee Digitals has issued invoice ${number}. The summary is below; open the invoice in your portal for the line items, payment instructions and a secure PDF download.` },
      { type: 'facts', rows },
    ],
    primaryAction: { label: 'View invoice', url: `/client-portal/invoices/${d.invoiceId}` },
    reason: 'You’re receiving this because Hbee Digitals issued an invoice on your account. It’s an account notification, so it isn’t affected by marketing preferences.',
    ...common(),
  }
}

// ── 3. payment recorded ────────────────────────────────────────────────────────────────────────────────────────────────────
export interface PaymentEmailData {
  firstName: string
  invoiceId: string
  number: string
  amount: string
  paidAt: string | null
  balance: string
  currency: string
  /** The invoice status after this payment (paid or partially_paid). */
  invoiceStatus: string
}

export function buildPaymentRecordedEmail(d: PaymentEmailData): Built {
  const number = cleanText(d.number)
  const paid = d.invoiceStatus === 'paid'
  const when = emailDate(d.paidAt)
  const amount = formatMoney(d.amount, d.currency)
  const blocks: HbeeEmailBlock[] = [
    { type: 'paragraph', text: `Hi ${cleanText(d.firstName) || 'there'},` },
    { type: 'paragraph', text: `Hbee Digitals has recorded a payment of ${amount} on invoice ${number}${when ? `, dated ${when}` : ''}.` },
    paid
      ? { type: 'paragraph', text: 'The invoice is now paid in full and nothing further is due. Thank you.' }
      : { type: 'paragraph', text: `The remaining balance on this invoice is ${formatMoney(d.balance, d.currency)}.` },
    {
      type: 'facts',
      rows: [
        { label: 'Invoice', value: number },
        { label: 'Payment recorded', value: amount },
        ...(when ? [{ label: 'Payment date', value: when }] : []),
        { label: 'Remaining balance', value: formatMoney(d.balance, d.currency) },
        { label: 'Invoice status', value: paid ? 'Paid' : 'Partially paid' },
      ],
    },
    { type: 'paragraph', tone: 'muted', text: 'This confirms that Hbee Digitals recorded the payment on your account. It is not a payment-processor receipt.' },
  ]
  return {
    subject: `Payment recorded for invoice ${number}`,
    preheader: paid ? `Invoice ${number} is now paid in full.` : `${amount} recorded. ${formatMoney(d.balance, d.currency)} remaining.`,
    status: { tone: 'approved', label: paid ? 'Invoice paid' : 'Payment recorded', detail: number },
    heading: paid ? 'Your invoice is now paid.' : 'We’ve recorded your payment.',
    blocks,
    primaryAction: { label: 'View invoice', url: `/client-portal/invoices/${d.invoiceId}` },
    reason: 'You’re receiving this because Hbee Digitals recorded a payment on your account. It’s an account notification, so it isn’t affected by marketing preferences.',
    ...common(),
  }
}

// ── sending ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
interface SendInput {
  slug: string
  built: Built
  to: Recipient
  /** Binds the provider's de-duplication to the exact entity. */
  idempotencyKey: string
  sentBy: string | null
}

async function sendOne(i: SendInput): Promise<EmailSendResult> {
  return deliver(
    i.slug,
    async () => {
      const { subject, ...options } = i.built
      const { html, text } = renderHbeeEmail(options)
      const replyTo = configuredReplyTo()
      // Constructed here, not at import: a missing key becomes a logged, reported failure instead of breaking the route.
      const resend = new Resend(process.env.RESEND_API_KEY)
      const send = resend.emails.send(
        { from: emailFrom(), ...(replyTo ? { replyTo: replyTo.header } : {}), to: i.to.email, subject, html, text },
        { idempotencyKey: i.idempotencyKey },
      )
      let timer: ReturnType<typeof setTimeout> | undefined
      const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), SEND_TIMEOUT_MS)
      })
      try {
        return await Promise.race([send, timeout])
      } finally {
        if (timer) clearTimeout(timer)
      }
    },
    { templateSlug: i.slug, recipientEmail: i.to.email, recipientName: i.to.displayName, subject: i.built.subject, sentBy: i.sentBy },
  )
}

/** A delivery result as the SAFE shape the Admin page receives. Provider text never leaves the server. */
function feedbackOf(result: EmailSendResult): EmailFeedback {
  if (result.ok) return { status: 'sent', reason: 'accepted' }
  if (result.outcome === 'configuration') return { status: 'failed', reason: 'configuration' }
  if (result.reason === 'provider_rejected') return { status: 'failed', reason: 'provider_rejected' }
  return { status: 'failed', reason: 'delivery_failed' }
}

const unexpected = (what: string, error: unknown): EmailFeedback => {
  console.error(`[commerce-email] ${what} failed unexpectedly:`, error instanceof Error ? error.message : 'unknown')
  return { status: 'failed', reason: 'unexpected' }
}

const noRecipient = (what: string, clientId: string): EmailFeedback => {
  console.error(`[commerce-email] ${what}: no usable email address on file for client ${clientId} — nothing sent`)
  return { status: 'failed', reason: 'no_recipient' }
}

// ── orchestrators (what the routes call) ─────────────────────────────────────────────────────────────────────────────────
export async function emailProposalSent(
  db: any,
  o: { clientId: string; proposalId: string; versionId: string; number: string; title: string; version: number; revised: boolean; sentBy?: string | null },
): Promise<EmailFeedback> {
  try {
    const to = await loadRecipient(db, o.clientId)
    if (!to) return noRecipient('proposal email', o.clientId)
    const built = buildProposalEmail({ firstName: to.firstName, proposalId: o.proposalId, number: o.number, title: o.title, revised: o.revised, version: o.version })
    // Keyed on the VERSION: a revision is a new version and is mailed; a repeat of the same send is not.
    return feedbackOf(await sendOne({ slug: o.revised ? 'proposal-revised' : 'proposal-sent', built, to, idempotencyKey: `proposal-sent:${o.versionId}`, sentBy: o.sentBy ?? null }))
  } catch (error) {
    return unexpected('proposal email', error)
  }
}

export async function emailInvoiceIssued(
  db: any,
  o: { clientId: string; invoiceId: string; number: string; amount: string; currency: string; sentBy?: string | null },
): Promise<EmailFeedback> {
  try {
    const to = await loadRecipient(db, o.clientId)
    if (!to) return noRecipient('invoice email', o.clientId)
    // The due date is read from the issued invoice itself (authoritative); a failed read leaves it out rather than blocking the email.
    const { data: inv } = await db.from('project_invoices').select('due_date, status').eq('id', o.invoiceId).maybeSingle()
    // Never mail a draft or a voided invoice, whatever called us.
    if (inv && (inv.status === 'draft' || inv.status === 'void')) return { status: 'failed', reason: 'unexpected' }
    const built = buildInvoiceIssuedEmail({ firstName: to.firstName, invoiceId: o.invoiceId, number: o.number, total: o.amount, balance: o.amount, currency: o.currency, dueDate: inv?.due_date ?? null })
    return feedbackOf(await sendOne({ slug: 'invoice-issued', built, to, idempotencyKey: `invoice-issued:${o.invoiceId}`, sentBy: o.sentBy ?? null }))
  } catch (error) {
    return unexpected('invoice email', error)
  }
}

export async function emailPaymentRecorded(
  db: any,
  o: { clientId: string; invoiceId: string; paymentId: string; number: string; currency: string; balance: string; invoiceStatus: string; fallbackAmount: string; fallbackPaidAt: string; sentBy?: string | null },
): Promise<EmailFeedback> {
  try {
    const to = await loadRecipient(db, o.clientId)
    if (!to) return noRecipient('payment email', o.clientId)
    // The recorded amount and date come from the ledger row itself; the validated request values are only a fallback.
    const { data: pay } = await db.from('invoice_payments').select('amount, paid_at').eq('id', o.paymentId).maybeSingle()
    const built = buildPaymentRecordedEmail({
      firstName: to.firstName, invoiceId: o.invoiceId, number: o.number, amount: String(pay?.amount ?? o.fallbackAmount), paidAt: String(pay?.paid_at ?? o.fallbackPaidAt),
      balance: o.balance, currency: o.currency, invoiceStatus: o.invoiceStatus,
    })
    return feedbackOf(await sendOne({ slug: 'payment-recorded', built, to, idempotencyKey: `payment-recorded:${o.paymentId}`, sentBy: o.sentBy ?? null }))
  } catch (error) {
    return unexpected('payment email', error)
  }
}
