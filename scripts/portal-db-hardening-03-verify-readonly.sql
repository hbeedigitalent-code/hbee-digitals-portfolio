-- ═════════════════════════════════════════════════════════════════════════════════════════════
-- Hbee Growth OS — Portal database privilege hardening (Phase 18.9)  ·  VERIFICATION (READ-ONLY)
--
-- Run BEFORE the forward migration (starting state, PUBLIC check, compatibility checks, exact policy text)
-- and AGAIN AFTER it (end state). SELECT statements only; creates nothing; safe to re-run. It does not depend on
-- anything the migration creates.
-- A table or policy missing from a result means "does not exist", not "unprotected".
--
-- EXPECTED BEFORE
--   V3  PUBLIC holds NO privileges on either table (the migration aborts otherwise).
--       anon / authenticated hold the inspected sets (see the forward script header).
--   V7  prints the exact live CREATE POLICY text of the three policies the migration drops.
--   V8  prints policyname, permissive, roles, cmd, qual and with_check of those three policies, and whether each
--       matches the shape the forward migration asserts (matches_expected_shape must be true on all three):
--         projects          "Clients can create their own projects"                 INSERT TO authenticated
--         project_requests  "Allow clients to insert their own project requests"   INSERT TO public (policy role PUBLIC)
--         project_requests  "Allow clients to link their own project requests"     UPDATE TO authenticated (USING = WITH CHECK)
--
-- EXPECTED AFTER
--   V1  rls_enabled = true on both tables.
--   V2  projects: projects_admin_all, projects_client_read_own, projects_public_read_published.
--       project_requests: "Allow service role to manage project requests" and
--       "Allow clients to select their own project requests". No INSERT/UPDATE policy for clients.
--   V3  PUBLIC: nothing. anon: SELECT on projects only. authenticated: SELECT + UPDATE on projects; SELECT on
--       project_requests. service_role: identical to before.
--   V4  the ONLY browser-role mutation path left is authenticated UPDATE on projects, via projects_admin_all
--       (active admins only). Anything else listed there is an unexpected path.
--   V5/V6  no trigger or SECURITY INVOKER function writes these tables as a browser role.
-- ═════════════════════════════════════════════════════════════════════════════════════════════


-- V1. Row-level security flags ---------------------------------------------------------------------------
SELECT n.nspname AS schemaname, c.relname AS tablename,
       c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN ('projects', 'project_requests')
ORDER  BY c.relname;


-- V2. All policies on the two tables ---------------------------------------------------------------------
SELECT tablename, policyname, permissive, roles, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public' AND tablename IN ('projects', 'project_requests')
ORDER  BY tablename, cmd, policyname;


-- V3. Table privileges for PUBLIC, anon, authenticated and service_role -----------------------------------
SELECT c.relname AS tablename,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS role_name,
       a.privilege_type
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace,
       LATERAL aclexplode(c.relacl) a
WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests')
AND    (a.grantee = 0 OR pg_get_userbyid(a.grantee) IN ('anon', 'authenticated', 'service_role'))
ORDER  BY c.relname,
          CASE WHEN a.grantee = 0 THEN 0 ELSE 1 END,
          role_name, a.privilege_type;


-- V4. Browser-capable mutation paths: every mutating privilege held by PUBLIC / anon / authenticated, with the
--     policies that could let it act (a policy applies when its command matches or is ALL and its roles include
--     the role or public). A privilege with no applicable policy is inert under RLS; a policy that is not
--     admin-only is a client write path. -----------------------------------------------------------------------
SELECT c.relname AS tablename,
       CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS role_name,
       a.privilege_type,
       (SELECT string_agg(p.policyname || ' [' || p.cmd || ']' ||
                          CASE WHEN coalesce(p.qual, '') ILIKE '%admin_users%' OR coalesce(p.with_check, '') ILIKE '%admin_users%'
                               THEN ' (admin-only)' ELSE ' (NOT admin-only)' END, '; ')
        FROM   pg_policies p
        WHERE  p.schemaname = 'public' AND p.tablename = c.relname
        AND    p.cmd IN ('ALL', a.privilege_type::text)
        AND    (p.roles @> ARRAY['public']::name[]
             OR p.roles @> ARRAY[CASE WHEN a.grantee = 0 THEN 'public' ELSE pg_get_userbyid(a.grantee) END]::name[])) AS applicable_policies
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace,
       LATERAL aclexplode(c.relacl) a
WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests')
AND    (a.grantee = 0 OR pg_get_userbyid(a.grantee) IN ('anon', 'authenticated'))
AND    a.privilege_type::text IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'TRIGGER', 'REFERENCES')
ORDER  BY c.relname, role_name, a.privilege_type;


-- V5. Triggers on the two tables (a trigger that writes them as the invoking browser role would need the
--     privileges being revoked) ----------------------------------------------------------------------------
SELECT c.relname AS tablename, t.tgname AS trigger_name, t.tgenabled AS enabled,
       pg_get_triggerdef(t.oid) AS definition
FROM   pg_trigger t
JOIN   pg_class c ON c.oid = t.tgrelid
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relname IN ('projects', 'project_requests') AND NOT t.tgisinternal
ORDER  BY c.relname, t.tgname;


-- V6. Functions / routines whose body mentions either table, whether they run as their owner (SECURITY DEFINER)
--     or as the caller, and whether the browser roles may execute them. A SECURITY INVOKER function that writes
--     these tables, executable by anon / authenticated, is the compatibility risk. ---------------------------
SELECT p.proname AS function_name, p.prosecdef AS security_definer, pg_get_userbyid(p.proowner) AS owner,
       has_function_privilege('anon', p.oid, 'EXECUTE')          AS anon_can_execute,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_can_execute
FROM   pg_proc p
JOIN   pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public'
AND    (p.prosrc ILIKE '%project_requests%' OR p.prosrc ILIKE '%projects%')
ORDER  BY p.proname;


-- V7. Exact live definitions of the three policies the migration drops, as CREATE POLICY text (returns no rows once
--     they are dropped). Use BEFORE the migration to confirm the rollback script restores the same thing. --------
SELECT format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s%s%s;',
              policyname, schemaname, tablename, permissive, cmd,
              (SELECT string_agg(CASE WHEN r = 'public' THEN 'public' ELSE quote_ident(r) END, ', ') FROM unnest(roles) AS r),
              CASE WHEN qual       IS NOT NULL THEN E'\n  USING (' || qual || ')'            ELSE '' END,
              CASE WHEN with_check IS NOT NULL THEN E'\n  WITH CHECK (' || with_check || ')' ELSE '' END) AS create_policy_statement
FROM   pg_policies
WHERE  schemaname = 'public'
AND    policyname IN ('Clients can create their own projects',
                      'Allow clients to insert their own project requests',
                      'Allow clients to link their own project requests')
ORDER  BY tablename, policyname;


-- V8. The three policies the migration drops: full live shape and whether each matches what the forward migration
--     asserts (normalised: lower-case, no whitespace / parentheses / "public." prefix). No rows once dropped. -----
SELECT p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check,
       (p.permissive = 'PERMISSIVE'
        AND p.cmd = e.cmd
        AND p.roles = e.roles_expected
        AND ((e.norm_qual IS NULL AND p.qual IS NULL)
          OR (e.norm_qual IS NOT NULL
              AND regexp_replace(lower(coalesce(p.qual, '')), '[[:space:]()]|public\.', '', 'g') = e.norm_qual))
        AND regexp_replace(lower(coalesce(p.with_check, '')), '[[:space:]()]|public\.', '', 'g') = e.norm_check) AS matches_expected_shape
FROM   pg_policies p
JOIN  (VALUES
        ('projects',         'Clients can create their own projects',              'INSERT', ARRAY['authenticated']::name[], NULL::text,
         'existsselect1fromclientscwherec.id=projects.client_idandc.user_id=auth.uid'),
        ('project_requests', 'Allow clients to insert their own project requests', 'INSERT', ARRAY['public']::name[],        NULL::text,
         'auth.uidinselectclients.user_idfromclientswhereclients.id=project_requests.client_id'),
        ('project_requests', 'Allow clients to link their own project requests',   'UPDATE', ARRAY['authenticated']::name[],
         'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid',
         'existsselect1fromclientscwherec.id=project_requests.client_idandc.user_id=auth.uid')
      ) AS e(tbl, pol, cmd, roles_expected, norm_qual, norm_check)
  ON  e.tbl = p.tablename AND e.pol = p.policyname
WHERE  p.schemaname = 'public'
ORDER  BY p.tablename, p.policyname;
