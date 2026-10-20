-- OWNER REVIEW ONLY. PREPARED, NOT EXECUTED.
-- SAFE ACCESS/APPLICATION CONTAINMENT ROLLBACK AFTER STAGE B.
-- Keep the last verified server-mediated application, or roll back ONLY to an
-- earlier release that also uses the protected admin API and service clients.
-- NEVER restore the known PUBLIC/anon/authenticated table exposure.
-- Consent data/columns, normalized and exact uniqueness, settings and identity
-- RPC remain intact. DESTRUCTIVE SCHEMA ROLLBACK IS NOT INCLUDED OR AUTHORIZED.
-- If an old application needs browser grants, STOP for a separate narrow plan.
BEGIN;
SET LOCAL TIME ZONE 'UTC';
SET LOCAL search_path = pg_catalog, public;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '120s';
DO $containment$
DECLARE
  compatible_application_rollback_confirmed boolean := false; -- OWNER MUST CONFIRM.
  target oid := 'public.newsletter_subscribers'::regclass;
  before_count bigint;
  after_count bigint;
  before_fingerprint text;
  after_fingerprint text;
  evidence jsonb;
  columns_sql text;
  item record;
BEGIN
  IF NOT compatible_application_rollback_confirmed THEN
    RAISE EXCEPTION 'STOP: confirm last compatible server-mediated app; broad browser grants will NOT be restored';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = current_user AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Owner-reviewed migration role must bypass RLS';
  END IF;
  LOCK TABLE public.newsletter_subscribers IN ACCESS EXCLUSIVE MODE;
  evidence := obj_description('public.newsletter_subscribers_email_normalized_key'::regclass,'pg_class')::jsonb;
  IF evidence->>'artifact' IS DISTINCT FROM 'Hbee newsletter security v1'
    OR evidence->'stage_b'->>'unchanged_during_cutover' IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Containment rollback requires completed stage B evidence; use reviewed rollout for a pre-cutover system';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role' AND rolbypassrls)
    OR NOT has_schema_privilege('service_role','public','USAGE') THEN
    RAISE EXCEPTION 'service_role BYPASSRLS/schema USAGE must remain available';
  END IF;
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),''))
    INTO before_count,before_fingerprint FROM public.newsletter_subscribers t;
  REVOKE ALL PRIVILEGES ON TABLE public.newsletter_subscribers FROM PUBLIC,anon,authenticated;
  SELECT string_agg(quote_ident(attname),',' ORDER BY attnum) INTO columns_sql
    FROM pg_attribute WHERE attrelid = target AND attnum > 0 AND NOT attisdropped;
  EXECUTE format('REVOKE ALL PRIVILEGES (%s) ON TABLE public.newsletter_subscribers FROM PUBLIC,anon,authenticated',columns_sql);
  FOR item IN SELECT polname FROM pg_policy WHERE polrelid = target LOOP
    EXECUTE format('DROP POLICY %I ON public.newsletter_subscribers',item.polname);
  END LOOP;
  ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.newsletter_subscribers FORCE ROW LEVEL SECURITY;
  GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public.newsletter_subscribers TO service_role;
  FOR item IN SELECT oid,rolname FROM pg_roles WHERE rolname IN ('anon','authenticated') LOOP
    IF has_table_privilege(item.oid,target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
      OR has_any_column_privilege(item.oid,target,'SELECT,INSERT,UPDATE,REFERENCES')
      OR has_function_privilege(item.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE') THEN
      RAISE EXCEPTION 'Inherited/browser grants survive safe containment for %; stop for separate review',item.rolname;
    END IF;
    IF EXISTS (SELECT 1 FROM pg_roles reachable WHERE pg_has_role(item.oid,reachable.oid,'MEMBER')
      AND (reachable.rolsuper OR reachable.rolbypassrls
        OR reachable.oid = (SELECT relowner FROM pg_class WHERE oid = target)
        OR has_table_privilege(reachable.oid,target,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER')
        OR has_any_column_privilege(reachable.oid,target,'SELECT,INSERT,UPDATE,REFERENCES')
        OR has_function_privilege(reachable.oid,'public.newsletter_subscriber_identity(text)'::regprocedure,'EXECUTE'))) THEN
      RAISE EXCEPTION 'Browser SET ROLE/membership exposure survives safe containment for %',item.rolname;
    END IF;
  END LOOP;
  SELECT count(*),md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' ORDER BY id),''))
    INTO after_count,after_fingerprint FROM public.newsletter_subscribers t;
  IF (before_count,before_fingerprint) IS DISTINCT FROM (after_count,after_fingerprint) THEN
    RAISE EXCEPTION 'Subscriber rows changed during containment; transaction aborted';
  END IF;
  evidence := jsonb_set(evidence,'{safe_rollback}',jsonb_build_object('row_count',after_count,
    'before_count',before_count,'before_fingerprint',before_fingerprint,
    'row_fingerprint',after_fingerprint,'checked_at_utc',statement_timestamp(),'unchanged_during_rollback',true));
  EXECUTE format('COMMENT ON INDEX public.newsletter_subscribers_email_normalized_key IS %L',evidence::text);
END $containment$;
NOTIFY pgrst, 'reload schema';
COMMIT;
