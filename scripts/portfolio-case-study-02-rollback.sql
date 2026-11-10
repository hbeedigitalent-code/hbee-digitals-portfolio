-- PORTFOLIO CASE STUDY CLASSIFICATION v1 - ROLLBACK - owner review; NOT EXECUTED by the author.
-- DESTRUCTIVE for one column only: drops public.portfolio_items.is_case_study (and the editorial choices stored in it).
-- It touches nothing else: no media, capabilities, classification, revision or legacy portfolio data.
--
-- Order: the application tolerates the column being absent (it reads as false = Standard Work), so no deploy is
-- required first. Items that were Case Studies simply return to /work/[slug]; /case-studies lists nothing.
-- To keep the data and only hide the feature, DO NOT run this: set NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED off instead.
-- Refuses to drop a column this migration did not create (comment marker + exact shape).
begin;

do $case_study_rollback$
begin
  if exists (
    select 1 from pg_attribute a
    where a.attrelid = 'public.portfolio_items'::regclass and a.attname = 'is_case_study' and not a.attisdropped
  ) then
    if coalesce(col_description('public.portfolio_items'::regclass,
         (select attnum from pg_attribute where attrelid = 'public.portfolio_items'::regclass and attname = 'is_case_study')), '') <> 'Hbee portfolio case study v1'
       or exists (select 1 from pg_attribute a where a.attrelid = 'public.portfolio_items'::regclass and a.attname = 'is_case_study' and not a.attisdropped and a.atttypid <> 'boolean'::regtype) then
      raise exception 'portfolio_items.is_case_study is not the column created by portfolio-case-study-01-forward.sql; not dropping it';
    end if;
    alter table public.portfolio_items drop column is_case_study;
  end if;
end $case_study_rollback$;

commit;
