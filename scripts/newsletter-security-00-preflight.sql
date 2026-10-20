-- OWNER REVIEW ONLY. PREPARED, NOT EXECUTED. Run separately before editing 01.
-- Read-only catalog/aggregate evidence; no subscriber emails or other row values.
-- Run as an owner-reviewed role that can see all rows (RLS bypass is required
-- for the counts/fingerprint to be authoritative). Do not share function bodies
-- if unrelated legacy routines contain secrets; hashes/signatures suffice here.
BEGIN READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = pg_catalog, public;

-- Authoritative RLS evidence. Existing policies DO NOT prove either flag.
SELECT n.nspname, c.relname, pg_get_userbyid(c.relowner) AS table_owner,
       c.relkind, c.relispartition, c.relrowsecurity, c.relforcerowsecurity,
       c.relacl AS raw_table_acl,
       current_user AS inspection_role, r.rolsuper, r.rolbypassrls
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_roles r ON r.rolname = current_user
WHERE n.nspname = 'public' AND c.relname = 'newsletter_subscribers';

SELECT a.attnum, a.attname, format_type(a.atttypid, a.atttypmod) AS database_type,
       a.attnotnull, a.attidentity, a.attgenerated,
       pg_get_expr(d.adbin, d.adrelid) AS default_expression, a.attacl AS raw_column_acl
FROM pg_attribute a LEFT JOIN pg_attrdef d
  ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE a.attrelid = 'public.newsletter_subscribers'::regclass
  AND a.attnum > 0 AND NOT a.attisdropped ORDER BY a.attnum;

SELECT conname, contype, convalidated, condeferrable, condeferred,
       pg_get_constraintdef(oid, true) AS definition,
       conrelid::regclass AS on_table, confrelid::regclass AS referenced_table
FROM pg_constraint WHERE conrelid = 'public.newsletter_subscribers'::regclass
   OR confrelid = 'public.newsletter_subscribers'::regclass ORDER BY conname;

-- Review structural equivalence, not names alone. No index is dropped in 01.
SELECT i.indexrelid::regclass AS index_name, am.amname AS access_method,
       i.indisunique, i.indisprimary, i.indisvalid, i.indisready, i.indimmediate,
       i.indnkeyatts, i.indnatts, i.indkey, i.indclass, i.indcollation, i.indoption,
       pg_get_expr(i.indexprs, i.indrelid) AS expressions,
       pg_get_expr(i.indpred, i.indrelid) AS predicate,
       pg_get_indexdef(i.indexrelid) AS definition
FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid
JOIN pg_am am ON am.oid = idx.relam
WHERE i.indrelid = 'public.newsletter_subscribers'::regclass ORDER BY index_name;
SELECT a.indexrelid::regclass AS first_index, b.indexrelid::regclass AS second_index,
       'REVIEW: same structural keys; inspect flags/constraints before optional later cleanup' AS assessment
FROM pg_index a JOIN pg_index b ON a.indrelid = b.indrelid AND a.indexrelid < b.indexrelid
JOIN pg_class ac ON ac.oid = a.indexrelid JOIN pg_class bc ON bc.oid = b.indexrelid
WHERE a.indrelid = 'public.newsletter_subscribers'::regclass
  AND ac.relam = bc.relam AND a.indnkeyatts = b.indnkeyatts AND a.indnatts = b.indnatts
  AND a.indkey = b.indkey AND a.indclass = b.indclass AND a.indcollation = b.indcollation
  AND a.indoption = b.indoption AND a.indexprs IS NOT DISTINCT FROM b.indexprs
  AND a.indpred IS NOT DISTINCT FROM b.indpred;

SELECT count(*) AS normalized_duplicate_groups FROM (
  SELECT lower(btrim(email)) FROM public.newsletter_subscribers
  GROUP BY lower(btrim(email)) HAVING count(*) > 1
) duplicates;
-- New capture is ASCII-only; historical Unicode identities remain untouched.
-- UTF8 byte length exceeding character count identifies non-ASCII characters
-- without returning any address. Also inspect locale/collation: database lower()
-- remains the authority for historical identities and the functional index.
SELECT count(*) FILTER (WHERE octet_length(convert_to(email,'UTF8')) <> char_length(email))
       AS historical_non_ascii_email_count
FROM public.newsletter_subscribers;
SELECT current_database() AS database_name, pg_encoding_to_char(encoding) AS encoding,
       datcollate, datctype FROM pg_database WHERE datname = current_database();
SELECT a.attname, n.nspname AS collation_schema, col.collname, col.collprovider,
       col.collisdeterministic, col.collcollate, col.collctype, col.collversion,
       pg_collation_actual_version(col.oid) AS actual_collation_version
FROM pg_attribute a JOIN pg_collation col ON col.oid = a.attcollation
JOIN pg_namespace n ON n.oid = col.collnamespace
WHERE a.attrelid = 'public.newsletter_subscribers'::regclass
  AND a.attname = 'email' AND NOT a.attisdropped;
SELECT count(*) AS row_count,
       md5(coalesce(string_agg(md5(to_jsonb(t)::text), '' ORDER BY id), '')) AS existing_row_fingerprint,
       count(*) FILTER (WHERE status = 'active') AS active_count,
       count(*) FILTER (WHERE status = 'unsubscribed') AS unsubscribed_count,
       count(*) FILTER (WHERE status = 'bounced') AS bounced_count,
       count(*) FILTER (WHERE status IS NULL) AS null_status_count,
       count(*) FILTER (WHERE status IS NOT NULL AND status NOT IN ('active','unsubscribed','bounced')) AS other_status_count
FROM public.newsletter_subscribers t;

SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies WHERE schemaname = 'public' AND tablename = 'newsletter_subscribers'
ORDER BY policyname;

-- aclexplode includes PUBLIC (OID 0), unlike information_schema.role_table_grants.
SELECT CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       pg_get_userbyid(x.grantor) AS grantor, x.privilege_type, x.is_grantable
FROM pg_class c CROSS JOIN LATERAL aclexplode(coalesce(c.relacl, acldefault('r',c.relowner))) x
WHERE c.oid = 'public.newsletter_subscribers'::regclass;
SELECT a.attname,
       CASE WHEN x.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(x.grantee) END AS grantee,
       x.privilege_type, x.is_grantable
FROM pg_attribute a CROSS JOIN LATERAL aclexplode(a.attacl) x
WHERE a.attrelid = 'public.newsletter_subscribers'::regclass AND a.attnum > 0 AND NOT a.attisdropped;
SELECT r.rolname, r.rolsuper, r.rolbypassrls, r.rolinherit,
       has_schema_privilege(r.oid,'public','USAGE') AS schema_usage,
       has_table_privilege(r.oid,'public.newsletter_subscribers','SELECT') AS can_select,
       has_table_privilege(r.oid,'public.newsletter_subscribers','INSERT') AS can_insert,
       has_table_privilege(r.oid,'public.newsletter_subscribers','UPDATE') AS can_update,
       has_table_privilege(r.oid,'public.newsletter_subscribers','DELETE') AS can_delete,
       has_table_privilege(r.oid,'public.newsletter_subscribers','TRUNCATE') AS can_truncate,
       has_table_privilege(r.oid,'public.newsletter_subscribers','TRIGGER') AS can_trigger,
       has_table_privilege(r.oid,'public.newsletter_subscribers','REFERENCES') AS can_reference,
       has_any_column_privilege(r.oid,'public.newsletter_subscribers','SELECT') AS any_column_select,
       has_any_column_privilege(r.oid,'public.newsletter_subscribers','INSERT') AS any_column_insert,
       has_any_column_privilege(r.oid,'public.newsletter_subscribers','UPDATE') AS any_column_update,
       has_any_column_privilege(r.oid,'public.newsletter_subscribers','REFERENCES') AS any_column_reference
FROM pg_roles r WHERE r.rolname IN ('anon','authenticated','service_role');
SELECT browser.rolname AS browser_role, inherited.rolname AS reachable_role,
       inherited.rolsuper, inherited.rolbypassrls,
       pg_has_role(browser.oid,inherited.oid,'USAGE') AS inherited_now
FROM pg_roles browser CROSS JOIN pg_roles inherited
WHERE browser.rolname IN ('anon','authenticated')
  AND pg_has_role(browser.oid,inherited.oid,'MEMBER') ORDER BY browser.rolname, inherited.rolname;
SELECT pg_get_userbyid(d.defaclrole) AS owner, n.nspname, d.defaclobjtype, d.defaclacl
FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
WHERE d.defaclnamespace = 0 OR n.nspname = 'public';

SELECT inhrelid::regclass AS child, inhparent::regclass AS parent
FROM pg_inherits WHERE inhrelid = 'public.newsletter_subscribers'::regclass
   OR inhparent = 'public.newsletter_subscribers'::regclass;
SELECT tgname, tgenabled, tgisinternal, tgfoid::regprocedure AS function_signature,
       pg_get_triggerdef(oid,true) AS definition
FROM pg_trigger WHERE tgrelid = 'public.newsletter_subscribers'::regclass;
SELECT rulename, pg_get_ruledef(oid,true) AS definition
FROM pg_rewrite WHERE ev_class = 'public.newsletter_subscribers'::regclass;

-- All transitive dependent views, including materialized views, need inspection.
WITH RECURSIVE surface(oid) AS (
  SELECT 'public.newsletter_subscribers'::regclass::oid
  UNION
  SELECT rw.ev_class FROM surface s JOIN pg_depend d
    ON d.refclassid = 'pg_class'::regclass AND d.refobjid = s.oid
  JOIN pg_rewrite rw ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid
  WHERE rw.ev_class <> s.oid
)
SELECT c.oid::regclass AS dependent_view, c.relkind, pg_get_userbyid(c.relowner) AS owner,
       c.reloptions, c.relacl, pg_get_viewdef(c.oid,true) AS definition,
       has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
       has_table_privilege('authenticated',c.oid,'SELECT') AS authenticated_select
FROM surface s JOIN pg_class c ON c.oid = s.oid WHERE c.relkind IN ('v','m');

-- Review exact signatures/body hashes of EVERY browser-callable SECURITY DEFINER
-- routine in a browser-usable non-system schema. Dynamic SQL cannot be proven
-- safe by searching routine text. Stage B requires the reviewed exact hash map.
SELECT p.oid::regprocedure::text AS signature, pg_get_userbyid(p.proowner) AS owner,
       p.prosecdef, p.proconfig, p.proacl,
       md5(pg_get_functiondef(p.oid)) AS definition_hash,
       has_function_privilege('anon',p.oid,'EXECUTE') AS anon_execute,
       has_function_privilege('authenticated',p.oid,'EXECUTE') AS authenticated_execute
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
  AND (p.prosecdef OR p.proname = 'newsletter_subscriber_identity')
  AND (EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles reachable
    WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
      AND has_schema_privilege(reachable.oid,n.oid,'USAGE') AND has_function_privilege(reachable.oid,p.oid,'EXECUTE'))
    OR p.proname = 'newsletter_subscriber_identity') ORDER BY signature;
-- Supplementary candidates only: text/dependency search is not a security proof.
SELECT p.oid::regprocedure AS signature, p.prosecdef, p.proconfig, p.proacl,
       md5(pg_get_functiondef(p.oid)) AS definition_hash
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.prokind IN ('f','p') AND n.nspname NOT IN ('pg_catalog','information_schema')
  AND (p.prosrc ILIKE '%newsletter_subscribers%' OR EXISTS (
    SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_proc'::regclass AND d.objid = p.oid
      AND d.refclassid = 'pg_class'::regclass AND d.refobjid = 'public.newsletter_subscribers'::regclass));

SELECT c.relname, a.attname, format_type(a.atttypid,a.atttypmod) AS database_type,
       a.attnotnull, pg_get_expr(d.adbin,d.adrelid) AS default_expression
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
WHERE n.nspname = 'public' AND c.relname IN ('site_settings','footer_settings')
  AND (a.attname IN ('contact_email','footer_description','social_links','newsletter_settings')
       OR a.attname LIKE 'social_%') ORDER BY c.relname,a.attnum;
SELECT 'OWNER CHECK: deploy protected /api/admin/subscribers compatibility first; active-admin session + user-bound 2FA + active admin_users; ordinary authenticated is denied. No browser table grants are needed afterward.' AS admin_access_assumption;
COMMIT;
