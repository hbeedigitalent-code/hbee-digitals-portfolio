-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- Hbee Growth OS — Portal database privilege hardening (Phase 18.9)  ·  ROLLBACK
--
-- Run ONLY if portal-db-hardening-01-forward.sql was applied and the hardening has to be reversed (for example
-- because a legitimate flow that still writes to these tables from a browser role turned out to exist).
-- Run manually, once, in the Supabase SQL editor.
--
-- SELF-CONTAINED: it needs no backup table and creates no persistent object. It carries the inspected
-- policy definitions and privilege grants itself.
--
-- WHAT IT RESTORES (exactly what the forward migration removed, nothing else)
--   policies
--     public.projects          "Clients can create their own projects"                 INSERT  TO authenticated
--     public.project_requests  "Allow clients to insert their own project requests"    INSERT  TO public (policy role PUBLIC)
--     public.project_requests  "Allow clients to link their own project requests"      UPDATE  TO authenticated (USING and WITH CHECK)
--   privileges
--     projects          : INSERT, DELETE, MAINTAIN to authenticated
--     project_requests  : ALL (DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE) to anon;
--                         DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE to authenticated
--   MAINTAIN exists on PostgreSQL 17+ only; on an older server nothing is restored for it (the live database is 17+).
--   Not touched: RLS flags, retained policies, service_role, PUBLIC, schemas, data.
--
-- POLICY TEXT: the three policies are recreated exactly as inspected in live pg_policies. The verification script
-- (03, sections V7/V8) prints the live definitions before the migration for comparison.
--
-- SAFETY: one transaction; every assumption asserted BEFORE anything changes; any difference aborts with nothing
-- applied; the restored state is reconciled before COMMIT. Nothing is dropped.
-- ═════════════════════════════════════════════════════════════════════════════════════════════

BEGIN;

LOCK TABLE public.projects, public.project_requests IN SHARE ROW EXCLUSIVE MODE;


-- ── A. Preflight: the database must be in exactly the hardened state ───────────────────────────────
DO $$
DECLARE
  v_rec   record;
  v_count integer;
  v_names text;
  v_acl   text;
BEGIN
  -- A1. Tables exist with RLS enabled.
  SELECT count(*) INTO v_count
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests') AND c.relkind = 'r' AND c.relrowsecurity;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'ABORT (nothing changed): both tables must exist as ordinary tables with row-level security enabled.';
  END IF;

  -- A2. The three policies are currently ABSENT (otherwise there is nothing to roll back, or the state drifted).
  SELECT count(*), string_agg(tablename || ': ' || policyname, '; ') INTO v_count, v_names
  FROM   pg_policies
  WHERE  schemaname = 'public' AND policyname IN ('Clients can create their own projects',
         'Allow clients to insert their own project requests', 'Allow clients to link their own project requests');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT (nothing changed): target policies already exist (%) — nothing to roll back, or the hardened state has drifted.', v_names;
  END IF;

  -- A3. The retained policies are present.
  FOR v_rec IN SELECT * FROM (VALUES
      ('projects',         'projects_admin_all',                                      'ALL'),
      ('projects',         'projects_client_read_own',                                'SELECT'),
      ('projects',         'projects_public_read_published',                          'SELECT'),
      ('project_requests', 'Allow service role to manage project requests',           'ALL'),
      ('project_requests', 'Allow clients to select their own project requests',      'SELECT')
    ) AS t(tbl, pol, cmd) LOOP
    SELECT count(*) INTO v_count FROM pg_policies
    WHERE  schemaname = 'public' AND tablename = v_rec.tbl AND policyname = v_rec.pol AND cmd = v_rec.cmd;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'ABORT (nothing changed): expected retained policy "%" (cmd %) on public.% is missing.', v_rec.pol, v_rec.cmd, v_rec.tbl;
    END IF;
  END LOOP;

  -- A4. Browser-role privileges are exactly the hardened sets; PUBLIC holds nothing mutating.
  FOR v_rec IN SELECT * FROM (VALUES
      ('projects',         'anon',          'SELECT'),
      ('projects',         'authenticated', 'SELECT,UPDATE'),
      ('project_requests', 'anon',          ''),
      ('project_requests', 'authenticated', 'SELECT')
    ) AS t(tbl, role_name, expected) LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = v_rec.role_name;
    IF v_acl <> v_rec.expected THEN
      RAISE EXCEPTION 'ABORT (nothing changed): % holds [%] on public.% but the hardened state expects [%].', v_rec.role_name, v_acl, v_rec.tbl, v_rec.expected;
    END IF;
  END LOOP;

  SELECT count(*) INTO v_count
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
  WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests') AND a.grantee = 0
  AND    a.privilege_type::text IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT (nothing changed): PUBLIC holds mutating privileges on these tables; the state is not the hardened state.';
  END IF;

  -- A5. Remember what must not change (transaction-local only).
  FOR v_rec IN SELECT unnest(ARRAY['projects', 'project_requests']) AS tbl LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = 'service_role';
    IF v_acl = '' THEN
      RAISE EXCEPTION 'ABORT (nothing changed): service_role holds no privileges on public.%.', v_rec.tbl;
    END IF;
    PERFORM set_config('hbee.p189rb_service_' || v_rec.tbl, v_acl, true);
  END LOOP;

  PERFORM set_config('hbee.p189rb_kept_policies', coalesce((
    SELECT md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')),
                          E'\n' ORDER BY tablename, policyname))
    FROM   pg_policies WHERE schemaname = 'public' AND tablename IN ('projects', 'project_requests')), ''), true);
END
$$;


-- ── B. Restore the three policies ─────────────────────────────────────────────────────────────────
CREATE POLICY "Clients can create their own projects" ON public.projects
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = projects.client_id AND c.user_id = auth.uid()));

-- TO public: the policy role PUBLIC, exactly as inspected live (not authenticated).
CREATE POLICY "Allow clients to insert their own project requests" ON public.project_requests
  AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (auth.uid() IN (SELECT clients.user_id FROM public.clients WHERE clients.id = project_requests.client_id));

CREATE POLICY "Allow clients to link their own project requests" ON public.project_requests
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING      (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = project_requests.client_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.clients c WHERE c.id = project_requests.client_id AND c.user_id = auth.uid()));


-- ── C. Restore exactly the privileges the forward migration removed ───────────────────────────────
GRANT DELETE, INSERT ON TABLE public.projects TO authenticated;

GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE public.project_requests TO anon;
GRANT DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE         ON TABLE public.project_requests TO authenticated;

-- MAINTAIN (PostgreSQL 17+), restored exactly where the live database had it: authenticated on projects, and
-- anon + authenticated on project_requests. Dynamic SQL only so the script still runs where the name does not exist.
DO $$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'GRANT MAINTAIN ON TABLE public.projects TO authenticated';
    EXECUTE 'GRANT MAINTAIN ON TABLE public.project_requests TO anon, authenticated';
  END IF;
END
$$;


-- ── D. Reconcile the restored state ───────────────────────────────────────────────────────────────
DO $$
DECLARE
  v_rec    record;
  v_count  integer;
  v_acl    text;
  v_before text;
  v_after  text;
  v_expected text;
  v_pg17   boolean := current_setting('server_version_num')::integer >= 170000;
BEGIN
  -- D1. The three policies exist again with the inspected live shape (permissive, command, roles, USING, WITH CHECK).
  FOR v_rec IN SELECT * FROM (VALUES
      ('projects',         'Clients can create their own projects',              'INSERT', ARRAY['authenticated']::name[], NULL::text,
       'existsselect1fromclientscwherec.id=projects.client_idandc.user_id=auth.uid'),
      ('project_requests', 'Allow clients to insert their own project requests', 'INSERT', ARRAY['public']::name[],        NULL::text,
       'auth.uidinselectclients.user_idfromclientswhereclients.id=project_requests.client_id'),
      ('project_requests', 'Allow clients to link their own project requests',   'UPDATE', ARRAY['authenticated']::name[],
       'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid',
       'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid')
    ) AS t(tbl, pol, cmd, roles_expected, norm_qual, norm_check) LOOP
    SELECT count(*) INTO v_count FROM pg_policies p
    WHERE  p.schemaname = 'public' AND p.tablename = v_rec.tbl AND p.policyname = v_rec.pol
    AND    p.cmd = v_rec.cmd AND p.permissive = 'PERMISSIVE' AND p.roles = v_rec.roles_expected
    AND    ((v_rec.norm_qual IS NULL AND p.qual IS NULL)
         OR (v_rec.norm_qual IS NOT NULL
             AND regexp_replace(lower(coalesce(p.qual, '')), '[[:space:]()]|public\.', '', 'g') = v_rec.norm_qual))
    AND    regexp_replace(lower(coalesce(p.with_check, '')), '[[:space:]()]|public\.', '', 'g') = v_rec.norm_check;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'ABORT: policy "%" on public.% was not restored with the expected shape.', v_rec.pol, v_rec.tbl;
    END IF;
  END LOOP;

  -- D2. The pre-existing policies were not disturbed (fingerprint of everything that existed before).
  v_before := current_setting('hbee.p189rb_kept_policies', true);
  SELECT coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')),
                                 E'\n' ORDER BY tablename, policyname)), '') INTO v_after
  FROM   pg_policies
  WHERE  schemaname = 'public' AND tablename IN ('projects', 'project_requests')
  AND    policyname NOT IN ('Clients can create their own projects',
                            'Allow clients to insert their own project requests',
                            'Allow clients to link their own project requests');
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'ABORT: a pre-existing policy changed during the rollback.';
  END IF;

  -- D3. Privileges are the original inspected sets again (the live BEFORE shape, MAINTAIN included on PostgreSQL 17+).
  FOR v_rec IN SELECT * FROM (VALUES
      ('projects',         'anon',          'SELECT'),
      ('projects',         'authenticated', 'DELETE,INSERT,MAINTAIN,SELECT,UPDATE'),
      ('project_requests', 'anon',          'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE'),
      ('project_requests', 'authenticated', 'DELETE,INSERT,MAINTAIN,REFERENCES,SELECT,TRIGGER,TRUNCATE,UPDATE')
    ) AS t(tbl, role_name, expected) LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = v_rec.role_name;
    v_expected := CASE WHEN v_pg17 THEN v_rec.expected ELSE replace(v_rec.expected, 'MAINTAIN,', '') END;
    IF v_acl <> v_expected THEN
      RAISE EXCEPTION 'ABORT: % holds [%] on public.% after the rollback (expected [%]).', v_rec.role_name, v_acl, v_rec.tbl, v_expected;
    END IF;
  END LOOP;

  -- D4. service_role untouched.
  FOR v_rec IN SELECT unnest(ARRAY['projects', 'project_requests']) AS tbl LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = 'service_role';
    IF v_acl IS DISTINCT FROM current_setting('hbee.p189rb_service_' || v_rec.tbl, true) THEN
      RAISE EXCEPTION 'ABORT: service_role privileges on public.% changed; they must not.', v_rec.tbl;
    END IF;
  END LOOP;

  RAISE NOTICE 'Rollback complete: the three policies and the removed privileges are restored.';
END
$$;

COMMIT;
