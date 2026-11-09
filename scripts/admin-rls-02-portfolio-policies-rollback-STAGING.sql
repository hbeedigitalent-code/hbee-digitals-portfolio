-- =====================================================================================================================
-- Rollback of scripts/admin-rls-01-portfolio-policies-forward-STAGING.sql.  STAGING ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Restores the policies and browser-role grants that the forward script captured in
--   public._backup_admin_rls_policies_20261109   and   public._backup_admin_rls_grants_20261109
-- It restores WHAT WAS THERE, not what the repository says should be there. If the pre-forward state was itself unsafe
-- (for example an unrestricted write policy), rolling back reinstates that unsafe state: that is what a faithful rollback is.
-- Only roll back if the forward script broke something (for example the public Work pages) and re-run the verifier after.
--
-- Refuses to run unless: the staging marker exists, both backup tables exist, and the backup holds policy rows for the
-- portfolio tables. It never drops the backup tables (remove them deliberately afterwards).
-- =====================================================================================================================

begin;

do $guard$
declare v_marker boolean := false; v_rows int;
begin
  if to_regclass('public._environment_marker') is not null then
    execute 'select exists (select 1 from public._environment_marker where env = ''staging'')' into v_marker;
  end if;
  if not v_marker then
    raise exception 'Refusing to run: no staging marker. This must never run against production.';
  end if;
  if to_regclass('public._backup_admin_rls_policies_20261109') is null or to_regclass('public._backup_admin_rls_grants_20261109') is null then
    raise exception 'Refusing to run: the backup tables from the forward script do not exist. There is nothing to restore from.';
  end if;
  select count(*) into v_rows from public._backup_admin_rls_policies_20261109 where tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities');
  if v_rows = 0 then
    raise exception 'Refusing to run: the backup holds no policy rows for the portfolio tables.';
  end if;
end $guard$;

-- 1. Remove every policy currently on the three portfolio tables, then recreate exactly the captured set.
do $restore$
declare
  p record;
  v_roles text;
  v_sql text;
begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;

  for p in select * from public._backup_admin_rls_policies_20261109 where tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities') order by tablename, policyname loop
    select string_agg(case when r = 'public' then 'public' else quote_ident(r) end, ', ') into v_roles from unnest(p.roles) as r;
    v_sql := format('create policy %I on public.%I as %s for %s to %s', p.policyname, p.tablename, lower(p.permissive), p.cmd, coalesce(v_roles, 'public'));
    if p.qual is not null then v_sql := v_sql || ' using (' || p.qual || ')'; end if;
    if p.with_check is not null then v_sql := v_sql || ' with check (' || p.with_check || ')'; end if;
    execute v_sql;
  end loop;
end $restore$;

-- 2. Restore browser-role grants for the three tables to the captured set.
do $grants$
declare g record; v_grantee text;
begin
  for g in select * from public._backup_admin_rls_grants_20261109 where grantee in ('anon', 'authenticated', 'PUBLIC') loop
    if to_regclass('public.' || g.table_name) is not null then
      v_grantee := case when g.grantee = 'PUBLIC' then 'public' else quote_ident(g.grantee) end;
      execute format('grant %s on public.%I to %s', g.privilege_type, g.table_name, v_grantee);
    end if;
  end loop;
end $grants$;

-- 3. Post-condition: the restored policy set matches the snapshot (names and commands) for each table.
do $post$
declare v_missing text;
begin
  select string_agg(b.tablename || '.' || b.policyname, ', ') into v_missing
  from public._backup_admin_rls_policies_20261109 b
  where b.tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities')
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = b.tablename and p.policyname = b.policyname and p.cmd = b.cmd);
  if v_missing is not null then
    raise exception 'Rollback post-condition failed: not restored: %', v_missing;
  end if;
end $post$;

commit;
-- The backup tables are left in place on purpose. Run scripts/admin-rls-00-policy-definitions-readonly.sql to confirm the state.
