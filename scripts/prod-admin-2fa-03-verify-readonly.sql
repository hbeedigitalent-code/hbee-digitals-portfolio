-- =====================================================================================================================
-- admin_2fa uniqueness — VERIFY (PRODUCTION). READ-ONLY. DRAFT — NOT EXECUTED, NOT PARSED. Safe before AND after the forward script.
--
-- One statement, one result set (check | result | meaning). Catalog reads plus COUNTS and ids only. It never selects
-- `secret` or `backup_codes` values. No table data other than counts of admin_2fa / admin_users rows is returned.
--
-- EXPECTED on PRODUCTION (owner-reported before the change: 1 active admin, admin_2fa 1 row / 1 enabled). AFTER the forward script:
--   unique constraint on (user_id)            -> yes: admin_2fa_user_id_key
--   duplicate user_id groups                  -> 0
--   admin_2fa.secret nullable?                -> NOT NULL
--   admin_2fa rows / enabled rows             -> unchanged from before (1 / 1 on production)
--   RLS / browser grants                      -> RLS ON, anon = -, authenticated = -
-- =====================================================================================================================

WITH uniq AS (
  SELECT c.conname,
         (SELECT string_agg(a.attname, ',' ORDER BY k.ord)
            FROM unnest(c.conkey) WITH ORDINALITY AS k(attnum, ord)
            JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = k.attnum) AS cols,
         c.convalidated AS validated
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  WHERE n.nspname = 'public' AND t.relname = 'admin_2fa' AND c.contype = 'u'
),
rows_ AS (
  SELECT
    '1 unique constraint on admin_2fa(user_id)'::text AS check_name,
    coalesce((SELECT 'yes: ' || conname || ' (validated=' || validated::text || ')' FROM uniq WHERE cols = 'user_id' LIMIT 1), 'NO - duplicates are possible') AS result,
    'Target state: yes' AS meaning
  UNION ALL
  SELECT '2 duplicate user_id groups',
         (SELECT count(*) FROM (SELECT user_id FROM public.admin_2fa GROUP BY user_id HAVING count(*) > 1) d)::text,
         'Must be 0. Any other number blocks the forward script'
  UNION ALL
  SELECT '3 rows with NULL user_id',
         (SELECT count(*) FROM public.admin_2fa WHERE user_id IS NULL)::text,
         'Must be 0'
  UNION ALL
  SELECT '4 admin_2fa.secret',
         coalesce((SELECT CASE WHEN is_nullable = 'NO' THEN 'NOT NULL' ELSE 'NULLABLE' END FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND column_name = 'secret'), 'column not found'),
         'Must stay NOT NULL. Owner recovery deletes the row; it never sets secret to NULL'
  UNION ALL
  SELECT '5 admin_2fa.backup_codes column',
         coalesce((SELECT 'present, ' || CASE WHEN is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND column_name = 'backup_codes'), 'absent'),
         'Unused by the application. Removing stored values is a separate, approved change'
  UNION ALL
  SELECT '6 admin_2fa rows / enabled rows',
         (SELECT count(*) FROM public.admin_2fa)::text || ' / ' || (SELECT count(*) FROM public.admin_2fa WHERE is_enabled IS TRUE)::text,
         'Compare with the figures from before the forward script: they must be identical'
  UNION ALL
  SELECT '7 active admins / active admins without enabled 2FA',
         (SELECT count(*) FROM public.admin_users WHERE is_active)::text || ' / ' ||
         (SELECT count(*) FROM public.admin_users a WHERE a.is_active AND NOT EXISTS (SELECT 1 FROM public.admin_2fa t WHERE t.user_id = a.user_id AND t.is_enabled IS TRUE))::text,
         'Un-enrolled admins are forced to enroll at next sign-in (expected on production: 1 / 0: the one admin is enrolled)'
  UNION ALL
  SELECT '8 RLS on admin_2fa',
         coalesce((SELECT CASE WHEN c.relrowsecurity THEN 'ON' ELSE 'OFF' END FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'public' AND c.relname = 'admin_2fa' AND c.relkind = 'r'), 'TABLE NOT FOUND'),
         'Must be ON'
  UNION ALL
  SELECT '9 browser-role grants on admin_2fa',
         'anon=' || coalesce((SELECT string_agg(DISTINCT privilege_type, ',') FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND grantee = 'anon'), '-')
         || ' authenticated=' || coalesce((SELECT string_agg(DISTINCT privilege_type, ',') FROM information_schema.role_table_grants WHERE table_schema = 'public' AND table_name = 'admin_2fa' AND grantee = 'authenticated'), '-'),
         'Both must be "-": the table is service-role only'
)
SELECT check_name, result, meaning
FROM rows_
ORDER BY check_name;
