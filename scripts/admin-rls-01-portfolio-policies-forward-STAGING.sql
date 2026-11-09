-- =====================================================================================================================
-- Admin RLS — portfolio write access = ACTIVE ADMIN ONLY.  STAGING ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Run ONLY after scripts/admin-rls-00-policy-definitions-readonly.sql, and ONLY if its output shows a write policy marked
-- "UNRESTRICTED WRITE" (or the owner wants the exact repo definitions re-asserted). If every write policy already reads
-- "ADMIN-CHECKED", this script changes nothing of substance (it re-creates the same policies) and is optional.
--
-- WHAT IT ESTABLISHES (and nothing else)
--   * portfolio_items, portfolio_media, portfolio_capabilities: the ONLY browser-role write policy on each is
--     "<table>_admin..." FOR ALL TO authenticated with
--         USING / WITH CHECK ( exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true) )
--     — the existing Admin identity model (admin_users). No new role system, no new function, no new table other than the
--     two backup tables below.
--   * public/anon published SELECT is NOT touched: "Public can view active portfolio items", portfolio_media_published and
--     portfolio_capabilities_published are left exactly as they are, so the public Work and Case Study pages keep working.
--   * service_role is not touched (it bypasses RLS; grants unchanged).
--   * Table grants are not widened. anon / PUBLIC INSERT/UPDATE/DELETE are revoked if present (they should not be).
--     Browser authenticated write GRANTS are deliberately kept: the Admin CMS pages still write directly until those writes
--     move behind /api/admin routes. The policy, not the grant, is what stops an ordinary signed-in user.
--
-- WHAT IT REFUSES TO DO
--   * run unless public._environment_marker holds env = 'staging' (production never carries it);
--   * silently drop a policy it does not recognise: if any OTHER write policy for anon/authenticated/public exists on these
--     tables it ABORTS and lists it, so a human decides;
--   * run twice: it refuses if its backup tables already exist (a stale backup must force a decision).
--
-- LIMIT: an active-admin check is not a 2FA check. RLS cannot see the 2FA cookie, so an active admin who has not completed
-- 2FA can still write directly from a browser until the writes are moved behind requireActiveAdmin() routes.
--
-- ROLLBACK: scripts/admin-rls-02-portfolio-policies-rollback-STAGING.sql restores the captured policies and grants.
-- VERIFY:   scripts/admin-rls-00-policy-definitions-readonly.sql (definitions) and
--           scripts/admin-rls-03-portfolio-behaviour-tests-STAGING.sql (ordinary user denied, admin allowed; self-rolling-back).
-- =====================================================================================================================

begin;

-- ── 1. Guards: staging marker, structure, known policy set, fresh backup names ──────────────────────────────────
do $guard$
declare
  v_tables text[] := array['portfolio_items', 'portfolio_media', 'portfolio_capabilities'];
  v_t text;
  v_unknown text;
  v_marker boolean := false;
begin
  if to_regclass('public._environment_marker') is not null then
    execute 'select exists (select 1 from public._environment_marker where env = ''staging'')' into v_marker;
  end if;
  if not v_marker then
    raise exception 'Refusing to run: no staging marker (public._environment_marker env = staging). This must never run against production.';
  end if;

  if to_regclass('public.admin_users') is null then
    raise exception 'Refusing to run: public.admin_users does not exist; the admin check cannot be built.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'user_id')
     or not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name = 'is_active') then
    raise exception 'Refusing to run: admin_users must have user_id and is_active columns.';
  end if;

  if to_regclass('public.portfolio_items') is null or to_regclass('public.portfolio_media') is null then
    raise exception 'Refusing to run: portfolio_items and portfolio_media must both exist.';
  end if;

  foreach v_t in array v_tables loop
    if to_regclass('public.' || v_t) is not null and not (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = v_t) then
      raise exception 'Refusing to run: RLS is OFF on public.%. Enable it deliberately first; this script does not.', v_t;
    end if;
  end loop;

  -- Any write policy for a browser role that is not one of the two we own is unknown: stop, do not drop it.
  select string_agg(tablename || '.' || policyname || ' [' || cmd || ' to ' || array_to_string(roles, ',') || ']', '; ')
    into v_unknown
  from pg_policies
  where schemaname = 'public'
    and tablename = any (v_tables)
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and roles::text ~ 'anon|authenticated|public'
    and policyname not in ('portfolio_items_admin_all', 'portfolio_media_admin', 'portfolio_capabilities_admin');
  if v_unknown is not null then
    raise exception 'Refusing to continue: unrecognised browser-role write policies exist: %. Review them; this script will not drop them.', v_unknown;
  end if;

  if to_regclass('public._backup_admin_rls_policies_20261109') is not null
     or to_regclass('public._backup_admin_rls_grants_20261109') is not null then
    raise exception 'Refusing to run: a backup table with this date already exists. Inspect it and remove it deliberately; it is never reused.';
  end if;
  -- Name must not collide with ANY relation kind.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname in ('_backup_admin_rls_policies_20261109', '_backup_admin_rls_grants_20261109')) then
    raise exception 'Refusing to run: a relation named like the backup already exists.';
  end if;
end $guard$;

-- ── 2. Capture the current state for rollback (policies and browser-role grants of the tables involved) ─────────
create table public._backup_admin_rls_policies_20261109 as
select now() as captured_at, schemaname, tablename, policyname, permissive, roles::text[] as roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities', 'admin_users');

create table public._backup_admin_rls_grants_20261109 as
select now() as captured_at, table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities')
  and grantee in ('anon', 'authenticated', 'PUBLIC');

revoke all on public._backup_admin_rls_policies_20261109, public._backup_admin_rls_grants_20261109 from public, anon, authenticated;

-- ── 3. Re-assert the admin-only write policies (same predicate the repository defines) ─────────────────────────
drop policy if exists portfolio_items_admin_all on public.portfolio_items;
create policy portfolio_items_admin_all on public.portfolio_items for all to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

drop policy if exists portfolio_media_admin on public.portfolio_media;
create policy portfolio_media_admin on public.portfolio_media for all to authenticated
  using (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true))
  with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true));

do $caps$
begin
  if to_regclass('public.portfolio_capabilities') is not null then
    execute 'drop policy if exists portfolio_capabilities_admin on public.portfolio_capabilities';
    execute 'create policy portfolio_capabilities_admin on public.portfolio_capabilities for all to authenticated
             using (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true))
             with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true))';
  end if;
end $caps$;

-- ── 4. anon / PUBLIC must never hold write privileges on these tables (no-op when already true) ────────────────
revoke insert, update, delete on public.portfolio_items from public, anon;
revoke insert, update, delete on public.portfolio_media from public, anon;
do $caps2$
begin
  if to_regclass('public.portfolio_capabilities') is not null then
    execute 'revoke insert, update, delete on public.portfolio_capabilities from public, anon';
  end if;
end $caps2$;

-- ── 5. Post-conditions: abort (and roll everything back) unless the result is exactly what was promised ────────
do $post$
declare
  v_open text;
  v_before int;
  v_after int;
begin
  -- every browser-role write policy now tests an active admin
  select string_agg(tablename || '.' || policyname, ', ') into v_open
  from pg_policies
  where schemaname = 'public'
    and tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities')
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and roles::text ~ 'anon|authenticated|public'
    and not ( coalesce(qual, '') ~* 'admin_users' and coalesce(qual, '') ~* 'is_active' and coalesce(qual, '') ~* 'auth\.uid'
          and coalesce(with_check, '') ~* 'admin_users' and coalesce(with_check, '') ~* 'is_active' and coalesce(with_check, '') ~* 'auth\.uid' );
  if v_open is not null then
    raise exception 'Post-condition failed: browser-role write policies without an admin check remain: %', v_open;
  end if;

  -- the published (read) policies were not touched: same count as the snapshot
  select count(*) into v_before from public._backup_admin_rls_policies_20261109 where cmd = 'SELECT' and tablename <> 'admin_users';
  select count(*) into v_after from pg_policies where schemaname = 'public' and tablename in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities') and cmd = 'SELECT';
  if v_before <> v_after then
    raise exception 'Post-condition failed: SELECT policy count changed (% before, % after). Public reads must be untouched.', v_before, v_after;
  end if;

  -- anon / PUBLIC hold no write privilege
  if exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name in ('portfolio_items', 'portfolio_media', 'portfolio_capabilities') and grantee in ('anon', 'PUBLIC') and privilege_type in ('INSERT', 'UPDATE', 'DELETE')) then
    raise exception 'Post-condition failed: anon or PUBLIC still holds a write privilege on a portfolio table.';
  end if;

  -- anon still has SELECT on the two public tables (public pages)
  if not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'portfolio_items' and grantee = 'anon' and privilege_type = 'SELECT') then
    raise exception 'Post-condition failed: anon lost SELECT on portfolio_items; the public Work pages would break.';
  end if;
end $post$;

commit;
-- After COMMIT: run scripts/admin-rls-00-policy-definitions-readonly.sql, then scripts/admin-rls-03-portfolio-behaviour-tests-STAGING.sql.
-- If the public Work or Case Study pages misbehave, run the rollback script immediately.
