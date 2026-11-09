-- =====================================================================================================================
-- Admin security preflight — READ-ONLY. Run in the Supabase SQL editor against STAGING FIRST, then production, by hand.
--
--   * One statement, one result set (section | object | finding). It changes nothing and takes only catalog /
--     AccessShareLock reads.
--   * It does NOT select any secret value: admin_2fa.secret / backup_codes and email_settings.smtp_password are never
--     read. Only counts, column names, grants, RLS flags and policy names are returned.
--   * RLS flags come from pg_class / pg_namespace (not pg_tables), grants from information_schema.role_table_grants,
--     policies from pg_policies — the known-good pattern in scripts/phase2-security-rls.sql STEP 0.
--   * Table existence is judged from pg_class: "TABLE NOT FOUND" means absent, not "RLS off".
--   * Grants are read from information_schema.role_table_grants (this project's standard). That view only lists grants the
--     CURRENT role granted or received, so run it as the table owner (the postgres role in the SQL editor). A table showing
--     "-" for every role may simply be invisible to you: confirm with an owner-level session before trusting an OK-ISH.
--   * The two structural checks in section 3 read admin_2fa / admin_users, which the application already depends on, so
--     they exist in any environment that can sign an admin in.
--
-- NOT EXECUTED and NOT PARSED by the assistant (no Postgres or SQL parser was available locally): check it for syntax
-- errors on staging before relying on it. Nothing here is a migration. Read the output, then decide.
--
-- HOW TO READ SECTION 1 (the verdict column):
--   BLOCKER  a table holding secrets / personal / commercial data where the browser roles (anon, authenticated, PUBLIC)
--            can write, or RLS is off while a browser role can read — the browser can do directly what the 2FA cookie
--            is supposed to gate. Must be fixed or proven safe before deploying the admin changes.
--   REVIEW   browser roles hold privileges and RLS is on: the policies decide. Read them.
--   OK-ISH   RLS on with no browser privileges at all (service-role only) — the target state for sensitive tables.
--   PUBLIC-CMS  content tables the public site reads: anon SELECT is expected - any browser-role WRITE is the question.
-- =====================================================================================================================

WITH wanted(tablename, class) AS (
  VALUES
    -- A. credentials
    ('email_settings', 'secret'), ('admin_2fa', 'secret'), ('admin_users', 'secret'),
    -- B. personal / commercial / operational data written or read from admin browser code
    ('contact_submissions', 'private'), ('leads', 'private'), ('client_onboarding_submissions', 'private'),
    ('proposals', 'private'), ('agreements', 'private'), ('projects', 'private'), ('tasks', 'private'),
    ('project_invoices', 'private'), ('project_requests', 'private'), ('messages', 'private'),
    ('newsletter_campaigns', 'private'), ('subscribers', 'private'), ('clients', 'private'),
    ('merchants', 'private'), ('merchant_accounts', 'private'), ('merchant_status', 'private'),
    ('growth_assessments', 'private'), ('growth_reviews', 'private'), ('growth_profiles', 'private'),
    ('growth_profile_pdfs', 'private'), ('growth_program_decisions', 'private'), ('growth_opportunities', 'private'),
    ('audit_reports', 'private'), ('notifications', 'private'), ('email_templates', 'private'),
    ('portal_invitations', 'secret'), ('email_events', 'private'), ('email_logs', 'private'),
    -- C. public CMS content the site renders (anon SELECT expected)
    ('about_page', 'cms'), ('about_stats', 'cms'), ('about_values', 'cms'), ('blog_categories', 'cms'),
    ('blog_comments', 'cms'), ('blog_posts', 'cms'), ('client_proofs', 'cms'), ('cta_section', 'cms'),
    ('faq_categories', 'cms'), ('faqs', 'cms'), ('featured_about_section', 'cms'), ('footer_settings', 'cms'),
    ('hero_section', 'cms'), ('menu_items', 'cms'), ('portfolio_items', 'cms'), ('portfolio_media', 'cms'),
    ('pricing_packages', 'cms'), ('seo_settings', 'cms'), ('services', 'cms'), ('site_settings', 'cms'),
    ('team_members', 'cms'), ('testimonials', 'cms'), ('trust_section', 'cms'), ('video_testimonials', 'cms')
),
rls AS (
  SELECT c.relname AS tablename, c.relrowsecurity AS rls_enabled, c.relforcerowsecurity AS rls_forced
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
),
grants AS (
  SELECT table_name AS tablename,
         string_agg(DISTINCT privilege_type, ',') FILTER (WHERE grantee = 'anon')                                                AS anon_privs,
         string_agg(DISTINCT privilege_type, ',') FILTER (WHERE grantee = 'authenticated')                                       AS authenticated_privs,
         string_agg(DISTINCT privilege_type, ',') FILTER (WHERE grantee = 'PUBLIC')                                              AS public_privs
  FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated', 'PUBLIC')
  GROUP BY table_name
),
pol AS (
  SELECT tablename,
         string_agg(policyname || ' [' || cmd || ' to ' || array_to_string(roles, ',') || ']', ' / ' ORDER BY policyname) AS policies,
         bool_or(cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL') AND (roles::text ~ 'anon|authenticated|public')) AS browser_write_policy
  FROM pg_policies WHERE schemaname = 'public' GROUP BY tablename
),
section1 AS (
  SELECT
    '1 table access'::text AS section,
    w.tablename || '  (' || w.class || ')' AS object,
    CASE
      WHEN r.tablename IS NULL THEN 'TABLE NOT FOUND'
      ELSE
        CASE
          WHEN w.class IN ('secret', 'private') AND (
                 coalesce(g.anon_privs, '') ~ 'INSERT|UPDATE|DELETE|SELECT'
              OR coalesce(g.public_privs, '') ~ 'INSERT|UPDATE|DELETE|SELECT'
              OR (NOT r.rls_enabled AND coalesce(g.authenticated_privs, '') <> '')
              OR coalesce(g.authenticated_privs, '') ~ 'INSERT|UPDATE|DELETE'
              OR coalesce(p.browser_write_policy, false)
          ) THEN 'BLOCKER'
          WHEN w.class IN ('secret', 'private') AND coalesce(g.authenticated_privs, '') <> '' THEN 'REVIEW'
          WHEN w.class IN ('secret', 'private') THEN 'OK-ISH'
          WHEN w.class = 'cms' AND (coalesce(g.anon_privs, '') ~ 'INSERT|UPDATE|DELETE' OR coalesce(g.public_privs, '') ~ 'INSERT|UPDATE|DELETE' OR coalesce(p.browser_write_policy, false)) THEN 'BLOCKER'
          WHEN w.class = 'cms' THEN 'PUBLIC-CMS'
        END
        || ' | rls=' || CASE WHEN r.rls_enabled THEN 'ON' ELSE 'OFF' END || CASE WHEN r.rls_forced THEN '+forced' ELSE '' END
        || ' | anon=' || coalesce(g.anon_privs, '-')
        || ' | authenticated=' || coalesce(g.authenticated_privs, '-')
        || ' | PUBLIC=' || coalesce(g.public_privs, '-')
        || ' | policies=' || coalesce(p.policies, 'none')
    END AS finding
  FROM wanted w
  LEFT JOIN rls r USING (tablename)
  LEFT JOIN grants g USING (tablename)
  LEFT JOIN pol p USING (tablename)
),
section2 AS (
  -- The credential-bearing column in email_settings: does it exist? (name and type only, the value is never read.)
  SELECT '2 credential columns'::text, 'email_settings.' || column_name, data_type || ' | nullable=' || is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'email_settings' AND column_name ~* 'password|secret|token|api_key'
  UNION ALL
  SELECT '2 credential columns', 'admin_2fa.' || column_name, data_type || ' | nullable=' || is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND column_name IN ('secret', 'backup_codes')
),
section3 AS (
  -- Structural facts the mandatory-2FA rollout depends on. Counts only.
  SELECT '3 2FA rollout'::text, 'admin_2fa rows with user_id duplicated (no unique constraint => status route fails CLOSED)',
         (SELECT count(*) FROM (SELECT user_id FROM public.admin_2fa GROUP BY user_id HAVING count(*) > 1) d)::text
  UNION ALL
  SELECT '3 2FA rollout', 'active admins in admin_users',
         (SELECT count(*) FROM public.admin_users WHERE is_active)::text
  UNION ALL
  SELECT '3 2FA rollout', 'active admins WITHOUT an enabled 2FA record (they will be forced to enroll at next sign-in)',
         (SELECT count(*) FROM public.admin_users a WHERE a.is_active AND NOT EXISTS (SELECT 1 FROM public.admin_2fa t WHERE t.user_id = a.user_id AND t.is_enabled IS TRUE))::text
  UNION ALL
  SELECT '3 2FA rollout', 'admin_2fa.secret is NOT NULL? (the old disable route writes NULL, NOT NULL makes that fail)',
         coalesce((SELECT CASE WHEN is_nullable = 'NO' THEN 'NOT NULL (disable route cannot succeed)' ELSE 'nullable' END FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND column_name = 'secret'), 'column not found')
  UNION ALL
  SELECT '3 2FA rollout', 'unique constraint or index on admin_2fa(user_id)?',
         CASE WHEN EXISTS (SELECT 1 FROM pg_index i JOIN pg_class c ON c.oid = i.indrelid JOIN pg_namespace n ON n.oid = c.relnamespace JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY (i.indkey) WHERE n.nspname = 'public' AND c.relname = 'admin_2fa' AND a.attname = 'user_id' AND i.indisunique) THEN 'yes' ELSE 'NO (duplicates are possible)' END
)
SELECT section, object, finding
FROM (
  SELECT * FROM section1
  UNION ALL SELECT * FROM section2
  UNION ALL SELECT * FROM section3
) u
ORDER BY section, CASE WHEN finding LIKE 'BLOCKER%' THEN 0 WHEN finding LIKE 'REVIEW%' THEN 1 ELSE 2 END, object;
