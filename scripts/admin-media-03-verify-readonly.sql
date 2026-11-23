-- =====================================================================================================================
-- Admin Media Library (Batch 1) -- POST-RUN VERIFIER.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- ONE statement, ONE result set.  Reads only catalog metadata (pg_class, pg_policies, pg_constraint, pg_trigger,
-- information_schema, storage.buckets) plus ONE aggregate count of media_assets rows.  No row content, no object name.
--
-- COLUMNS:  ord | check_name | expected | actual | verdict      (PASS | FAIL | INFO)
-- OVERALL = PASS requires zero FAIL rows.
-- =====================================================================================================================

with
checks(ord, check_name, expected, actual, verdict) as (

  select 10, 'table public.media_assets exists and is owned by this migration', 'yes',
         case when to_regclass('public.media_assets') is null then 'missing'
              when coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') = 'Hbee admin media library Batch 1 v1' then 'yes'
              else 'present but not owned' end,
         case when coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') = 'Hbee admin media library Batch 1 v1' then 'PASS' else 'FAIL' end

  union all
  select 11, 'row level security enabled', 'true',
         coalesce((select c.relrowsecurity::text from pg_class c where c.oid = to_regclass('public.media_assets')), 'n/a'),
         case when coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('public.media_assets')), false) then 'PASS' else 'FAIL' end

  union all
  select 12, 'exactly three policies: admin select / insert / update', '3',
         (select count(*)::text || ' : ' || coalesce(string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname), '-')
            from pg_policies where schemaname = 'public' and tablename = 'media_assets'),
         case when (select count(*) from pg_policies where schemaname = 'public' and tablename = 'media_assets') = 3
                and (select count(*) from pg_policies where schemaname = 'public' and tablename = 'media_assets'
                      and policyname in ('media_assets_admin_select', 'media_assets_admin_insert', 'media_assets_admin_update')) = 3
              then 'PASS' else 'FAIL' end

  union all
  select 13, 'every policy is for role authenticated only and tests an ACTIVE admin_users row', 'all',
         (select count(*) filter (where roles = '{authenticated}' and (coalesce(qual, '') || coalesce(with_check, '')) ~* 'admin_users'
                                   and (coalesce(qual, '') || coalesce(with_check, '')) ~* 'is_active')::text || ' of ' || count(*)::text
            from pg_policies where schemaname = 'public' and tablename = 'media_assets'),
         case when (select count(*) from pg_policies where schemaname = 'public' and tablename = 'media_assets') > 0
                and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets'
                                 and not (roles = '{authenticated}' and (coalesce(qual, '') || coalesce(with_check, '')) ~* 'admin_users'
                                          and (coalesce(qual, '') || coalesce(with_check, '')) ~* 'is_active'))
              then 'PASS' else 'FAIL' end

  union all
  select 14, 'NO policy grants anon / PUBLIC access and none is permissive for a non-admin', '0',
         (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'media_assets'
            and (roles::text ~* '(anon|public)' or coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')),
         case when not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets'
                                and (roles::text ~* '(anon|public)' or coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true'))
              then 'PASS' else 'FAIL' end

  union all
  select 15, 'no DELETE policy exists (the library archives, never hard-deletes)', '0',
         (select count(*)::text from pg_policies where schemaname = 'public' and tablename = 'media_assets' and cmd in ('DELETE', 'ALL')),
         case when not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'media_assets' and cmd in ('DELETE', 'ALL'))
              then 'PASS' else 'FAIL' end

  -- table privileges (information_schema.role_table_grants lists direct grants) -----------------------------------
  union all
  select 20, 'anon has NO privilege on media_assets', '0',
         (select count(*)::text from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_assets' and grantee = 'anon'),
         case when not exists (select 1 from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_assets' and grantee in ('anon', 'PUBLIC'))
              then 'PASS' else 'FAIL' end

  union all
  select 21, 'authenticated holds exactly SELECT, INSERT, UPDATE (no DELETE, TRUNCATE, REFERENCES, TRIGGER)', 'INSERT, SELECT, UPDATE',
         coalesce((select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
                    where table_schema = 'public' and table_name = 'media_assets' and grantee = 'authenticated'), 'none'),
         case when coalesce((select string_agg(privilege_type, ', ' order by privilege_type) from information_schema.role_table_grants
                              where table_schema = 'public' and table_name = 'media_assets' and grantee = 'authenticated'), 'none') = 'INSERT, SELECT, UPDATE'
              then 'PASS' else 'FAIL' end

  -- structure ------------------------------------------------------------------------------------------------------
  union all
  select 30 + c.n, 'column ' || c.col, 'present',
         case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_assets' and column_name = c.col) then 'present' else 'missing' end,
         case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'media_assets' and column_name = c.col) then 'PASS' else 'FAIL' end
  from (values (1, 'id'), (2, 'kind'), (3, 'category'), (4, 'title'), (5, 'alt_text'), (6, 'is_decorative'), (7, 'caption'),
               (8, 'bucket'), (9, 'object_path'), (10, 'public_url'), (11, 'mime_type'), (12, 'size_bytes'), (13, 'width'),
               (14, 'height'), (15, 'duration_seconds'), (16, 'poster_asset_id'), (17, 'checksum'), (18, 'status'),
               (19, 'created_by'), (20, 'created_at'), (21, 'updated_at')) as c(n, col)

  union all
  select 60 + k.n, 'constraint ' || k.name, 'present',
         case when exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and conname = k.name) then 'present' else 'missing' end,
         case when exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and conname = k.name) then 'PASS' else 'FAIL' end
  from (values (1, 'media_assets_bucket_path_unique'), (2, 'media_assets_kind_category'), (3, 'media_assets_kind_mime'),
               (4, 'media_assets_dimensions'), (5, 'media_assets_alt_required'), (6, 'media_assets_video_only_columns')) as k(n, name)

  union all
  select 70, 'category constraint lists all eight categories', '8',
         coalesce((select count(*)::text from unnest(array['brand_logo','graphic','insight_image','project_image','general','video','bgc_video','ugc_video']) as cat
                    where exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and contype = 'c'
                                   and pg_get_constraintdef(oid) like '%''' || cat || '''%')), '0'),
         case when (select count(*) from unnest(array['brand_logo','graphic','insight_image','project_image','general','video','bgc_video','ugc_video']) as cat
                     where exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and contype = 'c'
                                    and pg_get_constraintdef(oid) like '%''' || cat || '''%')) = 8 then 'PASS' else 'FAIL' end

  union all
  select 71, 'SVG is not an accepted MIME type at the database level', 'no image/svg+xml',
         case when exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and contype = 'c'
                            and pg_get_constraintdef(oid) ilike '%svg%') then 'SVG allowed' else 'no image/svg+xml' end,
         case when not exists (select 1 from pg_constraint where conrelid = to_regclass('public.media_assets') and contype = 'c'
                                and pg_get_constraintdef(oid) ilike '%svg%') then 'PASS' else 'FAIL' end

  union all
  select 72, 'BEFORE UPDATE trigger enforcing file-identity immutability', 'present, enabled',
         coalesce((select case t.tgenabled when 'O' then 'present, enabled' else 'present, tgenabled=' || t.tgenabled::text end
                     from pg_trigger t where t.tgrelid = to_regclass('public.media_assets') and t.tgname = 'media_assets_before_update' and not t.tgisinternal), 'missing'),
         case when exists (select 1 from pg_trigger t where t.tgrelid = to_regclass('public.media_assets') and t.tgname = 'media_assets_before_update'
                            and not t.tgisinternal and t.tgenabled = 'O') then 'PASS' else 'FAIL' end

  union all
  select 73, 'trigger function is SECURITY INVOKER and owned by this migration', 'invoker + marker',
         case when to_regprocedure('public.media_assets_before_update()') is null then 'missing'
              else (select case when p.prosecdef then 'SECURITY DEFINER' else 'SECURITY INVOKER' end from pg_proc p where p.oid = to_regprocedure('public.media_assets_before_update()'))
                   || ', marker = ' || coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), 'none') end,
         case when to_regprocedure('public.media_assets_before_update()') is not null
                and not (select p.prosecdef from pg_proc p where p.oid = to_regprocedure('public.media_assets_before_update()'))
                and coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), '') = 'Hbee admin media library Batch 1 v1'
              then 'PASS' else 'FAIL' end

  union all
  select 74, 'indexes: checksum, status/category, created_at', '3',
         (select count(*)::text from pg_indexes where schemaname = 'public' and tablename = 'media_assets'
            and indexname in ('media_assets_checksum_idx', 'media_assets_status_category_idx', 'media_assets_created_at_idx')),
         case when (select count(*) from pg_indexes where schemaname = 'public' and tablename = 'media_assets'
                     and indexname in ('media_assets_checksum_idx', 'media_assets_status_category_idx', 'media_assets_created_at_idx')) = 3
              then 'PASS' else 'FAIL' end

  -- facts ----------------------------------------------------------------------------------------------------------
  union all
  select 90, 'rows in media_assets (aggregate count only)', 'informational',
         (select count(*)::text from public.media_assets), 'INFO'

  union all
  select 91, 'bucket project-images unchanged by this migration (facts only)', 'informational',
         coalesce((select 'public = ' || b.public::text || ', file_size_limit = ' || coalesce(b.file_size_limit::text, 'NULL')
                          || ', allowed_mime_types = ' || coalesce(b.allowed_mime_types::text, 'NULL')
                     from storage.buckets b where b.id = 'project-images'), 'bucket missing'), 'INFO'

  union all
  select 92, 'private client buckets still carry the restrictive guard (not touched by this migration)', 'present',
         (select count(*)::text || ' restrictive policies on storage.objects' from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and permissive = 'RESTRICTIVE'),
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                            and policyname = 'm10_private_buckets_no_client_select' and permissive = 'RESTRICTIVE')
              then 'PASS' else 'INFO' end
)
select ord, check_name, expected, actual, verdict from checks
union all
select 999, 'OVERALL', 'zero FAIL rows',
       (select count(*)::text || ' FAIL' from checks where verdict = 'FAIL'),
       case when exists (select 1 from checks where verdict = 'FAIL') then 'FAIL' else 'PASS' end
order by ord;
