-- =====================================================================================================================
-- Portfolio CMS + Case Studies: READ-ONLY VERIFIER for the target schema and policy state.  NOT EXECUTED.
--
-- One statement, one JSON cell ("portfolio_verification"). Catalog reads plus structural COUNTS of portfolio_items (no project
-- content, no ids, no identities). Run it BEFORE the forward (it reports "not applied", problems > 0 is expected) and AFTER it
-- (problems must be 0). Do not enable NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED until it reports 0 problems.
--
--   problems            list of findings; empty after a correct forward
--   problem_count       must be 0 after the forward
--   parent_columns      the four new portfolio_items columns: type, nullability, default
--   classification      counts only: how many rows are client / ongoing / Case Study (all 0 straight after the forward; they
--                       change only when an editor deliberately classifies a project)
--   child_tables        portfolio_media / portfolio_capabilities: RLS, row counts, effective privileges per role
--   policies            every policy on the two new tables with class
--   functions           signatures, security mode, search_path and effective EXECUTE per role
--   portfolio_items     its policies and grants as they are now (the forward must not have changed them)
-- =====================================================================================================================

with
cols(col, typ, dflt) as (values ('creative_revision', 'bigint', '0'), ('engagement_type', 'text', '''studio_team''::text'), ('project_status', 'text', '''completed''::text'), ('is_case_study', 'boolean', 'false')),
colstate as (
  select c.col, c.typ, c.dflt, format_type(a.atttypid, a.atttypmod) as actual_type, a.attnotnull as not_null, pg_get_expr(d.adbin, d.adrelid) as actual_default
    from cols c
    left join pg_attribute a on a.attrelid = to_regclass('public.portfolio_items') and a.attname = c.col and not a.attisdropped
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
),
tabs(t) as (values ('portfolio_media'), ('portfolio_capabilities')),
pol as (
  select p.tablename, p.policyname, p.permissive, p.roles::text as roles, p.cmd, p.qual, p.with_check,
         case when p.cmd = 'SELECT' then 'read'
              when (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'admin_users' and (coalesce(p.qual, '') || ' ' || coalesce(p.with_check, '')) ~* 'is_active' then 'write: active-admin'
              else 'write: NOT admin-checked' end as class
    from pg_policies p where p.schemaname = 'public' and p.tablename in ('portfolio_media', 'portfolio_capabilities')
),
priv as (
  select t.t, r.rolname,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'SELECT') as sel,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'INSERT') as ins,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'UPDATE') as upd,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'DELETE') as del,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'TRUNCATE') as trunc,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'TRIGGER') as trig,
         has_table_privilege(r.rolname, to_regclass('public.' || t.t), 'REFERENCES') as refs
    from tabs t cross join (values ('anon'), ('authenticated')) r(rolname)
   where to_regclass('public.' || t.t) is not null
),
fn as (
  select p.oid, p.oid::regprocedure::text as signature, p.prosecdef, p.proconfig::text as config,
         has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec, has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
    from pg_proc p where p.pronamespace = 'public'::regnamespace and p.proname in ('save_portfolio_creative', 'bump_portfolio_creative_revision')
),
problems(finding) as (
  select 'portfolio_items.' || s.col || ' is missing, nullable or has the wrong type (' || coalesce(s.actual_type, 'absent') || ')' from colstate s where s.actual_type is distinct from s.typ or s.not_null is not true
  union all select 'portfolio_items.' || s.col || ' default is ' || coalesce(s.actual_default, 'none') || ', expected ' || s.dflt from colstate s where s.actual_type is not null and s.actual_default is distinct from s.dflt
  union all select 'missing table ' || t.t from tabs t where to_regclass('public.' || t.t) is null
  union all select 'RLS is off on ' || t.t from tabs t where to_regclass('public.' || t.t) is not null and not (select relrowsecurity from pg_class where oid = to_regclass('public.' || t.t))
  union all select 'missing constraint ' || w.name from (values ('portfolio_media', 'portfolio_media_kind_valid'), ('portfolio_media', 'portfolio_media_text_lengths'), ('portfolio_media', 'portfolio_media_video_url_safe'), ('portfolio_media', 'portfolio_media_captions_url_safe'), ('portfolio_media', 'portfolio_media_kind_shape'), ('portfolio_items', 'portfolio_creative_revision_nonnegative'), ('portfolio_items', 'portfolio_engagement_type_valid'), ('portfolio_items', 'portfolio_project_status_valid')) w(tbl, name)
    where to_regclass('public.' || w.tbl) is null or not exists (select 1 from pg_constraint where conrelid = to_regclass('public.' || w.tbl) and conname = w.name)
  union all select 'missing index ' || w.name from (values ('portfolio_media_parent_order'), ('portfolio_capabilities_slug_parent')) w(name) where not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = w.name)
  union all select 'revision trigger missing or disabled: ' || w.name from (values ('portfolio_media_revision'), ('portfolio_capabilities_revision')) w(name)
    where not exists (select 1 from pg_trigger t where not t.tgisinternal and t.tgname = w.name and t.tgenabled = 'O' and t.tgfoid = to_regprocedure('public.bump_portfolio_creative_revision()'))
  union all select 'expected 4 policies on the new tables, found ' || (select count(*) from pol) where (select count(*) from pol) <> 4
  union all select 'policy not admin-checked: ' || tablename || '.' || policyname from pol where class = 'write: NOT admin-checked'
  union all select 'missing active-admin write policy on ' || t.t from tabs t where not exists (select 1 from pol where pol.tablename = t.t and pol.cmd = 'ALL' and pol.class = 'write: active-admin' and pol.roles = '{authenticated}')
  union all select 'missing public read policy on ' || t.t from tabs t where not exists (select 1 from pol where pol.tablename = t.t and pol.cmd = 'SELECT')
  union all select 'anon can do more than SELECT on ' || t || ' (insert/update/delete/truncate/trigger/references)' from priv where rolname = 'anon' and (ins or upd or del or trunc or trig or refs)
  union all select 'anon cannot SELECT ' || t from priv where rolname = 'anon' and not sel
  union all select 'authenticated lacks SELECT/INSERT/UPDATE/DELETE on ' || t from priv where rolname = 'authenticated' and not (sel and ins and upd and del)
  union all select 'authenticated holds TRUNCATE/TRIGGER/REFERENCES on ' || t from priv where rolname = 'authenticated' and (trunc or trig or refs)
  union all select 'PUBLIC holds a privilege on ' || t.t from tabs t where to_regclass('public.' || t.t) is not null and exists (select 1 from pg_class c, lateral aclexplode(c.relacl) a where c.oid = to_regclass('public.' || t.t) and a.grantee = 0)
  union all select 'save_portfolio_creative is missing' where to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)') is null
  union all select 'function is SECURITY DEFINER or lacks a fixed search_path: ' || signature from fn where prosecdef or config !~ 'search_path'
  union all select 'anon can execute ' || signature from fn where anon_exec
  union all select 'authenticated cannot execute save_portfolio_creative' from fn where signature like 'save_portfolio_creative%' and not auth_exec
  union all select 'PUBLIC can execute ' || p.oid::regprocedure::text from pg_proc p, lateral aclexplode(p.proacl) a where p.pronamespace = 'public'::regnamespace and p.proname in ('save_portfolio_creative', 'bump_portfolio_creative_revision') and a.grantee = 0
  union all select 'portfolio_items browser write policy without admin check: ' || policyname from pg_policies where schemaname = 'public' and tablename = 'portfolio_items' and permissive = 'PERMISSIVE' and cmd in ('ALL', 'INSERT', 'UPDATE', 'DELETE') and roles && array['public', 'anon', 'authenticated']::name[] and (coalesce(qual, '') || ' ' || coalesce(with_check, '')) !~* 'admin_users'
),
cls as (
  select case when (select count(*) from colstate where actual_type is null) = 0 then
           (xpath('/row/c/text()', query_to_xml('select count(*) filter (where engagement_type = ''client'') as c from public.portfolio_items', false, true, '')))[1]::text::int end as client_rows,
         case when (select count(*) from colstate where actual_type is null) = 0 then
           (xpath('/row/c/text()', query_to_xml('select count(*) filter (where project_status = ''ongoing'') as c from public.portfolio_items', false, true, '')))[1]::text::int end as ongoing_rows,
         case when (select count(*) from colstate where actual_type is null) = 0 then
           (xpath('/row/c/text()', query_to_xml('select count(*) filter (where is_case_study) as c from public.portfolio_items', false, true, '')))[1]::text::int end as case_study_rows,
         case when (select count(*) from colstate where actual_type is null) = 0 then
           (xpath('/row/c/text()', query_to_xml('select count(*) filter (where creative_revision <> 0) as c from public.portfolio_items', false, true, '')))[1]::text::int end as revised_rows
)
select jsonb_pretty(jsonb_build_object(
  'problem_count', (select count(*) from problems),
  'problems', (select coalesce(jsonb_agg(finding order by finding), '[]'::jsonb) from problems),
  'parent_columns', (select jsonb_agg(to_jsonb(s) order by s.col) from colstate s),
  'classification', (select to_jsonb(cls) from cls),
  'child_tables', (select jsonb_agg(jsonb_build_object('table', t.t, 'exists', to_regclass('public.' || t.t) is not null,
        'rls_enabled', (select relrowsecurity from pg_class where oid = to_regclass('public.' || t.t)),
        'rows', case when to_regclass('public.' || t.t) is not null then (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.' || t.t, false, true, '')))[1]::text::int end,
        'privileges', (select coalesce(jsonb_agg(to_jsonb(p) - 't'), '[]'::jsonb) from priv p where p.t = t.t)) order by t.t) from tabs t),
  'policies', (select coalesce(jsonb_agg(to_jsonb(pol) order by tablename, policyname), '[]'::jsonb) from pol),
  'functions', (select coalesce(jsonb_agg(to_jsonb(fn) - 'oid' order by signature), '[]'::jsonb) from fn),
  'portfolio_items', jsonb_build_object(
    'policies', (select coalesce(jsonb_agg(jsonb_build_object('name', policyname, 'cmd', cmd, 'roles', roles::text, 'using', qual, 'with_check', with_check) order by policyname), '[]'::jsonb) from pg_policies where schemaname = 'public' and tablename = 'portfolio_items'),
    'acl_raw', (select relacl::text from pg_class where oid = to_regclass('public.portfolio_items')))
)) as portfolio_verification;
