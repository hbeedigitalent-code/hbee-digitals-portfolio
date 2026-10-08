-- =============================================================================
-- APPROVAL RELAXATION — FORWARD MIGRATION
-- Hbee Growth OS · Phase 16.6 · Decision → Invitation → Account → Portal
--
-- Run in: Supabase Dashboard -> SQL Editor (production), AFTER
-- portal-invite-02-forward.sql. Prepared 2026-10-07. NOT YET EXECUTED.
-- Generated from the exact production definition supplied by the owner.
--
-- WHAT THIS CHANGES — and nothing else
--   1. Backs up the current record_program_decision() definition into
--      public.record_program_decision_backup_phase166 (server-only), for the rollback.
--   2. Drops ONLY the CHECK constraint growth_program_decisions_approval_needs_client.
--      growth_program_decisions_approval_needs_profile is KEPT (asserted).
--   3. Replaces record_program_decision() with the production body minus ONE
--      block: the "IF v_client_n = 0 THEN RETURN 'client_not_linked'" refusal.
--      Zero linked clients → v_client stays NULL and every other check runs.
--      More than one → still 'client_link_ambiguous'. One → unchanged.
--
-- GUARDS
--   * The LIVE function source must match the supplied production source
--     (whitespace-normalised md5 d26625dcf2fe0ef3000bd58549eb3eb5); any drift aborts.
--   * Signature, return type, SECURITY DEFINER, search_path and ACL are
--     asserted before, and the ACL is asserted unchanged after.
--   * The replaced source is asserted to be exactly the reviewed new source
--     (md5 6fd8a6f5900a1789199f408c39706e6c).
--   * One transaction: any failed assertion rolls everything back.
-- Rollback: portal-invite-05-approval-relaxation-rollback.sql (separate, manual).
-- =============================================================================

BEGIN;

LOCK TABLE public.growth_program_decisions IN SHARE ROW EXCLUSIVE MODE;

CREATE TEMP TABLE _phase166_acl ON COMMIT DROP AS
SELECT proacl::text AS acl, proowner FROM pg_proc WHERE oid = to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)');

DO $$
DECLARE
  v_oid oid := to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)');
  v_p   pg_proc%ROWTYPE;
  v_def text;
BEGIN
  IF v_oid IS NULL THEN
    RAISE EXCEPTION 'Abort: public.record_program_decision(uuid, text, uuid, text, boolean) not found';
  END IF;
  SELECT * INTO v_p FROM pg_proc WHERE oid = v_oid;

  IF md5(btrim(regexp_replace(v_p.prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) <> 'd26625dcf2fe0ef3000bd58549eb3eb5' THEN
    RAISE EXCEPTION 'Abort: live record_program_decision() source differs from the reviewed production source (md5 %, expected d26625dcf2fe0ef3000bd58549eb3eb5)',
      md5(btrim(regexp_replace(v_p.prosrc, '[ \t\n\r\f\v]+', ' ', 'g')));
  END IF;
  IF format_type(v_p.prorettype, NULL) <> 'jsonb' THEN
    RAISE EXCEPTION 'Abort: record_program_decision returns % (expected jsonb)', format_type(v_p.prorettype, NULL);
  END IF;
  IF NOT v_p.prosecdef THEN
    RAISE EXCEPTION 'Abort: record_program_decision is not SECURITY DEFINER';
  END IF;
  IF v_p.proconfig IS DISTINCT FROM ARRAY['search_path=public, pg_temp'] THEN
    RAISE EXCEPTION 'Abort: record_program_decision proconfig is % (expected {search_path=public, pg_temp})', v_p.proconfig;
  END IF;

  -- The constraint to drop: exact name, CHECK, and the expected expression.
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.growth_program_decisions'::regclass
    AND c.conname = 'growth_program_decisions_approval_needs_client' AND c.contype = 'c';
  IF v_def IS NULL OR v_def NOT ILIKE '%client_id IS NOT NULL%' OR v_def NOT ILIKE '%decision <> %approved%' THEN
    RAISE EXCEPTION 'Abort: growth_program_decisions_approval_needs_client missing or unexpected: %', coalesce(v_def, 'missing');
  END IF;

  -- The constraint to KEEP.
  SELECT pg_get_constraintdef(c.oid) INTO v_def
  FROM pg_constraint c
  WHERE c.conrelid = 'public.growth_program_decisions'::regclass
    AND c.conname = 'growth_program_decisions_approval_needs_profile' AND c.contype = 'c';
  IF v_def IS NULL OR v_def NOT ILIKE '%profile_id IS NOT NULL%' THEN
    RAISE EXCEPTION 'Abort: growth_program_decisions_approval_needs_profile missing or unexpected: %', coalesce(v_def, 'missing');
  END IF;

  -- Backup name must be free (any relkind).
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'public' AND c.relname = 'record_program_decision_backup_phase166') THEN
    RAISE EXCEPTION 'Abort: public.record_program_decision_backup_phase166 already exists — a previous attempt needs a human decision';
  END IF;
END
$$;

-- 1. Backup of the definition being replaced.
CREATE TABLE public.record_program_decision_backup_phase166 AS
SELECT 'public.record_program_decision(uuid, text, uuid, text, boolean)'::text                    AS function_signature,
       pg_get_functiondef(p.oid)          AS definition,
       md5(btrim(regexp_replace(p.prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) AS prosrc_md5_normalised,
       p.proacl::text                     AS acl,
       now()                              AS backed_up_at
FROM   pg_proc p
WHERE  p.oid = to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)');

REVOKE ALL ON TABLE public.record_program_decision_backup_phase166 FROM PUBLIC, anon, authenticated;
ALTER TABLE public.record_program_decision_backup_phase166 ENABLE ROW LEVEL SECURITY;

-- 2. Drop ONLY the client requirement.
ALTER TABLE public.growth_program_decisions DROP CONSTRAINT growth_program_decisions_approval_needs_client;

-- 3. The production function, minus the client_not_linked refusal.
CREATE OR REPLACE FUNCTION public.record_program_decision(
  p_assessment_id uuid,
  p_decision text,
  p_actor uuid,
  p_notes text DEFAULT NULL::text,
  p_acknowledge_history boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_merchant uuid;
  v_merchant0 uuid;
  v_review text;
  v_prior bigint;
  v_client uuid;
  v_client_n integer;
  v_profile uuid;
  v_profile_n integer;
  v_rev_status text;
  v_id uuid;
  v_seq bigint;
  v_historical boolean := false;
BEGIN
  IF p_decision NOT IN ('approved','declined','withdrawn') THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'unknown_decision'
    );
  END IF;

  SELECT merchant_id INTO v_merchant0
  FROM public.growth_assessments
  WHERE id = p_assessment_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'assessment_not_found'
    );
  END IF;

  IF v_merchant0 IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'merchant_not_linked'
    );
  END IF;

  PERFORM 1
  FROM public.merchants
  WHERE id = v_merchant0
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'merchant_not_found'
    );
  END IF;

  SELECT merchant_id, review_status
  INTO v_merchant, v_review
  FROM public.growth_assessments
  WHERE id = p_assessment_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'assessment_not_found'
    );
  END IF;

  IF v_merchant IS NULL THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'merchant_not_linked'
    );
  END IF;

  IF v_merchant IS DISTINCT FROM v_merchant0 THEN
    RETURN jsonb_build_object(
      'ok', false, 'reason', 'merchant_changed_concurrently'
    );
  END IF;

  SELECT count(*) INTO v_client_n
  FROM public.growth_program_decisions
  WHERE assessment_id = p_assessment_id;

  v_prior := v_client_n;

  IF v_prior = 0 AND v_review = 'approved' THEN
    v_historical := true;

    IF NOT p_acknowledge_history THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'unverified_historical_approval'
      );
    END IF;
  END IF;

  IF p_decision = 'approved' THEN
    SELECT count(*), (array_agg(id ORDER BY id))[1]
    INTO v_client_n, v_client
    FROM public.clients
    WHERE merchant_id = v_merchant;

    -- Phase 16.6: zero linked clients no longer refuses an approval. v_client
    -- stays NULL, every review and profile check below still applies, and the
    -- decision is recorded with client_id NULL. The application then invites
    -- the merchant to connect a portal account (portal_invitations).

    IF v_client_n > 1 THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'client_link_ambiguous'
      );
    END IF;

    IF v_review IS DISTINCT FROM 'reviewed'
       AND v_review IS DISTINCT FROM 'approved' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'assessment_not_reviewed',
        'review_status', v_review
      );
    END IF;

    SELECT status INTO v_rev_status
    FROM public.growth_reviews
    WHERE assessment_id = p_assessment_id
      AND merchant_id = v_merchant
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_rev_status IS NULL THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'review_missing'
      );
    END IF;

    IF v_rev_status IS DISTINCT FROM 'completed'
       AND v_review IS DISTINCT FROM 'approved' THEN
      RETURN jsonb_build_object(
        'ok', false,
        'reason', 'review_not_completed',
        'review_row_status', v_rev_status
      );
    END IF;

    SELECT count(*), (array_agg(p.id ORDER BY p.id))[1]
    INTO v_profile_n, v_profile
    FROM public.growth_profiles p
    WHERE p.merchant_id = v_merchant
      AND p.assessment_id = p_assessment_id;

    IF v_profile_n = 0 THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'profile_missing'
      );
    END IF;

    IF v_profile_n > 1 THEN
      RETURN jsonb_build_object(
        'ok', false, 'reason', 'profile_ambiguous'
      );
    END IF;

    PERFORM 1
    FROM public.growth_profiles
    WHERE id = v_profile
    FOR UPDATE;
  ELSE
    SELECT (array_agg(id ORDER BY id))[1]
    INTO v_client
    FROM public.clients
    WHERE merchant_id = v_merchant;
  END IF;

  INSERT INTO public.growth_program_decisions (
    assessment_id, merchant_id, client_id, profile_id,
    decision, decided_by, notes, acknowledged_unverified_history
  )
  VALUES (
    p_assessment_id,
    v_merchant,
    v_client,
    CASE WHEN p_decision = 'approved' THEN v_profile ELSE NULL END,
    p_decision,
    p_actor,
    p_notes,
    v_historical
  )
  RETURNING id, decision_seq INTO v_id, v_seq;

  RETURN jsonb_build_object(
    'ok', true,
    'id', v_id,
    'decision_seq', v_seq,
    'merchant_id', v_merchant,
    'client_id', v_client,
    'profile_id',
      CASE WHEN p_decision = 'approved' THEN v_profile END,
    'historical', v_historical
  );
END
$function$;

-- Post-conditions
DO $$
DECLARE
  v_p pg_proc%ROWTYPE;
  v_acl text;
  v_owner oid;
BEGIN
  SELECT * INTO v_p FROM pg_proc WHERE oid = to_regprocedure('public.record_program_decision(uuid, text, uuid, text, boolean)');
  IF md5(btrim(regexp_replace(v_p.prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) <> '6fd8a6f5900a1789199f408c39706e6c' THEN
    RAISE EXCEPTION 'Abort: replaced source is not the reviewed relaxed source';
  END IF;
  IF NOT v_p.prosecdef OR v_p.proconfig IS DISTINCT FROM ARRAY['search_path=public, pg_temp'] THEN
    RAISE EXCEPTION 'Abort: SECURITY DEFINER / search_path not preserved';
  END IF;
  SELECT acl, proowner INTO v_acl, v_owner FROM _phase166_acl;
  IF v_p.proacl::text IS DISTINCT FROM v_acl OR v_p.proowner <> v_owner THEN
    RAISE EXCEPTION 'Abort: function ACL/owner changed (% -> %)', v_acl, v_p.proacl::text;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_program_decisions'::regclass
             AND conname = 'growth_program_decisions_approval_needs_client') THEN
    RAISE EXCEPTION 'Abort: approval_needs_client still present';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.growth_program_decisions'::regclass
                 AND conname = 'growth_program_decisions_approval_needs_profile' AND convalidated) THEN
    RAISE EXCEPTION 'Abort: approval_needs_profile is not present and validated';
  END IF;
  IF (SELECT count(*) FROM public.record_program_decision_backup_phase166) <> 1
     OR (SELECT prosrc_md5_normalised FROM public.record_program_decision_backup_phase166) <> 'd26625dcf2fe0ef3000bd58549eb3eb5' THEN
    RAISE EXCEPTION 'Abort: backup row missing or not the reviewed original';
  END IF;
  IF has_table_privilege('anon', 'public.record_program_decision_backup_phase166', 'SELECT') OR has_table_privilege('authenticated', 'public.record_program_decision_backup_phase166', 'SELECT') THEN
    RAISE EXCEPTION 'Abort: backup table readable by anon/authenticated';
  END IF;
END
$$;

COMMIT;
