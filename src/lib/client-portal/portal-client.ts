// src/lib/client-portal/portal-client.ts
//
// SERVER-ONLY. The single place a Client Portal API route turns "who is calling" into "which client
// record do they own, and what may it do".
//
// S6.2 access model
// -----------------
//   Portal ACCOUNT access      a confirmed user with exactly one `clients` row. Anyone who signs up
//                              and confirms their email has this, immediately.
//   CONNECTED client access    the same account once Hbee has linked it to a business:
//                              clients.merchant_id is a valid uuid that points at a real merchants row.
//
// `merchant_id = null` does NOT mean "unapproved". It means only that the Portal account has not yet been
// connected to an Hbee client/business record. Such an account can browse the Portal, edit its own
// profile and avatar, and read anything it genuinely owns; it cannot create operational records.
//
// SUSPENSION uses the existing clients.status column. 'Active' is the normal value; 'Suspended' (any case)
// blocks every Portal API route through this resolver, independently of page middleware.
//
// WHAT NEVER COMES FROM THE REQUEST: a client id, merchant id, status or any other authority. The client
// is resolved from the verified session (auth.getUser(), which validates the token server-side) and from
// nothing else.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { getPrivilegedClient } from '@/lib/admin-api-auth'

if (typeof window !== 'undefined') {
  throw new Error('portal-client.ts is server-only and must not be imported by client code')
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The exact value stored while a client is suspended. Compared case-insensitively. */
export const CLIENT_STATUS_ACTIVE = 'Active'
export const CLIENT_STATUS_SUSPENDED = 'Suspended'

export function isClientSuspended(status: unknown): boolean {
  return typeof status === 'string' && status.trim().toLowerCase() === 'suspended'
}

export type PortalDenial =
  | 'unauthenticated'
  | 'configuration'
  | 'lookup_failed'
  | 'no_client'
  | 'ambiguous'
  | 'suspended'
  | 'not_connected'

export interface PortalClient {
  id: string
  merchant_id: string | null
  status: string | null
  [column: string]: unknown
}

export type PortalClientResult =
  | { ok: true; user: { id: string; email?: string | null }; db: any; client: PortalClient; connected: boolean }
  | { ok: false; reason: PortalDenial; response: NextResponse }

export interface ResolveOptions {
  /** Operational actions: the client must be connected to a real merchant/business record. */
  requireConnected?: boolean
  /** Extra clients columns to read, e.g. 'business_name, full_name'. Always added to id, merchant_id, status. */
  extraColumns?: string
  /** What to say when the failure is the generic server one. */
  failureMessage?: string
}

/** Stable, UI-friendly bodies. The UI keys off `state`/`code`, never off the wording. */
export const PORTAL_SUSPENDED_BODY = {
  state: 'suspended',
  code: 'account_suspended',
  error: 'This portal account is currently unavailable. Please contact Hbee Digitals.',
} as const

export const PORTAL_NOT_CONNECTED_BODY = {
  state: 'not_connected',
  code: 'not_connected',
  error:
    'Your account is ready. This action becomes available once Hbee connects your business.',
} as const

function deny(reason: PortalDenial, status: number, body: Record<string, unknown>): PortalClientResult {
  return { ok: false, reason, response: NextResponse.json(body, { status }) }
}

export function isConnectedMerchantId(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim())
}

/**
 * Resolve the calling user's own client record.
 *
 *   401 no session
 *   500 server configuration / lookup failure
 *   404 no clients row for this user
 *   409 more than one clients row (refused, never guessed)   { state: 'ambiguous' }
 *   403 suspended                                             { state: 'suspended' }
 *   403 connected-only action on an unconnected account       { state: 'not_connected' }
 *
 * Suspension is checked BEFORE connection, so a suspended account always sees the suspended state.
 */
export async function resolvePortalClient(options: ResolveOptions = {}): Promise<PortalClientResult> {
  const failure = options.failureMessage ?? 'Failed to load your account'

  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) return deny('unauthenticated', 401, { error: 'Not authenticated' })

  const db = getPrivilegedClient()
  if (!db) return deny('configuration', 500, { error: 'Server configuration error' })

  const columns = ['id', 'merchant_id', 'status', options.extraColumns].filter(Boolean).join(', ')
  const { data: rows, error } = await db.from('clients').select(columns).eq('user_id', user.id).limit(2)

  if (error) {
    console.error(`[portal-client] client lookup failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
    return deny('lookup_failed', 500, { error: failure })
  }
  if (!rows || rows.length === 0) return deny('no_client', 404, { error: 'Not found' })
  if (rows.length > 1) {
    console.error(`[portal-client] ambiguous client ownership for user ${user.id}`)
    return deny('ambiguous', 409, { state: 'ambiguous' })
  }

  const client = rows[0] as PortalClient

  if (isClientSuspended(client.status)) return deny('suspended', 403, { ...PORTAL_SUSPENDED_BODY })

  const hasMerchantId = isConnectedMerchantId(client.merchant_id)

  if (options.requireConnected) {
    if (!hasMerchantId) return deny('not_connected', 403, { ...PORTAL_NOT_CONNECTED_BODY })

    // The id must point at a real merchant record. A dangling id is not a connection.
    const { data: merchant, error: merchantError } = await db
      .from('merchants')
      .select('id')
      .eq('id', (client.merchant_id as string).trim())
      .maybeSingle()

    if (merchantError) {
      console.error(
        `[portal-client] merchant lookup failed (code=${(merchantError as { code?: string }).code ?? 'n/a'})`,
      )
      return deny('lookup_failed', 500, { error: failure })
    }
    if (!merchant) return deny('not_connected', 403, { ...PORTAL_NOT_CONNECTED_BODY })
  }

  return {
    ok: true,
    user: { id: user.id, email: user.email ?? null },
    db,
    client,
    connected: hasMerchantId,
  }
}
