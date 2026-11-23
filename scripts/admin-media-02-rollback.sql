-- =====================================================================================================================
-- Admin Media Library (Batch 1) -- ROLLBACK.  DRAFT -- NOT EXECUTED.  OWNER REVIEW ONLY.
--
-- TWO STAGES, both safe to re-run:
--   1. ACCESS rollback (always): drops the three admin policies and revokes every browser-role grant on
--      public.media_assets.  After this, the browser (admin or not) cannot read or write the registry.
--   2. STRUCTURAL rollback (only when the table is EMPTY): drops the trigger, the function and the table.
--      If the table holds rows it is KEPT and a NOTICE says so: the registry is the only record of titles, alt text and
--      checksums, so it is never destroyed silently.  To discard a populated registry, export it first and run
--      "drop table public.media_assets;" yourself.
--
-- Storage objects are never touched: uploaded files stay in project-images and every existing public URL keeps working.
-- The application must be rolled back (or the Media Library hidden) before / together with this script, otherwise
-- /admin/media shows load errors.  Public pages are unaffected: they never read this table.
-- =====================================================================================================================
begin;

do $rollback$
declare v_rows bigint;
begin
  if to_regclass('public.media_assets') is null then
    raise notice 'public.media_assets does not exist: nothing to roll back.';
    return;
  end if;
  if coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') <> 'Hbee admin media library Batch 1 v1' then
    raise exception 'ABORT (nothing changed): public.media_assets is not owned by this migration.';
  end if;

  -- stage 1: access
  drop policy if exists media_assets_admin_select on public.media_assets;
  drop policy if exists media_assets_admin_insert on public.media_assets;
  drop policy if exists media_assets_admin_update on public.media_assets;
  revoke all on public.media_assets from anon;
  revoke all on public.media_assets from authenticated;

  -- stage 2: structure, only when empty
  select count(*) into v_rows from public.media_assets;
  if v_rows = 0 then
    drop trigger if exists media_assets_before_update on public.media_assets;
    drop table public.media_assets;
    if to_regprocedure('public.media_assets_before_update()') is not null
       and coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), '') = 'Hbee admin media library Batch 1 v1' then
      drop function public.media_assets_before_update();
    end if;
    raise notice 'Rolled back completely: the empty media_assets table, its trigger and function were dropped.';
  else
    raise notice 'Access removed. public.media_assets holds % row(s) and was KEPT. Export it before dropping it by hand.', v_rows;
  end if;
end
$rollback$;

commit;
