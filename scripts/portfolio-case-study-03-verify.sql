-- PORTFOLIO CASE STUDY CLASSIFICATION v1 - READ-ONLY VERIFY, SINGLE RESULT - owner review; NOT EXECUTED by the author.
-- One SELECT, one JSON cell "case_study_verification". Counts and catalog facts only: no row contents, no ids.
-- Reading it:
--   column_ok            the column exists as boolean NOT NULL DEFAULT false with the v1 marker comment
--   anon_can_select / authenticated_can_select
--                        has_column_privilege(); false means a column-level grant is missing (REVIEW)
--   case_study_rows      how many parents are Case Studies. Right after 01-forward on existing data this must be 0.
--   Expected on a fresh apply: column_ok true, both privileges true, case_study_rows 0.
select jsonb_pretty(jsonb_build_object(
  'column_ok', coalesce((
    select format_type(a.atttypid, a.atttypmod) = 'boolean' and a.attnotnull
           and pg_get_expr(d.adbin, d.adrelid) = 'false'
           and coalesce(col_description(a.attrelid, a.attnum), '') = 'Hbee portfolio case study v1'
    from pg_attribute a
    left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
    where a.attrelid = to_regclass('public.portfolio_items') and a.attname = 'is_case_study' and not a.attisdropped
  ), false),
  'anon_can_select', case when to_regclass('public.portfolio_items') is null then null
    else (select bool_and(has_column_privilege('anon', 'public.portfolio_items', 'is_case_study', 'select'))
          where exists (select 1 from pg_attribute where attrelid = 'public.portfolio_items'::regclass and attname = 'is_case_study' and not attisdropped)) end,
  'authenticated_can_select', case when to_regclass('public.portfolio_items') is null then null
    else (select bool_and(has_column_privilege('authenticated', 'public.portfolio_items', 'is_case_study', 'select'))
          where exists (select 1 from pg_attribute where attrelid = 'public.portfolio_items'::regclass and attname = 'is_case_study' and not attisdropped)) end,
  'parent_rows', (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.portfolio_items', false, true, '')))[1]::text::int,
  'case_study_rows', case when exists (select 1 from pg_attribute where attrelid = to_regclass('public.portfolio_items') and attname = 'is_case_study' and not attisdropped)
    then (xpath('/row/n/text()', query_to_xml('select count(*) as n from public.portfolio_items where is_case_study', false, true, '')))[1]::text::int end,
  'note', 'case_study_rows should be 0 until an editor deliberately sets Presentation type = Case Study.'
)) as case_study_verification;
