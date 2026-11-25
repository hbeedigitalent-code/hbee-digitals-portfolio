-- =====================================================================================================================
-- Media placements -- ROLLBACK.  DRAFT -- NOT EXECUTED.  Requires explicit owner approval before running.
--
-- Step 1 (always safe): removes the public read function, so every showcase disappears from the website at once, and
-- closes browser access to the table.
-- Step 2: drops the table ONLY if it holds no rows. If placements exist they are KEPT (export or review them first).
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

commit;
