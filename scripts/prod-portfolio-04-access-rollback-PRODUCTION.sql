-- =====================================================================================================================
-- Portfolio CMS: ACCESS ROLLBACK.  PRODUCTION.  DRAFT - NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- The safe rollback. It DESTROYS NOTHING: both tables, every media / capability row, the revision column, the classification
-- columns and is_case_study stay exactly as they are. It only closes the doors:
--   * revokes all anon / authenticated / PUBLIC privileges on portfolio_media and portfolio_capabilities;
--   * revokes EXECUTE on save_portfolio_creative from authenticated (and anon / PUBLIC);
--   * leaves service_role and the owner untouched, and portfolio_items untouched.
-- Why this and not a DROP: once an editor has saved media or classified a project, dropping the tables or columns would destroy
-- that work. If something is wrong AFTER content exists, fix forward. See docs/portfolio-cms-case-studies-release.md.
--
-- ORDER: FIRST set NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED off (or remove it) and redeploy, so the application stops reading the
-- tables; THEN run this. (With the flag already off the public site never touches these tables, so nothing visible changes.)
-- Public pages with the flag off render from the legacy fields, exactly as before the migration.
--
-- Put this line FIRST in the same run:   set hbee.confirm_production = 'yes';
--
-- TO RE-OPEN ACCESS later (owner decision, run by hand) - these are the exact grants the forward gave:
--   grant select on public.portfolio_media, public.portfolio_capabilities to anon;
--   grant select, insert, update, delete on public.portfolio_media, public.portfolio_capabilities to authenticated;
--   grant execute on function public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean) to authenticated;
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';

do $guard$
declare
  v_rows_media bigint;
  v_rows_caps bigint;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run.';
  end if;
  if to_regclass('public.portfolio_media') is null or to_regclass('public.portfolio_capabilities') is null then
    raise exception 'ABORT (nothing changed): the Portfolio tables do not exist - nothing to roll back.';
  end if;
  if to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)') is null then
    raise exception 'ABORT (nothing changed): save_portfolio_creative does not exist.';
  end if;
  select count(*) into v_rows_media from public.portfolio_media;
  select count(*) into v_rows_caps from public.portfolio_capabilities;
  perform set_config('hbee.pf_media_rows', v_rows_media::text, true);
  perform set_config('hbee.pf_caps_rows', v_rows_caps::text, true);
  perform set_config('hbee.pf_items_rows', (select count(*) from public.portfolio_items)::text, true);
  perform set_config('hbee.pf_items_policies', (select coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s', policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')), E'\n' order by policyname)), 'none') from pg_policies where schemaname = 'public' and tablename = 'portfolio_items'), true);
end $guard$;

revoke all on public.portfolio_media, public.portfolio_capabilities from public, anon, authenticated;
revoke all on function public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean) from public, anon, authenticated;

do $post$
declare
  r record;
begin
  for r in select unnest(array['portfolio_media', 'portfolio_capabilities']) as t loop
    if has_table_privilege('anon', 'public.' || r.t, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') then raise exception 'Post-condition failed: anon still holds a privilege on %.', r.t; end if;
    if has_table_privilege('authenticated', 'public.' || r.t, 'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES') then raise exception 'Post-condition failed: authenticated still holds a privilege on %.', r.t; end if;
  end loop;
  if has_function_privilege('authenticated', 'public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)', 'EXECUTE') or has_function_privilege('anon', 'public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)', 'EXECUTE') then
    raise exception 'Post-condition failed: save_portfolio_creative is still executable by a browser role.';
  end if;
  if (select count(*) from public.portfolio_media) <> current_setting('hbee.pf_media_rows')::bigint or (select count(*) from public.portfolio_capabilities) <> current_setting('hbee.pf_caps_rows')::bigint then
    raise exception 'Post-condition failed: a child row count changed.';
  end if;
  if (select count(*) from public.portfolio_items) <> current_setting('hbee.pf_items_rows')::bigint then raise exception 'Post-condition failed: portfolio_items row count changed.'; end if;
  if (select coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s', policyname, permissive, roles::text, cmd, coalesce(qual, ''), coalesce(with_check, '')), E'\n' order by policyname)), 'none') from pg_policies where schemaname = 'public' and tablename = 'portfolio_items') is distinct from current_setting('hbee.pf_items_policies') then
    raise exception 'Post-condition failed: portfolio_items policies changed.';
  end if;
end $post$;

commit;
-- Then run scripts/prod-portfolio-03-verify-readonly.sql: it will now report the missing browser grants as problems, by design.
