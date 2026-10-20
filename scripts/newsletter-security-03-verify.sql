-- OWNER REVIEW ONLY. PREPARED, NOT EXECUTED. READ ONLY.
-- Run after each reviewed stage; before B, access checks intentionally FAIL.
-- Use an inspection role with BYPASSRLS/superuser. Do not test by inserting data.
-- PASS is structural/catalog evidence, not proof of deployed app behavior.
-- Runtime owner checks still required: ordinary-user denial; active-admin API
-- session/2FA checks; server subscribe/unsubscribe and campaign compatibility.
BEGIN READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = pg_catalog, public;

SELECT 'authoritative inspection role' AS check_name,
       CASE WHEN rolsuper OR rolbypassrls THEN 'PASS' ELSE 'FAIL: fingerprints may be RLS-filtered' END AS result,
       current_user AS inspection_role
FROM pg_roles WHERE rolname = current_user;
SELECT 'ENABLE + FORCE RLS; ordinary heap' AS check_name,
       CASE WHEN relrowsecurity AND relforcerowsecurity AND relkind = 'r' AND NOT relispartition THEN 'PASS' ELSE 'FAIL' END AS result,
       pg_get_userbyid(relowner) AS owner, relrowsecurity,relforcerowsecurity
FROM pg_class WHERE oid = 'public.newsletter_subscribers'::regclass;
SELECT 'zero subscriber policies' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,count(*) AS policy_count
FROM pg_policy WHERE polrelid = 'public.newsletter_subscribers'::regclass;
SELECT policyname,roles,cmd,qual,with_check FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers';

SELECT expected.rolname,'browser role attributes and no direct table/column privileges' AS check_name,
       CASE WHEN r.oid IS NOT NULL AND NOT r.rolsuper AND NOT r.rolbypassrls
         AND NOT has_table_privilege(r.oid,'public.newsletter_subscribers','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
         AND NOT has_any_column_privilege(r.oid,'public.newsletter_subscribers','SELECT,INSERT,UPDATE,REFERENCES')
         THEN 'PASS' ELSE 'FAIL' END AS result,
       r.rolsuper,r.rolbypassrls,
       has_table_privilege(r.oid,'public.newsletter_subscribers','SELECT') AS can_select,
       has_table_privilege(r.oid,'public.newsletter_subscribers','INSERT') AS can_insert,
       has_table_privilege(r.oid,'public.newsletter_subscribers','UPDATE') AS can_update,
       has_table_privilege(r.oid,'public.newsletter_subscribers','DELETE') AS can_delete,
       has_table_privilege(r.oid,'public.newsletter_subscribers','TRUNCATE') AS can_truncate,
       has_table_privilege(r.oid,'public.newsletter_subscribers','TRIGGER') AS can_trigger,
       has_table_privilege(r.oid,'public.newsletter_subscribers','REFERENCES') AS can_reference
FROM (VALUES ('anon'),('authenticated')) expected(rolname)
LEFT JOIN pg_roles r ON r.rolname = expected.rolname;
SELECT 'no PUBLIC table/column ACL' AS check_name,
       CASE WHEN NOT EXISTS (SELECT 1 FROM pg_class c
         CROSS JOIN LATERAL aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
         WHERE c.oid = 'public.newsletter_subscribers'::regclass AND x.grantee = 0)
         AND NOT EXISTS (SELECT 1 FROM pg_attribute a
           CROSS JOIN LATERAL aclexplode(a.attacl) x
           WHERE a.attrelid = 'public.newsletter_subscribers'::regclass AND a.attnum > 0 AND NOT a.attisdropped AND x.grantee = 0)
         THEN 'PASS' ELSE 'FAIL' END AS result;
SELECT 'no inherited ownership/RLS bypass' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,
       count(*) AS dangerous_memberships
FROM pg_roles browser CROSS JOIN pg_roles elevated
WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,elevated.oid,'MEMBER')
  AND (elevated.rolsuper OR elevated.rolbypassrls OR elevated.rolname = 'service_role'
    OR elevated.oid = (SELECT relowner FROM pg_class WHERE oid = 'public.newsletter_subscribers'::regclass));
SELECT 'service_role required server privileges and BYPASSRLS' AS check_name,
       CASE WHEN r.oid IS NOT NULL AND NOT r.rolsuper AND r.rolbypassrls
         AND has_schema_privilege(r.oid,'public','USAGE')
         AND has_table_privilege(r.oid,'public.newsletter_subscribers','SELECT')
         AND has_table_privilege(r.oid,'public.newsletter_subscribers','INSERT')
         AND has_table_privilege(r.oid,'public.newsletter_subscribers','UPDATE')
         AND has_table_privilege(r.oid,'public.newsletter_subscribers','DELETE')
         AND has_function_privilege(r.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE')
         THEN 'PASS' ELSE 'FAIL' END AS result,
       r.rolsuper,r.rolbypassrls
FROM (VALUES ('service_role')) expected(rolname)
LEFT JOIN pg_roles r ON r.rolname = expected.rolname;
SELECT 'no browser SET ROLE/membership privilege path' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,count(*) AS reachable_privilege_paths
FROM pg_roles browser CROSS JOIN pg_roles reachable
WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
  AND (has_table_privilege(reachable.oid,'public.newsletter_subscribers','SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
    OR has_any_column_privilege(reachable.oid,'public.newsletter_subscribers','SELECT,INSERT,UPDATE,REFERENCES')
    OR has_function_privilege(reachable.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE'));

SELECT 'nullable consent metadata; no defaults' AS check_name,
       CASE WHEN count(*) = 3 AND bool_and(NOT a.attnotnull AND d.oid IS NULL AND a.attgenerated = '' AND a.attidentity = '')
         THEN 'PASS' ELSE 'FAIL' END AS result
FROM (VALUES ('consent_given_at','timestamp with time zone'),('consent_source','text'),('consent_version','text')) wanted(name,type)
JOIN pg_attribute a ON a.attrelid = 'public.newsletter_subscribers'::regclass AND a.attname = wanted.name
  AND NOT a.attisdropped AND format_type(a.atttypid,a.atttypmod) = wanted.type
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum;
SELECT 'newsletter-only nullable JSONB settings; no default/activation' AS check_name,
       CASE WHEN count(*) = 1 AND bool_and(a.atttypid = 'jsonb'::regtype AND NOT a.attnotnull AND d.oid IS NULL)
         THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = 'public.site_settings'::regclass AND a.attname = 'newsletter_settings' AND NOT a.attisdropped;
SELECT 'capture remains disabled during security rollout' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL: activation is separately authorized' END AS result
FROM public.site_settings
WHERE newsletter_settings->>'footer_enabled' = 'true'
   OR newsletter_settings->>'popup_enabled' = 'true'
   OR newsletter_settings->>'enabled' = 'true';
SELECT 'retain exact UNIQUE(email)' AS check_name,
       CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL' END AS result,
       array_agg(i.indexrelid::regclass ORDER BY i.indexrelid::regclass::text) AS matching_indexes
FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid JOIN pg_am am ON am.oid = idx.relam
WHERE i.indrelid = 'public.newsletter_subscribers'::regclass
  AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
  AND i.indnkeyatts = 1 AND i.indnatts = 1
  AND i.indkey[0] = (SELECT attnum FROM pg_attribute
    WHERE attrelid = i.indrelid AND attname = 'email' AND NOT attisdropped)
  AND i.indexprs IS NULL AND i.indpred IS NULL AND am.amname = 'btree';
SELECT 'non-null UUID identity backed by PRIMARY KEY(id) or exact UNIQUE(id)' AS check_name,
       CASE WHEN count(*) >= 1 THEN 'PASS' ELSE 'FAIL: require authoritative unique-id schema evidence' END AS result
FROM pg_constraint con JOIN pg_index i ON i.indexrelid = con.conindid
JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attname = 'id' AND NOT a.attisdropped
WHERE con.conrelid = 'public.newsletter_subscribers'::regclass AND con.contype IN ('p','u') AND con.convalidated
  AND con.conkey = ARRAY[a.attnum]::smallint[] AND a.atttypid = 'uuid'::regtype AND a.attnotnull
  AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts = 1 AND i.indpred IS NULL;
SELECT 'normalized unique index exact structural invariant' AS check_name,
       CASE WHEN count(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS result
FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid JOIN pg_am am ON am.oid = idx.relam
WHERE i.indrelid = 'public.newsletter_subscribers'::regclass
  AND i.indexrelid = to_regclass('public.newsletter_subscribers_email_normalized_key')
  AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
  AND i.indnkeyatts = 1 AND i.indnatts = 1 AND i.indkey[0] = 0
  AND i.indpred IS NULL AND am.amname = 'btree'
  AND replace(pg_get_expr(i.indexprs,i.indrelid),' ','') = 'lower(btrim(email))';
SELECT 'no normalized duplicates' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result
FROM (SELECT lower(btrim(email)) FROM public.newsletter_subscribers GROUP BY lower(btrim(email)) HAVING count(*) > 1) d;

SELECT 'identity RPC server-only SECURITY INVOKER' AS check_name,
       CASE WHEN NOT p.prosecdef AND p.provolatile = 's' AND p.pronargs = 1
         AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp']
         AND pg_get_function_result(p.oid) = 'TABLE(id uuid, status text)'
         AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
         AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
         AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
           WHERE x.grantee NOT IN (p.proowner,(SELECT oid FROM pg_roles WHERE rolname = 'service_role')))
         AND md5(pg_get_functiondef(p.oid)) = (obj_description('public.newsletter_subscribers_email_normalized_key'::regclass,'pg_class')::jsonb)->>'identity_rpc_hash'
         THEN 'PASS' ELSE 'FAIL' END AS result,
       p.oid::regprocedure AS signature,pg_get_userbyid(p.proowner) AS owner,p.proconfig,p.proacl
FROM pg_proc p WHERE p.oid = 'public.newsletter_subscriber_identity(text)'::regprocedure;
SELECT 'no inheritance or rewrite rules on base table' AS check_name,
       CASE WHEN NOT EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = 'public.newsletter_subscribers'::regclass
           OR inhparent = 'public.newsletter_subscribers'::regclass)
         AND NOT EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = 'public.newsletter_subscribers'::regclass)
         THEN 'PASS' ELSE 'FAIL' END AS result;
WITH RECURSIVE surface(oid) AS (
  SELECT 'public.newsletter_subscribers'::regclass::oid UNION
  SELECT rw.ev_class FROM surface s JOIN pg_depend d
    ON d.refclassid = 'pg_class'::regclass AND d.refobjid = s.oid
  JOIN pg_rewrite rw ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid WHERE rw.ev_class <> s.oid
)
SELECT 'no browser-accessible dependent views' AS check_name,
       CASE WHEN count(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS result,count(*) AS leaking_view_count
FROM surface s JOIN pg_class c ON c.oid = s.oid WHERE c.relkind IN ('v','m')
  AND EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles reachable
    WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
      AND (has_table_privilege(reachable.oid,c.oid,'SELECT') OR has_any_column_privilege(reachable.oid,c.oid,'SELECT')));

-- Saved aggregate evidence contains NO subscriber values. A different current
-- fingerprint after legitimate application writes is REVIEW, not proof of DML
-- by this migration. For an immediate comparison, keep capture/admin writes idle.
WITH evidence AS (
  SELECT obj_description('public.newsletter_subscribers_email_normalized_key'::regclass,'pg_class')::jsonb AS value
), current_snapshot AS (
  SELECT count(*) AS row_count,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),'')) AS fingerprint
  FROM public.newsletter_subscribers t
)
SELECT 'subscriber-row preservation evidence' AS check_name,
       CASE WHEN e.value->>'artifact' IS DISTINCT FROM 'Hbee newsletter security v1'
           OR e.value->'stage_a'->>'unchanged_with_null_metadata' IS DISTINCT FROM 'true'
           OR e.value->'stage_b'->>'unchanged_during_cutover' IS DISTINCT FROM 'true'
           OR e.value->'stage_a'->>'before_count' IS DISTINCT FROM e.value->'stage_a'->>'row_count'
           OR e.value->'stage_a'->>'before_fingerprint' IS DISTINCT FROM e.value->'stage_a'->>'row_fingerprint'
           OR e.value->'stage_b'->>'before_count' IS DISTINCT FROM e.value->'stage_b'->>'row_count'
           OR e.value->'stage_b'->>'before_fingerprint' IS DISTINCT FROM e.value->'stage_b'->>'row_fingerprint'
           THEN 'FAIL: missing/inconsistent stage evidence'
         WHEN (e.value->'stage_b'->>'row_count')::bigint = s.row_count
           AND e.value->'stage_b'->>'row_fingerprint' = s.fingerprint THEN 'PASS: cutover snapshot still matches'
         ELSE 'REVIEW: current data differs; distinguish legitimate later writes from migration evidence' END AS result,
       e.value AS migration_aggregate_evidence,s.row_count AS current_row_count,s.fingerprint AS current_fingerprint
FROM evidence e CROSS JOIN current_snapshot s;

WITH evidence AS (
  SELECT obj_description('public.newsletter_subscribers_email_normalized_key'::regclass,'pg_class')::jsonb AS value
)
SELECT p.oid::regprocedure::text AS signature,md5(pg_get_functiondef(p.oid)) AS current_definition_hash,
       CASE WHEN e.value->'stage_b'->'reviewed_security_definer_hashes'->>(p.oid::regprocedure::text)
           = md5(pg_get_functiondef(p.oid)) THEN 'PASS: exact reviewed body'
         ELSE 'FAIL: browser-callable SECURITY DEFINER is unreviewed or changed' END AS result
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace CROSS JOIN evidence e
WHERE p.prokind IN ('f','p') AND p.prosecdef AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles reachable
    WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
      AND has_schema_privilege(reachable.oid,n.oid,'USAGE') AND has_function_privilege(reachable.oid,p.oid,'EXECUTE'));
SELECT 'REVIEW: verify the deployed protected admin API, ordinary-user denial, 2FA binding, service subscribe/unsubscribe and active-only campaign selection. SQL metadata alone cannot prove those paths. Capture activation remains separately authorized.' AS application_check;
COMMIT;
