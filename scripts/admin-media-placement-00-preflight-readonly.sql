-- =====================================================================================================================
-- Media placements -- PREFLIGHT.  READ-ONLY.  DRAFT -- NOT EXECUTED.
--
-- Run BEFORE admin-media-placement-01-forward.sql.  ONE statement, ONE result set. Reads catalog metadata only.
-- COLUMNS:  ord | check_name | actual | verdict   (PASS | FAIL | INFO).  Proceed only with zero FAIL rows.
-- =====================================================================================================================

with
checks(ord, check_name, actual, verdict) as (

  select 10, 'public.media_assets exists (Media Library applied)',
         case when to_regclass('public.media_assets') is null then 'missing' else 'present' end,
         case when to_regclass('public.media_assets') is null then 'FAIL' else 'PASS' end

  union all
  select 11, 'admin_users has user_id and is_active',
         (select count(*)::text || ' of 2 columns' from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')),
         case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active')) = 2 then 'PASS' else 'FAIL' end

  union all
  select 12, 'portfolio_items.id is uuid (related project and project placements)',
         coalesce((select data_type from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name = 'id'), 'missing'),
         case when (select data_type from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name = 'id') = 'uuid' then 'PASS' else 'FAIL' end

  union all
  select 13, 'portfolio_items has slug and is_active',
         (select count(*)::text || ' of 2 columns' from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name in ('slug', 'is_active')),
         case when (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'portfolio_items' and column_name in ('slug', 'is_active')) = 2 then 'PASS' else 'FAIL' end

  union all
  select 20, 'public.media_placements: absent, or already owned by this migration',
         case when to_regclass('public.media_placements') is null then 'absent' else coalesce(obj_description(to_regclass('public.media_placements'), 'pg_class'), 'present, no comment') end,
         case when to_regclass('public.media_placements') is null
                or obj_description(to_regclass('public.media_placements'), 'pg_class') = 'Hbee media placements v1' then 'PASS' else 'FAIL' end

  union all
  select 21, 'functions get_media_showcase / media_placements_check: absent or owned',
         coalesce((select string_agg(p.proname, ', ') from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname in ('get_media_showcase', 'media_placements_check')
                      and coalesce(obj_description(p.oid, 'pg_proc'), '') <> 'Hbee media placements v1'), 'none unowned'),
         case when exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                    where n.nspname = 'public' and p.proname in ('get_media_showcase', 'media_placements_check')
                      and coalesce(obj_description(p.oid, 'pg_proc'), '') <> 'Hbee media placements v1') then 'FAIL' else 'PASS' end

  union all
  select 22, 'media_assets.captions_url / transcript: absent, or already owned by this migration',
         coalesce((select string_agg(a.attname || ' ' || format_type(a.atttypid, a.atttypmod) || ' [' || coalesce(col_description(a.attrelid, a.attnum), 'no comment') || ']', ', ' order by a.attname)
                     from pg_attribute a where a.attrelid = to_regclass('public.media_assets') and a.attname in ('captions_url', 'transcript') and not a.attisdropped), 'absent'),
         case when exists (select 1 from pg_attribute a where a.attrelid = to_regclass('public.media_assets') and a.attname in ('captions_url', 'transcript') and not a.attisdropped
                             and (format_type(a.atttypid, a.atttypmod) <> 'text' or coalesce(col_description(a.attrelid, a.attnum), '') <> 'Hbee media placements v1'))
              then 'FAIL' else 'PASS' end

  union all
  select 30, 'portfolio creative tables (informational; NOT required and NOT changed by this migration)',
         case when to_regclass('public.portfolio_media') is null then 'portfolio_media absent' else 'portfolio_media present' end, 'INFO'
)
select ord, check_name, actual, verdict from checks order by ord;
