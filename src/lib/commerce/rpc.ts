// src/lib/commerce/rpc.ts
//
// SERVER-ONLY. One place that turns the jsonb outcome of the S6.4 database functions into an HTTP answer, so every route
// reports the same failure the same way and none of them invents its own vocabulary. The functions return a `status`
// (never raise for an expected refusal); anything unexpected is a PostgREST error and becomes a generic 500 with only the
// SQLSTATE logged — never the message, which can echo row data.

import { NextResponse } from 'next/server'
import { generateProjectReference } from '@/lib/projects/project-reference'

if (typeof window !== 'undefined') {
  throw new Error('rpc.ts is server-only and must not be imported by client code')
}

export type Outcome = Record<string, any> & { status: string }

/** [HTTP status, message shown to the caller]. A status not listed here is treated as success by `refusal()`. */
const REFUSALS: Record<string, [number, string]> = {
  not_found: [404, 'Not found'],
  proposal_not_found: [404, 'Not found'],
  invalid: [400, 'Some of the values are not valid.'],
  invalid_amount: [400, 'Enter an amount greater than zero with at most two decimals.'],
  invalid_date: [400, 'Enter a valid date (not in the future).'],
  invalid_reason: [400, 'Write a short message (up to 2000 characters).'],
  invalid_discount: [409, 'The discount cannot be more than the subtotal.'],
  invalid_expiry: [409, 'The expiry date must be in the future.'],
  reference_required: [500, 'A project reference could not be generated. Please try again.'],
  not_editable: [409, 'This proposal can no longer be edited. Once a proposal has been sent its commercial terms are fixed; request changes to create a new revision.'],
  not_sendable: [409, 'This proposal cannot be sent from its current status.'],
  client_not_linked: [409, 'This proposal is not linked to a client portal account yet, so it cannot be sent. Link the merchant to a client account first.'],
  no_line_items: [409, 'Add at least one line item first.'],
  not_allowed: [409, 'That action is not available for this proposal in its current status.'],
  version_mismatch: [409, 'This proposal was revised after you opened it. Reload to review the latest version.'],
  expired: [409, "This proposal's validity period has ended. Please contact Hbee Digitals if you would like to revisit it."],
  no_version: [409, 'This proposal has no sent version to act on.'],
  invalid_project_link: [409, 'This proposal is linked to a project that cannot be used. Contact support.'],
  not_approved: [409, 'Only an approved proposal can be converted to a project.'],
  proposal_not_approved: [409, 'Only an approved proposal can be invoiced.'],
  no_approved_version: [409, 'The approved version of this proposal could not be found.'],
  project_mismatch: [409, 'The proposal is not linked to that project.'],
  not_client_project: [409, 'This is not a client project, so it cannot be invoiced.'],
  already_invoiced: [409, 'This proposal already has an invoice. Void it first if it must be replaced.'],
  not_draft: [409, 'Only a draft invoice can be changed or issued.'],
  due_date_required: [409, 'Set a due date before issuing.'],
  due_before_issue: [409, 'The due date cannot be before the issue date.'],
  zero_total: [409, 'An invoice must have a total greater than zero.'],
  not_payable: [409, 'Payments can only be recorded against an issued, unpaid invoice.'],
  void: [409, 'This invoice is void.'],
  overpayment: [409, 'That payment is more than the remaining balance.'],
  not_voidable: [409, 'This invoice can no longer be voided.'],
  has_payments: [409, 'An invoice with recorded payments cannot be voided.'],
  suspended: [403, 'This portal account is currently unavailable. Please contact Hbee Digitals.'],
  not_connected: [403, 'Your portal account is not connected to a Hbee business record yet.'],
}

/** A refusal as a NextResponse, or null when the outcome's status is one of `okStatuses`. */
export function refusal(outcome: Outcome | null | undefined, okStatuses: string[]): NextResponse | null {
  const status = outcome?.status
  if (typeof status === 'string' && okStatuses.includes(status)) return null
  const [http, message] = (status && REFUSALS[status]) || [500, 'The action could not be completed. Please try again.']
  const body: Record<string, unknown> = { error: message, code: status ?? 'unknown' }
  if (outcome?.field) body.field = outcome.field
  if (outcome?.current) body.current = outcome.current
  if (outcome?.current_version) body.currentVersion = outcome.current_version
  if (outcome?.balance !== undefined) body.balance = outcome.balance
  if (status === 'suspended') Object.assign(body, { state: 'suspended', code: 'account_suspended' })
  if (status === 'not_connected') Object.assign(body, { state: 'not_connected', code: 'not_connected' })
  return NextResponse.json(body, { status: http })
}

export interface RpcCall {
  ok: true
  outcome: Outcome
}
export interface RpcFail {
  ok: false
  /** true when PostgreSQL reported a unique violation (23505) */
  unique: boolean
  response: NextResponse
}

export async function callRpc(db: any, fn: string, args: Record<string, unknown>): Promise<RpcCall | RpcFail> {
  const { data, error } = await db.rpc(fn, args)
  if (error) {
    const code = (error as { code?: string }).code ?? 'n/a'
    console.error(`[commerce] ${fn} failed (code=${code})`)
    return { ok: false, unique: code === '23505', response: NextResponse.json({ error: 'The action could not be completed. Please try again.', code: 'rpc_failed' }, { status: 500 }) }
  }
  return { ok: true, outcome: (data || { status: 'unknown' }) as Outcome }
}

const MAX_REFERENCE_ATTEMPTS = 5

/**
 * For the functions that may create a project: a duplicate project reference rolls the WHOLE function back (nothing was
 * kept) and is retried here with a fresh collision-safe reference.
 */
export async function callRpcWithProjectReference(db: any, fn: string, args: Record<string, unknown>): Promise<RpcCall | RpcFail> {
  let last: RpcFail | null = null
  for (let attempt = 0; attempt < MAX_REFERENCE_ATTEMPTS; attempt++) {
    const result = await callRpc(db, fn, { ...args, p_project_reference: generateProjectReference() })
    if (result.ok) return result
    if (!result.unique) return result
    last = result
  }
  return last as RpcFail
}

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
