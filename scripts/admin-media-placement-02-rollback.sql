-- =====================================================================================================================
-- Media placements -- ROLLBACK.  DRAFT -- NOT EXECUTED.  Requires explicit owner approval before running.
--
-- Step 1 (always safe): removes the public read function, so every showcase disappears from the website at once, and
-- closes browser access to the table.
-- Step 2: drops the table ONLY if it holds no rows. If placements exist they are KEPT (export or review them first).
-- Step 3: drops the two media_assets accessibility columns ONLY if no asset has a captions URL or transcript. If any
--         value exists, both columns and their checks are KEPT.
-- Media Library assets, stored files, portfolio data and storage policies are never touched.
-- =====================================================================================================================

begin;

drop function if exists public.get_media_showcase(text, text, text);

do $rollback$
begin
  if to_regclass('public.media_placements') is null then return; end if;
  if coalesce(obj_description(to_regclass('public.media_placements'), 'pg_class'), '') <> 'Hbee media placements v1' then
    raise exception 'public.media_placements is not owned by this migration';
  end if;
  execute 'drop policy if exists media_placements_admin on public.media_placements';
  execute 'revoke all on public.media_placements from anon, authenticated';
  if not exists (select 1 from public.media_placements) then
    execute 'drop table public.media_placements';
    execute 'drop function if exists public.media_placements_check()';
  else
    raise notice 'media_placements has rows: table kept, browser access closed';
  end if;
end
$rollback$;

do $accessibility$
declare
  has_values boolean;
begin
  -- Only columns this migration created (matching comment) are considered.
  if (select count(*) from pg_attribute a where a.attrelid = to_regclass('public.media_assets') and a.attname in ('captions_url', 'transcript')
        and not a.attisdropped and col_description(a.attrelid, a.attnum) = 'Hbee media placements v1') <> 2 then
    return;
  end if;
  execute 'select exists (select 1 from public.media_assets where captions_url is not null or transcript is not null)' into has_values;
  if has_values then
    raise notice 'media_assets has captions or transcripts: accessibility columns kept';
    return;
  end if;
  execute 'alter table public.media_assets drop constraint if exists media_assets_accessibility_video_only';
  execute 'alter table public.media_assets drop constraint if exists media_assets_captions_url_safe';
  execute 'alter table public.media_assets drop constraint if exists media_assets_transcript_length';
  execute 'alter table public.media_assets drop column captions_url, drop column transcript';
end
$accessibility$;

commit;
