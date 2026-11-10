-- PORTFOLIO CASE STUDY CLASSIFICATION v1 - FORWARD (additive) - owner review; NOT EXECUTED by the author.
-- Apply to STAGING first. Requires portfolio-creative-01-forward.sql (and its verification) to have been applied.
--
-- Adds exactly ONE column: public.portfolio_items.is_case_study boolean not null default false.
--   * Every existing row becomes false. NOTHING is promoted to a Case Study (no backfill, no UPDATE).
--   * A constant default is metadata-only on PostgreSQL 11+: no table rewrite.
--   * Independent of engagement_type: client / studio_team and Case Study are separate concepts.
--   * No grant, policy, trigger, function or storage change. The column is covered by the table's existing
--     RLS policies. If the table has COLUMN-level SELECT grants for anon, the verify script reports it
--     (a new column would not be readable until granted; table-level grants are unaffected).
--   * The application treats a missing column as is_case_study = false, so applying this later (or rolling it
--     back) never breaks the public site.
-- Safe to re-run: create-if-missing; an unexpected pre-existing column shape aborts the transaction.
begin;

do $case_study_guard$
declare col_type text; col_notnull boolean; col_default text;
begin
  if to_regclass('public.portfolio_items') is null then
    raise exception 'public.portfolio_items does not exist';
  end if;
  select format_type(a.atttypid, a.atttypmod), a.attnotnull, pg_get_expr(d.adbin, d.adrelid)
    into col_type, col_notnull, col_default
  from pg_attribute a
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where a.attrelid = 'public.portfolio_items'::regclass and a.attname = 'is_case_study' and not a.attisdropped;
  if col_type is not null and (col_type <> 'boolean' or not col_notnull or col_default is distinct from 'false'
      or coalesce(col_description('public.portfolio_items'::regclass,
           (select attnum from pg_attribute where attrelid = 'public.portfolio_items'::regclass and attname = 'is_case_study')), '') <> 'Hbee portfolio case study v1') then
    raise exception 'Existing portfolio_items.is_case_study column requires review (type %, not null %, default %)', col_type, col_notnull, col_default;
  end if;
end $case_study_guard$;

alter table public.portfolio_items add column if not exists is_case_study boolean not null default false;
comment on column public.portfolio_items.is_case_study is 'Hbee portfolio case study v1';

commit;
