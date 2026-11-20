-- =============================================================================
-- S6.4 PROPOSALS V2 + INVOICES — ROLLBACK (manual; run only if the forward migration must be undone)
-- NOT YET EXECUTED.
--
-- Removes exactly what proposals-invoices-01-forward.sql added and restores what it rewrote, using the originals the
-- forward saved in public.s64_constraint_backups (status CHECKs, and amount / status defaults, nullability, type).
-- Untouched by design: proposals.services / pricing (the legacy JSON was never rewritten), proposals.converted_to_project_id,
-- every existing proposal / invoice / project row, proposal_requests, and everything from S6.2 / S6.3.
--
-- DATA-LOSS GUARD. Rolling back drops invoices' line items, payments, counters, proposal responses and any version
-- beyond the first. It therefore REFUSES to run while those hold rows, unless the operator opts in explicitly on THIS session:
--     SET hbee.allow_data_loss = 'yes';
-- (run that line first, in the same SQL Editor tab, only after exporting what you need). The version-1 snapshots and the
-- line items created by the legacy backfill are derived data (the original JSON is preserved) and do not trigger the guard.
-- =============================================================================
BEGIN;

DO $$
DECLARE v_rows bigint;
BEGIN
  SELECT (SELECT count(*) FROM public.proposal_responses)
       + (SELECT count(*) FROM public.invoice_payments)
       + (SELECT count(*) FROM public.project_invoices)
       + (SELECT count(*) FROM public.invoice_line_items)
       + (SELECT count(*) FROM public.document_counters)
       + (SELECT count(*) FROM public.proposal_versions WHERE version_number > 1)
       + (SELECT count(*) FROM public.proposals WHERE version > 1)
    INTO v_rows;
  IF v_rows > 0 AND coalesce(current_setting('hbee.allow_data_loss', true), '') <> 'yes' THEN
    RAISE EXCEPTION 'Abort: % row(s) of S6.4 data exist. Export them, then SET hbee.allow_data_loss = ''yes''; and re-run.', v_rows;
  END IF;
  IF to_regclass('public.s64_constraint_backups') IS NULL THEN
    RAISE EXCEPTION 'Abort: public.s64_constraint_backups is missing — the original constraints cannot be restored automatically';
  END IF;
END $$;

-- 1. guards first, so the restoration below is not blocked by them
DROP TRIGGER IF EXISTS proposals_immutable_after_decision ON public.proposals;
DROP TRIGGER IF EXISTS project_invoices_guard ON public.project_invoices;

-- 2. proposals: remove S6.4 constraints / columns, restore the original status CHECK
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_approved_version_fkey;
ALTER TABLE public.proposals DROP CONSTRAINT IF EXISTS proposals_money_consistent_check;
DROP INDEX IF EXISTS public.proposals_number_uidx;

DO $$
DECLARE r record;
BEGIN
  -- the widened status CHECK (it admits 'declined') goes, the saved original comes back verbatim
  FOR r IN SELECT c.conname::text AS name FROM pg_constraint c
           WHERE c.conrelid = 'public.proposals'::regclass AND c.contype::text = 'c' AND pg_get_constraintdef(c.oid) ~ '\mstatus\M' LOOP
    EXECUTE format('ALTER TABLE public.proposals DROP CONSTRAINT %I', r.name);
  END LOOP;
  FOR r IN SELECT definition FROM public.s64_constraint_backups WHERE table_name = 'proposals' ORDER BY id LOOP
    EXECUTE r.definition;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.proposals WHERE status = 'declined') THEN
    RAISE EXCEPTION 'Abort: a proposal is declined and the original status CHECK does not admit that value (set hbee.allow_data_loss does not cover this; resolve the row first)';
  END IF;
END $$;

ALTER TABLE public.proposals DROP COLUMN IF EXISTS currency;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS summary;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS scope;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS deliverables;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS subtotal;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS total;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS issue_date;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS version;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS revision_note;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS declined_at;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS approved_version;
ALTER TABLE public.proposals DROP COLUMN IF EXISTS approved_by;

-- 3. functions (operational, then helpers, then trigger functions)
DROP FUNCTION IF EXISTS public.void_invoice(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid, text);
DROP FUNCTION IF EXISTS public.issue_invoice(uuid, uuid);
DROP FUNCTION IF EXISTS public.create_invoice(uuid, uuid, text, date, uuid);
DROP FUNCTION IF EXISTS public.convert_approved_proposal(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.decline_proposal(uuid, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.request_proposal_changes(uuid, uuid, uuid, text, text);
DROP FUNCTION IF EXISTS public.approve_proposal(uuid, uuid, uuid, integer, text);
DROP FUNCTION IF EXISTS public.mark_proposal_viewed(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_proposal(uuid, uuid);
DROP FUNCTION IF EXISTS public.save_proposal_draft(uuid, uuid, uuid, text, uuid, jsonb);
DROP FUNCTION IF EXISTS public.s64_create_client_project(uuid, text, text, text, text);
DROP FUNCTION IF EXISTS public.next_document_number(text);
DROP FUNCTION IF EXISTS public.s64_event(uuid, uuid, uuid, text, text, uuid, text, text, text, text);

-- 4. project_invoices: remove S6.4 constraints / indexes / columns / tables, then restore the original shape
DROP TABLE IF EXISTS public.invoice_payments;
DROP TABLE IF EXISTS public.invoice_line_items;
ALTER TABLE public.project_invoices DROP CONSTRAINT IF EXISTS project_invoices_money_check;
ALTER TABLE public.project_invoices DROP CONSTRAINT IF EXISTS project_invoices_status_check;
ALTER TABLE public.project_invoices DROP CONSTRAINT IF EXISTS project_invoices_currency_check;
DROP INDEX IF EXISTS public.project_invoices_number_uidx;
DROP INDEX IF EXISTS public.project_invoices_one_live_per_proposal_uidx;
DROP INDEX IF EXISTS public.project_invoices_project_idx;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS proposal_id;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS subtotal;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS tax_amount;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS issue_date;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS notes;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS payment_instructions;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS issued_at;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS paid_at;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS voided_at;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.project_invoices DROP COLUMN IF EXISTS created_by;

DO $$
DECLARE r record;
BEGIN
  -- type first (fails loudly if a stored amount no longer fits the original precision), then defaults / nullability
  FOR r IN SELECT definition FROM public.s64_constraint_backups WHERE table_name = 'project_invoices' AND conname = 'column:amount:type' ORDER BY id LOOP
    EXECUTE r.definition;
  END LOOP;
  FOR r IN SELECT definition FROM public.s64_constraint_backups WHERE table_name = 'project_invoices' AND conname LIKE 'column:%' AND conname <> 'column:amount:type' ORDER BY id LOOP
    EXECUTE r.definition;
  END LOOP;
  FOR r IN SELECT definition FROM public.s64_constraint_backups WHERE table_name = 'project_invoices' AND conname NOT LIKE 'column:%' ORDER BY id LOOP
    EXECUTE r.definition;
  END LOOP;
END $$;

-- 5. remaining S6.4 tables, then the guard functions, then the backup table itself (last: it was needed above)
DROP TABLE IF EXISTS public.proposal_responses;
DROP TABLE IF EXISTS public.proposal_versions;
DROP TABLE IF EXISTS public.proposal_line_items;
DROP TABLE IF EXISTS public.document_counters;
DROP FUNCTION IF EXISTS public.proposals_immutable_after_decision();
DROP FUNCTION IF EXISTS public.project_invoices_guard();
DROP FUNCTION IF EXISTS public.s64_line_items_guard();
DROP FUNCTION IF EXISTS public.s64_invoice_lines_guard();
DROP FUNCTION IF EXISTS public.s64_invoice_lines_touch();
DROP FUNCTION IF EXISTS public.s64_payments_guard();
DROP FUNCTION IF EXISTS public.s64_responses_guard();
DROP FUNCTION IF EXISTS public.s64_append_only();
DROP TABLE IF EXISTS public.s64_constraint_backups;

COMMIT;
