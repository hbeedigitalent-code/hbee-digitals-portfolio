-- =====================================================================================================================
-- Admin Media Library (Batch 1) -- PREFLIGHT.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- ONE statement, ONE result set.  It changes nothing, reads no object name, no row of any application table and no secret.
-- It reads only information_schema / pg_catalog / pg_policies / storage.buckets (metadata).
--
-- Run this BEFORE admin-media-01-forward.sql and read every FAIL / REVIEW row.  OVERALL = PASS requires zero FAIL rows.
--
-- COLUMNS:  ord | check_name | expected | actual | verdict
--   verdict  PASS | FAIL | REVIEW | INFO
-- =====================================================================================================================

with
checks(ord, check_name, expected, actual, verdict) as (

  -- 1. the admin identity the new policies rely on -------------------------------------------------------------
  select 10, 'public.admin_users exists', 'yes',
         case when to_regclass('public.admin_users') is not null then 'yes' else 'no' end,
         case when to_regclass('public.admin_users') is not null then 'PASS' else 'FAIL' end

  union all
  select 11, 'admin_users has user_id and is_active', '2 columns',
         (select count(*)::text || ' columns' from information_schema.columns
           where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')),
         case when (select count(*) from information_schema.columns
                     where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')) = 2
              then 'PASS' else 'FAIL' end

  union all
  select 12, 'a signed-in admin can read their own admin_users row (policy subqueries run with invoker rights)', 'at least 1 SELECT/ALL policy',
         (select count(*)::text || ' policies' from pg_policies
           where schemaname = 'public' and tablename = 'admin_users' and cmd in ('SELECT', 'ALL')),
         case when (select count(*) from pg_policies
                     where schemaname = 'public' and tablename = 'admin_users' and cmd in ('SELECT', 'ALL')) > 0
              then 'PASS' else 'FAIL' end

  -- 2. nothing of ours exists yet --------------------------------------------------------------------------------
  union all
  select 20, 'public.media_assets', 'absent (first run) or already owned by this migration',
         case when to_regclass('public.media_assets') is null then 'absent'
              when coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') = 'Hbee admin media library Batch 1 v1' then 'present, owned by this migration'
              else 'present, NOT owned by this migration' end,
         case when to_regclass('public.media_assets') is null then 'PASS'
              when coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') = 'Hbee admin media library Batch 1 v1' then 'INFO'
              else 'FAIL' end

  union all
  select 21, 'function public.media_assets_before_update()', 'absent or owned by this migration',
         case when to_regprocedure('public.media_assets_before_update()') is null then 'absent'
              when coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), '') = 'Hbee admin media library Batch 1 v1' then 'present, owned by this migration'
              else 'present, NOT owned by this migration' end,
         case when to_regprocedure('public.media_assets_before_update()') is null then 'PASS'
              when coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), '') = 'Hbee admin media library Batch 1 v1' then 'INFO'
              else 'FAIL' end

  union all
  select 22, 'gen_random_uuid() is available', 'yes',
         case when to_regprocedure('gen_random_uuid()') is not null then 'yes' else 'no' end,
         case when to_regprocedure('gen_random_uuid()') is not null then 'PASS' else 'FAIL' end

  -- 3. storage: facts only.  Batch 1 changes NO storage object, bucket or storage policy ----------------------------
  union all
  select 30, 'bucket project-images (reused for new uploads under media/...)', 'exists',
         coalesce((select 'public = ' || b.public::text || ', file_size_limit = ' || coalesce(b.file_size_limit::text, 'NULL (inherits project limit)')
                          || ', allowed_mime_types = ' || coalesce(b.allowed_mime_types::text, 'NULL (unrestricted)')
                     from storage.buckets b where b.id = 'project-images'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'project-images') then 'INFO' else 'FAIL' end

  union all
  select 31, 'bucket project-images: allowed_mime_types / file_size_limit compatible with PNG, JPEG, WebP, AVIF up to 8 MiB', 'NULL or covering',
         coalesce((select case when (b.allowed_mime_types is null or (b.allowed_mime_types @> array['image/png','image/jpeg','image/webp','image/avif']))
                                and (b.file_size_limit is null or b.file_size_limit >= 8 * 1024 * 1024)
                           then 'compatible' else 'RESTRICTIVE: review before uploading AVIF / large files' end
                     from storage.buckets b where b.id = 'project-images'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'project-images'
                            and (b.allowed_mime_types is null or (b.allowed_mime_types @> array['image/png','image/jpeg','image/webp','image/avif']))
                            and (b.file_size_limit is null or b.file_size_limit >= 8 * 1024 * 1024))
              then 'PASS' else 'REVIEW' end

  union all
  select 32, 'storage.objects INSERT/ALL policies that mention project-images (admin browser uploads already depend on one)', 'at least 1 [unverifiable if written without the bucket name]',
         (select count(*)::text || ' : ' || coalesce(string_agg(policyname, ', ' order by policyname), '-') from pg_policies
           where schemaname = 'storage' and tablename = 'objects' and cmd in ('INSERT', 'ALL')
             and (coalesce(with_check, '') ilike '%project-images%' or coalesce(qual, '') ilike '%project-images%')),
         'INFO'

  -- 4. tables the on-demand usage scan will read (the scan degrades gracefully when one is missing) -----------------
  union all
  select 40 + t.n, 'usage-scan source table public.' || t.name, 'exists (otherwise reported as "not scanned")',
         case when to_regclass('public.' || t.name) is not null then 'yes' else 'no' end,
         case when to_regclass('public.' || t.name) is not null then 'PASS' else 'INFO' end
  from (values (1, 'blog_posts'), (2, 'portfolio_items'), (3, 'portfolio_media'), (4, 'trust_section'),
               (5, 'hero_section'), (6, 'team_members'), (7, 'about_page')) as t(n, name)

  -- 5. existing grants on anything named media_assets (should be none) ------------------------------------------------
  union all
  select 50, 'no pre-existing grants on public.media_assets', '0',
         (select count(*)::text from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_assets'),
         case when (select count(*) from information_schema.role_table_grants where table_schema = 'public' and table_name = 'media_assets') = 0
              then 'PASS' else 'REVIEW' end
)
select ord, check_name, expected, actual, verdict from checks
union all
select 999, 'OVERALL', 'zero FAIL rows',
       (select count(*)::text || ' FAIL, ' || (select count(*) from checks where verdict = 'REVIEW')::text || ' REVIEW' from checks where verdict = 'FAIL'),
       case when exists (select 1 from checks where verdict = 'FAIL') then 'FAIL' else 'PASS' end
order by ord;
