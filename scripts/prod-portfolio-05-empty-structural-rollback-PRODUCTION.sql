-- =====================================================================================================================
-- Portfolio CMS: STRUCTURAL ROLLBACK, ONLY WHILE NOTHING HAS BEEN CREATED.  PRODUCTION.  IRREVERSIBLE.  DRAFT - NOT EXECUTED.
--
-- Removes everything prod-portfolio-02-forward-PRODUCTION.sql added, restoring portfolio_items to its pre-migration shape:
--   triggers, save_portfolio_creative, bump_portfolio_creative_revision, portfolio_capabilities, portfolio_media, and the columns
--   creative_revision, engagement_type, project_status, is_case_study (their constraints go with them).
-- It is only allowed while that destroys NOTHING an editor made. It ABORTS, changing nothing, unless ALL of these hold:
--   * portfolio_media and portfolio_capabilities contain 0 rows;
--   * every portfolio_items row still has the migration defaults (creative_revision 0, engagement_type 'studio_team',
--     project_status 'completed', is_case_study false) - i.e. nobody has classified a project or saved media since;
--   * the objects are the ones the forward created (comment markers).
-- If any editor work exists, DO NOT use this: use prod-portfolio-04-access-rollback-PRODUCTION.sql (non-destructive) and fix forward.
--
-- Needs BOTH, as the first lines of the run:   set hbee.confirm_production = 'yes';   set hbee.confirm_irreversible = 'yes';
-- Proves, before COMMIT, that portfolio_items has the same rows and the same policies and grants as before.
-- Turn the flag off and redeploy FIRST, so no running build reads the tables while they are removed.
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $guard$
declare
  v_n bigint;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run.';
  end if;
  if coalesce(current_setting('hbee.confirm_irreversible', true), '') <> 'yes' then
    raise exception 'Refusing to run: this drops tables and columns. Put  set hbee.confirm_irreversible = ''yes'';  in the run to confirm nothing has been created in them.';
  end if;
  if to_regclass('public.portfolio_media') is null or to_regclass('public.portfolio_capabilities') is null then
    raise exception 'ABORT (nothing changed): the Portfolio tables are not both present - not the state this script removes.';
  end if;
  if coalesce(obj_description(to_regclass('public.portfolio_media'), 'pg_class'), '') <> 'Hbee portfolio creative Phase C v1'
     or coalesce(obj_description(to_regclass('public.portfolio_capabilities'), 'pg_class'), '') <> 'Hbee portfolio creative Phase C v1' then
    raise exception 'ABORT (nothing changed): the tables do not carry the migration''s ownership marker.';
  end if;
  select count(*) into v_n from public.portfolio_media;
  if v_n <> 0 then raise exception 'ABORT (nothing changed): portfolio_media holds % row(s). Fix forward; use the access rollback instead.', v_n; end if;
  select count(*) into v_n from public.portfolio_capabilities;
  if v_n <> 0 then raise exception 'ABORT (nothing changed): portfolio_capabilities holds % row(s). Fix forward; use the access rollback instead.', v_n; end if;
  select count(*) into v_n from public.portfolio_items where creative_revision <> 0 or engagement_type <> 'studio_team' or project_status <> 'completed' or is_case_study <> false;
  if v_n <> 0 then raise exception 'ABORT (nothing changed): % portfolio_items row(s) were classified or revised since the migration (client / ongoing / Case Study / revision). Fix forward.', v_n; end if;

  perform set_config('hbee.pf_rows', (select count(*) from public.portfolio_items)::text, true);
  perform set_config('hbee.pf_digest', (select coalesce(md5(string_agg((to_jsonb(t) - 'creative_revision' - 'engagement_type' - 'project_status' - 'is_case_study')::text, '|' order by t.id::text)), 'empty') from public.portfolio_items t), true);
  perform set_config('hbee.pf_policies', (select coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s', policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')), E'\n' order by policyname)), 'none') from pg_policies where schemaname = 'public' and tablename = 'portfolio_items'), true);
  perform set_config('hbee.pf_acl', (select coalesce(c.relacl::text, 'default') from pg_class c where c.oid = 'public.portfolio_items'::regclass), true);
end $guard$;

drop trigger portfolio_media_revision on public.portfolio_media;
drop trigger portfolio_capabilities_revision on public.portfolio_capabilities;
drop function public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean);
drop function public.bump_portfolio_creative_revision();
drop table public.portfolio_capabilities;
drop table public.portfolio_media;
alter table public.portfolio_items drop column is_case_study, drop column project_status, drop column engagement_type, drop column creative_revision;

do $post$
declare
  v_digest text;
begin
  if to_regclass('public.portfolio_media') is not null or to_regclass('public.portfolio_capabilities') is not null then raise exception 'Post-condition failed: a Portfolio table still exists.'; end if;
  if exists (select 1 from pg_proc where pronamespace = 'public'::regnamespace and proname in ('save_portfolio_creative', 'bump_portfolio_creative_revision')) then raise exception 'Post-condition failed: a Portfolio function still exists.'; end if;
  if exists (select 1 from pg_attribute where attrelid = 'public.portfolio_items'::regclass and not attisdropped and attname in ('creative_revision', 'engagement_type', 'project_status', 'is_case_study')) then raise exception 'Post-condition failed: a new column still exists.'; end if;
  if (select count(*) from public.portfolio_items) <> current_setting('hbee.pf_rows')::bigint then raise exception 'Post-condition failed: portfolio_items row count changed.'; end if;
  select coalesce(md5(string_agg(to_jsonb(t)::text, '|' order by t.id::text)), 'empty') into v_digest from public.portfolio_items t;
  if v_digest is distinct from current_setting('hbee.pf_digest') then raise exception 'Post-condition failed: a portfolio_items value changed.'; end if;
  select coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s', policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')), E'\n' order by policyname)), 'none') into v_digest from pg_policies where schemaname = 'public' and tablename = 'portfolio_items';
  if v_digest is distinct from current_setting('hbee.pf_policies') then raise exception 'Post-condition failed: portfolio_items policies changed.'; end if;
  if coalesce((select c.relacl::text from pg_class c where c.oid = 'public.portfolio_items'::regclass), 'default') is distinct from current_setting('hbee.pf_acl') then raise exception 'Post-condition failed: portfolio_items grants changed.'; end if;
end $post$;

commit;
