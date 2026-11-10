-- =====================================================================================================================
-- ROLLBACK of scripts/prod-rls-01-forward-PRODUCTION.sql.  PRODUCTION.  DRAFT — NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- Restores EXACTLY what the forward migration changed, from public._hbee_a4_rls_backup (the copy of the policies and browser-role
-- grants taken inside the forward transaction before anything was dropped):
--   * drops the 7 replacement policies the forward created (each must still be the admin-only policy it created, or this aborts);
--   * recreates the 13 dropped policies with their original command, roles, permissive/restrictive flag, USING and WITH CHECK
--     text, taken from the backup — the unsafe originals come back unchanged, because that is what "restore" means;
--   * re-grants the anon / authenticated privileges that were revoked (with grant option where it was held);
--   * touches nothing else, and proves afterwards that the policy set and the anon / authenticated / PUBLIC / service_role grants
--     equal the backup exactly.
-- It aborts, changing nothing, if the backup is missing, if the current state is not "forward applied" (so it cannot be run twice or
-- against a different state), or if anything outside the migration's footprint has drifted.
--
-- The backup table is LEFT IN PLACE.  Drop it yourself, in a separate statement, once you will not need it again.
-- Put this line FIRST in the same run:   set hbee.confirm_production = 'yes';
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

create temp table _hbee_a4_new (tablename text primary key, policyname text not null unique) on commit drop;
insert into _hbee_a4_new values
  ('about_page', 'about_page_admin_all'), ('blog_categories', 'blog_categories_admin_all'),
  ('contact_submissions', 'contact_submissions_admin_all'), ('email_templates', 'email_templates_admin_all'),
  ('pricing_packages', 'pricing_packages_admin_all'), ('trust_section', 'trust_section_admin_all'),
  ('video_testimonials', 'video_testimonials_admin_all');

create temp table _hbee_a4_targets (tablename text not null, policyname text not null, primary key (tablename, policyname)) on commit drop;
insert into _hbee_a4_targets values
  ('about_page', 'Allow all operations for authenticated users'),
  ('blog_categories', 'Allow authenticated users to insert categories'), ('blog_categories', 'Allow authenticated users to update categories'),
  ('blog_categories', 'Authenticated users can manage categories'),
  ('contact_submissions', 'Allow authenticated admins to manage inquiries'), ('contact_submissions', 'Allow public contact form inserts'),
  ('email_templates', 'Allow authenticated manage email templates'), ('pricing_packages', 'Allow authenticated manage pricing'),
  ('subscribers', 'Public can unsubscribe'), ('trust_section', 'Allow authenticated manage trust section'),
  ('video_testimonials', 'Auth users can delete proofs'), ('video_testimonials', 'Auth users can insert proofs'),
  ('video_testimonials', 'Auth users can update proofs');

do $guard$
declare
  v_n bigint;
  v_txt text;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run to confirm this is the PRODUCTION project.';
  end if;
  if to_regclass('public._hbee_a4_rls_backup') is null then
    raise exception 'ABORT (nothing changed): public._hbee_a4_rls_backup does not exist — the forward migration was not applied, or its backup was dropped. Nothing to restore from.';
  end if;

  -- the backup holds all 13 targets and their original definitions
  select count(*) into v_n from public._hbee_a4_rls_backup b join _hbee_a4_targets t on t.tablename = b.tablename and t.policyname = b.policyname where b.kind = 'policy';
  if v_n <> 13 then raise exception 'ABORT (nothing changed): the backup holds % of the 13 target policies.', v_n; end if;

  -- the current state is "forward applied": no target present, every replacement present and still the admin-only policy
  select string_agg(t.tablename || '."' || t.policyname || '"', ', ') into v_txt
    from _hbee_a4_targets t join pg_policies p on p.schemaname = 'public' and p.tablename = t.tablename and p.policyname = t.policyname;
  if v_txt is not null then raise exception 'ABORT (nothing changed): target polic(ies) already exist (%). The state is not "forward applied".', v_txt; end if;
  select count(*) into v_n from _hbee_a4_new n join pg_policies p on p.schemaname = 'public' and p.tablename = n.tablename and p.policyname = n.policyname
   where p.cmd = 'ALL' and p.roles = array['authenticated']::name[] and p.qual ~* 'admin_users' and p.with_check ~* 'admin_users';
  if v_n <> 7 then raise exception 'ABORT (nothing changed): % of the 7 replacement policies are present and unchanged. Someone altered them; review by hand.', v_n; end if;

  -- nothing outside the footprint drifted: policies that are neither target nor replacement equal the backup
  select count(*) into v_n from (
    (select p.tablename, p.policyname, p.permissive, p.roles::text, p.cmd, coalesce(p.qual, '') q, coalesce(p.with_check, '') w
       from pg_policies p
      where p.schemaname = 'public' and p.tablename in (select distinct tablename from public._hbee_a4_rls_backup)
        and not exists (select 1 from _hbee_a4_new n where n.tablename = p.tablename and n.policyname = p.policyname)
     except
     select b.tablename, b.policyname, b.permissive, b.roles::text, b.cmd, coalesce(b.qual, ''), coalesce(b.with_check, '')
       from public._hbee_a4_rls_backup b where b.kind = 'policy')
    union all
    (select b.tablename, b.policyname, b.permissive, b.roles::text, b.cmd, coalesce(b.qual, ''), coalesce(b.with_check, '')
       from public._hbee_a4_rls_backup b where b.kind = 'policy'
        and not exists (select 1 from _hbee_a4_targets t where t.tablename = b.tablename and t.policyname = b.policyname)
     except
     select p.tablename, p.policyname, p.permissive, p.roles::text, p.cmd, coalesce(p.qual, ''), coalesce(p.with_check, '')
       from pg_policies p where p.schemaname = 'public' and p.tablename in (select distinct tablename from public._hbee_a4_rls_backup))
  ) d;
  if v_n <> 0 then raise exception 'ABORT (nothing changed): % polic(ies) outside the migration changed since it ran; rollback would not be exact. Review by hand.', v_n; end if;
end $guard$;

do $restore$
declare
  r record;
  v_roles text;
  v_sql text;
  v_priv text;
begin
  -- 1. remove the replacements
  for r in select * from _hbee_a4_new order by tablename loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;

  -- 2. recreate each original from the backup
  for r in select b.* from public._hbee_a4_rls_backup b join _hbee_a4_targets t on t.tablename = b.tablename and t.policyname = b.policyname
            where b.kind = 'policy' order by b.tablename, b.policyname loop
    select string_agg(case when x = 'public' then 'public' else quote_ident(x) end, ', ') into v_roles from unnest(r.roles) as x;
    v_sql := format('create policy %I on public.%I as %s for %s to %s', r.policyname, r.tablename, lower(r.permissive), lower(r.cmd), v_roles);
    if r.qual is not null then v_sql := v_sql || ' using (' || r.qual || ')'; end if;
    if r.with_check is not null then v_sql := v_sql || ' with check (' || r.with_check || ')'; end if;
    execute v_sql;
  end loop;

  -- 3. re-grant what was revoked (anon / authenticated only; grant option preserved)
  for r in select b.tablename, b.grantee, b.privilege, b.is_grantable
             from public._hbee_a4_rls_backup b
            where b.kind = 'table_grant' and b.grantee in ('anon', 'authenticated')
              and not exists (
                select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
                 where n.nspname = 'public' and c.relname = b.tablename and pg_get_userbyid(a.grantee) = b.grantee and a.privilege_type::text = b.privilege)
            order by b.tablename, b.grantee, b.privilege loop
    v_priv := r.privilege;
    execute format('grant %s on table public.%I to %I%s', v_priv, r.tablename, r.grantee, case when r.is_grantable then ' with grant option' else '' end);
  end loop;
end $restore$;

do $post$
declare
  v_n bigint;
  v_a text;
  v_b text;
begin
  -- policies equal the backup exactly
  select md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', p.tablename, p.policyname, p.permissive, p.roles::text, p.cmd, coalesce(p.qual, ''), coalesce(p.with_check, '')), E'\n' order by p.tablename, p.policyname)) into v_a
    from pg_policies p where p.schemaname = 'public' and p.tablename in (select distinct tablename from public._hbee_a4_rls_backup);
  select md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', b.tablename, b.policyname, b.permissive, b.roles::text, b.cmd, coalesce(b.qual, ''), coalesce(b.with_check, '')), E'\n' order by b.tablename, b.policyname)) into v_b
    from public._hbee_a4_rls_backup b where b.kind = 'policy';
  if v_a is distinct from v_b then raise exception 'Post-condition failed: policies do not equal the backup. Nothing is committed.'; end if;

  -- grants (anon / authenticated / PUBLIC / service_role) equal the backup exactly
  select md5(string_agg(c.relname || '|' || (case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end) || '|' || a.privilege_type::text || '|' || a.is_grantable::text, E'\n'
                        order by c.relname, (case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end), a.privilege_type::text)) into v_a
    from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname in (select distinct tablename from public._hbee_a4_rls_backup)
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'));
  select md5(string_agg(b.tablename || '|' || b.grantee || '|' || b.privilege || '|' || b.is_grantable::text, E'\n' order by b.tablename, b.grantee, b.privilege)) into v_b
    from public._hbee_a4_rls_backup b where b.kind = 'table_grant';
  if v_a is distinct from v_b then raise exception 'Post-condition failed: grants do not equal the backup. Nothing is committed.'; end if;

  select count(*) into v_n from pg_policies p join _hbee_a4_new n on n.tablename = p.tablename and n.policyname = p.policyname where p.schemaname = 'public';
  if v_n <> 0 then raise exception 'Post-condition failed: a replacement policy still exists.'; end if;
end $post$;

commit;
-- Then run scripts/prod-rls-03-verify-readonly.sql: it will report the pre-migration (unsafe) state again, by design.
