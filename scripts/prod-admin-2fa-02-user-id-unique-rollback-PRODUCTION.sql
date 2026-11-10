-- =====================================================================================================================
-- Rollback of scripts/prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql.  PRODUCTION.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Drops ONLY the constraint the forward script added (admin_2fa_user_id_key). It changes no rows and no columns: `secret`
-- stays NOT NULL, backup_codes is untouched, the enrolled admin keeps working. After it, duplicate rows are possible again
-- (the original state). Refuses unless the constraint is exactly a UNIQUE constraint on (user_id) alone: it will not drop a
-- constraint of the same name with a different definition.
--
-- Put this line FIRST in the same SQL-editor run (deliberate production confirmation):
--     set hbee.confirm_production = 'yes';
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';

do $guard$
declare v_cols text;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run to confirm this is the PRODUCTION project.';
  end if;

  select string_agg(a.attname, ',' order by k.ord) into v_cols
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
  cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
  where n.nspname = 'public' and t.relname = 'admin_2fa' and c.conname = 'admin_2fa_user_id_key' and c.contype = 'u';
  if v_cols is null then
    raise exception 'Refusing to run: constraint admin_2fa_user_id_key does not exist as a UNIQUE constraint; nothing to roll back.';
  end if;
  if v_cols <> 'user_id' then
    raise exception 'Refusing to run: admin_2fa_user_id_key covers (%), not (user_id). It is not the constraint the forward script created.', v_cols;
  end if;
end $guard$;

alter table public.admin_2fa drop constraint admin_2fa_user_id_key;

do $post$
begin
  if exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname = 'admin_2fa' and c.conname = 'admin_2fa_user_id_key') then
    raise exception 'Rollback post-condition failed: the constraint is still present.';
  end if;
  if (select is_nullable from information_schema.columns where table_schema = 'public' and table_name = 'admin_2fa' and column_name = 'secret') is distinct from 'NO' then
    raise exception 'Rollback post-condition failed: admin_2fa.secret is not NOT NULL.';
  end if;
end $post$;

commit;
