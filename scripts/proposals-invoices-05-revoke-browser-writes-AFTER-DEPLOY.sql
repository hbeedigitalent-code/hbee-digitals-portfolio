-- =============================================================================
-- S6.4 — REVOKE BROWSER COMMERCIAL WRITES (PRODUCTION). RUN ONLY AFTER THE S6.4 CODE IS DEPLOYED. NOT YET EXECUTED.
--
-- WHY IT IS SEPARATE. The forward migration deliberately leaves the existing raw grants alone: until the new Admin
-- routes are live, the deployed admin pages still write proposals / invoices from the browser, and revoking first would
-- break them. The database guards (proposals_immutable_after_decision, project_invoices_guard, the line-item and ledger
-- triggers) protect commercial values whatever path writes them; this script removes the paths themselves.
--
-- PRECONDITIONS (check before running):
--   1. The deployed build contains the S6.4 Admin routes and no browser `.from('proposals').update(...)` or
--      `.from('project_invoices').insert/update/delete(...)` (scripts/test-proposals-invoices.cjs asserts this on the code).
--   2. proposals-invoices-03-verify-readonly.sql (final_hardened = false) returned OVERALL = PASS, and the production walkthrough passed.
--   AFTER this script: re-run 03 with final_hardened = true; it must return OVERALL = PASS.
--
-- WHAT IT DOES (and nothing else):
--   * proposals:        revokes INSERT, UPDATE, DELETE, TRUNCATE from anon and authenticated.
--   * project_invoices: revokes INSERT, UPDATE, DELETE, TRUNCATE from anon and authenticated.
--   SELECT is kept: the admin list pages and the Portal read through RLS / the service role exactly as before.
--   service_role is untouched (the Admin and Portal routes use it).
--
-- UNDO:  GRANT UPDATE ON public.proposals TO authenticated;
--        GRANT INSERT, UPDATE, DELETE ON public.project_invoices TO authenticated;   (only if the previous raw grants existed)
-- =============================================================================
BEGIN;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.proposals        FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.project_invoices FROM anon, authenticated;

DO $$
DECLARE r text; t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['proposals', 'project_invoices'] LOOP
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated'] LOOP
      IF has_any_column_privilege(r, ('public.' || t)::regclass, 'INSERT') OR has_table_privilege(r, ('public.' || t)::regclass, 'INSERT')
         OR has_any_column_privilege(r, ('public.' || t)::regclass, 'UPDATE') OR has_table_privilege(r, ('public.' || t)::regclass, 'UPDATE')
         OR has_table_privilege(r, ('public.' || t)::regclass, 'DELETE') THEN
        RAISE EXCEPTION 'Abort: % still holds a write privilege on %', r, t;
      END IF;
    END LOOP;
  END LOOP;
  -- reads must survive
  IF NOT has_table_privilege('authenticated', 'public.proposals', 'SELECT') OR NOT has_table_privilege('authenticated', 'public.project_invoices', 'SELECT') THEN
    RAISE EXCEPTION 'Abort: authenticated lost SELECT on proposals / project_invoices';
  END IF;
END $$;

COMMIT;
