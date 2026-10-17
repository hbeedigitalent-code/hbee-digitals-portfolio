-- READ ONLY. Prepared for owner review; NOT EXECUTED.
-- Run as the owner-reviewed inspection role. Role/schema metadata only, no keys.
-- Exact PK columns and types, including domains, base types and typmods.
select con.conname as pk_constraint, pg_get_constraintdef(con.oid) as pk_definition,
       k.ordinality, a.attname, format_type(a.atttypid,a.atttypmod) as exact_type,
       a.atttypmod, tn.nspname as type_schema, t.typname, t.typtype,
       case when t.typtype='d' then format_type(t.typbasetype,t.typtypmod) end as domain_base_type,
       t.typtypmod as domain_type_modifier
from pg_constraint con cross join lateral unnest(con.conkey) with ordinality k(attnum,ordinality)
join pg_attribute a on a.attrelid=con.conrelid and a.attnum=k.attnum
join pg_type t on t.oid=a.atttypid join pg_namespace tn on tn.oid=t.typnamespace
where con.conrelid=to_regclass('public.portfolio_items') and con.contype='p'
order by k.ordinality;
select a.attname, format_type(a.atttypid,a.atttypmod) as exact_type, a.atttypmod,
       t.typtype, tn.nspname as type_schema, t.typname,
       case when t.typtype='d' then format_type(t.typbasetype,t.typtypmod) end as domain_base_type,
       a.attnotnull, pg_get_expr(d.adbin,d.adrelid) as default_expression,
       col_description(a.attrelid,a.attnum) as description
from pg_attribute a join pg_type t on t.oid=a.atttypid join pg_namespace tn on tn.oid=t.typnamespace
left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
where a.attrelid=to_regclass('public.portfolio_items') and a.attname in ('id','gallery_images','creative_revision') and not a.attisdropped;

-- Existing object names, kinds, owners and RLS, including missing objects.
select wanted.name, c.relkind, pg_get_userbyid(c.relowner) as owner,
       c.relrowsecurity, c.relforcerowsecurity, c.relacl, obj_description(c.oid,'pg_class') as description
from (values ('portfolio_items'),('portfolio_media'),('portfolio_capabilities'),('admin_users')) wanted(name)
left join pg_namespace n on n.nspname='public' left join pg_class c on c.relnamespace=n.oid and c.relname=wanted.name;
select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies
where (schemaname='public' and tablename in ('portfolio_items','portfolio_media','portfolio_capabilities','admin_users')) or (schemaname='storage' and tablename='objects');

-- Raw + expanded ACLs include PUBLIC, unlike role_table_grants alone.
select c.relname, pg_get_userbyid(c.relowner) as owner,
       case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,
       x.privilege_type,x.is_grantable,
       case when c.relname in ('portfolio_media','portfolio_capabilities') and
         ((x.grantee=0 and x.privilege_type in ('INSERT','UPDATE','DELETE','TRUNCATE','TRIGGER','REFERENCES'))
          or (x.grantee=(select oid from pg_roles where rolname='anon') and x.privilege_type<>'SELECT')) then 'BLOCKER'
         when x.grantee not in (0,c.relowner) and pg_get_userbyid(x.grantee) not in ('anon','authenticated','service_role') then 'REVIEW UNEXPECTED ROLE' else 'REVIEW' end as assessment
from pg_class c join pg_namespace n on n.oid=c.relnamespace
cross join lateral aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x
where n.nspname='public' and c.relname in ('portfolio_items','portfolio_media','portfolio_capabilities','admin_users');
select c.relname,a.attname,a.attacl,case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,x.privilege_type,x.is_grantable
from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid
cross join lateral aclexplode(coalesce(a.attacl,'{}'::aclitem[])) x
where n.nspname='public' and c.relname in ('portfolio_items','portfolio_media','portfolio_capabilities') and a.attnum>0 and not a.attisdropped;
select c.relname,r.rolname,r.rolsuper,r.rolbypassrls,
       has_schema_privilege(r.oid,n.oid,'USAGE') as schema_usage,
       has_table_privilege(r.oid,c.oid,'SELECT') as can_select,
       has_table_privilege(r.oid,c.oid,'INSERT') as can_insert,
       has_table_privilege(r.oid,c.oid,'UPDATE') as can_update,
       has_table_privilege(r.oid,c.oid,'DELETE') as can_delete,
       has_any_column_privilege(r.oid,c.oid,'INSERT') as any_column_insert,
       has_any_column_privilege(r.oid,c.oid,'UPDATE') as any_column_update,
       case when r.rolname='anon' and (has_table_privilege(r.oid,c.oid,'INSERT,UPDATE,DELETE,TRUNCATE') or has_any_column_privilege(r.oid,c.oid,'INSERT,UPDATE')) then 'BLOCKER' else 'RLS MUST STILL BE TESTED' end as assessment
from pg_class c join pg_namespace n on n.oid=c.relnamespace cross join pg_roles r
where n.nspname='public' and c.relname in ('portfolio_media','portfolio_capabilities') and r.rolname in ('anon','authenticated','service_role');
select pg_get_userbyid(d.defaclrole) as owner,n.nspname,d.defaclobjtype,d.defaclacl,
       case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,x.privilege_type,x.is_grantable
from pg_default_acl d left join pg_namespace n on n.oid=d.defaclnamespace
cross join lateral aclexplode(d.defaclacl) x where d.defaclobjtype in ('r','f') and (d.defaclnamespace=0 or n.nspname='public');

-- Complete function signatures, actual owner, body, security mode, path and ACL.
select p.oid::regprocedure as signature,pg_get_userbyid(p.proowner) as owner,
       p.prosecdef as security_definer,p.proconfig as function_settings,p.proacl,
       pg_get_functiondef(p.oid) as definition,obj_description(p.oid,'pg_proc') as description
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and p.proname in ('save_portfolio_creative','bump_portfolio_creative_revision');
select p.oid::regprocedure as signature,
       case when x.grantee=0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,
       x.privilege_type,x.is_grantable,
       case when x.grantee=p.proowner then 'OWNER: VERIFY EXPECTED MIGRATION ROLE'
         when x.grantee=0 then 'BLOCKER'
         when p.oid=to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)') and pg_get_userbyid(x.grantee)='authenticated' and not x.is_grantable then 'EXPECTED'
         when p.oid=to_regprocedure('public.bump_portfolio_creative_revision()') and pg_get_userbyid(x.grantee) in ('authenticated','service_role') and not x.is_grantable then 'EXPECTED'
         else 'BLOCKER: UNEXPECTED RPC GRANT' end as assessment
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
cross join lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x
where n.nspname='public' and p.proname in ('save_portfolio_creative','bump_portfolio_creative_revision');
select p.oid::regprocedure as signature,r.rolname,has_function_privilege(r.oid,p.oid,'EXECUTE') as effective_execute,
       case when has_function_privilege(r.oid,p.oid,'EXECUTE') <>
         (p.oid=to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)') and r.rolname='authenticated'
          or p.oid=to_regprocedure('public.bump_portfolio_creative_revision()') and r.rolname in ('authenticated','service_role')) then 'BLOCKER: EFFECTIVE EXECUTE MISMATCH' else 'EXPECTED' end as assessment
from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_roles r
where n.nspname='public' and p.proname in ('save_portfolio_creative','bump_portfolio_creative_revision') and r.rolname in ('anon','authenticated','service_role');

select conrelid::regclass as relation,conname,contype,pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid in (to_regclass('public.portfolio_items'),to_regclass('public.portfolio_media'),to_regclass('public.portfolio_capabilities'));
select schemaname,tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename in ('portfolio_items','portfolio_media','portfolio_capabilities');
select t.tgrelid::regclass as relation,t.tgname,pg_get_triggerdef(t.oid) as definition,t.tgenabled
from pg_trigger t where not t.tgisinternal and t.tgrelid in (to_regclass('public.portfolio_media'),to_regclass('public.portfolio_capabilities'));
select id,name,public,file_size_limit,allowed_mime_types from storage.buckets where id='project-images';
select version(),to_regprocedure('pg_catalog.gen_random_uuid()') as uuid_generator;
-- ACLs alone cannot establish row access. authenticated CRUD grants are intended
-- ONLY with the reviewed active-admin RLS predicates. Flag extra policies too.
-- Post-migration structural expectations. Any false result blocks activation.
select expected.name,to_regclass('public.'||expected.name) is not null as table_exists,
       coalesce(c.relrowsecurity,false) as rls_enabled
from (values ('portfolio_media'),('portfolio_capabilities')) expected(name)
left join pg_class c on c.oid=to_regclass('public.'||expected.name);
select to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)') is not null as revision_checked_rpc_exists;
select wanted.name,to_regclass('public.'||wanted.name) is not null as index_exists
from (values ('portfolio_media_parent_order'),('portfolio_capabilities_slug_parent')) wanted(name);
select wanted.table_name,wanted.trigger_name,exists (
  select 1 from pg_trigger t where t.tgrelid=to_regclass('public.'||wanted.table_name)
    and t.tgname=wanted.trigger_name and t.tgenabled='O'
    and t.tgfoid=to_regprocedure('public.bump_portfolio_creative_revision()')
) as revision_trigger_enabled
from (values ('portfolio_media','portfolio_media_revision'),('portfolio_capabilities','portfolio_capabilities_revision')) wanted(table_name,trigger_name);
select tablename,policyname,case when policyname in ('portfolio_media_published','portfolio_media_admin','portfolio_capabilities_published','portfolio_capabilities_admin') then 'REVIEW PREDICATE' else 'BLOCKER: UNEXPECTED POLICY' end as assessment
from pg_policies where schemaname='public' and tablename in ('portfolio_media','portfolio_capabilities');
select p.oid::regprocedure,not p.prosecdef as security_invoker,
       'search_path=pg_catalog, public'=any(coalesce(p.proconfig,'{}'::text[])) as expected_search_path
from pg_proc p where p.oid in (to_regprocedure('public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean)'),to_regprocedure('public.bump_portfolio_creative_revision()'));
-- Compare every reported owner with the owner-approved migration role. Unexpected
-- owners, grants (including inherited effective grants), missing revision triggers,
-- extra permissive policies or incorrect definitions are BLOCKERS, not warnings.
-- In authorized STAGING test anon/non-admin/admin sessions, stale conflict (40001),
-- clear flags, direct child-write revision invalidation, parent cascade, atomic
-- failures, and application/access rollback. No SQL has been executed by Codex.
