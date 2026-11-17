-- =============================================================================
-- S6.3 — OPTIONAL HARDENING (PRODUCTION). NOT EXECUTED. DO NOT RUN UNLESS the corrected verifier's check 62
-- ("activity_events: service_role holds no UPDATE / DELETE / TRUNCATE grant") reports FAIL and its detail lists
-- the privileges actually held.
--
-- WHY IT MIGHT BE NEEDED. Supabase gives service_role ALL on new tables in `public` through default privileges. The
-- forward migration REVOKEd anon / authenticated / PUBLIC and then GRANTed SELECT, INSERT to service_role, but a GRANT
-- never removes a privilege that default privileges already conferred, so service_role may still hold UPDATE, DELETE
-- and TRUNCATE on activity_events. The append-only TRIGGERS (check 61) refuse those writes for every role, so this is
-- defence in depth, not an exposure — which is why it is optional and separate from the forward migration.
--
-- WHAT IT DOES (and nothing else):
--   1. removes UPDATE, DELETE, TRUNCATE from service_role on public.activity_events (the app only ever INSERTs / SELECTs);
--   2. removes every privilege from service_role on public.s63_function_backups (it exists for the owner-run rollback;
--      the application never touches it, and the table holds the saved original of finalize_upload).
-- It changes no function, policy, row, trigger or application behaviour. Re-run requests-projects-03 afterwards.
--
-- UNDO:  GRANT UPDATE, DELETE, TRUNCATE ON public.activity_events TO service_role;
--        GRANT ALL ON public.s63_function_backups TO service_role;
-- =============================================================================
BEGIN;

REVOKE UPDATE, DELETE, TRUNCATE ON public.activity_events FROM service_role;
REVOKE ALL ON public.s63_function_backups FROM service_role;

DO $$
BEGIN
  IF has_table_privilege('service_role', 'public.activity_events', 'UPDATE')
     OR has_table_privilege('service_role', 'public.activity_events', 'DELETE')
     OR has_table_privilege('service_role', 'public.activity_events', 'TRUNCATE') THEN
    RAISE EXCEPTION 'Abort: service_role still holds UPDATE/DELETE/TRUNCATE on activity_events';
  END IF;
  IF NOT (has_table_privilege('service_role', 'public.activity_events', 'SELECT')
          AND has_table_privilege('service_role', 'public.activity_events', 'INSERT')) THEN
    RAISE EXCEPTION 'Abort: service_role lost SELECT/INSERT on activity_events (the application needs both)';
  END IF;
END $$;

COMMIT;
