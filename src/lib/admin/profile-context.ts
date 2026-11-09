/**
 * SERVER-ONLY read helper for the Growth Profiles admin routes (Phase 6). Read-only: it never writes.
 *
 * For a set of profiles it gathers, with the already-authorised privileged client, the stored facts the status
 * display needs, joined in memory by stored ids (no PostgREST embeds, no id lists in URLs):
 *   growth_reviews          → review id + status + completed_at, by assessment_id
 *   growth_program_decisions→ the merchant's latest decision (highest decision_seq), and history
 *   clients                 → how many clients rows have clients.merchant_id = merchant, and the client id
 *   portal_invitations      → the merchant's latest invitation (whitelisted fields; token_hash is never selected)
 * Each source that fails to read becomes "unknown" for the affected field; it is never reported as "none".
 */

import { evaluateRelease, type CurrentDecision, type ReleaseEvaluation } from '@/lib/admin/profile-release'
import { summariseInvitation, type InvitationSummary } from '@/lib/portal-invitation-state'

if (typeof window !== 'undefined') {
  throw new Error('profile-context.ts is server-only and must not be imported by client code')
}

export interface ProfileLike {
  id: string
  merchant_id: string | null
  assessment_id: string | null
}

export interface ProfileStatus {
  review: { known: boolean; id: string | null; status: string | null; completed_at: string | null }
  decision: { known: boolean; current: CurrentDecision | null; history: CurrentDecision[] }
  linkage: { known: boolean; linked_clients: number; client_id: string | null }
  invitation: { known: boolean; summary: InvitationSummary | null }
  release: ReleaseEvaluation
}

const CAP = 5000

export async function buildProfileStatuses(
  db: any,
  profiles: ProfileLike[],
  opts: { releaseEnabled: boolean; history?: boolean } = { releaseEnabled: false },
): Promise<Record<string, ProfileStatus>> {
  const read = async (label: string, query: PromiseLike<{ data: any[] | null; error: unknown }>) => {
    try {
      const { data, error } = await query
      if (error) {
        console.error(`[admin-api] profile status: ${label} read failed`)
        return null
      }
      return data || []
    } catch {
      console.error(`[admin-api] profile status: ${label} read threw`)
      return null
    }
  }

  const [reviews, decisions, clients, invitations] = await Promise.all([
    read('reviews', db.from('growth_reviews').select('id, assessment_id, status, completed_at').limit(CAP)),
    read('decisions', db.from('growth_program_decisions').select('merchant_id, decision, decision_seq, decided_at, profile_id, assessment_id').order('decision_seq', { ascending: false }).limit(CAP)),
    read('clients', db.from('clients').select('id, merchant_id').not('merchant_id', 'is', null).limit(CAP)),
    // Explicit columns: token_hash is never read.
    read('invitations', db.from('portal_invitations').select('merchant_id, email, created_at, expires_at, consumed_at, revoked_at').order('created_at', { ascending: false }).limit(CAP)),
  ])

  const reviewByAssessment = new Map<string, any>()
  for (const r of reviews || []) if (r.assessment_id && !reviewByAssessment.has(r.assessment_id)) reviewByAssessment.set(r.assessment_id, r)

  const decisionsByMerchant = new Map<string, CurrentDecision[]>()
  for (const d of decisions || []) {
    if (!d.merchant_id) continue
    const list = decisionsByMerchant.get(d.merchant_id) || []
    list.push(d)
    decisionsByMerchant.set(d.merchant_id, list)
  }

  const clientsByMerchant = new Map<string, string[]>()
  for (const c of clients || []) {
    const list = clientsByMerchant.get(c.merchant_id) || []
    list.push(c.id)
    clientsByMerchant.set(c.merchant_id, list)
  }

  const invitationByMerchant = new Map<string, any>()
  for (const i of invitations || []) if (i.merchant_id && !invitationByMerchant.has(i.merchant_id)) invitationByMerchant.set(i.merchant_id, i)

  const out: Record<string, ProfileStatus> = {}
  for (const profile of profiles) {
    const merchantId = profile.merchant_id
    const review = profile.assessment_id ? reviewByAssessment.get(profile.assessment_id) : null
    const history = merchantId ? decisionsByMerchant.get(merchantId) || [] : []
    const current: CurrentDecision | null = history[0] ?? null
    const linkedIds = merchantId ? clientsByMerchant.get(merchantId) || [] : []

    const reviewKnown = reviews !== null
    const decisionKnown = decisions !== null && Boolean(merchantId)
    const linkageKnown = clients !== null && Boolean(merchantId)
    const invitationKnown = invitations !== null && Boolean(merchantId)

    out[profile.id] = {
      review: { known: reviewKnown, id: review?.id ?? null, status: review?.status ?? null, completed_at: review?.completed_at ?? null },
      decision: { known: decisionKnown, current: decisionKnown ? current : null, history: opts.history && decisionKnown ? history.slice(0, 10) : [] },
      linkage: { known: linkageKnown, linked_clients: linkedIds.length, client_id: linkedIds.length === 1 ? linkedIds[0] : null },
      invitation: { known: invitationKnown, summary: invitationKnown ? summariseInvitation(merchantId ? invitationByMerchant.get(merchantId) ?? null : null) : null },
      release: evaluateRelease({
        profileId: profile.id,
        profileAssessmentId: profile.assessment_id,
        decision: decisionKnown ? current : undefined,
        linkedClients: linkageKnown ? linkedIds.length : null,
        releaseEnabled: opts.releaseEnabled,
      }),
    }
  }
  return out
}

/** The server-side release gate, exactly as the Client Portal reads it. */
export function releaseGateEnabled(): boolean {
  return process.env.GROWTH_PROFILE_RELEASE_ENABLED === 'true'
}
