-- PHASE C v3 DRAFT — OWNER REVIEW ONLY. NOT EXECUTED.
-- Run 00-preflight separately and review its output BEFORE this file.
-- Requires reviewed parent/admin RLS + grants and public storage policy evidence.
--
-- v3 changes over the earlier draft (all additive; nothing is dropped or rewritten):
--   * portfolio_media gains typed VIDEO support: media_kind ('image'|'video'),
--     title, description, video_url, captions_url, transcript. For a video the
--     existing image_url column IS the poster image and alt_text describes it, so
--     "required poster + required alt text" reuse the existing NOT NULL / non-blank
--     checks. Video rows additionally require video_url, a title and a description.
--   * portfolio_items gains controlled classification: engagement_type
--     ('client'|'studio_team', default 'studio_team') and project_status
--     ('completed'|'ongoing', default 'completed'). Existing rows therefore become
--     studio_team: NOTHING is labelled Client or Case study until an owner sets
--     engagement_type = 'client' explicitly.
--   * save_portfolio_creative keeps the SAME six-argument signature. New media keys
--     are optional in the JSON payload; an older client that omits them neither
--     fails nor overwrites stored video fields.
--   * Safe to run on a database where the earlier draft was already applied: every
--     step is create-if-missing / add-column-if-missing, and an unexpected existing
--     object still aborts the transaction.
-- OUT OF SCOPE here (see 04-optional-forward): deliverables list, social-image override.
begin;

do $migration$
declare id_type text; rel text; fn record; col text; col_type text;
begin
  select format_type(a.atttypid, a.atttypmod) into id_type
  from pg_attribute a where a.attrelid = 'public.portfolio_items'::regclass and a.attname = 'id' and not a.attisdropped;
  if id_type is null then raise exception 'portfolio_items.id must be verified first'; end if;
  if not exists (select 1 from pg_class where oid = 'public.portfolio_items'::regclass and relrowsecurity) then
    raise exception 'Review and enable portfolio_items RLS separately before Phase C';
  end if;
  foreach rel in array array['portfolio_media','portfolio_capabilities'] loop
    if to_regclass('public.' || rel) is not null and coalesce(obj_description(to_regclass('public.' || rel), 'pg_class'), '') <> 'Hbee portfolio creative Phase C v1' then
      raise exception 'Existing object % is not owned by this migration. Inspect before proceeding.', rel;
    end if;
  end loop;
  -- Run as the owner-reviewed schema migration role. Never silently take over
  -- another role's functions or an unrelated revision column.
  for fn in select p.oid, p.proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('save_portfolio_creative','bump_portfolio_creative_revision') loop
    if coalesce(obj_description(fn.oid,'pg_proc'),'') not in ('Hbee portfolio creative Phase C v1','Hbee portfolio creative Phase C v2','Hbee portfolio creative Phase C v3') or pg_get_userbyid(fn.proowner) <> current_user then
      raise exception 'Unexpected creative function owner/definition marker: %', fn.oid::regprocedure;
    end if;
  end loop;
  if exists (select 1 from pg_attribute a where a.attrelid='public.portfolio_items'::regclass and a.attname='creative_revision' and not a.attisdropped and (a.atttypid <> 'bigint'::regtype or not a.attnotnull or coalesce(col_description(a.attrelid,a.attnum),'') <> 'Hbee portfolio creative revision v1')) then
    raise exception 'Existing creative_revision column requires review';
  end if;
  -- Classification columns must not pre-exist with an unreviewed shape.
  foreach col in array array['engagement_type','project_status'] loop
    select format_type(a.atttypid,a.atttypmod) into col_type from pg_attribute a
      where a.attrelid='public.portfolio_items'::regclass and a.attname=col and not a.attisdropped;
    if col_type is not null and (col_type <> 'text' or coalesce(col_description('public.portfolio_items'::regclass,(select attnum from pg_attribute where attrelid='public.portfolio_items'::regclass and attname=col)),'') <> 'Hbee portfolio classification v1') then
      raise exception 'Existing portfolio_items.% column requires review', col;
    end if;
  end loop;
  execute format($ddl$
    create table if not exists public.portfolio_media (
      id uuid primary key default gen_random_uuid(),
      portfolio_id %s not null references public.portfolio_items(id) on delete cascade,
      asset_type text not null check (asset_type in ('logo','alternate-logo','identity-system','colour-palette','typography','stationery','flyer','social-creative','campaign-graphic','mockup','brand-application','packaging','website','storefront','other')),
      image_url text not null check ((image_url ~* '^https://[^[:space:]<>]+$' or (left(image_url,1) = '/' and left(image_url,2) <> '//' and length(image_url) > 1 and image_url !~ '[[:space:]<>]')) and image_url !~* '^https://[^/]*@' and position(chr(92) in image_url) = 0 and position(chr(34) in image_url) = 0 and position(chr(39) in image_url) = 0),
      alt_text text not null check (length(btrim(alt_text)) > 0),
      caption text not null default '',
      display_order integer not null default 0 check (display_order >= 0),
      is_visible boolean not null default false,
      fit_mode text not null default 'auto' check (fit_mode in ('auto','contain','cover')),
      width integer, height integer,
      created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
      check ((width is null and height is null) or (width is not null and height is not null and width between 1 and 20000 and height between 1 and 20000))
    )
  $ddl$, id_type);
  execute format($ddl$
    create table if not exists public.portfolio_capabilities (
      portfolio_id %s not null references public.portfolio_items(id) on delete cascade,
      capability_slug text not null check (capability_slug in ('brand-positioning','digital-systems','creative-ugc','discovery-traffic','commerce-experience','retention-growth')),
      created_at timestamptz not null default now(),
      primary key (portfolio_id, capability_slug)
    )
  $ddl$, id_type);
end $migration$;

-- Additive metadata only; no UPDATE/backfill of existing business/gallery fields.
alter table public.portfolio_items add column if not exists creative_revision bigint not null default 0;
comment on column public.portfolio_items.creative_revision is 'Hbee portfolio creative revision v1';
do $revision_check$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_items'::regclass and conname='portfolio_creative_revision_nonnegative') then
    alter table public.portfolio_items add constraint portfolio_creative_revision_nonnegative check (creative_revision >= 0);
  end if;
end $revision_check$;

-- ── Controlled classification (parent) ─────────────────────────────────────
-- Metadata-only defaults (constant defaults do not rewrite the table). The safe
-- default for engagement_type is the NON-claiming value: an unset, legacy or
-- hidden row can never be presented as Client work. The CHECK rejects every other
-- spelling, so an "unknown" type cannot be stored; public code must ALSO treat
-- anything other than the exact string 'client' as studio work (defence in depth,
-- covers a database where this migration has not run yet).
alter table public.portfolio_items add column if not exists engagement_type text not null default 'studio_team';
alter table public.portfolio_items add column if not exists project_status text not null default 'completed';
comment on column public.portfolio_items.engagement_type is 'Hbee portfolio classification v1';
comment on column public.portfolio_items.project_status is 'Hbee portfolio classification v1';
do $classification_check$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_items'::regclass and conname='portfolio_engagement_type_valid') then
    alter table public.portfolio_items add constraint portfolio_engagement_type_valid check (engagement_type in ('client','studio_team'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_items'::regclass and conname='portfolio_project_status_valid') then
    alter table public.portfolio_items add constraint portfolio_project_status_valid check (project_status in ('completed','ongoing'));
  end if;
end $classification_check$;

comment on table public.portfolio_media is 'Hbee portfolio creative Phase C v1';
comment on table public.portfolio_capabilities is 'Hbee portfolio creative Phase C v1';

-- ── Typed image + video assets (child) ─────────────────────────────────────
-- For media_kind = 'video', image_url is the REQUIRED POSTER and alt_text its
-- required description. video_url is an https file URL (hosting decision is an
-- owner decision, see the plan); captions_url and transcript are optional.
alter table public.portfolio_media add column if not exists media_kind text not null default 'image';
alter table public.portfolio_media add column if not exists title text not null default '';
alter table public.portfolio_media add column if not exists description text not null default '';
alter table public.portfolio_media add column if not exists video_url text;
alter table public.portfolio_media add column if not exists captions_url text;
alter table public.portfolio_media add column if not exists transcript text not null default '';
do $media_check$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_media'::regclass and conname='portfolio_media_kind_valid') then
    alter table public.portfolio_media add constraint portfolio_media_kind_valid check (media_kind in ('image','video'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_media'::regclass and conname='portfolio_media_text_lengths') then
    alter table public.portfolio_media add constraint portfolio_media_text_lengths check (length(title) <= 160 and length(description) <= 600 and length(caption) <= 1000 and length(alt_text) <= 300 and length(transcript) <= 20000);
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_media'::regclass and conname='portfolio_media_video_url_safe') then
    alter table public.portfolio_media add constraint portfolio_media_video_url_safe check (video_url is null or (video_url ~* '^https://[^[:space:]<>]+$' and video_url !~* '^https://[^/]*@' and position(chr(92) in video_url) = 0 and position(chr(34) in video_url) = 0 and position(chr(39) in video_url) = 0 and length(video_url) <= 2048));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_media'::regclass and conname='portfolio_media_captions_url_safe') then
    alter table public.portfolio_media add constraint portfolio_media_captions_url_safe check (captions_url is null or (captions_url ~* '^https://[^[:space:]<>]+$' and captions_url !~* '^https://[^/]*@' and position(chr(92) in captions_url) = 0 and position(chr(34) in captions_url) = 0 and position(chr(39) in captions_url) = 0 and length(captions_url) <= 2048));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.portfolio_media'::regclass and conname='portfolio_media_kind_shape') then
    alter table public.portfolio_media add constraint portfolio_media_kind_shape check (
      (media_kind = 'image' and video_url is null and captions_url is null and transcript = '')
      or (media_kind = 'video' and video_url is not null and length(btrim(title)) > 0 and length(btrim(description)) > 0));
  end if;
end $media_check$;

create index if not exists portfolio_media_parent_order on public.portfolio_media(portfolio_id, display_order, id);
create index if not exists portfolio_capabilities_slug_parent on public.portfolio_capabilities(capability_slug, portfolio_id);

alter table public.portfolio_media enable row level security;
alter table public.portfolio_capabilities enable row level security;
revoke all on public.portfolio_media, public.portfolio_capabilities from public, anon, authenticated;
grant select on public.portfolio_media, public.portfolio_capabilities to anon;
grant select, insert, update, delete on public.portfolio_media, public.portfolio_capabilities to authenticated;
-- Trusted server role retains its normal RLS bypass; never exposed to browsers.
grant select, insert, update, delete on public.portfolio_media, public.portfolio_capabilities to service_role;

drop policy if exists portfolio_media_published on public.portfolio_media;
create policy portfolio_media_published on public.portfolio_media for select to anon, authenticated
using (is_visible and exists (select 1 from public.portfolio_items p where p.id = portfolio_media.portfolio_id and p.is_active = true));
drop policy if exists portfolio_media_admin on public.portfolio_media;
create policy portfolio_media_admin on public.portfolio_media for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true));
drop policy if exists portfolio_capabilities_published on public.portfolio_capabilities;
create policy portfolio_capabilities_published on public.portfolio_capabilities for select to anon, authenticated
using (exists (select 1 from public.portfolio_items p where p.id = portfolio_capabilities.portfolio_id and p.is_active = true));
drop policy if exists portfolio_capabilities_admin on public.portfolio_capabilities;
create policy portfolio_capabilities_admin on public.portfolio_capabilities for all to authenticated
using (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true))
with check (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true));

-- Direct admin/server child DML must invalidate snapshots too. BEFORE triggers
-- acquire the parent lock before the child mutation. Reparenting bumps both
-- parents. These are invoker functions; existing parent UPDATE RLS still applies.
create or replace function public.bump_portfolio_creative_revision()
returns trigger language plpgsql security invoker set search_path = pg_catalog, public
as $bump$
begin
  if TG_OP = 'DELETE' then
    update public.portfolio_items set creative_revision=creative_revision+1 where id=OLD.portfolio_id;
    -- Parent already absent during ON DELETE CASCADE: no surviving snapshot.
    if not found and exists (select 1 from public.portfolio_items where id=OLD.portfolio_id) then raise exception 'Parent creative revision is not writable' using errcode='42501'; end if;
    return OLD;
  end if;
  if TG_OP = 'UPDATE' and OLD.portfolio_id is distinct from NEW.portfolio_id then
    update public.portfolio_items set creative_revision=creative_revision+1 where id=OLD.portfolio_id;
    if not found then raise exception 'Old parent creative revision is not writable' using errcode='42501'; end if;
  end if;
  update public.portfolio_items set creative_revision=creative_revision+1 where id=NEW.portfolio_id;
  if not found then raise exception 'Parent creative revision is not writable' using errcode='42501'; end if;
  return NEW;
end $bump$;
comment on function public.bump_portfolio_creative_revision() is 'Hbee portfolio creative Phase C v3';
drop trigger if exists portfolio_media_revision on public.portfolio_media;
create trigger portfolio_media_revision before insert or update or delete on public.portfolio_media for each row execute function public.bump_portfolio_creative_revision();
drop trigger if exists portfolio_capabilities_revision on public.portfolio_capabilities;
create trigger portfolio_capabilities_revision before insert or update or delete on public.portfolio_capabilities for each row execute function public.bump_portfolio_creative_revision();

-- One atomic save for child metadata + assignments; Phase B parent fields save separately.
-- SECURITY INVOKER: browser session permissions/RLS apply throughout.
-- Signature is UNCHANGED from v2. New asset keys (media_kind, title, description,
-- video_url, captions_url, transcript) are OPTIONAL: when a key is absent on an
-- existing asset its stored value is kept; on a new asset it takes the column default.
create or replace function public.save_portfolio_creative(p_portfolio_id text, p_media jsonb, p_capabilities text[], p_expected_revision bigint, p_clear_media boolean default false, p_clear_capabilities boolean default false)
returns text language plpgsql security invoker set search_path = pg_catalog, public
as $function$
declare asset jsonb; current_revision bigint;
begin
  if not exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true) then
    raise exception 'Active admin required' using errcode = '42501';
  end if;
  if p_media is null or jsonb_typeof(p_media) <> 'array' or p_capabilities is null then raise exception 'Invalid creative payload'; end if;
  if jsonb_array_length(p_media) > 100 then raise exception 'Maximum 100 assets per engagement'; end if;
  if cardinality(p_capabilities) > 6 or exists (select 1 from unnest(p_capabilities) s where s is null or s not in ('brand-positioning','digital-systems','creative-ugc','discovery-traffic','commerce-experience','retention-growth')) then raise exception 'Unsupported capability'; end if;
  if (select count(distinct s) from unnest(p_capabilities) s) <> cardinality(p_capabilities) then raise exception 'Duplicate capability'; end if;
  if (select count(distinct value->>'id') from jsonb_array_elements(p_media)) <> jsonb_array_length(p_media) then raise exception 'Asset IDs must be unique and present'; end if;
  if p_expected_revision is null or p_expected_revision < 0 or p_clear_media is null or p_clear_capabilities is null then raise exception 'Revision and explicit clear flags are required'; end if;
  if (p_clear_media and jsonb_array_length(p_media) <> 0) or (p_clear_capabilities and cardinality(p_capabilities) <> 0) then raise exception 'Clear intent requires an empty collection'; end if;
  select p.creative_revision into current_revision from public.portfolio_items p where p.id::text = p_portfolio_id for update;
  if not found then raise exception 'Portfolio item not found or not editable'; end if;
  if current_revision <> p_expected_revision then raise exception 'Creative metadata conflict: reload the latest revision before saving' using errcode='40001'; end if;
  -- At least one increment per successful save; child triggers may add more.
  -- Treat this as an opaque monotonic version, not a count of editor saves.
  update public.portfolio_items set creative_revision=creative_revision+1 where id::text=p_portfolio_id;
  if not found then raise exception 'Parent creative revision is not writable' using errcode='42501'; end if;
  if exists (select 1 from public.portfolio_media m join jsonb_array_elements(p_media) e on m.id = (e.value->>'id')::uuid where m.portfolio_id::text <> p_portfolio_id) then raise exception 'Asset belongs to another engagement'; end if;

  for asset in select value from jsonb_array_elements(p_media) loop
    -- Required metadata is constrained by the destination table. Any error rolls
    -- back this entire RPC, including removals and capability assignments.
    insert into public.portfolio_media(id, portfolio_id, asset_type, image_url, alt_text, caption, display_order, is_visible, fit_mode, width, height, media_kind, title, description, video_url, captions_url, transcript)
    select (asset->>'id')::uuid, p.id, asset->>'asset_type', asset->>'image_url', asset->>'alt_text', coalesce(asset->>'caption',''), (asset->>'display_order')::integer, (asset->>'is_visible')::boolean, asset->>'fit_mode', (asset->>'width')::integer, (asset->>'height')::integer,
           coalesce(asset->>'media_kind','image'), coalesce(asset->>'title',''), coalesce(asset->>'description',''), nullif(asset->>'video_url',''), nullif(asset->>'captions_url',''), coalesce(asset->>'transcript','')
    from public.portfolio_items p where p.id::text = p_portfolio_id
    on conflict (id) do update set asset_type = excluded.asset_type, image_url = excluded.image_url, alt_text = excluded.alt_text, caption = excluded.caption, display_order = excluded.display_order, is_visible = excluded.is_visible, fit_mode = excluded.fit_mode, width = excluded.width, height = excluded.height,
      media_kind = case when asset ? 'media_kind' then excluded.media_kind else public.portfolio_media.media_kind end,
      title = case when asset ? 'title' then excluded.title else public.portfolio_media.title end,
      description = case when asset ? 'description' then excluded.description else public.portfolio_media.description end,
      video_url = case when asset ? 'video_url' then excluded.video_url else public.portfolio_media.video_url end,
      captions_url = case when asset ? 'captions_url' then excluded.captions_url else public.portfolio_media.captions_url end,
      transcript = case when asset ? 'transcript' then excluded.transcript else public.portfolio_media.transcript end,
      updated_at = now()
    where public.portfolio_media.portfolio_id = excluded.portfolio_id;
    if not found then raise exception 'Asset does not belong to this engagement'; end if;
  end loop;
  if jsonb_array_length(p_media) > 0 or p_clear_media then
    delete from public.portfolio_media m where m.portfolio_id::text = p_portfolio_id and not exists (select 1 from jsonb_array_elements(p_media) e where (e.value->>'id')::uuid = m.id);
  end if;
  if cardinality(p_capabilities) > 0 or p_clear_capabilities then
    delete from public.portfolio_capabilities c where c.portfolio_id::text = p_portfolio_id;
    insert into public.portfolio_capabilities(portfolio_id, capability_slug)
    select p.id, s from public.portfolio_items p cross join unnest(p_capabilities) s where p.id::text = p_portfolio_id;
  end if;
  select p.creative_revision into current_revision from public.portfolio_items p where p.id::text=p_portfolio_id;
  return current_revision::text;
end $function$;
comment on function public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean) is 'Hbee portfolio creative Phase C v3';
-- Reset explicit/default ACL entries on ALL overloads, including the superseded
-- three-argument draft. Only the checked six-argument contract is re-granted.
do $rpc_acl$
declare fn record; acl_entry record;
begin
  for fn in select p.oid, p.proowner from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname in ('save_portfolio_creative','bump_portfolio_creative_revision') loop
    execute format('revoke all privileges on function %s from public cascade',fn.oid::regprocedure);
    for acl_entry in select distinct x.grantee from pg_proc p, lateral aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x where p.oid=fn.oid and x.grantee not in (0,fn.proowner) loop
      execute format('revoke all privileges on function %s from %I cascade',fn.oid::regprocedure,pg_get_userbyid(acl_entry.grantee));
    end loop;
  end loop;
end $rpc_acl$;
grant execute on function public.save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean) to authenticated;
-- Trigger execution only, no callable trigger RPC; trusted server DML retained.
grant execute on function public.bump_portfolio_creative_revision() to authenticated, service_role;
commit;
