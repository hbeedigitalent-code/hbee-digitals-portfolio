-- =====================================================================================================================
-- Staging environment marker (marker ONLY).  STAGING ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- WHY THIS EXISTS: every staging-only script in scripts/admin-rls-* and scripts/admin-2fa-* refuses to run unless
-- public._environment_marker holds env = 'staging'. The existing validated staging project already has that table (created by
-- portfolio-staging-01-bootstrap-structure.sql). A NEW staging project built from a schema-only export of production would not,
-- and this file creates it.
--
-- THE DANGER, AND THE SAFEGUARDS: a marker is only meaningful because production never carries one. If this file were run on
-- production it would make production look like staging and defeat every guard that depends on it. So it refuses to run:
--   1. unless the session opted in explicitly:   set hbee.allow_staging_marker = 'yes';
--   2. if ANY of the sentinel tables below holds even one row. Production is never empty; a fresh schema-only staging project
--      is. (Run this BEFORE creating the synthetic admin or any fixture row.)
--   3. if auth.users already holds ANY user: a fresh staging project has none yet. Create the synthetic admin user AFTER this
--      script. (The current staging project already has its marker and is not a target for this file.)
-- Tables absent from the project are skipped (a partial schema is fine); the project must still be a Supabase project.
--
-- Nothing else is created or changed. No data is copied. Idempotent: running it twice is a no-op.
-- =====================================================================================================================

do $guard$
declare
  v_t text;
  v_has_rows boolean;
  v_sentinels text[] := array['admin_users', 'admin_2fa', 'clients', 'merchants', 'merchant_accounts', 'contact_submissions',
                              'growth_assessments', 'growth_reviews', 'growth_profiles', 'leads', 'projects', 'proposals',
                              'subscribers', 'newsletter_subscribers', 'portfolio_items', 'blog_posts', 'messages'];
begin
  if coalesce(current_setting('hbee.allow_staging_marker', true), '') <> 'yes' then
    raise exception 'Refusing to run: set hbee.allow_staging_marker = ''yes'' in a STAGING session first.';
  end if;
  if to_regclass('auth.users') is null then
    raise exception 'Refusing to run: auth.users not found. This must be a Supabase project.';
  end if;
  if exists (select 1 from auth.users limit 1) then
    raise exception 'Refusing to run: auth.users already holds users. A fresh staging project has none; production does. Create synthetic users AFTER the marker.';
  end if;
  foreach v_t in array v_sentinels loop
    if to_regclass('public.' || v_t) is not null then
      execute format('select exists (select 1 from public.%I limit 1)', v_t) into v_has_rows;
      if v_has_rows then
        raise exception 'Refusing to run: public.% already holds rows. This looks like a real database, not a fresh staging schema.', v_t;
      end if;
    end if;
  end loop;
end $guard$;

begin;

create table if not exists public._environment_marker (
  env text primary key check (env = 'staging'),
  created_at timestamptz not null default now()
);
insert into public._environment_marker (env) values ('staging') on conflict do nothing;
alter table public._environment_marker enable row level security;
revoke all on public._environment_marker from public, anon, authenticated;

commit;
