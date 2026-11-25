-- =====================================================================================================================
-- Admin Media Batch 3 (video) -- ROLLBACK.  DRAFT -- NOT EXECUTED.  Requires explicit owner approval before running.
--
-- Removes the two policies added by the forward script, which immediately stops all application uploads to site-media.
--
-- It deliberately deletes NOTHING from storage. The bucket and any uploaded videos stay, so public URLs already used on
-- the site keep working. If the bucket is empty and should disappear, remove it by hand in the Supabase dashboard
-- (Storage -> site-media -> Delete bucket). media_assets rows are not touched.
-- =====================================================================================================================

begin;

drop policy if exists site_media_admin_insert on storage.objects;
drop policy if exists site_media_admin_select on storage.objects;

commit;
