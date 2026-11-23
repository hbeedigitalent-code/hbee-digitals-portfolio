-- =====================================================================================================================
-- Admin Media Library (Batch 1) -- FORWARD MIGRATION.  DRAFT -- NOT EXECUTED.  OWNER REVIEW ONLY.
--
-- Run admin-media-00-preflight-readonly.sql first and resolve every FAIL row.
--
-- WHAT THIS DOES (additive only):
--   * creates public.media_assets, a registry of uploaded media.  The file itself stays in Supabase Storage in whichever
--     bucket it already lives (new Batch 1 uploads go to project-images under media/...).
--   * enables row level security.  Active admins (public.admin_users: user_id = auth.uid(), is_active = true) may SELECT,
--     INSERT and UPDATE.  There is NO DELETE policy and NO DELETE grant: the library archives, it never hard-deletes.
--   * anon and every non-admin signed-in user (including Client Portal users) get no access at all.  There is no public
--     SELECT policy on purpose: public pages receive stored URLs from their own content tables and never read this table.
--   * a BEFORE UPDATE trigger makes the file-identity columns immutable (bucket, object_path, public_url, checksum, kind,
--     mime_type, size, dimensions, created_by/at) and maintains updated_at.  Only descriptive metadata and status may change.
--
-- WHAT THIS DOES NOT DO:
--   * no storage bucket, storage policy or storage object is created, changed or read;
--   * no existing table, policy, grant, function or row is touched;
--   * no existing URL is rewritten and no file is moved.
--
-- The migration is idempotent: a second run on a database that already carries this migration changes nothing; an
-- unexpected existing object of the same name aborts the whole transaction.
-- Rollback: admin-media-02-rollback.sql.   Verify: admin-media-03-verify-readonly.sql.
-- =====================================================================================================================
begin;

do $migration$
begin
  if to_regclass('public.admin_users') is null then
    raise exception 'ABORT (nothing changed): public.admin_users does not exist.';
  end if;
  if (select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')) <> 2 then
    raise exception 'ABORT (nothing changed): admin_users must have user_id and is_active.';
  end if;
  if to_regclass('public.media_assets') is not null
     and coalesce(obj_description(to_regclass('public.media_assets'), 'pg_class'), '') <> 'Hbee admin media library Batch 1 v1' then
    raise exception 'ABORT (nothing changed): public.media_assets already exists and is not owned by this migration. Inspect it first.';
  end if;
  if to_regprocedure('public.media_assets_before_update()') is not null
     and coalesce(obj_description(to_regprocedure('public.media_assets_before_update()'), 'pg_proc'), '') <> 'Hbee admin media library Batch 1 v1' then
    raise exception 'ABORT (nothing changed): public.media_assets_before_update() already exists and is not owned by this migration.';
  end if;
end
$migration$;

create table if not exists public.media_assets (
  id                uuid primary key default gen_random_uuid(),
  kind              text not null default 'image' check (kind in ('image', 'video')),
  category          text not null check (category in
                      ('brand_logo', 'graphic', 'insight_image', 'project_image', 'general', 'video', 'bgc_video', 'ugc_video')),
  title             text not null check (length(btrim(title)) between 1 and 160),
  alt_text          text not null default '' check (length(alt_text) <= 300),
  is_decorative     boolean not null default false,
  caption           text not null default '' check (length(caption) <= 1000),
  bucket            text not null check (bucket ~ '^[a-z0-9][a-z0-9._-]{1,62}$'),
  object_path       text not null check (
                      length(object_path) between 1 and 400
                      and object_path ~ '^[A-Za-z0-9][A-Za-z0-9._/ %()+,@=~-]*$'
                      and object_path !~ '\.\.'
                      and object_path !~ '//'
                      and right(object_path, 1) <> '/'),
  public_url        text not null check (length(public_url) <= 2048 and public_url ~ '^https://[^[:space:]<>"''\\]+$'),
  mime_type         text not null check (mime_type in
                      ('image/png', 'image/jpeg', 'image/webp', 'image/avif', 'image/gif', 'video/mp4', 'video/webm')),
  size_bytes        bigint not null check (size_bytes > 0),
  width             integer,
  height            integer,
  duration_seconds  numeric check (duration_seconds is null or duration_seconds >= 0),
  poster_asset_id   uuid references public.media_assets(id) on delete set null,
  checksum          text check (checksum is null or checksum ~ '^[0-9a-f]{64}$'),
  status            text not null default 'active' check (status in ('active', 'archived')),
  created_by        uuid default auth.uid(),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint media_assets_bucket_path_unique unique (bucket, object_path),
  constraint media_assets_kind_category check (
    (kind = 'image' and category in ('brand_logo', 'graphic', 'insight_image', 'project_image', 'general'))
    or (kind = 'video' and category in ('video', 'bgc_video', 'ugc_video'))),
  constraint media_assets_kind_mime check (
    (kind = 'image' and mime_type like 'image/%') or (kind = 'video' and mime_type like 'video/%')),
  constraint media_assets_dimensions check (
    (width is null and height is null)
    or (width between 1 and 20000 and height between 1 and 20000)),
  constraint media_assets_alt_required check (
    kind <> 'image' or is_decorative or length(btrim(alt_text)) > 0),
  constraint media_assets_video_only_columns check (
    kind = 'video' or (duration_seconds is null and poster_asset_id is null))
);

comment on table public.media_assets is 'Hbee admin media library Batch 1 v1';

create index if not exists media_assets_checksum_idx on public.media_assets (checksum) where checksum is not null;
create index if not exists media_assets_status_category_idx on public.media_assets (status, category, created_at desc);
create index if not exists media_assets_created_at_idx on public.media_assets (created_at desc);

-- Immutability of the file identity + updated_at.  SECURITY INVOKER: it reads only OLD/NEW.
create or replace function public.media_assets_before_update()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
begin
  if new.id is distinct from old.id
     or new.kind is distinct from old.kind
     or new.bucket is distinct from old.bucket
     or new.object_path is distinct from old.object_path
     or new.public_url is distinct from old.public_url
     or new.mime_type is distinct from old.mime_type
     or new.size_bytes is distinct from old.size_bytes
     or new.width is distinct from old.width
     or new.height is distinct from old.height
     or new.checksum is distinct from old.checksum
     or new.created_by is distinct from old.created_by
     or new.created_at is distinct from old.created_at then
    raise exception 'media_assets: the stored file identity is immutable; upload a new asset instead' using errcode = '23514';
  end if;
  new.updated_at := now();
  return new;
end
$fn$;

comment on function public.media_assets_before_update() is 'Hbee admin media library Batch 1 v1';

drop trigger if exists media_assets_before_update on public.media_assets;
create trigger media_assets_before_update
  before update on public.media_assets
  for each row execute function public.media_assets_before_update();

-- ── access ────────────────────────────────────────────────────────────────────────────────────────────────────
alter table public.media_assets enable row level security;

revoke all on public.media_assets from public;
revoke all on public.media_assets from anon;
revoke all on public.media_assets from authenticated;
grant select, insert, update on public.media_assets to authenticated;   -- still gated by the policies below
grant all on public.media_assets to service_role;

drop policy if exists media_assets_admin_select on public.media_assets;
create policy media_assets_admin_select on public.media_assets
  for select to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

drop policy if exists media_assets_admin_insert on public.media_assets;
create policy media_assets_admin_insert on public.media_assets
  for insert to authenticated
  with check (
    exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true)
    and created_by is not distinct from auth.uid());

drop policy if exists media_assets_admin_update on public.media_assets;
create policy media_assets_admin_update on public.media_assets
  for update to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

-- Deliberately NO select policy for anon, NO delete policy, NO delete grant.

commit;
