-- =============================================================================
-- AUDIT 01 — Read-only schema and security inspection
-- Hbee Growth OS · Phase 02, Task 1
--
-- Run in: Supabase Dashboard -> SQL Editor (production project).
--
-- THIS SCRIPT IS STRICTLY READ-ONLY.
-- It contains only SELECT statements. There is no CREATE, ALTER, DROP, INSERT,
-- UPDATE, DELETE, GRANT or REVOKE anywhere in this file. It cannot modify
-- schema, data, policies or grants. It is safe to run on production and safe to
-- re-run any number of times.
--
-- HOW TO USE
-- The Supabase SQL Editor returns only the LAST result set when several
-- statements are run together. So each SECTION below is written to be run on
-- its own: select the section's query, run it, read the output.
--
-- If you would rather do it in one pass, skip to SECTION 11 at the bottom —
-- it returns the entire audit as a single JSON document that can be copied out
-- whole and handed back for analysis.
--
-- RLS FLAGS come from pg_class / pg_namespace (relrowsecurity,
-- relforcerowsecurity). They are deliberately NOT read from pg_tables, which
-- does not expose those columns.
-- =============================================================================


-- -----------------------------------------------------------------------------
-- SECTION 1 — Tables, RLS enabled/forced, size, row estimate
-- The core inventory. `rls_enabled = false` on a table holding client data is a
-- finding. So is `rls_enabled = true` with zero policies (see SECTION 10).
-- -----------------------------------------------------------------------------
select c.relname                                  as table_name,
       c.relrowsecurity                           as rls_enabled,
       c.relforcerowsecurity                      as rls_forced,
       (select count(*) from pg_policies p
         where p.schemaname = 'public'
           and p.tablename  = c.relname)          as policy_count,
       c.reltuples::bigint                        as estimated_rows,
       pg_size_pretty(pg_total_relation_size(c.oid)) as total_size
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname  = 'public'
and    c.relkind  = 'r'
order  by c.relrowsecurity asc, c.relname;


-- -----------------------------------------------------------------------------
-- SECTION 2 — Columns
-- -----------------------------------------------------------------------------
select c.table_name,
       c.ordinal_position       as pos,
       c.column_name,
       c.data_type,
       c.character_maximum_length as max_len,
       c.is_nullable,
       c.column_default
from   information_schema.columns c
join   pg_class     pc on pc.relname = c.table_name
join   pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = 'public'
where  c.table_schema = 'public'
and    pc.relkind = 'r'
order  by c.table_name, c.ordinal_position;


-- -----------------------------------------------------------------------------
-- SECTION 3 — Primary keys and unique constraints
-- -----------------------------------------------------------------------------
select con.conrelid::regclass::text as table_name,
       con.conname                  as constraint_name,
       case con.contype
         when 'p' then 'PRIMARY KEY'
         when 'u' then 'UNIQUE'
       end                          as constraint_type,
       pg_get_constraintdef(con.oid) as definition
from   pg_constraint con
join   pg_class      c on c.oid = con.conrelid
join   pg_namespace  n on n.oid = c.relnamespace
where  n.nspname = 'public'
and    con.contype in ('p', 'u')
order  by table_name, constraint_type, constraint_name;


-- -----------------------------------------------------------------------------
-- SECTION 4 — Foreign keys (relationships)
-- Includes ON DELETE / ON UPDATE behaviour, which matters for cascade safety.
-- -----------------------------------------------------------------------------
select con.conrelid::regclass::text  as from_table,
       con.confrelid::regclass::text as to_table,
       con.conname                   as constraint_name,
       pg_get_constraintdef(con.oid) as definition,
       case con.confdeltype
         when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
         when 'c' then 'CASCADE'   when 'n' then 'SET NULL'
         when 'd' then 'SET DEFAULT'
       end                           as on_delete,
       case con.confupdtype
         when 'a' then 'NO ACTION' when 'r' then 'RESTRICT'
         when 'c' then 'CASCADE'   when 'n' then 'SET NULL'
         when 'd' then 'SET DEFAULT'
       end                           as on_update
from   pg_constraint con
join   pg_class      c on c.oid = con.conrelid
join   pg_namespace  n on n.oid = c.relnamespace
where  n.nspname = 'public'
and    con.contype = 'f'
order  by from_table, to_table, constraint_name;


-- -----------------------------------------------------------------------------
-- SECTION 5 — RLS policies, in full
-- `qual` is the USING clause, `with_check` the WITH CHECK clause.
-- A policy whose qual is `true` grants unrestricted access for that command.
-- -----------------------------------------------------------------------------
select tablename,
       policyname,
       permissive,
       roles,
       cmd,
       qual,
       with_check
from   pg_policies
where  schemaname = 'public'
order  by tablename, cmd, policyname;


-- -----------------------------------------------------------------------------
-- SECTION 6 — Functions
-- SECURITY DEFINER functions run as their owner and BYPASS RLS. Each one is a
-- deliberate privilege escalation and must be justified. Check `config` for a
-- pinned `search_path` — a SECURITY DEFINER function without one is a known
-- privilege-escalation hazard.
-- -----------------------------------------------------------------------------
select p.proname                      as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments,
       pg_get_function_result(p.oid)  as returns,
       case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end as security,
       case p.provolatile when 'i' then 'IMMUTABLE' when 's' then 'STABLE'
                          when 'v' then 'VOLATILE' end as volatility,
       p.proconfig                    as config,
       pg_get_userbyid(p.proowner)    as owner
from   pg_proc p
join   pg_namespace n on n.oid = p.pronamespace
where  n.nspname = 'public'
order  by p.prosecdef desc, p.proname;


-- -----------------------------------------------------------------------------
-- SECTION 7 — Triggers
-- -----------------------------------------------------------------------------
select c.relname        as table_name,
       t.tgname         as trigger_name,
       case when t.tgenabled = 'D' then 'DISABLED' else 'enabled' end as status,
       pg_get_triggerdef(t.oid) as definition
from   pg_trigger t
join   pg_class     c on c.oid = t.tgrelid
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
and    not t.tgisinternal
order  by c.relname, t.tgname;


-- -----------------------------------------------------------------------------
-- SECTION 8 — Indexes
-- -----------------------------------------------------------------------------
select tablename, indexname, indexdef
from   pg_indexes
where  schemaname = 'public'
order  by tablename, indexname;


-- -----------------------------------------------------------------------------
-- SECTION 9 — Table grants held by anon / authenticated
-- RLS is only half the story. A table with RLS enabled but a table-level GRANT
-- to `anon` is still reachable by the public API; conversely revoking grants is
-- how admin_2fa was locked down. Anything granted to `anon` deserves scrutiny.
-- -----------------------------------------------------------------------------
select table_name,
       grantee,
       string_agg(distinct privilege_type, ', ' order by privilege_type) as privileges
from   information_schema.role_table_grants
where  table_schema = 'public'
and    grantee in ('anon', 'authenticated', 'PUBLIC')
group  by table_name, grantee
order  by case grantee when 'anon' then 1 when 'PUBLIC' then 2 else 3 end,
          table_name;


-- -----------------------------------------------------------------------------
-- SECTION 10 — THE FINDINGS QUERY
-- Flags the two dangerous states directly. Read this one first.
--
--   EXPOSED        — RLS disabled. Row access is controlled only by grants.
--   LOCKED_OUT     — RLS enabled but no policies at all. Nothing can read it
--                    through the public API; intentional for admin_2fa, a bug
--                    anywhere else.
--   ANON_READABLE  — RLS disabled AND anon holds SELECT. Publicly readable.
-- -----------------------------------------------------------------------------
select c.relname as table_name,
       case
         when not c.relrowsecurity and exists (
              select 1 from information_schema.role_table_grants g
              where g.table_schema = 'public' and g.table_name = c.relname
                and g.grantee = 'anon' and g.privilege_type = 'SELECT')
           then 'ANON_READABLE'
         when not c.relrowsecurity then 'EXPOSED'
         when c.relrowsecurity and (
              select count(*) from pg_policies p
              where p.schemaname = 'public' and p.tablename = c.relname) = 0
           then 'LOCKED_OUT'
         else 'ok'
       end as finding,
       c.relrowsecurity as rls_enabled,
       (select count(*) from pg_policies p
         where p.schemaname = 'public' and p.tablename = c.relname) as policy_count
from   pg_class c
join   pg_namespace n on n.oid = c.relnamespace
where  n.nspname = 'public'
and    c.relkind = 'r'
and    (
     not c.relrowsecurity
  or (select count(*) from pg_policies p
       where p.schemaname = 'public' and p.tablename = c.relname) = 0
)
order  by 2, 1;


-- -----------------------------------------------------------------------------
-- SECTION 11 — ONE-SHOT JSON EXPORT
-- Returns the whole audit as a single jsonb value in one row/one column.
-- Run this alone, click the cell, copy the JSON out, and hand it back for
-- analysis. Still read-only.
-- -----------------------------------------------------------------------------
select jsonb_pretty(jsonb_build_object(
  'generated_at', now(),
  'database',     current_database(),

  'tables', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table',         c.relname,
             'rls_enabled',   c.relrowsecurity,
             'rls_forced',    c.relforcerowsecurity,
             'policy_count',  (select count(*) from pg_policies p
                                where p.schemaname='public' and p.tablename=c.relname),
             'estimated_rows',c.reltuples::bigint
           ) order by c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r'
  ),

  'columns', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table',    col.table_name,
             'column',   col.column_name,
             'type',     col.data_type,
             'nullable', col.is_nullable,
             'default',  col.column_default
           ) order by col.table_name, col.ordinal_position), '[]'::jsonb)
    from information_schema.columns col
    join pg_class pc on pc.relname = col.table_name
    join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname='public'
    where col.table_schema='public' and pc.relkind='r'
  ),

  'foreign_keys', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'from',       con.conrelid::regclass::text,
             'to',         con.confrelid::regclass::text,
             'definition', pg_get_constraintdef(con.oid)
           ) order by con.conrelid::regclass::text), '[]'::jsonb)
    from pg_constraint con
    join pg_class c on c.oid=con.conrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and con.contype='f'
  ),

  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table',      tablename,
             'policy',     policyname,
             'permissive', permissive,
             'roles',      roles,
             'cmd',        cmd,
             'using',      qual,
             'with_check', with_check
           ) order by tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname='public'
  ),

  'functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'name',      p.proname,
             'args',      pg_get_function_identity_arguments(p.oid),
             'returns',   pg_get_function_result(p.oid),
             'security',  case when p.prosecdef then 'DEFINER' else 'INVOKER' end,
             'config',    p.proconfig
           ) order by p.proname), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
  ),

  'triggers', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table',      c.relname,
             'trigger',    t.tgname,
             'enabled',    t.tgenabled <> 'D',
             'definition', pg_get_triggerdef(t.oid)
           ) order by c.relname, t.tgname), '[]'::jsonb)
    from pg_trigger t
    join pg_class c on c.oid=t.tgrelid
    join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and not t.tgisinternal
  ),

  'grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
             'table',   table_name,
             'grantee', grantee,
             'privilege', privilege_type
           ) order by table_name, grantee), '[]'::jsonb)
    from information_schema.role_table_grants
    where table_schema='public' and grantee in ('anon','authenticated','PUBLIC')
  )
)) as audit_json;
