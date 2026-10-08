-- =============================================================================
-- PORTAL INVITATIONS — ROLLBACK (MANUAL, ONLY IF NEEDED)
-- Reverses portal-invite-02-forward.sql. NOT YET EXECUTED.
--
-- REQUIRED REVERSE ORDER — THIS SCRIPT RUNS LAST:
--
--     1. portal-invite-05-approval-relaxation-rollback.sql   (FIRST)
--     2. portal-invite-03-rollback.sql                       (this file, SECOND)
--
-- While the approval relaxation is active, an approval can be recorded with
-- client_id NULL, and its merchant depends on a portal invitation to ever
-- connect an account. Removing the invitation infrastructure then would strand
-- that decision. So this script REFUSES unless
-- growth_program_decisions_approval_needs_client exists AND is validated —
-- i.e. 05 has already restored the original rule — and, as a secondary guard,
-- if any approved decision has client_id NULL.
--
-- It also refuses if any invitation has been CONSUMED: those rows are the audit
-- trail for client ↔ merchant links already made.
--
-- NEVER UNDONE: client links. clients.merchant_id and client_merchant_links are
-- not touched by this script under any outcome.
-- =============================================================================

BEGIN;

LOCK TABLE public.growth_program_decisions IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.portal_invitations IN ACCESS EXCLUSIVE MODE;

DO $$
DECLARE
  v_n bigint;
BEGIN
  -- Order guard: the approval relaxation must already be rolled back (05 first).
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                 WHERE conrelid = 'public.growth_program_decisions'::regclass
                   AND conname = 'growth_program_decisions_approval_needs_client'
                   AND contype = 'c' AND convalidated) THEN
    RAISE EXCEPTION 'Abort: approval relaxation is still active (growth_program_decisions_approval_needs_client missing or not validated). Run portal-invite-05-approval-relaxation-rollback.sql FIRST.';
  END IF;

  -- Secondary guard (the validated constraint should already make this impossible).
  SELECT count(*) INTO v_n FROM public.growth_program_decisions
  WHERE decision = 'approved' AND client_id IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abort: % approved decision(s) have client_id NULL and depend on portal invitations', v_n;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' AND p.proname = 'consume_portal_invitation'
                 AND pg_get_function_identity_arguments(p.oid) = 'p_token_hash text, p_user_id uuid, p_user_email text') THEN
    RAISE EXCEPTION 'Abort: public.consume_portal_invitation(text, uuid, text) is missing';
  END IF;

  SELECT count(*) INTO v_n FROM public.portal_invitations WHERE consumed_at IS NOT NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abort: % consumed invitation(s) exist — they are the audit trail for links already made', v_n;
  END IF;
END
$$;

DROP FUNCTION public.consume_portal_invitation(text, uuid, text);
DROP TABLE public.portal_invitations;

COMMIT;
