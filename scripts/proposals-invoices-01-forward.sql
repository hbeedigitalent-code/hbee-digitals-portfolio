-- =============================================================================
-- S6.4 PROPOSALS V2 + INVOICES — FORWARD MIGRATION
-- Run in: Supabase SQL Editor against PRODUCTION (this project is production-only), ONLY after the owner has reviewed it.
-- Prepared for S6.4. NOT YET EXECUTED. Production facts it was written against: docs/s6-4-proposals-invoices.md.
--
-- WHAT THIS DOES
--   A. proposals (existing, 2 rows)   additive columns; legacy services/pricing JSON KEPT; status CHECK widened by
--                                     exactly one value ('declined'); the 2 legacy proposals are backfilled into
--                                     line items + an immutable version snapshot; guards added AFTER the backfill.
--   B. project_invoices (existing, 0 rows)  extended in place (no new invoices table): amount widened to numeric(14,2)
--                                     and kept as THE invoice total; structured columns added around it.
--   C. new tables                     proposal_line_items, proposal_versions, proposal_responses, invoice_line_items,
--                                     invoice_payments, document_counters, s64_constraint_backups.
--   D. new functions (service_role only)  save_proposal_draft, send_proposal, mark_proposal_viewed, approve_proposal,
--                                     request_proposal_changes, decline_proposal, convert_approved_proposal,
--                                     create_invoice, issue_invoice, record_invoice_payment, void_invoice
--                                     + internal helpers (no EXECUTE for anyone): next_document_number,
--                                     s64_create_client_project, s64_event.
--   E. database guards                proposals_immutable_after_decision, project_invoices_guard, line-item guards,
--                                     append-only triggers on versions / payments / responses.
--
-- WHAT IT DOES NOT DO
--   * proposal_requests is untouched (unrelated legacy merchant-request table, 0 rows).
--   * No project is created for the historical approved proposal: it stays approved + converted_to_project_id NULL.
--   * No status = 'converted' is ever written. Conversion is DERIVED: approved AND converted_to_project_id IS NOT NULL.
--   * Browser write grants on proposals / project_invoices are NOT revoked here (the deployed admin pages still write
--     from the browser until the new code ships). They are revoked by proposals-invoices-05-...-AFTER-DEPLOY.sql.
--   * No data is deleted. Historical JSON is not rewritten.
--
-- ABORT BEHAVIOUR: every assumption is a RAISE EXCEPTION inside this single transaction; any failure rolls back everything.
-- Rollback: proposals-invoices-02-rollback.sql.  Verify: proposals-invoices-03-verify-readonly.sql.
-- =============================================================================

BEGIN;

LOCK TABLE public.proposals, public.project_invoices IN SHARE ROW EXCLUSIVE MODE;

-- -----------------------------------------------------------------------------
-- 0. Assertions
-- -----------------------------------------------------------------------------
DO $$
DECLARE v_found text; v_n bigint;
BEGIN
  -- the S6.3 objects this migration builds on
  IF to_regclass('public.activity_events') IS NULL THEN RAISE EXCEPTION 'Abort: public.activity_events (S6.3) is missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'activity_events_dedupe_uidx') THEN
    RAISE EXCEPTION 'Abort: activity_events_dedupe_uidx (S6.3) is missing';
  END IF;

  SELECT string_agg(t || '.' || c, ', ') INTO v_found
  FROM (VALUES ('proposals','id'), ('proposals','proposal_number'), ('proposals','merchant_id'), ('proposals','client_id'), ('proposals','title'),
               ('proposals','status'), ('proposals','services'), ('proposals','pricing'), ('proposals','timeline'), ('proposals','terms'),
               ('proposals','notes'), ('proposals','expires_at'), ('proposals','sent_at'), ('proposals','accepted_at'), ('proposals','created_at'),
               ('proposals','updated_at'), ('proposals','created_by'), ('proposals','converted_to_project_id'),
               ('project_invoices','id'), ('project_invoices','invoice_number'), ('project_invoices','project_id'), ('project_invoices','amount'),
               ('project_invoices','currency'), ('project_invoices','status'), ('project_invoices','due_date'), ('project_invoices','payment_link'),
               ('project_invoices','created_at')) AS v(t, c)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns x WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: expected column(s) missing: %', v_found; END IF;

  -- columns this migration adds must be free
  SELECT string_agg(t || '.' || c, ', ') INTO v_found
  FROM (VALUES ('proposals','currency'), ('proposals','summary'), ('proposals','scope'), ('proposals','deliverables'), ('proposals','subtotal'),
               ('proposals','discount_amount'), ('proposals','total'), ('proposals','issue_date'), ('proposals','version'), ('proposals','revision_note'),
               ('proposals','declined_at'), ('proposals','approved_version'), ('proposals','approved_by'),
               ('project_invoices','proposal_id'), ('project_invoices','subtotal'), ('project_invoices','discount_amount'), ('project_invoices','tax_amount'),
               ('project_invoices','issue_date'), ('project_invoices','notes'), ('project_invoices','payment_instructions'), ('project_invoices','issued_at'),
               ('project_invoices','paid_at'), ('project_invoices','voided_at'), ('project_invoices','updated_at'), ('project_invoices','created_by')) AS v(t, c)
  WHERE EXISTS (SELECT 1 FROM information_schema.columns x WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: column(s) already present: %', v_found; END IF;

  SELECT string_agg(c.relname::text || ':' || c.relkind::text, ', ') INTO v_found
  FROM pg_class c WHERE c.relnamespace = 'public'::regnamespace
   AND c.relname IN ('proposal_line_items','proposal_versions','proposal_responses','invoice_line_items','invoice_payments','document_counters','s64_constraint_backups');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: relation(s) already exist: %', v_found; END IF;

  SELECT string_agg(p.proname::text, ', ') INTO v_found
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace
   AND p.proname IN ('save_proposal_draft','send_proposal','mark_proposal_viewed','approve_proposal','request_proposal_changes','decline_proposal',
                     'convert_approved_proposal','create_invoice','issue_invoice','record_invoice_payment','void_invoice','next_document_number',
                     's64_create_client_project','s64_event','s64_append_only','proposals_immutable_after_decision','project_invoices_guard',
                     's64_line_items_guard','s64_invoice_lines_guard','s64_invoice_lines_touch','s64_payments_guard','s64_responses_guard','s64_versions_guard');
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: function(s) already exist: %', v_found; END IF;

  -- project_invoices has 0 rows (production) and nothing else may depend on its old shape
  SELECT count(*) INTO v_n FROM public.project_invoices;
  IF v_n <> 0 THEN RAISE EXCEPTION 'Abort: project_invoices holds % row(s); this migration restructures it only while empty', v_n; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'project_invoices' AND column_name = 'amount' AND data_type = 'numeric') THEN
    RAISE EXCEPTION 'Abort: project_invoices.amount is not numeric';
  END IF;

  -- proposals.converted_to_project_id: uuid with a foreign key to projects(id) (production)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint k WHERE k.conrelid = 'public.proposals'::regclass AND k.contype::text = 'f'
                   AND k.confrelid = 'public.projects'::regclass
                   AND (SELECT a.attnum FROM pg_attribute a WHERE a.attrelid = 'public.proposals'::regclass AND a.attname = 'converted_to_project_id' AND NOT a.attisdropped) = ANY (k.conkey)) THEN
    RAISE EXCEPTION 'Abort: proposals.converted_to_project_id has no foreign key to projects(id)';
  END IF;

  -- existing admin_users / clients / projects shapes the functions rely on
  SELECT string_agg(t || '.' || c, ', ') INTO v_found
  FROM (VALUES ('clients','id'), ('clients','merchant_id'), ('clients','status'), ('merchants','id'), ('projects','id'), ('projects','client_id'),
               ('projects','project_id'), ('projects','title'), ('projects','project_name'), ('projects','status'), ('projects','progress'),
               ('projects','description'), ('projects','service_selected'), ('projects','start_date'),
               ('activity_events','client_id'), ('activity_events','project_id'), ('activity_events','actor_user_id'), ('activity_events','actor_role'),
               ('activity_events','entity_type'), ('activity_events','entity_id'), ('activity_events','action'), ('activity_events','summary'),
               ('activity_events','metadata'), ('activity_events','visibility'), ('activity_events','dedupe_key')) AS v(t, c)
  WHERE NOT EXISTS (SELECT 1 FROM information_schema.columns x WHERE x.table_schema = 'public' AND x.table_name = v.t AND x.column_name = v.c);
  IF v_found IS NOT NULL THEN RAISE EXCEPTION 'Abort: expected column(s) missing: %', v_found; END IF;

  -- projects.status must admit what create_client_project writes
  -- judged by MEANING: the string literals the CHECK admits (whatever parentheses / casts the catalog prints around them)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint c
                  WHERE c.conrelid = 'public.projects'::regclass AND c.contype::text = 'c' AND c.conname = 'projects_status_check'
                    AND 'Pending Review' = ANY (ARRAY(SELECT m[1] FROM regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') AS m))) THEN
    RAISE EXCEPTION 'Abort: projects_status_check is missing or does not allow ''Pending Review''';
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. Backup table for constraints this migration rewrites (so the rollback restores the ORIGINALS verbatim)
-- -----------------------------------------------------------------------------
CREATE TABLE public.s64_constraint_backups (
  id          bigserial PRIMARY KEY,
  table_name  text NOT NULL,
  conname     text NOT NULL,
  definition  text NOT NULL,   -- a complete ALTER TABLE ... ADD CONSTRAINT ... statement
  captured_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.s64_constraint_backups ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.s64_constraint_backups FROM PUBLIC, anon, authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 2. proposals: status CHECK widened by exactly one value, then additive columns
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r record; v_attnum smallint; v_n int := 0; v_lits text[];
  -- the EXACT vocabulary production admits today (proven by the preflight); the migration adds 'declined' and nothing else
  v_expected text[] := ARRAY['draft','sent','viewed','accepted','rejected','expired','converted','approved','changes_requested'];
  v_new text[]; v_bad text;
BEGIN
  SELECT a.attnum INTO v_attnum FROM pg_attribute a WHERE a.attrelid = 'public.proposals'::regclass AND a.attname = 'status' AND NOT a.attisdropped;
  IF v_attnum IS NULL THEN RAISE EXCEPTION 'Abort: public.proposals has no status column'; END IF;

  -- The CHECK is identified by what it CONSTRAINS (it references the status column) and judged by what it ADMITS (its string
  -- literals). Nothing here depends on how PostgreSQL happens to print it: parentheses, (status)::text, ::character varying
  -- casts on the literals or ::text[] on the array are all irrelevant.
  FOR r IN SELECT c.oid AS coid, c.conname::text AS name, pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
           WHERE c.conrelid = 'public.proposals'::regclass AND c.contype::text = 'c' AND v_attnum = ANY (c.conkey)
  LOOP
    v_n := v_n + 1;
    v_lits := ARRAY(SELECT DISTINCT m[1] FROM regexp_matches(r.def, '''([^'']+)''', 'g') AS m ORDER BY 1);
    IF NOT (v_lits @> v_expected AND v_lits <@ v_expected) THEN
      RAISE EXCEPTION 'Abort: the proposals status CHECK % admits {%} but this migration only knows {%}. Definition: %',
        r.name, array_to_string(v_lits, ', '), array_to_string(ARRAY(SELECT x FROM unnest(v_expected) AS x ORDER BY 1), ', '), r.def;
    END IF;
    -- the original, complete and verbatim, for the rollback
    INSERT INTO public.s64_constraint_backups (table_name, conname, definition)
    VALUES ('proposals', r.name, 'ALTER TABLE public.proposals ADD CONSTRAINT ' || quote_ident(r.name) || ' ' || r.def);
    EXECUTE format('ALTER TABLE public.proposals DROP CONSTRAINT %I', r.name);
    v_new := v_expected || ARRAY['declined'];
    EXECUTE format('ALTER TABLE public.proposals ADD CONSTRAINT %I CHECK (status = ANY (ARRAY[%s]))', r.name,
                   (SELECT string_agg(quote_literal(x), ', ' ORDER BY x) FROM unnest(v_new) AS x));
  END LOOP;
  IF v_n <> 1 THEN RAISE EXCEPTION 'Abort: expected exactly one CHECK constraint on proposals.status, found %', v_n; END IF;

  -- proof by meaning: the rebuilt CHECK admits exactly the original nine plus 'declined', and no existing row is outside it
  SELECT array_agg(DISTINCT m[1]) INTO v_lits FROM pg_constraint c, regexp_matches(pg_get_constraintdef(c.oid), '''([^'']+)''', 'g') AS m
   WHERE c.conrelid = 'public.proposals'::regclass AND c.contype::text = 'c' AND v_attnum = ANY (c.conkey);
  IF NOT (v_lits @> v_new AND v_lits <@ v_new) THEN RAISE EXCEPTION 'Abort: the rebuilt proposals status CHECK admits {%}', array_to_string(v_lits, ', '); END IF;
  SELECT string_agg(DISTINCT p.status::text, ', ') INTO v_bad FROM public.proposals p WHERE p.status IS NOT NULL AND p.status::text <> ALL (v_new);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Abort: existing proposal status value(s) not admitted by the rebuilt CHECK: %', v_bad; END IF;
END $$;

ALTER TABLE public.proposals ADD COLUMN currency        text NOT NULL DEFAULT 'USD' CONSTRAINT proposals_currency_check CHECK (currency IN ('USD','NGN','GBP','EUR'));
ALTER TABLE public.proposals ADD COLUMN summary         text;
ALTER TABLE public.proposals ADD COLUMN scope           text;
ALTER TABLE public.proposals ADD COLUMN deliverables    text;
ALTER TABLE public.proposals ADD COLUMN subtotal        numeric(14,2) CONSTRAINT proposals_subtotal_check CHECK (subtotal IS NULL OR subtotal >= 0);
ALTER TABLE public.proposals ADD COLUMN discount_amount numeric(14,2) NOT NULL DEFAULT 0 CONSTRAINT proposals_discount_check CHECK (discount_amount >= 0);
ALTER TABLE public.proposals ADD COLUMN total           numeric(14,2) CONSTRAINT proposals_total_check CHECK (total IS NULL OR total >= 0);
ALTER TABLE public.proposals ADD COLUMN issue_date      date;
ALTER TABLE public.proposals ADD COLUMN version         integer NOT NULL DEFAULT 1 CONSTRAINT proposals_version_check CHECK (version >= 1);
ALTER TABLE public.proposals ADD COLUMN revision_note   text;
ALTER TABLE public.proposals ADD COLUMN declined_at     timestamptz;
ALTER TABLE public.proposals ADD COLUMN approved_version integer;
ALTER TABLE public.proposals ADD COLUMN approved_by     uuid;
ALTER TABLE public.proposals ADD CONSTRAINT proposals_money_consistent_check
  CHECK (subtotal IS NULL OR total IS NULL OR total = subtotal - discount_amount);
CREATE UNIQUE INDEX proposals_number_uidx ON public.proposals (proposal_number) WHERE proposal_number IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. New tables (server-only: RLS on, NO policies, no browser privilege)
-- -----------------------------------------------------------------------------
CREATE TABLE public.proposal_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid NOT NULL REFERENCES public.proposals(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  title       text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  quantity    numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  -- the database, not JavaScript, is authoritative for money: quantity x unit price, rounded to cents
  amount      numeric(14,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX proposal_line_items_proposal_idx ON public.proposal_line_items (proposal_id, sort_order);

CREATE TABLE public.proposal_versions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id     uuid NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  version_number  integer NOT NULL CHECK (version_number >= 1),
  title           text NOT NULL,
  summary         text,
  scope           text,
  deliverables    text,
  timeline        text,
  terms           text,
  -- payment terms AS THE CLIENT SAW THEM at this version (the version, not the legacy pricing JSON, is authoritative)
  payment_terms   text NOT NULL DEFAULT '' CHECK (char_length(payment_terms) <= 2000),
  currency        text NOT NULL CHECK (currency IN ('USD','NGN','GBP','EUR')),
  subtotal        numeric(14,2) NOT NULL CHECK (subtotal >= 0),
  discount_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  total           numeric(14,2) NOT NULL CHECK (total >= 0),
  expires_at      timestamptz,
  issue_date      date,
  -- Option B: the line items AS THE CLIENT SAW THEM, serialized. An approved version never depends on mutable rows.
  line_items      jsonb NOT NULL CHECK (jsonb_typeof(line_items) = 'array'),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  sent_at         timestamptz,
  UNIQUE (proposal_id, version_number),
  CONSTRAINT proposal_versions_money_check CHECK (total = subtotal - discount_amount)
);
-- a proposal can only be approved at a version that exists
ALTER TABLE public.proposals ADD CONSTRAINT proposals_approved_version_fkey
  FOREIGN KEY (id, approved_version) REFERENCES public.proposal_versions (proposal_id, version_number);

CREATE TABLE public.proposal_responses (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id         uuid NOT NULL REFERENCES public.proposals(id) ON DELETE RESTRICT,
  version_number      integer NOT NULL,
  response_type       text NOT NULL CHECK (response_type IN ('changes_requested','declined')),
  message             text CHECK (message IS NULL OR char_length(message) <= 2000),
  client_id           uuid NOT NULL,
  created_by          uuid,
  idempotency_key     text CHECK (idempotency_key IS NULL OR char_length(idempotency_key) BETWEEN 8 AND 80),
  created_at          timestamptz NOT NULL DEFAULT now(),
  resolved_at         timestamptz,
  resolved_in_version integer,
  CONSTRAINT proposal_responses_version_fkey FOREIGN KEY (proposal_id, version_number) REFERENCES public.proposal_versions (proposal_id, version_number),
  CONSTRAINT proposal_responses_changes_need_reason CHECK (response_type <> 'changes_requested' OR (message IS NOT NULL AND char_length(btrim(message)) >= 1))
);
CREATE INDEX proposal_responses_proposal_idx ON public.proposal_responses (proposal_id, created_at);
CREATE UNIQUE INDEX proposal_responses_key_uidx ON public.proposal_responses (proposal_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE TABLE public.document_counters (
  kind       text    NOT NULL CHECK (kind IN ('invoice')),
  year       integer NOT NULL CHECK (year BETWEEN 2000 AND 9999),
  last_value integer NOT NULL CHECK (last_value >= 1),
  PRIMARY KEY (kind, year)
);

CREATE TABLE public.invoice_line_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid NOT NULL REFERENCES public.project_invoices(id) ON DELETE CASCADE,
  sort_order  integer NOT NULL DEFAULT 0,
  title       text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  description text CHECK (description IS NULL OR char_length(description) <= 2000),
  quantity    numeric(12,3) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price  numeric(14,2) NOT NULL CHECK (unit_price >= 0),
  line_amount numeric(14,2) GENERATED ALWAYS AS (round(quantity * unit_price, 2)) STORED,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_line_items_invoice_idx ON public.invoice_line_items (invoice_id, sort_order);

-- -----------------------------------------------------------------------------
-- 4. project_invoices: extended IN PLACE (0 rows). `amount` stays THE invoice total.
-- -----------------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  -- the old status / currency / amount CHECKs (production vocabulary: unknown, no writer ever existed) are saved, then replaced
  FOR r IN SELECT c.conname::text AS name, pg_get_constraintdef(c.oid) AS def FROM pg_constraint c
           WHERE c.conrelid = 'public.project_invoices'::regclass AND c.contype::text = 'c'
             AND pg_get_constraintdef(c.oid) ~ '\m(status|currency)\M'
  LOOP
    INSERT INTO public.s64_constraint_backups (table_name, conname, definition)
    VALUES ('project_invoices', r.name, 'ALTER TABLE public.project_invoices ADD CONSTRAINT ' || quote_ident(r.name) || ' ' || r.def);
    EXECUTE format('ALTER TABLE public.project_invoices DROP CONSTRAINT %I', r.name);
  END LOOP;
END $$;

-- remember how amount / status looked, one restoring statement per fact, so the rollback can put them back exactly
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT column_name::text AS col, is_nullable, column_default, data_type, numeric_precision, numeric_scale
           FROM information_schema.columns
           WHERE table_schema = 'public' AND table_name = 'project_invoices' AND column_name IN ('amount', 'status') LOOP
    INSERT INTO public.s64_constraint_backups (table_name, conname, definition) VALUES
      ('project_invoices', 'column:' || r.col || ':default',
       'ALTER TABLE public.project_invoices ALTER COLUMN ' || quote_ident(r.col) ||
       CASE WHEN r.column_default IS NULL THEN ' DROP DEFAULT' ELSE ' SET DEFAULT ' || r.column_default END),
      ('project_invoices', 'column:' || r.col || ':nullability',
       'ALTER TABLE public.project_invoices ALTER COLUMN ' || quote_ident(r.col) || CASE WHEN r.is_nullable = 'NO' THEN ' SET NOT NULL' ELSE ' DROP NOT NULL' END);
    IF r.col = 'amount' THEN
      INSERT INTO public.s64_constraint_backups (table_name, conname, definition)
      VALUES ('project_invoices', 'column:amount:type',
              'ALTER TABLE public.project_invoices ALTER COLUMN amount TYPE numeric(' || coalesce(r.numeric_precision::text, '10') || ',' || coalesce(r.numeric_scale::text, '2') || ')');
    END IF;
  END LOOP;
END $$;

ALTER TABLE public.project_invoices ALTER COLUMN amount TYPE numeric(14,2);
ALTER TABLE public.project_invoices ALTER COLUMN amount SET DEFAULT 0;
ALTER TABLE public.project_invoices ALTER COLUMN amount SET NOT NULL;
ALTER TABLE public.project_invoices ALTER COLUMN status SET DEFAULT 'draft';

ALTER TABLE public.project_invoices ADD COLUMN proposal_id          uuid REFERENCES public.proposals(id) ON DELETE RESTRICT;
ALTER TABLE public.project_invoices ADD COLUMN subtotal             numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.project_invoices ADD COLUMN discount_amount      numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.project_invoices ADD COLUMN tax_amount           numeric(14,2) NOT NULL DEFAULT 0;
ALTER TABLE public.project_invoices ADD COLUMN issue_date           date;
ALTER TABLE public.project_invoices ADD COLUMN notes                text;
ALTER TABLE public.project_invoices ADD COLUMN payment_instructions text;
ALTER TABLE public.project_invoices ADD COLUMN issued_at            timestamptz;
ALTER TABLE public.project_invoices ADD COLUMN paid_at              timestamptz;
ALTER TABLE public.project_invoices ADD COLUMN voided_at            timestamptz;
ALTER TABLE public.project_invoices ADD COLUMN updated_at           timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.project_invoices ADD COLUMN created_by           uuid;

ALTER TABLE public.project_invoices ADD CONSTRAINT project_invoices_status_check   CHECK (status IN ('draft','issued','partially_paid','paid','void'));
ALTER TABLE public.project_invoices ADD CONSTRAINT project_invoices_currency_check CHECK (currency IN ('USD','NGN','GBP','EUR'));
ALTER TABLE public.project_invoices ADD CONSTRAINT project_invoices_money_check
  CHECK (subtotal >= 0 AND discount_amount >= 0 AND tax_amount >= 0 AND discount_amount <= subtotal AND amount >= 0
         AND amount = subtotal - discount_amount + tax_amount);
CREATE UNIQUE INDEX project_invoices_number_uidx ON public.project_invoices (invoice_number) WHERE invoice_number IS NOT NULL;
-- one LIVE invoice per proposal: a retry or a double click cannot bill the same proposal twice
CREATE UNIQUE INDEX project_invoices_one_live_per_proposal_uidx ON public.project_invoices (proposal_id) WHERE proposal_id IS NOT NULL AND status <> 'void';
CREATE INDEX project_invoices_project_idx ON public.project_invoices (project_id);

CREATE TABLE public.invoice_payments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      uuid NOT NULL REFERENCES public.project_invoices(id) ON DELETE RESTRICT,
  amount          numeric(14,2) NOT NULL CHECK (amount > 0),
  paid_at         date NOT NULL,
  method          text CHECK (method IS NULL OR char_length(method) <= 60),
  reference       text CHECK (reference IS NULL OR char_length(reference) <= 120),
  note            text CHECK (note IS NULL OR char_length(note) <= 1000),
  idempotency_key text CHECK (idempotency_key IS NULL OR char_length(idempotency_key) BETWEEN 8 AND 80),
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX invoice_payments_invoice_idx ON public.invoice_payments (invoice_id, created_at);
CREATE UNIQUE INDEX invoice_payments_key_uidx ON public.invoice_payments (invoice_id, idempotency_key) WHERE idempotency_key IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 5. Deterministic legacy backfill (BEFORE the guards exist). Aborts rather than inventing a value.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  p record; e record; v_sub numeric(14,2); v_pt numeric; v_cur text; v_n int; v_lines jsonb;
BEGIN
  FOR p IN SELECT * FROM public.proposals ORDER BY created_at, id LOOP
    -- services: null / absent = no lines; otherwise it must be an array of objects with a name and a plain-decimal price
    IF to_jsonb(p) -> 'services' IS NOT NULL AND jsonb_typeof(to_jsonb(p) -> 'services') NOT IN ('array', 'null') THEN
      RAISE EXCEPTION 'Abort: proposal % has a services value that is not an array', p.id;
    END IF;
    v_sub := 0; v_n := 0;
    FOR e IN SELECT x.value AS el, x.ordinality AS ord
             FROM jsonb_array_elements(CASE WHEN jsonb_typeof(to_jsonb(p) -> 'services') = 'array' THEN to_jsonb(p) -> 'services' ELSE '[]'::jsonb END)
                  WITH ORDINALITY AS x(value, ordinality)
    LOOP
      IF jsonb_typeof(e.el) <> 'object' OR btrim(coalesce(e.el ->> 'name', '')) = '' OR coalesce(e.el ->> 'price', '') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' THEN
        RAISE EXCEPTION 'Abort: proposal % service #% is not convertible deterministically (needs a name and a plain decimal price)', p.id, e.ord;
      END IF;
      INSERT INTO public.proposal_line_items (proposal_id, sort_order, title, description, quantity, unit_price)
      VALUES (p.id, e.ord::int, left(btrim(e.el ->> 'name'), 200), nullif(left(btrim(coalesce(e.el ->> 'description', '')), 2000), ''), 1, (e.el ->> 'price')::numeric);
      v_sub := v_sub + (e.el ->> 'price')::numeric;
      v_n := v_n + 1;
    END LOOP;

    -- the stored total (when present) must equal the sum of the prices: it is never "corrected" silently
    v_pt := NULL;
    IF coalesce(to_jsonb(p) -> 'pricing' ->> 'total', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN v_pt := (to_jsonb(p) -> 'pricing' ->> 'total')::numeric; END IF;
    IF v_pt IS NOT NULL AND abs(v_pt - v_sub) > 0.005 THEN
      RAISE EXCEPTION 'Abort: proposal % stored total % differs from the sum of its service prices %', p.id, v_pt, v_sub;
    END IF;

    v_cur := coalesce(nullif(btrim(to_jsonb(p) -> 'pricing' ->> 'currency'), ''), 'USD');
    IF v_cur NOT IN ('USD','NGN','GBP','EUR') THEN RAISE EXCEPTION 'Abort: proposal % has unsupported currency %', p.id, v_cur; END IF;

    UPDATE public.proposals
       SET currency = v_cur, subtotal = v_sub, discount_amount = 0, total = v_sub, version = 1,
           issue_date = coalesce(sent_at, created_at)::date,
           approved_version = NULL
     WHERE id = p.id;

    -- every proposal that was ever delivered gets its immutable version 1 (exactly what the client could see)
    IF p.status <> 'draft' THEN
      SELECT coalesce(jsonb_agg(jsonb_build_object('title', l.title, 'description', l.description, 'quantity', l.quantity::text,
                                                    'unit_price', l.unit_price::text, 'amount', l.amount::text) ORDER BY l.sort_order, l.id), '[]'::jsonb)
        INTO v_lines FROM public.proposal_line_items l WHERE l.proposal_id = p.id;
      INSERT INTO public.proposal_versions (proposal_id, version_number, title, timeline, terms, payment_terms, currency, subtotal, discount_amount, total,
                                            expires_at, issue_date, line_items, created_by, created_at, sent_at)
      -- payment_terms: deterministic backfill from the legacy pricing JSON (which is preserved untouched); '' when it never had any
      VALUES (p.id, 1, p.title, p.timeline, p.terms, coalesce(btrim(to_jsonb(p) -> 'pricing' ->> 'payment_terms'), ''), v_cur, v_sub, 0, v_sub, p.expires_at::timestamptz, coalesce(p.sent_at, p.created_at)::date,
              v_lines, p.created_by, coalesce(p.sent_at, p.created_at), p.sent_at);
      IF p.status IN ('approved', 'converted') THEN
        -- historical approval: preserve it. accepted_at is untouched; approved_by stays NULL (the approver was not recorded);
        -- converted_to_project_id is NOT touched — no operational conversion is invented.
        UPDATE public.proposals SET approved_version = 1 WHERE id = p.id;
      END IF;
    END IF;
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Generic append-only guard, then the table-specific guards (created AFTER the backfill)
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.s64_append_only() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  RAISE EXCEPTION '% is append-only (% refused)', TG_TABLE_NAME, TG_OP USING ERRCODE = '42501';
END $$;

CREATE TRIGGER proposal_versions_no_update BEFORE UPDATE OR DELETE ON public.proposal_versions FOR EACH ROW EXECUTE FUNCTION public.s64_append_only();
CREATE TRIGGER proposal_versions_no_truncate BEFORE TRUNCATE ON public.proposal_versions FOR EACH STATEMENT EXECUTE FUNCTION public.s64_append_only();
CREATE TRIGGER invoice_payments_no_update BEFORE UPDATE OR DELETE ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.s64_append_only();
CREATE TRIGGER invoice_payments_no_truncate BEFORE TRUNCATE ON public.invoice_payments FOR EACH STATEMENT EXECUTE FUNCTION public.s64_append_only();
CREATE TRIGGER proposal_responses_no_delete BEFORE DELETE ON public.proposal_responses FOR EACH ROW EXECUTE FUNCTION public.s64_append_only();
CREATE TRIGGER proposal_responses_no_truncate BEFORE TRUNCATE ON public.proposal_responses FOR EACH STATEMENT EXECUTE FUNCTION public.s64_append_only();

-- proposal_responses may only be RESOLVED (resolved_at / resolved_in_version, once); nothing else changes
CREATE FUNCTION public.s64_responses_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  IF (NEW.id, NEW.proposal_id, NEW.version_number, NEW.response_type, NEW.message, NEW.client_id, NEW.created_by, NEW.idempotency_key, NEW.created_at)
     IS DISTINCT FROM (OLD.id, OLD.proposal_id, OLD.version_number, OLD.response_type, OLD.message, OLD.client_id, OLD.created_by, OLD.idempotency_key, OLD.created_at) THEN
    RAISE EXCEPTION 'proposal_responses rows are immutable (only resolution may be recorded)' USING ERRCODE = '42501';
  END IF;
  IF OLD.resolved_at IS NOT NULL AND (NEW.resolved_at IS DISTINCT FROM OLD.resolved_at OR NEW.resolved_in_version IS DISTINCT FROM OLD.resolved_in_version) THEN
    RAISE EXCEPTION 'a resolved response cannot be re-resolved' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposal_responses_guard BEFORE UPDATE ON public.proposal_responses FOR EACH ROW EXECUTE FUNCTION public.s64_responses_guard();

-- proposals: legal status transitions + frozen commercial values once the client can see or has decided on them
CREATE FUNCTION public.proposals_immutable_after_decision() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_ok boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'a proposal that has been sent cannot be deleted' USING ERRCODE = '55000'; END IF;
    RETURN OLD;
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    v_ok := CASE OLD.status
      WHEN 'draft'             THEN NEW.status IN ('sent')
      WHEN 'sent'              THEN NEW.status IN ('viewed','approved','changes_requested','declined','expired')
      WHEN 'viewed'            THEN NEW.status IN ('approved','changes_requested','declined','expired')
      WHEN 'changes_requested' THEN NEW.status IN ('sent')
      ELSE false END;
    IF NOT coalesce(v_ok, false) THEN
      RAISE EXCEPTION 'illegal proposal status transition % -> %', OLD.status, NEW.status USING ERRCODE = '55000';
    END IF;
  END IF;

  IF OLD.status NOT IN ('draft', 'changes_requested') THEN
    -- the client can see (or has decided on) these values: nothing commercial may move
    IF NEW.title IS DISTINCT FROM OLD.title OR NEW.summary IS DISTINCT FROM OLD.summary OR NEW.scope IS DISTINCT FROM OLD.scope
       OR NEW.deliverables IS DISTINCT FROM OLD.deliverables OR NEW.timeline IS DISTINCT FROM OLD.timeline OR NEW.terms IS DISTINCT FROM OLD.terms
       OR NEW.currency IS DISTINCT FROM OLD.currency OR NEW.subtotal IS DISTINCT FROM OLD.subtotal OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount
       OR NEW.total IS DISTINCT FROM OLD.total OR NEW.expires_at IS DISTINCT FROM OLD.expires_at OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
       OR NEW.version IS DISTINCT FROM OLD.version OR NEW.client_id IS DISTINCT FROM OLD.client_id OR NEW.merchant_id IS DISTINCT FROM OLD.merchant_id
       OR NEW.proposal_number IS DISTINCT FROM OLD.proposal_number OR NEW.sent_at IS DISTINCT FROM OLD.sent_at
       OR NEW.services::text IS DISTINCT FROM OLD.services::text OR NEW.pricing::text IS DISTINCT FROM OLD.pricing::text THEN
      RAISE EXCEPTION 'the commercial terms of a % proposal cannot be changed', OLD.status USING ERRCODE = '55000';
    END IF;
  ELSE
    IF NEW.version < OLD.version THEN RAISE EXCEPTION 'a proposal version number cannot decrease' USING ERRCODE = '55000'; END IF;
  END IF;

  -- the decision fields move only with the decision itself
  IF (NEW.accepted_at, NEW.approved_version, NEW.approved_by) IS DISTINCT FROM (OLD.accepted_at, OLD.approved_version, OLD.approved_by)
     AND NOT (OLD.status IN ('sent', 'viewed') AND NEW.status = 'approved') THEN
    RAISE EXCEPTION 'the approval record can only be written by the approval itself' USING ERRCODE = '55000';
  END IF;
  IF NEW.declined_at IS DISTINCT FROM OLD.declined_at AND NOT (OLD.status IN ('sent', 'viewed') AND NEW.status = 'declined') THEN
    RAISE EXCEPTION 'declined_at can only be written by the decline itself' USING ERRCODE = '55000';
  END IF;
  -- conversion: a project may be attached to an APPROVED proposal, once, and never moved
  IF NEW.converted_to_project_id IS DISTINCT FROM OLD.converted_to_project_id THEN
    IF OLD.converted_to_project_id IS NOT NULL THEN
      RAISE EXCEPTION 'a proposal that is already linked to a project cannot be re-linked' USING ERRCODE = '55000';
    END IF;
    IF NEW.status <> 'approved' THEN
      RAISE EXCEPTION 'only an approved proposal can be linked to a project' USING ERRCODE = '55000';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER proposals_immutable_after_decision BEFORE UPDATE OR DELETE ON public.proposals FOR EACH ROW EXECUTE FUNCTION public.proposals_immutable_after_decision();

-- proposal line items: editable only while the proposal is a draft / under revision
CREATE FUNCTION public.s64_line_items_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.proposal_id IS DISTINCT FROM OLD.proposal_id THEN
    RAISE EXCEPTION 'a line item cannot be moved to another proposal' USING ERRCODE = '55000';
  END IF;
  SELECT status INTO v_status FROM public.proposals WHERE id = coalesce(NEW.proposal_id, OLD.proposal_id);
  IF FOUND AND v_status NOT IN ('draft', 'changes_requested') THEN
    RAISE EXCEPTION 'the line items of a % proposal cannot be changed', v_status USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER proposal_line_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.proposal_line_items FOR EACH ROW EXECUTE FUNCTION public.s64_line_items_guard();

-- invoices: derived totals while draft, frozen once issued, legal transitions, no deleting a financial record
CREATE FUNCTION public.project_invoices_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_sub numeric(14,2); v_ok boolean; v_lines int;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'an issued invoice cannot be deleted (void it instead)' USING ERRCODE = '55000'; END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'draft' THEN RAISE EXCEPTION 'a new invoice must start as a draft' USING ERRCODE = '55000'; END IF;
  ELSIF OLD.status <> 'draft' THEN
    -- issued / paid / void: the financial record is frozen
    IF NEW.project_id IS DISTINCT FROM OLD.project_id OR NEW.proposal_id IS DISTINCT FROM OLD.proposal_id
       OR NEW.invoice_number IS DISTINCT FROM OLD.invoice_number OR NEW.currency IS DISTINCT FROM OLD.currency
       OR NEW.amount IS DISTINCT FROM OLD.amount OR NEW.subtotal IS DISTINCT FROM OLD.subtotal
       OR NEW.discount_amount IS DISTINCT FROM OLD.discount_amount OR NEW.tax_amount IS DISTINCT FROM OLD.tax_amount
       OR NEW.issue_date IS DISTINCT FROM OLD.issue_date OR NEW.due_date IS DISTINCT FROM OLD.due_date
       OR NEW.issued_at IS DISTINCT FROM OLD.issued_at OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'the financial fields of an % invoice cannot be changed', OLD.status USING ERRCODE = '55000';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      v_ok := CASE OLD.status
        WHEN 'issued'         THEN NEW.status IN ('partially_paid', 'paid', 'void')
        WHEN 'partially_paid' THEN NEW.status IN ('paid')
        ELSE false END;
      IF NOT coalesce(v_ok, false) THEN RAISE EXCEPTION 'illegal invoice status transition % -> %', OLD.status, NEW.status USING ERRCODE = '55000'; END IF;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  ELSE
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status NOT IN ('issued', 'void') THEN
      RAISE EXCEPTION 'illegal invoice status transition % -> %', OLD.status, NEW.status USING ERRCODE = '55000';
    END IF;
  END IF;

  -- draft: the database derives the figures from the line items
  SELECT coalesce(sum(line_amount), 0), count(*) INTO v_sub, v_lines FROM public.invoice_line_items WHERE invoice_id = NEW.id;
  NEW.subtotal := v_sub;
  IF NEW.discount_amount > v_sub THEN RAISE EXCEPTION 'the discount cannot exceed the subtotal' USING ERRCODE = '23514'; END IF;
  NEW.amount := NEW.subtotal - NEW.discount_amount + NEW.tax_amount;
  NEW.updated_at := now();

  IF TG_OP = 'UPDATE' AND NEW.status = 'issued' AND OLD.status = 'draft' THEN
    IF v_lines < 1 OR NEW.amount <= 0 OR NEW.invoice_number IS NULL OR NEW.due_date IS NULL OR NEW.issued_at IS NULL OR NEW.issue_date IS NULL THEN
      RAISE EXCEPTION 'an invoice needs line items, a positive total, a number, an issue date and a due date before it is issued' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER project_invoices_guard BEFORE INSERT OR UPDATE OR DELETE ON public.project_invoices FOR EACH ROW EXECUTE FUNCTION public.project_invoices_guard();

CREATE FUNCTION public.s64_invoice_lines_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_status text;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
    RAISE EXCEPTION 'a line item cannot be moved to another invoice' USING ERRCODE = '55000';
  END IF;
  SELECT status INTO v_status FROM public.project_invoices WHERE id = coalesce(NEW.invoice_id, OLD.invoice_id);
  IF FOUND AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'the line items of an % invoice cannot be changed', v_status USING ERRCODE = '55000';
  END IF;
  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END $$;
CREATE TRIGGER invoice_line_items_guard BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.s64_invoice_lines_guard();

-- after any line change the draft invoice re-derives its totals (its own BEFORE trigger does the arithmetic)
CREATE FUNCTION public.s64_invoice_lines_touch() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.project_invoices SET updated_at = now() WHERE id = coalesce(NEW.invoice_id, OLD.invoice_id);
  RETURN NULL;
END $$;
CREATE TRIGGER invoice_line_items_touch AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items FOR EACH ROW EXECUTE FUNCTION public.s64_invoice_lines_touch();

-- payments: never against a draft / void / fully paid invoice, never beyond the total (serialised on the invoice row)
CREATE FUNCTION public.s64_payments_guard() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE v_inv public.project_invoices%ROWTYPE; v_paid numeric(14,2);
BEGIN
  SELECT * INTO v_inv FROM public.project_invoices WHERE id = NEW.invoice_id FOR UPDATE;
  IF NOT FOUND OR v_inv.status NOT IN ('issued', 'partially_paid') THEN
    RAISE EXCEPTION 'payments can only be recorded against an issued, unpaid invoice' USING ERRCODE = '55000';
  END IF;
  SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.invoice_payments WHERE invoice_id = NEW.invoice_id;
  IF v_paid + NEW.amount > v_inv.amount THEN
    RAISE EXCEPTION 'overpayment: % already paid + % exceeds the invoice total %', v_paid, NEW.amount, v_inv.amount USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER invoice_payments_guard BEFORE INSERT ON public.invoice_payments FOR EACH ROW EXECUTE FUNCTION public.s64_payments_guard();

-- -----------------------------------------------------------------------------
-- 7. Privileges and RLS: server-only tables
-- -----------------------------------------------------------------------------
ALTER TABLE public.proposal_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_versions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposal_responses  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_counters   ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.proposal_line_items, public.proposal_versions, public.proposal_responses, public.invoice_line_items,
              public.invoice_payments, public.document_counters FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.proposal_line_items, public.invoice_line_items TO service_role;
-- Supabase default privileges give service_role ALL on new tables, and a GRANT never removes one: append-only tables are
-- REVOKEd explicitly so the least privilege is true at the grant layer as well as in the triggers.
GRANT SELECT, INSERT ON public.proposal_versions, public.invoice_payments TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON public.proposal_versions, public.invoice_payments FROM service_role;
GRANT SELECT, INSERT, UPDATE ON public.proposal_responses TO service_role;
REVOKE DELETE, TRUNCATE ON public.proposal_responses FROM service_role;
-- document_counters is touched only by the SECURITY DEFINER numbering function
REVOKE ALL ON public.document_counters FROM service_role;

-- -----------------------------------------------------------------------------
-- 8. Internal helpers (NO execute for any role; only the SECURITY DEFINER functions below call them)
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.s64_event(
  p_client uuid, p_project uuid, p_actor uuid, p_role text, p_entity_type text, p_entity uuid,
  p_action text, p_summary text, p_visibility text, p_dedupe text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  INSERT INTO public.activity_events (client_id, project_id, actor_user_id, actor_role, entity_type, entity_id, action, summary, visibility, dedupe_key)
  VALUES (p_client, p_project, p_actor, p_role, p_entity_type, p_entity, p_action, left(p_summary, 300), p_visibility, p_dedupe)
  ON CONFLICT (dedupe_key) WHERE dedupe_key IS NOT NULL DO NOTHING;
END $$;

CREATE FUNCTION public.next_document_number(p_kind text) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_year int := extract(year FROM (now() AT TIME ZONE 'Africa/Lagos'))::int; v_n int;
BEGIN
  IF p_kind <> 'invoice' THEN RAISE EXCEPTION 'unknown document kind %', p_kind; END IF;
  -- the upsert takes a row lock, so concurrent allocations queue and receive consecutive numbers; a rolled-back
  -- transaction returns its number to the counter
  INSERT INTO public.document_counters (kind, year, last_value) VALUES (p_kind, v_year, 1)
  ON CONFLICT (kind, year) DO UPDATE SET last_value = public.document_counters.last_value + 1
  RETURNING last_value INTO v_n;
  RETURN 'HBD-INV-' || v_year::text || '-' || lpad(v_n::text, 4, '0');
END $$;

CREATE FUNCTION public.s64_create_client_project(p_client uuid, p_title text, p_reference text, p_description text, p_service text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_id uuid;
BEGIN
  IF p_client IS NULL THEN RAISE EXCEPTION 'a project can only be created for a client'; END IF;
  IF p_reference IS NULL OR btrim(p_reference) = '' THEN RAISE EXCEPTION 'a project reference is required'; END IF;
  -- a duplicate reference raises unique_violation (23505); the calling function rolls back whole and the route retries
  INSERT INTO public.projects (client_id, project_id, title, project_name, status, progress, description, service_selected, start_date)
  VALUES (p_client, p_reference, p_title, p_title, 'Pending Review', 0, p_description, p_service, now())
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

-- -----------------------------------------------------------------------------
-- 9. Proposal functions
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.save_proposal_draft(
  p_proposal_id uuid, p_merchant_id uuid, p_client_id uuid, p_proposal_number text, p_actor uuid, p_data jsonb
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_p public.proposals%ROWTYPE;
  v_created boolean := false;
  v_title text; v_cur text; v_summary text; v_scope text; v_deliv text; v_timeline text; v_terms text; v_notes text; v_rev text; v_pt text;
  v_disc numeric(14,2); v_exp timestamptz; v_issue date;
  v_sub numeric(14,2); v_total numeric(14,2); v_n int;
  e record;
BEGIN
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'data'); END IF;

  IF p_proposal_id IS NULL THEN
    IF p_merchant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.merchants WHERE id = p_merchant_id) THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'merchant'); END IF;
    IF p_proposal_number IS NULL OR btrim(p_proposal_number) = '' THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'proposal_number'); END IF;
    v_title := btrim(coalesce(p_data ->> 'title', ''));
    IF char_length(v_title) NOT BETWEEN 1 AND 200 THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'title'); END IF;
    v_cur := coalesce(nullif(btrim(p_data ->> 'currency'), ''), 'USD');
    IF v_cur NOT IN ('USD','NGN','GBP','EUR') THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'currency'); END IF;
    INSERT INTO public.proposals (merchant_id, client_id, proposal_number, title, status, services, pricing, currency, version, created_by)
    VALUES (p_merchant_id, p_client_id, btrim(p_proposal_number), v_title, 'draft', '[]'::jsonb,
            jsonb_build_object('total', 0, 'currency', v_cur, 'payment_terms', ''), v_cur, 1, p_actor)
    RETURNING * INTO v_p;
    v_created := true;
  ELSE
    SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
    IF v_p.status NOT IN ('draft', 'changes_requested') THEN RETURN jsonb_build_object('status', 'not_editable', 'current', v_p.status); END IF;
  END IF;

  v_title := v_p.title; v_cur := v_p.currency; v_summary := v_p.summary; v_scope := v_p.scope; v_deliv := v_p.deliverables;
  v_timeline := v_p.timeline; v_terms := v_p.terms; v_notes := v_p.notes; v_rev := v_p.revision_note; v_disc := v_p.discount_amount;
  v_exp := v_p.expires_at::timestamptz; v_issue := v_p.issue_date; v_pt := coalesce(to_jsonb(v_p) -> 'pricing' ->> 'payment_terms', '');

  IF jsonb_exists(p_data, 'title') THEN
    v_title := btrim(coalesce(p_data ->> 'title', ''));
    IF char_length(v_title) NOT BETWEEN 1 AND 200 THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'title'); END IF;
  END IF;
  IF jsonb_exists(p_data, 'currency') THEN
    v_cur := btrim(coalesce(p_data ->> 'currency', ''));
    IF v_cur NOT IN ('USD','NGN','GBP','EUR') THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'currency'); END IF;
  END IF;
  IF jsonb_exists(p_data, 'summary')       THEN v_summary  := nullif(btrim(p_data ->> 'summary'), '');       IF char_length(v_summary)  > 4000  THEN RETURN jsonb_build_object('status','invalid','field','summary');       END IF; END IF;
  IF jsonb_exists(p_data, 'scope')         THEN v_scope    := nullif(btrim(p_data ->> 'scope'), '');         IF char_length(v_scope)    > 20000 THEN RETURN jsonb_build_object('status','invalid','field','scope');         END IF; END IF;
  IF jsonb_exists(p_data, 'deliverables')  THEN v_deliv    := nullif(btrim(p_data ->> 'deliverables'), '');  IF char_length(v_deliv)    > 20000 THEN RETURN jsonb_build_object('status','invalid','field','deliverables');  END IF; END IF;
  IF jsonb_exists(p_data, 'timeline')      THEN v_timeline := nullif(btrim(p_data ->> 'timeline'), '');      IF char_length(v_timeline) > 4000  THEN RETURN jsonb_build_object('status','invalid','field','timeline');      END IF; END IF;
  IF jsonb_exists(p_data, 'terms')         THEN v_terms    := nullif(btrim(p_data ->> 'terms'), '');         IF char_length(v_terms)    > 20000 THEN RETURN jsonb_build_object('status','invalid','field','terms');         END IF; END IF;
  IF jsonb_exists(p_data, 'notes')         THEN v_notes    := nullif(btrim(p_data ->> 'notes'), '');         IF char_length(v_notes)    > 4000  THEN RETURN jsonb_build_object('status','invalid','field','notes');         END IF; END IF;
  IF jsonb_exists(p_data, 'revision_note') THEN v_rev      := nullif(btrim(p_data ->> 'revision_note'), ''); IF char_length(v_rev)      > 2000  THEN RETURN jsonb_build_object('status','invalid','field','revision_note'); END IF; END IF;
  IF jsonb_exists(p_data, 'payment_terms') THEN v_pt       := coalesce(btrim(p_data ->> 'payment_terms'), ''); IF char_length(v_pt)     > 2000  THEN RETURN jsonb_build_object('status','invalid','field','payment_terms'); END IF; END IF;
  IF jsonb_exists(p_data, 'discount_amount') THEN
    IF coalesce(p_data ->> 'discount_amount', '') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'discount_amount'); END IF;
    v_disc := (p_data ->> 'discount_amount')::numeric;
  END IF;
  BEGIN
    IF jsonb_exists(p_data, 'expires_at') THEN v_exp := nullif(btrim(coalesce(p_data ->> 'expires_at', '')), '')::timestamptz; END IF;
    IF jsonb_exists(p_data, 'issue_date') THEN v_issue := nullif(btrim(coalesce(p_data ->> 'issue_date', '')), '')::date; END IF;
  EXCEPTION WHEN others THEN
    RETURN jsonb_build_object('status', 'invalid', 'field', 'date');
  END;

  IF jsonb_exists(p_data, 'line_items') THEN
    IF jsonb_typeof(p_data -> 'line_items') <> 'array' OR jsonb_array_length(p_data -> 'line_items') > 100 THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'line_items'); END IF;
    FOR e IN SELECT x.value AS el, x.ordinality AS ord FROM jsonb_array_elements(p_data -> 'line_items') WITH ORDINALITY AS x(value, ordinality) LOOP
      -- (1) shape and lexical form only: no numeric cast happens in this statement
      IF jsonb_typeof(e.el) <> 'object'
         OR char_length(btrim(coalesce(e.el ->> 'title', ''))) NOT BETWEEN 1 AND 200
         OR char_length(coalesce(e.el ->> 'description', '')) > 2000
         OR coalesce(e.el ->> 'quantity', '') !~ '^[0-9]{1,9}(\.[0-9]{1,3})?$'
         OR coalesce(e.el ->> 'unit_price', '') !~ '^[0-9]{1,12}(\.[0-9]{1,2})?$' THEN
        RETURN jsonb_build_object('status', 'invalid', 'field', 'line_items', 'line', e.ord);
      END IF;
      -- (2) the quantity text is now PROVEN numeric by the pattern above, so the cast is safe here (zero is refused; a zero unit price stays valid)
      IF (e.el ->> 'quantity')::numeric <= 0 THEN
        RETURN jsonb_build_object('status', 'invalid', 'field', 'line_items', 'line', e.ord);
      END IF;
    END LOOP;
    DELETE FROM public.proposal_line_items WHERE proposal_id = v_p.id;
    INSERT INTO public.proposal_line_items (proposal_id, sort_order, title, description, quantity, unit_price)
    SELECT v_p.id, x.ordinality::int, btrim(x.value ->> 'title'), nullif(btrim(coalesce(x.value ->> 'description', '')), ''),
           (x.value ->> 'quantity')::numeric, (x.value ->> 'unit_price')::numeric
    FROM jsonb_array_elements(p_data -> 'line_items') WITH ORDINALITY AS x(value, ordinality);
  END IF;

  SELECT coalesce(sum(amount), 0), count(*) INTO v_sub, v_n FROM public.proposal_line_items WHERE proposal_id = v_p.id;
  IF v_disc > v_sub THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'discount_amount', 'reason', 'exceeds_subtotal'); END IF;
  v_total := v_sub - v_disc;

  UPDATE public.proposals SET
    title = v_title, currency = v_cur, summary = v_summary, scope = v_scope, deliverables = v_deliv, timeline = v_timeline, terms = v_terms,
    notes = v_notes, revision_note = v_rev, discount_amount = v_disc, expires_at = v_exp, issue_date = v_issue,
    client_id = coalesce(p_client_id, client_id),
    subtotal = v_sub, total = v_total,
    -- legacy readers (Portal list, older pages) keep working: the JSON mirror is rebuilt from the authoritative rows
    services = coalesce((SELECT jsonb_agg(jsonb_build_object('name', l.title, 'description', coalesce(l.description, ''), 'price', l.amount::text) ORDER BY l.sort_order, l.id)
                         FROM public.proposal_line_items l WHERE l.proposal_id = v_p.id), '[]'::jsonb),
    pricing = jsonb_build_object('total', v_total, 'currency', v_cur, 'payment_terms', v_pt)
  WHERE id = v_p.id;

  IF v_created THEN
    PERFORM public.s64_event(p_client_id, NULL, p_actor, 'admin', 'proposal', v_p.id, 'proposal_created', 'Proposal created', 'internal', 'proposal_created:' || v_p.id::text);
  END IF;
  RETURN jsonb_build_object('status', 'saved', 'proposal_id', v_p.id, 'created', v_created, 'proposal_number', v_p.proposal_number,
                            'version', v_p.version, 'line_count', v_n, 'subtotal', v_sub::text, 'discount_amount', v_disc::text, 'total', v_total::text, 'currency', v_cur);
END $$;

CREATE FUNCTION public.send_proposal(p_proposal_id uuid, p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_p public.proposals%ROWTYPE; v_n int; v_sub numeric(14,2); v_total numeric(14,2); v_ver int; v_vid uuid; v_revised boolean; v_lines jsonb;
BEGIN
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_p.status NOT IN ('draft', 'changes_requested') THEN RETURN jsonb_build_object('status', 'not_sendable', 'current', v_p.status); END IF;
  IF v_p.client_id IS NULL THEN RETURN jsonb_build_object('status', 'client_not_linked'); END IF;
  SELECT count(*), coalesce(sum(amount), 0) INTO v_n, v_sub FROM public.proposal_line_items WHERE proposal_id = v_p.id;
  IF v_n = 0 THEN RETURN jsonb_build_object('status', 'no_line_items'); END IF;
  IF v_p.discount_amount > v_sub THEN RETURN jsonb_build_object('status', 'invalid_discount'); END IF;
  IF v_p.expires_at IS NOT NULL AND v_p.expires_at::timestamptz <= now() THEN RETURN jsonb_build_object('status', 'invalid_expiry'); END IF;
  v_total := v_sub - v_p.discount_amount;
  v_revised := v_p.status = 'changes_requested';
  v_ver := CASE WHEN v_revised THEN v_p.version + 1 ELSE v_p.version END;

  UPDATE public.proposals SET status = 'sent', sent_at = now(), version = v_ver, subtotal = v_sub, total = v_total,
         issue_date = coalesce(issue_date, current_date),
         pricing = jsonb_build_object('total', v_total, 'currency', v_p.currency, 'payment_terms', coalesce(to_jsonb(v_p) -> 'pricing' ->> 'payment_terms', ''))
   WHERE id = v_p.id;
  SELECT * INTO v_p FROM public.proposals WHERE id = v_p.id;

  SELECT jsonb_agg(jsonb_build_object('title', l.title, 'description', l.description, 'quantity', l.quantity::text, 'unit_price', l.unit_price::text, 'amount', l.amount::text)
                   ORDER BY l.sort_order, l.id) INTO v_lines FROM public.proposal_line_items l WHERE l.proposal_id = v_p.id;
  INSERT INTO public.proposal_versions (proposal_id, version_number, title, summary, scope, deliverables, timeline, terms, payment_terms, currency, subtotal, discount_amount, total,
                                        expires_at, issue_date, line_items, created_by, sent_at)
  VALUES (v_p.id, v_ver, v_p.title, v_p.summary, v_p.scope, v_p.deliverables, v_p.timeline, v_p.terms, coalesce(to_jsonb(v_p) -> 'pricing' ->> 'payment_terms', ''), v_p.currency, v_sub, v_p.discount_amount, v_total,
          v_p.expires_at::timestamptz, v_p.issue_date, v_lines, p_actor, v_p.sent_at)
  RETURNING id INTO v_vid;

  UPDATE public.proposal_responses SET resolved_at = now(), resolved_in_version = v_ver
   WHERE proposal_id = v_p.id AND response_type = 'changes_requested' AND resolved_at IS NULL;

  PERFORM public.s64_event(v_p.client_id, v_p.converted_to_project_id, p_actor, 'admin', 'proposal', v_p.id,
                           CASE WHEN v_revised THEN 'proposal_revised' ELSE 'proposal_sent' END,
                           CASE WHEN v_revised THEN 'Revised proposal sent (version ' || v_ver::text || ')' ELSE 'Proposal sent' END,
                           'client', 'proposal_sent:' || v_vid::text);
  RETURN jsonb_build_object('status', 'sent', 'version_id', v_vid, 'version', v_ver, 'revised', v_revised, 'client_id', v_p.client_id,
                            'proposal_number', v_p.proposal_number, 'title', v_p.title);
END $$;

CREATE FUNCTION public.mark_proposal_viewed(p_proposal_id uuid, p_client_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_p public.proposals%ROWTYPE;
BEGIN
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_p.status <> 'sent' THEN RETURN jsonb_build_object('status', 'unchanged', 'current', v_p.status); END IF;
  UPDATE public.proposals SET status = 'viewed' WHERE id = v_p.id;
  PERFORM public.s64_event(v_p.client_id, NULL, NULL, 'client', 'proposal', v_p.id, 'proposal_viewed', 'Proposal viewed by the client', 'internal',
                           'proposal_viewed:' || v_p.id::text || ':' || v_p.version::text);
  RETURN jsonb_build_object('status', 'viewed', 'version', v_p.version);
END $$;

CREATE FUNCTION public.approve_proposal(
  p_proposal_id uuid, p_client_id uuid, p_user_id uuid, p_confirm_version integer, p_project_reference text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_p public.proposals%ROWTYPE; v_c public.clients%ROWTYPE; v_project uuid; v_created boolean := false;
BEGIN
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  SELECT * INTO v_c FROM public.clients WHERE id = p_client_id FOR SHARE;
  IF lower(btrim(coalesce(v_c.status, ''))) = 'suspended' THEN RETURN jsonb_build_object('status', 'suspended'); END IF;
  IF v_c.merchant_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.merchants m WHERE m.id = v_c.merchant_id) THEN RETURN jsonb_build_object('status', 'not_connected'); END IF;

  -- a repeat of the SAME approval is a no-op that returns the same result (no second project, event or notification key)
  IF v_p.status = 'approved' THEN
    IF v_p.approved_version = p_confirm_version THEN
      RETURN jsonb_build_object('status', 'already_approved', 'version', v_p.approved_version, 'project_id', v_p.converted_to_project_id, 'proposal_number', v_p.proposal_number, 'title', v_p.title);
    END IF;
    RETURN jsonb_build_object('status', 'not_allowed', 'current', v_p.status);
  END IF;
  IF v_p.status NOT IN ('sent', 'viewed') THEN RETURN jsonb_build_object('status', 'not_allowed', 'current', v_p.status); END IF;
  IF v_p.version <> p_confirm_version THEN RETURN jsonb_build_object('status', 'version_mismatch', 'current_version', v_p.version); END IF;
  IF v_p.expires_at IS NOT NULL AND v_p.expires_at::timestamptz < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.proposal_versions WHERE proposal_id = v_p.id AND version_number = v_p.version) THEN
    RETURN jsonb_build_object('status', 'no_version');
  END IF;

  v_project := v_p.converted_to_project_id;
  IF v_project IS NOT NULL THEN
    -- reuse ONLY a real client project of this same client; never a public portfolio row, never another client's
    IF NOT EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = v_project AND pr.client_id = v_p.client_id) THEN
      RETURN jsonb_build_object('status', 'invalid_project_link');
    END IF;
  ELSE
    IF p_project_reference IS NULL OR btrim(p_project_reference) = '' THEN RETURN jsonb_build_object('status', 'reference_required'); END IF;
    v_project := public.s64_create_client_project(v_p.client_id, v_p.title, btrim(p_project_reference),
                   'Created from proposal ' || v_p.proposal_number, 'Proposal ' || v_p.proposal_number);
    v_created := true;
  END IF;

  UPDATE public.proposals SET status = 'approved', accepted_at = now(), approved_version = v_p.version, approved_by = p_user_id, converted_to_project_id = v_project
   WHERE id = v_p.id;

  PERFORM public.s64_event(v_p.client_id, v_project, p_user_id, 'client', 'proposal', v_p.id, 'proposal_approved',
                           'Proposal approved (version ' || v_p.version::text || ')', 'client', 'proposal_approved:' || v_p.id::text);
  IF v_created THEN
    PERFORM public.s64_event(v_p.client_id, v_project, NULL, 'system', 'project', v_project, 'proposal_converted',
                             'Project created from the approved proposal', 'client', 'proposal_converted:' || v_p.id::text);
  END IF;
  RETURN jsonb_build_object('status', 'approved', 'version', v_p.version, 'project_id', v_project, 'project_created', v_created,
                            'proposal_number', v_p.proposal_number, 'title', v_p.title);
END $$;

CREATE FUNCTION public.request_proposal_changes(p_proposal_id uuid, p_client_id uuid, p_user_id uuid, p_reason text, p_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_p public.proposals%ROWTYPE; v_rid uuid; v_reason text := btrim(coalesce(p_reason, ''));
BEGIN
  IF char_length(v_reason) NOT BETWEEN 1 AND 2000 THEN RETURN jsonb_build_object('status', 'invalid_reason'); END IF;
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF p_key IS NOT NULL THEN
    SELECT id INTO v_rid FROM public.proposal_responses WHERE proposal_id = v_p.id AND idempotency_key = p_key;
    IF FOUND THEN RETURN jsonb_build_object('status', 'requested', 'response_id', v_rid, 'duplicate', true, 'version', v_p.version, 'proposal_number', v_p.proposal_number, 'title', v_p.title); END IF;
  END IF;
  IF v_p.status NOT IN ('sent', 'viewed') THEN RETURN jsonb_build_object('status', 'not_allowed', 'current', v_p.status); END IF;
  IF v_p.expires_at IS NOT NULL AND v_p.expires_at::timestamptz < now() THEN RETURN jsonb_build_object('status', 'expired'); END IF;
  INSERT INTO public.proposal_responses (proposal_id, version_number, response_type, message, client_id, created_by, idempotency_key)
  VALUES (v_p.id, v_p.version, 'changes_requested', v_reason, v_p.client_id, p_user_id, p_key) RETURNING id INTO v_rid;
  UPDATE public.proposals SET status = 'changes_requested' WHERE id = v_p.id;
  PERFORM public.s64_event(v_p.client_id, v_p.converted_to_project_id, p_user_id, 'client', 'proposal', v_p.id, 'proposal_changes_requested',
                           'Changes requested on the proposal (version ' || v_p.version::text || ')', 'client', 'proposal_changes:' || v_rid::text);
  RETURN jsonb_build_object('status', 'requested', 'response_id', v_rid, 'duplicate', false, 'version', v_p.version, 'proposal_number', v_p.proposal_number, 'title', v_p.title);
END $$;

CREATE FUNCTION public.decline_proposal(p_proposal_id uuid, p_client_id uuid, p_user_id uuid, p_note text, p_key text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_p public.proposals%ROWTYPE; v_rid uuid; v_note text := nullif(btrim(coalesce(p_note, '')), '');
BEGIN
  IF v_note IS NOT NULL AND char_length(v_note) > 2000 THEN RETURN jsonb_build_object('status', 'invalid_reason'); END IF;
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id AND client_id = p_client_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_p.status IN ('declined', 'rejected') THEN
    RETURN jsonb_build_object('status', 'declined', 'duplicate', true, 'version', v_p.version, 'proposal_number', v_p.proposal_number, 'title', v_p.title);
  END IF;
  IF v_p.status NOT IN ('sent', 'viewed') THEN RETURN jsonb_build_object('status', 'not_allowed', 'current', v_p.status); END IF;
  INSERT INTO public.proposal_responses (proposal_id, version_number, response_type, message, client_id, created_by, idempotency_key)
  VALUES (v_p.id, v_p.version, 'declined', v_note, v_p.client_id, p_user_id, p_key) RETURNING id INTO v_rid;
  UPDATE public.proposals SET status = 'declined', declined_at = now() WHERE id = v_p.id;
  PERFORM public.s64_event(v_p.client_id, v_p.converted_to_project_id, p_user_id, 'client', 'proposal', v_p.id, 'proposal_declined',
                           'Proposal declined', 'client', 'proposal_declined:' || v_p.id::text);
  RETURN jsonb_build_object('status', 'declined', 'duplicate', false, 'response_id', v_rid, 'version', v_p.version, 'proposal_number', v_p.proposal_number, 'title', v_p.title);
END $$;

CREATE FUNCTION public.convert_approved_proposal(p_proposal_id uuid, p_actor uuid, p_project_reference text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_p public.proposals%ROWTYPE; v_project uuid;
BEGIN
  SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_p.status <> 'approved' THEN RETURN jsonb_build_object('status', 'not_approved', 'current', v_p.status); END IF;
  IF v_p.client_id IS NULL THEN RETURN jsonb_build_object('status', 'client_not_linked'); END IF;
  IF v_p.converted_to_project_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.projects pr WHERE pr.id = v_p.converted_to_project_id AND pr.client_id = v_p.client_id) THEN RETURN jsonb_build_object('status', 'invalid_project_link'); END IF;
    RETURN jsonb_build_object('status', 'already_converted', 'project_id', v_p.converted_to_project_id);
  END IF;
  IF p_project_reference IS NULL OR btrim(p_project_reference) = '' THEN RETURN jsonb_build_object('status', 'reference_required'); END IF;
  v_project := public.s64_create_client_project(v_p.client_id, v_p.title, btrim(p_project_reference), 'Created from proposal ' || v_p.proposal_number, 'Proposal ' || v_p.proposal_number);
  UPDATE public.proposals SET converted_to_project_id = v_project WHERE id = v_p.id;
  PERFORM public.s64_event(v_p.client_id, v_project, p_actor, 'admin', 'project', v_project, 'proposal_converted', 'Project created from the approved proposal', 'client', 'proposal_converted:' || v_p.id::text);
  RETURN jsonb_build_object('status', 'converted', 'project_id', v_project, 'proposal_number', v_p.proposal_number, 'title', v_p.title);
END $$;

-- -----------------------------------------------------------------------------
-- 10. Invoice functions
-- -----------------------------------------------------------------------------
CREATE FUNCTION public.create_invoice(p_project_id uuid, p_proposal_id uuid, p_currency text, p_due_date date, p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE
  v_proj public.projects%ROWTYPE; v_p public.proposals%ROWTYPE; v_v public.proposal_versions%ROWTYPE; v_cur text; v_id uuid; v_number text; v_disc numeric(14,2) := 0;
BEGIN
  SELECT * INTO v_proj FROM public.projects WHERE id = p_project_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  -- invoices belong to CLIENT projects only: a public portfolio row (no client) can never be billed
  IF v_proj.client_id IS NULL THEN RETURN jsonb_build_object('status', 'not_client_project'); END IF;

  IF p_proposal_id IS NOT NULL THEN
    SELECT * INTO v_p FROM public.proposals WHERE id = p_proposal_id FOR UPDATE;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'proposal_not_found'); END IF;
    IF v_p.status <> 'approved' OR v_p.approved_version IS NULL THEN RETURN jsonb_build_object('status', 'proposal_not_approved'); END IF;
    IF v_p.client_id IS DISTINCT FROM v_proj.client_id OR v_p.converted_to_project_id IS DISTINCT FROM v_proj.id THEN RETURN jsonb_build_object('status', 'project_mismatch'); END IF;
    IF EXISTS (SELECT 1 FROM public.project_invoices WHERE proposal_id = p_proposal_id AND status <> 'void') THEN RETURN jsonb_build_object('status', 'already_invoiced'); END IF;
    -- the invoice copies the APPROVED VERSION's snapshot, never the live (mutable) line items
    SELECT * INTO v_v FROM public.proposal_versions WHERE proposal_id = v_p.id AND version_number = v_p.approved_version;
    IF NOT FOUND THEN RETURN jsonb_build_object('status', 'no_approved_version'); END IF;
    v_cur := v_v.currency; v_disc := v_v.discount_amount;
  ELSE
    v_cur := coalesce(nullif(btrim(p_currency), ''), 'USD');
    IF v_cur NOT IN ('USD','NGN','GBP','EUR') THEN RETURN jsonb_build_object('status', 'invalid', 'field', 'currency'); END IF;
  END IF;

  v_number := public.next_document_number('invoice');
  INSERT INTO public.project_invoices (project_id, invoice_number, amount, currency, status, due_date, proposal_id, created_by)
  VALUES (v_proj.id, v_number, 0, v_cur, 'draft', p_due_date, p_proposal_id, p_actor)
  RETURNING id INTO v_id;

  IF p_proposal_id IS NOT NULL THEN
    INSERT INTO public.invoice_line_items (invoice_id, sort_order, title, description, quantity, unit_price)
    SELECT v_id, x.ordinality::int, x.value ->> 'title', x.value ->> 'description', (x.value ->> 'quantity')::numeric, (x.value ->> 'unit_price')::numeric
    FROM jsonb_array_elements(v_v.line_items) WITH ORDINALITY AS x(value, ordinality);
    UPDATE public.project_invoices SET discount_amount = v_disc WHERE id = v_id;
  END IF;

  PERFORM public.s64_event(v_proj.client_id, v_proj.id, p_actor, 'admin', 'invoice', v_id, 'invoice_created', 'Invoice ' || v_number || ' drafted', 'internal', 'invoice_created:' || v_id::text);
  RETURN jsonb_build_object('status', 'created', 'invoice_id', v_id, 'invoice_number', v_number);
END $$;

CREATE FUNCTION public.issue_invoice(p_invoice_id uuid, p_actor uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_i public.project_invoices%ROWTYPE; v_client uuid;
BEGIN
  SELECT * INTO v_i FROM public.project_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_i.status <> 'draft' THEN RETURN jsonb_build_object('status', 'not_draft', 'current', v_i.status); END IF;
  IF v_i.due_date IS NULL THEN RETURN jsonb_build_object('status', 'due_date_required'); END IF;
  IF v_i.due_date::date < coalesce(v_i.issue_date, current_date) THEN RETURN jsonb_build_object('status', 'due_before_issue'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.invoice_line_items WHERE invoice_id = v_i.id) THEN RETURN jsonb_build_object('status', 'no_line_items'); END IF;
  IF v_i.amount <= 0 THEN RETURN jsonb_build_object('status', 'zero_total'); END IF;
  SELECT client_id INTO v_client FROM public.projects WHERE id = v_i.project_id;
  UPDATE public.project_invoices SET status = 'issued', issued_at = now(), issue_date = coalesce(issue_date, current_date) WHERE id = v_i.id;
  PERFORM public.s64_event(v_client, v_i.project_id, p_actor, 'admin', 'invoice', v_i.id, 'invoice_issued', 'Invoice ' || v_i.invoice_number || ' issued', 'client', 'invoice_issued:' || v_i.id::text);
  RETURN jsonb_build_object('status', 'issued', 'invoice_number', v_i.invoice_number, 'client_id', v_client, 'amount', v_i.amount::text, 'currency', v_i.currency);
END $$;

CREATE FUNCTION public.record_invoice_payment(
  p_invoice_id uuid, p_amount numeric, p_paid_at date, p_method text, p_reference text, p_note text, p_actor uuid, p_key text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_i public.project_invoices%ROWTYPE; v_pid uuid; v_paid numeric(14,2); v_balance numeric(14,2); v_status text; v_client uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount <> round(p_amount, 2) OR p_amount > 99999999999999.99 THEN RETURN jsonb_build_object('status', 'invalid_amount'); END IF;
  IF p_paid_at IS NULL OR p_paid_at > current_date + 1 THEN RETURN jsonb_build_object('status', 'invalid_date'); END IF;
  SELECT * INTO v_i FROM public.project_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  SELECT client_id INTO v_client FROM public.projects WHERE id = v_i.project_id;

  IF p_key IS NOT NULL THEN
    SELECT id INTO v_pid FROM public.invoice_payments WHERE invoice_id = v_i.id AND idempotency_key = p_key;
    IF FOUND THEN
      SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.invoice_payments WHERE invoice_id = v_i.id;
      RETURN jsonb_build_object('status', 'recorded', 'duplicate', true, 'payment_id', v_pid, 'paid_total', v_paid::text, 'balance', (v_i.amount - v_paid)::text, 'invoice_status', v_i.status);
    END IF;
  END IF;
  IF v_i.status = 'void' THEN RETURN jsonb_build_object('status', 'void'); END IF;
  IF v_i.status NOT IN ('issued', 'partially_paid') THEN RETURN jsonb_build_object('status', 'not_payable', 'current', v_i.status); END IF;

  SELECT coalesce(sum(amount), 0) INTO v_paid FROM public.invoice_payments WHERE invoice_id = v_i.id;
  IF v_paid + p_amount > v_i.amount THEN RETURN jsonb_build_object('status', 'overpayment', 'balance', (v_i.amount - v_paid)::text); END IF;

  INSERT INTO public.invoice_payments (invoice_id, amount, paid_at, method, reference, note, idempotency_key, created_by)
  VALUES (v_i.id, p_amount, p_paid_at, nullif(btrim(coalesce(p_method, '')), ''), nullif(btrim(coalesce(p_reference, '')), ''), nullif(btrim(coalesce(p_note, '')), ''), p_key, p_actor)
  RETURNING id INTO v_pid;

  v_paid := v_paid + p_amount;
  v_balance := v_i.amount - v_paid;
  v_status := CASE WHEN v_balance = 0 THEN 'paid' ELSE 'partially_paid' END;
  UPDATE public.project_invoices SET status = v_status, paid_at = CASE WHEN v_status = 'paid' THEN now() ELSE paid_at END WHERE id = v_i.id;

  PERFORM public.s64_event(v_client, v_i.project_id, p_actor, 'admin', 'invoice', v_i.id, 'payment_recorded', 'Payment recorded on invoice ' || v_i.invoice_number, 'client', 'payment:' || v_pid::text);
  IF v_status = 'paid' THEN
    PERFORM public.s64_event(v_client, v_i.project_id, p_actor, 'admin', 'invoice', v_i.id, 'invoice_paid', 'Invoice ' || v_i.invoice_number || ' paid in full', 'client', 'invoice_paid:' || v_i.id::text);
  END IF;
  RETURN jsonb_build_object('status', 'recorded', 'duplicate', false, 'payment_id', v_pid, 'paid_total', v_paid::text, 'balance', v_balance::text,
                            'invoice_status', v_status, 'client_id', v_client, 'invoice_number', v_i.invoice_number, 'currency', v_i.currency);
END $$;

CREATE FUNCTION public.void_invoice(p_invoice_id uuid, p_actor uuid, p_reason text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_i public.project_invoices%ROWTYPE; v_client uuid;
BEGIN
  SELECT * INTO v_i FROM public.project_invoices WHERE id = p_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('status', 'not_found'); END IF;
  IF v_i.status = 'void' THEN RETURN jsonb_build_object('status', 'void', 'duplicate', true); END IF;
  -- money already received is never voided away: that needs a refund / credit process, not a status flip
  IF EXISTS (SELECT 1 FROM public.invoice_payments WHERE invoice_id = v_i.id) THEN RETURN jsonb_build_object('status', 'has_payments'); END IF;
  IF v_i.status NOT IN ('draft', 'issued') THEN RETURN jsonb_build_object('status', 'not_voidable', 'current', v_i.status); END IF;
  SELECT client_id INTO v_client FROM public.projects WHERE id = v_i.project_id;
  -- invoices.notes is printed on the CLIENT's invoice and PDF, so the void reason is never written there: it is kept only in an
  -- INTERNAL activity event (Admin history), visible to no client route.
  UPDATE public.project_invoices SET status = 'void', voided_at = now() WHERE id = v_i.id;
  PERFORM public.s64_event(v_client, v_i.project_id, p_actor, 'admin', 'invoice', v_i.id, 'invoice_voided', 'Invoice ' || v_i.invoice_number || ' voided',
                           CASE WHEN v_i.status = 'draft' THEN 'internal' ELSE 'client' END, 'invoice_voided:' || v_i.id::text);
  IF nullif(btrim(coalesce(p_reason, '')), '') IS NOT NULL THEN
    PERFORM public.s64_event(v_client, v_i.project_id, p_actor, 'admin', 'invoice', v_i.id, 'invoice_void_reason',
                             'Void reason: ' || left(btrim(p_reason), 240), 'internal', 'invoice_void_reason:' || v_i.id::text);
  END IF;
  RETURN jsonb_build_object('status', 'voided', 'invoice_number', v_i.invoice_number, 'client_id', v_client, 'was', v_i.status);
END $$;

-- -----------------------------------------------------------------------------
-- 11. Function ACLs: service_role only; internal helpers: nobody
-- -----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.save_proposal_draft(uuid, uuid, uuid, text, uuid, jsonb)                 FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.send_proposal(uuid, uuid)                                                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_proposal_viewed(uuid, uuid)                                         FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.approve_proposal(uuid, uuid, uuid, integer, text)                        FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_proposal_changes(uuid, uuid, uuid, text, text)                   FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.decline_proposal(uuid, uuid, uuid, text, text)                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.convert_approved_proposal(uuid, uuid, text)                              FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_invoice(uuid, uuid, text, date, uuid)                             FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.issue_invoice(uuid, uuid)                                                FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.void_invoice(uuid, uuid, text)                                           FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.s64_event(uuid, uuid, uuid, text, text, uuid, text, text, text, text)    FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.next_document_number(text)                                               FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.s64_create_client_project(uuid, text, text, text, text)                  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_proposal_draft(uuid, uuid, uuid, text, uuid, jsonb)                 TO service_role;
GRANT EXECUTE ON FUNCTION public.send_proposal(uuid, uuid)                                                TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_proposal_viewed(uuid, uuid)                                         TO service_role;
GRANT EXECUTE ON FUNCTION public.approve_proposal(uuid, uuid, uuid, integer, text)                        TO service_role;
GRANT EXECUTE ON FUNCTION public.request_proposal_changes(uuid, uuid, uuid, text, text)                   TO service_role;
GRANT EXECUTE ON FUNCTION public.decline_proposal(uuid, uuid, uuid, text, text)                           TO service_role;
GRANT EXECUTE ON FUNCTION public.convert_approved_proposal(uuid, uuid, text)                              TO service_role;
GRANT EXECUTE ON FUNCTION public.create_invoice(uuid, uuid, text, date, uuid)                             TO service_role;
GRANT EXECUTE ON FUNCTION public.issue_invoice(uuid, uuid)                                                TO service_role;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, date, text, text, text, uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.void_invoice(uuid, uuid, text)                                           TO service_role;

-- -----------------------------------------------------------------------------
-- 12. Final in-transaction proof of the backfill (abort rather than leave an inconsistent legacy record)
-- -----------------------------------------------------------------------------
DO $$
DECLARE v_bad text; v_total bigint; v_appr bigint; v_conv bigint;
BEGIN
  SELECT string_agg(p.id::text, ', ') INTO v_bad FROM public.proposals p
   WHERE p.subtotal IS DISTINCT FROM (SELECT coalesce(sum(l.amount), 0) FROM public.proposal_line_items l WHERE l.proposal_id = p.id)
      OR p.total IS DISTINCT FROM (p.subtotal - p.discount_amount);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Abort: proposal totals do not equal their line items: %', v_bad; END IF;

  SELECT string_agg(p.id::text, ', ') INTO v_bad FROM public.proposals p
   WHERE p.status <> 'draft' AND NOT EXISTS (SELECT 1 FROM public.proposal_versions v WHERE v.proposal_id = p.id AND v.version_number = p.version);
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Abort: a delivered proposal has no version snapshot: %', v_bad; END IF;

  SELECT string_agg(p.id::text, ', ') INTO v_bad FROM public.proposals p
   WHERE p.status IN ('approved', 'converted') AND p.approved_version IS DISTINCT FROM p.version;
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Abort: an approved proposal does not point at its approved version: %', v_bad; END IF;

  -- the version snapshot carries the payment terms the client saw (taken from the preserved legacy pricing JSON)
  SELECT string_agg(p.id::text, ', ') INTO v_bad FROM public.proposals p JOIN public.proposal_versions v ON v.proposal_id = p.id AND v.version_number = 1
   WHERE v.payment_terms IS DISTINCT FROM coalesce(btrim(to_jsonb(p) -> 'pricing' ->> 'payment_terms'), '');
  IF v_bad IS NOT NULL THEN RAISE EXCEPTION 'Abort: a backfilled version does not carry its proposal payment terms: %', v_bad; END IF;

  SELECT count(*), count(*) FILTER (WHERE status = 'approved'), count(*) FILTER (WHERE status = 'approved' AND converted_to_project_id IS NOT NULL)
    INTO v_total, v_appr, v_conv FROM public.proposals;
  RAISE NOTICE 'proposals: % total | % approved | % of those linked to a project (the historical approved proposal is intentionally left unconverted)', v_total, v_appr, v_conv;
END $$;

COMMIT;
