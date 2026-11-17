-- =============================================================================
-- S6.3 REQUESTS & PROJECTS — PREFLIGHT 00b: RECONCILIATION (READ-ONLY)
-- Run in: Supabase SQL Editor (production) AFTER 00 and BEFORE any forward migration.
-- NOT YET EXECUTED.
--
-- 00 answered "do the columns exist". 00b collects the facts 00 could not, which the migration must not guess:
--   1. finalize_upload      full definition, signature(s), owner, ACL, dependants, triggers on the tables it writes
--   2. table shapes         every column, constraint, index, policy and browser privilege for the S6.3 tables
--   3. project_messages     row count (exact), constraints, indexes, policies, sender_role value counts
--   4. data compatibility   request/project linkage, progress range, milestone/deliverable counts and file shapes
--   5. file ownership       what project_files.uploaded_by looks like (SHAPE only) and what upload_sessions can prove
--   6. notifications        constraints and indexes that decide whether the new notification types are accepted
--   7. look-alike tables    anything already named like activity / audit / event / history / log
--
-- ONE statement, ONE grid: (section, item, value, note). It reads pg_catalog / information_schema and COUNTS rows.
-- It never selects a message body, an email, a name, a token or a file path. The one place a stored literal can
-- appear is project_files.uploaded_by, and only when it is exactly a role word (admin, client, hbee, system, user).
-- It writes nothing. pg_get_functiondef returns the function's SOURCE (code, not data).
-- =============================================================================
WITH
tbls(name) AS (VALUES ('project_requests'), ('projects'), ('project_files'), ('project_milestones'),
                      ('project_deliverables'), ('project_messages'), ('notifications'), ('upload_sessions'),
                      ('admin_users')),
rel AS (SELECT t.name, c.oid FROM tbls t JOIN pg_class c ON c.relname = t.name AND c.relnamespace = 'public'::regnamespace),

fn AS (
  SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload'
),
s1 AS (
  SELECT '1. finalize_upload' AS section, '(overloads)' AS item, count(*)::text AS value, 'more than one overload changes how a replacement must be written' AS note FROM fn
  UNION ALL SELECT '1. finalize_upload', 'signature', f.args, pg_get_function_result(f.oid) FROM fn f
  UNION ALL SELECT '1. finalize_upload', 'security',
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END || ' / owner ' || pg_get_userbyid(p.proowner) || ' / config ' || coalesce(p.proconfig::text, '<none>'),
         'acl ' || coalesce(p.proacl::text, '<default>')
         FROM fn f JOIN pg_proc p ON p.oid = f.oid
  UNION ALL SELECT '1. finalize_upload', 'definition', pg_get_functiondef(f.oid), 'the exact production body' FROM fn f
  UNION ALL SELECT '1. finalize_upload', 'dependant function: ' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')', '', 'its body mentions finalize_upload'
         FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosrc ILIKE '%finalize_upload%' AND p.proname <> 'finalize_upload'
  UNION ALL SELECT '1. finalize_upload', 'trigger on ' || tgrelid::regclass::text || ': ' || tgname, pg_get_triggerdef(oid), ''
         FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM rel WHERE name IN ('project_files', 'upload_sessions', 'project_requests', 'projects'))
),

s2cols AS (
  SELECT '2. columns', c.table_name || '.' || c.column_name, c.data_type,
         CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END || coalesce(' default ' || c.column_default, '')
  FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name IN (SELECT name FROM tbls)
),
s2con AS (
  SELECT '2. constraints', r.name || ' :: ' || k.conname, pg_get_constraintdef(k.oid), k.contype::text
  FROM pg_constraint k JOIN rel r ON r.oid = k.conrelid
),
s2idx AS (
  SELECT '2. indexes', i.tablename || ' :: ' || i.indexname, i.indexdef, '' FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename IN (SELECT name FROM tbls)
),
s2pol AS (
  SELECT '2. policies', p.tablename || ' :: ' || p.policyname, p.cmd || ' ' || p.permissive || ' ' || p.roles::text,
         'USING ' || coalesce(p.qual, '<none>') || ' | CHECK ' || coalesce(p.with_check, '<none>')
  FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename IN (SELECT name FROM tbls)
),
s2priv AS (
  SELECT '2. browser privileges', r.name || ' / ' || x.role,
         -- SELECT / INSERT / UPDATE can be held per COLUMN or per TABLE; DELETE exists only at TABLE level, and
         -- has_any_column_privilege() rejects it (22023), so DELETE uses has_table_privilege() alone.
         concat_ws(',', CASE WHEN has_any_column_privilege(x.role, r.oid, 'SELECT') OR has_table_privilege(x.role, r.oid, 'SELECT') THEN 'SELECT' END,
                        CASE WHEN has_any_column_privilege(x.role, r.oid, 'INSERT') OR has_table_privilege(x.role, r.oid, 'INSERT') THEN 'INSERT' END,
                        CASE WHEN has_any_column_privilege(x.role, r.oid, 'UPDATE') OR has_table_privilege(x.role, r.oid, 'UPDATE') THEN 'UPDATE' END,
                        CASE WHEN has_table_privilege(x.role, r.oid, 'DELETE') THEN 'DELETE' END),
         'INSERT/UPDATE/DELETE here lets a browser bypass server-side rules; S6.3 file ownership and status rules rely on it being empty'
  FROM rel r CROSS JOIN (VALUES ('anon'), ('authenticated')) AS x(role)
),

s3 AS (
  SELECT '3. project_messages' AS section, '(exact row count)' AS item, (SELECT count(*) FROM public.project_messages)::text AS value, 'exact, not an estimate' AS note
  UNION ALL SELECT '3. project_messages', 'sender_role = ' || coalesce(sender_role, '<null>'), count(*)::text, 'counts only; no message text is read'
         FROM public.project_messages GROUP BY sender_role
  UNION ALL SELECT '3. project_messages', '(rows with project_id null)', count(*)::text, '' FROM public.project_messages WHERE project_id IS NULL
  UNION ALL SELECT '3. project_messages', '(rows whose project no longer exists)', count(*)::text, ''
         FROM public.project_messages m WHERE m.project_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.projects p WHERE p.id = m.project_id)
),

s4 AS (
  SELECT '4. data' AS section, 'project_requests: rows' AS item, count(*)::text AS value, '' AS note FROM public.project_requests
  UNION ALL SELECT '4. data', 'project_requests: status = ' || coalesce(status, '<null>'), count(*)::text, 'every value must map in hbee_request_status()' FROM public.project_requests GROUP BY status
  UNION ALL SELECT '4. data', 'project_requests: response present', count(*)::text, '' FROM public.project_requests WHERE response IS NOT NULL AND btrim(response) <> ''
  UNION ALL SELECT '4. data', 'project_requests: linked to a project', count(*)::text, '' FROM public.project_requests WHERE project_id IS NOT NULL
  UNION ALL SELECT '4. data', 'project_requests: linked project belongs to the SAME client', count(*)::text, ''
         FROM public.project_requests r JOIN public.projects p ON p.id = r.project_id AND p.client_id = r.client_id
  UNION ALL SELECT '4. data', 'project_requests: projects shared by more than one request', count(*)::text, 'non-zero means requests are NOT one-to-one with projects'
         FROM (SELECT project_id FROM public.project_requests WHERE project_id IS NOT NULL GROUP BY project_id HAVING count(*) > 1) d
  UNION ALL SELECT '4. data', 'project_requests: oldest / newest', coalesce(min(created_at)::date::text, '-') || ' / ' || coalesce(max(created_at)::date::text, '-'), '' FROM public.project_requests
  UNION ALL SELECT '4. data', 'projects: rows with client_id', count(*)::text, 'client operational projects' FROM public.projects WHERE client_id IS NOT NULL
  UNION ALL SELECT '4. data', 'projects: rows WITHOUT client_id', count(*)::text, 'public portfolio / case-study rows: the S6.3 editors must refuse these' FROM public.projects WHERE client_id IS NULL
  UNION ALL SELECT '4. data', 'projects: status = ' || coalesce(status, '<null>') || ' / ' || CASE WHEN client_id IS NULL THEN 'no client' ELSE 'client' END, count(*)::text, '' FROM public.projects GROUP BY status, client_id IS NULL
  UNION ALL SELECT '4. data', 'projects: progress min / max', coalesce(min(progress)::text, '-') || ' / ' || coalesce(max(progress)::text, '-'), 'the API accepts 0..100' FROM public.projects WHERE client_id IS NOT NULL
  UNION ALL SELECT '4. data', 'projects: client projects with no request', count(*)::text, 'non-zero means projects also come from somewhere other than the request form'
         FROM public.projects p WHERE p.client_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.project_requests r WHERE r.project_id = p.id)
  UNION ALL SELECT '4. data', 'projects: reference shaped PROJ-*', count(*)::text, '' FROM public.projects WHERE project_id LIKE 'PROJ-%'
  UNION ALL SELECT '4. data', 'project_milestones: rows', count(*)::text, 'sort_order backfill order is irrelevant when this is 0' FROM public.project_milestones
  UNION ALL SELECT '4. data', 'project_milestones: status = ' || coalesce(status, '<null>'), count(*)::text, '' FROM public.project_milestones GROUP BY status
  UNION ALL SELECT '4. data', 'project_deliverables: rows', count(*)::text, 'existing rows must stay client-visible (default status ready)' FROM public.project_deliverables
  UNION ALL SELECT '4. data', 'project_deliverables: file_url shape = ' || CASE WHEN file_url IS NULL OR btrim(file_url) = '' THEN 'none' WHEN file_url ~* '^https?://' THEN 'http(s) URL' ELSE 'bare path' END, count(*)::text, '' FROM public.project_deliverables GROUP BY 2
  UNION ALL SELECT '4. data', 'project_deliverables: whose project is unowned (client_id null)', count(*)::text, ''
         FROM public.project_deliverables d JOIN public.projects p ON p.id = d.project_id WHERE p.client_id IS NULL
),

s5 AS (
  SELECT '5. file ownership' AS section,
         'project_files.uploaded_by shape = ' || CASE
           WHEN uploaded_by IS NULL THEN 'null'
           WHEN lower(btrim(uploaded_by)) IN ('admin', 'client', 'hbee', 'system', 'user') THEN 'role word: ' || lower(btrim(uploaded_by))
           WHEN uploaded_by ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN 'uuid text'
           WHEN uploaded_by LIKE '%@%' THEN 'email-like'
           ELSE 'other text' END AS item,
         count(*)::text AS value, 'shape only' AS note
  FROM public.project_files GROUP BY 2
  UNION ALL SELECT '5. file ownership', 'project_files: rows', count(*)::text, '' FROM public.project_files
  UNION ALL SELECT '5. file ownership', 'upload_sessions evidence = ' || e.verdict, count(*)::text,
         'DETERMINISTIC only for "admin" or "client"; everything else must stay NULL (client cannot delete)'
  FROM (
    SELECT CASE WHEN x.n IS NULL OR x.n = 0 THEN 'no upload session for this file'
                WHEN x.n > 1 THEN 'several sessions (ambiguous)'
                WHEN x.is_admin AND x.is_client THEN 'uploader is both admin and the file''s client (ambiguous)'
                WHEN x.is_admin THEN 'admin'
                WHEN x.is_client THEN 'client'
                ELSE 'session uploader is neither (ambiguous)' END AS verdict
    FROM public.project_files f
    LEFT JOIN LATERAL (
      SELECT count(*) AS n,
             coalesce(bool_or(EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id = s.uploader_user_id)), false) AS is_admin,
             coalesce(bool_or(EXISTS (SELECT 1 FROM public.clients c WHERE c.id = f.client_id AND c.user_id = s.uploader_user_id)), false) AS is_client
      FROM public.upload_sessions s WHERE s.result_file_id = f.id
    ) x ON true
  ) e GROUP BY e.verdict
),

s6 AS (
  SELECT '6. notifications' AS section, 'rows' AS item, count(*)::text AS value, '' AS note FROM public.notifications
  UNION ALL SELECT '6. notifications', 'type = ' || coalesce(type, '<null>'), count(*)::text, 'types already accepted in production' FROM public.notifications GROUP BY type
  UNION ALL SELECT '6. notifications', 'recipient_scope = ' || coalesce(recipient_scope, '<null>'), count(*)::text, '' FROM public.notifications GROUP BY recipient_scope
),

s7 AS (
  SELECT '7. look-alike tables', c.relname::text, c.relkind::text, 'an existing table that might make activity_events redundant'
  FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('r', 'v', 'p')
    AND c.relname ~* '(activity|audit|event|history|_log$|^log_)'
)

SELECT * FROM s1
UNION ALL SELECT * FROM s2cols
UNION ALL SELECT * FROM s2con
UNION ALL SELECT * FROM s2idx
UNION ALL SELECT * FROM s2pol
UNION ALL SELECT * FROM s2priv
UNION ALL SELECT * FROM s3
UNION ALL SELECT * FROM s4
UNION ALL SELECT * FROM s5
UNION ALL SELECT * FROM s6
UNION ALL SELECT * FROM s7
ORDER BY 1, 2;
