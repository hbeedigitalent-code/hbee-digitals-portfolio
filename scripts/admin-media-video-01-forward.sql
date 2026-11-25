-- =====================================================================================================================
-- Admin Media Batch 3 (video) -- FORWARD.  DRAFT -- NOT EXECUTED.  Requires explicit owner approval before running.
--
-- WHAT THIS DOES
--   * creates ONE public storage bucket, site-media, limited to MP4 / WebM and 40 MB per object;
--   * adds TWO policies on storage.objects, both scoped to bucket_id = 'site-media' and to ACTIVE ADMINS:
--       site_media_admin_select  (authenticated)  and  site_media_admin_insert  (authenticated).
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   * no UPDATE or DELETE policy: an uploaded video is never overwritten or removed through the application;
--   * no anon policy: public playback works because the bucket is public (object URLs), not through table access;
--   * no change to any other bucket (project-images, proofs, client / proposal / project / onboarding files), to any
--     existing policy, or to any public-schema table.
--
-- Run admin-media-video-00-preflight-readonly.sql first (zero FAIL rows) and -03-verify-readonly.sql afterwards.
-- Rollback: admin-media-video-02-rollback.sql.
-- =====================================================================================================================

begin;

do $guard$
begin
  if to_regclass('public.media_assets') is null then
    raise exception 'public.media_assets is missing: apply the Batch 1 migration first';
  end if;
  if exists (
    select 1 from storage.buckets b where b.id = 'site-media'
      and not (b.public and b.file_size_limit = 41943040
               and b.allowed_mime_types @> array['video/mp4', 'video/webm'] and b.allowed_mime_types <@ array['video/mp4', 'video/webm'])
  ) then
    raise exception 'a site-media bucket already exists with different settings; review it instead of overwriting';
  end if;
end
$guard$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 41943040, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

drop policy if exists site_media_admin_select on storage.objects;
create policy site_media_admin_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'site-media'
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

drop policy if exists site_media_admin_insert on storage.objects;
create policy site_media_admin_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and (name like 'videos/%' or name like 'background/%' or name like 'ugc/%')
    and exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

commit;
