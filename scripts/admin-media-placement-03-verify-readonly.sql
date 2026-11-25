-- =====================================================================================================================
-- Media placements -- POST-RUN VERIFIER.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- ONE statement, ONE result set. Catalog metadata only. COLUMNS: ord | check_name | actual | verdict (PASS | FAIL).
-- =====================================================================================================================

with
t as (select to_regclass('public.media_placements') as oid),
f as (select p.* from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname = 'get_media_showcase'),
checks(ord, check_name, actual, verdict) as (

  select 10, 'table exists and is owned by this migration',
         coalesce((select obj_description(t.oid, 'pg_class') from t), 'missing'),
         case when (select obj_description(t.oid, 'pg_class') from t) = 'Hbee media placements v1' then 'PASS' else 'FAIL' end

  union all
  select 11, 'row level security enabled',
         coalesce((select c.relrowsecurity::text from pg_class c, t where c.oid = t.oid), 'n/a'),
         case when coalesce((select c.relrowsecurity from pg_class c, t where c.oid = t.oid), false) then 'PASS' else 'FAIL' end

  union all
  select 12, 'exactly one policy: active-admin, authenticated only',
         coalesce((select string_agg(policyname || ' ' || cmd || ' ' || array_to_string(roles, '/'), ', ') from pg_policies where schemaname = 'public' and tablename = 'media_placements'), 'none'),
         case when (select count(*) from pg_policies where schemaname = 'public' and tablename = 'media_placements') = 1
               and exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_placements' and array_to_string(roles, '/') = 'authenticated'
                             and qual like '%admin_users%' and qual like '%is_active%' and with_check like '%admin_users%') then 'PASS' else 'FAIL' end

  union all
  select 13, 'anon has no privilege on the table',
         (select count(*)::text from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_placements' and grantee in ('anon', 'PUBLIC')),
         case when exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_placements' and grantee in ('anon', 'PUBLIC')) then 'FAIL' else 'PASS' end

  union all
  select 14, 'validation trigger present',
         (select count(*)::text from pg_trigger g, t where g.tgrelid = t.oid and g.tgname = 'media_placements_check' and not g.tgisinternal),
         case when (select count(*) from pg_trigger g, t where g.tgrelid = t.oid and g.tgname = 'media_placements_check' and not g.tgisinternal) = 1 then 'PASS' else 'FAIL' end

  union all
  select 20, 'one get_media_showcase, security definer, fixed search_path',
         (select count(*)::text || ' / definer ' || coalesce(bool_and(prosecdef)::text, '-') || ' / ' || coalesce(string_agg(array_to_string(proconfig, ';'), ' '), '-') from f),
         case when (select count(*) from f) = 1 and (select bool_and(prosecdef and array_to_string(proconfig, ';') like '%search_path%') from f) then 'PASS' else 'FAIL' end

  union all
  select 21, 'anon may execute the public read function',
         coalesce((select has_function_privilege('anon', f.oid, 'execute')::text from f limit 1), 'n/a'),
         case when coalesce((select has_function_privilege('anon', f.oid, 'execute') from f limit 1), false) then 'PASS' else 'FAIL' end

  union all
  select 22, 'the function returns no admin or storage columns',
         coalesce((select pg_get_function_result(f.oid) from f limit 1), 'n/a'),
         case when coalesce((select pg_get_function_result(f.oid) from f limit 1), 'created_by') !~ '(created_by|checksum|object_path|bucket|media_asset_id|status)' then 'PASS' else 'FAIL' end

  union all
  select 23, 'the function returns captions_url and transcript',
         coalesce((select (pg_get_function_result(f.oid) ~ 'captions_url' and pg_get_function_result(f.oid) ~ 'transcript')::text from f limit 1), 'n/a'),
         case when coalesce((select pg_get_function_result(f.oid) ~ 'captions_url' and pg_get_function_result(f.oid) ~ 'transcript' from f limit 1), false) then 'PASS' else 'FAIL' end

  union all
  select 30, 'media_assets.captions_url and transcript: two nullable text columns',
         coalesce((select string_agg(column_name || ' ' || data_type || ' nullable=' || is_nullable, ', ' order by column_name) from information_schema.columns
                    where table_schema = 'public' and table_name = 'media_assets' and column_name in ('captions_url', 'transcript')), 'missing'),
         case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'media_assets'
                     and column_name in ('captions_url', 'transcript') and data_type = 'text' and is_nullable = 'YES' and column_default is null) = 2 then 'PASS' else 'FAIL' end

  union all
  select 31, 'accessibility checks present on media_assets (safe URL, length, video only)',
         coalesce((select string_agg(conname, ', ' order by conname) from pg_constraint where conrelid = to_regclass('public.media_assets')
                    and conname in ('media_assets_captions_url_safe', 'media_assets_transcript_length', 'media_assets_accessibility_video_only')), 'none'),
         case when (select count(*) from pg_constraint where conrelid = to_regclass('public.media_assets') and convalidated
                     and conname in ('media_assets_captions_url_safe', 'media_assets_transcript_length', 'media_assets_accessibility_video_only')) = 3 then 'PASS' else 'FAIL' end
)
select ord, check_name, actual, verdict from checks order by ord;
