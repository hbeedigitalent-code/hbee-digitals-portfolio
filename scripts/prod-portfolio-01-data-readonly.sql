-- =====================================================================================================================
-- Portfolio CMS + Case Studies: READ-ONLY DATA CHECK of the existing production portfolio_items rows.  NOT EXECUTED.
--
-- One statement, one JSON cell ("portfolio_data_check"). COUNTS ONLY: no project name, slug, URL, text or id is returned, and
-- nothing is modified. Reads columns through to_jsonb(), so a column that does not exist reads as NULL instead of failing.
--
--   rows                   total / active / inactive
--   slugs                  null-or-blank, invalid for a public URL (pattern ^[a-z0-9_]+(-[a-z0-9_]+)*$ or the reserved slug
--                          'portfolio'), duplicate groups (any row, and among ACTIVE rows - those two cannot both own a URL)
--   public_rendering       ACTIVE rows the public site would skip: no usable slug, or no client_name / name / title
--   images                 ACTIVE rows with no legacy image at all (informational; typed media can supply a cover)
--   new_objects_conflict   anything the forward creates that already exists (must be empty)
--   constraint_check       would any existing row violate the NEW constraints? The new columns do not exist yet, so the answer is
--                          structural: every row takes the constant defaults engagement_type='studio_team', project_status='completed',
--                          is_case_study=false, creative_revision=0, all of which satisfy the new CHECKs. If a column already exists
--                          (it should not) its violators are counted here.
--   verdict                'OK' when nothing below needs a decision; otherwise the list of items
-- =====================================================================================================================

with
rows_ as (
  select to_jsonb(t) as j from public.portfolio_items t
),
r as (
  select j,
         nullif(btrim(j ->> 'slug'), '') as slug,
         coalesce((j ->> 'is_active')::boolean, false) as active,
         coalesce(nullif(btrim(j ->> 'client_name'), ''), nullif(btrim(j ->> 'name'), ''), nullif(btrim(j ->> 'title'), '')) as client,
         coalesce(nullif(btrim(j ->> 'image_url'), ''), nullif(btrim(j ->> 'featured_image'), ''), nullif(btrim(j ->> 'after_image'), '')) as image
    from rows_
),
valid as (
  select r.*, (slug is not null and slug ~ '^[a-z0-9_]+(-[a-z0-9_]+)*$' and slug <> 'portfolio') as slug_ok from r
),
dups as (
  select slug, count(*) as n, count(*) filter (where active) as n_active from valid where slug is not null group by slug having count(*) > 1
),
conflicts as (
  select 'table ' || x as obj from unnest(array['portfolio_media', 'portfolio_capabilities']) x where to_regclass('public.' || x) is not null
  union all
  select 'column portfolio_items.' || a.attname from pg_attribute a
   where a.attrelid = 'public.portfolio_items'::regclass and not a.attisdropped and a.attname in ('creative_revision', 'engagement_type', 'project_status', 'is_case_study')
),
agg as (
  select count(*) as total, count(*) filter (where active) as active_n, count(*) filter (where not active) as inactive_n,
         count(*) filter (where slug is null) as slug_missing,
         count(*) filter (where slug is not null and not slug_ok) as slug_invalid,
         count(*) filter (where active and not slug_ok) as active_slug_unusable,
         count(*) filter (where active and client is null) as active_no_name,
         count(*) filter (where active and (not slug_ok or client is null)) as active_skipped_publicly,
         count(*) filter (where active and image is null) as active_no_image,
         count(*) filter (where j ? 'engagement_type' and (j ->> 'engagement_type') not in ('client', 'studio_team')) as bad_engagement,
         count(*) filter (where j ? 'project_status' and (j ->> 'project_status') not in ('completed', 'ongoing')) as bad_status
    from valid
)
select jsonb_pretty(jsonb_build_object(
  'rows', jsonb_build_object('total', a.total, 'active', a.active_n, 'inactive', a.inactive_n),
  'slugs', jsonb_build_object(
    'null_or_blank', a.slug_missing,
    'invalid_for_public_url', a.slug_invalid,
    'duplicate_slug_groups', (select count(*) from dups),
    'rows_in_duplicate_groups', (select coalesce(sum(n), 0) from dups),
    'duplicate_groups_among_active_rows', (select count(*) from dups where n_active > 1)),
  'public_rendering', jsonb_build_object('active_rows_the_site_would_skip', a.active_skipped_publicly, 'active_without_usable_slug', a.active_slug_unusable, 'active_without_client_name', a.active_no_name),
  'images', jsonb_build_object('active_rows_without_a_legacy_image', a.active_no_image),
  'new_objects_conflict', (select coalesce(jsonb_agg(obj order by obj), '[]'::jsonb) from conflicts),
  'constraint_check', jsonb_build_object(
    'existing_rows_violating_new_constraints', 0,
    'reason', 'new columns take constant safe defaults that satisfy every new CHECK; counts below apply only if a column already exists',
    'invalid_engagement_type_rows', a.bad_engagement, 'invalid_project_status_rows', a.bad_status),
  'verdict', case when (select count(*) from conflicts) = 0 and a.bad_engagement = 0 and a.bad_status = 0 and (select count(*) from dups where n_active > 1) = 0
                  then 'OK: the forward can preserve every row' else 'REVIEW: see new_objects_conflict / duplicate_groups_among_active_rows' end,
  'note', 'Slug, duplicate and skipped-row counts describe the CURRENT site; this migration does not change any of them. They are listed so you know before Case Study routing starts relying on slugs.'
)) as portfolio_data_check
from agg a;
