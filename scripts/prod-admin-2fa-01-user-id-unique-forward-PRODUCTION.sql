-- =====================================================================================================================
-- admin_2fa(user_id) uniqueness.  PRODUCTION.  DRAFT — NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- The same change that was applied and verified on the staging project (scripts/admin-2fa-01-...-STAGING.sql), adapted for
-- production. Production state, read-only, reported by the owner: 1 active admin, admin_2fa 1 row / 1 enabled, 0 duplicate
-- user_id groups, 0 NULL user_id, secret NOT NULL, RLS ON, no browser grants, and NO unique constraint or index on user_id.
--
-- WHAT THIS DOES (and nothing else)
--   * adds exactly one named constraint:  UNIQUE (user_id)  as admin_2fa_user_id_key;
--   * ABORTS, changing nothing, if duplicates or NULL user_id exist (it never deletes or merges rows; a secret is involved);
--   * changes NO row data and does not touch the secret / backup_codes columns. `secret` stays NOT NULL;
--   * proves afterwards that every row is byte-identical to before: a digest of the whole table is computed INSIDE the
--     database before and after and compared. The digest is never returned and no secret value is ever selected or shown;
--   * preserves the existing enrolled admin (same row, same enabled flag).
--
-- BEFORE YOU RUN IT
--   1. Run scripts/prod-admin-2fa-03-verify-readonly.sql and keep the output (the "before" picture).
--   2. Choose a quiet moment: it takes a brief ACCESS EXCLUSIVE lock on a one-row table (lock_timeout 5s: if the table is busy
--      it fails fast and changes nothing).
--   3. In the SAME SQL-editor run, put this line FIRST (a deliberate production confirmation; the script refuses without it):
--          set hbee.confirm_production = 'yes';
--
-- AFTER: run scripts/prod-admin-2fa-03-verify-readonly.sql again. Rows / enabled must equal the "before" picture (1 / 1).
-- ROLLBACK: scripts/prod-admin-2fa-02-user-id-unique-rollback-PRODUCTION.sql (drops only this constraint).
--
-- APPLICATION COMPATIBILITY (checked in code): /api/admin/2fa/setup reads the row then inserts or updates; with the constraint a
-- true race on first enrollment makes the second insert fail with 23505 (reported as a generic "Setup failed"; the admin
-- retries). /api/admin/2fa/status, login and verify already read by user_id and are unaffected. The existing enrolled admin can
-- keep signing in with their authenticator throughout.
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';

do $guard$
declare
  v_dupes text;
  v_nulls bigint;
  v_secret_nullable text;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run to confirm this is the PRODUCTION project.';
  end if;

  if to_regclass('public.admin_2fa') is null then
    raise exception 'Refusing to run: public.admin_2fa does not exist.';
  end if;

  -- structure we rely on and must not change
  if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'admin_2fa' and column_name = 'user_id') then
    raise exception 'Refusing to run: admin_2fa.user_id not found.';
  end if;
  select is_nullable into v_secret_nullable from information_schema.columns where table_schema = 'public' and table_name = 'admin_2fa' and column_name = 'secret';
  if v_secret_nullable is distinct from 'NO' then
    raise exception 'Refusing to run: admin_2fa.secret is expected to be NOT NULL (found %). Investigate; this script does not alter it.', coalesce(v_secret_nullable, 'missing');
  end if;

  -- already applied / name taken?
  if exists (select 1 from pg_constraint c join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace where n.nspname = 'public' and t.relname = 'admin_2fa' and c.conname = 'admin_2fa_user_id_key') then
    raise exception 'Refusing to run: constraint admin_2fa_user_id_key already exists. Nothing to do (run the verifier).';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relname = 'admin_2fa_user_id_key') then
    raise exception 'Refusing to run: a relation named admin_2fa_user_id_key already exists (the constraint would create an index with that name).';
  end if;
  -- any other unique index on user_id alone would make this redundant: stop and let a human look
  if exists (
    select 1 from pg_index i
    join pg_class t on t.oid = i.indrelid join pg_namespace n on n.oid = t.relnamespace
    where n.nspname = 'public' and t.relname = 'admin_2fa' and i.indisunique and i.indnatts = 1
      and (select a.attname from pg_attribute a where a.attrelid = t.oid and a.attnum = i.indkey[0]) = 'user_id'
  ) then
    raise exception 'Refusing to run: a unique index on admin_2fa(user_id) already exists.';
  end if;

  -- DUPLICATES: abort with the user ids (never the secrets)
  select string_agg(user_id::text || ' (' || n::text || ' rows)', ', ')
    into v_dupes
  from (select user_id, count(*) as n from public.admin_2fa group by user_id having count(*) > 1) d;
  if v_dupes is not null then
    raise exception 'Refusing to continue: duplicate admin_2fa rows exist for: %. Resolve them by hand first (decide which enrollment to keep); this script never deletes or merges rows.', v_dupes;
  end if;

  select count(*) into v_nulls from public.admin_2fa where user_id is null;
  if v_nulls > 0 then
    raise exception 'Refusing to continue: % admin_2fa rows have a NULL user_id. UNIQUE would not constrain them; fix the data first.', v_nulls;
  end if;

  -- remember what the table looked like, to prove nothing changed. The digest covers every column of every row (including
  -- the secret) but is only ever compared inside the database; it is never selected or displayed.
  perform set_config('hbee.a2fa_rows', (select count(*) from public.admin_2fa)::text, true);
  perform set_config('hbee.a2fa_enabled', (select count(*) from public.admin_2fa where is_enabled is true)::text, true);
  perform set_config('hbee.a2fa_digest', (select coalesce(md5(string_agg(t::text, '|' order by t.user_id)), 'empty') from public.admin_2fa t), true);
end $guard$;

alter table public.admin_2fa add constraint admin_2fa_user_id_key unique (user_id);

do $post$
declare
  v_rows bigint; v_enabled bigint; v_digest text; v_secret_nullable text; v_cols text;
begin
  select count(*) into v_rows from public.admin_2fa;
  select count(*) into v_enabled from public.admin_2fa where is_enabled is true;
  if v_rows <> current_setting('hbee.a2fa_rows')::bigint or v_enabled <> current_setting('hbee.a2fa_enabled')::bigint then
    raise exception 'Post-condition failed: row or enabled counts changed (rows % -> %, enabled % -> %).',
      current_setting('hbee.a2fa_rows'), v_rows, current_setting('hbee.a2fa_enabled'), v_enabled;
  end if;

  select coalesce(md5(string_agg(t::text, '|' order by t.user_id)), 'empty') into v_digest from public.admin_2fa t;
  if v_digest is distinct from current_setting('hbee.a2fa_digest') then
    raise exception 'Post-condition failed: the content of admin_2fa changed. Nothing is committed.';
  end if;

  select is_nullable into v_secret_nullable from information_schema.columns where table_schema = 'public' and table_name = 'admin_2fa' and column_name = 'secret';
  if v_secret_nullable is distinct from 'NO' then
    raise exception 'Post-condition failed: admin_2fa.secret is no longer NOT NULL.';
  end if;

  select string_agg(a.attname, ',' order by k.ord) into v_cols
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid join pg_namespace n on n.oid = t.relnamespace
  cross join lateral unnest(c.conkey) with ordinality as k(attnum, ord)
  join pg_attribute a on a.attrelid = t.oid and a.attnum = k.attnum
  where n.nspname = 'public' and t.relname = 'admin_2fa' and c.conname = 'admin_2fa_user_id_key' and c.contype = 'u';
  if v_cols is distinct from 'user_id' then
    raise exception 'Post-condition failed: the constraint does not cover exactly (user_id); found %.', coalesce(v_cols, 'nothing');
  end if;
end $post$;

commit;
-- Then run scripts/prod-admin-2fa-03-verify-readonly.sql.
