-- =====================================================================================================================
-- Behaviour test for the production RLS + grant hardening.  ROLLBACK-ONLY.  DRAFT — NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- Proves, by acting as each kind of caller, that after scripts/prod-rls-01 …
--   * anon and an ordinary signed-in user (a random uuid that is in neither admin_users nor clients) CANNOT insert, update or delete
--     on the 8 modified tables, and cannot read the admin-only tables;
--   * an ACTIVE admin can still update / delete on the admin-managed tables, and read contact_submissions, email_templates,
--     email_settings (no error);
--   * a signed-in client sees only their own clients row;
--   * the public site still works: anon can read the public content tables and insert into subscribers and blog_comments;
--   * subscribers can no longer be updated by anyone from a browser role (the old "Public can unsubscribe" policy);
--   * contact_submissions accepts no browser-role insert, while service_role still has full DML on the form tables;
--   * no browser role holds TRUNCATE / TRIGGER / REFERENCES on any of the 16 tables.
--
-- NOTHING CAN PERSIST.  Every attempt happens inside this ONE DO statement, which ALWAYS ENDS BY RAISING AN EXCEPTION whose
-- message is the report; PostgreSQL then rolls the whole statement back, including any row an attempt (wrongly) managed to change.
-- THE "ERROR" YOU SEE IS THE REPORT, NOT A FAILURE OF THE SCRIPT.  Line one is PASS or FAIL.
--
-- Verdicts per check:  PASS | FAIL | INCONCLUSIVE (the attempt hit an unrelated error such as a NOT NULL violation, a missing table,
-- a missing fixture or a role switch that is not permitted — it proves nothing either way and is listed, never counted as a pass).
--
-- WHERE TO RUN IT.  The recommended place is a staging copy that has the same policy state as production after prod-rls-01.  On
-- production it can be run only with an explicit opt-in because it issues real write attempts (all rolled back, never committed):
--      set hbee.confirm_rollback_test = 'yes';
-- It refuses unless the forward migration was applied (public._hbee_a4_rls_backup exists), unless you also set
--      set hbee.allow_before_forward = 'yes';      -- baseline run: the old unsafe policies should then show up as FAIL lines
-- LIMIT: an UPDATE/DELETE attempt by a non-admin passes when no row is visible to that caller (RLS filters first), which on an EMPTY table proves little;
-- the catalog verifier (prod-rls-03) and the admin NOERR checks cover that case.
-- Role switching needs the postgres role to be a member of anon / authenticated / service_role (the Supabase SQL-editor default).
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

do $tests$
declare
  v_admin uuid;
  v_client uuid;
  v_ordinary uuid := gen_random_uuid();
  t record;
  v_uid uuid;
  v_role text;
  v_col text;
  v_stmt text;
  v_rows bigint;
  v_state text;
  v_verdict text;
  v_report text := '';
  v_total int := 0;
  v_fail int := 0;
  v_inc int := 0;
  v_priv boolean;
  v_privs text[] := array['TRUNCATE', 'TRIGGER', 'REFERENCES'];
  v_tables text[] := array['about_page', 'about_stats', 'about_values', 'blog_categories', 'blog_comments', 'client_onboarding_submissions', 'clients',
                           'contact_submissions', 'email_settings', 'email_templates', 'notifications', 'pricing_packages', 'project_requests',
                           'subscribers', 'trust_section', 'video_testimonials'];
  v_x text;
  v_r text;
begin
  -- guards ---------------------------------------------------------------------------------------------------------
  if coalesce(current_setting('hbee.confirm_rollback_test', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_rollback_test = ''yes'';  first. This test only ever rolls back, but it issues real write attempts.';
  end if;
  if to_regclass('public._hbee_a4_rls_backup') is null and coalesce(current_setting('hbee.allow_before_forward', true), '') <> 'yes' then
    raise exception 'Refusing to run: prod-rls-01 has not been applied here (no public._hbee_a4_rls_backup). Apply it first, or set hbee.allow_before_forward = ''yes'' for a baseline run.';
  end if;
  select user_id into v_admin from public.admin_users where is_active = true limit 1;
  select user_id into v_client from public.clients where user_id is not null limit 1;

  -- A. privilege matrix checks (catalog, as the owner) ------------------------------------------------------------------
  foreach v_x in array v_tables loop
    if to_regclass('public.' || v_x) is null then
      v_total := v_total + 1; v_inc := v_inc + 1; v_report := v_report || format(E'INCONCLUSIVE | privileges | public.%s does not exist\n', v_x);
      continue;
    end if;
    foreach v_r in array array['anon', 'authenticated'] loop
      for t in select unnest(v_privs) as p loop
        v_total := v_total + 1;
        v_priv := has_table_privilege(v_r, 'public.' || v_x, t.p);
        if v_priv then v_fail := v_fail + 1; v_report := v_report || format(E'FAIL | privileges | %s holds %s on %s (must be revoked)\n', v_r, t.p, v_x); end if;
      end loop;
    end loop;
  end loop;

  for t in select * from (values
      -- (role, table, privilege, expected)
      ('anon', 'subscribers', 'INSERT', true), ('anon', 'blog_comments', 'INSERT', true),
      ('anon', 'about_page', 'SELECT', true), ('anon', 'blog_categories', 'SELECT', true), ('anon', 'pricing_packages', 'SELECT', true),
      ('anon', 'trust_section', 'SELECT', true), ('anon', 'video_testimonials', 'SELECT', true), ('anon', 'blog_comments', 'SELECT', true),
      ('anon', 'contact_submissions', 'INSERT', false), ('authenticated', 'contact_submissions', 'INSERT', false),
      ('anon', 'subscribers', 'UPDATE', false), ('authenticated', 'subscribers', 'UPDATE', false),
      ('anon', 'about_page', 'UPDATE', false), ('anon', 'email_settings', 'SELECT', false), ('anon', 'email_templates', 'SELECT', false),
      ('anon', 'about_stats', 'SELECT', false), ('anon', 'about_values', 'SELECT', false),
      ('service_role', 'contact_submissions', 'INSERT', true), ('service_role', 'contact_submissions', 'SELECT', true),
      ('service_role', 'client_onboarding_submissions', 'INSERT', true), ('service_role', 'clients', 'UPDATE', true),
      ('service_role', 'notifications', 'INSERT', true), ('service_role', 'project_requests', 'UPDATE', true)
    ) as x(role_name, tablename, priv, expected) loop
    v_total := v_total + 1;
    if to_regclass('public.' || t.tablename) is null then
      v_inc := v_inc + 1; v_report := v_report || format(E'INCONCLUSIVE | privileges | public.%s does not exist\n', t.tablename); continue;
    end if;
    v_priv := has_table_privilege(t.role_name, 'public.' || t.tablename, t.priv);
    if v_priv is distinct from t.expected then
      v_fail := v_fail + 1; v_report := v_report || format(E'FAIL | privileges | %s %s on %s: expected %s, found %s\n', t.role_name, t.priv, t.tablename, t.expected, v_priv);
    end if;
  end loop;

  -- B. behaviour: act as each caller ----------------------------------------------------------------------------------
  for t in select * from (values
      -- (who, table, op, expect)   who: anon | ordinary | admin | client | service
      -- expect: BLOCK (write must not succeed) | NOROWS (read must return nothing or error) | NOERR (must run without error)
      ('anon', 'about_page', 'insert', 'BLOCK'), ('anon', 'about_page', 'update', 'BLOCK'), ('anon', 'about_page', 'delete', 'BLOCK'),
      ('ordinary', 'about_page', 'insert', 'BLOCK'), ('ordinary', 'about_page', 'update', 'BLOCK'), ('ordinary', 'about_page', 'delete', 'BLOCK'),
      ('admin', 'about_page', 'update', 'NOERR'),
      ('anon', 'blog_categories', 'insert', 'BLOCK'), ('anon', 'blog_categories', 'update', 'BLOCK'), ('anon', 'blog_categories', 'delete', 'BLOCK'),
      ('ordinary', 'blog_categories', 'insert', 'BLOCK'), ('ordinary', 'blog_categories', 'update', 'BLOCK'), ('ordinary', 'blog_categories', 'delete', 'BLOCK'),
      ('admin', 'blog_categories', 'update', 'NOERR'), ('admin', 'blog_categories', 'delete', 'NOERR'),
      ('anon', 'contact_submissions', 'insert', 'BLOCK'), ('anon', 'contact_submissions', 'update', 'BLOCK'), ('anon', 'contact_submissions', 'delete', 'BLOCK'),
      ('ordinary', 'contact_submissions', 'insert', 'BLOCK'), ('ordinary', 'contact_submissions', 'update', 'BLOCK'), ('ordinary', 'contact_submissions', 'delete', 'BLOCK'),
      ('anon', 'contact_submissions', 'select', 'NOROWS'), ('ordinary', 'contact_submissions', 'select', 'NOROWS'),
      ('admin', 'contact_submissions', 'select', 'NOERR'), ('admin', 'contact_submissions', 'update', 'NOERR'), ('admin', 'contact_submissions', 'delete', 'NOERR'),
      ('anon', 'email_templates', 'insert', 'BLOCK'), ('anon', 'email_templates', 'update', 'BLOCK'), ('anon', 'email_templates', 'delete', 'BLOCK'),
      ('ordinary', 'email_templates', 'insert', 'BLOCK'), ('ordinary', 'email_templates', 'update', 'BLOCK'), ('ordinary', 'email_templates', 'delete', 'BLOCK'),
      ('anon', 'email_templates', 'select', 'NOROWS'), ('ordinary', 'email_templates', 'select', 'NOROWS'), ('admin', 'email_templates', 'select', 'NOERR'),
      ('anon', 'pricing_packages', 'insert', 'BLOCK'), ('anon', 'pricing_packages', 'update', 'BLOCK'), ('anon', 'pricing_packages', 'delete', 'BLOCK'),
      ('ordinary', 'pricing_packages', 'insert', 'BLOCK'), ('ordinary', 'pricing_packages', 'update', 'BLOCK'), ('ordinary', 'pricing_packages', 'delete', 'BLOCK'),
      ('admin', 'pricing_packages', 'update', 'NOERR'),
      ('anon', 'subscribers', 'update', 'BLOCK'), ('ordinary', 'subscribers', 'update', 'BLOCK'), ('admin', 'subscribers', 'update', 'BLOCK'),
      ('anon', 'subscribers', 'delete', 'BLOCK'), ('ordinary', 'subscribers', 'delete', 'BLOCK'),
      ('anon', 'subscribers', 'select', 'NOROWS'), ('ordinary', 'subscribers', 'select', 'NOROWS'),
      ('anon', 'trust_section', 'insert', 'BLOCK'), ('anon', 'trust_section', 'update', 'BLOCK'), ('anon', 'trust_section', 'delete', 'BLOCK'),
      ('ordinary', 'trust_section', 'insert', 'BLOCK'), ('ordinary', 'trust_section', 'update', 'BLOCK'), ('ordinary', 'trust_section', 'delete', 'BLOCK'),
      ('admin', 'trust_section', 'update', 'NOERR'),
      ('anon', 'video_testimonials', 'insert', 'BLOCK'), ('anon', 'video_testimonials', 'update', 'BLOCK'), ('anon', 'video_testimonials', 'delete', 'BLOCK'),
      ('ordinary', 'video_testimonials', 'insert', 'BLOCK'), ('ordinary', 'video_testimonials', 'update', 'BLOCK'), ('ordinary', 'video_testimonials', 'delete', 'BLOCK'),
      ('admin', 'video_testimonials', 'update', 'NOERR'),
      -- public site reads keep working
      ('anon', 'about_page', 'select', 'NOERR'), ('anon', 'blog_categories', 'select', 'NOERR'), ('anon', 'pricing_packages', 'select', 'NOERR'),
      ('anon', 'trust_section', 'select', 'NOERR'), ('anon', 'video_testimonials', 'select', 'NOERR'), ('anon', 'blog_comments', 'select', 'NOERR'),
      ('ordinary', 'about_page', 'select', 'NOERR'), ('ordinary', 'pricing_packages', 'select', 'NOERR'), ('ordinary', 'trust_section', 'select', 'NOERR'),
      -- comments: public may insert, only an admin moderates
      ('anon', 'blog_comments', 'update', 'BLOCK'), ('anon', 'blog_comments', 'delete', 'BLOCK'),
      ('ordinary', 'blog_comments', 'update', 'BLOCK'), ('ordinary', 'blog_comments', 'delete', 'BLOCK'),
      -- admin-only / not-readable tables
      ('anon', 'email_settings', 'select', 'NOROWS'), ('ordinary', 'email_settings', 'select', 'NOROWS'), ('admin', 'email_settings', 'select', 'NOERR'),
      ('anon', 'about_stats', 'select', 'NOROWS'), ('ordinary', 'about_stats', 'select', 'NOROWS'),
      ('anon', 'about_values', 'select', 'NOROWS'), ('ordinary', 'about_values', 'select', 'NOROWS'),
      ('anon', 'client_onboarding_submissions', 'select', 'NOROWS'), ('ordinary', 'client_onboarding_submissions', 'select', 'NOROWS'),
      ('anon', 'client_onboarding_submissions', 'insert', 'BLOCK'), ('ordinary', 'client_onboarding_submissions', 'insert', 'BLOCK'),
      -- client-own tables
      ('anon', 'clients', 'select', 'NOROWS'), ('ordinary', 'clients', 'select', 'NOROWS'),
      ('anon', 'notifications', 'select', 'NOROWS'), ('ordinary', 'notifications', 'select', 'NOROWS'),
      ('anon', 'project_requests', 'select', 'NOROWS'), ('ordinary', 'project_requests', 'select', 'NOROWS'),
      ('anon', 'project_requests', 'insert', 'BLOCK'), ('ordinary', 'project_requests', 'insert', 'BLOCK'),
      -- the service role keeps working
      ('service', 'contact_submissions', 'select', 'NOERR'), ('service', 'client_onboarding_submissions', 'select', 'NOERR'),
      ('service', 'clients', 'select', 'NOERR'), ('service', 'notifications', 'select', 'NOERR'), ('service', 'project_requests', 'select', 'NOERR'),
      ('service', 'email_templates', 'select', 'NOERR'), ('service', 'subscribers', 'select', 'NOERR'), ('service', 'about_page', 'select', 'NOERR')
    ) as x(who, tablename, op, expect) loop
    v_total := v_total + 1;
    execute 'reset role';

    if to_regclass('public.' || t.tablename) is null then
      v_inc := v_inc + 1; v_report := v_report || format(E'INCONCLUSIVE | %s %s %s | table does not exist\n', t.who, t.op, t.tablename); continue;
    end if;
    v_uid := null; v_role := null;
    if t.who = 'anon' then v_role := 'anon';
    elsif t.who = 'ordinary' then v_role := 'authenticated'; v_uid := v_ordinary;
    elsif t.who = 'admin' then v_role := 'authenticated'; v_uid := v_admin;
    elsif t.who = 'client' then v_role := 'authenticated'; v_uid := v_client;
    elsif t.who = 'service' then v_role := 'service_role';
    end if;
    if t.who in ('admin', 'client') and v_uid is null then
      v_inc := v_inc + 1; v_report := v_report || format(E'INCONCLUSIVE | %s %s %s | no %s fixture exists in this database\n', t.who, t.op, t.tablename, t.who); continue;
    end if;

    -- a column that can be updated to itself (chosen as the owner)
    select column_name into v_col from information_schema.columns
     where table_schema = 'public' and table_name = t.tablename and is_generated = 'NEVER' and coalesce(identity_generation, '') <> 'ALWAYS'
     order by ordinal_position limit 1;
    v_stmt := case t.op
      when 'select' then format('select count(*) from public.%I', t.tablename)
      when 'insert' then format('with c as (insert into public.%I default values returning 1) select count(*) from c', t.tablename)
      when 'update' then format('with c as (update public.%1$I set %2$I = %2$I where ctid in (select ctid from public.%1$I limit 1) returning 1) select count(*) from c', t.tablename, v_col)
      when 'delete' then format('with c as (delete from public.%1$I where ctid in (select ctid from public.%1$I limit 1) returning 1) select count(*) from c', t.tablename)
    end;

    v_rows := null; v_state := 'ok';
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', coalesce(v_uid::text, ''), 'role', coalesce(v_role, 'anon'))::text, true);
      perform set_config('request.jwt.claim.sub', coalesce(v_uid::text, ''), true);
      perform set_config('role', v_role, true);
      execute v_stmt into v_rows;
    exception when others then
      v_state := 'err:' || sqlstate;
      v_rows := null;
    end;
    execute 'reset role';

    v_verdict := 'PASS';
    if t.expect = 'BLOCK' then
      if v_state = 'err:42501' then v_verdict := 'PASS';
      elsif v_state = 'ok' and coalesce(v_rows, 0) = 0 and t.op <> 'insert' then v_verdict := 'PASS';
      elsif v_state = 'ok' then v_verdict := 'FAIL';
      else v_verdict := 'INCONCLUSIVE'; end if;
    elsif t.expect = 'NOROWS' then
      if v_state = 'err:42501' or (v_state = 'ok' and coalesce(v_rows, 0) = 0) then v_verdict := 'PASS';
      elsif v_state = 'ok' then v_verdict := 'FAIL';
      else v_verdict := 'INCONCLUSIVE'; end if;
    else  -- NOERR
      if v_state = 'ok' then v_verdict := 'PASS';
      elsif v_state = 'err:42501' then v_verdict := 'FAIL';
      else v_verdict := 'INCONCLUSIVE'; end if;
    end if;

    if v_verdict = 'FAIL' then v_fail := v_fail + 1; elsif v_verdict = 'INCONCLUSIVE' then v_inc := v_inc + 1; end if;
    if v_verdict <> 'PASS' then
      v_report := v_report || format(E'%s | %s %s %s | expected %s | got %s%s\n', v_verdict, t.who, t.op, t.tablename, t.expect, v_state, case when v_rows is not null then ' rows=' || v_rows else '' end);
    end if;
  end loop;

  -- C. a signed-in client sees only their own clients row ------------------------------------------------------------
  v_total := v_total + 1;
  if v_client is null then
    v_inc := v_inc + 1; v_report := v_report || E'INCONCLUSIVE | client sees only own clients row | no clients row with a user_id exists here\n';
  else
    v_rows := null; v_state := 'ok';
    begin
      perform set_config('request.jwt.claims', json_build_object('sub', v_client::text, 'role', 'authenticated')::text, true);
      perform set_config('request.jwt.claim.sub', v_client::text, true);
      perform set_config('role', 'authenticated', true);
      execute format('select count(*) from public.clients where user_id is distinct from %L', v_client) into v_rows;
    exception when others then
      v_state := 'err:' || sqlstate;
    end;
    execute 'reset role';
    if v_state = 'ok' and v_rows = 0 then null;
    elsif v_state = 'ok' then v_fail := v_fail + 1; v_report := v_report || format(E'FAIL | client sees other clients'' rows | %s foreign rows visible\n', v_rows);
    else v_inc := v_inc + 1; v_report := v_report || format(E'INCONCLUSIVE | client sees only own clients row | %s\n', v_state); end if;
  end if;

  execute 'reset role';
  -- The report. This statement ALWAYS raises, so nothing above can ever be committed.
  raise exception E'%\n%\n(Everything above was rolled back. admin fixture: %, client fixture: %.)',
    case when v_fail = 0 then 'PASS' else 'FAIL' end || format(' — %s checks run, %s failed, %s inconclusive', v_total, v_fail, v_inc),
    case when v_report = '' then '(no failures, no inconclusive checks)' else v_report end,
    case when v_admin is null then 'none found' else 'found' end, case when v_client is null then 'none found' else 'found' end;
end $tests$;

rollback;
