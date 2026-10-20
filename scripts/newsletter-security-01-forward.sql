-- OWNER REVIEW ONLY. PREPARED, NOT EXECUTED. NEVER run this file blindly.
-- TWO SEPARATE OWNER-CONTROLLED TRANSACTIONS:
-- A: reviewed additive preparation, then deploy compatible app with capture OFF.
-- B: only AFTER that deployment and verification, close old browser access.
-- Authoritative production guards are reconciled below; 00 must still be rerun
-- immediately before each stage, and any drift must stop rollout.
-- No subscriber/settings-row INSERT/UPDATE/DELETE, activation, or consent backfill.
-- Locks deliberately make the ordinary unique-index build and evidence atomic.
-- Schedule a short maintenance window; lock timeout fails rather than waiting.

-- ======================== STAGE A: PREPARATION =============================
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $prepare$
DECLARE
  expected_relrowsecurity boolean := true;
  expected_relforcerowsecurity boolean := false;
  expected_table_owner name := 'postgres';
  target oid := 'public.newsletter_subscribers'::regclass;
  owner_oid oid;
  before_count bigint;
  after_count bigint;
  before_fingerprint text;
  after_fingerprint text;
  acl record;
  evidence jsonb;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Owner-reviewed inspection/migration role must bypass RLS for authoritative fingerprints';
  END IF;
  LOCK TABLE public.newsletter_subscribers IN ACCESS EXCLUSIVE MODE;
  LOCK TABLE public.site_settings IN ACCESS EXCLUSIVE MODE;
  SELECT relowner INTO owner_oid FROM pg_class WHERE oid = target;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = target AND relkind = 'r' AND NOT relispartition
    AND pg_get_userbyid(relowner) = expected_table_owner
    AND relrowsecurity = expected_relrowsecurity AND relforcerowsecurity = expected_relforcerowsecurity) THEN
    RAISE EXCEPTION 'Unexpected table owner/kind/partition/RLS state; rerun preflight';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = target OR inhparent = target)
    OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = target) THEN
    RAISE EXCEPTION 'Inheritance or table rewrite rules require a separately reviewed plan';
  END IF;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')
      AND NOT rolsuper AND NOT rolbypassrls) <> 2 THEN
    RAISE EXCEPTION 'anon/authenticated role attributes drifted from reviewed production evidence';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND NOT rolsuper AND rolbypassrls)
    OR NOT has_schema_privilege('service_role','public','USAGE') THEN
    RAISE EXCEPTION 'service_role must remain non-superuser with BYPASSRLS and schema USAGE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles elevated
    WHERE browser.rolname IN ('anon','authenticated')
      AND pg_has_role(browser.oid,elevated.oid,'MEMBER')
      AND (elevated.rolsuper OR elevated.rolbypassrls OR elevated.oid = owner_oid
        OR elevated.rolname = 'service_role')) THEN
    RAISE EXCEPTION 'Browser roles reach table ownership or an RLS-bypass role; review role membership first';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = target AND attnum > 0 AND NOT attisdropped
    AND attname IN ('consent_given_at','consent_source','consent_version','marketing_consent','consent_at'))
    OR EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.site_settings'::regclass
      AND attname = 'newsletter_settings' AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Existing consent/settings proposal requires owner reconciliation; do not silently take over columns';
  END IF;
  IF to_regclass('public.newsletter_subscribers_email_normalized_key') IS NOT NULL
    OR EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = 'newsletter_subscriber_identity') THEN
    RAISE EXCEPTION 'Expected new index/RPC names already exist; inspect ownership and prior execution';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = target AND attname = 'id'
      AND atttypid = 'uuid'::regtype AND attnotnull AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = target AND attname = 'email'
      AND atttypid = 'text'::regtype AND attnotnull AND NOT attisdropped)
    OR NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = target AND attname = 'status'
      AND atttypid = 'text'::regtype AND NOT attisdropped) THEN
    RAISE EXCEPTION 'Unexpected id/email/status schema; stop for reconciliation';
  END IF;
  -- Accept either a UNIQUE constraint or standalone UNIQUE index. Production
  -- evidence proves exact UNIQUE(email), not a name or catalog representation.
  IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_am am ON am.oid = idx.relam
    WHERE i.indrelid = target AND i.indisunique AND i.indisvalid AND i.indisready
      AND i.indimmediate AND i.indnkeyatts = 1 AND i.indnatts = 1
      AND i.indkey[0] = (SELECT attnum FROM pg_attribute
        WHERE attrelid = target AND attname = 'email' AND NOT attisdropped)
      AND i.indexprs IS NULL AND i.indpred IS NULL AND am.amname = 'btree') THEN
    RAISE EXCEPTION 'Expected exact UNIQUE(email) index must be retained and verified';
  END IF;
  -- UUID-targeted API mutations and deterministic ORDER BY id fingerprints
  -- require an actually enforced unique row identity; UUID NOT NULL alone
  -- does not prove that invariant. Inspect 00; do not add a PK or change data.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_index i ON i.indexrelid = con.conindid
    WHERE con.conrelid = target AND con.contype IN ('p','u') AND con.convalidated
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = target
        AND attname = 'id' AND NOT attisdropped)]::smallint[]
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts = 1 AND i.indpred IS NULL) THEN
    RAISE EXCEPTION 'Require authoritative PRIMARY KEY(id) or exact validated UNIQUE(id) evidence; no key is added by this migration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.newsletter_subscribers GROUP BY lower(btrim(email)) HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Normalized duplicate identities exist; do not modify/deduplicate subscriber data here';
  END IF;
  -- Before adding columns, synthesize their eventual NULL JSON keys only inside
  -- the aggregate. This hashes the SAME full row shape before and after DDL.
  SELECT count(*), md5(coalesce(string_agg(md5((to_jsonb(t) ||
    '{"consent_given_at":null,"consent_source":null,"consent_version":null}'::jsonb)::text), '' ORDER BY id), ''))
    INTO before_count,before_fingerprint FROM public.newsletter_subscribers t;

  ALTER TABLE public.newsletter_subscribers ADD COLUMN consent_given_at timestamptz NULL;
  ALTER TABLE public.newsletter_subscribers ADD COLUMN consent_source text NULL;
  ALTER TABLE public.newsletter_subscribers ADD COLUMN consent_version text NULL;
  ALTER TABLE public.site_settings ADD COLUMN newsletter_settings jsonb NULL;
  COMMENT ON COLUMN public.newsletter_subscribers.consent_given_at IS 'Server-recorded explicit consent time. Historical rows remain NULL.';
  COMMENT ON COLUMN public.newsletter_subscribers.consent_source IS 'Explicit consent origin for new capture (footer/popup). No historical backfill.';
  COMMENT ON COLUMN public.newsletter_subscribers.consent_version IS 'Version of consent copy actually accepted. No historical backfill.';
  COMMENT ON COLUMN public.site_settings.newsletter_settings IS 'Newsletter-only optional configuration. NULL does not activate capture.';
  CREATE UNIQUE INDEX newsletter_subscribers_email_normalized_key
    ON public.newsletter_subscribers (lower(btrim(email)));
  -- Existing exact unique constraint and all non-unique indexes are retained.

  EXECUTE $ddl$
    CREATE FUNCTION public.newsletter_subscriber_identity(p_email text)
    RETURNS TABLE(id uuid,status text)
    LANGUAGE sql STABLE SECURITY INVOKER
    SET search_path = pg_catalog, pg_temp
    AS $body$
      SELECT ns.id,ns.status FROM public.newsletter_subscribers AS ns
      WHERE pg_catalog.lower(pg_catalog.btrim(ns.email)) = pg_catalog.lower(pg_catalog.btrim(p_email))
    $body$
  $ddl$;
  COMMENT ON FUNCTION public.newsletter_subscriber_identity(text)
    IS 'Hbee newsletter security v1: service-only normalized id/status lookup; SECURITY INVOKER';
  -- Function default privileges can name additional roles. Remove every new
  -- function ACL except its actual owner/service_role; do not alter other RPCs.
  FOR acl IN SELECT DISTINCT x.grantee FROM pg_proc p
    CROSS JOIN LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
    WHERE p.oid = 'public.newsletter_subscriber_identity(text)'::regprocedure
      AND x.grantee <> p.proowner AND x.grantee <> (SELECT oid FROM pg_roles WHERE rolname = 'service_role') LOOP
    IF acl.grantee = 0 THEN
      REVOKE ALL ON FUNCTION public.newsletter_subscriber_identity(text) FROM PUBLIC;
    ELSE
      EXECUTE format('REVOKE ALL ON FUNCTION public.newsletter_subscriber_identity(text) FROM %I',pg_get_userbyid(acl.grantee));
    END IF;
  END LOOP;
  GRANT EXECUTE ON FUNCTION public.newsletter_subscriber_identity(text) TO service_role;
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.newsletter_subscribers TO service_role;
  IF has_function_privilege('anon','public.newsletter_subscriber_identity(text)','EXECUTE')
    OR has_function_privilege('authenticated','public.newsletter_subscriber_identity(text)','EXECUTE') THEN
    RAISE EXCEPTION 'Inherited/browser execution leak on new identity RPC; stop for role review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.newsletter_subscribers WHERE consent_given_at IS NOT NULL
    OR consent_source IS NOT NULL OR consent_version IS NOT NULL) THEN
    RAISE EXCEPTION 'Additive preparation must leave all historical consent metadata NULL';
  END IF;
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),''))
    INTO after_count,after_fingerprint FROM public.newsletter_subscribers t;
  IF (before_count,before_fingerprint) IS DISTINCT FROM (after_count,after_fingerprint) THEN
    RAISE EXCEPTION 'Subscriber rows changed during preparation; entire transaction aborted';
  END IF;
  evidence := jsonb_build_object('artifact','Hbee newsletter security v1',
    'identity_rpc_hash',(SELECT md5(pg_get_functiondef('public.newsletter_subscriber_identity(text)'::regprocedure))),
    'stage_a',jsonb_build_object('row_count',after_count,'row_fingerprint',after_fingerprint,
      'before_count',before_count,'before_fingerprint',before_fingerprint,
      'checked_at_utc',statement_timestamp(),'unchanged_with_null_metadata',true),
    'prior_table_state',jsonb_build_object('table_owner',expected_table_owner,
      'relrowsecurity',expected_relrowsecurity,'relforcerowsecurity',expected_relforcerowsecurity),
    'stage_b',NULL);
  EXECUTE format('COMMENT ON INDEX public.newsletter_subscribers_email_normalized_key IS %L',evidence::text);
END $prepare$;
NOTIFY pgrst, 'reload schema';
COMMIT;

-- STOP HERE. Review stage A, deploy and verify compatible server-mediated app
-- with capture OFF. Do not run B in the same blind execution as A.
-- ======================== STAGE B: ACCESS CUTOVER ==========================
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $cutover$
DECLARE
  -- Confirmed by the owner after deployment of 09a69cc and the documented
  -- admin/2FA, API-denial, capture-OFF and storefront runtime checks.
  compatible_application_cutover_confirmed boolean := true;
  -- Map EACH reviewed browser-callable SECURITY DEFINER signature to the exact
  -- md5(pg_get_functiondef(oid)) returned by the authoritative production review.
  -- Keys are explicitly schema-qualified below; NO wildcard approval.
  reviewed_security_definer_hashes jsonb := '{"public.current_client_id()":"298d2fb4275c92b8b24f4ad3a2a0ba8d","public.increment_blog_view(uuid)":"a1bb0427d93116b48eed7b86e0dd1f06","public.is_active_admin()":"ff158b21fdc826346db24a298bf7bf5f"}'::jsonb;
  expected_identity_rpc_hash text := '7ff011c458b629e471f3629f7d389e1a';
  expected_legacy_row_count bigint := 14;
  expected_legacy_projection_fingerprint text := 'b9ec19e5467d2ceb0c42d7531cc1ee67';
  target oid := 'public.newsletter_subscribers'::regclass;
  before_count bigint;
  after_count bigint;
  before_fingerprint text;
  after_fingerprint text;
  evidence jsonb;
  item record;
  columns_sql text;
BEGIN
  IF NOT compatible_application_cutover_confirmed THEN
    RAISE EXCEPTION 'STOP: compatible subscribe/unsubscribe/admin/campaign app must be deployed and verified with capture OFF';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Owner-reviewed migration role must bypass RLS';
  END IF;
  LOCK TABLE public.newsletter_subscribers IN ACCESS EXCLUSIVE MODE;
  -- Keep the capture-switch check stable for the complete access transaction.
  LOCK TABLE public.site_settings IN ACCESS EXCLUSIVE MODE;
  evidence := obj_description('public.newsletter_subscribers_email_normalized_key'::regclass,'pg_class')::jsonb;
  IF evidence->>'artifact' IS DISTINCT FROM 'Hbee newsletter security v1'
    OR evidence->'stage_a'->>'unchanged_with_null_metadata' IS DISTINCT FROM 'true'
    OR evidence->'stage_b' IS DISTINCT FROM 'null'::jsonb THEN
    RAISE EXCEPTION 'Missing/unexpected stage A evidence or cutover already performed';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = target AND relkind = 'r' AND NOT relispartition
    AND pg_get_userbyid(relowner) = evidence->'prior_table_state'->>'table_owner'
    AND relrowsecurity = (evidence->'prior_table_state'->>'relrowsecurity')::boolean
    AND relforcerowsecurity = (evidence->'prior_table_state'->>'relforcerowsecurity')::boolean)
    OR EXISTS (SELECT 1 FROM pg_inherits WHERE inhrelid = target OR inhparent = target)
    OR EXISTS (SELECT 1 FROM pg_rewrite WHERE ev_class = target) THEN
    RAISE EXCEPTION 'Table/RLS/inheritance/rule evidence drifted after preparation';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_index i ON i.indexrelid = con.conindid
    WHERE con.conrelid = target AND con.contype IN ('p','u') AND con.convalidated
      AND con.conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = target
        AND attname = 'id' AND NOT attisdropped)]::smallint[]
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indnkeyatts = 1 AND i.indpred IS NULL) THEN
    RAISE EXCEPTION 'Prepared PRIMARY KEY(id)/UNIQUE(id) identity invariant drifted before cutover';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_am am ON am.oid = idx.relam
    WHERE i.indrelid = target AND i.indisunique AND i.indisvalid AND i.indisready
      AND i.indimmediate AND i.indnkeyatts = 1 AND i.indnatts = 1
      AND i.indkey[0] = (SELECT attnum FROM pg_attribute
        WHERE attrelid = target AND attname = 'email' AND NOT attisdropped)
      AND i.indexprs IS NULL AND i.indpred IS NULL AND am.amname = 'btree') THEN
    RAISE EXCEPTION 'Exact UNIQUE(email) index drifted before cutover';
  END IF;
  IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('anon','authenticated')
      AND NOT rolsuper AND NOT rolbypassrls) <> 2 THEN
    RAISE EXCEPTION 'anon/authenticated role attributes drifted before cutover';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND NOT rolsuper AND rolbypassrls)
    OR NOT has_schema_privilege('service_role','public','USAGE') THEN
    RAISE EXCEPTION 'service_role non-superuser/BYPASSRLS/schema privileges are required';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_proc p WHERE p.oid = 'public.newsletter_subscriber_identity(text)'::regprocedure
      AND NOT p.prosecdef AND p.provolatile = 's'
      AND p.proconfig @> ARRAY['search_path=pg_catalog, pg_temp']
      AND md5(pg_get_functiondef(p.oid)) = expected_identity_rpc_hash
      AND evidence->>'identity_rpc_hash' = expected_identity_rpc_hash
      AND has_function_privilege('service_role',p.oid,'EXECUTE')
      AND NOT has_function_privilege('anon',p.oid,'EXECUTE')
      AND NOT has_function_privilege('authenticated',p.oid,'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
        WHERE x.grantee NOT IN (p.proowner,(SELECT oid FROM pg_roles WHERE rolname = 'service_role'))))
    OR NOT EXISTS (SELECT 1 FROM pg_index i JOIN pg_class idx ON idx.oid = i.indexrelid
      JOIN pg_am am ON am.oid = idx.relam WHERE i.indrelid = target
      AND i.indexrelid = 'public.newsletter_subscribers_email_normalized_key'::regclass
      AND i.indisunique AND i.indisvalid AND i.indisready AND i.indimmediate
      AND i.indnkeyatts = 1 AND i.indnatts = 1 AND i.indkey[0] = 0
      AND i.indpred IS NULL AND am.amname = 'btree'
      AND replace(pg_get_expr(i.indexprs,i.indrelid),' ','') = 'lower(btrim(email))') THEN
    RAISE EXCEPTION 'Prepared identity RPC/index changed; rerun preflight before cutover';
  END IF;
  IF (SELECT count(*) FROM (VALUES ('consent_given_at','timestamp with time zone'),('consent_source','text'),('consent_version','text')) wanted(name,type)
      JOIN pg_attribute a ON a.attrelid = target AND a.attname = wanted.name AND NOT a.attisdropped
        AND format_type(a.atttypid,a.atttypmod) = wanted.type
      LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE NOT a.attnotnull AND d.oid IS NULL AND a.attgenerated = '' AND a.attidentity = '') <> 3
    OR NOT EXISTS (SELECT 1 FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
      WHERE a.attrelid = 'public.site_settings'::regclass AND a.attname = 'newsletter_settings' AND NOT a.attisdropped
        AND a.atttypid = 'jsonb'::regtype AND NOT a.attnotnull AND d.oid IS NULL) THEN
    RAISE EXCEPTION 'Prepared nullable consent/settings schema drifted';
  END IF;
  IF EXISTS (SELECT 1 FROM public.site_settings
    WHERE newsletter_settings->>'footer_enabled' = 'true'
       OR newsletter_settings->>'popup_enabled' = 'true'
       OR newsletter_settings->>'enabled' = 'true') THEN
    RAISE EXCEPTION 'Capture must remain disabled during this security cutover';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles elevated
    WHERE browser.rolname IN ('anon','authenticated')
      AND pg_has_role(browser.oid,elevated.oid,'MEMBER')
      AND (elevated.rolsuper OR elevated.rolbypassrls OR elevated.rolname = 'service_role'
        OR elevated.oid = (SELECT relowner FROM pg_class WHERE oid = target))) THEN
    RAISE EXCEPTION 'Browser role inheritance reaches ownership or RLS bypass';
  END IF;
  -- Even a security-invoker view is blocked here for explicit owner review.
  -- No unrelated view grants are altered silently.
  IF EXISTS (WITH RECURSIVE surface(oid) AS (
      SELECT target UNION SELECT rw.ev_class FROM surface s JOIN pg_depend d
        ON d.refclassid = 'pg_class'::regclass AND d.refobjid = s.oid
      JOIN pg_rewrite rw ON d.classid = 'pg_rewrite'::regclass AND d.objid = rw.oid WHERE rw.ev_class <> s.oid
    ) SELECT 1 FROM surface s JOIN pg_class c ON c.oid = s.oid WHERE c.relkind IN ('v','m')
      AND EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles reachable
        WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
          AND (has_table_privilege(reachable.oid,c.oid,'SELECT') OR has_any_column_privilege(reachable.oid,c.oid,'SELECT')))) THEN
    RAISE EXCEPTION 'Browser-accessible dependent view/materialized view requires separate review';
  END IF;
  FOR item IN SELECT p.oid,format('%I.%I(%s)',n.nspname,p.proname,oidvectortypes(p.proargtypes)) AS signature,
      md5(pg_get_functiondef(p.oid)) AS body_hash
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE p.prokind IN ('f','p') AND p.prosecdef AND n.nspname NOT IN ('pg_catalog','information_schema')
      AND n.nspname NOT LIKE 'pg_toast%' AND n.nspname NOT LIKE 'pg_temp%'
      AND EXISTS (SELECT 1 FROM pg_roles browser CROSS JOIN pg_roles reachable
        WHERE browser.rolname IN ('anon','authenticated') AND pg_has_role(browser.oid,reachable.oid,'MEMBER')
          AND has_schema_privilege(reachable.oid,n.oid,'USAGE') AND has_function_privilege(reachable.oid,p.oid,'EXECUTE')) LOOP
    IF reviewed_security_definer_hashes->>item.signature IS DISTINCT FROM item.body_hash THEN
      RAISE EXCEPTION 'Unreviewed browser-callable SECURITY DEFINER routine: % (hash %)',item.signature,item.body_hash;
    END IF;
  END LOOP;
  SELECT count(*),md5(coalesce(string_agg(md5((to_jsonb(t) - ARRAY[
      'consent_given_at','consent_source','consent_version'])::text),'' ORDER BY id),''))
    INTO before_count,before_fingerprint FROM public.newsletter_subscribers t;
  IF (before_count,before_fingerprint) IS DISTINCT FROM
      (expected_legacy_row_count,expected_legacy_projection_fingerprint) THEN
    RAISE EXCEPTION 'Subscriber legacy projection drifted from authoritative Stage B evidence';
  END IF;

  REVOKE ALL PRIVILEGES ON TABLE public.newsletter_subscribers FROM PUBLIC,anon,authenticated;
  SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO columns_sql
    FROM pg_attribute WHERE attrelid = target AND attnum > 0 AND NOT attisdropped;
  -- Table REVOKE does not remove independent column grants.
  EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.newsletter_subscribers FROM PUBLIC,anon,authenticated',columns_sql);
  -- Drop every existing policy ONLY on this exact table, not just known names.
  FOR item IN SELECT polname FROM pg_policy WHERE polrelid = target LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers',item.polname);
  END LOOP;
  ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.newsletter_subscribers TO service_role;
  GRANT EXECUTE ON FUNCTION public.newsletter_subscriber_identity(text) TO service_role;
  -- All other preexisting service_role privileges remain; none are revoked.

  FOR item IN SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    IF has_table_privilege(item.oid,target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege(item.oid,target,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_function_privilege(item.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE') THEN
      RAISE EXCEPTION 'Surviving inherited/table/column/RPC grant for %; transaction aborted',item.rolname;
    END IF;
    -- MEMBER also catches NOINHERIT/SET ROLE routes not included in effective
    -- privileges of the current browser role. Never silently revoke other roles.
    IF EXISTS (SELECT 1 FROM pg_roles reachable WHERE pg_has_role(item.oid,reachable.oid,'MEMBER')
      AND (has_table_privilege(reachable.oid,target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(reachable.oid,target,'SELECT,INSERT,UPDATE,REFERENCES')
        OR has_function_privilege(reachable.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE'))) THEN
      RAISE EXCEPTION 'SET ROLE/membership path survives for %; separately review role membership/grants',item.rolname;
    END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM pg_policy WHERE polrelid = target)
    OR NOT EXISTS (SELECT 1 FROM pg_class WHERE oid = target AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'Expected ENABLE + FORCE RLS with zero policies';
  END IF;
  SELECT count(*),md5(coalesce(string_agg(md5((to_jsonb(t) - ARRAY[
      'consent_given_at','consent_source','consent_version'])::text),'' ORDER BY id),''))
    INTO after_count,after_fingerprint FROM public.newsletter_subscribers t;
  IF (before_count,before_fingerprint) IS DISTINCT FROM (after_count,after_fingerprint) THEN
    RAISE EXCEPTION 'Subscriber rows changed during access cutover; transaction aborted';
  END IF;
  evidence := jsonb_set(evidence,'{stage_b}',jsonb_build_object('row_count',after_count,
    'before_count',before_count,'before_legacy_projection_fingerprint',before_fingerprint,
    'legacy_projection_fingerprint',after_fingerprint,'checked_at_utc',statement_timestamp(),'unchanged_during_cutover',true,
    'reviewed_security_definer_hashes',reviewed_security_definer_hashes));
  EXECUTE format('COMMENT ON INDEX public.newsletter_subscribers_email_normalized_key IS %L',evidence::text);
END $cutover$;
NOTIFY pgrst, 'reload schema';
COMMIT;
