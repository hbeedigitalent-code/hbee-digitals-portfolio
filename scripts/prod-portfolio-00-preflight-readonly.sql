-- =====================================================================================================================
-- Portfolio CMS + Case Studies: READ-ONLY PREFLIGHT for the production forward migration.  NOT EXECUTED.
--
-- One statement, one JSON cell ("portfolio_preflight"). Catalog reads plus ONE count of active admin rows (no identities, no
-- project content). It changes nothing and shows no secret.
--
-- Run it BEFORE scripts/prod-portfolio-02-forward-PRODUCTION.sql and send the cell back. The forward applies exactly these conditions
-- and aborts, changing nothing, if one fails; this script lets you see them first.
--
--   blockers      every entry means the forward WILL abort. Empty = nothing blocks it.
--   review        things to read, not blocking
--   ready_for_forward   true only when blockers is empty
--   portfolio_items     shape, RLS, grants and policies of the parent table (the forward does not change any of them)
--   expected_absent     the objects the forward creates; all must be absent (first apply only)
--
-- Expected production shape (from the earlier read-only discovery): portfolio_items.id uuid, RLS on; anon SELECT; authenticated
-- SELECT/INSERT/UPDATE/DELETE; a public read policy for active rows and one admin policy. This script checks it, it does not assume it.
-- =====================================================================================================================

with
pf as (select 'public.portfolio_items'::regclass as oid where to_regclass('public.portfolio_items') is not null),
new_cols(col) as (values ('creative_revision'), ('engagement_type'), ('project_status'), ('is_case_study')),
pol as (
  select p.policyname, p.permissive, p.roles::text as roles, p.cmd, p.qual, p.with_check,
         case when p.cmd = 'SELECT' then 'read'
              when (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'admin_users' then 'write: admin-checked'
              when p.roles && array['public', 'anon', 'authenticated']::name[] then 'write: NOT admin-checked'
              else 'write: other roles' end as class
    from pg_policies p where p.schemaname = 'public' and p.tablename = 'portfolio_items'
),
absent as (
  select 'table ' || r as obj from unnest(array['portfolio_media', 'portfolio_capabilities']) r where to_regclass('public.' || r) is not null
  union all
  select 'column portfolio_items.' || a.attname from pg_attribute a, pf where a.attrelid = pf.oid and not a.attisdropped and a.attname in (select col from new_cols)
  union all
  select 'function ' || p.oid::regprocedure::text from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('save_portfolio_creative', 'bump_portfolio_creative_revision')
),
checks(severity, finding) as (
  select 'blocker', 'public.portfolio_items does not exist' where not exists (select 1 from pf)
  union all select 'blocker', 'RLS is not enabled on portfolio_items' from pf where not exists (select 1 from pg_class c where c.oid = pf.oid and c.relrowsecurity)
  union all select 'blocker', 'portfolio_items.id is ' || coalesce(format_type(a.atttypid, a.atttypmod), 'missing') || ' (uuid expected)'
    from pf left join pg_attribute a on a.attrelid = pf.oid and a.attname = 'id' and not a.attisdropped where coalesce(format_type(a.atttypid, a.atttypmod), '') <> 'uuid'
  union all select 'blocker', 'not a first apply, already present: ' || obj from absent
  union all select 'blocker', 'public.admin_users does not exist' where to_regclass('public.admin_users') is null
  union all select 'blocker', 'admin_users has no select-own policy (qual using auth.uid())'
    where to_regclass('public.admin_users') is not null and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = 'admin_users' and p.cmd in ('SELECT', 'ALL') and p.qual ~* 'auth\.uid\(\)')
  union all select 'blocker', 'no active admin row exists'
    where to_regclass('public.admin_users') is not null and (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.admin_users where is_active = true', false, true, '')))[1]::text::int = 0
  union all select 'blocker', 'anon holds a write/dangerous privilege on portfolio_items' from pf where has_table_privilege('anon', pf.oid, 'INSERT,UPDATE,DELETE,TRUNCATE,TRIGGER,REFERENCES')
  union all select 'blocker', 'authenticated holds TRUNCATE/TRIGGER/REFERENCES on portfolio_items' from pf where has_table_privilege('authenticated', pf.oid, 'TRUNCATE,TRIGGER,REFERENCES')
  union all select 'blocker', 'browser-reachable write policy without an admin check: ' || policyname from pol where class = 'write: NOT admin-checked' and permissive = 'PERMISSIVE'
  union all select 'blocker', 'no admin UPDATE policy on portfolio_items (the save RPC runs with the caller''s rights)'
    from pf where not exists (select 1 from pol where class = 'write: admin-checked' and cmd in ('ALL', 'UPDATE') and roles ~ 'authenticated')
  union all select 'review', 'no public read policy for portfolio_items' from pf where not exists (select 1 from pol where cmd in ('SELECT', 'ALL') and roles ~ '(public|anon)')
  union all select 'review', 'anon cannot SELECT portfolio_items (public pages would not render)' from pf where not has_table_privilege('anon', pf.oid, 'SELECT')
  union all select 'review', 'storage bucket project-images is missing (admin uploads use it)'
    where to_regclass('storage.buckets') is not null and not exists (select 1 from storage.buckets where id = 'project-images')
  union all select 'review', 'storage bucket project-images is not public (uploaded media URLs would not load)'
    where to_regclass('storage.buckets') is not null and exists (select 1 from storage.buckets where id = 'project-images' and not public)
  union all select 'review', 'portfolio_items has write-capable policies for roles other than public/anon/authenticated: ' || policyname from pol where class = 'write: other roles'
)
select jsonb_pretty(jsonb_build_object(
  'server_version', current_setting('server_version'),
  'current_role', current_user,
  'ready_for_forward', not exists (select 1 from checks where severity = 'blocker'),
  'blockers', (select coalesce(jsonb_agg(finding order by finding), '[]'::jsonb) from checks where severity = 'blocker'),
  'review', (select coalesce(jsonb_agg(finding order by finding), '[]'::jsonb) from checks where severity = 'review'),
  'expected_absent', jsonb_build_object('conflicts', (select coalesce(jsonb_agg(obj order by obj), '[]'::jsonb) from absent)),
  'portfolio_items', (select jsonb_build_object(
      'exists', true,
      'owner', pg_get_userbyid(c.relowner),
      'rls_enabled', c.relrowsecurity, 'rls_forced', c.relforcerowsecurity,
      'column_count', (select count(*) from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
      'acl_raw', c.relacl::text,
      'anon', jsonb_build_object('select', has_table_privilege('anon', c.oid, 'SELECT'), 'insert', has_table_privilege('anon', c.oid, 'INSERT'), 'update', has_table_privilege('anon', c.oid, 'UPDATE'), 'delete', has_table_privilege('anon', c.oid, 'DELETE'), 'truncate', has_table_privilege('anon', c.oid, 'TRUNCATE')),
      'authenticated', jsonb_build_object('select', has_table_privilege('authenticated', c.oid, 'SELECT'), 'insert', has_table_privilege('authenticated', c.oid, 'INSERT'), 'update', has_table_privilege('authenticated', c.oid, 'UPDATE'), 'delete', has_table_privilege('authenticated', c.oid, 'DELETE'), 'truncate', has_table_privilege('authenticated', c.oid, 'TRUNCATE'), 'trigger', has_table_privilege('authenticated', c.oid, 'TRIGGER'), 'references', has_table_privilege('authenticated', c.oid, 'REFERENCES')),
      'policies', (select coalesce(jsonb_agg(to_jsonb(pol) order by policyname), '[]'::jsonb) from pol),
      'triggers', (select coalesce(jsonb_agg(t.tgname order by t.tgname), '[]'::jsonb) from pg_trigger t where t.tgrelid = c.oid and not t.tgisinternal),
      'dependent_views', (select coalesce(jsonb_agg(distinct v.relname), '[]'::jsonb) from pg_depend d join pg_rewrite rw on rw.oid = d.objid join pg_class v on v.oid = rw.ev_class where d.refobjid = c.oid and v.relkind in ('v', 'm') and v.oid <> c.oid)
    ) from pg_class c, pf where c.oid = pf.oid),
  'admin_users', (select jsonb_build_object('exists', true, 'rls_enabled', c.relrowsecurity,
      'policies', (select coalesce(jsonb_agg(jsonb_build_object('name', p.policyname, 'cmd', p.cmd, 'roles', p.roles::text, 'using', p.qual) order by p.policyname), '[]'::jsonb) from pg_policies p where p.schemaname = 'public' and p.tablename = 'admin_users'))
    from pg_class c where c.oid = to_regclass('public.admin_users')),
  'storage_project_images', (select to_jsonb(b) from (select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'project-images') b),
  'default_acl_note', 'New tables inherit default privileges from the creating role, and the forward revokes anon/authenticated/PUBLIC on the new tables before granting the minimum.'
)) as portfolio_preflight;
