/**
 * Growth Profile status, derived ONLY from stored records (Phase 6). Pure: no React, no network.
 *
 * It mirrors, read-only, the gate the Client Portal enforces in src/app/api/client-portal/growth-profile/route.ts.
 * That endpoint shows a merchant a profile only when ALL of these hold:
 *
 *   1. a client row is linked to the merchant (clients.merchant_id);
 *   2. the merchant's LATEST programme decision (highest decision_seq, at MERCHANT level) is 'approved';
 *   3. that approval names THIS profile (growth_program_decisions.profile_id) — release is bound to the
 *      profile that was approved, not to whichever profile is active;
 *   4. the server release gate GROWTH_PROFILE_RELEASE_ENABLED is 'true'.
 *
 * Things that are deliberately NOT inputs, because the portal does not consult them:
 *   - growth_profiles.is_active (the Archive / Activate flag),
 *   - growth_assessments.review_status (a stored mark, not evidence of a decision),
 *   - whether the review is 'completed' (completing prepares the profile; it grants nothing),
 *   - whether a portal invitation exists or was accepted (an accepted invitation is what LINKS a client, which is
 *     input 1; an open invitation by itself releases nothing).
 *
 * Any input that could not be read is `null` → the result is `visible: null` ("could not be determined"), never a
 * guess in either direction.
 */

export interface CurrentDecision {
  /** 'approved' | 'declined' | 'withdrawn' (the three values growth_program_decisions allows). */
  decision: string | null
  decision_seq?: number | null
  decided_at?: string | null
  profile_id?: string | null
  assessment_id?: string | null
}

export type ReleaseBlockerCode =
  | 'no_decision'
  | 'declined'
  | 'withdrawn'
  | 'approved_other_profile'
  | 'no_linked_client'
  | 'release_gate_off'
  | 'no_assessment_binding'

export interface ReleaseBlocker {
  code: ReleaseBlockerCode
  text: string
}

export const BLOCKER_TEXT: Record<ReleaseBlockerCode, string> = {
  no_decision: 'No programme decision has been recorded for this merchant yet.',
  declined: 'The latest programme decision is “not approved”.',
  withdrawn: 'The approval was withdrawn.',
  approved_other_profile: 'The current approval names a different Growth Profile, and that one is what the portal shows.',
  no_linked_client: 'No portal account is linked to this merchant, so there is nobody to show it to.',
  release_gate_off: 'The release gate (GROWTH_PROFILE_RELEASE_ENABLED) is off, so no profile is shown to any merchant yet.',
  no_assessment_binding: 'This profile is not bound to an assessment, so the portal would refuse it.',
}

export interface ReleaseInputs {
  profileId: string
  profileAssessmentId: string | null
  /** The merchant's latest decision. `null` = none recorded. `undefined` = could not be read. */
  decision: CurrentDecision | null | undefined
  /** Number of clients rows with clients.merchant_id = this merchant. `null` = could not be read. */
  linkedClients: number | null
  releaseEnabled: boolean | null
}

export interface ReleaseEvaluation {
  /** true = the portal would serve this profile to a linked client right now. null = could not be determined. */
  visible: boolean | null
  blockers: ReleaseBlocker[]
  /** The decision's relationship to THIS profile, for display. */
  decisionState: 'unknown' | 'none' | 'approved_this' | 'approved_other' | 'declined' | 'withdrawn'
}

export function evaluateRelease(input: ReleaseInputs): ReleaseEvaluation {
  const blockers: ReleaseBlocker[] = []
  const add = (code: ReleaseBlockerCode) => blockers.push({ code, text: BLOCKER_TEXT[code] })

  let decisionState: ReleaseEvaluation['decisionState']
  if (input.decision === undefined) decisionState = 'unknown'
  else if (input.decision === null || !input.decision.decision) decisionState = 'none'
  else if (input.decision.decision === 'declined') decisionState = 'declined'
  else if (input.decision.decision === 'withdrawn') decisionState = 'withdrawn'
  else if (input.decision.decision === 'approved') decisionState = input.decision.profile_id === input.profileId ? 'approved_this' : 'approved_other'
  else decisionState = 'unknown'

  if (decisionState === 'none') add('no_decision')
  if (decisionState === 'declined') add('declined')
  if (decisionState === 'withdrawn') add('withdrawn')
  if (decisionState === 'approved_other') add('approved_other_profile')
  if (input.linkedClients === 0) add('no_linked_client')
  if (input.releaseEnabled === false) add('release_gate_off')
  if (!input.profileAssessmentId) add('no_assessment_binding')

  const undetermined = decisionState === 'unknown' || input.linkedClients === null || input.releaseEnabled === null
  // A proven blocker is a definite "no" even if something else is unknown; otherwise unknown stays unknown.
  const visible = blockers.length > 0 ? false : undetermined ? null : true
  return { visible, blockers, decisionState }
}

export const DECISION_LABEL: Record<string, string> = { approved: 'Approved', declined: 'Not approved', withdrawn: 'Approval withdrawn' }
