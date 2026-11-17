-- =============================================================================
-- S6.3 REQUESTS & PROJECTS — VERIFIER (READ-ONLY), run AFTER requests-projects-01-forward.sql.
-- ONE statement, ONE grid: (check_name, verdict, detail). Reads pg_catalog only; it never selects row content and
-- writes nothing. The last row is OVERALL (PASS only when no row is FAIL). REVIEW / INFO rows do not fail it.
--
-- HOW EXISTING TABLES ARE JUDGED. A raw GRANT is not an exposure: Supabase grants broad table privileges to
-- `authenticated` and relies on RLS. So for the existing operational tables this verifier reads the PERMISSIVE
-- policies (pg_policies) and asks, per policy, per operation, per browser role:
--     does the policy APPLY to the role  AND  does the role HOLD the privilege  AND  is the policy NOT confined to
--     an active admin (qual / with_check test admin_users + is_active) or, for reads, to the caller's own rows
--     (auth.uid() / current_client_id()) or, for projects, to published client-less rows?
-- Only that combination is a FAIL ("client-effective"). A privilege that RLS fully confines to active admins is
-- reported as PASS. (RESTRICTIVE policies can only narrow access, so ignoring them is the conservative direction.)
-- It cannot execute a policy expression against live data; that remains the staging walkthrough.
--
-- NEW SERVER-ONLY TABLES are proven structurally: RLS on, NO policy, no browser privilege of any kind.
-- Cross-client isolation of thread / activity data therefore rests on the routes + SECURITY DEFINER functions
-- (covered by scripts/test-requests-projects.cjs), because no browser role can reach those tables at all.
-- =============================================================================
WITH
nt(name) AS (VALUES ('thread_messages'), ('activity_events'), ('project_team_assignments'), ('s63_function_backups')),
ntr AS (
  SELECT n.name, c.oid, c.relrowsecurity AS rls
  FROM nt n LEFT JOIN pg_class c ON c.relname = n.name AND c.relnamespace = 'public'::regnamespace
),
fn(sig) AS (VALUES ('public.create_portal_request(uuid,uuid,text,text,text,text)'),
                   ('public.post_request_message(uuid,uuid,uuid,text,text,boolean,uuid,text)'),
                   ('public.set_request_status(uuid,uuid,uuid,text,text)'),
                   ('public.mark_request_read(uuid,uuid,text)'), ('public.hbee_request_status(text)')),
f AS (SELECT sig, to_regprocedure(sig) AS oid FROM fn),
newcol(t, c, ty, dflt) AS (VALUES
  ('project_requests', 'last_activity_at', 'timestamp with time zone', NULL),
  ('project_files', 'uploaded_by_role', 'text', NULL),
  ('project_milestones', 'sort_order', 'integer', '%0%'),
  ('project_deliverables', 'status', 'text', '%ready%'),
  ('project_deliverables', 'due_date', 'date', NULL)),
idx(name) AS (VALUES ('thread_messages_request_idx'), ('thread_messages_client_idx'), ('thread_messages_author_key_uidx'),
                     ('activity_events_client_idx'), ('activity_events_project_idx'), ('activity_events_request_idx'),
                     ('activity_events_dedupe_uidx'), ('project_team_assignments_admin_idx')),
fin AS (SELECT p.oid, p.prosecdef, p.proconfig, p.proacl, p.proowner,
               pg_get_function_identity_arguments(p.oid) AS args, pg_get_function_result(p.oid) AS rtype,
               pg_get_functiondef(p.oid) AS def
        FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload'),

-- ── activity_events append-only triggers, read from pg_trigger flags (tgtype: 1 row-level, 2 BEFORE, 8 DELETE, 16 UPDATE, 32 TRUNCATE) ──
tgc AS (
  SELECT coalesce(bool_or((t.tgtype & 2) = 2 AND (t.tgtype & 1) = 1 AND (t.tgtype & 16) = 16), false) AS has_update,
         coalesce(bool_or((t.tgtype & 2) = 2 AND (t.tgtype & 1) = 1 AND (t.tgtype & 8) = 8), false) AS has_delete,
         coalesce(bool_or((t.tgtype & 2) = 2 AND (t.tgtype & 1) = 0 AND (t.tgtype & 32) = 32), false) AS has_truncate,
         EXISTS (SELECT 1 FROM pg_proc fp WHERE fp.oid = to_regproc('public.activity_events_append_only')
                   AND fp.prosrc ~* 'raise\s+exception' AND fp.prosrc !~* '\mreturn\M') AS function_refuses
  FROM pg_trigger t
  WHERE t.tgrelid = to_regclass('public.activity_events') AND NOT t.tgisinternal
    AND t.tgfoid = to_regproc('public.activity_events_append_only')
    AND t.tgenabled IN ('O', 'A')
),

-- ── effective RLS on the EXISTING operational tables ───────────────────────────────────────────────────────
pol AS (
  SELECT p.tablename AS tbl, p.policyname, p.cmd,
         coalesce(p.qual, '') AS q, coalesce(p.with_check, '') AS wc,
         p.roles && ARRAY['public', 'authenticated']::name[] AS app_auth,
         p.roles && ARRAY['public', 'anon']::name[] AS app_anon,
         -- ADMIN-ONLY: the predicate requires an ACTIVE ADMIN, either inline (admin_users + is_active) or through the
         -- is_active_admin() helper. A policy whose role list is `authenticated` but whose predicate is
         -- `... AND is_active_admin()` cannot be satisfied by an ordinary client, so it is admin-only, not client-effective.
         ((coalesce(p.qual, '') ~* 'admin_users' AND coalesce(p.qual, '') ~* 'is_active')
            OR coalesce(p.qual, '') ~* 'is_active_admin\s*\(') AS q_admin,
         ((coalesce(p.with_check, '') ~* 'admin_users' AND coalesce(p.with_check, '') ~* 'is_active')
            OR coalesce(p.with_check, '') ~* 'is_active_admin\s*\(') AS wc_admin,
         -- SERVICE-ROLE-ONLY: the predicate is auth.role() = 'service_role'. A policy granted TO PUBLIC is merely
         -- CONSIDERED for every role; for a browser user auth.role() is 'authenticated' / 'anon', so it grants nothing.
         (coalesce(p.qual, '') ~* 'auth\.role\(\)\s*=\s*''service_role''') AS svc_q,
         (coalesce(p.with_check, '') ~* 'auth\.role\(\)\s*=\s*''service_role''') AS svc_wc,
         -- A CLIENT write path on notifications is acceptable only when it is pinned to the client scope AND to the
         -- caller's own client id:  recipient_scope = 'client'  AND  recipient_id = current_client_id().
         -- Clients intentionally mark their OWN notifications read, so this is the required shape, not a failure.
         --   * The expression is first CANONICALIZED (qc / wcc below) so PostgreSQL's own formatting cannot create a
         --     false negative: `::text` casts are dropped, every parenthesis becomes a space, `=` gets single spaces,
         --     whitespace is collapsed. PostgreSQL prints the production policy as
         --       (((recipient_scope)::text = 'client'::text) AND (recipient_id = current_client_id()))
         --     which canonicalizes to
         --       recipient_scope = 'client' AND recipient_id = current_client_id
         --   * On the canonical text BOTH halves are required as exact equalities: scope = 'client' AND
         --     recipient_id = current_client_id (also `= (SELECT current_client_id() ...)` and the reversed
         --     comparison). The expression must also contain no OR and no NOT, so it is a pure conjunction and
         --     neither half can be bypassed. It is NOT a keyword search: `true`, a scope with no ownership,
         --     ownership with no scope, or an equality against another column all fail.
         --   * WITH CHECK must keep the same boundary — or be absent, in which case PostgreSQL applies USING to
         --     the new row as well, so the boundary is preserved either way.
         (p.qc ~* 'recipient_scope = ''client'''
            AND p.qc ~* 'recipient_id = (?:SELECT )?(?:public\.)?current_client_id\M|current_client_id (?:AS current_client_id )?= recipient_id\M'
            AND p.qc !~* '\mOR\M' AND p.qc !~* '\mNOT\M'
            AND (coalesce(p.with_check, '') = ''
                 OR (p.wcc ~* 'recipient_scope = ''client'''
                     AND p.wcc ~* 'recipient_id = (?:SELECT )?(?:public\.)?current_client_id\M|current_client_id (?:AS current_client_id )?= recipient_id\M'
                     AND p.wcc !~* '\mOR\M' AND p.wcc !~* '\mNOT\M'))) AS notif_owned,
         (coalesce(p.qual, '') ~* 'auth\.uid\(\)|current_client_id\(\)') AS own_rows,
         (coalesce(p.qual, '') ~* 'status\s*=\s*''published''' AND coalesce(p.qual, '') ~* 'client_id\s+IS\s+NULL') AS public_pub
  FROM (SELECT x.*,
               -- canonical form: casts dropped, parentheses -> spaces, '=' spaced, whitespace collapsed
               btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(x.qual, ''),
                 '::(?:text|character varying|varchar)', '', 'gi'), '[()]', ' ', 'g'), '\s*=\s*', ' = ', 'g'), '\s+', ' ', 'g')) AS qc,
               btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(x.with_check, ''),
                 '::(?:text|character varying|varchar)', '', 'gi'), '[()]', ' ', 'g'), '\s*=\s*', ' = ', 'g'), '\s+', ' ', 'g')) AS wcc
        FROM pg_policies x) p
  WHERE p.schemaname = 'public' AND p.permissive = 'PERMISSIVE'
    AND p.tablename IN ('project_deliverables', 'project_milestones', 'project_messages', 'projects', 'project_requests',
                        'project_files', 'notifications')
),
eff AS (
  SELECT pl.tbl, pl.policyname, o.op, rl.role,
         (CASE WHEN o.op = 'SELECT' THEN pl.q_admin OR pl.own_rows OR (pl.tbl = 'projects' AND pl.public_pub)
               WHEN o.op = 'INSERT' THEN CASE WHEN pl.cmd = 'ALL' AND pl.wc = '' THEN pl.q_admin ELSE pl.wc_admin END
               ELSE pl.q_admin END
          OR (CASE WHEN o.op = 'INSERT' THEN CASE WHEN pl.cmd = 'ALL' AND pl.wc = '' THEN pl.svc_q ELSE pl.svc_wc END
                   ELSE pl.svc_q END)
          OR (pl.tbl = 'notifications' AND o.op <> 'SELECT' AND pl.notif_owned)) AS confined,
         CASE WHEN rl.role = 'anon' THEN pl.app_anon ELSE pl.app_auth END AS applies,
         CASE WHEN o.op = 'DELETE' THEN has_table_privilege(rl.role, to_regclass('public.' || pl.tbl), 'DELETE')
              ELSE has_table_privilege(rl.role, to_regclass('public.' || pl.tbl), o.op)
                   OR has_any_column_privilege(rl.role, to_regclass('public.' || pl.tbl), o.op) END AS holds
  FROM pol pl
  CROSS JOIN LATERAL unnest(CASE WHEN pl.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
                                 WHEN pl.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN ARRAY[pl.cmd]
                                 ELSE ARRAY[]::text[] END) AS o(op)
  CROSS JOIN (VALUES ('anon'), ('authenticated')) AS rl(role)
),
bad AS (SELECT * FROM eff WHERE applies AND holds AND NOT confined),
guard_tbl(tbl) AS (VALUES ('project_deliverables'), ('project_milestones'), ('project_messages'), ('projects'),
                          ('project_requests'), ('project_files'), ('notifications')),

res AS (
  SELECT 10 AS o, 'table exists: ' || name AS check_name, CASE WHEN oid IS NULL THEN 'FAIL' ELSE 'PASS' END AS verdict, '' AS detail FROM ntr
  UNION ALL SELECT 20, 'RLS enabled: ' || name, CASE WHEN rls THEN 'PASS' ELSE 'FAIL' END, '' FROM ntr WHERE oid IS NOT NULL
  UNION ALL SELECT 30, 'no policies (server-only): ' || name,
         CASE WHEN (SELECT count(*) FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = ntr.name) = 0 THEN 'PASS' ELSE 'FAIL' END,
         'a browser policy would make the table readable under that role' FROM ntr WHERE oid IS NOT NULL
  UNION ALL SELECT 40, 'browser roles hold no privilege: ' || ntr.name || ' / ' || role,
         CASE WHEN has_table_privilege(role, ntr.oid, 'SELECT') OR has_any_column_privilege(role, ntr.oid, 'SELECT')
                OR has_table_privilege(role, ntr.oid, 'INSERT') OR has_any_column_privilege(role, ntr.oid, 'INSERT')
                OR has_table_privilege(role, ntr.oid, 'UPDATE') OR has_any_column_privilege(role, ntr.oid, 'UPDATE')
                OR has_table_privilege(role, ntr.oid, 'DELETE') THEN 'FAIL' ELSE 'PASS' END, ''
         FROM ntr CROSS JOIN (VALUES ('anon'), ('authenticated')) AS x(role) WHERE ntr.oid IS NOT NULL
  UNION ALL SELECT 50, 'service_role can read+insert: ' || name,
         CASE WHEN has_table_privilege('service_role', oid, 'SELECT') AND has_table_privilege('service_role', oid, 'INSERT') THEN 'PASS' ELSE 'FAIL' END, ''
         FROM ntr WHERE oid IS NOT NULL AND name <> 's63_function_backups'
  -- activity_events is append-only in TWO independent layers, reported separately and with the ACTUAL state in the
  -- detail (a static sentence next to a FAIL is how this check was misread before):
  --   60  service_role can read and add events                         (must hold SELECT and INSERT)
  --   61  triggers refuse UPDATE / DELETE (row) and TRUNCATE (statement)  (enforcement that does not depend on grants)
  --   62  service_role holds NO UPDATE / DELETE / TRUNCATE grant        (PASS when none is held)
  UNION ALL SELECT 60, 'activity_events: service_role holds SELECT and INSERT',
         CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'SELECT')
               AND has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'INSERT') THEN 'PASS' ELSE 'FAIL' END,
         'service_role privileges: ' || coalesce(nullif(concat_ws(', ',
           CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'SELECT') THEN 'SELECT' END,
           CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'INSERT') THEN 'INSERT' END), ''), '(none)')
  UNION ALL SELECT 61, 'activity_events: triggers refuse UPDATE, DELETE and TRUNCATE',
         -- Read from the trigger's own flags (pg_trigger.tgtype), NOT from pg_get_triggerdef() text: PostgreSQL prints
         -- the events in its own order ("BEFORE DELETE OR UPDATE"), so a text match on "UPDATE OR DELETE" failed on a
         -- correct trigger. Each operation must have an ENABLED BEFORE trigger that calls the append-only function, and
         -- that function must do nothing but raise.
         CASE WHEN tg.has_update AND tg.has_delete AND tg.has_truncate AND tg.function_refuses THEN 'PASS' ELSE 'FAIL' END,
         'UPDATE ' || CASE WHEN tg.has_update THEN 'refused' ELSE 'NOT refused' END
           || ' | DELETE ' || CASE WHEN tg.has_delete THEN 'refused' ELSE 'NOT refused' END
           || ' | TRUNCATE ' || CASE WHEN tg.has_truncate THEN 'refused' ELSE 'NOT refused' END
           || ' | append-only function ' || CASE WHEN tg.function_refuses THEN 'only raises (42501)' ELSE 'missing or does not unconditionally raise' END
         FROM tgc tg
  UNION ALL SELECT 62, 'activity_events: service_role holds no UPDATE / DELETE / TRUNCATE grant',
         CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'UPDATE')
                OR has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'DELETE')
                OR has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'TRUNCATE') THEN 'FAIL' ELSE 'PASS' END,
         'service_role holds: ' || coalesce(nullif(concat_ws(', ',
           CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'UPDATE') THEN 'UPDATE' END,
           CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'DELETE') THEN 'DELETE' END,
           CASE WHEN has_table_privilege('service_role', (SELECT oid FROM ntr WHERE name = 'activity_events'), 'TRUNCATE') THEN 'TRUNCATE' END), ''),
           'none of UPDATE / DELETE / TRUNCATE')
         || '. A FAIL here means a grant exists (Supabase default privileges give service_role ALL on new public tables and the forward only ADDED SELECT, INSERT); the triggers in 61 still refuse the writes.'

  -- functions
  UNION ALL SELECT 70, 'function exists: ' || sig, CASE WHEN oid IS NULL THEN 'FAIL' ELSE 'PASS' END, '' FROM f
  -- The four OPERATIONAL functions read and write tables the browser roles cannot touch, so they must be SECURITY
  -- DEFINER with a pinned search_path. hbee_request_status(text) is a pure IMMUTABLE mapper (no table access): it needs
  -- no elevated rights, so it is judged by 73 instead and is deliberately not forced to be SECURITY DEFINER.
  UNION ALL SELECT 71, 'function is SECURITY DEFINER with pinned search_path: ' || sig,
         CASE WHEN p.prosecdef AND p.proconfig::text ILIKE '%search_path%' THEN 'PASS' ELSE 'FAIL' END, ''
         FROM f JOIN pg_proc p ON p.oid = f.oid WHERE f.oid IS NOT NULL AND f.sig NOT LIKE 'public.hbee_request_status(%'
  UNION ALL SELECT 73, 'hbee_request_status(text): pure immutable SQL helper with pinned search_path (SECURITY DEFINER not required)',
         CASE WHEN p.oid IS NOT NULL AND l.lanname = 'sql' AND p.provolatile = 'i' AND p.proconfig::text ILIKE '%search_path%' THEN 'PASS' ELSE 'FAIL' END,
         CASE WHEN p.oid IS NULL THEN 'function missing'
              ELSE 'language ' || l.lanname || ', volatility ' || CASE p.provolatile WHEN 'i' THEN 'immutable' WHEN 's' THEN 'stable' ELSE 'volatile' END
                   || ', ' || CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END || '; EXECUTE is judged by check 72' END
         FROM (SELECT 1) one
         LEFT JOIN pg_proc p ON p.oid = to_regprocedure('public.hbee_request_status(text)')
         LEFT JOIN pg_language l ON l.oid = p.prolang
  UNION ALL SELECT 72, 'EXECUTE: service_role yes, anon/authenticated/PUBLIC no: ' || sig,
         CASE WHEN has_function_privilege('service_role', f.oid, 'EXECUTE')
               AND NOT has_function_privilege('anon', f.oid, 'EXECUTE')
               AND NOT has_function_privilege('authenticated', f.oid, 'EXECUTE')
               AND NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                               WHERE p.oid = f.oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END, ''
         FROM f WHERE f.oid IS NOT NULL

  -- finalize_upload: atomic ownership stamp, shape preserved
  UNION ALL SELECT 80, 'finalize_upload: exactly one overload', CASE WHEN (SELECT count(*) FROM fin) = 1 THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 81, 'finalize_upload: (p_upload_id uuid, p_actor uuid) -> jsonb, SECURITY DEFINER, search_path public, pg_temp',
         CASE WHEN EXISTS (SELECT 1 FROM fin WHERE args = 'p_upload_id uuid, p_actor uuid' AND rtype = 'jsonb' AND prosecdef
                             AND proconfig::text LIKE '%search_path=public, pg_temp%') THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 82, 'finalize_upload: executable by service_role only',
         CASE WHEN EXISTS (SELECT 1 FROM fin WHERE has_function_privilege('service_role', oid, 'EXECUTE')
                             AND NOT has_function_privilege('anon', oid, 'EXECUTE')
                             AND NOT has_function_privilege('authenticated', oid, 'EXECUTE')
                             AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(fin.proacl, acldefault('f', fin.proowner))) a
                                              WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 83, 'finalize_upload: stamps uploaded_by_role = v_s.uploader_role inside the project_files INSERT (atomic ownership)',
         CASE WHEN EXISTS (SELECT 1 FROM fin
                            WHERE (length(def) - length(replace(def, 'uploaded_by_role', ''))) / length('uploaded_by_role') = 1
                              AND def ~ 'v_uploaded_by,\s*v_s\.uploader_role'
                              AND def ~* 'INSERT\s+INTO\s+(public\.)?project_files[^;]*uploaded_by,\s*uploaded_by_role') THEN 'PASS' ELSE 'FAIL' END,
         'the original v_uploaded_by := v_s.uploader_role assignment must still be present too: '
         || CASE WHEN EXISTS (SELECT 1 FROM fin WHERE def ~ 'v_uploaded_by\s*:=\s*v_s\.uploader_role') THEN 'yes' ELSE 'NO' END
  UNION ALL SELECT 84, 'finalize_upload: original definition saved for rollback',
         CASE WHEN to_regclass('public.s63_function_backups') IS NOT NULL
               AND EXISTS (SELECT 1 FROM public.s63_function_backups WHERE name = 'finalize_upload' AND definition NOT LIKE '%uploaded_by_role%') THEN 'PASS' ELSE 'FAIL' END, ''

  -- columns
  UNION ALL SELECT 90, 'column present with expected type/default: ' || t || '.' || c,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns x
                            WHERE x.table_schema = 'public' AND x.table_name = newcol.t AND x.column_name = newcol.c AND x.data_type = newcol.ty
                              AND (newcol.dflt IS NULL OR x.column_default LIKE newcol.dflt)) THEN 'PASS' ELSE 'FAIL' END, '' FROM newcol
  UNION ALL SELECT 91, 'pre-existing project_milestones.completed_at kept (not added or dropped by S6.3)',
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_milestones'
                             AND column_name = 'completed_at' AND data_type IN ('timestamp with time zone', 'timestamp without time zone', 'date')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 92, 'project_deliverables.file_url is NOT NULL (every deliverable has a file or link)', 'INFO',
         'is_nullable = ' || coalesce((SELECT is_nullable FROM information_schema.columns WHERE table_schema = 'public'
                                        AND table_name = 'project_deliverables' AND column_name = 'file_url'), 'column missing')
  UNION ALL SELECT 95, 'index exists: ' || name, CASE WHEN to_regclass('public.' || name) IS NULL THEN 'FAIL' ELSE 'PASS' END, '' FROM idx

  -- constraints
  UNION ALL SELECT 100, 'internal notes cannot be client-authored (CHECK)',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'thread_messages_no_client_internal'
                             AND conrelid = to_regclass('public.thread_messages')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 101, 'deliverable status CHECK present',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_deliverables_status_check') THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 102, 'file ownership: uploaded_by_role CHECK (client|admin) present',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_files_uploaded_by_role_check'
                             AND conrelid = to_regclass('public.project_files')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 103, 'projects_status_check kept and still admits Pending Review',
         CASE WHEN EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.projects'::regclass AND conname = 'projects_status_check'
                             AND pg_get_constraintdef(oid) LIKE '%''Pending Review''::text%') THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 104, 'notification idempotency: unique index on idempotency_key',
         CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND tablename = 'notifications'
                             AND indexdef ILIKE '%UNIQUE%' AND indexdef ILIKE '%idempotency_key%') THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 105, 'request status compatibility: every stored status maps in the mapper',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_requests
                                WHERE lower(btrim(coalesce(status, ''))) NOT IN
                                  ('', 'open', 'new', 'pending', 'in_review', 'in review', 'under review', 'in progress', 'in_progress', 'reviewing',
                                   'answered', 'responded', 'replied', 'closed', 'resolved', 'completed', 'done')) THEN 'PASS' ELSE 'FAIL' END, ''

  -- historical file ownership: conservative
  UNION ALL SELECT 110, 'historical files: classified client (from unambiguous upload_sessions evidence)', 'INFO',
         (SELECT count(*) FROM public.project_files WHERE uploaded_by_role = 'client')::text
  UNION ALL SELECT 111, 'historical files: unknown (NULL) — protected, a client cannot delete them', 'INFO',
         (SELECT count(*) FROM public.project_files WHERE uploaded_by_role IS NULL)::text
  UNION ALL SELECT 112, 'no file is classified against its upload session',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_files f JOIN public.upload_sessions s ON s.result_file_id = f.id
                                WHERE f.uploaded_by_role IS NOT NULL AND f.uploaded_by_role <> s.uploader_role) THEN 'PASS' ELSE 'FAIL' END,
         'a row whose stored ownership contradicts the session that created it'
  UNION ALL SELECT 113, 'no file with an unknown owner could be deleted by a client: the only deletable value is client',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_files WHERE uploaded_by_role IS NOT NULL AND uploaded_by_role NOT IN ('client', 'admin')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 114, 'project_files / project_requests: no browser write privilege at all (ownership + status rules live in server code)',
         CASE WHEN NOT EXISTS (
                SELECT 1 FROM (VALUES ('project_files'), ('project_requests')) AS x(t) CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role)
                WHERE has_table_privilege(r.role, to_regclass('public.' || x.t), 'INSERT') OR has_any_column_privilege(r.role, to_regclass('public.' || x.t), 'INSERT')
                   OR has_table_privilege(r.role, to_regclass('public.' || x.t), 'UPDATE') OR has_any_column_privilege(r.role, to_regclass('public.' || x.t), 'UPDATE')
                   OR has_table_privilege(r.role, to_regclass('public.' || x.t), 'DELETE')) THEN 'PASS' ELSE 'FAIL' END,
         'a browser write path here would let a client stamp its own uploaded_by_role or set a request status'

  -- effective RLS (client-effective access on the existing tables)
  UNION ALL SELECT 200 + row_number() OVER (ORDER BY g.tbl), 'effective RLS: no client-effective WRITE on ' || g.tbl,
         CASE WHEN EXISTS (SELECT 1 FROM bad b WHERE b.tbl = g.tbl AND b.op IN ('INSERT', 'UPDATE', 'DELETE')) THEN 'FAIL' ELSE 'PASS' END,
         coalesce((SELECT string_agg(b.policyname || ' [' || b.op || ' as ' || b.role || ']', '; ') FROM bad b WHERE b.tbl = g.tbl AND b.op IN ('INSERT', 'UPDATE', 'DELETE')),
                  'every policy that grants a write is confined to an active admin' ||
                  CASE WHEN g.tbl = 'notifications' THEN ' or to the recipient''s own rows' ELSE '' END)
         FROM guard_tbl g
         -- notifications is judged by its own, intentionally different rows (243 / 244): a client MUST be able to
         -- update its own notifications (mark read), so "no client-effective write" is the wrong requirement there.
         WHERE g.tbl <> 'notifications'
  UNION ALL SELECT 220 + row_number() OVER (ORDER BY g.tbl), 'effective RLS: no cross-client / unscoped READ on ' || g.tbl,
         CASE WHEN EXISTS (SELECT 1 FROM bad b WHERE b.tbl = g.tbl AND b.op = 'SELECT') THEN 'FAIL' ELSE 'PASS' END,
         coalesce((SELECT string_agg(b.policyname || ' [as ' || b.role || ']', '; ') FROM bad b WHERE b.tbl = g.tbl AND b.op = 'SELECT'),
                  'every readable policy is admin-only, own-rows (auth.uid / current_client_id)' ||
                  CASE WHEN g.tbl = 'projects' THEN ' or published client-less rows' ELSE '' END)
         FROM guard_tbl g
  UNION ALL SELECT 240, 'projects: anonymous access is limited to published rows with no client (client operational projects are not public)',
         CASE WHEN NOT EXISTS (SELECT 1 FROM bad WHERE tbl = 'projects' AND role = 'anon')
               AND EXISTS (SELECT 1 FROM pol WHERE tbl = 'projects' AND cmd = 'SELECT' AND app_anon AND public_pub) THEN 'PASS' ELSE 'FAIL' END,
         'needs a SELECT policy for anon/public whose qual is status = ''published'' AND client_id IS NULL'
  UNION ALL SELECT 241, 'client-effective INSERT/UPDATE/DELETE on project_deliverables or project_milestones',
         CASE WHEN EXISTS (SELECT 1 FROM bad WHERE tbl IN ('project_deliverables', 'project_milestones') AND op IN ('INSERT', 'UPDATE', 'DELETE')) THEN 'FAIL' ELSE 'PASS' END, ''
  UNION ALL SELECT 242, 'client-effective write to legacy project_messages (internal thread data lives in thread_messages, server-only)',
         CASE WHEN EXISTS (SELECT 1 FROM bad WHERE tbl = 'project_messages' AND op IN ('INSERT', 'UPDATE', 'DELETE')) THEN 'FAIL' ELSE 'PASS' END, ''
  UNION ALL SELECT 243, 'notifications: client UPDATE is own-recipient scoped (recipient_scope = client AND recipient_id = current_client_id(); WITH CHECK keeps it)',
         CASE WHEN EXISTS (SELECT 1 FROM pol WHERE tbl = 'notifications' AND cmd IN ('UPDATE', 'ALL') AND app_auth AND NOT q_admin AND notif_owned)
               AND NOT EXISTS (SELECT 1 FROM bad WHERE tbl = 'notifications' AND op IN ('INSERT', 'UPDATE', 'DELETE')) THEN 'PASS' ELSE 'FAIL' END,
         coalesce((SELECT 'own-recipient policy: ' || string_agg(policyname, ', ') FROM pol WHERE tbl = 'notifications' AND cmd IN ('UPDATE', 'ALL') AND app_auth AND NOT q_admin AND notif_owned),
                  'NO policy lets a client update its own notifications with both recipient_scope = client and recipient_id = current_client_id()')
         || coalesce((SELECT ' | offending: ' || string_agg(b.policyname || ' [' || b.op || ' as ' || b.role || '] USING ' || left(pl.q, 160) || ' CHECK ' || left(pl.wc, 160), '; ')
                      FROM bad b JOIN pol pl ON pl.tbl = b.tbl AND pl.policyname = b.policyname
                      WHERE b.tbl = 'notifications' AND b.op IN ('INSERT', 'UPDATE', 'DELETE')), '')
  UNION ALL SELECT 244, 'a client cannot mutate another client''s notifications (every client write policy is own-recipient scoped; active-admin policies are not client paths)',
         CASE WHEN EXISTS (SELECT 1 FROM bad WHERE tbl = 'notifications' AND op IN ('INSERT', 'UPDATE', 'DELETE')) THEN 'FAIL' ELSE 'PASS' END,
         coalesce((SELECT 'offending: ' || string_agg(b.policyname || ' [' || b.op || ' as ' || b.role || '] USING ' || left(pl.q, 160) || ' CHECK ' || left(pl.wc, 160), '; ')
                   FROM bad b JOIN pol pl ON pl.tbl = b.tbl AND pl.policyname = b.policyname
                   WHERE b.tbl = 'notifications' AND b.op IN ('INSERT', 'UPDATE', 'DELETE')), 'no unscoped client write policy')
  UNION ALL SELECT 250, 'raw grants that RLS confines are NOT counted as exposure', 'INFO',
         (SELECT count(*) FROM eff WHERE applies AND holds AND confined)::text || ' (policy, operation, role) combination(s) hold a privilege but are confined by policy'
  UNION ALL SELECT 251, 'legacy project_messages is not used by S6.3', 'INFO',
         'rows = ' || (SELECT count(*) FROM public.project_messages)::text
)
SELECT check_name, verdict, detail FROM (
  SELECT o, check_name, verdict, detail FROM res
  UNION ALL
  SELECT 9999, 'OVERALL', CASE WHEN (SELECT count(*) FROM res WHERE verdict = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END,
         (SELECT count(*) FROM res WHERE verdict = 'FAIL')::text || ' failing check(s)'
) z
ORDER BY o, check_name;
