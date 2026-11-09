-- =====================================================================================================================
-- Admin RLS — exact policy definitions. READ-ONLY. Run on STAGING (it is also safe on any project).
--
-- WHY: the first preflight classified portfolio_items_admin_all / portfolio_media_admin as BLOCKERs because it saw
-- "ALL to authenticated". That is only the ROLE list. Whether a policy lets every signed-in user write depends on its
-- USING / WITH CHECK expressions, which the first preflight did not print. The repository definitions are:
--     using (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true))
--     with check (the same expression)
-- i.e. ADMIN-ONLY, not "any authenticated user". This script prints what the DATABASE actually holds so that can be
-- confirmed or refuted, and checks admin_users_select_own for the "own row only" property.
--
--   * One statement, one result set (section | object | finding). Catalog reads only. Selects no table data.
--   * NOT EXECUTED and NOT PARSED by the assistant (no Postgres or SQL parser was available locally): check it for
--     syntax errors on staging and report any.
--   * Run as the table owner (postgres role in the SQL editor) so information_schema grant rows are visible.
--
-- HOW TO READ THE VERDICT after each policy:
--   ADMIN-CHECKED (active admin_users row)  write policy whose USING and WITH CHECK both test an active admin_users row for
--                                           auth.uid(): NOT open to ordinary signed-in users.
--   UNRESTRICTED WRITE                      a write policy for anon/authenticated/public that does NOT test admin membership:
--                                           ANY such user can write. A real blocker.
--   OWN-ROW ONLY                            admin_users policy that compares user_id with auth.uid() and contains no OR.
--   REVIEW: not a plain own-row test        read the expression; it may reveal other admins.
--
-- LIMIT OF THIS CHECK (important): an ADMIN-CHECKED policy proves "only active admins", NOT "only admins who completed
-- 2FA". RLS cannot see the 2FA cookie. Direct browser writes by an active admin therefore bypass the 2FA gate until those
-- writes are moved behind /api/admin routes and the browser write grants are revoked.
-- =====================================================================================================================

WITH targets(tablename) AS (
  VALUES ('portfolio_items'), ('portfolio_media'), ('portfolio_capabilities'), ('admin_users')
),
pol AS (
  SELECT tablename, policyname, permissive, cmd, array_to_string(roles, ',') AS roles_text, qual, with_check
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename IN (SELECT tablename FROM targets)
),
cls AS (
  SELECT p.*,
         (cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) AS is_write,
         (qual IS NULL OR (qual ~* 'admin_users' AND qual ~* 'is_active' AND qual ~* 'auth\.uid')) AS qual_is_admin_check,
         (with_check IS NULL OR (with_check ~* 'admin_users' AND with_check ~* 'is_active' AND with_check ~* 'auth\.uid')) AS check_is_admin_check
  FROM pol p
),
section1 AS (
  SELECT '1 policy'::text AS section,
         c.tablename || '.' || c.policyname AS object,
         c.cmd || ' to ' || c.roles_text || ' [' || c.permissive || '] => ' ||
         CASE
           WHEN c.tablename = 'admin_users' AND c.cmd = 'SELECT' THEN
             CASE WHEN c.qual ~* 'user_id' AND c.qual ~* 'auth\.uid' AND c.qual !~* '\mor\M' THEN 'OWN-ROW ONLY' ELSE 'REVIEW: not a plain own-row test' END
           WHEN NOT c.is_write THEN 'read policy'
           WHEN c.qual_is_admin_check AND c.check_is_admin_check AND (c.qual IS NOT NULL OR c.with_check IS NOT NULL) THEN 'ADMIN-CHECKED (active admin_users row)'
           ELSE 'UNRESTRICTED WRITE'
         END
         || ' | USING: ' || coalesce(c.qual, '(none)')
         || ' | WITH CHECK: ' || coalesce(c.with_check, '(none)') AS finding
  FROM cls c
),
section2 AS (
  SELECT '2 table state'::text,
         t.tablename,
         CASE WHEN r.relname IS NULL THEN 'TABLE NOT FOUND'
              ELSE 'rls=' || CASE WHEN r.relrowsecurity THEN 'ON' ELSE 'OFF' END
                   || ' | policies=' || (SELECT count(*) FROM pol WHERE pol.tablename = t.tablename)::text END
  FROM targets t
  LEFT JOIN (
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) r ON r.relname = t.tablename
),
section3 AS (
  SELECT '3 browser-role grants'::text,
         g.table_name || ' -> ' || g.grantee,
         string_agg(DISTINCT g.privilege_type, ',')
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.table_name IN (SELECT tablename FROM targets)
    AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')
  GROUP BY g.table_name, g.grantee
)
SELECT section, object, finding
FROM (
  SELECT * FROM section1
  UNION ALL SELECT * FROM section2
  UNION ALL SELECT * FROM section3
) u
ORDER BY section, object;
