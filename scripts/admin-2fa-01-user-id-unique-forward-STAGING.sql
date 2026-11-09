-- =====================================================================================================================
-- admin_2fa(user_id) uniqueness.  STAGING FIRST.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- PROBLEM: public.admin_2fa has NO unique constraint or index on user_id (confirmed by the staging preflight). Nothing in the
-- database stops two rows for one admin. The application reads the row with maybeSingle(), so a duplicate makes that read
-- ERROR, and /api/admin/2fa/status then fails CLOSED (the admin is locked out) — correct, but a lockout the database should
-- make impossible. A race between two enrollment requests could also create one.
--
-- WHAT THIS DOES (and nothing else)
--   * refuses unless the staging marker exists (run production only by a separate, explicit owner decision: see the note at
--     the bottom);
--   * DETECTS duplicates first and ABORTS if any exist (it never deletes or merges rows: which duplicate to keep is a human
--     decision, and a secret is involved);
--   * adds exactly one named constraint, UNIQUE (user_id);
--   * leaves every row, every value and the secret/backup_codes columns untouched. `secret` stays NOT NULL. Nothing here
--     makes it nullable, and nothing re-introduces disabling 2FA;
--   * re-checks afterwards that the row count and the enabled count are exactly what they were.
--
-- ROLLBACK: scripts/admin-2fa-02-user-id-unique-rollback-STAGING.sql (drops only the constraint it added).
-- VERIFY:   scripts/admin-2fa-03-user-id-unique-verify-readonly.sql.
--
-- APPLICATION COMPATIBILITY (checked in code): /api/admin/2fa/setup reads the row then inserts or updates; with the constraint a
-- true race on first enrollment makes the second insert fail with 23505, which the route reports as a generic "Setup failed"
-- (the admin simply retries). /api/admin/2fa/status, login and verify already read by user_id and are unaffected.
--
-- Takes a brief ACCESS EXCLUSIVE lock on a tiny table (one row today). Run it when no admin is mid-enrollment.
-- =====================================================================================================================

begin;

do $guard$
declare
  v_marker boolean := false;
  v_dupes text;
  v_nulls bigint;
  v_secret_nullable text;
begin
  if to_regclass('public._environment_marker') is not null then
    execute 'select exists (select 1 from public._environment_marker where env = ''staging'')' into v_marker;
  end if;
  if not v_marker then
    raise exception 'Refusing to run: no staging marker (public._environment_marker env = staging). This draft is STAGING-first; production needs a separate, explicit owner decision.';
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
    raise exception 'Refusing to continue: duplicate admin_2fa rows exist for: %. Resolve them by hand first (decide which enrollment to keep; remove the others); this script never deletes or merges rows.', v_dupes;
  end if;

  select count(*) into v_nulls from public.admin_2fa where user_id is null;
  if v_nulls > 0 then
    raise exception 'Refusing to continue: % admin_2fa rows have a NULL user_id. UNIQUE would not constrain them; fix the data first.', v_nulls;
  end if;

  -- remember what the table looked like, to prove nothing changed
  perform set_config('hbee.a2fa_rows', (select count(*) from public.admin_2fa)::text, true);
  perform set_config('hbee.a2fa_enabled', (select count(*) from public.admin_2fa where is_enabled is true)::text, true);
end $guard$;

alter table public.admin_2fa add constraint admin_2fa_user_id_key unique (user_id);

do $post$
declare
  v_rows bigint; v_enabled bigint; v_secret_nullable text; v_cols text;
begin
  select count(*) into v_rows from public.admin_2fa;
  select count(*) into v_enabled from public.admin_2fa where is_enabled is true;
  if v_rows <> current_setting('hbee.a2fa_rows')::bigint or v_enabled <> current_setting('hbee.a2fa_enabled')::bigint then
    raise exception 'Post-condition failed: row or enabled counts changed (rows % -> %, enabled % -> %).',
      current_setting('hbee.a2fa_rows'), v_rows, current_setting('hbee.a2fa_enabled'), v_enabled;
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
-- Then run scripts/admin-2fa-03-user-id-unique-verify-readonly.sql.
-- PRODUCTION: do NOT adapt this file. After staging is verified, the owner decides separately; production additionally needs
-- its own read-only duplicate check first (scripts/admin-security-preflight-readonly.sql section 3) and an approved window.
