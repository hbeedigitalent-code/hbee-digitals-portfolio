-- =====================================================================================================================
-- Admin Media Batch 3 (video) -- POST-RUN VERIFIER.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- ONE statement, ONE result set. Reads only catalog metadata and storage.buckets. No object names, nothing is changed.
-- COLUMNS:  ord | check_name | actual | verdict      (PASS | FAIL | REVIEW)
-- OVERALL = PASS requires zero FAIL rows.
-- =====================================================================================================================

with
site_policies as (
  select policyname, cmd, roles, coalesce(qual, '') || ' ' || coalesce(with_check, '') as body
    from pg_policies
   where schemaname = 'storage' and tablename = 'objects'
     and (policyname like 'site\_media\_%' or coalesce(qual, '') || coalesce(with_check, '') like '%site-media%')
),
checks(ord, check_name, actual, verdict) as (

  select 10, 'bucket site-media is public, 40 MB, MP4 / WebM only',
         coalesce((select 'public = ' || b.public::text || ', file_size_limit = ' || coalesce(b.file_size_limit::text, 'NULL')
                          || ', allowed_mime_types = ' || coalesce(b.allowed_mime_types::text, 'NULL')
                     from storage.buckets b where b.id = 'site-media'), 'missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'site-media' and b.public and b.file_size_limit = 41943040
                             and b.allowed_mime_types @> array['video/mp4', 'video/webm'] and b.allowed_mime_types <@ array['video/mp4', 'video/webm'])
              then 'PASS' else 'FAIL' end

  union all
  select 20, 'exactly two site-media policies: admin SELECT and admin INSERT',
         coalesce((select string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) from site_policies), 'none'),
         case when (select count(*) from site_policies) = 2
               and (select count(*) from site_policies where policyname in ('site_media_admin_select', 'site_media_admin_insert') and cmd in ('SELECT', 'INSERT')) = 2
              then 'PASS' else 'FAIL' end

  union all
  select 21, 'both policies are authenticated-only and require an active admin',
         coalesce((select string_agg(policyname || ' -> ' || array_to_string(roles, '/'), ', ' order by policyname) from site_policies), 'none'),
         case when (select count(*) from site_policies where array_to_string(roles, '/') = 'authenticated' and body like '%admin_users%' and body like '%is_active%') = 2
              then 'PASS' else 'FAIL' end

  union all
  select 22, 'no UPDATE / DELETE / ALL policy for site-media',
         (select count(*)::text from site_policies where cmd in ('UPDATE', 'DELETE', 'ALL')),
         case when exists (select 1 from site_policies where cmd in ('UPDATE', 'DELETE', 'ALL')) then 'FAIL' else 'PASS' end

  union all
  select 30, 'storage.objects policies without a bucket condition (would also apply to site-media)',
         coalesce((select string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) from pg_policies
                    where schemaname = 'storage' and tablename = 'objects' and coalesce(qual, '') || coalesce(with_check, '') not like '%bucket_id%'), 'none'),
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects'
                             and coalesce(qual, '') || coalesce(with_check, '') not like '%bucket_id%') then 'REVIEW' else 'PASS' end
)
select ord, check_name, actual, verdict from checks order by ord;
