-- =====================================================================================================================
-- Admin Media Batch 3 (video) -- PREFLIGHT.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- Run BEFORE admin-media-video-01-forward.sql.  ONE statement, ONE result set.  Reads only catalog metadata
-- (pg_class, pg_policies, information_schema, storage.buckets). No row content, no object names, nothing is changed.
--
-- COLUMNS:  ord | check_name | actual | verdict      (PASS | FAIL | INFO | REVIEW)
-- Proceed only with zero FAIL rows. REVIEW rows must be read by a person before continuing.
--
-- Also check in the dashboard (not visible to SQL): Project Settings -> Storage -> "Upload file size limit" must be at
-- least 40 MB, and the plan's storage and egress allowance should be acceptable for public video.
-- =====================================================================================================================

with
checks(ord, check_name, actual, verdict) as (

  select 10, 'table public.media_assets exists (Batch 1 applied)',
         case when to_regclass('public.media_assets') is null then 'missing' else 'present' end,
         case when to_regclass('public.media_assets') is null then 'FAIL' else 'PASS' end

  union all
  select 11, 'admin_users has user_id and is_active',
         (select count(*)::text || ' of 2 columns' from information_schema.columns
           where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')),
         case when (select count(*) from information_schema.columns
                     where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')) = 2
              then 'PASS' else 'FAIL' end

  union all
  select 12, 'row level security enabled on storage.objects',
         coalesce((select c.relrowsecurity::text from pg_class c where c.oid = to_regclass('storage.objects')), 'n/a'),
         case when coalesce((select c.relrowsecurity from pg_class c where c.oid = to_regclass('storage.objects')), false) then 'PASS' else 'FAIL' end

  union all
  select 20, 'bucket site-media: absent, or already exactly as intended',
         coalesce((select 'public = ' || b.public::text || ', file_size_limit = ' || coalesce(b.file_size_limit::text, 'NULL')
                          || ', allowed_mime_types = ' || coalesce(b.allowed_mime_types::text, 'NULL')
                     from storage.buckets b where b.id = 'site-media'), 'absent'),
         case when not exists (select 1 from storage.buckets b where b.id = 'site-media') then 'PASS'
              when exists (select 1 from storage.buckets b where b.id = 'site-media' and b.public and b.file_size_limit = 41943040
                             and b.allowed_mime_types @> array['video/mp4', 'video/webm'] and b.allowed_mime_types <@ array['video/mp4', 'video/webm']) then 'PASS'
              else 'FAIL' end

  union all
  select 21, 'no storage policy named site_media_* exists yet',
         coalesce((select string_agg(policyname, ', ') from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'site\_media\_%'), 'none'),
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'site\_media\_%') then 'REVIEW' else 'PASS' end

  union all
  -- A policy with no bucket condition would also apply to site-media (for example letting any signed-in user write or delete).
  select 22, 'storage.objects policies that do not mention bucket_id (would also apply to site-media)',
         coalesce((select string_agg(policyname || ' (' || cmd || ' to ' || array_to_string(roles, '/') || ')', '; ' order by policyname)
                     from pg_policies where schemaname = 'storage' and tablename = 'objects'
                      and coalesce(qual, '') || coalesce(with_check, '') not like '%bucket_id%'), 'none'),
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                             and coalesce(qual, '') || coalesce(with_check, '') not like '%bucket_id%') then 'REVIEW' else 'PASS' end

  union all
  select 30, 'public.hero_section.video_url column (informational: decides any future Hero video control)',
         case when exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'hero_section' and column_name = 'video_url')
              then 'present' else 'absent' end,
         'INFO'
)
select ord, check_name, actual, verdict from checks order by ord;
