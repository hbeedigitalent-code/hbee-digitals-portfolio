-- =============================================================================
-- S6.3 REQUESTS & PROJECTS — FORWARD MIGRATION
-- Run in: Supabase SQL Editor (production), ONLY after requests-projects-00-preflight-readonly.sql
-- has been reviewed and its model assumptions confirmed. Prepared for S6.3. NOT YET EXECUTED.
--
-- ADD-ONLY apart from ONE function replacement (section 8). No DROP, DELETE or TRUNCATE of anything that
-- exists. Existing rows keep every value; the only data statements are three idempotent BACKFILLS of the new
-- columns (last_activity_at, milestone sort_order, and a conservative project_files.uploaded_by_role).
--
-- WHAT THIS ADDS
--   1. public.thread_messages          one conversation model: a message belongs to a request (and may carry a
--                                      project). Admin internal notes are rows with is_internal = true and can
--                                      never be authored by a client (CHECK).
--   2. public.activity_events          APPEND-ONLY operational timeline with a client/internal visibility flag.
--   3. public.project_team_assignments project <-> admin user. (FK to admin_users only when user_id is unique.)
--   4. columns on existing tables      project_requests.last_activity_at, project_files.uploaded_by_role,
--                                      project_milestones.sort_order, project_deliverables.status/due_date.
--                                      (project_milestones.completed_at ALREADY EXISTS in production — the
--                                      preflight proved it — so it is asserted, never added.)
--   Production shapes this file was reconciled against: docs/s6-3-requests-projects.md section 6.
--   5. four SECURITY DEFINER functions, EXECUTE for service_role ONLY:
--        create_portal_request    request + project + link + activity in ONE transaction (the S6.2 compensating
--                                 rollback is replaced by a real atomic operation)
--        post_request_message     message + legal status transition + legacy `response` mirror + activity, atomic
--        set_request_status       the only status writer; encodes the transition rules
--        mark_request_read        read-state for the caller's side of a thread
--   6. finalize_upload (REPLACED, section 8) — the existing project_files INSERT also writes
--      uploaded_by_role = v_s.uploader_role, so file ownership is stamped in the SAME transaction that creates the
--      file. Same name / arguments (p_upload_id uuid, p_actor uuid) / return jsonb / SECURITY DEFINER / search_path /
--      ACL; proposal-file behaviour untouched; no overload; the live definition is edited in place (two tokens) and
--      the original is saved in public.s63_function_backups for the rollback.
--   7. public.s63_function_backups — server-only table holding that saved original.
--
-- WHAT IT DOES NOT DO
--   * project_messages is NOT touched (see docs/s6-3-requests-projects.md, section 2).
--   * No existing table's RLS, grants or policies change. No existing status value is rewritten, and no CHECK
--     is added to project_requests.status (the vocabulary is enforced in the functions, which is also where
--     the legacy values are mapped, so unknown historical values cannot break the migration).
--   * The new tables are SERVER-ONLY: RLS enabled, NO policies, every privilege revoked from PUBLIC / anon /
--     authenticated. The browser never reads or writes them; every access is a Next.js route that has already
--     resolved the caller (Portal resolver or requireActiveAdmin) and passes the identity explicitly.
--
-- ABORT BEHAVIOUR: every assumption is a RAISE EXCEPTION inside this single transaction.
-- Rollback: requests-projects-02-rollback.sql.   Verify: requests-projects-03-verify-readonly.sql.
-- =============================================================================

BEGIN;

LOCK TABLE public.project_requests, public.projects, public.project_files,
           public.project_milestones, public.project_deliverables IN SHARE ROW EXCLUSIVE MODE;

-- -----------------------------------------------------------------------------
-- 0. Assertions
-- -----------------------------------------------------------------------------
DO $$
DECLARE v_found text;
BEGIN
  -- pg_class.relkind is the internal type "char"; `text || "char"` is ambiguous (42725), so it is cast explicitly.
  SELECT string_agg(
           c.relname::text || ':' || c.relkind::text,
           ', '
         )
  INTO v_found
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace
    AND c.relname IN (
      'thread_messages',
      'activity_events',
      'project_team_assignments',
      's63_function_backups'
    );
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: relation(s) already exist: %', v_found; END IF;

  SELECT string_agg(p.proname, ', ') INTO v_found
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('create_portal_request','post_request_message','set_request_status','mark_request_read',
                     'activity_events_append_only','hbee_request_status');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: function(s) already exist: %', v_found; END IF;

  SELECT string_agg(t || '.' || c, ', ') INTO v_found
  FROM (VALUES ('project_requests','id','uuid'), ('project_requests','client_id','uuid'), ('project_requests','title','text'),
               ('project_requests','description','text'), ('project_requests','status','text'),
               ('project_requests','project_id','uuid'), ('project_requests','response','text'),
               ('projects','id','uuid'), ('projects','client_id','uuid'), ('projects','project_id','text'),
               ('project_files','id','uuid'), ('project_files','client_id','uuid'),
               ('project_milestones','id','uuid'), ('project_milestones','project_id','uuid'),
               ('project_deliverables','id','uuid'), ('project_deliverables','project_id','uuid'),
               ('clients','id','uuid'), ('clients','merchant_id','uuid'), ('clients','status','text'),
               ('merchants','id','uuid')) AS v(t, c, ty)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns x
                    WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c AND x.data_type = v.ty);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: expected column(s) missing or of another type: %', v_found; END IF;

  SELECT string_agg(t || '.' || c, ', ') INTO v_found
  FROM (VALUES ('project_requests','last_activity_at'), ('project_files','uploaded_by_role'),
               ('project_milestones','sort_order'),
               ('project_deliverables','status'), ('project_deliverables','due_date')) AS v(t, c)
  WHERE EXISTS (SELECT 1 FROM information_schema.columns x
                WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: column(s) already present: %', v_found; END IF;

  -- project_milestones.completed_at pre-exists: the application writes an ISO timestamp (or null) to it, so it
  -- must be a date/time type. Anything else (boolean, text …) would make milestone completion fail at runtime.
  SELECT data_type INTO v_found FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'project_milestones' AND column_name = 'completed_at';
  IF v_found IS NULL OR v_found NOT IN ('timestamp with time zone', 'timestamp without time zone', 'date') THEN
    RAISE EXCEPTION 'Abort: project_milestones.completed_at is % (expected a date/time type)', coalesce(v_found, 'missing');
  END IF;

  -- project_files.uploaded_by is TEXT in production (preflight A) and is left alone.
  SELECT data_type INTO v_found FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'project_files' AND column_name = 'uploaded_by';
  IF v_found IS DISTINCT FROM 'text' THEN RAISE EXCEPTION 'Abort: project_files.uploaded_by is % (production was text)', coalesce(v_found, 'missing'); END IF;

  -- The application writes request statuses open / in_review / answered / closed and milestone / deliverable
  -- statuses of its own. A CHECK constraint on any of these columns that does not allow them would fail at
  -- runtime, so any CHECK on these tables is an unexpected shape: stop and report it.
  SELECT string_agg(conrelid::regclass::text || ' :: ' || conname, ', ') INTO v_found
  FROM pg_constraint
  WHERE contype = 'c' AND connamespace = 'public'::regnamespace
    AND conrelid::regclass::text IN ('project_requests', 'project_milestones', 'project_deliverables');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: unexpected CHECK constraint(s) (production had none): %', v_found; END IF;

  -- The KNOWN production constraint projects_status_check (draft, published, Pending Review and the eight operational
  -- statuses) must admit every status this release writes: 'Pending Review' (create_portal_request) and the eight
  -- the Admin may set. It is only READ — never replaced or narrowed — and it sits on `projects`, which the
  -- unexpected-CHECK guard above deliberately does not scan, so it cannot trip that guard.
  SELECT string_agg(s, ', ') INTO v_found
  FROM unnest(ARRAY['Pending Review','Onboarding','Assets Required','In Review','In Progress','Awaiting Client Feedback','Revision Stage','Completed','Archived']) AS s
  WHERE NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.projects'::regclass AND conname = 'projects_status_check'
                      AND pg_get_constraintdef(oid) LIKE '%''' || s || '''::text%');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: projects_status_check is missing or does not allow: %', v_found; END IF;

  -- Every stored request status must be one the mapper understands. (Production: 4 rows, all 'open'.) Unknown
  -- values would silently read as 'open'; this migration refuses to proceed on a value it cannot account for.
  SELECT string_agg(DISTINCT coalesce(status, '<null>'), ', ') INTO v_found
  FROM public.project_requests
  WHERE lower(btrim(coalesce(status, ''))) NOT IN
        ('', 'open', 'new', 'pending', 'in_review', 'in review', 'under review', 'in progress', 'in_progress', 'reviewing',
         'answered', 'responded', 'replied', 'closed', 'resolved', 'completed', 'done');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: project_requests.status holds value(s) the mapper does not know: %', v_found; END IF;

  -- admin_users.user_id must be unique (production: yes) — the assignment FK below relies on it.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.admin_users'::regclass AND contype IN ('p', 'u')
                   AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admin_users'::regclass AND attname = 'user_id')]) THEN
    RAISE EXCEPTION 'Abort: admin_users.user_id is not unique';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Added columns on existing tables (all nullable or defaulted; nothing is rewritten)
-- -----------------------------------------------------------------------------
-- -----------------------------------------------------------------------------
-- 0b. finalize_upload and upload_sessions: the shapes production proved. Anything else aborts.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  v_n    int;
  v_def  text;
  v_found text;
BEGIN
  SELECT string_agg(c, ', ') INTO v_found
  FROM (VALUES ('result_file_id', 'uuid'), ('uploader_user_id', 'uuid'), ('uploader_role', 'text'), ('client_id', 'uuid')) AS v(c, ty)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns x
                    WHERE x.table_schema = 'public' AND x.table_name = 'upload_sessions' AND x.column_name = v.c AND x.data_type = v.ty);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: upload_sessions column(s) missing or of another type: %', v_found; END IF;

  -- upload_sessions.uploader_role is constrained to admin / client (production). The stamp copies it verbatim, and
  -- project_files_uploaded_by_role_check (added below) allows exactly those two values.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.upload_sessions'::regclass AND contype = 'c'
                   AND pg_get_constraintdef(oid) LIKE '%uploader_role%' AND pg_get_constraintdef(oid) LIKE '%admin%'
                   AND pg_get_constraintdef(oid) LIKE '%client%') THEN
    RAISE EXCEPTION 'Abort: no CHECK on upload_sessions.uploader_role restricting it to admin/client';
  END IF;

  SELECT count(*) INTO v_n FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Abort: expected exactly ONE public.finalize_upload, found % (an overload changes how it must be replaced)', v_n; END IF;

  SELECT p.prosrc INTO v_def FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload';

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload'
      AND pg_get_function_identity_arguments(p.oid) = 'p_upload_id uuid, p_actor uuid'
      AND pg_get_function_result(p.oid) = 'jsonb'
      AND p.prosecdef
      AND p.proconfig::text LIKE '%search_path=public, pg_temp%'
      AND has_function_privilege('service_role', p.oid, 'EXECUTE')
      AND NOT has_function_privilege('anon', p.oid, 'EXECUTE')
      AND NOT has_function_privilege('authenticated', p.oid, 'EXECUTE')
      AND NOT EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
  ) THEN
    RAISE EXCEPTION 'Abort: finalize_upload is not (p_upload_id uuid, p_actor uuid) -> jsonb, SECURITY DEFINER, search_path public, pg_temp, executable by service_role only';
  END IF;

  IF v_def !~ 'v_uploaded_by\s*:=\s*v_s\.uploader_role' THEN
    RAISE EXCEPTION 'Abort: finalize_upload no longer contains "v_uploaded_by := v_s.uploader_role"';
  END IF;
  IF v_def LIKE '%uploaded_by_role%' THEN
    RAISE EXCEPTION 'Abort: finalize_upload already mentions uploaded_by_role (already migrated?)';
  END IF;
  SELECT count(*) INTO v_n FROM regexp_matches(v_def, 'INSERT\s+INTO\s+(?:public\.)?project_files\M', 'gi');
  IF v_n <> 1 THEN RAISE EXCEPTION 'Abort: finalize_upload must INSERT INTO project_files exactly once, found %', v_n; END IF;
END $$;

ALTER TABLE public.project_requests    ADD COLUMN last_activity_at timestamptz;
ALTER TABLE public.project_files       ADD COLUMN uploaded_by_role text
  CONSTRAINT project_files_uploaded_by_role_check CHECK (uploaded_by_role IS NULL OR uploaded_by_role IN ('client','admin'));
ALTER TABLE public.project_milestones  ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
-- project_milestones.completed_at already exists (production) and is deliberately NOT added here.
ALTER TABLE public.project_deliverables ADD COLUMN status text NOT NULL DEFAULT 'ready'
  CONSTRAINT project_deliverables_status_check CHECK (status IN ('draft','ready','delivered','revised'));
ALTER TABLE public.project_deliverables ADD COLUMN due_date date;

-- -----------------------------------------------------------------------------
-- 2. thread_messages
-- -----------------------------------------------------------------------------
CREATE TABLE public.thread_messages (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id       uuid NOT NULL REFERENCES public.project_requests(id) ON DELETE CASCADE,
  project_id       uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  client_id        uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  author_user_id   uuid NOT NULL,
  author_role      text NOT NULL CHECK (author_role IN ('client','admin')),
  body             text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 5000),
  is_internal      boolean NOT NULL DEFAULT false,
  attachment_file_id uuid REFERENCES public.project_files(id) ON DELETE SET NULL,
  client_key       text CHECK (client_key IS NULL OR char_length(client_key) BETWEEN 8 AND 80),
  read_by_client_at timestamptz,
  read_by_admin_at  timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  -- A client can never author an internal note, whatever a caller passes.
  CONSTRAINT thread_messages_no_client_internal CHECK (NOT (is_internal AND author_role = 'client'))
);
CREATE INDEX thread_messages_request_idx ON public.thread_messages (request_id, created_at);
CREATE INDEX thread_messages_client_idx  ON public.thread_messages (client_id, created_at DESC);
-- Retry safety: the same author re-sending the same key returns the existing row.
CREATE UNIQUE INDEX thread_messages_author_key_uidx ON public.thread_messages (author_user_id, client_key) WHERE client_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. activity_events (append-only)
-- -----------------------------------------------------------------------------
CREATE TABLE public.activity_events (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Plain uuid columns, deliberately NOT foreign keys: an append-only history must survive (and must not be
  -- rewritten by a SET NULL cascade when) the row it describes is removed.
  client_id     uuid,
  project_id    uuid,
  request_id    uuid,
  actor_user_id uuid,
  actor_role    text NOT NULL CHECK (actor_role IN ('client','admin','system')),
  entity_type   text NOT NULL CHECK (char_length(entity_type) BETWEEN 1 AND 40),
  entity_id     uuid,
  action        text NOT NULL CHECK (char_length(action) BETWEEN 1 AND 60),
  summary       text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 300),
  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility    text NOT NULL DEFAULT 'internal' CHECK (visibility IN ('client','internal')),
  dedupe_key    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX activity_events_client_idx  ON public.activity_events (client_id, created_at DESC);
CREATE INDEX activity_events_project_idx ON public.activity_events (project_id, created_at DESC);
CREATE INDEX activity_events_request_idx ON public.activity_events (request_id, created_at DESC);
CREATE UNIQUE INDEX activity_events_dedupe_uidx ON public.activity_events (dedupe_key) WHERE dedupe_key IS NOT NULL;

CREATE FUNCTION public.activity_events_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION 'activity_events is append-only (% refused)', TG_OP USING ERRCODE = '42501';
END $$;

CREATE TRIGGER activity_events_no_update BEFORE UPDATE OR DELETE ON public.activity_events
  FOR EACH ROW EXECUTE FUNCTION public.activity_events_append_only();
CREATE TRIGGER activity_events_no_truncate BEFORE TRUNCATE ON public.activity_events
  FOR EACH STATEMENT EXECUTE FUNCTION public.activity_events_append_only();

-- -----------------------------------------------------------------------------
-- 4. project_team_assignments
-- -----------------------------------------------------------------------------
CREATE TABLE public.project_team_assignments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  admin_user_id uuid NOT NULL,
  assigned_by   uuid,
  assigned_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, admin_user_id)
);
CREATE INDEX project_team_assignments_admin_idx ON public.project_team_assignments (admin_user_id);

DO $$
BEGIN
  -- Only reference admin_users when its user_id is provably unique; otherwise the route validates membership.
  IF EXISTS (SELECT 1 FROM pg_constraint
             WHERE conrelid = 'public.admin_users'::regclass AND contype IN ('p','u')
               AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.admin_users'::regclass AND attname = 'user_id')]) THEN
    ALTER TABLE public.project_team_assignments
      ADD CONSTRAINT project_team_assignments_admin_fk FOREIGN KEY (admin_user_id) REFERENCES public.admin_users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 5. Backfills (idempotent, non-destructive)
-- -----------------------------------------------------------------------------
UPDATE public.project_requests SET last_activity_at = created_at WHERE last_activity_at IS NULL;

WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY project_id ORDER BY due_date NULLS LAST, id) AS rn
  FROM public.project_milestones
)
UPDATE public.project_milestones m SET sort_order = r.rn FROM ranked r WHERE m.id = r.id AND m.sort_order = 0;

-- project_files.uploaded_by_role — CONSERVATIVE historical backfill.
-- Production evidence: uploaded_by cannot classify history (it holds a free-text value, never trusted here).
-- The ONLY evidence used is upload_sessions, and a row is marked 'client' only when ALL of these hold:
--   * exactly ONE upload session points at the file (result_file_id = the file's id);
--   * that session's uploader_role is 'client', its client_id is the file's client, and its uploader_user_id is
--     that client's own login (clients.user_id);
--   * no session for the file was uploaded by an admin.
-- Everything else stays NULL = "origin unproven": a client can NOT delete it. Nothing is ever marked 'admin' here.
UPDATE public.project_files f
   SET uploaded_by_role = 'client'
 WHERE f.uploaded_by_role IS NULL
   AND (SELECT count(*) FROM public.upload_sessions s WHERE s.result_file_id = f.id) = 1
   AND EXISTS (SELECT 1 FROM public.upload_sessions s JOIN public.clients c ON c.id = f.client_id
                WHERE s.result_file_id = f.id AND s.uploader_role = 'client'
                  AND s.client_id = f.client_id AND s.uploader_user_id = c.user_id)
   AND NOT EXISTS (SELECT 1 FROM public.upload_sessions s JOIN public.admin_users a ON a.user_id = s.uploader_user_id
                    WHERE s.result_file_id = f.id);

DO $$
DECLARE v_total bigint; v_client bigint; v_null bigint;
BEGIN
  SELECT count(*), count(*) FILTER (WHERE uploaded_by_role = 'client'), count(*) FILTER (WHERE uploaded_by_role IS NULL)
    INTO v_total, v_client, v_null FROM public.project_files;
  IF EXISTS (SELECT 1 FROM public.project_files f JOIN public.upload_sessions s ON s.result_file_id = f.id
              WHERE f.uploaded_by_role = 'client' AND s.uploader_role <> 'client') THEN
    RAISE EXCEPTION 'Abort: a file was classified client although an upload session says otherwise';
  END IF;
  IF v_client + v_null <> v_total THEN RAISE EXCEPTION 'Abort: unexpected project_files ownership state after backfill'; END IF;
  RAISE NOTICE 'project_files: % rows | % classified client from unambiguous upload_sessions evidence | % left NULL (unproven, protected from client deletion)', v_total, v_client, v_null;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Privileges and RLS: server-only
-- -----------------------------------------------------------------------------
ALTER TABLE public.thread_messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_team_assignments ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.thread_messages, public.activity_events, public.project_team_assignments FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.thread_messages, public.project_team_assignments TO service_role;
-- activity_events: no UPDATE/DELETE/TRUNCATE even for the service role (the trigger also refuses them).
GRANT SELECT, INSERT ON public.activity_events TO service_role;

-- -----------------------------------------------------------------------------
-- 7. Functions
-- -----------------------------------------------------------------------------
-- Legacy request statuses are mapped here, once, so unknown historical values never break a transition.
CREATE FUNCTION public.hbee_request_status(p text) RETURNS text
LANGUAGE sql IMMUTABLE SET search_path = pg_catalog AS $$
  SELECT CASE lower(btrim(coalesce(p, '')))
    WHEN 'in_review' THEN 'in_review' WHEN 'in review' THEN 'in_review' WHEN 'under review' THEN 'in_review'
    WHEN 'in progress' THEN 'in_review' WHEN 'in_progress' THEN 'in_review' WHEN 'reviewing' THEN 'in_review'
    WHEN 'answered' THEN 'answered' WHEN 'responded' THEN 'answered' WHEN 'replied' THEN 'answered'
    WHEN 'closed' THEN 'closed' WHEN 'resolved' THEN 'closed' WHEN 'completed' THEN 'closed' WHEN 'done' THEN 'closed'
    ELSE 'open' END
$$;

CREATE FUNCTION public.create_portal_request(
  p_client_id uuid, p_actor_user_id uuid, p_title text, p_description text, p_service text, p_reference text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_client  public.clients%ROWTYPE;
  v_req     uuid;
  v_project uuid;
BEGIN
  SELECT * INTO v_client FROM public.clients WHERE id = p_client_id FOR SHARE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'client_not_found'); END IF;
  IF lower(btrim(coalesce(v_client.status, ''))) = 'suspended' THEN RETURN jsonb_build_object('status', 'suspended'); END IF;
  IF v_client.merchant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = v_client.merchant_id) THEN
    RETURN jsonb_build_object('status', 'not_connected');
  END IF;

  INSERT INTO public.project_requests (client_id, title, description, status, last_activity_at)
  VALUES (p_client_id, p_title, p_description, 'open', now()) RETURNING id INTO v_req;

  -- A duplicate p_reference raises unique_violation (23505) here and the WHOLE function rolls back: the
  -- request row above does not survive. The caller retries with a fresh reference.
  INSERT INTO public.projects (client_id, project_id, title, project_name, status, progress, description, service_selected, start_date)
  VALUES (p_client_id, p_reference, p_title, p_title, 'Pending Review', 0, p_description, p_service, now())
  RETURNING id INTO v_project;

  UPDATE public.project_requests SET project_id = v_project WHERE id = v_req;

  INSERT INTO public.activity_events (client_id, project_id, request_id, actor_user_id, actor_role, entity_type, entity_id, action, summary, visibility, dedupe_key)
  VALUES
    (p_client_id, v_project, v_req, p_actor_user_id, 'client', 'request', v_req, 'request_submitted',
     'Request submitted', 'client', 'request_submitted:' || v_req),
    (p_client_id, v_project, v_req, NULL, 'system', 'project', v_project, 'project_created',
     'Project record created and awaiting review', 'client', 'project_created:' || v_project);

  RETURN jsonb_build_object('status', 'created', 'request_id', v_req, 'project_id', v_project);
END $$;

CREATE FUNCTION public.post_request_message(
  p_request_id uuid, p_client_id uuid, p_author_user_id uuid, p_author_role text, p_body text,
  p_internal boolean, p_attachment_file_id uuid, p_client_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_req    public.project_requests%ROWTYPE;
  v_prev   text;
  v_next   text;
  v_msg    uuid;
  v_existing uuid;
  v_internal boolean := coalesce(p_internal, false);
BEGIN
  IF p_author_role NOT IN ('client','admin') THEN RETURN jsonb_build_object('status', 'invalid_role'); END IF;
  IF p_author_role = 'client' THEN v_internal := false; END IF;     -- a client can never write an internal note

  SELECT * INTO v_req FROM public.project_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  -- A client addresses ONLY its own request; the same answer as "missing" so the id cannot be probed.
  IF p_author_role = 'client' AND v_req.client_id IS DISTINCT FROM p_client_id THEN
    RETURN jsonb_build_object('status', 'not_found');
  END IF;

  IF p_client_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.thread_messages WHERE author_user_id = p_author_user_id AND client_key = p_client_key;
    IF FOUND THEN RETURN jsonb_build_object('status', 'posted', 'message_id', v_existing, 'duplicate', true,
                                            'request_status', public.hbee_request_status(v_req.status)); END IF;
  END IF;

  v_prev := public.hbee_request_status(v_req.status);
  IF v_prev = 'closed' AND NOT v_internal THEN RETURN jsonb_build_object('status', 'closed', 'request_status', v_prev); END IF;

  IF p_attachment_file_id IS NOT NULL AND NOT EXISTS (
       SELECT 1 FROM public.project_files f WHERE f.id = p_attachment_file_id AND f.client_id = v_req.client_id) THEN
    RETURN jsonb_build_object('status', 'invalid_attachment');
  END IF;

  INSERT INTO public.thread_messages (request_id, project_id, client_id, author_user_id, author_role, body, is_internal,
                                      attachment_file_id, client_key, read_by_client_at, read_by_admin_at)
  VALUES (v_req.id, v_req.project_id, v_req.client_id, p_author_user_id, p_author_role, btrim(p_body), v_internal,
          p_attachment_file_id, p_client_key,
          CASE WHEN p_author_role = 'client' THEN now() END,
          CASE WHEN p_author_role = 'admin'  THEN now() END)
  RETURNING id INTO v_msg;

  -- Transition rules: an internal note changes nothing; an admin reply answers; a client reply reopens an
  -- answered request. (open / in_review stay as they are on a client reply.)
  v_next := v_prev;
  IF NOT v_internal THEN
    IF p_author_role = 'admin' AND v_prev IN ('open','in_review') THEN v_next := 'answered';
    ELSIF p_author_role = 'client' AND v_prev = 'answered' THEN v_next := 'open'; END IF;
  END IF;

  UPDATE public.project_requests
     SET status = CASE WHEN v_next <> v_prev THEN v_next ELSE status END,
         response = CASE WHEN p_author_role = 'admin' AND NOT v_internal THEN btrim(p_body) ELSE response END,
         last_activity_at = now()
   WHERE id = v_req.id;

  INSERT INTO public.activity_events (client_id, project_id, request_id, actor_user_id, actor_role, entity_type, entity_id, action, summary, visibility, dedupe_key)
  VALUES (v_req.client_id, v_req.project_id, v_req.id, p_author_user_id, p_author_role, 'request', v_req.id,
          CASE WHEN v_internal THEN 'internal_note_added' WHEN p_author_role = 'admin' THEN 'admin_replied' ELSE 'client_replied' END,
          CASE WHEN v_internal THEN 'Internal note added' WHEN p_author_role = 'admin' THEN 'Hbee replied to the request' ELSE 'Client replied to the request' END,
          CASE WHEN v_internal THEN 'internal' ELSE 'client' END, 'message:' || v_msg);

  IF v_next <> v_prev THEN
    INSERT INTO public.activity_events (client_id, project_id, request_id, actor_user_id, actor_role, entity_type, entity_id, action, summary, metadata, visibility, dedupe_key)
    VALUES (v_req.client_id, v_req.project_id, v_req.id, p_author_user_id, p_author_role, 'request', v_req.id, 'request_status_changed',
            'Request status changed to ' || v_next, jsonb_build_object('from', v_prev, 'to', v_next), 'client', 'status:' || v_msg);
  END IF;

  RETURN jsonb_build_object('status', 'posted', 'message_id', v_msg, 'request_status', v_next, 'previous_status', v_prev, 'duplicate', false);
END $$;

CREATE FUNCTION public.set_request_status(
  p_request_id uuid, p_client_id uuid, p_actor_user_id uuid, p_actor_role text, p_new_status text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_req  public.project_requests%ROWTYPE;
  v_prev text;
  v_evt  uuid;
BEGIN
  IF p_actor_role NOT IN ('client','admin') THEN RETURN jsonb_build_object('status', 'invalid_role'); END IF;
  IF p_new_status NOT IN ('open','in_review','answered','closed') THEN RETURN jsonb_build_object('status', 'invalid_status'); END IF;

  SELECT * INTO v_req FROM public.project_requests WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF p_actor_role = 'client' AND v_req.client_id IS DISTINCT FROM p_client_id THEN RETURN jsonb_build_object('status', 'not_found'); END IF;

  v_prev := public.hbee_request_status(v_req.status);
  IF v_prev = p_new_status THEN RETURN jsonb_build_object('status', 'unchanged', 'request_status', v_prev); END IF;

  -- A client may only confirm resolution of a request Hbee has answered. Everything else is Admin's.
  IF p_actor_role = 'client' AND NOT (v_prev = 'answered' AND p_new_status = 'closed') THEN
    RETURN jsonb_build_object('status', 'not_allowed', 'request_status', v_prev);
  END IF;

  UPDATE public.project_requests SET status = p_new_status, last_activity_at = now() WHERE id = v_req.id;

  INSERT INTO public.activity_events (client_id, project_id, request_id, actor_user_id, actor_role, entity_type, entity_id, action, summary, metadata, visibility)
  VALUES (v_req.client_id, v_req.project_id, v_req.id, p_actor_user_id, p_actor_role, 'request', v_req.id, 'request_status_changed',
          CASE WHEN p_actor_role = 'client' THEN 'Client confirmed the request is resolved' ELSE 'Request status changed to ' || p_new_status END,
          jsonb_build_object('from', v_prev, 'to', p_new_status), 'client')
  RETURNING id INTO v_evt;

  RETURN jsonb_build_object('status', 'changed', 'request_status', p_new_status, 'previous_status', v_prev, 'event_id', v_evt);
END $$;

CREATE FUNCTION public.mark_request_read(p_request_id uuid, p_client_id uuid, p_reader_role text) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_n integer := 0;
BEGIN
  IF p_reader_role = 'client' THEN
    UPDATE public.thread_messages SET read_by_client_at = now()
     WHERE request_id = p_request_id AND client_id = p_client_id
       AND author_role = 'admin' AND is_internal = false AND read_by_client_at IS NULL;
  ELSIF p_reader_role = 'admin' THEN
    UPDATE public.thread_messages SET read_by_admin_at = now()
     WHERE request_id = p_request_id AND author_role = 'client' AND read_by_admin_at IS NULL;
  ELSE
    RETURN 0;
  END IF;
  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END $$;

REVOKE ALL ON FUNCTION public.hbee_request_status(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_portal_request(uuid, uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_request_message(uuid, uuid, uuid, text, text, boolean, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.set_request_status(uuid, uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_request_read(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hbee_request_status(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_portal_request(uuid, uuid, text, text, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.post_request_message(uuid, uuid, uuid, text, text, boolean, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_request_status(uuid, uuid, uuid, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_request_read(uuid, uuid, text) TO service_role;

-- -----------------------------------------------------------------------------
-- 8. finalize_upload: stamp project_files.uploaded_by_role INSIDE its existing transaction
--
-- The function is NOT rewritten from a copy. This block reads the LIVE definition, inserts exactly two tokens into
-- its single project_files INSERT, proves nothing else changed, and re-creates it with CREATE OR REPLACE:
--     column list:  uploaded_by            ->  uploaded_by, uploaded_by_role
--     values list:  v_uploaded_by          ->  v_uploaded_by, v_s.uploader_role
-- (the column and its value are adjacent to the existing uploaded_by pair, so their positions always correspond).
-- Same name, arguments, return type, SECURITY DEFINER, search_path and body otherwise. CREATE OR REPLACE keeps the
-- owner and the ACL. The proposal-file branch is untouched. No overload, no new argument, no caller change.
--
-- The ORIGINAL definition is saved first in public.s63_function_backups (server-only) so the rollback restores it
-- verbatim. Every step below is an assertion; any mismatch aborts the whole migration.
-- -----------------------------------------------------------------------------
CREATE TABLE public.s63_function_backups (
  name        text PRIMARY KEY,
  definition  text NOT NULL,
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.s63_function_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.s63_function_backups FROM PUBLIC, anon, authenticated;

DO $$
DECLARE
  v_oid      oid;
  v_def      text;
  v_stmt     text;
  v_stmt_new text;
  v_new      text;
  v_n        int;
  v_before   text;
  v_after    text;
BEGIN
  SELECT p.oid INTO v_oid FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload';
  v_def := pg_get_functiondef(v_oid);

  -- Everything that must survive the replacement, captured as one comparable string.
  SELECT concat_ws('|', pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef::text,
                   coalesce(p.proconfig::text, ''), coalesce(p.proacl::text, '<default>'), pg_get_userbyid(p.proowner))
    INTO v_before FROM pg_proc p WHERE p.oid = v_oid;

  INSERT INTO public.s63_function_backups (name, definition) VALUES ('finalize_upload', v_def);

  -- The single INSERT statement into project_files (up to its terminating semicolon).
  v_stmt := substring(v_def from '(?i)INSERT\s+INTO\s+(?:public\.)?project_files\M[^;]*;');
  IF v_stmt IS NULL THEN RAISE EXCEPTION 'Abort: could not isolate the project_files INSERT in finalize_upload'; END IF;
  v_n := (length(v_def) - length(replace(v_def, v_stmt, ''))) / length(v_stmt);
  IF v_n <> 1 THEN RAISE EXCEPTION 'Abort: the project_files INSERT text occurs % times (expected 1)', v_n; END IF;

  -- It must be a column-list / VALUES insert whose uploaded_by pair we can extend in step.
  IF strpos(upper(v_stmt), 'VALUES') = 0
     OR strpos(v_stmt, 'uploaded_by') = 0 OR strpos(v_stmt, 'uploaded_by') > strpos(upper(v_stmt), 'VALUES')
     OR strpos(v_stmt, 'v_uploaded_by') < strpos(upper(v_stmt), 'VALUES') THEN
    RAISE EXCEPTION 'Abort: the project_files INSERT is not a "(columns) VALUES (...)" insert with uploaded_by / v_uploaded_by';
  END IF;

  -- First whole-word occurrence only (no 'g' flag): the column in the list, then its value in VALUES.
  v_stmt_new := regexp_replace(v_stmt, '\muploaded_by\M', 'uploaded_by, uploaded_by_role');
  v_stmt_new := regexp_replace(v_stmt_new, '\mv_uploaded_by\M', 'v_uploaded_by, v_s.uploader_role');

  -- Prove the ONLY difference is those two insertions.
  IF replace(replace(v_stmt_new, 'uploaded_by, uploaded_by_role', 'uploaded_by'), 'v_uploaded_by, v_s.uploader_role', 'v_uploaded_by') <> v_stmt THEN
    RAISE EXCEPTION 'Abort: the rewritten INSERT differs from the original by more than the two insertions';
  END IF;
  IF (length(v_stmt_new) - length(replace(v_stmt_new, 'uploaded_by_role', ''))) / length('uploaded_by_role') <> 1
     OR (length(v_stmt_new) - length(replace(v_stmt_new, 'v_s.uploader_role', ''))) / length('v_s.uploader_role')
        <> (length(v_stmt) - length(replace(v_stmt, 'v_s.uploader_role', ''))) / length('v_s.uploader_role') + 1 THEN
    RAISE EXCEPTION 'Abort: unexpected token counts in the rewritten INSERT';
  END IF;

  v_new := replace(v_def, v_stmt, v_stmt_new);
  EXECUTE v_new;

  -- Post-conditions.
  SELECT count(*) INTO v_n FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'finalize_upload';
  IF v_n <> 1 THEN RAISE EXCEPTION 'Abort: finalize_upload now has % overloads', v_n; END IF;
  SELECT concat_ws('|', pg_get_function_identity_arguments(p.oid), pg_get_function_result(p.oid), p.prosecdef::text,
                   coalesce(p.proconfig::text, ''), coalesce(p.proacl::text, '<default>'), pg_get_userbyid(p.proowner))
    INTO v_after FROM pg_proc p WHERE p.oid = v_oid;
  IF v_after IS DISTINCT FROM v_before THEN
    RAISE EXCEPTION 'Abort: finalize_upload signature / security / search_path / ACL / owner changed (% -> %)', v_before, v_after;
  END IF;
  IF pg_get_functiondef(v_oid) <> v_new THEN RAISE EXCEPTION 'Abort: the stored definition is not the one that was built'; END IF;
END $$;


COMMIT;
