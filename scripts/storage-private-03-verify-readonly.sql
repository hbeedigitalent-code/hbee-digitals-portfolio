-- =====================================================================================================================
-- Storage effective-access verification.  READ-ONLY.  DRAFT -- NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- ONE statement, ONE result set.  It changes nothing, reads no object, no file name, no row of any application table and no secret.
-- It reads only storage.buckets and pg_policies.
--
-- HOW EFFECTIVE ACCESS IS CALCULATED  (PostgreSQL row-level security, for one role + one command + one object):
--
--     effective access  =  ( OR  of every applicable PERMISSIVE policy )   AND   ( AND of every applicable RESTRICTIVE policy )
--
--   * a policy is applicable when its role list contains the role (or PUBLIC) and its command is that command (or ALL);
--   * if NO permissive policy is applicable and true, access is DENIED, whatever the restrictive policies say
--     (restrictive policies can only narrow access; they never grant it);
--   * if a permissive policy grants it but ANY applicable restrictive policy is false, access is DENIED;
--   * service_role bypasses RLS entirely and is not probed: server-issued signed URLs and signed uploads keep working.
--   An earlier version of this script ignored RESTRICTIVE policies and so reported grants that PostgreSQL does not give.  That was wrong.
--
--   Each policy's own expression is EVALUATED (query_to_xml) against a synthetic object row, with auth.uid() / auth.role() replaced by
--   the probe's identity.  No real object is involved.
--
-- LIMITS, stated plainly:
--   * UPDATE / DELETE also need the row to be visible through the SELECT policies; the probe evaluates the UPDATE/DELETE policies only.
--     That can only OVER-report access, never hide it.
--   * a policy that depends on something other than the object row, auth.uid() and auth.role() (for example a lookup in another table)
--     is evaluated in THIS session's context; an admin-membership policy is correctly false for the synthetic users.
--   * if a policy expression cannot be evaluated against the synthetic row the whole statement errors: report the message.
--
-- COLUMNS:  check_name | expected | actual | verdict | permissive_by | blocked_by | note
--   actual         ALLOW / DENY = the EFFECTIVE result (permissive AND restrictive)
--   permissive_by  permissive policies that evaluate true for the probe
--   blocked_by     restrictive policies that evaluate FALSE for the probe
--   verdict        PASS | FAIL | REVIEW | INFO
--     FAIL    a required condition is not met.  OVERALL = PASS requires zero FAIL rows.
--     REVIEW  not required: effective write access on client-portal-files / onboarding-files, or a browser-readable private bucket
--             outside the four client buckets (public CMS/media buckets are deferred).
--     INFO    facts to read: legacy permissive policies that are currently blocked by a restrictive guard, and whether the guard lists
--             proposal-files (optional hardening, not an exposure).
-- =====================================================================================================================

with
ids as (
  select '00000000-0000-4000-8000-0000000000a1'::uuid as me, '00000000-0000-4000-8000-0000000000b2'::uuid as other
),
-- ── probes in scope: path templates use {me} / {other} for synthetic user ids ───────────────────────────────────────────
-- expect: deny = required denial | allow = required allowance | deny-review = should be denied, reported as REVIEW if not
scoped(ord, label, bucket, role_name, op, path_tpl, expect) as (
  values
  (10, 'project-files: anon cannot SELECT',                'project-files',  'anon',          'SELECT', 'client-files/{other}/probe.pdf', 'deny'),
  (11, 'project-files: anon cannot INSERT',                'project-files',  'anon',          'INSERT', 'client-files/{other}/probe.pdf', 'deny'),
  (12, 'project-files: authenticated cannot SELECT',       'project-files',  'authenticated', 'SELECT', 'client-files/{other}/probe.pdf', 'deny'),
  (13, 'project-files: authenticated cannot INSERT',       'project-files',  'authenticated', 'INSERT', 'client-files/{me}/probe.pdf',    'deny'),
  (14, 'project-files: authenticated cannot UPDATE',       'project-files',  'authenticated', 'UPDATE', 'client-files/{me}/probe.pdf',    'deny'),
  (15, 'project-files: authenticated cannot DELETE',       'project-files',  'authenticated', 'DELETE', 'client-files/{me}/probe.pdf',    'deny'),
  (20, 'proposal-files: anon cannot SELECT',               'proposal-files', 'anon',          'SELECT', 'proposals/{other}/probe.pdf',    'deny'),
  (21, 'proposal-files: anon cannot INSERT',               'proposal-files', 'anon',          'INSERT', 'proposals/{other}/probe.pdf',    'deny'),
  (22, 'proposal-files: authenticated cannot SELECT',      'proposal-files', 'authenticated', 'SELECT', 'proposals/{other}/probe.pdf',    'deny'),
  (23, 'proposal-files: authenticated cannot INSERT',      'proposal-files', 'authenticated', 'INSERT', 'proposals/{me}/probe.pdf',       'deny'),
  (24, 'proposal-files: authenticated cannot UPDATE',      'proposal-files', 'authenticated', 'UPDATE', 'proposals/{me}/probe.pdf',       'deny'),
  (25, 'proposal-files: authenticated cannot DELETE',      'proposal-files', 'authenticated', 'DELETE', 'proposals/{me}/probe.pdf',       'deny'),
  (30, 'client-portal: anon cannot INSERT',                'client-portal',  'anon',          'INSERT', 'profile-images/{other}-1.png',   'deny'),
  (31, 'client-portal: anon cannot UPDATE',                'client-portal',  'anon',          'UPDATE', 'profile-images/{other}-1.png',   'deny'),
  (32, 'client-portal: anon cannot DELETE',                'client-portal',  'anon',          'DELETE', 'profile-images/{other}-1.png',   'deny'),
  (33, 'client-portal: user CAN INSERT its own avatar path',        'client-portal', 'authenticated', 'INSERT', 'profile-images/{me}-1.png',    'allow'),
  (34, 'client-portal: user cannot INSERT another user avatar path','client-portal', 'authenticated', 'INSERT', 'profile-images/{other}-1.png', 'deny'),
  (35, 'client-portal: user cannot INSERT outside profile-images/', 'client-portal', 'authenticated', 'INSERT', 'documents/probe.pdf',          'deny'),
  (36, 'client-portal: user cannot UPDATE another user avatar path','client-portal', 'authenticated', 'UPDATE', 'profile-images/{other}-1.png', 'deny'),
  (37, 'client-portal: user cannot UPDATE outside profile-images/', 'client-portal', 'authenticated', 'UPDATE', 'documents/probe.pdf',          'deny'),
  (38, 'client-portal: user cannot DELETE another user avatar path','client-portal', 'authenticated', 'DELETE', 'profile-images/{other}-1.png', 'deny'),
  (39, 'client-portal: user cannot DELETE outside profile-images/', 'client-portal', 'authenticated', 'DELETE', 'documents/probe.pdf',          'deny'),
  (40, 'client-portal-files: anon cannot SELECT',          'client-portal-files', 'anon',          'SELECT', 'probe/{other}/probe.pdf', 'deny'),
  (41, 'client-portal-files: authenticated cannot SELECT', 'client-portal-files', 'authenticated', 'SELECT', 'probe/{other}/probe.pdf', 'deny'),
  (42, 'onboarding-files: anon cannot SELECT',             'onboarding-files',    'anon',          'SELECT', 'probe/{other}/probe.pdf', 'deny'),
  (43, 'onboarding-files: authenticated cannot SELECT',    'onboarding-files',    'authenticated', 'SELECT', 'probe/{other}/probe.pdf', 'deny'),
  (44, 'client-portal-files: anon write (REVIEW)',          'client-portal-files', 'anon',          'INSERT', 'probe/{other}/probe.pdf', 'deny-review'),
  (45, 'client-portal-files: authenticated write (REVIEW)', 'client-portal-files', 'authenticated', 'INSERT', 'probe/{me}/probe.pdf',    'deny-review'),
  (46, 'onboarding-files: anon write (REVIEW)',             'onboarding-files',    'anon',          'INSERT', 'probe/{other}/probe.pdf', 'deny-review'),
  (47, 'onboarding-files: authenticated write (REVIEW)',    'onboarding-files',    'authenticated', 'INSERT', 'probe/{me}/probe.pdf',    'deny-review')
),
-- ── every OTHER private bucket: can a browser role effectively read it?  REVIEW, never FAIL (deferred) ────────────────────
others(ord, label, bucket, role_name, op, path_tpl, expect) as (
  select 100 + row_number() over (order by b.id, ro.role_name), 'other private bucket ' || b.id || ': ' || ro.role_name || ' SELECT', b.id, ro.role_name, 'SELECT', 'probe/{other}/probe.pdf', 'deny-review'
  from storage.buckets b cross join (values ('anon'), ('authenticated')) ro(role_name)
  where not b.public and b.id not in ('project-files', 'proposal-files', 'client-portal-files', 'onboarding-files')
),
probes as (
  select * from scoped union all select * from others
),
-- ── evaluate EVERY applicable policy, permissive AND restrictive, against each probe ───────────────────────────────────────
evaluated as (
  select p.ord, pol.policyname, pol.permissive as kind,
    ((xpath('/row/r/text()', query_to_xml(
      format(
        'select coalesce((%s), false) as r from (select gen_random_uuid() as id, %L::text as bucket_id, %L::text as name, %L::uuid as owner, %L::text as owner_id, '
        || 'string_to_array(%L, ''/'') as path_tokens, null::jsonb as metadata, null::jsonb as user_metadata) as objects',
        x.expr, p.bucket, x.path, x.uid, x.uid::text, x.path),
      false, true, '')))[1]::text)::boolean as passes
  from probes p
  cross join ids
  join pg_policies pol
    on pol.schemaname = 'storage' and pol.tablename = 'objects'
   and pol.roles && array[p.role_name::name, 'public'::name]
   and (pol.cmd = p.op or pol.cmd = 'ALL')
  cross join lateral (
    select
      replace(replace(p.path_tpl, '{me}', ids.me::text), '{other}', ids.other::text) as path,
      case when p.role_name = 'authenticated' then ids.me else null::uuid end as uid
  ) base
  cross join lateral (
    select
      replace(
        replace(
          case p.op
            when 'INSERT' then coalesce(pol.with_check, pol.qual, 'true')
            when 'UPDATE' then '(' || coalesce(pol.qual, 'true') || ') and (' || coalesce(pol.with_check, pol.qual, 'true') || ')'
            else coalesce(pol.qual, 'true')
          end,
          'auth.uid()', coalesce(quote_literal(base.uid::text) || '::uuid', 'null::uuid')),
        'auth.role()', quote_literal(p.role_name)) as expr,
      base.path as path,
      base.uid as uid
  ) x
),
-- ── combine exactly as PostgreSQL does:  (OR of permissive) AND (AND of restrictive); no permissive policy => deny ─────────
per_probe as (
  select p.ord, p.label, p.expect,
         coalesce(bool_or(e.passes)  filter (where e.kind = 'PERMISSIVE'),  false) as permissive_ok,
         coalesce(bool_and(e.passes) filter (where e.kind = 'RESTRICTIVE'), true)  as restrictive_ok,
         coalesce(string_agg(e.policyname, ', ' order by e.policyname) filter (where e.kind = 'PERMISSIVE' and e.passes), '')      as permissive_by,
         coalesce(string_agg(e.policyname, ', ' order by e.policyname) filter (where e.kind = 'RESTRICTIVE' and not e.passes), '') as blocked_by
  from probes p left join evaluated e on e.ord = p.ord
  group by p.ord, p.label, p.expect
),
rows_out as (
  -- bucket visibility
  select 1 as ord, 'bucket project-files is private' as check_name, 'public = false' as expected,
         coalesce((select 'public = ' || b.public::text from storage.buckets b where b.id = 'project-files'), 'bucket missing') as actual,
         case when exists (select 1 from storage.buckets b where b.id = 'project-files' and not b.public) then 'PASS' else 'FAIL' end as verdict,
         '' as permissive_by, '' as blocked_by, '' as note
  union all
  select 2, 'bucket proposal-files is private', 'public = false',
         coalesce((select 'public = ' || b.public::text from storage.buckets b where b.id = 'proposal-files'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'proposal-files' and not b.public) then 'PASS' else 'FAIL' end, '', '', ''
  union all
  select 3, 'bucket client-portal stays public (avatar URLs)', 'public = true',
         coalesce((select 'public = ' || b.public::text from storage.buckets b where b.id = 'client-portal'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'client-portal' and b.public) then 'PASS' else 'FAIL' end, '', '', ''
  union all
  select 8, 'bucket client-portal-files is private', 'public = false',
         coalesce((select 'public = ' || b.public::text from storage.buckets b where b.id = 'client-portal-files'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'client-portal-files' and not b.public) then 'PASS' else 'FAIL' end, '', '', ''
  union all
  select 9, 'bucket onboarding-files is private', 'public = false',
         coalesce((select 'public = ' || b.public::text from storage.buckets b where b.id = 'onboarding-files'), 'bucket missing'),
         case when exists (select 1 from storage.buckets b where b.id = 'onboarding-files' and not b.public) then 'PASS' else 'FAIL' end, '', '', ''
  union all
  -- the restrictive guard that actually protects the buckets, and facts about it
  select 5, 'guard m10_private_buckets_no_client_select is RESTRICTIVE and lists project-files, client-portal-files, onboarding-files', 'present',
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'm10_private_buckets_no_client_select' and permissive = 'RESTRICTIVE'
                             and qual ilike '%project-files%' and qual ilike '%client-portal-files%' and qual ilike '%onboarding-files%') then 'present' else 'missing or different' end,
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'm10_private_buckets_no_client_select' and permissive = 'RESTRICTIVE'
                             and qual ilike '%project-files%' and qual ilike '%client-portal-files%' and qual ilike '%onboarding-files%') then 'PASS' else 'FAIL' end,
         '', '', ''
  union all
  select 6, 'INFO the guard also lists proposal-files (optional hardening)', 'informational',
         case when exists (select 1 from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname = 'm10_private_buckets_no_client_select' and qual ilike '%proposal-files%') then 'yes' else 'no (denied today only because no permissive policy grants it)' end,
         'INFO', '', '', ''
  union all
  select 7, 'INFO legacy PERMISSIVE read policies for the private client buckets (blocked by the guard when listed in effective results above)', 'informational',
         (select count(*)::text from pg_policies where schemaname = 'storage' and tablename = 'objects' and permissive = 'PERMISSIVE' and cmd in ('SELECT', 'ALL')
            and roles && array['anon'::name, 'authenticated'::name, 'public'::name]
            and (qual ilike '%project-files%' or qual ilike '%client-portal-files%' or qual ilike '%onboarding-files%' or qual ilike '%proposal-files%')),
         'INFO',
         coalesce((select string_agg(policyname, ', ' order by policyname) from pg_policies where schemaname = 'storage' and tablename = 'objects' and permissive = 'PERMISSIVE' and cmd in ('SELECT', 'ALL')
            and roles && array['anon'::name, 'authenticated'::name, 'public'::name]
            and (qual ilike '%project-files%' or qual ilike '%client-portal-files%' or qual ilike '%onboarding-files%' or qual ilike '%proposal-files%')), ''),
         '', 'redundant while the guard holds; they become live exposures if the guard is ever dropped or altered'
  union all
  select 4, 'INFO restrictive policies on storage.objects', 'informational',
         coalesce((select string_agg(policyname || ' (' || cmd || ')', ', ' order by policyname) from pg_policies where schemaname = 'storage' and tablename = 'objects' and permissive = 'RESTRICTIVE'), 'none'),
         'INFO', '', '', ''
  union all
  -- the probes: effective access
  select pp.ord, pp.label,
         case pp.expect when 'allow' then 'ALLOW' else 'DENY' end,
         case when pp.permissive_ok and pp.restrictive_ok then 'ALLOW' else 'DENY' end,
         case
           when pp.expect = 'deny'  then case when pp.permissive_ok and pp.restrictive_ok then 'FAIL' else 'PASS' end
           when pp.expect = 'allow' then case when pp.permissive_ok and pp.restrictive_ok then 'PASS' else 'FAIL' end
           else                          case when pp.permissive_ok and pp.restrictive_ok then 'REVIEW' else 'PASS' end
         end,
         pp.permissive_by, pp.blocked_by,
         case
           when pp.permissive_ok and not pp.restrictive_ok then 'denied only because a RESTRICTIVE policy blocks it: that guard is the sole barrier (defence in depth)'
           when not pp.permissive_ok then 'denied: no permissive policy grants it'
           else ''
         end
  from per_probe pp
)
select check_name, expected, actual, verdict, permissive_by, blocked_by, note
from (
  select 0 as ord, 'OVERALL' as check_name, 'no FAIL rows' as expected,
         (select count(*)::text from rows_out where verdict = 'FAIL') || ' FAIL, ' || (select count(*)::text from rows_out where verdict = 'REVIEW') || ' REVIEW' as actual,
         case when (select count(*) from rows_out where verdict = 'FAIL') = 0 then 'PASS' else 'FAIL' end as verdict,
         '' as permissive_by, '' as blocked_by, '' as note
  union all
  select ord, check_name, expected, actual, verdict, permissive_by, blocked_by, note from rows_out
) all_rows
order by ord;
