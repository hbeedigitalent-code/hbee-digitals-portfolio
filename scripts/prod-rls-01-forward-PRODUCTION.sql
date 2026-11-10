-- =====================================================================================================================
-- Production RLS + browser-role grant hardening for the audited CMS / form tables.  PRODUCTION.  DRAFT — NOT EXECUTED,
-- NOT PARSED BY POSTGRESQL.  One transaction: it either applies completely and verifies itself, or changes nothing.
--
-- EVIDENCE.  The owner ran scripts/prod-rls-00-cms-policy-audit-readonly.sql on production.  It found exactly 12 UNSAFE policies
-- (a policy that lets a non-admin write where the application only ever needs an active admin) and 1 REVIEW policy:
--
--   table                 policy dropped                                         replaced by
--   about_page            Allow all operations for authenticated users  (ALL)    about_page_admin_all
--   blog_categories       Allow authenticated users to insert categories         blog_categories_admin_all
--                         Allow authenticated users to update categories
--                         Authenticated users can manage categories
--   contact_submissions   Allow authenticated admins to manage inquiries (ALL)   contact_submissions_admin_all
--   email_templates       Allow authenticated manage email templates             email_templates_admin_all
--   pricing_packages      Allow authenticated manage pricing                     pricing_packages_admin_all
--   subscribers           Public can unsubscribe  (UPDATE to public)             (nothing: unsubscribe is a signed server route)
--   trust_section         Allow authenticated manage trust section               trust_section_admin_all
--   video_testimonials    Auth users can delete proofs / insert proofs / update  video_testimonials_admin_all
--   -- 12 UNSAFE policies dropped; 9 admin-only policies created: 7 replace dropped ones, 2 are NEW for about_stats / about_values (RLS on, no policy today, so the Admin About editor cannot work); subscribers needs none. --
--   contact_submissions   Allow public contact form inserts  (REVIEW)            (nothing)   <- the 13th, justified below
--
-- THE REVIEW POLICY (13th), decided from the code: the only writer of contact_submissions is src/app/api/contact/route.ts, which
-- builds its client with the service-role credential (the service role bypasses RLS).  No browser code, no other route and no other
-- app in this repository calls .from('contact_submissions').insert.  An anonymous INSERT policy therefore serves nothing the site
-- does, and it lets anyone post straight to the table through the public API, bypassing Turnstile, the rate limiter and the
-- payload validator.  It is dropped, together with the anon/authenticated INSERT privilege.  If you know of a form that posts to
-- the database directly, STOP: delete the DROP of this policy and the INSERT revoke before running.  (Rollback restores both.)
--
-- ADMIN CHECK in the replacement policies is the same expression the audit calls ADMIN-CHECKED and the staging Portfolio policies
-- used (and the behaviour test proved): an active row in public.admin_users for auth.uid().  Reads by the public stay as they are:
-- no public/anon SELECT policy is touched.  LIMIT (documented, deferred): RLS cannot see the Admin 2FA cookie, so an active admin
-- who has not completed 2FA could still write from a browser.  The long-term fix is server routes behind requireActiveAdmin().
--
-- GRANTS.  Independently of RLS, TRUNCATE (and TRIGGER, REFERENCES, MAINTAIN) are not governed by row policies at all, so
-- they are revoked from anon / authenticated on all 16 tables, and so is every DML privilege the application does not need
-- (matrix in _hbee_a4_grants below; derivation in docs/admin-production-release-a4.md).  Nothing is ever GRANTED; the migration only
-- removes privileges a role holds beyond the matrix.  service_role is never touched (and proven untouched).
--
-- SAFETY.
--   * refuses without  set hbee.confirm_production = 'yes';  as the first line of the run;
--   * aborts, changing nothing, on ANY unexpected state: a target policy missing, already admin-checked, with a different command,
--     or not reachable by a browser role; a replacement policy name already taken; a table without RLS; PUBLIC holding privileges;
--     missing admin_users prerequisites; an existing backup table;
--   * before changing anything it copies the full policy set and the anon / authenticated / PUBLIC / service_role grants of the 16
--     tables into public._hbee_a4_rls_backup (RLS on, no browser grants) — the rollback script restores from it exactly;
--   * before COMMIT it proves: the 13 targets are gone and nothing else was dropped; every policy that was NOT a target is
--     byte-identical (fingerprint); the 9 replacements exist and test an active admin; no un-guarded browser write policy remains on
--     the modified tables (only the subscribers anon INSERT is allowed); grants are exactly (before ∩ matrix); no browser role holds
--     TRUNCATE / TRIGGER / REFERENCES / MAINTAIN; service_role grants and every table's RLS flag are unchanged.
--   * no row data is read or written (catalog statements only).  No secret is selected.
--
-- BEFORE YOU RUN IT
--   1. Run scripts/prod-rls-00-cms-policy-audit-readonly.sql and scripts/prod-rls-03-verify-readonly.sql; keep the output.
--   2. Order: independent of the application deploy (no code depends on the old policies); the recommended order is deploy, smoke the Admin pages, then this script (docs §8).
--   3. Quiet moment: brief locks on 16 tables (lock_timeout 5s: a busy table makes it fail fast and change nothing).
--   4. Put this line FIRST in the SAME SQL-editor run:   set hbee.confirm_production = 'yes';
-- AFTER: scripts/prod-rls-03-verify-readonly.sql (every line OK / expected).  ROLLBACK: scripts/prod-rls-02-rollback-PRODUCTION.sql.
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';
set local statement_timeout = '120s';

-- ── Constants (transaction-local temp tables) ────────────────────────────────────────────────────────────────────────
create temp table _hbee_a4_tables (tablename text primary key, modified boolean not null) on commit drop;
insert into _hbee_a4_tables values
  ('about_page', true), ('about_stats', true), ('about_values', true), ('blog_categories', true), ('blog_comments', false),
  ('client_onboarding_submissions', false), ('clients', false), ('contact_submissions', true), ('email_settings', false),
  ('email_templates', true), ('notifications', false), ('pricing_packages', true), ('project_requests', false),
  ('subscribers', true), ('trust_section', true), ('video_testimonials', true);

-- the 13 policies this migration drops: (table, name, expected command, must be an unrestricted true/true policy, why)
create temp table _hbee_a4_targets (ord int primary key, tablename text not null, policyname text not null, expect_cmd text not null, expect_open boolean not null, why text not null) on commit drop;
insert into _hbee_a4_targets values
  (1,  'about_page',          'Allow all operations for authenticated users',   'ALL',    true,  'UNSAFE: ALL to authenticated, USING true / WITH CHECK true'),
  (2,  'blog_categories',     'Allow authenticated users to insert categories', 'INSERT', false, 'UNSAFE: any signed-in user may insert'),
  (3,  'blog_categories',     'Allow authenticated users to update categories', 'UPDATE', false, 'UNSAFE: any signed-in user may update'),
  (4,  'blog_categories',     'Authenticated users can manage categories',      'ALL',    false, 'UNSAFE: any signed-in user may do anything'),
  (5,  'contact_submissions', 'Allow authenticated admins to manage inquiries', 'ALL',    true,  'UNSAFE: named for admins but ALL to authenticated, USING true / WITH CHECK true'),
  (6,  'contact_submissions', 'Allow public contact form inserts',              'INSERT', false, 'REVIEW, decided from code: /api/contact inserts with the service role, no direct browser insert exists'),
  (7,  'email_templates',     'Allow authenticated manage email templates',     'ALL',    false, 'UNSAFE: unrestricted authenticated ALL'),
  (8,  'pricing_packages',    'Allow authenticated manage pricing',             'ALL',    false, 'UNSAFE: unrestricted authenticated ALL'),
  (9,  'subscribers',         'Public can unsubscribe',                         'UPDATE', false, 'UNSAFE: unrestricted UPDATE to public, unsubscribe is the signed server route /api/unsubscribe on newsletter_subscribers'),
  (10, 'trust_section',       'Allow authenticated manage trust section',       'ALL',    false, 'UNSAFE: unrestricted authenticated ALL'),
  (11, 'video_testimonials',  'Auth users can delete proofs',                   'DELETE', false, 'UNSAFE: any signed-in user may delete'),
  (12, 'video_testimonials',  'Auth users can insert proofs',                   'INSERT', false, 'UNSAFE: any signed-in user may insert'),
  (13, 'video_testimonials',  'Auth users can update proofs',                   'UPDATE', false, 'UNSAFE: any signed-in user may update');

-- the 9 admin-only policies (ALL to authenticated, active admin only); about_stats / about_values have NO existing policy to drop
create temp table _hbee_a4_new (tablename text primary key, policyname text not null unique) on commit drop;
insert into _hbee_a4_new values
  ('about_page', 'about_page_admin_all'), ('blog_categories', 'blog_categories_admin_all'),
  ('contact_submissions', 'contact_submissions_admin_all'), ('email_templates', 'email_templates_admin_all'),
  ('pricing_packages', 'pricing_packages_admin_all'), ('trust_section', 'trust_section_admin_all'),
  ('video_testimonials', 'video_testimonials_admin_all'),
  ('about_stats', 'about_stats_admin_all'), ('about_values', 'about_values_admin_all');
-- subscribers gets NO replacement (nothing in the application updates it from a browser).  Targets 13, created 9.

-- The browser-role privilege matrix: the MOST each role may keep.  Derivation (who touches the table, from where) is in
-- docs/admin-production-release-a4.md section 4.  An empty set means the role needs nothing.  TRUNCATE / TRIGGER / REFERENCES /
-- MAINTAIN appear nowhere, so they are revoked everywhere.
create temp table _hbee_a4_grants (tablename text not null, role_name text not null, allowed text[] not null, primary key (tablename, role_name)) on commit drop;
insert into _hbee_a4_grants values
  ('about_page',                    'anon', '{SELECT}'),                    ('about_page',                    'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('about_stats',                   'anon', '{}'),                          ('about_stats',                   'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('about_values',                  'anon', '{}'),                          ('about_values',                  'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('blog_categories',               'anon', '{SELECT}'),                    ('blog_categories',               'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('blog_comments',                 'anon', '{SELECT,INSERT}'),             ('blog_comments',                 'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('client_onboarding_submissions', 'anon', '{}'),                          ('client_onboarding_submissions', 'authenticated', '{SELECT,UPDATE}'),
  ('clients',                       'anon', '{}'),                          ('clients',                       'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('contact_submissions',           'anon', '{}'),                          ('contact_submissions',           'authenticated', '{SELECT,UPDATE,DELETE}'),
  ('email_settings',                'anon', '{}'),                          ('email_settings',                'authenticated', '{SELECT,INSERT,UPDATE}'),
  ('email_templates',               'anon', '{}'),                          ('email_templates',               'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('notifications',                 'anon', '{}'),                          ('notifications',                 'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('pricing_packages',              'anon', '{SELECT}'),                    ('pricing_packages',              'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('project_requests',              'anon', '{}'),                          ('project_requests',              'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('subscribers',                   'anon', '{INSERT}'),                    ('subscribers',                   'authenticated', '{SELECT,INSERT}'),
  ('trust_section',                 'anon', '{SELECT}'),                    ('trust_section',                 'authenticated', '{SELECT,INSERT,UPDATE,DELETE}'),
  ('video_testimonials',            'anon', '{SELECT}'),                    ('video_testimonials',            'authenticated', '{SELECT,INSERT,UPDATE,DELETE}');

-- ── A. Guard: abort on anything unexpected ───────────────────────────────────────────────────────────────────────────
do $guard$
declare
  r record;
  v_n bigint;
  v_txt text;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run to confirm this is the PRODUCTION project.';
  end if;

  -- the 16 tables: ordinary tables in public, RLS on, owned by (a role we are a member of)
  for r in select t.tablename from _hbee_a4_tables t order by t.tablename loop
    select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = r.tablename and c.relkind = 'r';
    if v_n <> 1 then raise exception 'ABORT (nothing changed): public.% is not an ordinary table here.', r.tablename; end if;
    select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = r.tablename and c.relrowsecurity;
    if v_n <> 1 then raise exception 'ABORT (nothing changed): RLS is OFF on public.% — every grant would be directly usable; investigate before changing anything.', r.tablename; end if;
    select count(*) into v_n from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = r.tablename and pg_has_role(current_user, c.relowner, 'member');
    if v_n <> 1 then raise exception 'ABORT (nothing changed): % is not a member of the owner role of public.%; run as the table owner (postgres).', current_user, r.tablename; end if;
  end loop;

  -- the admin identity the replacement policies rely on: admin_users with user_id / is_active, readable by its own user
  if to_regclass('public.admin_users') is null then raise exception 'ABORT (nothing changed): public.admin_users does not exist.'; end if;
  select count(*) into v_n from information_schema.columns
   where table_schema = 'public' and table_name = 'admin_users' and column_name in ('user_id', 'is_active');
  if v_n <> 2 then raise exception 'ABORT (nothing changed): admin_users must have user_id and is_active.'; end if;
  select count(*) into v_n from pg_policies
   where schemaname = 'public' and tablename = 'admin_users' and cmd in ('SELECT', 'ALL')
     and coalesce(qual, '') ~* 'auth\.uid' and roles && array['authenticated', 'public']::name[];
  if v_n < 1 then
    raise exception 'ABORT (nothing changed): no policy lets a signed-in admin read their own admin_users row, so the replacement policies would lock every admin out of these tables.';
  end if;

  -- PUBLIC (the pseudo-role) must hold nothing on these tables: the revokes below are per named role and would not remove it
  select count(*), string_agg(c.relname || ':' || a.privilege_type, ', ') into v_n, v_txt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables) and a.grantee = 0;
  if v_n <> 0 then raise exception 'ABORT (nothing changed): PostgreSQL PUBLIC holds privileges on these tables (%). This migration does not revoke PUBLIC on assumption.', v_txt; end if;

  -- names we are about to create must be free
  if to_regclass('public._hbee_a4_rls_backup') is not null then
    raise exception 'ABORT (nothing changed): public._hbee_a4_rls_backup already exists — a previous run was applied. Run the verifier / rollback instead.';
  end if;
  select string_agg(n.tablename || '.' || n.policyname, ', ') into v_txt
    from _hbee_a4_new n join pg_policies p on p.schemaname = 'public' and p.tablename = n.tablename and p.policyname = n.policyname;
  if v_txt is not null then raise exception 'ABORT (nothing changed): replacement policy name(s) already exist: %.', v_txt; end if;
  -- about_stats / about_values were audited as RLS ON with NO policy: any policy there now is an unknown state
  select string_agg(p.tablename || '.' || p.policyname, ', ') into v_txt from pg_policies p where p.schemaname = 'public' and p.tablename in ('about_stats', 'about_values');
  if v_txt is not null then raise exception 'ABORT (nothing changed): about_stats / about_values were audited with no policy but now have: %. Re-run the audit.', v_txt; end if;

  -- every target: present exactly once, the command we expect, reachable by a browser role, and NOT already an admin check
  for r in select * from _hbee_a4_targets order by ord loop
    select count(*) into v_n from pg_policies where schemaname = 'public' and tablename = r.tablename and policyname = r.policyname;
    if v_n <> 1 then
      raise exception 'ABORT (nothing changed): expected exactly one policy "%" on public.%, found %. The live state is not what the audit described; re-run the audit.', r.policyname, r.tablename, v_n;
    end if;
    select count(*) into v_n from pg_policies p
     where p.schemaname = 'public' and p.tablename = r.tablename and p.policyname = r.policyname and p.cmd = r.expect_cmd and p.permissive = 'PERMISSIVE';
    if v_n <> 1 then
      raise exception 'ABORT (nothing changed): policy "%" on public.% is not a PERMISSIVE % policy as audited.', r.policyname, r.tablename, r.expect_cmd;
    end if;
    select count(*) into v_n from pg_policies p
     where p.schemaname = 'public' and p.tablename = r.tablename and p.policyname = r.policyname
       and p.roles && array['public', 'anon', 'authenticated']::name[];
    if v_n <> 1 then
      raise exception 'ABORT (nothing changed): policy "%" on public.% does not apply to a browser role; it is not the unsafe policy the audit saw.', r.policyname, r.tablename;
    end if;
    select count(*) into v_n from pg_policies p
     where p.schemaname = 'public' and p.tablename = r.tablename and p.policyname = r.policyname
       and (coalesce(p.qual, '') ~* 'admin_users' or coalesce(p.with_check, '') ~* 'admin_users');
    if v_n <> 0 then
      raise exception 'ABORT (nothing changed): policy "%" on public.% already tests admin_users; it is not unsafe. Someone changed it since the audit.', r.policyname, r.tablename;
    end if;
    if r.expect_open then
      select count(*) into v_n from pg_policies p
       where p.schemaname = 'public' and p.tablename = r.tablename and p.policyname = r.policyname
         and (p.qual is null or lower(btrim(p.qual)) in ('true', '(true)'))
         and (p.with_check is null or lower(btrim(p.with_check)) in ('true', '(true)'));
      if v_n <> 1 then
        raise exception 'ABORT (nothing changed): policy "%" on public.% was audited as USING true / WITH CHECK true but is not.', r.policyname, r.tablename;
      end if;
    end if;
  end loop;
end $guard$;

-- ── B. Capture the exact current state (rollback restores from this) ─────────────────────────────────────────────────
create table public._hbee_a4_rls_backup (
  kind        text    not null check (kind in ('policy', 'table_grant')),
  tablename   text    not null,
  captured_at timestamptz not null default now(),
  policyname  text, permissive text, roles name[], cmd text, qual text, with_check text,
  grantee     text, privilege text, is_grantable boolean
);
alter table public._hbee_a4_rls_backup enable row level security;
revoke all on table public._hbee_a4_rls_backup from public, anon, authenticated;
comment on table public._hbee_a4_rls_backup is 'Phase A4 production hardening: policies and browser-role grants as they were before prod-rls-01. Source for prod-rls-02 rollback. Drop it only after the change is verified.';

insert into public._hbee_a4_rls_backup (kind, tablename, policyname, permissive, roles, cmd, qual, with_check)
select 'policy', p.tablename, p.policyname, p.permissive, p.roles, p.cmd, p.qual, p.with_check
  from pg_policies p where p.schemaname = 'public' and p.tablename in (select tablename from _hbee_a4_tables);

insert into public._hbee_a4_rls_backup (kind, tablename, grantee, privilege, is_grantable)
select 'table_grant', c.relname,
       case when a.grantee = 0 then 'PUBLIC' else pg_get_userbyid(a.grantee) end,
       a.privilege_type::text, a.is_grantable
  from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
 where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables)
   and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated', 'service_role'));

do $capture$
begin
  -- fingerprints of what must NOT change, kept for the post-check (transaction-local; nothing persistent)
  perform set_config('hbee.a4_policies_before', (select count(*) from public._hbee_a4_rls_backup where kind = 'policy')::text, true);
  perform set_config('hbee.a4_kept_policies', coalesce((
    select md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', p.tablename, p.policyname, p.permissive, p.roles::text, p.cmd, coalesce(p.qual, ''), coalesce(p.with_check, '')), E'\n' order by p.tablename, p.policyname))
      from pg_policies p
     where p.schemaname = 'public' and p.tablename in (select tablename from _hbee_a4_tables)
       and not exists (select 1 from _hbee_a4_targets t where t.tablename = p.tablename and t.policyname = p.policyname)), ''), true);
  perform set_config('hbee.a4_service_grants', coalesce((
    select md5(string_agg(tablename || '|' || privilege || '|' || is_grantable::text, E'\n' order by tablename, privilege))
      from public._hbee_a4_rls_backup where kind = 'table_grant' and grantee = 'service_role'), ''), true);
  perform set_config('hbee.a4_rls_flags', (
    select md5(string_agg(c.relname || '|' || c.relrowsecurity::text || '|' || c.relforcerowsecurity::text, E'\n' order by c.relname))
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables)), true);
end $capture$;

-- ── C. The change ────────────────────────────────────────────────────────────────────────────────────────────────────
do $change$
declare
  r record;
  v_admin constant text := 'exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true)';
  v_drop text;
begin
  for r in select * from _hbee_a4_targets order by ord loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;

  for r in select * from _hbee_a4_new order by tablename loop
    execute format('create policy %I on public.%I as permissive for all to authenticated using (%s) with check (%s)', r.policyname, r.tablename, v_admin, v_admin);
  end loop;

  -- revoke exactly the privileges a role holds beyond the matrix
  for r in select m.tablename, m.role_name,
                  array(select b.privilege from public._hbee_a4_rls_backup b
                         where b.kind = 'table_grant' and b.tablename = m.tablename and b.grantee = m.role_name
                           and b.privilege <> all (m.allowed) order by b.privilege) as excess
             from _hbee_a4_grants m order by m.tablename, m.role_name loop
    if cardinality(r.excess) > 0 then
      v_drop := array_to_string(r.excess, ', ');
      execute format('revoke %s on table public.%I from %I', v_drop, r.tablename, r.role_name);
    end if;
  end loop;
end $change$;

-- ── D. Post-conditions: any failure rolls the whole transaction back ─────────────────────────────────────────────────
do $post$
declare
  r record;
  v_n bigint;
  v_txt text;
  v_admin_re constant text := 'admin_users';
begin
  -- 1. every target is gone, and the policy count fell by exactly (targets − replacements)
  select count(*) into v_n from pg_policies p join _hbee_a4_targets t on t.tablename = p.tablename and t.policyname = p.policyname where p.schemaname = 'public';
  if v_n <> 0 then raise exception 'Post-condition failed: % target polic(ies) still exist.', v_n; end if;
  select count(*) into v_n from pg_policies p where p.schemaname = 'public' and p.tablename in (select tablename from _hbee_a4_tables);
  if v_n <> current_setting('hbee.a4_policies_before')::bigint - (select count(*) from _hbee_a4_targets) + (select count(*) from _hbee_a4_new) then
    raise exception 'Post-condition failed: policy count is % but expected before(%) - dropped(%) + created(%).',
      v_n, current_setting('hbee.a4_policies_before'), (select count(*) from _hbee_a4_targets), (select count(*) from _hbee_a4_new);
  end if;

  -- 2. every policy that was not a target is byte-identical
  select coalesce(md5(string_agg(format('%s|%s|%s|%s|%s|%s|%s', p.tablename, p.policyname, p.permissive, p.roles::text, p.cmd, coalesce(p.qual, ''), coalesce(p.with_check, '')), E'\n' order by p.tablename, p.policyname)), '') into v_txt
    from pg_policies p
   where p.schemaname = 'public' and p.tablename in (select tablename from _hbee_a4_tables)
     and not exists (select 1 from _hbee_a4_new n where n.tablename = p.tablename and n.policyname = p.policyname);
  if v_txt is distinct from current_setting('hbee.a4_kept_policies') then
    raise exception 'Post-condition failed: a policy outside the target list changed. Nothing is committed.';
  end if;

  -- 3. each replacement is ALL / PERMISSIVE / authenticated only / tests an active admin in USING and WITH CHECK
  for r in select * from _hbee_a4_new loop
    select count(*) into v_n from pg_policies p
     where p.schemaname = 'public' and p.tablename = r.tablename and p.policyname = r.policyname
       and p.cmd = 'ALL' and p.permissive = 'PERMISSIVE' and p.roles = array['authenticated']::name[]
       and p.qual ~* v_admin_re and p.qual ~* 'is_active' and p.qual ~* 'auth\.uid'
       and p.with_check ~* v_admin_re and p.with_check ~* 'is_active' and p.with_check ~* 'auth\.uid';
    if v_n <> 1 then raise exception 'Post-condition failed: replacement policy "%" on public.% is not the expected admin-only policy.', r.policyname, r.tablename; end if;
  end loop;

  -- 4. no browser-reachable write policy that is not an admin check remains on the modified tables (subscribers anon INSERT is the one allowed)
  select string_agg(p.tablename || '."' || p.policyname || '"', ', ') into v_txt
    from pg_policies p
   where p.schemaname = 'public' and p.tablename in (select tablename from _hbee_a4_tables where modified)
     and p.cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
     and p.roles && array['public', 'anon', 'authenticated']::name[]
     and not (p.tablename = 'subscribers' and p.cmd = 'INSERT')
     and not (case when p.cmd = 'INSERT'
                   then coalesce(p.with_check, '') ~* v_admin_re and p.with_check ~* 'is_active' and p.with_check ~* 'auth\.uid'
                   else coalesce(p.qual, '') ~* v_admin_re and p.qual ~* 'is_active' and p.qual ~* 'auth\.uid'
                        and (p.with_check is null or (p.with_check ~* v_admin_re and p.with_check ~* 'is_active' and p.with_check ~* 'auth\.uid')) end);
  if v_txt is not null then
    raise exception 'Post-condition failed: browser-reachable write polic(ies) that do not test an active admin remain: %. Unknown state; nothing is committed.', v_txt;
  end if;

  -- 5. grants: final = (before ∩ matrix) exactly, for anon and authenticated, on all 16 tables
  for r in select m.tablename, m.role_name, m.allowed,
                  coalesce((select array_agg(b.privilege order by b.privilege) from public._hbee_a4_rls_backup b
                             where b.kind = 'table_grant' and b.tablename = m.tablename and b.grantee = m.role_name
                               and b.privilege = any (m.allowed)), '{}') as expected,
                  coalesce((select array_agg(a.privilege_type::text order by a.privilege_type::text)
                              from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
                             where n.nspname = 'public' and c.relname = m.tablename and pg_get_userbyid(a.grantee) = m.role_name), '{}') as actual
             from _hbee_a4_grants m loop
    if r.expected is distinct from r.actual then
      raise exception 'Post-condition failed: % on public.% holds {%} but expected {%}.', r.role_name, r.tablename, array_to_string(r.actual, ','), array_to_string(r.expected, ',');
    end if;
  end loop;
  select string_agg(c.relname || ':' || pg_get_userbyid(a.grantee) || ':' || a.privilege_type, ', ') into v_txt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables)
     and (a.grantee = 0 or pg_get_userbyid(a.grantee) in ('anon', 'authenticated'))
     and a.privilege_type::text in ('TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN');
  if v_txt is not null then raise exception 'Post-condition failed: dangerous privileges remain for browser roles: %.', v_txt; end if;

  -- 6. service_role grants and every table's RLS flags are unchanged
  select coalesce(md5(string_agg(c.relname || '|' || a.privilege_type::text || '|' || a.is_grantable::text, E'\n' order by c.relname, a.privilege_type::text)), '') into v_txt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace, lateral aclexplode(c.relacl) a
   where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables) and pg_get_userbyid(a.grantee) = 'service_role';
  if v_txt is distinct from current_setting('hbee.a4_service_grants') then raise exception 'Post-condition failed: service_role privileges changed.'; end if;
  select md5(string_agg(c.relname || '|' || c.relrowsecurity::text || '|' || c.relforcerowsecurity::text, E'\n' order by c.relname)) into v_txt
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relname in (select tablename from _hbee_a4_tables);
  if v_txt is distinct from current_setting('hbee.a4_rls_flags') then raise exception 'Post-condition failed: an RLS flag changed.'; end if;
end $post$;

commit;
-- Then run scripts/prod-rls-03-verify-readonly.sql.  Keep public._hbee_a4_rls_backup until the application has been observed to work;
-- it is the rollback source.  Drop it only after you have decided never to roll back (a separate, explicit statement).
