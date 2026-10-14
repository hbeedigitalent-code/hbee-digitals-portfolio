-- ═════════════════════════════════════════════════════════════════════════════════════════════
--
--   !!  OPERATIONAL GATE. APPLY ONLY AFTER ALL OF THE FOLLOWING ARE TRUE:  !!
--
--     1. the rebuilt Client Portal is deployed and serving production traffic (requests are created through
--        POST /api/client-portal/project-requests and read through /api/client-portal/requests; nothing in the
--        portal writes `projects` or `project_requests` from the browser);
--     2. the production portal smoke test has passed;
--     3. the portal invitation smoke test has passed;
--     4. portal-db-hardening-03-verify-readonly.sql, run against production, matches the EXPECTED BEFORE state
--        described in that script.
--
--   Applying this migration while any browser code still writes these tables directly would break client
--   project requests. If the before-state check does not match, STOP: the script's own preflight would abort anyway.
--
-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- Hbee Growth OS — Portal database privilege hardening (Phase 18.9)  ·  FORWARD MIGRATION
--
-- Run in : Supabase SQL editor, once, against the production database.
-- Scope  : privilege and policy hardening ONLY. It creates no tables, functions or any other persistent
--          object, changes no schema, no data, no storage, no RLS flag, and never touches service_role.
--
-- DROPS (exactly three policies, by their exact live names; each asserted against its inspected live shape)
--   public.projects          "Clients can create their own projects"                 INSERT  TO authenticated
--   public.project_requests  "Allow clients to insert their own project requests"    INSERT  TO public (the policy role PUBLIC)
--   public.project_requests  "Allow clients to link their own project requests"      UPDATE  TO authenticated
--
-- REVOKES (browser roles only)
--   projects          : INSERT, DELETE, MAINTAIN from authenticated
--   project_requests  : ALL (including MAINTAIN) from anon;
--                       DELETE, INSERT, MAINTAIN, REFERENCES, TRIGGER, TRUNCATE, UPDATE from authenticated
--
-- MAINTAIN (PostgreSQL 17+) is the table privilege that allows VACUUM, ANALYZE, CLUSTER, REINDEX,
-- REFRESH MATERIALIZED VIEW and LOCK TABLE. Row-level security does not apply to those maintenance
-- operations, so no policy limits them, and no Hbee browser flow needs them. The live database
-- grants MAINTAIN to anon / authenticated, so it is revoked here. service_role keeps MAINTAIN.
-- On a server older than PostgreSQL 17 the privilege does not exist; the script then expects and
-- revokes nothing for it (the live production database is 17+, so MAINTAIN is checked strictly there).
--
-- KEEPS
--   projects          : anon SELECT; authenticated SELECT and UPDATE (the admin image tool still updates
--                       projects.image_url from the browser; RLS limits it to active admins via projects_admin_all);
--                       policies projects_admin_all, projects_client_read_own, projects_public_read_published
--   project_requests  : authenticated SELECT; policies "Allow service role to manage project requests" and
--                       "Allow clients to select their own project requests"
--   service_role      : untouched (asserted unchanged)
--
-- PUBLIC (the PostgreSQL pseudo-role): NOT revoked on assumption. The preflight proves PUBLIC holds no
-- mutation or dangerous privilege on either table; if it does, the migration ABORTS so a human decides.
--
-- SAFETY
--   * One transaction. Every assumption is asserted BEFORE anything is changed; any difference between the
--     live state and the inspected state RAISES and nothing is applied (drift is explicit, never guessed).
--   * Policy shape is asserted by exact name, permissive flag, command, roles and the ownership predicates
--     (normalised comparison of qual / with_check against the inspected live expressions).
--   * "TO public" on a policy is a POLICY ROLE and unrelated to table privileges granted to PUBLIC (checked in A5).
--   * Both tables are locked for the duration (SHARE ROW EXCLUSIVE: reads still allowed).
--   * No exception handlers: an unexpected error aborts everything.
--   * The rollback script (portal-db-hardening-02-rollback.sql) is self-contained.
-- ═════════════════════════════════════════════════════════════════════════════════════════════

BEGIN;

LOCK TABLE public.projects, public.project_requests IN SHARE ROW EXCLUSIVE MODE;


-- ── A. Preflight: assert the live state is exactly what was inspected (nothing is changed yet) ───────
DO $$
DECLARE
  v_rec    record;
  v_count  integer;
  v_names  text;
  v_actual text;
  v_acl    text;
  v_expected text;
  v_pg17   boolean := current_setting('server_version_num')::integer >= 170000;
BEGIN
  -- A1. Both tables exist as ordinary tables with row-level security enabled.
  FOR v_rec IN SELECT unnest(ARRAY['projects', 'project_requests']) AS tbl LOOP
    SELECT count(*) INTO v_count
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND c.relkind = 'r' AND c.relrowsecurity;
    IF v_count <> 1 THEN
      RAISE EXCEPTION 'ABORT (nothing changed): public.% must exist as an ordinary table with row-level security ENABLED.', v_rec.tbl;
    END IF;
  END LOOP;

  -- A2. The three policies to drop: exact name, permissive flag, command, roles and ownership predicate, as inspected live.
  --     Predicates are compared in normalised form (lower-case; whitespace, parentheses and a "public." prefix removed),
  --     so formatting differences cannot cause a false abort but any semantic difference does.
  --       projects          INSERT  TO authenticated  qual NULL
  --                         WITH CHECK (EXISTS (SELECT 1 FROM clients c WHERE c.id = projects.client_id AND c.user_id = auth.uid()))
  --       project_requests  INSERT  TO public         qual NULL      <- the policy role PUBLIC, not authenticated
  --                         WITH CHECK (auth.uid() IN (SELECT clients.user_id FROM clients WHERE clients.id = project_requests.client_id))
  --       project_requests  UPDATE  TO authenticated
  --                         USING and WITH CHECK both: EXISTS (SELECT 1 FROM clients c WHERE c.id = project_requests.client_id AND c.user_id = auth.uid())
  FOR v_rec IN SELECT * FROM (VALUES
      ('projects',         'Clients can create their own projects',              'INSERT', ARRAY['authenticated']::name[], NULL::text,
       'existsselect1fromclientscwherec.id=projects.client_idandc.user_id=auth.uid'),
      ('project_requests', 'Allow clients to insert their own project requests', 'INSERT', ARRAY['public']::name[],        NULL::text,
       'auth.uidinselectclients.user_idfromclientswhereclients.id=project_requests.client_id'),
      ('project_requests', 'Allow clients to link their own project requests',   'UPDATE', ARRAY['authenticated']::name[],
       'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid',
       'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid')
    ) AS t(tbl, pol, cmd, roles_expected, norm_qual, norm_check) LOOP
    SELECT count(*) INTO v_count
    FROM   pg_policies p
    WHERE  p.schemaname = 'public' AND p.tablename = v_rec.tbl AND p.policyname = v_rec.pol
    AND    p.cmd = v_rec.cmd
    AND    p.permissive = 'PERMISSIVE'
    AND    p.roles = v_rec.roles_expected
    AND    ((v_rec.norm_qual IS NULL AND p.qual IS NULL)
         OR (v_rec.norm_qual IS NOT NULL
             AND regexp_replace(lower(coalesce(p.qual, '')), '[[:space:]()]|public\.', '', 'g') = v_rec.norm_qual))
    AND    regexp_replace(lower(coalesce(p.with_check, '')), '[[:space:]()]|public\.', '', 'g') = v_rec.norm_check;
    IF v_count <> 1 THEN
      SELECT format('permissive=%s roles=%s cmd=%s qual=%s with_check=%s', p.permissive, p.roles, p.cmd, p.qual, p.with_check)
      INTO   v_actual
      FROM   pg_policies p WHERE p.schemaname = 'public' AND p.tablename = v_rec.tbl AND p.policyname = v_rec.pol;
      RAISE EXCEPTION 'ABORT (nothing changed): policy "%" on public.% is missing or differs from the inspected live shape (cmd %, roles %, ownership predicate). Live: %',
        v_rec.pol, v_rec.tbl, v_rec.cmd, v_rec.roles_expected, coalesce(v_actual, '<policy does not exist>');
    END IF;
  END LOOP;

  -- A3. The policies that must be kept exist, with their inspected command.
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
      RAISE EXCEPTION 'ABORT (nothing changed): expected exactly one retained policy "%" (cmd %) on public.%, found %.', v_rec.pol, v_rec.cmd, v_rec.tbl, v_count;
    END IF;
  END LOOP;

  -- A4. No OTHER browser-capable mutation policy exists. Anything mutation-capable besides the three dropped
  --     policies must be admin-only or service-role-only; otherwise a client write path would survive.
  SELECT count(*), string_agg(tablename || ': ' || policyname || ' (' || cmd || ')', '; ') INTO v_count, v_names
  FROM   pg_policies
  WHERE  schemaname = 'public' AND tablename IN ('projects', 'project_requests')
  AND    cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND    policyname NOT IN ('Clients can create their own projects',
                            'Allow clients to insert their own project requests',
                            'Allow clients to link their own project requests')
  AND    NOT (coalesce(qual, '') ILIKE '%admin_users%' OR coalesce(with_check, '') ILIKE '%admin_users%'
           OR coalesce(qual, '') ILIKE '%service_role%' OR coalesce(with_check, '') ILIKE '%service_role%'
           OR roles = ARRAY['service_role']::name[]);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT (nothing changed): unexpected mutation-capable policies that are neither admin-only nor service-role-only: %', v_names;
  END IF;

  -- A5. Privileges: the browser roles hold EXACTLY the inspected sets (so the revokes below, and the rollback,
  --     are exact). PUBLIC must hold nothing mutating or dangerous (it is never revoked here).
  -- The live BEFORE shape, MAINTAIN included (PostgreSQL 17+). On an older server the same lists apply without it.
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
      RAISE EXCEPTION 'ABORT (nothing changed): % holds [%] on public.% but this migration was written for [%]. Review the live grants and revise.',
        v_rec.role_name, v_acl, v_rec.tbl, v_expected;
    END IF;
  END LOOP;

  SELECT count(*), string_agg(c.relname || ':' || a.privilege_type, ', ') INTO v_count, v_names
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
  WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests') AND a.grantee = 0
  AND    a.privilege_type::text IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT (nothing changed): PostgreSQL PUBLIC holds privileges on these tables (%). This migration deliberately does not revoke PUBLIC on assumption; add an explicit, reviewed PUBLIC revoke if intended.', v_names;
  END IF;

  -- A6. Remember what must NOT change (transaction-local, no persistent object): service_role's privileges and the
  --     fingerprint of every policy that is kept.
  FOR v_rec IN SELECT unnest(ARRAY['projects', 'project_requests']) AS tbl LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = 'service_role';
    IF v_acl = '' THEN
      RAISE EXCEPTION 'ABORT (nothing changed): service_role holds no privileges on public.% — the server routes would already be failing.', v_rec.tbl;
    END IF;
    PERFORM set_config('hbee.p189_service_' || v_rec.tbl, v_acl, true);
  END LOOP;

  PERFORM set_config('hbee.p189_kept_policies', coalesce((
    SELECT md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')),
                          E'\n' ORDER BY tablename, policyname))
    FROM   pg_policies
    WHERE  schemaname = 'public' AND tablename IN ('projects', 'project_requests')
    AND    policyname NOT IN ('Clients can create their own projects',
                              'Allow clients to insert their own project requests',
                              'Allow clients to link their own project requests')), ''), true);
END
$$;


-- ── B. The change ─────────────────────────────────────────────────────────────────────────────────
DROP POLICY "Clients can create their own projects"              ON public.projects;
DROP POLICY "Allow clients to insert their own project requests" ON public.project_requests;
DROP POLICY "Allow clients to link their own project requests"   ON public.project_requests;

REVOKE DELETE, INSERT ON TABLE public.projects FROM authenticated;

REVOKE ALL ON TABLE public.project_requests FROM anon;
REVOKE DELETE, INSERT, REFERENCES, TRIGGER, TRUNCATE, UPDATE ON TABLE public.project_requests FROM authenticated;

-- MAINTAIN (PostgreSQL 17+): VACUUM / ANALYZE / CLUSTER / REINDEX / REFRESH MATERIALIZED VIEW / LOCK TABLE.
-- Revoked from the browser roles only; service_role is not touched. Dynamic SQL only so the script still runs
-- on a server where the privilege name does not exist; on PostgreSQL 17+ these statements execute.
DO $$
BEGIN
  IF current_setting('server_version_num')::integer >= 170000 THEN
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.projects FROM authenticated';
    EXECUTE 'REVOKE MAINTAIN ON TABLE public.project_requests FROM anon, authenticated';
  END IF;
END
$$;


-- ── C. Post-change assertions (a failure rolls the whole migration back) ──────────────────────────────
DO $$
DECLARE
  v_rec    record;
  v_count  integer;
  v_names  text;
  v_acl    text;
  v_before text;
  v_after  text;
BEGIN
  -- C1. RLS still enabled on both tables.
  SELECT count(*) INTO v_count
  FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests') AND c.relrowsecurity;
  IF v_count <> 2 THEN
    RAISE EXCEPTION 'ABORT: row-level security is not enabled on both tables after the change.';
  END IF;

  -- C2. The three policies are gone; every other policy is byte-for-byte unchanged.
  SELECT count(*) INTO v_count FROM pg_policies
  WHERE  schemaname = 'public' AND policyname IN ('Clients can create their own projects',
         'Allow clients to insert their own project requests', 'Allow clients to link their own project requests');
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT: % of the three target policies still exist.', v_count;
  END IF;

  v_before := current_setting('hbee.p189_kept_policies', true);
  SELECT coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', tablename, policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')),
                                 E'\n' ORDER BY tablename, policyname)), '') INTO v_after
  FROM   pg_policies WHERE schemaname = 'public' AND tablename IN ('projects', 'project_requests');
  IF v_before IS DISTINCT FROM v_after THEN
    RAISE EXCEPTION 'ABORT: a retained policy changed during the migration (fingerprint % -> %).', v_before, v_after;
  END IF;

  -- C3. Final privilege sets for the browser roles.
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
      RAISE EXCEPTION 'ABORT: % holds [%] on public.% after the change (expected [%]).', v_rec.role_name, v_acl, v_rec.tbl, v_rec.expected;
    END IF;
  END LOOP;

  -- C4. service_role is exactly as before.
  FOR v_rec IN SELECT unnest(ARRAY['projects', 'project_requests']) AS tbl LOOP
    SELECT coalesce(string_agg(a.privilege_type::text, ',' ORDER BY a.privilege_type::text), '') INTO v_acl
    FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
    WHERE  n.nspname = 'public' AND c.relname = v_rec.tbl AND pg_get_userbyid(a.grantee) = 'service_role';
    IF v_acl IS DISTINCT FROM current_setting('hbee.p189_service_' || v_rec.tbl, true) THEN
      RAISE EXCEPTION 'ABORT: service_role privileges on public.% changed; they must not.', v_rec.tbl;
    END IF;
  END LOOP;

  -- C5. No browser-capable mutation path remains: every remaining mutation-capable policy is admin-only or service-role-only.
  SELECT count(*), string_agg(tablename || ': ' || policyname || ' (' || cmd || ')', '; ') INTO v_count, v_names
  FROM   pg_policies
  WHERE  schemaname = 'public' AND tablename IN ('projects', 'project_requests')
  AND    cmd IN ('ALL', 'INSERT', 'UPDATE', 'DELETE')
  AND    NOT (coalesce(qual, '') ILIKE '%admin_users%' OR coalesce(with_check, '') ILIKE '%admin_users%'
           OR coalesce(qual, '') ILIKE '%service_role%' OR coalesce(with_check, '') ILIKE '%service_role%'
           OR roles = ARRAY['service_role']::name[]);
  IF v_count <> 0 THEN
    RAISE EXCEPTION 'ABORT: a mutation-capable policy that is neither admin-only nor service-role-only remains: %', v_names;
  END IF;

  RAISE NOTICE 'Portal database hardening applied and verified.';
END
$$;

COMMIT;
