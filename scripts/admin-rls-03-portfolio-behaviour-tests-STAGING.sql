-- =====================================================================================================================
-- Admin RLS — portfolio behaviour tests.  STAGING ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Proves, by actually acting as each kind of caller, that:
--   * an ordinary signed-in user (a uuid that is not in admin_users) CANNOT insert, update or delete portfolio items or
--     media, and sees only published rows;
--   * anon cannot write and sees only published rows (the public Work / Case Study pages keep working);
--   * an ACTIVE admin can insert/select/update/delete items and insert media;
--   * admin_users_select_own really limits an admin to their OWN row (a second, synthetic admin is created to prove it);
--   * a DEACTIVATED admin loses write access (is_active is honoured);
--   * service_role keeps working (RLS bypass for the trusted server).
--
-- NOTHING PERSISTS. Every fixture and every test write happens inside this single DO statement, which ENDS BY RAISING AN
-- EXCEPTION whose message is the report. PostgreSQL then rolls the whole statement back, so there is no data left behind
-- even if a step succeeds. THE "ERROR" YOU SEE IS THE REPORT, NOT A FAILURE OF THE SCRIPT: read its text. The first line is
-- either "PASS" or "FAIL".
--
-- Safeguards: refuses unless public._environment_marker holds env = 'staging'; needs at least one active admin_users row.
-- Uses only a synthetic second admin (user id generated here, email at example.invalid) and rows titled "rls-test-…".
-- Role switching (SET LOCAL ROLE) needs the postgres role to be a member of anon / authenticated / service_role, which is the
-- Supabase SQL-editor default. Any step that cannot switch role is reported SKIPPED, never silently passed.
--
-- NOT EXECUTED and NOT PARSED by the assistant (no Postgres or SQL parser was available locally): check for syntax errors on
-- staging and report any.
-- =====================================================================================================================

do $tests$
declare
  v_marker boolean := false;
  v_tag text := 'rls-test-' || replace(gen_random_uuid()::text, '-', '');
  v_admin uuid;
  v_admin2 uuid := gen_random_uuid();
  v_ordinary uuid := gen_random_uuid();
  v_item_active uuid;
  v_item_hidden uuid;
  v_media uuid;
  v_media_ok boolean := false;
  t record;
  v_n bigint;
  v_got text;
  v_flag text;
  v_uid uuid;
  v_report text := '';
  v_total int := 0;
  v_fail int := 0;
  v_skip int := 0;
begin
  -- guards
  if to_regclass('public._environment_marker') is not null then
    execute 'select exists (select 1 from public._environment_marker where env = ''staging'')' into v_marker;
  end if;
  if not v_marker then
    raise exception 'Refusing to run: no staging marker. This must never run against production.';
  end if;
  select user_id into v_admin from public.admin_users where is_active = true order by created_at limit 1;
  if v_admin is null then
    raise exception 'Refusing to run: there is no active admin_users row to act as.';
  end if;

  -- fixtures (as the table owner; rolled back with everything else)
  insert into public.portfolio_items (title, is_active) values (v_tag || '-active', true) returning id into v_item_active;
  insert into public.portfolio_items (title, is_active) values (v_tag || '-hidden', false) returning id into v_item_hidden;
  insert into public.admin_users (user_id, email, role, is_active) values (v_admin2, 'rls-test-admin2@example.invalid', 'admin', true);
  begin
    insert into public.portfolio_media (portfolio_id, asset_type, image_url, alt_text, is_visible)
    values (v_item_active, 'logo', 'https://example.invalid/rls-test.png', 'rls test', true) returning id into v_media;
    v_media_ok := true;
  exception when others then
    v_media_ok := false;   -- media tests are then reported SKIPPED
  end;

  for t in
    select * from (values
      -- (ord, role, who, description, statement, expect)   expect: BLOCK | ALLOW | a number
      (1,  'authenticated', 'ordinary', 'insert portfolio item',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-ordinary'), 'BLOCK'),
      (2,  'authenticated', 'ordinary', 'update published item',
           format($f$ with c as (update public.portfolio_items set title = title where id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (3,  'authenticated', 'ordinary', 'delete published item',
           format($f$ with c as (delete from public.portfolio_items where id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (4,  'authenticated', 'ordinary', 'sees only the published fixture',
           format($f$ select count(*) from public.portfolio_items where title like %L $f$, v_tag || '%'), '1'),
      (5,  'authenticated', 'ordinary', 'insert portfolio media',
           format($f$ with c as (insert into public.portfolio_media (portfolio_id, asset_type, image_url, alt_text) values (%L, 'logo', 'https://example.invalid/x.png', 'x') returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (6,  'authenticated', 'ordinary', 'update portfolio media',
           format($f$ with c as (update public.portfolio_media set alt_text = alt_text where portfolio_id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (7,  'authenticated', 'ordinary', 'delete portfolio media',
           format($f$ with c as (delete from public.portfolio_media where portfolio_id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (8,  'authenticated', 'ordinary', 'admin_users: sees no admin rows',
           $f$ select count(*) from public.admin_users $f$, '0'),
      (9,  'anon', 'anon', 'sees only the published fixture',
           format($f$ select count(*) from public.portfolio_items where title like %L $f$, v_tag || '%'), '1'),
      (10, 'anon', 'anon', 'insert portfolio item',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-anon'), 'BLOCK'),
      (11, 'anon', 'anon', 'update portfolio item',
           format($f$ with c as (update public.portfolio_items set title = title where id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (12, 'anon', 'anon', 'delete portfolio item',
           format($f$ with c as (delete from public.portfolio_items where id = %L returning 1) select count(*) from c $f$, v_item_active), 'BLOCK'),
      (13, 'anon', 'anon', 'admin_users is not readable',
           $f$ select count(*) from public.admin_users $f$, 'BLOCK'),
      (14, 'authenticated', 'admin1', 'insert portfolio item',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-admin1'), 'ALLOW'),
      (15, 'authenticated', 'admin1', 'sees published + hidden + own insert',
           format($f$ select count(*) from public.portfolio_items where title like %L $f$, v_tag || '%'), '3'),
      (16, 'authenticated', 'admin1', 'update a hidden item',
           format($f$ with c as (update public.portfolio_items set title = title where id = %L returning 1) select count(*) from c $f$, v_item_hidden), 'ALLOW'),
      (17, 'authenticated', 'admin1', 'delete the item it inserted',
           format($f$ with c as (delete from public.portfolio_items where title = %L returning 1) select count(*) from c $f$, v_tag || '-ins-admin1'), 'ALLOW'),
      (18, 'authenticated', 'admin1', 'insert portfolio media',
           format($f$ with c as (insert into public.portfolio_media (portfolio_id, asset_type, image_url, alt_text) values (%L, 'logo', 'https://example.invalid/y.png', 'y') returning 1) select count(*) from c $f$, v_item_active), 'ALLOW'),
      (19, 'authenticated', 'admin1', 'admin_users: sees exactly its own row',
           $f$ select count(*) from public.admin_users $f$, '1'),
      (20, 'authenticated', 'admin1', 'admin_users: cannot see another admin',
           format($f$ select count(*) from public.admin_users where user_id = %L $f$, v_admin2), '0'),
      (21, 'authenticated', 'admin2', 'admin_users: sees exactly its own row',
           $f$ select count(*) from public.admin_users $f$, '1'),
      (22, 'authenticated', 'admin2', 'insert portfolio item (active admin)',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-admin2'), 'ALLOW'),
      (23, 'postgres', 'owner', 'PREP: deactivate the synthetic admin',
           format($f$ with c as (update public.admin_users set is_active = false where user_id = %L returning 1) select count(*) from c $f$, v_admin2), 'ALLOW'),
      (24, 'authenticated', 'admin2', 'DEACTIVATED admin: insert portfolio item',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-admin2b'), 'BLOCK'),
      (25, 'authenticated', 'admin2', 'DEACTIVATED admin: sees only the published fixture',
           format($f$ select count(*) from public.portfolio_items where title like %L and title not like %L $f$, v_tag || '%', v_tag || '-ins-%'), '1'),
      (26, 'service_role', 'service', 'trusted server role: insert portfolio item',
           format($f$ with c as (insert into public.portfolio_items (title, is_active) values (%L, true) returning 1) select count(*) from c $f$, v_tag || '-ins-service'), 'ALLOW')
    ) as x(ord, role_name, who, descr, stmt, expect)
    order by ord
  loop
    v_total := v_total + 1;
    v_n := null; v_got := null;

    if t.descr like '%media%' and not v_media_ok then
      v_skip := v_skip + 1; v_total := v_total - 1;
      v_report := v_report || format(E'SKIP %s %-8s %-48s (media fixture could not be created: check portfolio_media columns)\n', lpad(t.ord::text, 2), t.who, t.descr);
      continue;
    end if;

    begin
      if t.role_name <> 'postgres' then
        v_uid := case t.who when 'ordinary' then v_ordinary when 'admin1' then v_admin when 'admin2' then v_admin2 else null end;
        perform set_config('request.jwt.claim.sub', coalesce(v_uid::text, ''), true);
        perform set_config('request.jwt.claims', json_build_object('sub', coalesce(v_uid::text, ''), 'role', t.role_name)::text, true);
        execute 'set local role ' || quote_ident(t.role_name);
      end if;

      begin
        execute t.stmt into v_n;
        v_got := v_n::text;
      exception when others then
        v_got := 'ERROR ' || sqlstate;
      end;

      execute 'reset role';
    exception when others then
      -- the role could not be assumed: report, do not pretend
      v_got := 'SKIPPED ' || sqlstate;
    end;

    if v_got like 'SKIPPED%' then
      v_skip := v_skip + 1; v_total := v_total - 1; v_flag := 'SKIP';
    elsif t.expect = 'BLOCK' then
      v_flag := case when v_got like 'ERROR%' or v_n = 0 then 'ok  ' else 'FAIL' end;
    elsif t.expect = 'ALLOW' then
      v_flag := case when v_got not like 'ERROR%' and v_n >= 1 then 'ok  ' else 'FAIL' end;
    else
      v_flag := case when v_got = t.expect then 'ok  ' else 'FAIL' end;
    end if;
    if v_flag = 'FAIL' then v_fail := v_fail + 1; end if;

    v_report := v_report || format(E'%s %s %-8s %-48s expect %-5s got %s\n', v_flag, lpad(t.ord::text, 2), t.who, t.descr, t.expect, coalesce(v_got, '-'));
  end loop;

  -- Always end by raising: this rolls back every fixture and every test write. The message IS the report.
  raise exception E'% — % tests run, % failed, % skipped\n(everything above was rolled back; the "error" is just the report)\n\n%',
    case when v_fail = 0 and v_total > 0 and v_skip = 0 then 'PASS' when v_fail = 0 and v_skip > 0 then 'INCONCLUSIVE (some steps skipped)' else 'FAIL' end,
    v_total, v_fail, v_skip, v_report;
end $tests$;
