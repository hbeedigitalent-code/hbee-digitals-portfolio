-- =============================================================================
-- S6.3 REQUESTS & PROJECTS — ROLLBACK (manual; run only if the forward migration must be undone)
-- NOT YET EXECUTED.
--
-- Removes exactly what requests-projects-01-forward.sql added, and nothing else. Existing business data
-- (requests, projects, milestones' titles/dates, deliverables' files, project_files) is untouched.
--
-- DATA-LOSS GUARD. Rolling back drops the conversation and activity history created since the migration. It
-- therefore REFUSES to run while thread_messages / activity_events / project_team_assignments hold rows,
-- unless the operator opts in explicitly on THIS session:
--     SET hbee.allow_data_loss = 'yes';
-- (run that line first, in the same SQL Editor tab, only after exporting what you need).
--
-- Also dropped (new in S6.3, so no prior state is lost): project_requests.last_activity_at,
-- project_files.uploaded_by_role, project_milestones.sort_order, project_deliverables.status / due_date.
-- project_milestones.completed_at PRE-EXISTED the migration and is NOT touched.
-- finalize_upload is restored FIRST (from public.s63_function_backups) so no upload ever runs a body that
-- references the dropped uploaded_by_role column. Anything re-created by hand after the forward migration is lost. Note: project_requests.response keeps its LAST admin reply, because
-- post_request_message mirrored it there; that column was never altered.
-- =============================================================================
BEGIN;

DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT (SELECT count(*) FROM public.thread_messages)
       + (SELECT count(*) FROM public.activity_events)
       + (SELECT count(*) FROM public.project_team_assignments) INTO v_rows;
  IF v_rows > 0 AND coalesce(current_setting('hbee.allow_data_loss', true), '') <> 'yes' THEN
    RAISE EXCEPTION 'Abort: % row(s) of S6.3 data exist. Export them, then SET hbee.allow_data_loss = ''yes''; and re-run.', v_rows;
  END IF;
END $$;

-- finalize_upload FIRST. The live function now writes project_files.uploaded_by_role; dropping that column while the
-- new body is still in place would break every upload. Restore the ORIGINAL production definition saved by the forward
-- migration (verbatim), prove it round-trips, and only then continue. No backup => abort (never guess a body).
DO $$
DECLARE v_def text;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_files' AND column_name = 'uploaded_by_role') THEN
    IF to_regclass('public.s63_function_backups') IS NULL THEN
      RAISE EXCEPTION 'Abort: uploaded_by_role exists but public.s63_function_backups does not — the original finalize_upload cannot be restored automatically';
    END IF;
    SELECT definition INTO v_def FROM public.s63_function_backups WHERE name = 'finalize_upload';
    IF v_def IS NULL THEN RAISE EXCEPTION 'Abort: no saved original of finalize_upload in s63_function_backups'; END IF;
    EXECUTE v_def;
    IF pg_get_functiondef('public.finalize_upload(uuid, uuid)'::regprocedure) IS DISTINCT FROM v_def THEN
      RAISE EXCEPTION 'Abort: the restored finalize_upload does not equal the saved original';
    END IF;
    IF (SELECT count(*) FROM pg_proc WHERE pronamespace = 'public'::regnamespace AND proname = 'finalize_upload') <> 1 THEN
      RAISE EXCEPTION 'Abort: finalize_upload does not have exactly one overload after the restore';
    END IF;
    IF pg_get_functiondef('public.finalize_upload(uuid, uuid)'::regprocedure) LIKE '%uploaded_by_role%' THEN
      RAISE EXCEPTION 'Abort: the restored finalize_upload still mentions uploaded_by_role';
    END IF;
  END IF;
END $$;

DROP FUNCTION IF EXISTS public.mark_request_read(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.set_request_status(uuid, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.post_request_message(uuid, uuid, uuid, text, text, boolean, uuid, text);
DROP FUNCTION IF EXISTS public.create_portal_request(uuid, uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.hbee_request_status(text);

-- The append-only triggers must go before the table's rows can be removed.
DROP TRIGGER IF EXISTS activity_events_no_update   ON public.activity_events;
DROP TRIGGER IF EXISTS activity_events_no_truncate ON public.activity_events;
DROP TABLE IF EXISTS public.activity_events;
DROP FUNCTION IF EXISTS public.activity_events_append_only();

DROP TABLE IF EXISTS public.s63_function_backups; -- only after the original function was restored above
DROP TABLE IF EXISTS public.thread_messages;
DROP TABLE IF EXISTS public.project_team_assignments;

ALTER TABLE public.project_requests     DROP COLUMN IF EXISTS last_activity_at;
ALTER TABLE public.project_files        DROP CONSTRAINT IF EXISTS project_files_uploaded_by_role_check;
ALTER TABLE public.project_files        DROP COLUMN IF EXISTS uploaded_by_role;
ALTER TABLE public.project_milestones   DROP COLUMN IF EXISTS sort_order;
ALTER TABLE public.project_deliverables DROP CONSTRAINT IF EXISTS project_deliverables_status_check;
ALTER TABLE public.project_deliverables DROP COLUMN IF EXISTS status;
ALTER TABLE public.project_deliverables DROP COLUMN IF EXISTS due_date;

COMMIT;
