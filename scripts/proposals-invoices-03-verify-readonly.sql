-- =============================================================================
-- S6.4 PROPOSALS V2 + INVOICES — VERIFIER (READ-ONLY), run AFTER proposals-invoices-01-forward.sql.
-- ONE statement, ONE grid: (check_name, verdict, detail). Reads pg_catalog and COUNTS / SUMS stored figures; it never
-- returns a title, a description, a name, an email or a message, and it writes nothing. The last row is OVERALL
-- (PASS only when no row is FAIL). REVIEW / INFO rows never fail it.
--
-- HOW THINGS ARE JUDGED (the S6.2 / S6.3 lessons):
--   * A raw GRANT is not an exposure; effective access is. Existing tables (proposals, project_invoices, proposal_files)
--     are judged by their PERMISSIVE policies, and a FAIL needs an UNRESTRICTED policy (USING true / no predicate) that
--     applies to anon or authenticated AND a privilege that role holds. A policy this script cannot positively classify as
--     admin / own-row / service-role is reported REVIEW with its expression, never silently passed and never guessed FAIL.
--   * Triggers are read from pg_trigger FLAGS (tgtype), never from deparsed text (PostgreSQL prints events in its own order).
--   * "char" catalog columns are always cast; DELETE is checked at table level only.
-- What a read-only query CANNOT prove (behaviour: approval idempotency, overpayment refusal, immutability in action) is
-- proved by proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql, which runs in one transaction that always rolls back.
--
-- LIFECYCLE (two states, one switch — cfg below):
--   final_hardened = false  (DEFAULT)  Use for the runs BEFORE proposals-invoices-05 (after 01, and again after the code deploy).
--       The authenticated/anon INSERT/UPDATE/DELETE grants on proposals and project_invoices are intentionally still present for
--       compatibility with the old browser code, so row 120 reports INFO ('expected before 05'), never a failure of the migration.
--       EXPECTED RESULT: OVERALL = PASS, the HARDENING row says PRE-HARDENING, and row 120 shows INFO for the four role/table pairs.
--   final_hardened = true   Use for the LAST run, after the application is deployed AND proposals-invoices-05 has been run.
--       Any surviving browser write grant on proposals / project_invoices is now a FAIL.
--       EXPECTED RESULT: OVERALL = PASS, the HARDENING row says FINAL, row 120 is PASS for all four pairs.
-- =============================================================================
WITH
-- ► THE ONLY SWITCH: change false to true for the final run (after deploy and after script 05). Everything else is identical.
cfg(final_hardened) AS (VALUES (false)),
nt(name) AS (VALUES ('proposal_line_items'), ('proposal_versions'), ('proposal_responses'), ('invoice_line_items'),
                    ('invoice_payments'), ('document_counters'), ('s64_constraint_backups')),
ntr AS (SELECT n.name, c.oid, c.relrowsecurity AS rls FROM nt n LEFT JOIN pg_class c ON c.relname = n.name AND c.relnamespace = 'public'::regnamespace),

fnp(sig) AS (VALUES ('public.save_proposal_draft(uuid,uuid,uuid,text,uuid,jsonb)'), ('public.send_proposal(uuid,uuid)'), ('public.mark_proposal_viewed(uuid,uuid)'),
                    ('public.approve_proposal(uuid,uuid,uuid,integer,text)'), ('public.request_proposal_changes(uuid,uuid,uuid,text,text)'),
                    ('public.decline_proposal(uuid,uuid,uuid,text,text)'), ('public.convert_approved_proposal(uuid,uuid,text)'),
                    ('public.create_invoice(uuid,uuid,text,date,uuid)'), ('public.issue_invoice(uuid,uuid)'),
                    ('public.record_invoice_payment(uuid,numeric,date,text,text,text,uuid,text)'), ('public.void_invoice(uuid,uuid,text)')),
fnh(sig) AS (VALUES ('public.s64_event(uuid,uuid,uuid,text,text,uuid,text,text,text,text)'), ('public.next_document_number(text)'),
                    ('public.s64_create_client_project(uuid,text,text,text,text)')),
fp AS (SELECT sig, to_regprocedure(sig) AS oid FROM fnp),
fh AS (SELECT sig, to_regprocedure(sig) AS oid FROM fnh),

-- expected triggers: table, function, required tgtype bits, forbidden bits (1 row, 2 BEFORE, 4 INSERT, 8 DELETE, 16 UPDATE, 32 TRUNCATE)
trg_expect(tbl, fn, must, forbid, label) AS (VALUES
  ('proposals',           'proposals_immutable_after_decision', 27, 0, 'proposals: legal transitions + frozen commercial values (BEFORE UPDATE/DELETE row)'),
  ('proposal_line_items', 's64_line_items_guard',               31, 0, 'proposal line items editable only while draft / under revision'),
  ('proposal_versions',   's64_append_only',                    27, 0, 'proposal versions immutable (UPDATE/DELETE refused)'),
  ('proposal_versions',   's64_append_only',                    34, 1, 'proposal versions: TRUNCATE refused'),
  ('proposal_responses',  's64_append_only',                    11, 0, 'proposal responses: DELETE refused'),
  ('proposal_responses',  's64_append_only',                    34, 1, 'proposal responses: TRUNCATE refused'),
  ('proposal_responses',  's64_responses_guard',                19, 0, 'proposal responses: only resolution may be recorded'),
  ('project_invoices',    'project_invoices_guard',             31, 0, 'invoices: derived totals, frozen once issued, legal transitions, no delete'),
  ('invoice_line_items',  's64_invoice_lines_guard',            31, 0, 'invoice line items editable only while draft'),
  ('invoice_line_items',  's64_invoice_lines_touch',            29, 2, 'invoice line change re-derives the draft totals (AFTER row)'),
  ('invoice_payments',    's64_append_only',                    27, 0, 'payment ledger immutable (UPDATE/DELETE refused)'),
  ('invoice_payments',    's64_append_only',                    34, 1, 'payment ledger: TRUNCATE refused'),
  ('invoice_payments',    's64_payments_guard',                  7, 0, 'payments refused against a non-payable invoice or beyond the total')),
-- approve_proposal source, whitespace-collapsed and lower-cased (always exactly one row; '' when the function is missing)
apr AS (
  SELECT s, coalesce(substring(s from 'update public\.proposals set status = ''approved''([^;]*);'), '') AS upd
  FROM (SELECT coalesce((SELECT lower(regexp_replace(p.prosrc, '\s+', ' ', 'g')) FROM pg_proc p
                          WHERE p.proname = 'approve_proposal' AND p.pronamespace = 'public'::regnamespace LIMIT 1), '') AS s) q
),
-- CHECK constraints judged by MEANING: the string literals each admits, never the way pg_get_constraintdef() prints them
chk AS (
  SELECT replace(c.conrelid::regclass::text, 'public.', '') AS tbl, c.conname::text AS name,
         ARRAY(SELECT m[1] FROM regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') AS m) AS lits
  FROM pg_constraint c
  WHERE c.contype::text = 'c' AND c.conrelid IN (to_regclass('public.proposals'), to_regclass('public.project_invoices'))
),
trg AS (
  SELECT c.relname::text AS tbl, f.proname::text AS fn, t.tgtype::int AS tgtype, t.tgenabled::text AS enabled
  FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_proc f ON f.oid = t.tgfoid
  WHERE NOT t.tgisinternal AND c.relnamespace = 'public'::regnamespace
),

-- policies on the EXISTING tables the workflow uses (effective-access check, deliberately conservative)
pol AS (
  SELECT p.tablename::text AS tbl, p.policyname::text AS policyname, p.cmd::text AS cmd, coalesce(p.qual, '') AS q, coalesce(p.with_check, '') AS wc,
         p.roles && ARRAY['public', 'authenticated']::name[] AS app_auth, p.roles && ARRAY['public', 'anon']::name[] AS app_anon,
         btrim(regexp_replace(coalesce(p.qual, ''), '[()\s]', '', 'g')) AS qcanon, btrim(regexp_replace(coalesce(p.with_check, ''), '[()\s]', '', 'g')) AS wcanon
  FROM pg_policies p
  WHERE p.schemaname = 'public' AND p.permissive = 'PERMISSIVE' AND p.tablename IN ('proposals', 'project_invoices', 'proposal_files')
),
polx AS (
  SELECT pl.*, o.op, rl.role,
         -- the expression that actually governs this operation
         CASE WHEN o.op = 'INSERT' THEN CASE WHEN pl.cmd = 'ALL' AND pl.wcanon = '' THEN pl.qcanon ELSE pl.wcanon END ELSE pl.qcanon END AS governing_canon,
         CASE WHEN o.op = 'INSERT' THEN CASE WHEN pl.cmd = 'ALL' AND pl.wc = '' THEN pl.q ELSE pl.wc END ELSE pl.q END AS governing,
         CASE WHEN rl.role = 'anon' THEN pl.app_anon ELSE pl.app_auth END AS applies,
         CASE WHEN o.op = 'DELETE' THEN has_table_privilege(rl.role, to_regclass('public.' || pl.tbl), 'DELETE')
              ELSE has_table_privilege(rl.role, to_regclass('public.' || pl.tbl), o.op) OR has_any_column_privilege(rl.role, to_regclass('public.' || pl.tbl), o.op) END AS holds
  FROM pol pl
  CROSS JOIN LATERAL unnest(CASE WHEN pl.cmd = 'ALL' THEN ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']
                                 WHEN pl.cmd IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE') THEN ARRAY[pl.cmd] ELSE ARRAY[]::text[] END) AS o(op)
  CROSS JOIN (VALUES ('anon'), ('authenticated')) AS rl(role)
),
-- unrestricted = no predicate at all, or literally true
unrestricted AS (SELECT * FROM polx WHERE applies AND holds AND (governing_canon = '' OR lower(governing_canon) = 'true')),
-- UNCLASSIFIED: a policy that is neither unrestricted nor positively an active-admin / own-row / service-role predicate
unclassified AS (
  SELECT * FROM polx WHERE applies AND holds AND NOT (governing_canon = '' OR lower(governing_canon) = 'true')
    AND NOT ((governing ~* 'admin_users' AND governing ~* 'is_active') OR governing ~* 'is_active_admin\s*\('
             OR governing ~* 'auth\.uid\(\)|current_client_id\(\)' OR governing ~* 'auth\.role\(\)\s*=\s*''service_role''')
),

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

  -- service_role privileges: least privilege at the grant layer (the triggers also refuse)
  UNION ALL SELECT 50, 'service_role holds SELECT and INSERT on the ledgers / snapshots: ' || ntr.name,
         CASE WHEN has_table_privilege('service_role', ntr.oid, 'SELECT') AND has_table_privilege('service_role', ntr.oid, 'INSERT') THEN 'PASS' ELSE 'FAIL' END, ''
         FROM ntr WHERE ntr.name IN ('proposal_versions', 'invoice_payments', 'proposal_responses', 'proposal_line_items', 'invoice_line_items') AND ntr.oid IS NOT NULL
  UNION ALL SELECT 51, 'service_role holds NO UPDATE / DELETE / TRUNCATE grant on the append-only: ' || ntr.name,
         CASE WHEN has_table_privilege('service_role', ntr.oid, 'UPDATE') OR has_table_privilege('service_role', ntr.oid, 'DELETE') OR has_table_privilege('service_role', ntr.oid, 'TRUNCATE') THEN 'FAIL' ELSE 'PASS' END,
         'holds: ' || coalesce(nullif(concat_ws(', ', CASE WHEN has_table_privilege('service_role', ntr.oid, 'UPDATE') THEN 'UPDATE' END,
                                                       CASE WHEN has_table_privilege('service_role', ntr.oid, 'DELETE') THEN 'DELETE' END,
                                                       CASE WHEN has_table_privilege('service_role', ntr.oid, 'TRUNCATE') THEN 'TRUNCATE' END), ''), 'none of them')
         FROM ntr WHERE ntr.name IN ('proposal_versions', 'invoice_payments') AND ntr.oid IS NOT NULL
  UNION ALL SELECT 52, 'service_role holds NO DELETE / TRUNCATE grant on proposal_responses',
         CASE WHEN has_table_privilege('service_role', ntr.oid, 'DELETE') OR has_table_privilege('service_role', ntr.oid, 'TRUNCATE') THEN 'FAIL' ELSE 'PASS' END, ''
         FROM ntr WHERE ntr.name = 'proposal_responses' AND ntr.oid IS NOT NULL
  UNION ALL SELECT 53, 'service_role holds NO privilege on the internal tables: ' || ntr.name,
         CASE WHEN has_table_privilege('service_role', ntr.oid, 'SELECT') OR has_table_privilege('service_role', ntr.oid, 'INSERT')
                OR has_table_privilege('service_role', ntr.oid, 'UPDATE') OR has_table_privilege('service_role', ntr.oid, 'DELETE') THEN 'FAIL' ELSE 'PASS' END,
         'only the SECURITY DEFINER numbering function touches document_counters; s64_constraint_backups is owner-only'
         FROM ntr WHERE ntr.name IN ('document_counters', 's64_constraint_backups') AND ntr.oid IS NOT NULL

  -- triggers, from pg_trigger flags
  UNION ALL SELECT 60, 'trigger: ' || label,
         CASE WHEN EXISTS (SELECT 1 FROM trg WHERE trg.tbl = e.tbl AND trg.fn = e.fn AND (trg.tgtype & e.must) = e.must AND (trg.tgtype & e.forbid) = 0 AND trg.enabled IN ('O', 'A')) THEN 'PASS' ELSE 'FAIL' END,
         e.tbl || ' <- ' || e.fn FROM trg_expect e

  -- functions
  UNION ALL SELECT 70, 'function exists: ' || sig, CASE WHEN oid IS NULL THEN 'FAIL' ELSE 'PASS' END, '' FROM (SELECT * FROM fp UNION ALL SELECT * FROM fh) a
  UNION ALL SELECT 71, 'SECURITY DEFINER with pinned search_path: ' || sig,
         CASE WHEN p.prosecdef AND p.proconfig::text ILIKE '%search_path%' THEN 'PASS' ELSE 'FAIL' END, ''
         FROM (SELECT * FROM fp UNION ALL SELECT * FROM fh) a JOIN pg_proc p ON p.oid = a.oid WHERE a.oid IS NOT NULL
  UNION ALL SELECT 72, 'EXECUTE: service_role yes, anon / authenticated / PUBLIC no: ' || sig,
         CASE WHEN has_function_privilege('service_role', fp.oid, 'EXECUTE') AND NOT has_function_privilege('anon', fp.oid, 'EXECUTE')
               AND NOT has_function_privilege('authenticated', fp.oid, 'EXECUTE')
               AND NOT EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = fp.oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN 'PASS' ELSE 'FAIL' END, ''
         FROM fp WHERE fp.oid IS NOT NULL
  UNION ALL SELECT 73, 'EXECUTE: NOBODY (internal helper): ' || sig,
         CASE WHEN has_function_privilege('service_role', fh.oid, 'EXECUTE') OR has_function_privilege('anon', fh.oid, 'EXECUTE')
                OR has_function_privilege('authenticated', fh.oid, 'EXECUTE')
                OR EXISTS (SELECT 1 FROM pg_proc p, aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a WHERE p.oid = fh.oid AND a.grantee = 0 AND a.privilege_type = 'EXECUTE') THEN 'FAIL' ELSE 'PASS' END, ''
         FROM fh WHERE fh.oid IS NOT NULL

  -- structural proof of ownership scoping and idempotency inside the functions
  UNION ALL SELECT 75, 'client-facing proposal functions are scoped to the caller''s client_id: ' || f.nm,
         CASE WHEN p.prosrc ~ 'client_id\s*=\s*p_client_id' THEN 'PASS' ELSE 'FAIL' END, 'cross-client ids answer not_found'
         FROM (VALUES ('approve_proposal'), ('mark_proposal_viewed'), ('request_proposal_changes'), ('decline_proposal')) f(nm)
         JOIN pg_proc p ON p.proname = f.nm AND p.pronamespace = 'public'::regnamespace
  -- approve_proposal, judged by MEANING: whitespace is collapsed and case folded first, so line wrapping, spacing and
  -- IN / NOT IN phrasing cannot cause a false result. One row per guarantee.
  UNION ALL SELECT 760, 'approve_proposal: the function exists',
         CASE WHEN apr.s <> '' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 761, 'approve_proposal: the proposal is looked up for THIS client only, and row-locked',
         CASE WHEN apr.s ~ 'where id = p_proposal_id and client_id = p_client_id for update' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 762, 'approve_proposal: initial approval only from sent / viewed (anything else is not_allowed)',
         CASE WHEN apr.s ~ 'status (not )?in \( ?''sent'' ?, ?''viewed'' ?\)' AND apr.s LIKE '%not_allowed%' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 763, 'approve_proposal: the confirmed version must equal the current version (version_mismatch)',
         CASE WHEN apr.s ~ '(version <> p_confirm_version|p_confirm_version <> [a-z_.]*version|version != p_confirm_version)' AND apr.s LIKE '%version_mismatch%' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 764, 'approve_proposal: the immutable proposal_versions row must exist (no_version)',
         CASE WHEN apr.s ~ 'from public\.proposal_versions where proposal_id = [a-z_.]+ and version_number = [a-z_.]+' AND apr.s LIKE '%no_version%' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 765, 'approve_proposal: a repeat of the SAME approved version returns already_approved before anything is created',
         CASE WHEN apr.s ~ 'if [a-z_.]*status = ''approved'' then if [a-z_.]*approved_version = p_confirm_version then return jsonb_build_object\(''status'', ''already_approved''' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 766, 'approve_proposal: a different version after approval is refused (not_allowed)',
         CASE WHEN apr.s ~ 'already_approved''[^;]*; end if; return jsonb_build_object\(''status'', ''not_allowed''' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 767, 'approve_proposal: project reuse is same-client only, creation is for the proposal''s client, never a portfolio row',
         CASE WHEN apr.s ~ 'pr\.id = [a-z_.]+ and pr\.client_id = v_p\.client_id' AND apr.s ~ 's64_create_client_project\( ?v_p\.client_id' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 768, 'approve_proposal: exactly ONE approval UPDATE, recording status, accepted_at, approved_version, approved_by and the project link',
         CASE WHEN (SELECT count(*) FROM regexp_matches(apr.s, 'update public\.proposals set status = ''approved''', 'g')) = 1
                AND apr.upd LIKE '%accepted_at = now()%' AND apr.upd LIKE '%approved_version = %' AND apr.upd LIKE '%approved_by = p_user_id%'
                AND apr.upd LIKE '%converted_to_project_id = %' AND apr.upd LIKE '%where id = %' THEN 'PASS' ELSE 'FAIL' END, '' FROM apr
  UNION ALL SELECT 77, 'approval reuses a same-client project or creates exactly one; never a portfolio row',
         CASE WHEN p.prosrc ~ 'pr\.client_id\s*=\s*v_p\.client_id' AND p.prosrc LIKE '%s64_create_client_project%' THEN 'PASS' ELSE 'FAIL' END, ''
         FROM pg_proc p WHERE p.proname = 'approve_proposal' AND p.pronamespace = 'public'::regnamespace
  UNION ALL SELECT 78, 'invoice creation: client projects only, approved version only, one live invoice per proposal',
         CASE WHEN p.prosrc LIKE '%not_client_project%' AND p.prosrc LIKE '%proposal_not_approved%' AND p.prosrc LIKE '%already_invoiced%'
               AND to_regclass('public.project_invoices_one_live_per_proposal_uidx') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END, ''
         FROM pg_proc p WHERE p.proname = 'create_invoice' AND p.pronamespace = 'public'::regnamespace
  UNION ALL SELECT 79, 'payments: overpayment refused (function and trigger), idempotency key, void with payments refused',
         CASE WHEN r.prosrc LIKE '%overpayment%' AND g.prosrc LIKE '%overpayment%' AND v.prosrc LIKE '%has_payments%'
               AND to_regclass('public.invoice_payments_key_uidx') IS NOT NULL THEN 'PASS' ELSE 'FAIL' END, ''
         FROM pg_proc r, pg_proc g, pg_proc v
         WHERE r.proname = 'record_invoice_payment' AND g.proname = 's64_payments_guard' AND v.proname = 'void_invoice'
           AND r.pronamespace = 'public'::regnamespace AND g.pronamespace = 'public'::regnamespace AND v.pronamespace = 'public'::regnamespace

  -- columns, types, generated money
  UNION ALL SELECT 80, 'column present with expected type: ' || t || '.' || c,
         CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns x WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c AND x.data_type = v.ty
                             AND (v.prec IS NULL OR (x.numeric_precision = v.prec AND x.numeric_scale = v.scale))) THEN 'PASS' ELSE 'FAIL' END, ''
         FROM (VALUES ('proposals','currency','text',NULL::int,NULL::int), ('proposals','subtotal','numeric',14,2), ('proposals','discount_amount','numeric',14,2), ('proposals','total','numeric',14,2),
                      ('proposals','version','integer',NULL,NULL), ('proposals','approved_version','integer',NULL,NULL), ('proposals','approved_by','uuid',NULL,NULL),
                      ('proposals','declined_at','timestamp with time zone',NULL,NULL), ('proposals','converted_to_project_id','uuid',NULL,NULL),
                      ('project_invoices','amount','numeric',14,2), ('project_invoices','subtotal','numeric',14,2), ('project_invoices','discount_amount','numeric',14,2),
                      ('project_invoices','tax_amount','numeric',14,2), ('project_invoices','proposal_id','uuid',NULL,NULL), ('project_invoices','issued_at','timestamp with time zone',NULL,NULL),
                      ('project_invoices','paid_at','timestamp with time zone',NULL,NULL), ('project_invoices','voided_at','timestamp with time zone',NULL,NULL),
                      ('proposal_line_items','unit_price','numeric',14,2), ('proposal_line_items','amount','numeric',14,2), ('invoice_line_items','line_amount','numeric',14,2),
                      ('invoice_payments','amount','numeric',14,2), ('proposal_versions','total','numeric',14,2), ('proposal_versions','payment_terms','text',NULL,NULL)) AS v(t, c, ty, prec, scale)
  UNION ALL SELECT 81, 'money columns are GENERATED by the database: ' || v.t || '.' || v.c,
         CASE WHEN EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = to_regclass('public.' || v.t) AND a.attname = v.c AND a.attgenerated::text = 's') THEN 'PASS' ELSE 'FAIL' END, ''
         FROM (VALUES ('proposal_line_items','amount'), ('invoice_line_items','line_amount')) AS v(t, c)

  -- constraints and indexes
  UNION ALL SELECT 90, 'constraint / index exists: ' || nm, CASE WHEN ok THEN 'PASS' ELSE 'FAIL' END, ''
         FROM (VALUES
           ('proposals_approved_version_fkey (approval points at a real version)', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_approved_version_fkey' AND conrelid = 'public.proposals'::regclass)),
           ('proposals_money_consistent_check', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposals_money_consistent_check')),
           ('proposal_versions (proposal_id, version_number) unique', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.proposal_versions'::regclass AND contype::text = 'u')),
           ('proposal_versions_money_check', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'proposal_versions_money_check')),
           ('proposals_number_uidx', to_regclass('public.proposals_number_uidx') IS NOT NULL),
           ('project_invoices_number_uidx (unique invoice numbers)', to_regclass('public.project_invoices_number_uidx') IS NOT NULL),
           ('project_invoices_money_check (amount = subtotal - discount + tax)', EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_invoices_money_check')),
           ('project_invoices_status_check admits exactly the five states', EXISTS (SELECT 1 FROM chk WHERE name = 'project_invoices_status_check'
              AND lits @> ARRAY['draft','issued','partially_paid','paid','void'] AND lits <@ ARRAY['draft','issued','partially_paid','paid','void'])),
           ('proposals status CHECK admits exactly the nine legacy values plus declined', EXISTS (SELECT 1 FROM chk WHERE tbl = 'proposals'
              AND lits @> ARRAY['draft','sent','viewed','accepted','rejected','expired','converted','approved','changes_requested','declined']
              AND lits <@ ARRAY['draft','sent','viewed','accepted','rejected','expired','converted','approved','changes_requested','declined'])),
           ('proposal_responses_key_uidx', to_regclass('public.proposal_responses_key_uidx') IS NOT NULL),
           ('invoice_payments_key_uidx', to_regclass('public.invoice_payments_key_uidx') IS NOT NULL),
           ('document_counters primary key (kind, year)', EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.document_counters'::regclass AND contype::text = 'p'))
         ) AS c(nm, ok)

  -- data and status compatibility
  UNION ALL SELECT 100, 'proposal status values are all understood (legacy rejected / converted / expired included)',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals WHERE status NOT IN ('draft','sent','viewed','changes_requested','approved','declined','rejected','expired','converted')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 101, 'no proposal was converted by writing status = converted (conversion is derived: approved AND converted_to_project_id)', 'INFO',
         (SELECT count(*) FROM public.proposals WHERE status = 'converted')::text || ' legacy row(s) with status converted'
  UNION ALL SELECT 102, 'no invoice has the persisted status overdue (overdue is derived from due_date)',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_invoices WHERE status NOT IN ('draft','issued','partially_paid','paid','void')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 103, 'proposal totals equal their line items and subtotal - discount',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.subtotal IS DISTINCT FROM (SELECT coalesce(sum(l.amount), 0) FROM public.proposal_line_items l WHERE l.proposal_id = p.id)
                                 OR p.total IS DISTINCT FROM p.subtotal - p.discount_amount) THEN 'PASS' ELSE 'FAIL' END,
         (SELECT count(*) FROM public.proposals)::text || ' proposal(s) checked'
  UNION ALL SELECT 104, 'every delivered proposal has an immutable snapshot of its current version, whose line items add up to its subtotal',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.status <> 'draft' AND NOT EXISTS (
                SELECT 1 FROM public.proposal_versions v WHERE v.proposal_id = p.id AND v.version_number = p.version
                  AND v.subtotal = (SELECT coalesce(sum((e ->> 'amount')::numeric), 0) FROM jsonb_array_elements(v.line_items) e)
                  AND v.total = v.subtotal - v.discount_amount)) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 1041, 'the delivered version carries the payment terms the client saw (version snapshot == frozen pricing for every delivered proposal)',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals p JOIN public.proposal_versions v ON v.proposal_id = p.id AND v.version_number = p.version
                WHERE p.status IN ('sent','viewed','approved','declined','expired','converted')
                  AND v.payment_terms IS DISTINCT FROM coalesce(btrim(to_jsonb(p) -> 'pricing' ->> 'payment_terms'), '')) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 105, 'every approved proposal points at an existing approved version',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals p WHERE p.status IN ('approved','converted') AND (p.approved_version IS NULL
                OR NOT EXISTS (SELECT 1 FROM public.proposal_versions v WHERE v.proposal_id = p.id AND v.version_number = p.approved_version))) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 106, 'legacy services / pricing JSON preserved (rows that still carry it)', 'INFO',
         (SELECT count(*) FROM public.proposals WHERE services IS NOT NULL)::text || ' of ' || (SELECT count(*) FROM public.proposals)::text
  UNION ALL SELECT 107, 'approved proposals not yet converted to a project (intentional for the historical record; Admin converts explicitly)', 'INFO',
         (SELECT count(*) FROM public.proposals WHERE status = 'approved' AND converted_to_project_id IS NULL)::text || ' unconverted / '
         || (SELECT count(*) FROM public.proposals WHERE status = 'approved' AND converted_to_project_id IS NOT NULL)::text || ' converted'
  UNION ALL SELECT 108, 'no proposal is linked to a public portfolio row or to another client''s project',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.proposals p JOIN public.projects pr ON pr.id = p.converted_to_project_id WHERE pr.client_id IS NULL OR pr.client_id IS DISTINCT FROM p.client_id) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 110, 'invoices bill client projects only',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_invoices i JOIN public.projects pr ON pr.id = i.project_id WHERE pr.client_id IS NULL) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 111, 'invoice figures: issued/paid/void invoices equal the sum of their line items',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_invoices i WHERE i.status <> 'draft'
                AND i.subtotal IS DISTINCT FROM (SELECT coalesce(sum(l.line_amount), 0) FROM public.invoice_line_items l WHERE l.invoice_id = i.id)) THEN 'PASS' ELSE 'FAIL' END,
         (SELECT count(*) FROM public.project_invoices)::text || ' invoice(s)'
  UNION ALL SELECT 112, 'payment ledger agrees with invoice status and never exceeds the total',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_invoices i, LATERAL (SELECT coalesce(sum(p.amount), 0) AS paid FROM public.invoice_payments p WHERE p.invoice_id = i.id) s
                WHERE s.paid > i.amount OR (i.status = 'paid' AND s.paid <> i.amount) OR (i.status = 'partially_paid' AND (s.paid <= 0 OR s.paid >= i.amount))
                   OR (i.status IN ('draft', 'issued', 'void') AND s.paid <> 0)) THEN 'PASS' ELSE 'FAIL' END, ''
  UNION ALL SELECT 113, 'invoice numbers are well-formed, unique, and not ahead of their counter',
         CASE WHEN NOT EXISTS (SELECT 1 FROM public.project_invoices i WHERE i.invoice_number IS NOT NULL AND i.invoice_number !~ '^HBD-INV-[0-9]{4}-[0-9]{4,}$')
               AND NOT EXISTS (SELECT 1 FROM public.project_invoices i WHERE i.invoice_number ~ '^HBD-INV-[0-9]{4}-[0-9]{4,}$'
                               AND NOT EXISTS (SELECT 1 FROM public.document_counters c WHERE c.kind = 'invoice' AND c.year = substring(i.invoice_number from 9 for 4)::int
                                               AND c.last_value >= substring(i.invoice_number from 14)::int)) THEN 'PASS' ELSE 'FAIL' END, ''

  -- browser write paths around the server rules (REVIEW until proposals-invoices-05 has been run AFTER the new code is deployed)
  UNION ALL SELECT 119, 'HARDENING state being verified', 'INFO',
         CASE WHEN (SELECT final_hardened FROM cfg) THEN 'FINAL (after deploy and script 05): browser write grants are required to be gone' ELSE 'PRE-HARDENING (before script 05): browser write grants are reported, not failed' END
  UNION ALL SELECT 120, 'browser write privilege on ' || x.t || ' for ' || r.role,
         CASE WHEN has_any_column_privilege(r.role, to_regclass('public.' || x.t), 'INSERT') OR has_table_privilege(r.role, to_regclass('public.' || x.t), 'INSERT')
                OR has_any_column_privilege(r.role, to_regclass('public.' || x.t), 'UPDATE') OR has_table_privilege(r.role, to_regclass('public.' || x.t), 'UPDATE')
                OR has_table_privilege(r.role, to_regclass('public.' || x.t), 'DELETE')
              THEN (CASE WHEN (SELECT final_hardened FROM cfg) THEN 'FAIL' ELSE 'INFO' END) ELSE 'PASS' END,
         CASE WHEN (SELECT final_hardened FROM cfg) THEN 'FINAL state: a browser write grant must not exist any more. Run proposals-invoices-05-revoke-browser-writes-AFTER-DEPLOY.sql.'
              ELSE 'PRE-HARDENING (expected before script 05): the raw grant is intentionally kept until the new code is deployed. Commercial values are already protected by the database guards either way.' END
         FROM (VALUES ('proposals'), ('project_invoices')) AS x(t) CROSS JOIN (VALUES ('anon'), ('authenticated')) AS r(role)

  -- effective access on the existing tables
  UNION ALL SELECT 130, 'no UNRESTRICTED policy lets anon / authenticated read or write ' || g.t,
         CASE WHEN EXISTS (SELECT 1 FROM unrestricted u WHERE u.tbl = g.t) THEN 'FAIL' ELSE 'PASS' END,
         coalesce((SELECT string_agg(u.policyname || ' [' || u.op || ' as ' || u.role || ']', '; ') FROM unrestricted u WHERE u.tbl = g.t), 'every applicable policy carries a predicate')
         FROM (VALUES ('proposals'), ('project_invoices'), ('proposal_files')) AS g(t)
  UNION ALL SELECT 131, 'policies this verifier could not positively classify (admin / own rows / service role) on ' || g.t,
         CASE WHEN EXISTS (SELECT 1 FROM unclassified r WHERE r.tbl = g.t) THEN 'REVIEW' ELSE 'PASS' END,
         coalesce((SELECT string_agg(r.policyname || ' [' || r.op || ' as ' || r.role || '] ' || left(r.governing, 140), '; ') FROM unclassified r WHERE r.tbl = g.t), 'none: every effective policy is recognised')
         FROM (VALUES ('proposals'), ('project_invoices'), ('proposal_files')) AS g(t)
  UNION ALL SELECT 132, 'anonymous users cannot reach proposals or invoices',
         CASE WHEN EXISTS (SELECT 1 FROM polx WHERE role = 'anon' AND applies AND holds AND tbl IN ('proposals', 'project_invoices')) THEN 'FAIL' ELSE 'PASS' END,
         'anon holds no usable privilege behind an applicable policy on these tables'

  -- what a read-only query cannot establish
  UNION ALL SELECT 140, 'PDF / download authorization', 'INFO', 'enforced in the Portal and Admin routes (resolver + ownership), covered by scripts/test-proposals-invoices.cjs; not SQL-verifiable'
  UNION ALL SELECT 141, 'behaviour (approval idempotency, overpayment refusal, immutability in action)', 'INFO', 'proved by proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql (one transaction, always rolled back)'
)
SELECT check_name, verdict, detail FROM (
  SELECT o, check_name, verdict, detail FROM res
  UNION ALL
  SELECT 9999, 'OVERALL', CASE WHEN (SELECT count(*) FROM res WHERE verdict = 'FAIL') = 0 THEN 'PASS' ELSE 'FAIL' END,
         (SELECT count(*) FROM res WHERE verdict = 'FAIL')::text || ' failing check(s), ' || (SELECT count(*) FROM res WHERE verdict = 'REVIEW')::text || ' to review'
) z
ORDER BY o, check_name;
