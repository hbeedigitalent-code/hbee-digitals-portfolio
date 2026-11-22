-- =============================================================================
-- public.clients — BROWSER-WRITE HARDENING VERIFIER (READ-ONLY). Project: hbee-digitals-cms. Run AFTER
-- clients-rls-02-revoke-browser-writes-PRODUCTION.sql. NOT YET RUN.
--
-- ONE statement, ONE grid: (check_name, verdict, detail). It reads only pg_catalog and the privilege functions; it never reads a
-- row of public.clients (no name, email or id is returned), and it changes nothing. The LAST row is the overall result:
-- "OVERALL = PASS" only when every check above it is PASS. A table that does not exist makes every check FAIL.
--
-- EXPECTED FINAL STATE: anon has nothing; authenticated can only SELECT (policy clients_select_own, own row); no browser role
-- can INSERT, UPDATE or DELETE; service_role keeps SELECT, INSERT and UPDATE for the server routes.
-- =============================================================================
WITH
t AS (
  SELECT c.oid, c.relrowsecurity AS rls
  FROM pg_class c
  WHERE c.oid = to_regclass('public.clients')
),
pol AS (
  SELECT policyname::text AS name, cmd::text AS cmd, roles::text AS roles_txt,
         regexp_replace(COALESCE(qual, ''), '\s+', '', 'g') AS qual_n,
         (roles && ARRAY['public', 'anon', 'authenticated']::name[]) AS browser
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients'
),
res(ord, check_name, ok, detail) AS (
  SELECT 10, 'public.clients exists', EXISTS (SELECT 1 FROM t), 'to_regclass(''public.clients'')'

  UNION ALL
  SELECT 20, 'RLS is enabled on public.clients', COALESCE((SELECT rls FROM t), false), 'relrowsecurity'

  UNION ALL
  SELECT 30, 'anon has no privilege on public.clients (table or column level)',
         EXISTS (SELECT 1 FROM t)
         AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
                          WHERE has_table_privilege('anon', (SELECT oid FROM t), p))
         AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'REFERENCES']) p
                          WHERE has_any_column_privilege('anon', (SELECT oid FROM t), p)),
         COALESCE((SELECT string_agg(p, ', ') FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
                    WHERE has_table_privilege('anon', (SELECT oid FROM t), p)), 'none')

  UNION ALL
  SELECT 40, 'authenticated has SELECT',
         COALESCE(has_table_privilege('authenticated', (SELECT oid FROM t), 'SELECT'), false), 'needed for the own-row reads (middleware, portal)'

  UNION ALL
  SELECT 50, 'authenticated has no INSERT (table or column level)',
         EXISTS (SELECT 1 FROM t) AND NOT COALESCE(has_any_column_privilege('authenticated', (SELECT oid FROM t), 'INSERT'), true), 'has_any_column_privilege covers both levels'

  UNION ALL
  SELECT 60, 'authenticated has no table-level UPDATE',
         EXISTS (SELECT 1 FROM t) AND NOT COALESCE(has_table_privilege('authenticated', (SELECT oid FROM t), 'UPDATE'), true), 'has_table_privilege'

  UNION ALL
  SELECT 70, 'authenticated has no column-level UPDATE',
         EXISTS (SELECT 1 FROM t) AND NOT COALESCE(has_any_column_privilege('authenticated', (SELECT oid FROM t), 'UPDATE'), true),
         COALESCE((SELECT string_agg(a.attname::text, ', ' ORDER BY a.attname::text)
                     FROM pg_attribute a, t
                    WHERE a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped AND has_column_privilege('authenticated', t.oid, a.attnum, 'UPDATE')),
                  'no column')

  UNION ALL
  SELECT 80, 'authenticated has no DELETE',
         EXISTS (SELECT 1 FROM t) AND NOT COALESCE(has_table_privilege('authenticated', (SELECT oid FROM t), 'DELETE'), true), 'has_table_privilege'

  UNION ALL
  SELECT 85, 'authenticated holds no other table privilege (TRUNCATE / REFERENCES / TRIGGER)',
         EXISTS (SELECT 1 FROM t)
         AND NOT EXISTS (SELECT 1 FROM unnest(ARRAY['TRUNCATE', 'REFERENCES', 'TRIGGER']) p WHERE has_table_privilege('authenticated', (SELECT oid FROM t), p)),
         'SELECT only'

  UNION ALL
  SELECT 90, 'clients_select_own exists: SELECT, authenticated, own-row predicate',
         EXISTS (SELECT 1 FROM pol WHERE name = 'clients_select_own' AND cmd = 'SELECT' AND roles_txt = '{authenticated}'
                   AND qual_n IN ('(auth.uid()=user_id)', '(user_id=auth.uid())')),
         COALESCE((SELECT 'cmd = ' || cmd || '; roles = ' || roles_txt || '; USING = ' || qual_n FROM pol WHERE name = 'clients_select_own'), 'policy not found')

  UNION ALL
  SELECT 100, 'clients_update_own does not exist',
         NOT EXISTS (SELECT 1 FROM pol WHERE name = 'clients_update_own'), 'the own-row UPDATE policy must be gone'

  UNION ALL
  SELECT 110, 'no browser-role write policy exists on public.clients',
         EXISTS (SELECT 1 FROM t) AND NOT EXISTS (SELECT 1 FROM pol WHERE browser AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')),
         COALESCE((SELECT string_agg(name || ' [' || cmd || ']', '; ' ORDER BY name) FROM pol WHERE browser AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')), 'none')

  UNION ALL
  SELECT 120, 'service_role retains SELECT',
         COALESCE(has_table_privilege('service_role', (SELECT oid FROM t), 'SELECT'), false), 'server routes read clients'

  UNION ALL
  SELECT 130, 'service_role retains INSERT',
         COALESCE(has_table_privilege('service_role', (SELECT oid FROM t), 'INSERT'), false), 'account provisioning creates the row'

  UNION ALL
  SELECT 140, 'service_role retains UPDATE',
         COALESCE(has_table_privilege('service_role', (SELECT oid FROM t), 'UPDATE'), false), 'Settings, Admin status / disconnect / link, growth routes write the row'
)
SELECT check_name, verdict, detail
FROM (
  SELECT ord, check_name, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END AS verdict, detail
  FROM res
  UNION ALL
  SELECT 999, 'OVERALL',
         'OVERALL = ' || CASE WHEN bool_and(COALESCE(ok, false)) THEN 'PASS' ELSE 'FAIL' END,
         count(*) FILTER (WHERE NOT COALESCE(ok, false))::text || ' failing check(s) of ' || count(*)::text
  FROM res
) z
ORDER BY ord;
