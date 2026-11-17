-- =============================================================================
-- S6.3 REQUESTS & PROJECTS — PREFLIGHT (READ-ONLY)
-- Run in: Supabase SQL Editor (production), BEFORE requests-projects-01-forward.sql.
-- Prepared for S6.3. NOT YET EXECUTED.
--
-- ONE statement, ONE result grid: (section, item, value, note). Reads only pg_catalog /
-- information_schema and COUNTS of rows. It never selects a row's content, an email, a token
-- or a message body, and it writes nothing.
--
-- WHAT IT PROVES / SURFACES (the repository has no DDL for these tables, so these are the
-- facts the forward migration assumes):
--   1. every table/column the forward migration references exists with the type it expects;
--   2. project_messages — its columns and ROW COUNT, so the "reuse vs replace" decision
--      (see docs/s6-3-requests-projects.md) can be confirmed or overturned with evidence;
--   3. which status values project_requests / project_milestones / projects really contain;
--   4. CHECK constraints on the tables the forward migration alters;
--   5. what project_files.uploaded_by actually holds (shape only, as counts);
--   6. the admin_users columns (decides whether a delivery-team display name is possible);
--   7. that the NEW object names are still free.
-- =============================================================================
WITH
cols AS (
  SELECT table_name, column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name IN ('project_requests','projects','project_files','project_milestones','project_deliverables',
                       'project_messages','admin_users','clients','merchants','notifications','upload_sessions')
),
need(table_name, column_name, want_type) AS (VALUES
  ('project_requests','id','uuid'), ('project_requests','client_id','uuid'), ('project_requests','title','text'),
  ('project_requests','description','text'), ('project_requests','status','text'), ('project_requests','project_id','uuid'),
  ('project_requests','response','text'), ('project_requests','created_at','timestamp with time zone'),
  ('projects','id','uuid'), ('projects','client_id','uuid'), ('projects','project_id','text'), ('projects','status','text'),
  ('projects','progress','integer'),
  ('project_files','id','uuid'), ('project_files','client_id','uuid'), ('project_files','project_id','uuid'),
  ('project_files','file_url','text'), ('project_files','uploaded_by', NULL),
  ('project_milestones','id','uuid'), ('project_milestones','project_id','uuid'), ('project_milestones','status','text'),
  ('project_milestones','due_date', NULL), ('project_milestones','completed_at', NULL),
  ('project_deliverables','id','uuid'), ('project_deliverables','project_id','uuid'), ('project_deliverables','file_url','text'),
  ('clients','id','uuid'), ('clients','merchant_id','uuid'), ('clients','status','text'),
  ('merchants','id','uuid'), ('admin_users','user_id','uuid'), ('admin_users','is_active','boolean')
),
shape AS (
  SELECT 'A. column assumptions' AS section,
         n.table_name || '.' || n.column_name AS item,
         coalesce(c.data_type, 'MISSING') AS value,
         CASE WHEN c.data_type IS NULL THEN 'FAIL: column missing'
              WHEN n.want_type IS NOT NULL AND c.data_type <> n.want_type THEN 'FAIL: expected ' || n.want_type
              ELSE 'ok' END AS note
  FROM need n LEFT JOIN cols c USING (table_name, column_name)
),
pm AS (
  SELECT 'B. project_messages' AS section, c.column_name AS item,
         c.data_type AS value, CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END AS note
  FROM cols c WHERE c.table_name = 'project_messages'
  UNION ALL
  SELECT 'B. project_messages', '(row count)',
         coalesce((SELECT reltuples::bigint::text FROM pg_class WHERE oid = to_regclass('public.project_messages')), 'table missing'),
         'estimate; run SELECT count(*) FROM public.project_messages if this is 0 or -1'
),
checks AS (
  SELECT 'C. CHECK constraints' AS section, conrelid::regclass::text || ' :: ' || conname AS item,
         pg_get_constraintdef(oid) AS value, '' AS note
  FROM pg_constraint
  WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    AND conrelid::regclass::text IN ('project_requests','project_milestones','project_deliverables','project_files','projects')
),
req_status AS (
  SELECT 'D. project_requests.status values', coalesce(status, '<null>'), count(*)::text, 'count of rows'
  FROM public.project_requests GROUP BY status
),
ms_status AS (
  SELECT 'E. project_milestones.status values', coalesce(status, '<null>'), count(*)::text, 'count of rows'
  FROM public.project_milestones GROUP BY status
),
up_by AS (
  SELECT 'F. project_files.uploaded_by shape',
         CASE WHEN f.uploaded_by IS NULL THEN 'null'
              WHEN EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id::text = f.uploaded_by::text) THEN 'matches a clients.user_id'
              WHEN EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id::text = f.uploaded_by::text) THEN 'matches an admin_users.user_id'
              ELSE 'other' END,
         count(*)::text, 'classifies rows only; no value is shown'
  FROM public.project_files f GROUP BY 2
),
admin_cols AS (
  SELECT 'G. admin_users columns', column_name, data_type, 'a name column here would allow a client-visible delivery team'
  FROM cols WHERE table_name = 'admin_users'
),
admin_unique AS (
  SELECT 'G. admin_users columns', '(unique/PK on user_id)',
         coalesce((SELECT string_agg(contype::text, ',') FROM pg_constraint
                   WHERE conrelid = 'public.admin_users'::regclass AND contype IN ('p','u')
                     AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admin_users'::regclass AND attname = 'user_id')]),
                  'NONE'),
         'FK from project_team_assignments is only created when this is p or u'
),
names AS (
  SELECT 'H. new object names', n.name,
         coalesce((SELECT c.relkind::text FROM pg_class c WHERE c.relname = n.name AND c.relnamespace = 'public'::regnamespace LIMIT 1),
                  (SELECT 'function' FROM pg_proc p WHERE p.proname = n.name AND p.pronamespace = 'public'::regnamespace LIMIT 1),
                  'free'),
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = n.name AND c.relnamespace = 'public'::regnamespace)
                OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.proname = n.name AND p.pronamespace = 'public'::regnamespace)
              THEN 'FAIL: name already in use' ELSE 'ok' END
  FROM (VALUES ('thread_messages'), ('activity_events'), ('project_team_assignments'), ('create_portal_request'),
               ('post_request_message'), ('set_request_status'), ('mark_request_read'), ('activity_events_append_only')) AS n(name)
),
newcols AS (
  SELECT 'I. columns the forward migration adds', t || '.' || c, CASE WHEN x.column_name IS NULL THEN 'free' ELSE 'EXISTS' END,
         CASE WHEN x.column_name IS NULL THEN 'ok' ELSE 'FAIL: already present' END
  FROM (VALUES ('project_requests','last_activity_at'), ('project_files','uploaded_by_role'),
               ('project_milestones','sort_order'),
               ('project_deliverables','status'), ('project_deliverables','due_date')) AS v(t, c)
  LEFT JOIN information_schema.columns x ON x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c
),
rls AS (
  SELECT 'J. RLS on the related tables', c.relname::text,
         CASE WHEN c.relrowsecurity THEN 'RLS on' ELSE 'RLS OFF' END,
         'anon=' || has_table_privilege('anon', c.oid, 'SELECT')::text || ' authenticated=' || has_table_privilege('authenticated', c.oid, 'SELECT')::text
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relname IN ('project_requests','projects','project_files','project_milestones','project_deliverables','project_messages')
)
SELECT * FROM shape
UNION ALL SELECT * FROM pm
UNION ALL SELECT * FROM checks
UNION ALL SELECT * FROM req_status
UNION ALL SELECT * FROM ms_status
UNION ALL SELECT * FROM up_by
UNION ALL SELECT * FROM admin_cols
UNION ALL SELECT * FROM admin_unique
UNION ALL SELECT * FROM names
UNION ALL SELECT * FROM newcols
UNION ALL SELECT * FROM rls
ORDER BY 1, 2;
