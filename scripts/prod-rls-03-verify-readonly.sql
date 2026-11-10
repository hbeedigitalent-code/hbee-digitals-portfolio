-- =====================================================================================================================
-- Verifier for the production RLS + grant hardening (prod-rls-01).  PRODUCTION.  READ-ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Run it BEFORE the forward (every section reads "before") and AFTER (every section reads "after"; the last section must say
-- 0 problems).  One statement, one result set (section | object | finding), catalog reads only: no application table is read and
-- no secret value exists to be shown.
--
--   1 targets      the 13 dropped policies: PRESENT before, GONE after
--   2 replacements the 7 admin-only policies: ABSENT before, OK after
--   3 policies     every policy now on the 16 tables, with its class and its USING / WITH CHECK text; ATTENTION marks a
--                  browser-reachable write policy that does not test an active admin on a modified table (only the subscribers
--                  anon INSERT is an accepted exception)
--   4 grants       anon / authenticated privileges per table against the matrix: OK, or EXCESS: <privileges to remove>
--   5 dangerous    TRUNCATE / TRIGGER / REFERENCES / MAINTAIN held by anon, authenticated or PUBLIC (expected: none after)
--   6 rls          row-level-security flags (all must be ON)
--   7 dependents   views that read these tables (they run with their owner's or the caller's rights: review if any)
--   8 backup       whether public._hbee_a4_rls_backup exists (expected after the forward, until you drop it)
--   9 summary      the number of problems (after the forward this must be 0)
--
-- Run as the table owner (postgres).
-- =====================================================================================================================

WITH
tbl(tablename, modified) AS (
  VALUES ('about_page', true), ('about_stats', false), ('about_values', false), ('blog_categories', true), ('blog_comments', false),
         ('client_onboarding_submissions', false), ('clients', false), ('contact_submissions', true), ('email_settings', false),
         ('email_templates', true), ('notifications', false), ('pricing_packages', true), ('project_requests', false),
         ('subscribers', true), ('trust_section', true), ('video_testimonials', true)
),
targets(tablename, policyname) AS (
  VALUES ('about_page', 'Allow all operations for authenticated users'),
         ('blog_categories', 'Allow authenticated users to insert categories'), ('blog_categories', 'Allow authenticated users to update categories'),
         ('blog_categories', 'Authenticated users can manage categories'),
         ('contact_submissions', 'Allow authenticated admins to manage inquiries'), ('contact_submissions', 'Allow public contact form inserts'),
         ('email_templates', 'Allow authenticated manage email templates'), ('pricing_packages', 'Allow authenticated manage pricing'),
         ('subscribers', 'Public can unsubscribe'), ('trust_section', 'Allow authenticated manage trust section'),
         ('video_testimonials', 'Auth users can delete proofs'), ('video_testimonials', 'Auth users can insert proofs'),
         ('video_testimonials', 'Auth users can update proofs')
),
new_pol(tablename, policyname) AS (
  VALUES ('about_page', 'about_page_admin_all'), ('blog_categories', 'blog_categories_admin_all'),
         ('contact_submissions', 'contact_submissions_admin_all'), ('email_templates', 'email_templates_admin_all'),
         ('pricing_packages', 'pricing_packages_admin_all'), ('trust_section', 'trust_section_admin_all'),
         ('video_testimonials', 'video_testimonials_admin_all')
),
matrix(tablename, role_name, allowed) AS (
  VALUES ('about_page', 'anon', ARRAY['SELECT']), ('about_page', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('about_stats', 'anon', ARRAY[]::text[]), ('about_stats', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('about_values', 'anon', ARRAY[]::text[]), ('about_values', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('blog_categories', 'anon', ARRAY['SELECT']), ('blog_categories', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('blog_comments', 'anon', ARRAY['SELECT', 'INSERT']), ('blog_comments', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('client_onboarding_submissions', 'anon', ARRAY[]::text[]), ('client_onboarding_submissions', 'authenticated', ARRAY['SELECT', 'UPDATE']),
         ('clients', 'anon', ARRAY[]::text[]), ('clients', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('contact_submissions', 'anon', ARRAY[]::text[]), ('contact_submissions', 'authenticated', ARRAY['SELECT', 'UPDATE', 'DELETE']),
         ('email_settings', 'anon', ARRAY[]::text[]), ('email_settings', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE']),
         ('email_templates', 'anon', ARRAY[]::text[]), ('email_templates', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('notifications', 'anon', ARRAY[]::text[]), ('notifications', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('pricing_packages', 'anon', ARRAY['SELECT']), ('pricing_packages', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('project_requests', 'anon', ARRAY[]::text[]), ('project_requests', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('subscribers', 'anon', ARRAY['INSERT']), ('subscribers', 'authenticated', ARRAY['SELECT', 'INSERT']),
         ('trust_section', 'anon', ARRAY['SELECT']), ('trust_section', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']),
         ('video_testimonials', 'anon', ARRAY['SELECT']), ('video_testimonials', 'authenticated', ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE'])
),
pol AS (
  SELECT p.tablename, p.policyname, p.permissive, p.cmd, p.roles, p.qual, p.with_check, t.modified,
         (p.cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')) AS is_write,
         (p.roles && ARRAY['public', 'anon', 'authenticated']::name[]) AS browser_reachable,
         (CASE WHEN p.cmd = 'INSERT'
               THEN coalesce(p.with_check, '') ~* 'admin_users' AND coalesce(p.with_check, '') ~* 'is_active' AND coalesce(p.with_check, '') ~* 'auth\.uid'
               ELSE coalesce(p.qual, '') ~* 'admin_users' AND coalesce(p.qual, '') ~* 'is_active' AND coalesce(p.qual, '') ~* 'auth\.uid'
                    AND (p.with_check IS NULL OR (p.with_check ~* 'admin_users' AND p.with_check ~* 'is_active' AND p.with_check ~* 'auth\.uid')) END) AS admin_checked,
         ((coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'auth\.uid') AS mentions_uid
  FROM pg_policies p JOIN tbl t ON t.tablename = p.tablename
  WHERE p.schemaname = 'public'
),
pol2 AS (
  SELECT q.*,
         CASE WHEN NOT q.is_write THEN 'read'
              WHEN q.admin_checked THEN 'ADMIN-CHECKED'
              WHEN q.cmd = 'INSERT' AND (q.with_check IS NULL OR lower(btrim(q.with_check)) IN ('true', '(true)')) THEN 'OPEN INSERT'
              WHEN q.mentions_uid THEN 'OWN-ROW (auth.uid)'
              ELSE 'UNRESTRICTED / REVIEW' END AS klass,
         (q.modified AND q.is_write AND q.browser_reachable AND NOT q.admin_checked AND NOT (q.tablename = 'subscribers' AND q.cmd = 'INSERT')) AS needs_attention
  FROM pol q
),
priv AS (
  SELECT c.relname AS tablename,
         CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee) END AS role_name,
         a.privilege_type::text AS privilege
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace, LATERAL aclexplode(c.relacl) a
  WHERE n.nspname = 'public' AND c.relname IN (SELECT tablename FROM tbl)
),
grants AS (
  SELECT m.tablename, m.role_name, m.allowed,
         ARRAY(SELECT x.privilege FROM priv x WHERE x.tablename = m.tablename AND x.role_name = m.role_name ORDER BY x.privilege) AS actual
  FROM matrix m
),
grants2 AS (
  SELECT g.*, ARRAY(SELECT y FROM unnest(g.actual) AS y WHERE y <> ALL (g.allowed) ORDER BY y) AS excess
  FROM grants g
),
dangerous AS (
  SELECT p.tablename, p.role_name, p.privilege FROM priv p
  WHERE p.role_name IN ('anon', 'authenticated', 'PUBLIC') AND p.privilege IN ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN')
),
rlsstate AS (
  SELECT c.relname AS tablename, c.relrowsecurity AS on_, c.relforcerowsecurity AS forced
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname IN (SELECT tablename FROM tbl)
),
s1 AS (
  SELECT '1 targets'::text AS section, t.tablename || '."' || t.policyname || '"' AS object,
         CASE WHEN p.policyname IS NULL THEN 'GONE (expected after the forward)'
              ELSE 'PRESENT (expected before the forward): ' || p.cmd || ' to ' || array_to_string(p.roles, ',') END AS finding
  FROM targets t LEFT JOIN pg_policies p ON p.schemaname = 'public' AND p.tablename = t.tablename AND p.policyname = t.policyname
),
s2 AS (
  SELECT '2 replacements'::text AS section, n.tablename || '.' || n.policyname AS object,
         CASE WHEN p.policyname IS NULL THEN 'ABSENT (expected before the forward)'
              WHEN p.cmd = 'ALL' AND p.roles = ARRAY['authenticated']::name[] AND p.admin_checked THEN 'OK: ALL to authenticated, tests an active admin'
              ELSE 'PROBLEM: present but not the expected admin-only policy' END AS finding
  FROM new_pol n LEFT JOIN pol2 p ON p.tablename = n.tablename AND p.policyname = n.policyname
),
s3 AS (
  SELECT '3 policies', p.tablename || '."' || p.policyname || '"',
         CASE WHEN p.needs_attention THEN 'ATTENTION (problem): browser-reachable write without an active-admin test | ' ELSE '' END
         || p.klass || ' | ' || p.cmd || ' to ' || array_to_string(p.roles, ',') || ' [' || p.permissive || ']'
         || ' | USING: ' || coalesce(p.qual, '(none)') || ' | WITH CHECK: ' || coalesce(p.with_check, '(none)')
  FROM pol2 p
),
s4 AS (
  SELECT '4 grants', g.tablename || ' -> ' || g.role_name,
         CASE WHEN cardinality(g.excess) = 0 THEN 'OK' ELSE 'EXCESS (problem): remove ' || array_to_string(g.excess, ',') END
         || ' | holds {' || array_to_string(g.actual, ',') || '} | allowed at most {' || array_to_string(g.allowed, ',') || '}'
  FROM grants2 g
),
s5 AS (
  SELECT '5 dangerous', d.tablename || ' -> ' || d.role_name, 'PROBLEM: holds ' || d.privilege FROM dangerous d
  UNION ALL
  SELECT '5 dangerous', 'all 16 tables', 'none held by anon, authenticated or PUBLIC' WHERE NOT EXISTS (SELECT 1 FROM dangerous)
),
s6 AS (
  SELECT '6 rls', r.tablename, CASE WHEN r.on_ THEN 'ON' ELSE 'PROBLEM: OFF' END || CASE WHEN r.forced THEN ' (forced)' ELSE '' END FROM rlsstate r
),
s7 AS (
  SELECT '7 dependents', v.relname::text || ' reads ' || t.relname::text, 'view or materialized view: review its owner and whether it is granted to a browser role'
  FROM pg_depend d
  JOIN pg_rewrite rw ON rw.oid = d.objid
  JOIN pg_class v ON v.oid = rw.ev_class AND v.relkind IN ('v', 'm')
  JOIN pg_class t ON t.oid = d.refobjid
  JOIN pg_namespace tn ON tn.oid = t.relnamespace AND tn.nspname = 'public'
  WHERE d.classid = 'pg_rewrite'::regclass AND d.refclassid = 'pg_class'::regclass AND t.relname IN (SELECT tablename FROM tbl) AND v.oid <> t.oid
),
s8 AS (
  SELECT '8 backup', 'public._hbee_a4_rls_backup',
         CASE WHEN to_regclass('public._hbee_a4_rls_backup') IS NULL THEN 'absent (expected before the forward)' ELSE 'present (expected after the forward; the rollback source)' END
),
s9 AS (
  SELECT '9 summary', 'problems',
         ((SELECT count(*) FROM grants2 WHERE cardinality(excess) > 0) + (SELECT count(*) FROM dangerous) + (SELECT count(*) FROM pol2 WHERE needs_attention)
          + (SELECT count(*) FROM rlsstate WHERE NOT on_) + (SELECT count(*) FROM s2 WHERE finding LIKE 'PROBLEM%'))::text
         || ' (after the forward this must be 0; before it, the excess grants and attention policies ARE the problems being fixed)'
)
SELECT section, object, finding
FROM (
  SELECT * FROM s1 UNION ALL SELECT * FROM s2 UNION ALL SELECT * FROM s3 UNION ALL SELECT * FROM s4
  UNION ALL SELECT * FROM s5 UNION ALL SELECT * FROM s6 UNION ALL SELECT * FROM s7 UNION ALL SELECT * FROM s8 UNION ALL SELECT * FROM s9
) u
ORDER BY section, object;
