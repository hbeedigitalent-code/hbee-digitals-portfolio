-- =====================================================================================================================
-- Production RLS audit for the 16 CMS / client / public-form tables.  READ-ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- WHY: the staging-style preflight labels any "write for authenticated" policy a BLOCKER. On production that is NOT a verdict:
-- several of these tables intentionally accept public inserts (contact form, newsletter, comments), intentionally let a signed-in
-- client touch only their own row, or already test for an active admin. This script prints each policy's EXACT USING / WITH CHECK
-- text, classifies what the expression actually does, and compares it with the INTENT that the application code implies for that
-- table. Only a policy marked UNSAFE below (a write that the code never needs from a non-admin, but which the expression
-- allows to non-admins) is a candidate for remediation. Nothing here changes anything.
--
-- INTENT (derived from src/, listed per table in docs/admin-production-release-a4.md; the live definitions are NOT in the repo):
--   ADMIN_ONLY_WRITE   public pages may READ; only an active admin writes (about_page, about_stats, about_values, blog_categories,
--                      pricing_packages, trust_section, video_testimonials)
--   ADMIN_ONLY_ALL     no non-admin read or write at all (email_settings holds smtp_password; email_templates)
--   PUBLIC_INSERT_ADMIN_MODERATE   anyone may INSERT (and read approved rows); only an admin updates/deletes (blog_comments)
--   PUBLIC_INSERT_ADMIN_REST       anon INSERT; admin does the rest (subscribers)
--   SERVICE_INSERT_ADMIN_REST      rows are inserted by a server route with the service role, so NO public insert policy is needed
--                                  by the code; admin read/update/delete (contact_submissions, client_onboarding_submissions)
--   CLIENT_OWN         a signed-in client may touch only their own rows; admin through server routes (clients, notifications,
--                      project_requests)
--
-- HOW TO READ THE VERDICT ("class" then "vs intent"):
--   ADMIN-CHECKED          USING and WITH CHECK both test an active admin_users row for auth.uid()
--   OPEN INSERT            INSERT whose WITH CHECK is absent or true: anyone in the policy's roles can insert
--   OWN-ROW (auth.uid)     mentions auth.uid() but not admin_users: a client-own style policy (read the text to confirm the column)
--   UNRESTRICTED WRITE     UPDATE / DELETE / ALL that anyone in its roles can use (no admin or own-row test)
--   REVIEW                 anything else: read the expression
--   vs intent: OK / INTENDED / UNSAFE (write allowed that the intent forbids) / REVIEW
--
-- One statement, one result set (section | object | finding). Catalog reads only; no table data is selected.
-- LIMIT: ADMIN-CHECKED proves "an active admin", not "an admin who completed 2FA" (RLS cannot see the 2FA cookie). That
-- architecture question is documented and deferred (docs/admin-production-release-a4.md section 7).
-- Run as the table owner (postgres role) so information_schema grant rows are visible.
-- =====================================================================================================================

WITH intent(tablename, model) AS (
  VALUES
    ('about_page', 'ADMIN_ONLY_WRITE'),
    ('about_stats', 'ADMIN_ONLY_WRITE'),
    ('about_values', 'ADMIN_ONLY_WRITE'),
    ('blog_categories', 'ADMIN_ONLY_WRITE'),
    ('pricing_packages', 'ADMIN_ONLY_WRITE'),
    ('trust_section', 'ADMIN_ONLY_WRITE'),
    ('video_testimonials', 'ADMIN_ONLY_WRITE'),
    ('email_settings', 'ADMIN_ONLY_ALL'),
    ('email_templates', 'ADMIN_ONLY_ALL'),
    ('blog_comments', 'PUBLIC_INSERT_ADMIN_MODERATE'),
    ('subscribers', 'PUBLIC_INSERT_ADMIN_REST'),
    ('contact_submissions', 'SERVICE_INSERT_ADMIN_REST'),
    ('client_onboarding_submissions', 'SERVICE_INSERT_ADMIN_REST'),
    ('clients', 'CLIENT_OWN'),
    ('notifications', 'CLIENT_OWN'),
    ('project_requests', 'CLIENT_OWN')
),
pol AS (
  SELECT p.tablename, p.policyname, p.permissive, p.cmd, array_to_string(p.roles, ',') AS roles_text, p.qual, p.with_check, i.model
  FROM pg_policies p
  JOIN intent i ON i.tablename = p.tablename
  WHERE p.schemaname = 'public'
),
cls AS (
  SELECT p.*,
         (p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) AS is_write,
         (p.qual IS NOT NULL AND p.qual ~* 'admin_users' AND p.qual ~* 'is_active' AND p.qual ~* 'auth\.uid') AS using_admin,
         (p.with_check IS NOT NULL AND p.with_check ~* 'admin_users' AND p.with_check ~* 'is_active' AND p.with_check ~* 'auth\.uid') AS check_admin,
         (p.qual IS NULL OR lower(btrim(p.qual)) IN ('true', '(true)')) AS using_open,
         (p.with_check IS NULL OR lower(btrim(p.with_check)) IN ('true', '(true)')) AS check_open,
         ((coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'auth\.uid') AS mentions_uid,
         ((coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'admin_users') AS mentions_admin
  FROM pol p
),
cls2 AS (
  SELECT c.*,
         CASE
           WHEN NOT c.is_write THEN
             CASE
               WHEN c.using_admin THEN 'read: ADMIN-CHECKED'
               WHEN c.using_open THEN 'read: OPEN (everyone in the role list)'
               WHEN c.mentions_uid THEN 'read: OWN-ROW (auth.uid)'
               ELSE 'read: filtered (see USING)'
             END
           WHEN c.cmd = 'INSERT' AND (c.check_admin OR (c.with_check IS NOT NULL AND c.with_check ~* 'admin_users')) THEN 'ADMIN-CHECKED'
           WHEN c.cmd <> 'INSERT' AND c.using_admin AND (c.with_check IS NULL OR c.check_admin) THEN 'ADMIN-CHECKED'
           WHEN c.cmd = 'INSERT' AND c.check_open THEN 'OPEN INSERT'
           WHEN c.mentions_uid AND NOT c.mentions_admin THEN 'OWN-ROW (auth.uid)'
           WHEN c.cmd IN ('UPDATE', 'DELETE', 'ALL') AND c.using_open THEN 'UNRESTRICTED WRITE'
           ELSE 'REVIEW'
         END AS klass
  FROM cls c
),
cls3 AS (
  SELECT c.*,
         CASE
           WHEN NOT c.is_write THEN
             CASE
               WHEN c.model = 'ADMIN_ONLY_ALL' AND c.klass <> 'read: ADMIN-CHECKED' THEN 'UNSAFE: this table must not be readable by non-admins'
               WHEN c.model IN ('SERVICE_INSERT_ADMIN_REST', 'PUBLIC_INSERT_ADMIN_REST') AND c.klass = 'read: OPEN (everyone in the role list)' THEN 'REVIEW: submissions are readable by everyone in the role list'
               ELSE 'OK'
             END
           WHEN c.klass = 'REVIEW' THEN 'REVIEW'
           WHEN c.model IN ('ADMIN_ONLY_WRITE', 'ADMIN_ONLY_ALL') THEN
             CASE WHEN c.klass = 'ADMIN-CHECKED' THEN 'OK' ELSE 'UNSAFE: the code only needs an admin to write here' END
           WHEN c.model IN ('PUBLIC_INSERT_ADMIN_MODERATE', 'PUBLIC_INSERT_ADMIN_REST') THEN
             CASE
               WHEN c.klass = 'ADMIN-CHECKED' THEN 'OK'
               WHEN c.klass = 'OPEN INSERT' AND c.cmd = 'INSERT' THEN 'INTENDED (public insert)'
               ELSE 'UNSAFE: only INSERT may be open; update / delete belong to admins'
             END
           WHEN c.model = 'SERVICE_INSERT_ADMIN_REST' THEN
             CASE
               WHEN c.klass = 'ADMIN-CHECKED' THEN 'OK'
               WHEN c.klass = 'OPEN INSERT' AND c.cmd = 'INSERT' THEN 'REVIEW: a public insert policy is not needed by the code (the route uses the service role); keep only if a form posts to the database directly'
               ELSE 'UNSAFE: update / delete belong to admins'
             END
           WHEN c.model = 'CLIENT_OWN' THEN
             CASE
               WHEN c.klass IN ('ADMIN-CHECKED', 'OWN-ROW (auth.uid)') THEN 'OK'
               ELSE 'UNSAFE: a client may only write their own rows'
             END
           ELSE 'REVIEW'
         END AS verdict
  FROM cls2 c
),
section1 AS (
  SELECT '1 policy'::text AS section,
         c.tablename || '.' || c.policyname AS object,
         c.verdict || ' | class: ' || c.klass || ' | ' || c.cmd || ' to ' || c.roles_text || ' [' || c.permissive || '] | intent: ' || c.model
         || ' | USING: ' || coalesce(c.qual, '(none)')
         || ' | WITH CHECK: ' || coalesce(c.with_check, '(none)') AS finding
  FROM cls3 c
),
section2 AS (
  SELECT '2 table state'::text,
         i.tablename,
         CASE WHEN r.relname IS NULL THEN 'TABLE NOT FOUND'
              ELSE 'rls=' || CASE WHEN r.relrowsecurity THEN 'ON' ELSE 'OFF (every grant below is directly usable)' END
                   || ' | policies=' || (SELECT count(*) FROM pol WHERE pol.tablename = i.tablename)::text
                   || ' | unsafe=' || (SELECT count(*) FROM cls3 WHERE cls3.tablename = i.tablename AND cls3.verdict LIKE 'UNSAFE%')::text
                   || ' | intent: ' || i.model END
  FROM intent i
  LEFT JOIN (
    SELECT c.relname, c.relrowsecurity
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'
  ) r ON r.relname = i.tablename
),
section3 AS (
  SELECT '3 browser-role grants'::text,
         g.table_name || ' -> ' || g.grantee,
         string_agg(DISTINCT g.privilege_type, ',')
  FROM information_schema.role_table_grants g
  WHERE g.table_schema = 'public'
    AND g.table_name IN (SELECT tablename FROM intent)
    AND g.grantee IN ('anon', 'authenticated', 'PUBLIC')
  GROUP BY g.table_name, g.grantee
),
section4 AS (
  SELECT '4 summary'::text,
         'UNSAFE policies'::text,
         count(*)::text || ' of ' || (SELECT count(*) FROM cls3)::text || ' policies on the 16 tables'
  FROM cls3
  WHERE verdict LIKE 'UNSAFE%'
)
SELECT section, object, finding
FROM (
  SELECT * FROM section1
  UNION ALL SELECT * FROM section2
  UNION ALL SELECT * FROM section3
  UNION ALL SELECT * FROM section4
) u
ORDER BY section, object;
