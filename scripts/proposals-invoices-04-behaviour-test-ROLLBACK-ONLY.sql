-- =============================================================================
-- S6.4 — BEHAVIOUR TEST. SAFE FOR PRODUCTION BY CONSTRUCTION: EVERYTHING IT DOES IS ROLLED BACK. NOT YET EXECUTED.
--
-- Run AFTER proposals-invoices-01-forward.sql (and its verifier). It exercises the real functions and guards end to end on
-- an existing connected client, inside ONE transaction that it opens itself (BEGIN) and that always ends in ROLLBACK (there is
-- no COMMIT anywhere in this file), so nothing it creates survives (including the invoice counter and the project it makes).
-- Any failed expectation raises "FAILED: ..." and stops; the error leaves the transaction aborted, so nothing can commit.
-- On success it prints NOTICE lines and "ALL BEHAVIOUR CHECKS PASSED".
--
-- SIDE-EFFECT PROOF (what makes it safe to run on production):
--   * It only calls the S6.4 database functions and a handful of deliberately-refused UPDATEs. Those functions write ONLY these
--     tables: proposals, proposal_line_items, proposal_versions, proposal_responses, project_invoices, invoice_line_items,
--     invoice_payments, document_counters, activity_events and projects. All are rolled back with the transaction.
--   * No function in it touches storage (no storage.* object, no bucket, no file), makes an HTTP/network call, sends email,
--     fires a webhook or takes a payment. Emails and portal notifications are sent by the APPLICATION, never by SQL, and this
--     script never calls the application.
--   * Step 0 below re-checks that claim against the live database: it ABORTS BEFORE ANY WRITE if a trigger on any table the test
--     writes calls pg_net, net.http_*, http_*, dblink, supabase_functions or a server-side file/program operation. Such an effect
--     could not be undone by ROLLBACK, so it must never be exercised here (it would be verified through application tests instead).
--   * Realtime/WAL consumers see nothing: rolled-back changes are never emitted.
--   * It leaves ZERO persistent rows: after the ROLLBACK a final SELECT counts anything the test could have left (expect 0 and 0).
-- It takes brief row locks on the one client it borrows, and relies on ROLLBACK for everything else.
-- =============================================================================
BEGIN;

-- Step 0: abort before any write if any trigger on a table this test writes could cause an effect that ROLLBACK cannot undo.
DO $$
DECLARE v_bad text;
BEGIN
  SELECT string_agg(c.relname || '.' || t.tgname || ' -> ' || pn.nspname || '.' || p.proname, '; ') INTO v_bad
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    JOIN pg_proc p ON p.oid = t.tgfoid
    JOIN pg_namespace pn ON pn.oid = p.pronamespace
   WHERE NOT t.tgisinternal AND n.nspname = 'public'
     AND c.relname IN ('proposals','proposal_line_items','proposal_versions','proposal_responses','project_invoices','invoice_line_items',
                       'invoice_payments','document_counters','activity_events','projects')
     AND (pn.nspname = 'supabase_functions'
          OR p.prosrc ~* '(pg_net|net.http_|http_(get|post|put|delete|request)|supabase_functions|dblink|lo_export|pg_read_server_files|program)');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'ABORTED BEFORE ANY WRITE: a trigger could cause an external side effect that ROLLBACK cannot undo: %', v_bad;
  END IF;
  RAISE NOTICE 'ok  no trigger on a written table reaches the network, a webhook or the file system';
END $$;

CREATE FUNCTION pg_temp.t_ok(p_cond boolean, p_what text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_cond IS NOT TRUE THEN RAISE EXCEPTION 'FAILED: %', p_what; END IF;
  RAISE NOTICE 'ok  %', p_what;
END $$;

DO $$
DECLARE
  v_client uuid; v_other_client uuid; v_merchant uuid; v_admin uuid; v_user uuid;
  v_r jsonb; v_pid uuid; v_proj uuid; v_proj2 uuid; v_inv uuid; v_inv2 uuid; v_n1 text; v_n2 text; v_ref text := 'PROJ-T' || substr(md5(random()::text), 1, 7);
  v_cnt int; v_paid text; v_portfolio uuid;
BEGIN
  SELECT c.id, c.merchant_id INTO v_client, v_merchant FROM public.clients c
   WHERE c.merchant_id IS NOT NULL AND lower(btrim(coalesce(c.status, ''))) <> 'suspended' AND EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = c.merchant_id) LIMIT 1;
  IF v_client IS NULL THEN RAISE EXCEPTION 'FAILED: the test needs one active, connected client to borrow (nothing is written to it permanently)'; END IF;
  SELECT c.id INTO v_other_client FROM public.clients c WHERE c.id <> v_client LIMIT 1;
  SELECT user_id INTO v_admin FROM public.admin_users WHERE is_active LIMIT 1;
  IF v_admin IS NULL THEN RAISE EXCEPTION 'FAILED: the test needs one active admin user id'; END IF;
  v_user := gen_random_uuid();

  -- ── A. money is exact and server-computed ──────────────────────────────────────────────────────────────────────────────
  v_r := public.save_proposal_draft(NULL, v_merchant, v_client, 'TEST-' || substr(md5(random()::text), 1, 8), v_admin, jsonb_build_object(
    'title', 'Behaviour test proposal', 'currency', 'NGN', 'discount_amount', '1.87', 'terms', 'Net 14', 'payment_terms', '50% upfront',
    'line_items', jsonb_build_array(jsonb_build_object('title', 'Design', 'quantity', '2', 'unit_price', '10.10'),
                                     jsonb_build_object('title', 'Build', 'quantity', '0.5', 'unit_price', '3.33'))));
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'saved', 'draft saved');
  v_pid := (v_r ->> 'proposal_id')::uuid;
  PERFORM pg_temp.t_ok(v_r ->> 'subtotal' = '21.87' AND v_r ->> 'total' = '20.00', 'subtotal 21.87 (20.20 + 1.67 rounded to cents), total 20.00 after the 1.87 discount');
  PERFORM pg_temp.t_ok((public.save_proposal_draft(v_pid, NULL, NULL, NULL, v_admin, jsonb_build_object('line_items', jsonb_build_array(jsonb_build_object('title', 'x', 'quantity', '1', 'unit_price', '1.234')))) ->> 'status') = 'invalid', 'a three-decimal price is refused');
  PERFORM pg_temp.t_ok((public.save_proposal_draft(v_pid, NULL, NULL, NULL, v_admin, jsonb_build_object('currency', 'JPY')) ->> 'status') = 'invalid', 'an unsupported currency is refused');
  PERFORM pg_temp.t_ok((public.save_proposal_draft(v_pid, NULL, NULL, NULL, v_admin, jsonb_build_object('discount_amount', '99999')) ->> 'status') = 'invalid', 'a discount above the subtotal is refused');
  PERFORM pg_temp.t_ok((SELECT total::text FROM public.proposals WHERE id = v_pid) = '20.00', 'a refused save changed nothing');

  -- ── B. send, snapshot, freeze ────────────────────────────────────────────────────────────────────────────────────────────
  v_r := public.send_proposal(v_pid, v_admin);
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'sent' AND (v_r ->> 'version')::int = 1, 'sent as version 1');
  PERFORM pg_temp.t_ok((SELECT jsonb_array_length(line_items) FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 1) = 2, 'version 1 snapshot holds both lines');
  PERFORM pg_temp.t_ok((SELECT payment_terms FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 1) = '50% upfront', 'version 1 snapshot carries its payment terms');
  BEGIN UPDATE public.proposals SET pricing = jsonb_build_object('total', 20.00, 'currency', 'NGN', 'payment_terms', 'changed') WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: pricing / payment terms change on a sent proposal';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'the live payment terms of a sent proposal are frozen');
  PERFORM pg_temp.t_ok((public.save_proposal_draft(v_pid, NULL, NULL, NULL, v_admin, '{"title":"sneaky"}'::jsonb) ->> 'status') = 'not_editable', 'a sent proposal cannot be edited through the draft function');
  BEGIN UPDATE public.proposals SET total = 1.00, subtotal = 1.00 WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: total change on a sent proposal';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN INSERT INTO public.proposal_line_items (proposal_id, title, quantity, unit_price) VALUES (v_pid, 'sneaky', 1, 1); RAISE EXCEPTION 'NOT REFUSED: line insert on a sent proposal';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'database refuses commercial edits and line changes on a sent proposal');
  BEGIN UPDATE public.proposal_versions SET total = 0 WHERE proposal_id = v_pid; RAISE EXCEPTION 'NOT REFUSED: version update';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'a proposal version snapshot is immutable');

  -- ── C. client decisions: ownership, version binding, change request ─────────────────────────────────────────────────
  PERFORM pg_temp.t_ok((public.mark_proposal_viewed(v_pid, v_other_client) ->> 'status') = 'not_found', 'another client cannot view-mark the proposal');
  PERFORM pg_temp.t_ok((public.mark_proposal_viewed(v_pid, v_client) ->> 'status') = 'viewed', 'owner marks it viewed');
  PERFORM pg_temp.t_ok((public.mark_proposal_viewed(v_pid, v_client) ->> 'status') = 'unchanged', 'viewing twice is a no-op');
  PERFORM pg_temp.t_ok((public.approve_proposal(v_pid, v_other_client, v_user, 1, v_ref) ->> 'status') = 'not_found', 'another client cannot approve it');
  PERFORM pg_temp.t_ok((public.approve_proposal(v_pid, v_client, v_user, 7, v_ref) ->> 'status') = 'version_mismatch', 'approval of a version the client did not see is refused');
  v_r := public.request_proposal_changes(v_pid, v_client, v_user, 'Please add a maintenance line.', 'chg-key-0001');
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'requested' AND (v_r ->> 'duplicate')::boolean IS FALSE, 'changes requested and recorded');
  PERFORM pg_temp.t_ok((public.request_proposal_changes(v_pid, v_client, v_user, 'Please add a maintenance line.', 'chg-key-0001') ->> 'duplicate')::boolean IS TRUE, 'the same request retried is a duplicate, not a second record');
  PERFORM pg_temp.t_ok((SELECT count(*) FROM public.proposal_responses WHERE proposal_id = v_pid) = 1, 'exactly one durable change request');
  PERFORM pg_temp.t_ok((public.approve_proposal(v_pid, v_client, v_user, 1, v_ref) ->> 'status') = 'not_allowed', 'a changes_requested proposal cannot be approved');

  -- ── D. revise and resend: a new version, the old one untouched ────────────────────────────────────────────────────
  v_r := public.save_proposal_draft(v_pid, NULL, NULL, NULL, v_admin, jsonb_build_object('discount_amount', '0', 'payment_terms', '30 days net',
    'line_items', jsonb_build_array(jsonb_build_object('title', 'Design', 'quantity', '2', 'unit_price', '10.10'),
                                     jsonb_build_object('title', 'Maintenance', 'quantity', '1', 'unit_price', '5.00'))));
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'saved' AND v_r ->> 'total' = '25.20', 'revision saved (25.20)');
  PERFORM pg_temp.t_ok((SELECT payment_terms FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 1) = '50% upfront', 'editing the revision draft did not touch version 1 payment terms');
  v_r := public.send_proposal(v_pid, v_admin);
  PERFORM pg_temp.t_ok((SELECT payment_terms FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 2) = '30 days net'
                   AND (SELECT payment_terms FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 1) = '50% upfront', 'version 2 carries its own payment terms; version 1 keeps the original');
  PERFORM pg_temp.t_ok((v_r ->> 'version')::int = 2 AND (v_r ->> 'revised')::boolean IS TRUE, 'resent as version 2');
  PERFORM pg_temp.t_ok((SELECT total::text FROM public.proposal_versions WHERE proposal_id = v_pid AND version_number = 1) = '20.00', 'version 1 still says 20.00');
  PERFORM pg_temp.t_ok((SELECT resolved_in_version FROM public.proposal_responses WHERE proposal_id = v_pid) = 2, 'the change request is marked resolved in version 2');

  -- ── E. approval: idempotent, one project, frozen afterwards ─────────────────────────────────────────────────────────
  v_r := public.approve_proposal(v_pid, v_client, v_user, 2, v_ref);
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'approved' AND (v_r ->> 'project_created')::boolean IS TRUE, 'approved at version 2 and a project was created');
  v_proj := (v_r ->> 'project_id')::uuid;
  v_r := public.approve_proposal(v_pid, v_client, v_user, 2, v_ref);
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'already_approved' AND (v_r ->> 'project_id')::uuid = v_proj, 'a repeated approval is idempotent and returns the same project');
  SELECT count(*) INTO v_cnt FROM public.projects WHERE project_id = v_ref;
  PERFORM pg_temp.t_ok(v_cnt = 1, 'exactly one project exists for the approval');
  PERFORM pg_temp.t_ok((SELECT count(*) FROM public.activity_events WHERE dedupe_key = 'proposal_approved:' || v_pid::text) = 1, 'exactly one approval event');
  PERFORM pg_temp.t_ok((SELECT client_id FROM public.projects WHERE id = v_proj) = v_client, 'the project belongs to the approving client');
  BEGIN UPDATE public.proposals SET total = 1.00, subtotal = 1.00 WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: total change after approval';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN UPDATE public.proposals SET approved_version = 1 WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: moving the approved version';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN UPDATE public.proposals SET converted_to_project_id = NULL WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: unlinking the project';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN UPDATE public.proposals SET status = 'draft' WHERE id = v_pid; RAISE EXCEPTION 'NOT REFUSED: reopening an approved proposal';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'an approved proposal cannot be re-priced, re-versioned, unlinked or reopened');
  PERFORM pg_temp.t_ok((public.convert_approved_proposal(v_pid, v_admin, v_ref || 'X') ->> 'status') = 'already_converted', 'explicit conversion of an already converted proposal creates nothing new');

  -- ── F. invoices: copied snapshot, numbering, issue freeze ───────────────────────────────────────────────────────────
  v_r := public.create_invoice(v_proj, v_pid, NULL, current_date + 14, v_admin);
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'created', 'invoice created from the approved proposal');
  v_inv := (v_r ->> 'invoice_id')::uuid; v_n1 := v_r ->> 'invoice_number';
  PERFORM pg_temp.t_ok(v_n1 ~ '^HBD-INV-[0-9]{4}-[0-9]{4,}$', 'invoice number format ' || v_n1);
  PERFORM pg_temp.t_ok((SELECT amount::text FROM public.project_invoices WHERE id = v_inv) = '25.20' AND (SELECT count(*) FROM public.invoice_line_items WHERE invoice_id = v_inv) = 2, 'invoice total 25.20 with both copied lines (the approved version, not live rows)');
  PERFORM pg_temp.t_ok((public.create_invoice(v_proj, v_pid, NULL, current_date + 14, v_admin) ->> 'status') = 'already_invoiced', 'a second live invoice for the same proposal is refused');
  v_r := public.create_invoice(v_proj, NULL, 'NGN', current_date + 7, v_admin);
  v_inv2 := (v_r ->> 'invoice_id')::uuid; v_n2 := v_r ->> 'invoice_number';
  PERFORM pg_temp.t_ok(substr(v_n2, 14)::int = substr(v_n1, 14)::int + 1, 'numbers are consecutive (' || v_n1 || ' -> ' || v_n2 || ')');
  INSERT INTO public.invoice_line_items (invoice_id, title, quantity, unit_price) VALUES (v_inv2, 'Extra', 3, 1.10);
  PERFORM pg_temp.t_ok((SELECT amount::text FROM public.project_invoices WHERE id = v_inv2) = '3.30', 'a draft invoice derives its total from its lines (3 x 1.10 = 3.30)');
  PERFORM pg_temp.t_ok((public.issue_invoice(v_inv, v_admin) ->> 'status') = 'issued', 'invoice issued');
  BEGIN UPDATE public.project_invoices SET amount = 1, subtotal = 1 WHERE id = v_inv; RAISE EXCEPTION 'NOT REFUSED: amount change on an issued invoice';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN INSERT INTO public.invoice_line_items (invoice_id, title, quantity, unit_price) VALUES (v_inv, 'sneaky', 1, 1); RAISE EXCEPTION 'NOT REFUSED: line on an issued invoice';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  BEGIN DELETE FROM public.project_invoices WHERE id = v_inv; RAISE EXCEPTION 'NOT REFUSED: deleting an issued invoice';
  EXCEPTION WHEN SQLSTATE '55000' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'an issued invoice cannot change amount or lines, and cannot be deleted');

  -- ── G. the payment ledger ─────────────────────────────────────────────────────────────────────────────────────────────
  PERFORM pg_temp.t_ok((public.record_invoice_payment(v_inv2, 1, current_date, NULL, NULL, NULL, v_admin, NULL) ->> 'status') = 'not_payable', 'a draft invoice cannot take a payment');
  v_r := public.record_invoice_payment(v_inv, 5.00, current_date, 'bank transfer', 'REF-1', NULL, v_admin, 'pay-key-00000001');
  PERFORM pg_temp.t_ok(v_r ->> 'status' = 'recorded' AND v_r ->> 'invoice_status' = 'partially_paid' AND v_r ->> 'balance' = '20.20', 'partial payment: partially_paid, balance 20.20');
  v_r := public.record_invoice_payment(v_inv, 5.00, current_date, 'bank transfer', 'REF-1', NULL, v_admin, 'pay-key-00000001');
  PERFORM pg_temp.t_ok((v_r ->> 'duplicate')::boolean IS TRUE, 'the same payment retried is a duplicate');
  PERFORM pg_temp.t_ok((SELECT count(*) FROM public.invoice_payments WHERE invoice_id = v_inv) = 1, 'exactly one ledger row');
  PERFORM pg_temp.t_ok((public.record_invoice_payment(v_inv, 20.21, current_date, NULL, NULL, NULL, v_admin, 'pay-key-00000002') ->> 'status') = 'overpayment', 'overpayment by one cent is refused');
  PERFORM pg_temp.t_ok((public.record_invoice_payment(v_inv, 0, current_date, NULL, NULL, NULL, v_admin, NULL) ->> 'status') = 'invalid_amount', 'a zero payment is refused');
  PERFORM pg_temp.t_ok((public.record_invoice_payment(v_inv, -3, current_date, NULL, NULL, NULL, v_admin, NULL) ->> 'status') = 'invalid_amount', 'a negative payment is refused');
  PERFORM pg_temp.t_ok((public.void_invoice(v_inv, v_admin, 'x') ->> 'status') = 'has_payments', 'an invoice with payments cannot be voided');
  v_r := public.record_invoice_payment(v_inv, 20.20, current_date, NULL, NULL, NULL, v_admin, 'pay-key-00000003');
  PERFORM pg_temp.t_ok(v_r ->> 'invoice_status' = 'paid' AND v_r ->> 'balance' = '0.00', 'final payment: paid, balance 0.00');
  PERFORM pg_temp.t_ok((SELECT paid_at IS NOT NULL FROM public.project_invoices WHERE id = v_inv), 'paid_at stamped');
  PERFORM pg_temp.t_ok((public.record_invoice_payment(v_inv, 1, current_date, NULL, NULL, NULL, v_admin, NULL) ->> 'status') = 'not_payable', 'a paid invoice takes no more money');
  BEGIN UPDATE public.invoice_payments SET amount = 1 WHERE invoice_id = v_inv; RAISE EXCEPTION 'NOT REFUSED: payment update';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  BEGIN DELETE FROM public.invoice_payments WHERE invoice_id = v_inv; RAISE EXCEPTION 'NOT REFUSED: payment delete';
  EXCEPTION WHEN SQLSTATE '42501' THEN NULL; END;
  PERFORM pg_temp.t_ok(true, 'the payment ledger is append-only');

  -- ── H. void and portfolio rules ───────────────────────────────────────────────────────────────────────────────────────
  PERFORM pg_temp.t_ok((public.void_invoice(v_inv2, v_admin, 'test') ->> 'status') = 'voided', 'a draft invoice can be voided');
  PERFORM pg_temp.t_ok((public.void_invoice(v_inv, v_admin, NULL) ->> 'status') = 'has_payments', 'a paid invoice cannot be voided');
  SELECT id INTO v_portfolio FROM public.projects WHERE client_id IS NULL LIMIT 1;
  IF v_portfolio IS NOT NULL THEN
    PERFORM pg_temp.t_ok((public.create_invoice(v_portfolio, NULL, 'USD', current_date + 7, v_admin) ->> 'status') = 'not_client_project', 'a public portfolio project cannot be invoiced');
  ELSE
    RAISE NOTICE 'skip  no public portfolio row in this database to test against';
  END IF;

  RAISE NOTICE 'ALL BEHAVIOUR CHECKS PASSED';
END $$;

ROLLBACK;

-- Run AFTER the rollback, as its own statement: proof that nothing persisted. Both counts must be 0.
SELECT (SELECT count(*) FROM public.proposals WHERE title = 'Behaviour test proposal') AS leftover_test_proposals,
       (SELECT count(*) FROM public.projects WHERE project_id LIKE 'PROJ-T_______') AS leftover_test_projects;
