-- =============================================================================
-- public.clients — REMOVE DIRECT BROWSER WRITES (PRODUCTION). Project: hbee-digitals-cms. NOT YET EXECUTED.
--
-- WHY. Client identity (full_name / business_name) is printed on invoices ("Bill to") and proposals ("Prepared for") from the live
-- clients row. The portal Settings page and API now refuse to change it, but that lock is application-level only: the live
-- database still lets a signed-in browser UPDATE its own row directly with the public key, through
--     column-level UPDATE privileges for `authenticated`  +  the policy clients_update_own.
-- This script removes both. After it, the browser can only READ its own row; every write goes through a trusted server route.
--
-- LIVE STATE THIS SCRIPT WAS WRITTEN FROM (the read-only inspection, scripts/clients-hardening-00-inspect-readonly.sql):
--   RLS enabled = true, forced = false.
--   anon            : no privilege at all.
--   authenticated   : table-level SELECT only. Column-only UPDATE on exactly
--                       full_name, whatsapp, business_name, website_url, country, profile_image,
--                       email_notifications, project_updates, marketing_emails.
--                     No INSERT, no DELETE, no table-level UPDATE.
--   policies        : clients_select_own  SELECT  TO authenticated  USING (auth.uid() = user_id)
--                     clients_update_own  UPDATE  TO authenticated  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)
--   service_role    : DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE.
--
-- WHAT IT DOES (and nothing else):
--   1. REVOKE UPDATE on those nine columns FROM authenticated.
--   2. DROP POLICY clients_update_own.
--   clients_select_own is kept. anon and service_role are never touched. No other table or policy is touched.
--
-- IT REFUSES TO RUN if the live state differs from the inspected state (a different set of writable columns, an extra browser
-- write policy, a changed select policy, a missing service_role privilege, ...). It never broadens or weakens access: on any
-- surprise it aborts and the transaction rolls back with nothing changed. Re-running it after it has succeeded also aborts
-- (clients_update_own is gone), which is intended.
--
-- WHY THIS CANNOT BREAK THE LIVE APPLICATION. Every write to public.clients is server-side:
--   service-role / admin routes   provisioning (lib/provision-account.ts), portal Settings (api/client-portal/settings),
--                                 admin status / disconnect / create-business (api/admin/clients/...),
--                                 admin growth-profiles, growth-reviews complete, admin link-merchant,
--                                 portal invitations (lib/portal-invitations.ts)
--   SECURITY DEFINER functions    link_client_to_merchant, consume_portal_invitation
--   NOT reachable                 lib/services/growth-profile-service.ts writes clients from a browser-style client, but is
--                                 imported only by merchant-lifecycle.ts, which nothing imports.
--   No page or component that runs in the browser writes clients. The pages with dynamic table names (admin export / bulk
--   delete) use fixed lists that do not include clients. The portal avatar is uploaded to Storage by the browser and saved
--   through the Settings API (service role).
--   Middleware and the portal only READ the signed-in user's own row, which SELECT + clients_select_own still allow.
--
-- UNDO: scripts/clients-rls-02-rollback.sql (restores exactly the inspected state).
-- VERIFY AFTER: scripts/clients-rls-03-verify-readonly.sql must return OVERALL = PASS.
-- =============================================================================
BEGIN;

-- Hold the table steady (blocks writes, allows reads) while it is checked and changed.
LOCK TABLE public.clients IN SHARE ROW EXCLUSIVE MODE;

-- ── PRECONDITIONS: the live state must be the inspected state ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_oid      oid := to_regclass('public.clients');
  v_expected text[] := ARRAY['business_name', 'country', 'email_notifications', 'full_name', 'marketing_emails',
                             'profile_image', 'project_updates', 'website_url', 'whatsapp'];
  v_actual   text[];
  v_priv     text;
  v_cnt      int;
BEGIN
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Abort: public.clients does not exist'; END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_oid) THEN
    RAISE EXCEPTION 'Abort: RLS is not enabled on public.clients (expected enabled)';
  END IF;

  -- anon: nothing, at table or column level
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('anon', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: anon holds % on public.clients (expected none)', v_priv; END IF;
  END LOOP;
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES'] LOOP
    IF has_any_column_privilege('anon', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: anon holds column-level % on public.clients (expected none)', v_priv; END IF;
  END LOOP;

  -- authenticated: table-level SELECT and nothing else at table level
  IF NOT has_table_privilege('authenticated', v_oid, 'SELECT') THEN RAISE EXCEPTION 'Abort: authenticated lacks SELECT on public.clients'; END IF;
  FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('authenticated', v_oid, v_priv) THEN
      RAISE EXCEPTION 'Abort: authenticated holds table-level % on public.clients (inspected state had none; refusing to guess)', v_priv;
    END IF;
  END LOOP;
  IF has_any_column_privilege('authenticated', v_oid, 'INSERT') THEN
    RAISE EXCEPTION 'Abort: authenticated holds column-level INSERT on public.clients (inspected state had none)';
  END IF;

  -- authenticated: the writable columns are EXACTLY the nine inspected ones (a tenth would survive this script)
  SELECT array_agg(a.attname::text ORDER BY a.attname::text COLLATE "C") INTO v_actual
  FROM pg_attribute a
  WHERE a.attrelid = v_oid AND a.attnum > 0 AND NOT a.attisdropped AND has_column_privilege('authenticated', v_oid, a.attnum, 'UPDATE');
  IF v_actual IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Abort: authenticated column-level UPDATE is % (expected exactly %)', COALESCE(v_actual::text, '{}'), v_expected::text;
  END IF;

  -- policies: exactly the two inspected ones may touch the browser roles
  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_select_own'
     AND cmd = 'SELECT' AND roles = '{authenticated}'::name[]
     AND regexp_replace(COALESCE(qual, ''), '\s+', '', 'g') IN ('(auth.uid()=user_id)', '(user_id=auth.uid())');
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Abort: clients_select_own is missing or differs from (SELECT, authenticated, auth.uid() = user_id)'; END IF;

  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_update_own'
     AND cmd = 'UPDATE' AND roles = '{authenticated}'::name[]
     AND regexp_replace(COALESCE(qual, ''), '\s+', '', 'g') IN ('(auth.uid()=user_id)', '(user_id=auth.uid())')
     AND regexp_replace(COALESCE(with_check, ''), '\s+', '', 'g') IN ('(auth.uid()=user_id)', '(user_id=auth.uid())');
  IF v_cnt <> 1 THEN RAISE EXCEPTION 'Abort: clients_update_own is missing or differs from the inspected definition'; END IF;

  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'clients' AND policyname NOT IN ('clients_select_own', 'clients_update_own')
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND roles && ARRAY['public', 'anon', 'authenticated']::name[];
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'Abort: % other browser-role write policy(ies) exist on public.clients; not in the inspected state', v_cnt; END IF;

  -- service_role must already hold what the server routes need (this script never changes it)
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
    IF NOT has_table_privilege('service_role', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: service_role lacks % on public.clients', v_priv; END IF;
  END LOOP;
END $$;

-- ── THE CHANGE ───────────────────────────────────────────────────────────────────────────────────────────────────────────
REVOKE UPDATE (full_name, whatsapp, business_name, website_url, country, profile_image,
               email_notifications, project_updates, marketing_emails)
  ON public.clients FROM authenticated;

DROP POLICY clients_update_own ON public.clients;

-- ── POSTCONDITIONS: the final state, asserted before COMMIT ──────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_oid oid := to_regclass('public.clients');
  v_priv text;
  v_cols text;
BEGIN
  IF NOT has_table_privilege('authenticated', v_oid, 'SELECT') THEN RAISE EXCEPTION 'Abort: authenticated lost SELECT on public.clients'; END IF;
  IF has_any_column_privilege('authenticated', v_oid, 'INSERT') THEN RAISE EXCEPTION 'Abort: authenticated still has an effective INSERT on public.clients'; END IF;
  IF has_any_column_privilege('authenticated', v_oid, 'UPDATE') THEN
    SELECT string_agg(a.attname::text, ', ' ORDER BY a.attname) INTO v_cols
      FROM pg_attribute a WHERE a.attrelid = v_oid AND a.attnum > 0 AND NOT a.attisdropped AND has_column_privilege('authenticated', v_oid, a.attnum, 'UPDATE');
    RAISE EXCEPTION 'Abort: authenticated still has an effective UPDATE on public.clients (%)', COALESCE(v_cols, 'table level');
  END IF;
  IF has_table_privilege('authenticated', v_oid, 'DELETE') THEN RAISE EXCEPTION 'Abort: authenticated has DELETE on public.clients'; END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_update_own') THEN
    RAISE EXCEPTION 'Abort: clients_update_own still exists';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_select_own'
                   AND cmd = 'SELECT' AND roles = '{authenticated}'::name[]) THEN
    RAISE EXCEPTION 'Abort: clients_select_own is missing';
  END IF;

  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
    IF NOT has_table_privilege('service_role', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: service_role lost % on public.clients', v_priv; END IF;
  END LOOP;
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('anon', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: anon now holds % on public.clients', v_priv; END IF;
  END LOOP;
END $$;

COMMIT;
