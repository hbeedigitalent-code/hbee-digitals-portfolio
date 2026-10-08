-- =============================================================================
-- APPROVAL RELAXATION — ROLLBACK (MANUAL, ONLY IF NEEDED)
-- Reverses portal-invite-04-approval-relaxation.sql. NOT YET EXECUTED.
--
-- REFUSES TO RUN WHILE ANY APPROVED DECISION HAS client_id NULL. Those rows
-- are legitimate decisions made under the relaxed rule; re-adding the
-- constraint would fail on them, and adding it NOT VALID would hide them.
-- Resolve each one deliberately first (link the account through the invitation
-- or link-merchant route, then record a fresh decision if needed).
--
-- Restores the original function verbatim from public.record_program_decision_backup_phase166 and re-adds
-- growth_program_decisions_approval_needs_client (validated). The backup table
-- is NOT dropped.
-- =============================================================================

BEGIN;

LOCK TABLE public.growth_program_decisions IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  v_n bigint;
  v_def text;
BEGIN
  IF to_regclass('public.record_program_decision_backup_phase166') IS NULL THEN
    RAISE EXCEPTION 'Abort: backup table public.record_program_decision_backup_phase166 is missing';
  END IF;
  IF (SELECT count(*) FROM public.record_program_decision_backup_phase166) <> 1 THEN
    RAISE EXCEPTION 'Abort: backup table must hold exactly one row';
  END IF;
  IF (SELECT prosrc_md5_normalised FROM public.record_program_decision_backup_phase166) <> 'd26625dcf2fe0ef3000bd58549eb3eb5' THEN
    RAISE EXCEPTION 'Abort: backup does not hold the reviewed original definition';
  END IF;

  IF (SELECT md5(btrim(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) FROM pg_proc WHERE oid = to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)')) IS DISTINCT FROM '6fd8a6f5900a1789199f408c39706e6c' THEN
    RAISE EXCEPTION 'Abort: live record_program_decision() is not the relaxed version this script reverses';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_program_decisions'::regclass
             AND conname = 'growth_program_decisions_approval_needs_client') THEN
    RAISE EXCEPTION 'Abort: approval_needs_client already exists';
  END IF;

  SELECT count(*) INTO v_n FROM public.growth_program_decisions
  WHERE decision = 'approved' AND client_id IS NULL;
  IF v_n > 0 THEN
    RAISE EXCEPTION 'Abort: % approved decision(s) have client_id NULL — rollback would invalidate them', v_n;
  END IF;

  SELECT definition INTO v_def FROM public.record_program_decision_backup_phase166;
  EXECUTE v_def;
END
$$;

ALTER TABLE public.growth_program_decisions
  ADD CONSTRAINT growth_program_decisions_approval_needs_client
  CHECK (decision <> 'approved' OR client_id IS NOT NULL);

DO $$
BEGIN
  IF (SELECT md5(btrim(regexp_replace(prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) FROM pg_proc WHERE oid = to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)')) IS DISTINCT FROM 'd26625dcf2fe0ef3000bd58549eb3eb5' THEN
    RAISE EXCEPTION 'Abort: restored source does not match the original';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_program_decisions'::regclass
                 AND conname = 'growth_program_decisions_approval_needs_client' AND convalidated) THEN
    RAISE EXCEPTION 'Abort: approval_needs_client not restored';
  END IF;
END
$$;

COMMIT;
