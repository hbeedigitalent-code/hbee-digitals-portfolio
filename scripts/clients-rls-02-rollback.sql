-- =============================================================================
-- public.clients — ROLLBACK of clients-rls-02-revoke-browser-writes-PRODUCTION.sql. Project: hbee-digitals-cms. NOT YET EXECUTED.
--
-- RESTORES EXACTLY THE INSPECTED PRE-HARDENING STATE, and nothing more:
--   * GRANT UPDATE, as COLUMN-LEVEL privileges only, to `authenticated` on exactly
--       full_name, whatsapp, business_name, website_url, country, profile_image,
--       email_notifications, project_updates, marketing_emails
--   * CREATE POLICY clients_update_own  FOR UPDATE  TO authenticated
--       USING (auth.uid() = user_id)  WITH CHECK (auth.uid() = user_id)
--
-- IT DOES NOT: grant table-level UPDATE; grant INSERT or DELETE; touch clients_select_own; touch anon or service_role; touch any
-- other table or policy.
--
-- Use it only if the hardening has to be withdrawn. Rolling back re-opens the direct browser write path to those nine columns
-- (including full_name and business_name, which are printed on invoices and proposals).
--
-- Safe to run twice: GRANT is idempotent, and the policy is dropped-if-present then recreated inside the same transaction.
-- It aborts, changing nothing, if the table is missing, RLS is off, clients_select_own is missing, or a policy other than
-- clients_update_own already lets a browser role write.
-- =============================================================================
BEGIN;

LOCK TABLE public.clients IN SHARE ROW EXCLUSIVE MODE;

DO $$
DECLARE
  v_oid oid := to_regclass('public.clients');
  v_cnt int;
BEGIN
  IF v_oid IS NULL THEN RAISE EXCEPTION 'Abort: public.clients does not exist'; END IF;
  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid = v_oid) THEN RAISE EXCEPTION 'Abort: RLS is not enabled on public.clients'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_select_own') THEN
    RAISE EXCEPTION 'Abort: clients_select_own is missing; refusing to restore a write path without the read policy';
  END IF;
  SELECT count(*) INTO v_cnt FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'clients' AND policyname <> 'clients_update_own'
     AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND roles && ARRAY['public', 'anon', 'authenticated']::name[];
  IF v_cnt <> 0 THEN RAISE EXCEPTION 'Abort: % other browser-role write policy(ies) exist on public.clients', v_cnt; END IF;
END $$;

GRANT UPDATE (full_name, whatsapp, business_name, website_url, country, profile_image,
              email_notifications, project_updates, marketing_emails)
  ON public.clients TO authenticated;

DROP POLICY IF EXISTS clients_update_own ON public.clients;
CREATE POLICY clients_update_own
  ON public.clients
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── POSTCONDITIONS: exactly the inspected pre-hardening state ────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_oid oid := to_regclass('public.clients');
  v_expected text[] := ARRAY['business_name', 'country', 'email_notifications', 'full_name', 'marketing_emails',
                             'profile_image', 'project_updates', 'website_url', 'whatsapp'];
  v_actual text[];
  v_priv text;
BEGIN
  SELECT array_agg(a.attname::text ORDER BY a.attname::text COLLATE "C") INTO v_actual
  FROM pg_attribute a
  WHERE a.attrelid = v_oid AND a.attnum > 0 AND NOT a.attisdropped AND has_column_privilege('authenticated', v_oid, a.attnum, 'UPDATE');
  IF v_actual IS DISTINCT FROM v_expected THEN
    RAISE EXCEPTION 'Abort: authenticated column-level UPDATE is % (expected exactly %)', COALESCE(v_actual::text, '{}'), v_expected::text;
  END IF;

  FOREACH v_priv IN ARRAY ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('authenticated', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: authenticated holds table-level % (rollback must not grant it)', v_priv; END IF;
  END LOOP;
  IF NOT has_table_privilege('authenticated', v_oid, 'SELECT') THEN RAISE EXCEPTION 'Abort: authenticated lacks SELECT'; END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'clients' AND policyname = 'clients_update_own'
                   AND cmd = 'UPDATE' AND roles = '{authenticated}'::name[]
                   AND regexp_replace(COALESCE(qual, ''), '\s+', '', 'g') IN ('(auth.uid()=user_id)', '(user_id=auth.uid())')
                   AND regexp_replace(COALESCE(with_check, ''), '\s+', '', 'g') IN ('(auth.uid()=user_id)', '(user_id=auth.uid())')) THEN
    RAISE EXCEPTION 'Abort: clients_update_own was not restored as inspected';
  END IF;

  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'] LOOP
    IF has_table_privilege('anon', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: anon holds % on public.clients', v_priv; END IF;
  END LOOP;
  FOREACH v_priv IN ARRAY ARRAY['SELECT', 'INSERT', 'UPDATE'] LOOP
    IF NOT has_table_privilege('service_role', v_oid, v_priv) THEN RAISE EXCEPTION 'Abort: service_role lacks %', v_priv; END IF;
  END LOOP;
END $$;

COMMIT;
