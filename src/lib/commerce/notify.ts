// src/lib/commerce/notify.ts
//
// SERVER-ONLY. Every S6.4 notification, through the one existing writer (createNotification). Each call names a
// deterministic entity so its idempotency key is stable under retries — and, where the SAME document can legitimately
// notify more than once, the entity is the thing that differs:
//
//   proposal sent / revised   entity = the proposal VERSION  (a revision notifies; a retry of the same send does not)
//   changes requested         entity = the response row
//   approved / declined       entity = the proposal         (once)
//   invoice issued / paid     entity = the invoice          (once)
//   payment recorded          entity = the payment          (one per payment)
//
// A notification is created AFTER the database transaction that caused it has committed, and a failure to create it never
// fails the action: it is logged and reported to the caller only as `notified: false`.

import { createNotification } from '@/lib/notifications/createNotification'

if (typeof window !== 'undefined') {
  throw new Error('notify.ts is server-only and must not be imported by client code')
}

const short = (s: unknown, n = 120) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n)

async function send(p: Parameters<typeof createNotification>[0]): Promise<boolean> {
  const r = await createNotification(p)
  if (!r.ok) console.error(`⚠️ [commerce] notification ${p.type} not created (${r.skipped ?? 'unknown'})`)
  return r.ok === true
}

export const notifyProposalSent = (o: { clientId: string; proposalId: string; versionId: string; number: string; title: string; revised: boolean; version: number }) =>
  send({
    scope: 'client',
    recipientId: o.clientId,
    type: o.revised ? 'proposal_revised' : 'proposal_sent',
    title: o.revised ? 'A revised proposal from Hbee Digitals' : 'New Proposal from Hbee Digitals',
    message: `${o.revised ? `Proposal ${short(o.number)} was revised (version ${o.version}).` : `Hbee Digitals has sent you proposal ${short(o.number)}.`} Review it and approve, request changes or decline.`,
    entityType: 'proposal_version',
    entityId: o.versionId,
    link: `/client-portal/proposals/${o.proposalId}`,
  })

export const notifyAdminProposalDecision = (o: { kind: 'approved' | 'declined' | 'changes_requested'; proposalId: string; entityId: string; clientLabel: string; number: string; reasonPreview?: string }) =>
  send({
    scope: 'admin',
    recipientId: null,
    type: `proposal_${o.kind}`,
    title: o.kind === 'approved' ? 'Proposal Approved' : o.kind === 'declined' ? 'Proposal Declined' : 'Changes Requested on a Proposal',
    message: `${short(o.clientLabel, 80)} ${o.kind === 'approved' ? 'approved' : o.kind === 'declined' ? 'declined' : 'requested changes to'} proposal ${short(o.number)}${o.reasonPreview ? `: ${short(o.reasonPreview, 300)}` : ''}`,
    entityType: o.kind === 'changes_requested' ? 'proposal_response' : 'proposal',
    entityId: o.entityId,
    link: `/admin/proposals/${o.proposalId}`,
  })

export const notifyInvoiceIssued = (o: { clientId: string; invoiceId: string; number: string }) =>
  send({
    scope: 'client',
    recipientId: o.clientId,
    type: 'invoice_issued',
    title: 'New invoice from Hbee Digitals',
    message: `Invoice ${short(o.number)} has been issued. You can view it and download the PDF in your portal.`,
    entityType: 'project_invoice',
    entityId: o.invoiceId,
    link: `/client-portal/invoices/${o.invoiceId}`,
  })

export const notifyPaymentRecorded = (o: { clientId: string; invoiceId: string; paymentId: string; number: string; paid: boolean }) =>
  send({
    scope: 'client',
    recipientId: o.clientId,
    type: o.paid ? 'invoice_paid' : 'payment_recorded',
    title: o.paid ? 'Invoice paid in full' : 'Payment received',
    message: o.paid ? `Invoice ${short(o.number)} is now paid in full. Thank you.` : `We recorded a payment on invoice ${short(o.number)}.`,
    entityType: o.paid ? 'project_invoice' : 'invoice_payment',
    entityId: o.paid ? o.invoiceId : o.paymentId,
    link: `/client-portal/invoices/${o.invoiceId}`,
  })
