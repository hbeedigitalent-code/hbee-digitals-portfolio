-- =============================================================================
-- PORTAL INVITATIONS — FORWARD MIGRATION
-- Hbee Growth OS · Phase 16.6 · Decision → Invitation → Account → Portal
--
-- Run in: Supabase Dashboard -> SQL Editor (production), ONLY after
-- portal-invite-01-preflight-readonly.sql has been reviewed.
-- Prepared 2026-10-07. NOT YET EXECUTED.
--
-- WHAT THIS ADDS (add-only — no DROP, DELETE, TRUNCATE or ALTER of existing objects)
--   1. public.portal_invitations — one row per invitation. Stores only the
--      SHA-256 hash of the token, never the token. Server-only: RLS enabled,
--      no policies, every privilege revoked from PUBLIC, anon, authenticated.
--   2. public.consume_portal_invitation(token_hash, user_id, user_email) —
--      performs the INVITATION checks (token, revocation, consumption,
--      expiry, confirmed-email match, exactly one client for the user), then
--      delegates the actual client ↔ merchant mutation to the canonical
--      public.link_client_to_merchant() — the same function the admin route
--      uses — so both paths share its row locking, collision refusals,
--      idempotency and client_merchant_links audit history. The invitation is
--      marked consumed ONLY after that linker reports success; any refusal or
--      error leaves it open. EXECUTE granted to service_role only.
--
-- WHAT IT DOES NOT DO
--   * It does not change record_program_decision(), link_client_to_merchant(),
--     clients, merchants, growth_program_decisions or any RLS policy.
--   * It never writes clients.merchant_id itself.
--   * It writes no rows at migration time.
--
-- ABORT BEHAVIOUR: every assumption is a RAISE EXCEPTION inside this single
-- transaction, so any failed assertion rolls back everything.
-- Rollback: portal-invite-03-rollback.sql (separate, manual).
-- =============================================================================

BEGIN;

-- clients is read and later written by the new function; hold it steady while
-- its shape is asserted. (No rows are changed by this migration.)
LOCK TABLE public.clients   IN SHARE ROW EXCLUSIVE MODE;
LOCK TABLE public.merchants IN SHARE ROW EXCLUSIVE MODE;

-- -----------------------------------------------------------------------------
-- Assertions
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_found text;
  v_type  text;
BEGIN
  -- New relation names must be free (any relkind).
  SELECT string_agg(c.relname::text || ':' || c.relkind::text, ', ') INTO v_found
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname = 'public'
  AND    c.relname IN ('portal_invitations', 'portal_invitations_token_hash_key',
                       'portal_invitations_one_open_per_merchant', 'portal_invitations_merchant_idx');
  IF v_found IS NOT NULL THEN
    RAISE EXCEPTION 'Abort: relation name(s) already in use: %', v_found;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
             WHERE n.nspname = 'public' AND p.proname = 'consume_portal_invitation') THEN
    RAISE EXCEPTION 'Abort: public.consume_portal_invitation already exists';
  END IF;

  -- Column types the function relies on.
  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'merchants' AND column_name = 'id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Abort: merchants.id is % (expected uuid)', coalesce(v_type, 'missing');
  END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Abort: clients.id is % (expected uuid)', coalesce(v_type, 'missing');
  END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'user_id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Abort: clients.user_id is % (expected uuid)', coalesce(v_type, 'missing');
  END IF;

  SELECT data_type INTO v_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'clients' AND column_name = 'merchant_id';
  IF v_type IS DISTINCT FROM 'uuid' THEN
    RAISE EXCEPTION 'Abort: clients.merchant_id is % (expected uuid)', coalesce(v_type, 'missing');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'gen_random_uuid') THEN
    RAISE EXCEPTION 'Abort: gen_random_uuid() is not available';
  END IF;

  -- The canonical linker this migration delegates to, with the exact signature
  -- and return type the new function calls.
  IF to_regprocedure('public.link_client_to_merchant(uuid, uuid, uuid, text, boolean)') IS NULL THEN
    RAISE EXCEPTION 'Abort: public.link_client_to_merchant(uuid, uuid, uuid, text, boolean) not found';
  END IF;
  SELECT format_type(prorettype, NULL) INTO v_type FROM pg_proc
  WHERE oid = to_regprocedure('public.link_client_to_merchant(uuid, uuid, uuid, text, boolean)');
  IF v_type IS DISTINCT FROM 'jsonb' THEN
    RAISE EXCEPTION 'Abort: link_client_to_merchant returns % (expected jsonb)', coalesce(v_type, 'unknown');
  END IF;

  -- consume_portal_invitation() relies on the linker's exact semantics: its
  -- merchant→client locking, its result vocabulary (ok/already_linked,
  -- merchant_already_linked, client_already_linked) and its
  -- client_merchant_links audit insert. So the LIVE source must be the
  -- reviewed production source (whitespace-normalised md5
  -- 015bcd9c785bb1bee17fa4e3d04ce4bd); any drift aborts. The linker is
  -- not modified by this migration.
  SELECT md5(btrim(regexp_replace(p.prosrc, '[ \t\n\r\f\v]+', ' ', 'g'))) INTO v_type
  FROM pg_proc p
  WHERE p.oid = to_regprocedure('public.link_client_to_merchant(uuid, uuid, uuid, text, boolean)');
  IF v_type IS DISTINCT FROM '015bcd9c785bb1bee17fa4e3d04ce4bd' THEN
    RAISE EXCEPTION 'Abort: live link_client_to_merchant() source differs from the reviewed production source (md5 %, expected 015bcd9c785bb1bee17fa4e3d04ce4bd)', v_type;
  END IF;

  -- It runs as its owner with a pinned search_path; the invitation path depends on both.
  IF NOT (SELECT prosecdef FROM pg_proc
          WHERE oid = to_regprocedure('public.link_client_to_merchant(uuid, uuid, uuid, text, boolean)')) THEN
    RAISE EXCEPTION 'Abort: link_client_to_merchant is not SECURITY DEFINER';
  END IF;
  IF (SELECT proconfig FROM pg_proc
      WHERE oid = to_regprocedure('public.link_client_to_merchant(uuid, uuid, uuid, text, boolean)'))
     IS DISTINCT FROM ARRAY['search_path=public, pg_temp'] THEN
    RAISE EXCEPTION 'Abort: link_client_to_merchant search_path is not {search_path=public, pg_temp}';
  END IF;

  IF to_regclass('public.client_merchant_links') IS NULL THEN
    RAISE EXCEPTION 'Abort: public.client_merchant_links (the link audit table) is missing';
  END IF;

  -- The invitation path passes the AUTHENTICATED MERCHANT USER as p_actor. If the
  -- audit table's foreign keys require an admin (or anything other than a client,
  -- merchant or auth user), that call would fail at runtime — refuse now instead.
  SELECT string_agg(con.conname || ' -> ' || con.confrelid::regclass::text, ', ') INTO v_found
  FROM   pg_constraint con
  WHERE  con.conrelid = 'public.client_merchant_links'::regclass
  AND    con.contype = 'f'
  AND    con.confrelid <> ALL (array_remove(ARRAY[
           'public.clients'::regclass::oid,
           'public.merchants'::regclass::oid,
           to_regclass('auth.users')::oid
         ], NULL));
  IF v_found IS NOT NULL THEN
    RAISE EXCEPTION 'Abort: client_merchant_links has foreign keys an invitation actor may not satisfy: %', v_found;
  END IF;
END
$$;

-- -----------------------------------------------------------------------------
-- 1. Table
-- -----------------------------------------------------------------------------
CREATE TABLE public.portal_invitations (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id        uuid        NOT NULL REFERENCES public.merchants(id),
  -- The address the invitation was sent to; the signed-in account must match it.
  email              text        NOT NULL CHECK (email = lower(btrim(email)) AND email LIKE '%_@_%'),
  -- SHA-256 of the token, lowercase hex. The token itself is never stored here.
  token_hash         text        NOT NULL CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  assessment_id      uuid,
  created_by         uuid        NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  expires_at         timestamptz NOT NULL,
  consumed_at        timestamptz,
  consumed_by_user   uuid,
  consumed_client_id uuid,
  revoked_at         timestamptz,
  CONSTRAINT portal_invitations_expiry_after_creation CHECK (expires_at > created_at),
  CONSTRAINT portal_invitations_consumption_complete CHECK (
    (consumed_at IS NULL AND consumed_by_user IS NULL AND consumed_client_id IS NULL)
    OR (consumed_at IS NOT NULL AND consumed_by_user IS NOT NULL AND consumed_client_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX portal_invitations_token_hash_key ON public.portal_invitations (token_hash);
-- At most ONE open invitation per merchant: issuing is idempotent under races.
CREATE UNIQUE INDEX portal_invitations_one_open_per_merchant
  ON public.portal_invitations (merchant_id)
  WHERE consumed_at IS NULL AND revoked_at IS NULL;
CREATE INDEX portal_invitations_merchant_idx ON public.portal_invitations (merchant_id);

-- Server-only.
REVOKE ALL ON TABLE public.portal_invitations FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.portal_invitations TO service_role;
ALTER TABLE public.portal_invitations ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 2. Consumption — the only invitation-based linker
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.consume_portal_invitation(
  p_token_hash text,
  p_user_id    uuid,
  p_user_email text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $fn$
DECLARE
  v_inv          public.portal_invitations%ROWTYPE;
  v_client_id    uuid;
  v_client_count int;
  v_link         jsonb;
  v_link_reason  text;
  v_email        text := lower(btrim(coalesce(p_user_email, '')));
BEGIN
  IF p_token_hash IS NULL OR p_token_hash !~ '^[0-9a-f]{64}$' OR p_user_id IS NULL OR v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  SELECT * INTO v_inv FROM public.portal_invitations WHERE token_hash = p_token_hash FOR UPDATE;
  IF NOT FOUND OR v_inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  IF v_inv.consumed_at IS NOT NULL THEN
    -- Same person opening the link again: a safe, idempotent success.
    IF v_inv.consumed_by_user = p_user_id THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'already_linked');
    END IF;
    RETURN jsonb_build_object('ok', false, 'reason', 'used');
  END IF;

  IF v_inv.expires_at <= now() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'expired');
  END IF;

  -- The signed-in account must be the invited address (checked by the caller as
  -- a VERIFIED auth email). Mismatch is refused, never linked "close enough".
  IF v_email <> v_inv.email THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'email_mismatch');
  END IF;

  -- Same lock order as link_client_to_merchant() (merchant, then client), so an
  -- invitation and a simultaneous manual admin link serialise on the merchant
  -- row instead of deadlocking. clients.merchant_id is not unique, so this
  -- merchant lock is what makes "one account per merchant" hold under races.
  PERFORM 1 FROM public.merchants WHERE id = v_inv.merchant_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'invalid');
  END IF;

  -- Exactly one clients row for this user (created by account provisioning;
  -- clients.user_id is unique where not null, so >1 is defensive only).
  SELECT count(*) INTO v_client_count FROM public.clients WHERE user_id = p_user_id;
  IF v_client_count = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_client');
  ELSIF v_client_count > 1 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'client_ambiguous');
  END IF;
  SELECT id INTO v_client_id FROM public.clients WHERE user_id = p_user_id;

  -- THE MUTATION: the canonical linker, never a direct UPDATE. Merchant from the
  -- invitation only; actor = the authenticated user; relinking never allowed.
  v_link := public.link_client_to_merchant(
    v_client_id,
    v_inv.merchant_id,
    p_user_id,
    'portal invitation ' || v_inv.id::text || ' accepted by the invited, signed-in account',
    false
  );
  v_link_reason := coalesce(v_link->>'reason', 'unknown');

  IF coalesce((v_link->>'ok')::boolean, false) IS NOT TRUE AND v_link_reason <> 'already_linked' THEN
    -- Refused by the canonical linker: nothing was linked, so the invitation
    -- stays OPEN (not consumed). Map its reasons to the invitation vocabulary.
    RETURN jsonb_build_object(
      'ok', false,
      'reason', CASE v_link_reason
                  WHEN 'merchant_already_linked' THEN 'merchant_linked_elsewhere'
                  WHEN 'client_already_linked'   THEN 'client_linked_elsewhere'
                  ELSE 'link_refused'
                END,
      'link_reason', v_link_reason
    );
  END IF;

  -- Linked (or already correctly linked): only now is the invitation consumed.
  UPDATE public.portal_invitations
  SET consumed_at = now(), consumed_by_user = p_user_id, consumed_client_id = v_client_id
  WHERE id = v_inv.id;

  RETURN jsonb_build_object(
    'ok', true,
    'reason', CASE WHEN v_link_reason = 'already_linked' THEN 'already_linked' ELSE 'linked' END
  );
END;
$fn$;

REVOKE ALL ON FUNCTION public.consume_portal_invitation(text, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_portal_invitation(text, uuid, text) TO service_role;

-- -----------------------------------------------------------------------------
-- Post-conditions (effective privileges, per operation)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r text;
  op text;
BEGIN
  FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    FOREACH op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'] LOOP
      IF has_table_privilege(r, 'public.portal_invitations', op) THEN
        RAISE EXCEPTION 'Abort: % still has % on portal_invitations', r, op;
      END IF;
    END LOOP;
    IF has_function_privilege(r, 'public.consume_portal_invitation(text, uuid, text)', 'EXECUTE') THEN
      RAISE EXCEPTION 'Abort: % can execute consume_portal_invitation', r;
    END IF;
  END LOOP;

  FOREACH op IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
    IF NOT has_table_privilege('service_role', 'public.portal_invitations', op) THEN
      RAISE EXCEPTION 'Abort: service_role lacks % on portal_invitations', op;
    END IF;
  END LOOP;
  FOREACH op IN ARRAY ARRAY['DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES'] LOOP
    IF has_table_privilege('service_role', 'public.portal_invitations', op) THEN
      RAISE EXCEPTION 'Abort: service_role unexpectedly has % on portal_invitations', op;
    END IF;
  END LOOP;
  IF NOT has_function_privilege('service_role', 'public.consume_portal_invitation(text, uuid, text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Abort: service_role cannot execute consume_portal_invitation';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = 'public.portal_invitations'::regclass) THEN
    RAISE EXCEPTION 'Abort: RLS is not enabled on portal_invitations';
  END IF;
END
$$;

COMMIT;
