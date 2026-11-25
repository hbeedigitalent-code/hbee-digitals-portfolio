-- =====================================================================================================================
-- Media placements -- FORWARD.  DRAFT -- NOT EXECUTED.  Requires explicit owner approval before running.
--
-- WHAT THIS DOES (additive only, one transaction)
--   * creates public.media_placements: where a Media Library asset appears and how it is presented there;
--   * RLS: ONLY an active admin may read or change rows. anon has NO table privilege at all;
--   * a trigger that accepts only images and foreground video (never background video) and keeps updated_at;
--   * public.get_media_showcase(type, key, slot): the ONLY public read. SECURITY DEFINER, returns a fixed list of safe
--     columns for switched-on placements; no library names, ids of files, authors, checksums or storage paths;
--   * adds TWO NULLABLE columns to public.media_assets for video accessibility, captions_url (HTTPS WebVTT) and
--     transcript (plain text), with checks that allow them only on videos. No existing row is rewritten or changed.
--
-- WHAT IT DOES NOT DO
--   no other change to media_assets; none to portfolio_items, portfolio_media, any storage bucket or policy, or any
--   existing row.
--
-- Run -00-preflight-readonly.sql first (zero FAIL) and -03-verify-readonly.sql afterwards.  Rollback: -02-rollback.sql.
-- =====================================================================================================================

begin;

do $guard$
begin
  if to_regclass('public.media_assets') is null then raise exception 'public.media_assets is missing'; end if;
  if to_regclass('public.media_placements') is not null
     and coalesce(obj_description(to_regclass('public.media_placements'), 'pg_class'), '') <> 'Hbee media placements v1' then
    raise exception 'public.media_placements exists and is not owned by this migration';
  end if;
  if exists (
    select 1 from pg_attribute a
     where a.attrelid = 'public.media_assets'::regclass and a.attname in ('captions_url', 'transcript') and not a.attisdropped
       and (a.atttypid <> 'text'::regtype or coalesce(col_description(a.attrelid, a.attnum), '') <> 'Hbee media placements v1')
  ) then
    raise exception 'media_assets.captions_url / transcript already exist and are not owned by this migration';
  end if;
end
$guard$;

-- ── Video accessibility lives on the ASSET: the same file has the same captions wherever it is placed. ──
alter table public.media_assets add column if not exists captions_url text;
alter table public.media_assets add column if not exists transcript text;
comment on column public.media_assets.captions_url is 'Hbee media placements v1';
comment on column public.media_assets.transcript is 'Hbee media placements v1';

alter table public.media_assets drop constraint if exists media_assets_captions_url_safe;
alter table public.media_assets add constraint media_assets_captions_url_safe check (
  captions_url is null or (
    captions_url ~* '^https://[^[:space:]<>]+\.vtt([?#][^[:space:]<>]*)?$'
    and captions_url !~* '^https://[^/]*@'
    and position(chr(92) in captions_url) = 0 and position(chr(34) in captions_url) = 0 and position(chr(39) in captions_url) = 0
    and length(captions_url) <= 2048));
alter table public.media_assets drop constraint if exists media_assets_transcript_length;
alter table public.media_assets add constraint media_assets_transcript_length check (transcript is null or length(transcript) <= 20000);
alter table public.media_assets drop constraint if exists media_assets_accessibility_video_only;
alter table public.media_assets add constraint media_assets_accessibility_video_only check (kind = 'video' or (captions_url is null and transcript is null));

create table if not exists public.media_placements (
  id                 uuid primary key default gen_random_uuid(),
  media_asset_id     uuid not null references public.media_assets(id) on delete restrict,
  target_type        text not null check (target_type in ('site', 'service', 'project')),
  target_key         text not null check (length(target_key) between 1 and 80),
  slot               text not null check (slot in ('creative_showcase', 'showcase', 'project_media')),
  display_type       text not null check (display_type in ('logo_design', 'brand_identity', 'brand_asset', 'flyer_design',
                       'social_flyer', 'social_creative', 'campaign_creative', 'ugc_video', 'creator_content', 'product_creative',
                       'website_creative', 'store_experience', 'landing_page', 'project_video', 'other')),
  custom_label       text not null default '' check (length(custom_label) <= 60),
  title_override     text not null default '' check (length(title_override) <= 160),
  caption_override   text not null default '' check (length(caption_override) <= 600),
  related_project_id uuid references public.portfolio_items(id) on delete set null,
  display_order      integer not null default 0 check (display_order >= 0),
  is_active          boolean not null default false,
  created_by         uuid default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint media_placements_target_shape check (
    (target_type = 'site' and target_key = 'work' and slot = 'creative_showcase')
    or (target_type = 'service' and slot = 'showcase' and target_key in
          ('brand-positioning', 'digital-systems', 'creative-ugc', 'discovery-traffic', 'commerce-experience', 'retention-growth'))
    or (target_type = 'project' and slot = 'project_media'
          and target_key ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$')),
  constraint media_placements_custom_label check ((display_type = 'other') = (length(btrim(custom_label)) > 0)),
  constraint media_placements_related check (target_type <> 'project' or related_project_id is null),
  constraint media_placements_unique unique (target_type, target_key, slot, media_asset_id)
);

comment on table public.media_placements is 'Hbee media placements v1';

create index if not exists media_placements_target_idx on public.media_placements (target_type, target_key, slot, display_order);
create index if not exists media_placements_asset_idx on public.media_placements (media_asset_id);

create or replace function public.media_placements_check()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $fn$
declare
  asset_changes boolean := true;
begin
  -- The asset is checked when a placement is created or pointed at another asset, NOT on every update: otherwise an asset
  -- re-categorised later could never be hidden, and deleting its related project (which updates this row) would fail.
  -- The public read function independently excludes background video.
  if tg_op = 'UPDATE' then
    asset_changes := new.media_asset_id is distinct from old.media_asset_id;
  end if;
  if asset_changes and not exists (select 1 from public.media_assets a where a.id = new.media_asset_id
                   and (a.kind = 'image' or (a.kind = 'video' and a.category in ('video', 'ugc_video')))) then
    raise exception 'media_placements: only images and foreground video can be placed' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id or new.created_by is distinct from old.created_by or new.created_at is distinct from old.created_at then
      raise exception 'media_placements: identity columns are immutable' using errcode = '23514';
    end if;
  end if;
  new.updated_at := now();
  return new;
end
$fn$;
comment on function public.media_placements_check() is 'Hbee media placements v1';

drop trigger if exists media_placements_check on public.media_placements;
create trigger media_placements_check before insert or update on public.media_placements
  for each row execute function public.media_placements_check();

alter table public.media_placements enable row level security;
revoke all on public.media_placements from public, anon, authenticated;
grant select, insert, update, delete on public.media_placements to authenticated;
grant all on public.media_placements to service_role;

drop policy if exists media_placements_admin on public.media_placements;
create policy media_placements_admin on public.media_placements
  for all to authenticated
  using (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true))
  with check (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true));

-- The only public read path.  For projects, p_target_key is the project SLUG and the project must be active.
create or replace function public.get_media_showcase(p_target_type text, p_target_key text, p_slot text)
returns table (
  placement_id uuid, kind text, url text, mime_type text, width integer, height integer, duration_seconds numeric,
  alt_text text, is_decorative boolean, poster_url text, display_type text, custom_label text, title text, caption text,
  project_slug text, project_name text, captions_url text, transcript text
)
language sql
stable
security definer
set search_path = pg_catalog, public
as $fn$
  select p.id, a.kind, a.public_url, a.mime_type, a.width, a.height, a.duration_seconds,
         a.alt_text, a.is_decorative, poster.public_url, p.display_type, p.custom_label, p.title_override, p.caption_override,
         rp.slug::text,
         coalesce(nullif(btrim(to_jsonb(rp) ->> 'client_name'), ''), nullif(btrim(to_jsonb(rp) ->> 'name'), ''), nullif(btrim(to_jsonb(rp) ->> 'title'), '')),
         a.captions_url, a.transcript
    from public.media_placements p
    join public.media_assets a on a.id = p.media_asset_id
    left join public.media_assets poster on poster.id = a.poster_asset_id and poster.kind = 'image'
    left join public.portfolio_items rp on rp.id = p.related_project_id and rp.is_active = true
   where p.is_active
     and (a.kind = 'image' or a.category in ('video', 'ugc_video'))
     and p.target_type = p_target_type
     and p.slot = p_slot
     and case
           when p_target_type = 'project' then exists (
             select 1 from public.portfolio_items pi
              where pi.slug::text = p_target_key and pi.is_active = true and pi.id::text = p.target_key)
           else p.target_key = p_target_key
         end
   order by p.display_order, p.created_at, p.id
   limit 60
$fn$;
comment on function public.get_media_showcase(text, text, text) is 'Hbee media placements v1';

revoke all on function public.get_media_showcase(text, text, text) from public;
grant execute on function public.get_media_showcase(text, text, text) to anon, authenticated, service_role;
revoke all on function public.media_placements_check() from public, anon;

commit;
