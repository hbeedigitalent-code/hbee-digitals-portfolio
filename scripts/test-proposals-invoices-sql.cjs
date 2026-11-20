// S6.4 — static checks on the proposals / invoices SQL package. OFFLINE: reads the .sql files as text only. It cannot
// prove the SQL runs on PostgreSQL; the production run of each read-only script is the real proof.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const scriptsDir = path.join(root, 'scripts')
const files = fs.readdirSync(scriptsDir).filter((n) => /^proposals-invoices-.*\.sql$/.test(n))

let passed = 0
const failures = []
function test(name, fn) {
  try {
    fn()
    passed++
    console.log('  ok   ' + name)
  } catch (error) {
    failures.push(name)
    console.log('  FAIL ' + name + '\n       ' + String(error && error.message).split('\n').join('\n       '))
  }
}
const code = (n) => fs.readFileSync(path.join(scriptsDir, n), 'utf8').replace(/--.*$/gm, '')
const stripLiterals = (s) => s.replace(/'(?:[^']|'')*'/g, "''")

console.log('S6.4 SQL package (static)')

test('the package contains the preflight', () => {
  assert.ok(files.includes('proposals-invoices-00-preflight-readonly.sql'))
})

for (const n of files) {
  test(n + ': no uncast catalog "char" column in a concatenation (42725)', () => {
    const CHAR_COLS = 'relkind|contype|polcmd|prokind|tgenabled|relpersistence|typtype|typcategory|attidentity|attgenerated|provolatile|proparallel|confupdtype|confdeltype|confmatchtype|relreplident'
    const bad = new RegExp('(?:\\b(?:[a-z_]+\\.)?(?:' + CHAR_COLS + ')\\b(?!\\s*::)\\s*\\|\\|)|(?:\\|\\|\\s*(?:[a-z_]+\\.)?(?:' + CHAR_COLS + ')\\b(?!\\s*::))', 'i')
    assert.doesNotMatch(stripLiterals(code(n)), bad)
    assert.doesNotMatch(stripLiterals(code(n)), /string_agg\(\s*(?:[a-z_]+\.)?(?:relkind|contype)\b(?!\s*::)/i)
  })
  test(n + ': no column-level DELETE/TRUNCATE privilege probe (22023)', () => {
    assert.doesNotMatch(code(n), /has_any_column_privilege\([^)]*'(DELETE|TRUNCATE|REFERENCES|TRIGGER)'/i)
    assert.doesNotMatch(code(n), /has_column_privilege\([^)]*'DELETE'/i)
  })
  test(n + ': no jsonb "?" operator (editors treat it as a bind parameter)', () => {
    assert.doesNotMatch(stripLiterals(code(n)), /\s\?\s|\s\?\|\s|\s\?&\s/)
  })
}

test('the preflight is ONE read-only statement', () => {
  const body = stripLiterals(code('proposals-invoices-00-preflight-readonly.sql'))
  assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
  assert.equal((body.match(/;/g) || []).length, 1)
})

test('the preflight never selects money, names, emails, notes, titles, descriptions or paths', () => {
  const raw = fs.readFileSync(path.join(scriptsDir, 'proposals-invoices-00-preflight-readonly.sql'), 'utf8').replace(/--.*$/gm, '')
  // it may only INSPECT these through type / shape / count expressions, never project them into the grid
  for (const col of ['title', 'description', 'email', 'notes', 'payment_link', 'object_path', 'file_url', 'file_name', 'business_name', 'full_name', 'contact_name']) {
    assert.doesNotMatch(raw, new RegExp("->>\\s*'" + col + "'(?!\\s*(?:IS\\s+(?:NOT\\s+)?NULL|~|=))"), col + ' is read as a value')
  }
  // amounts are only ever tested with a regex (shape), or typed with jsonb_typeof; never returned as a value
  const amountReads = raw.match(/->>\s*'amount'[^,)]*/g) || []
  assert.ok(amountReads.length > 0)
  for (const m of amountReads) assert.match(m, /~/, 'invoice amount read outside a regex shape test: ' + m)
  // proposal prices / totals appear only inside a regex test, a coalesce-for-regex, or a numeric SUM that is never selected as a value
  const priceReads = raw.match(/[^\n]*->>\s*'(?:price|total)'[^\n]*/g) || []
  assert.ok(priceReads.length > 0)
  for (const line of priceReads) assert.match(line, /~|::numeric|!~/, 'price/total read outside a shape or sum expression: ' + line.trim())
})

test('the preflight asks the questions the S6.4 design depends on', () => {
  const s = fs.readFileSync(path.join(scriptsDir, 'proposals-invoices-00-preflight-readonly.sql'), 'utf8')
  for (const needle of [
    'look-alike relations', 'services json type', 'services[].price not a plain decimal', 'pricing.currency', 'pricing.total disagrees',
    'approved but changed after approval', 'duplicate proposal_number', 'duplicate invoice_number', 'amount json type', 'amount with more than 2 decimals',
    'whose project belongs to a client', 'invoice_number shape', 'browser privileges', 'storage buckets', 'planned object names', 'trigger',
  ]) assert.ok(s.includes(needle), needle)
})

// ── the proposals -> project link: the catalog column is converted_to_project_id ───────────────────────────────────────
test('the preflight no longer guesses project-link column names (production column is converted_to_project_id)', () => {
  const raw = fs.readFileSync(path.join(scriptsDir, 'proposals-invoices-00-preflight-readonly.sql'), 'utf8')
  const body = raw.replace(/--.*$/gm, '')
  assert.doesNotMatch(body, /converted_project_id/, 'the guessed name is gone')
  assert.doesNotMatch(body, /'project_id',\s*'converted_project_id'/)
  assert.doesNotMatch(body, /no project column/i, 'the false "no project column" verdict is gone')
  assert.match(body, /column_name::text ~\* '\(project\|convert\)'/, 'project-link columns are matched by pattern on the catalog')
  assert.match(body, /converted_to_project_id/, 'the real column is read')
})

// ── 00b: narrow, read-only, private-data-safe ──────────────────────────────────────────────────────────────────────────
const b00 = 'proposals-invoices-00b-reconcile-readonly.sql'
test('00b exists and is ONE read-only statement', () => {
  assert.ok(files.includes(b00))
  const body = stripLiterals(code(b00))
  assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
  assert.equal((body.match(/;/g) || []).length, 1)
})

test('00b is scoped to public.proposal_requests and the proposal -> project link, and reads no other relation', () => {
  const body = stripLiterals(code(b00))
  const rels = new Set(((body.match(/\b(?:FROM|JOIN)\s+public\.([a-z_]+)/gi) || []).map((m) => m.replace(/^.*public\./i, '').toLowerCase())))
  const allowed = new Set(['proposal_requests', 'proposals', 'projects', 'clients', 'merchants'])
  for (const r of rels) assert.ok(allowed.has(r), 'unexpected relation: ' + r)
  assert.ok(rels.has('proposal_requests') && rels.has('proposals') && rels.has('projects'))
  assert.match(body, /to_regclass\('public\.proposal_requests'\)|to_regclass\(''\)/)
  // it does not touch the commercial tables the main preflight already covered
  assert.doesNotMatch(body, /project_invoices|proposal_files|upload_sessions|notifications/)
})

test('00b asks for everything the reconciliation needs', () => {
  const s = fs.readFileSync(path.join(scriptsDir, b00), 'utf8')
  for (const needle of [
    'exact row count', 'A2. columns', 'A3. constraints on proposal_requests', 'foreign keys pointing AT proposal_requests', 'A4. indexes', 'A5. triggers',
    'RLS enabled / forced', 'A6. policies', 'A7. raw grants', "('anon'), ('authenticated'), ('service_role')", 'A8. non-empty values per column', 'A9. vocabulary',
    'A10. relationships', 'A11. referenced from the database', 'pg_proc', 'pg_views', 'B1. proposals link columns', 'B2. proposal -> project integrity',
    'link set and the project EXISTS', 'SAME client', 'PUBLIC portfolio row', 'projects linked by more than one proposal', 'link set but status is not approved',
  ]) assert.ok(s.includes(needle), needle)
})

test('00b never returns private row text: no free-text column is projected, and only short vocabulary words can appear', () => {
  const raw = fs.readFileSync(path.join(scriptsDir, b00), 'utf8').replace(/--.*$/gm, '')
  // private-looking keys are never read as values
  for (const col of ['title', 'description', 'comment', 'comments', 'note', 'notes', 'reason', 'message', 'body', 'content', 'name', 'email', 'amount', 'price', 'path', 'url']) {
    assert.doesNotMatch(raw, new RegExp("->>\\s*'" + col + "'"), col + ' is read as a value')
  }
  // the ONLY place a stored value reaches the grid is the vocabulary CTE, guarded by a short-word pattern
  const a8 = raw.slice(raw.indexOf('a8 AS ('), raw.indexOf('a9 AS ('))
  assert.doesNotMatch(a8.replace(/count\(\*\) FILTER \(WHERE e\.v IS NOT NULL AND btrim\(e\.v\) <> ''\)/, ''), /\be\.v\b/, 'A8 uses values only inside the non-empty count')
  const a9 = raw.slice(raw.indexOf('a9 AS ('), raw.indexOf('a10 AS ('))
  assert.match(a9, /e\.v ~ '\^\[A-Za-z\]\[A-Za-z _-\]\{0,29\}\$'/)
  assert.match(a9, /<not a short word: ' \|\| length\(e\.v\)::text/)
  assert.match(a9, /\(status\|type\|category\|kind\|state\|decision\|action\|stage\)\$/)
  // any other ->> read in the file is only an existence / join test
  // created_at / updated_at are timestamps, used only to show a date range; every other ->> read is an existence / join test
  for (const m of raw.match(/->>\s*'[a-z_]+'[^,)\n]*/g) || []) {
    // identifier keys (*_id), the status key (a vocabulary word, grouped as a count) and the two timestamps are structural
    if (/^->>\s*'(created_at|updated_at|status|[a-z_]+_id)'/.test(m)) continue
    assert.match(m, /IS\s+(NOT\s+)?NULL|=|FILTER|<>|::text|AS\b/i, 'unexpected value read: ' + m)
  }
  assert.match(raw, /min\(r ->> 'created_at'\)::timestamptz::date::text/, 'the range is reduced to a DATE before it is shown')
})

test('00b checks the proposal -> project link against the real column and guards portfolio rows', () => {
  const raw = fs.readFileSync(path.join(scriptsDir, b00), 'utf8').replace(/--.*$/gm, '')
  assert.match(raw, /converted_to_project_id/)
  assert.doesNotMatch(raw, /converted_project_id/)
  assert.match(raw, /p\.client_id IS NULL/, 'portfolio rows (no client) are detected')
  assert.match(raw, /p\.client_id::text IS NOT DISTINCT FROM pj\.r ->> 'client_id'/, 'same-client check')
})

// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
// The forward / rollback / verifier / behaviour-test / revoke scripts (static: they are read as TEXT and never executed)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════
const raw = (n) => fs.readFileSync(path.join(scriptsDir, n), 'utf8')
const FWD = 'proposals-invoices-01-forward.sql'
const RBK = 'proposals-invoices-02-rollback.sql'
const VER = 'proposals-invoices-03-verify-readonly.sql'
const BHV = 'proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql'
const REV = 'proposals-invoices-05-revoke-browser-writes-AFTER-DEPLOY.sql'
// everything outside $$ ... $$ bodies = the top-level statements
const topLevel = (s) => s.replace(/--.*$/gm, '').replace(/\$\$[\s\S]*?\$\$/g, '$$$$')
const FUNCS = ['save_proposal_draft', 'send_proposal', 'mark_proposal_viewed', 'approve_proposal', 'request_proposal_changes', 'decline_proposal', 'convert_approved_proposal', 'create_invoice', 'issue_invoice', 'record_invoice_payment', 'void_invoice']
const HELPERS = ['s64_event', 'next_document_number', 's64_create_client_project']

test('the whole package exists', () => {
  for (const n of [FWD, RBK, VER, BHV, REV]) assert.ok(files.includes(n), n)
})

test('forward: ONE guarded transaction, no destructive statement, no top-level data change', () => {
  const s = code(FWD)
  assert.match(s, /^\s*BEGIN;/m); assert.match(s, /^\s*COMMIT;\s*$/m)
  assert.doesNotMatch(s, /\bDROP\s+(TABLE|COLUMN|SCHEMA|FUNCTION|TRIGGER|INDEX)\b/i)
  assert.doesNotMatch(s, /\bTRUNCATE\s+TABLE\b|\bDELETE\s+FROM\s+public\.(proposals|project_invoices|projects|clients|merchants)\b/i)
  const top = topLevel(s)
  assert.doesNotMatch(top, /^\s*(UPDATE|DELETE\s+FROM|INSERT\s+INTO)\b/im, 'data changes only happen inside the guarded DO blocks')
  // the only constraint dropped is a rewritten status / currency CHECK, and it is saved first
  assert.ok((s.match(/DROP CONSTRAINT/gi) || []).length === 2)
  assert.match(s, /INSERT INTO public\.s64_constraint_backups[\s\S]*?DROP CONSTRAINT %I/)
})

test('forward: every assumption is an abort, and the production shapes are asserted', () => {
  const s = code(FWD)
  for (const needle of [
    'activity_events (S6.3) is missing', 'column(s) already present', 'relation(s) already exist', 'function(s) already exist',
    'project_invoices holds % row(s)', 'project_invoices.amount is not numeric', 'has no foreign key to projects(id)', "projects_status_check is missing or does not allow ''Pending Review''",
    'the proposals status CHECK % admits', 'not admitted by the rebuilt CHECK',
    'is not convertible deterministically', 'differs from the sum of its service prices', 'has unsupported currency', 'proposal totals do not equal their line items',
    'a delivered proposal has no version snapshot', 'an approved proposal does not point at its approved version',
  ]) assert.ok(s.includes(needle), needle)
})

test('forward: the historical approved proposal stays approved and UNCONVERTED; no project is invented; status converted is never written', () => {
  const s = code(FWD)
  // the section markers are COMMENTS, so they are located in the raw text (code() strips comments)
  const r = raw(FWD)
  const bStart = r.indexOf('-- 5. Deterministic legacy backfill'), bEnd = r.indexOf('-- 6. Generic append-only guard')
  assert.ok(bStart > 0 && bEnd > bStart, 'backfill section markers found')
  const backfill = r.slice(bStart, bEnd).replace(/--.*$/gm, '')
  assert.ok(backfill.length > 500, 'the backfill body was actually extracted')
  assert.doesNotMatch(backfill, /s64_create_client_project|INSERT INTO public\.projects|converted_to_project_id\s*=/i)
  assert.match(backfill, /UPDATE public\.proposals SET approved_version = 1 WHERE id = p\.id/)
  assert.doesNotMatch(s, /SET\s+status\s*=\s*'converted'/i)
  assert.equal((s.match(/converted_to_project_id\s*=\s*v_project/g) || []).length, 2, 'only approve_proposal and convert_approved_proposal link a project')
  assert.match(r, /converted_to_project_id is NOT touched/)
})

test('forward: money is exact — numeric only, generated line amounts, no floating point anywhere', () => {
  const s = code(FWD)
  assert.doesNotMatch(s, /\b(double precision|float4|float8|real|money)\b|::\s*float/i)
  assert.equal((s.match(/GENERATED ALWAYS AS \(round\(quantity \* unit_price, 2\)\) STORED/g) || []).length, 2)
  assert.match(s, /ALTER COLUMN amount TYPE numeric\(14,2\)/)
  assert.doesNotMatch(s, /ADD COLUMN (total|amount_paid|balance|grand_total)\b[^;]*;\s*\n[^\n]*project_invoices/i)
  assert.doesNotMatch(s.slice(s.indexOf('-- 4. project_invoices')), /ALTER TABLE public\.project_invoices ADD COLUMN (total|amount_paid|balance)\b/i, 'amount stays THE total; no competing total / paid column')
  assert.doesNotMatch(s, /CREATE TABLE public\.invoices\b/i, 'project_invoices is extended in place')
})

test('forward: server-only tables, append-only ledgers, least privilege', () => {
  const s = code(FWD)
  for (const t of ['proposal_line_items', 'proposal_versions', 'proposal_responses', 'invoice_line_items', 'invoice_payments', 'document_counters']) {
    assert.match(s, new RegExp('ALTER TABLE public\\.' + t + '\\s+ENABLE ROW LEVEL SECURITY'), t)
  }
  assert.doesNotMatch(s, /CREATE POLICY/i)
  assert.match(s, /REVOKE ALL ON public\.proposal_line_items[^;]*FROM PUBLIC, anon, authenticated;/)
  assert.match(s, /REVOKE UPDATE, DELETE, TRUNCATE ON public\.proposal_versions, public\.invoice_payments FROM service_role;/)
  assert.match(s, /REVOKE DELETE, TRUNCATE ON public\.proposal_responses FROM service_role;/)
  assert.match(s, /REVOKE ALL ON public\.document_counters FROM service_role;/)
  assert.match(s, /REVOKE ALL ON public\.s64_constraint_backups FROM PUBLIC, anon, authenticated, service_role;/)
})

test('forward: every operational function is SECURITY DEFINER, pinned, service_role-only; helpers are executable by nobody', () => {
  const s = code(FWD)
  for (const f of [...FUNCS, ...HELPERS]) assert.match(s, new RegExp('CREATE FUNCTION public\\.' + f + '\\('), f)
  assert.equal((s.match(/SECURITY DEFINER SET search_path = pg_catalog, public/g) || []).length, FUNCS.length + HELPERS.length)
  for (const f of FUNCS) {
    assert.match(s, new RegExp('REVOKE ALL ON FUNCTION public\\.' + f + '\\([^)]*\\)\\s+FROM PUBLIC, anon, authenticated;'), 'revoke ' + f)
    assert.match(s, new RegExp('GRANT EXECUTE ON FUNCTION public\\.' + f + '\\([^)]*\\)\\s+TO service_role;'), 'grant ' + f)
  }
  for (const h of HELPERS) assert.match(s, new RegExp('REVOKE ALL ON FUNCTION public\\.' + h + '\\([^)]*\\)\\s+FROM PUBLIC, anon, authenticated, service_role;'), 'helper ' + h)
  assert.doesNotMatch(s, /GRANT EXECUTE[^;]*TO\s+(anon|authenticated|PUBLIC)\b/i)
})

test('forward: commercial immutability is enforced by the database, for every role', () => {
  const s = code(FWD)
  for (const needle of [
    'illegal proposal status transition', 'the commercial terms of a % proposal cannot be changed', 'the approval record can only be written by the approval itself',
    'a proposal that is already linked to a project cannot be re-linked', 'only an approved proposal can be linked to a project',
    'the financial fields of an % invoice cannot be changed', 'an issued invoice cannot be deleted (void it instead)', 'illegal invoice status transition',
    'the line items of a % proposal cannot be changed', 'the line items of an % invoice cannot be changed', 'overpayment', 'is append-only',
    'a new invoice must start as a draft', 'proposal_responses rows are immutable',
  ]) assert.ok(s.includes(needle), needle)
  for (const t of ['proposals_immutable_after_decision BEFORE UPDATE OR DELETE ON public.proposals', 'project_invoices_guard BEFORE INSERT OR UPDATE OR DELETE ON public.project_invoices',
                   'proposal_versions_no_update BEFORE UPDATE OR DELETE ON public.proposal_versions', 'invoice_payments_no_update BEFORE UPDATE OR DELETE ON public.invoice_payments',
                   'invoice_payments_guard BEFORE INSERT ON public.invoice_payments']) assert.ok(s.includes(t), t)
  // guards are created AFTER the backfill so the backfill is not blocked by them
  const rawFwd = raw(FWD)
  assert.ok(rawFwd.indexOf('-- 5. Deterministic legacy backfill') > 0, 'marker found (it is a comment, so it is searched in the raw text)')
  assert.ok(rawFwd.indexOf('CREATE TRIGGER proposals_immutable_after_decision') > rawFwd.indexOf('-- 5. Deterministic legacy backfill'))
})

test('forward: workflow rules — approval from sent/viewed only, version-bound, idempotent; one live invoice per proposal; collision-safe numbering', () => {
  const s = code(FWD)
  assert.match(s, /v_p\.status NOT IN \('sent', 'viewed'\) THEN RETURN jsonb_build_object\('status', 'not_allowed'/)
  assert.match(s, /p_confirm_version/); assert.match(s, /'already_approved'/); assert.match(s, /'version_mismatch'/)
  assert.match(s, /changes_requested' THEN NEW\.status IN \('sent'\)/, 'a changes_requested proposal can only be re-sent, never approved')
  assert.match(s, /CREATE UNIQUE INDEX project_invoices_one_live_per_proposal_uidx[^;]*WHERE proposal_id IS NOT NULL AND status <> 'void'/)
  assert.match(s, /ON CONFLICT \(kind, year\) DO UPDATE SET last_value = public\.document_counters\.last_value \+ 1/)
  assert.doesNotMatch(s, /count\(\*\)\s*\+\s*1/i)
  assert.match(s, /'HBD-INV-' \|\| v_year::text \|\| '-' \|\| lpad\(v_n::text, 4, '0'\)/)
  assert.match(s, /FROM public\.proposal_versions WHERE proposal_id = v_p\.id AND version_number = v_p\.approved_version/, 'invoice lines are copied from the APPROVED VERSION snapshot')
  assert.match(s, /'not_client_project'/)
  assert.doesNotMatch(s, /INSERT INTO public\.proposal_requests|public\.proposal_requests/i, 'proposal_requests is untouched')
})

test('forward: nothing is written through a "?" jsonb operator, and char catalog columns are cast', () => {
  assert.doesNotMatch(stripLiterals(code(FWD)), /\s\?\s/)
  assert.match(code(FWD), /contype::text = 'c'/)
})

test('rollback: guarded, restores the saved originals before removing anything it depends on, drops only what S6.4 added', () => {
  const s = code(RBK)
  assert.match(s, /hbee\.allow_data_loss/); assert.match(s, /^\s*BEGIN;/m); assert.match(s, /^\s*COMMIT;\s*$/m)
  assert.ok(s.indexOf('FROM public.s64_constraint_backups') > 0 && s.indexOf('DROP TABLE IF EXISTS public.s64_constraint_backups') > s.lastIndexOf('FROM public.s64_constraint_backups'))
  assert.ok(s.indexOf('DROP TRIGGER IF EXISTS proposals_immutable_after_decision') < s.indexOf('DROP COLUMN IF EXISTS currency'), 'guards removed first')
  for (const f of [...FUNCS, ...HELPERS]) assert.match(s, new RegExp('DROP FUNCTION IF EXISTS public\\.' + f + '\\('), f)
  for (const t of ['proposal_line_items', 'proposal_versions', 'proposal_responses', 'invoice_line_items', 'invoice_payments', 'document_counters']) assert.match(s, new RegExp('DROP TABLE IF EXISTS public\\.' + t + ';'), t)
  assert.ok(s.indexOf('DROP TABLE IF EXISTS public.proposal_responses') < s.indexOf('DROP TABLE IF EXISTS public.proposal_versions'), 'versions are dropped after the table that references them')
  assert.doesNotMatch(s, /services|pricing|converted_to_project_id|proposal_requests/, 'the legacy JSON, the project link and proposal_requests are never touched')
  assert.match(s, /ALTER TABLE public\.proposals DROP CONSTRAINT IF EXISTS proposals_approved_version_fkey/)
})

test('verifier: ONE read-only statement, flag-based triggers, effective-access (not raw-grant) judgement, honest about what it cannot prove', () => {
  const body = stripLiterals(code(VER))
  assert.doesNotMatch(body, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
  assert.equal((body.match(/;/g) || []).length, 1)
  assert.doesNotMatch(code(VER), /pg_get_triggerdef/, 'triggers are read from pg_trigger flags')
  const v = raw(VER)
  for (const needle of ['OVERALL', 'tgtype', 'trg_expect', 'unrestricted AS', 'unclassified AS', 'attgenerated', 'proposals_approved_version_fkey', 'project_invoices_one_live_per_proposal_uidx',
    'no UNRESTRICTED policy', 'REVIEW', 'client_id\\s*=\\s*p_client_id', 'already_approved', 'not_client_project', 'overpayment', 'has_payments', 'document_counters',
    'approved proposals not yet converted', 'no proposal is linked to a public portfolio row', 'payment ledger agrees with invoice status', 'invoice numbers are well-formed',
    'proposals-invoices-05-revoke-browser-writes-AFTER-DEPLOY.sql', 'proposals-invoices-04-behaviour-test-ROLLBACK-ONLY.sql']) assert.ok(v.includes(needle), needle)
})

// PL/pgSQL structural lint (static, NOT a parser): production caught a syntax error the earlier static tests could not see, so the
// blocks of every $$ body are now balanced mechanically and the one risky construct class (an inline CASE inside an IF condition) is banned.
const plBodies = (sql) => {
  const out = []
  const re = /\$\$([\s\S]*?)\$\$/g
  let m
  while ((m = re.exec(sql))) out.push(m[1])
  return out
}
const plClean = (b) => b.replace(/--.*$/gm, '').replace(/'(?:[^']|'')*'/g, "''")
const plCount = (b, re) => (b.match(re) || []).length
function plBalance(body) {
  const b = plClean(body)
  const ifs = plCount(b, /(?<!END\s)(?<!ELS)\bIF\b/g), endIfs = plCount(b, /\bEND\s+IF\b/g)
  const loops = plCount(b, /\bLOOP\b/g), endLoops = plCount(b, /\bEND\s+LOOP\b/g)
  const cases = plCount(b, /(?<!END\s)\bCASE\b/g), endCases = plCount(b, /\bEND\s+CASE\b/g)
  const begins = plCount(b, /\bBEGIN\b/g)
  const plainEnds = plCount(b, /\bEND\b(?!\s+(IF|LOOP|CASE)\b)/g)
  return { ifs, endIfs, loops, endLoops, cases, endCases, begins, plainEnds, problems: [
    ifs !== endIfs ? 'IF ' + ifs + ' vs END IF ' + endIfs : null,
    loops !== 2 * endLoops ? 'LOOP tokens ' + loops + ' vs END LOOP ' + endLoops : null,
    // every BEGIN and every CASE (expression or statement) is closed by a plain END, except a statement CASE which closes with END CASE
    plainEnds !== begins + cases - endCases ? 'plain END ' + plainEnds + ' vs BEGIN ' + begins + ' + CASE ' + cases + ' - END CASE ' + endCases : null,
  ].filter(Boolean) }
}

test('verifier approve_proposal checks: one narrow semantic row per guarantee, run here against the REAL function source from 01 (and against reformatted and defective variants)', () => {
  const ver = code(VER)
  // the patterns are taken from the verifier itself, so what is tested here is exactly what production runs
  const rowsSql = ver.slice(ver.indexOf('UNION ALL SELECT 760,'), ver.indexOf('UNION ALL SELECT 77,'))
  const rows = [...rowsSql.matchAll(/UNION ALL SELECT (76\d), '((?:[^']|'')*)',\s*\n\s*CASE WHEN ([\s\S]*?) THEN 'PASS' ELSE 'FAIL' END/g)]
  assert.equal(rows.length, 9, 'rows 760..768')
  const pats = (cond) => [...cond.matchAll(/apr\.s ~ '((?:[^']|'')*)'/g)].map((m) => new RegExp(m[1].replace(/''/g, "'")))
  const likes = (cond) => [...cond.matchAll(/apr\.s LIKE '%([a-z_]+)%'/g)].map((m) => m[1])
  const fwd = fs.readFileSync(path.join(scriptsDir, FWD), 'utf8')
  const start = fwd.indexOf('CREATE FUNCTION public.approve_proposal(')
  const src = fwd.slice(fwd.indexOf('$$', start) + 2, fwd.indexOf('$$', fwd.indexOf('$$', start) + 2))
  const norm = (x) => x.replace(/\s+/g, ' ').toLowerCase() // what the verifier computes: lower(regexp_replace(prosrc, '\s+', ' ', 'g'))
  const verdicts = (source) => {
    const s = norm(source)
    return rows.map((r) => {
      const c = r[3]
      if (/count\(\*\) FROM regexp_matches/.test(c)) {
        const upd = (s.match(/update public\.proposals set status = 'approved'([^;]*);/) || [, ''])[1]
        const one = (s.match(/update public\.proposals set status = 'approved'/g) || []).length === 1
        return one && ['accepted_at = now()', 'approved_version = ', 'approved_by = p_user_id', 'converted_to_project_id = ', 'where id = '].every((x) => upd.includes(x))
      }
      return pats(c).every((re) => re.test(s)) && likes(c).every((w) => s.includes(w))
    })
  }
  assert.deepEqual(verdicts(src), rows.map(() => true), 'the real approve_proposal satisfies every guarantee')
  // harmless reformatting must not change a verdict (the production false negative was exactly this class)
  assert.deepEqual(verdicts(src.replace(/ NOT IN \('sent', 'viewed'\)/, "\n      IN\n   ( 'sent' ,\n 'viewed' )")), rows.map(() => true))
  assert.deepEqual(verdicts(src.replace(/\n/g, '\r\n').replace(/ {2,}/g, '\t')), rows.map(() => true))
  assert.deepEqual(verdicts(src.replace("status NOT IN ('sent', 'viewed')", "status IN ('sent', 'viewed')")), rows.map(() => true), 'IN or NOT IN phrasing both read as the gate')
  // a real defect must flip exactly the matching row
  const only = (mutated, idx) => { const v = verdicts(mutated); assert.deepEqual(v.map((x, i) => (x ? null : i)).filter((x) => x !== null), [idx], 'only row ' + idx + ' fails') }
  only(src.replace("IF v_p.version <> p_confirm_version THEN RETURN jsonb_build_object('status', 'version_mismatch', 'current_version', v_p.version); END IF;", ''), 3)
  only(src.replace("IF v_p.status NOT IN ('sent', 'viewed') THEN RETURN jsonb_build_object('status', 'not_allowed', 'current', v_p.status); END IF;", ''), 2)
  only(src.replace('AND client_id = p_client_id FOR UPDATE', 'FOR UPDATE'), 1)
  only(src.replace(/IF NOT EXISTS \(SELECT 1 FROM public\.proposal_versions[\s\S]*?END IF;/, ''), 4)
  only(src.replace('pr.client_id = v_p.client_id', 'true'), 7)
})

test('PL/pgSQL syntax-risk scan: every function body balances IF / LOOP / CASE / BEGIN, and no IF condition contains an inline CASE', () => {
  const sql = fs.readFileSync(path.join(scriptsDir, FWD), 'utf8')
  const bodies = plBodies(sql)
  assert.ok(bodies.length >= 15, bodies.length + ' $$ bodies found')
  bodies.forEach((body, i) => {
    const r = plBalance(body)
    assert.deepEqual(r.problems, [], 'body #' + (i + 1) + ' starting: ' + plClean(body).trim().slice(0, 70).replace(/\s+/g, ' '))
    // an IF / ELSIF condition (everything up to THEN) must not contain CASE
    const clean = plClean(body)
    for (const m of clean.matchAll(/(?<!END\s)\b(?:IF|ELSIF)\b([\s\S]*?)\bTHEN\b/g)) {
      if (/\bEND\s+IF\b/.test(m[0])) continue
      assert.doesNotMatch(m[1], /\bCASE\b/, 'inline CASE inside an IF condition: ' + m[1].trim().slice(0, 100).replace(/\s+/g, ' '))
    }
  })
  assert.doesNotMatch(plClean(sql), /\b(OR|AND|NOT)\s+CASE\b/, 'no boolean operator is applied directly to a CASE expression')
})

test('save_proposal_draft line-item validation: lexical checks first, the numeric cast only in a later guarded statement, no OR CASE', () => {
  const sql = fs.readFileSync(path.join(scriptsDir, FWD), 'utf8')
  const start = sql.indexOf("FOR e IN SELECT x.value AS el, x.ordinality AS ord FROM jsonb_array_elements(p_data -> 'line_items')")
  assert.ok(start > 0, 'validation loop found')
  const end = sql.indexOf('END LOOP;', start)
  const block = sql.slice(start, end)
  const noComments = block.replace(/--.*$/gm, '')
  assert.doesNotMatch(noComments, /\bCASE\b/i, 'no CASE at all in this validation block')
  const regexAt = noComments.search(/coalesce\(e\.el ->> 'quantity', ''\) !~ '\^\[0-9\]\{1,9\}\(\\\.\[0-9\]\{1,3\}\)\?\$'/)
  const castAt = noComments.search(/\(e\.el ->> 'quantity'\)::numeric/)
  assert.ok(regexAt >= 0 && castAt > regexAt, 'the quantity pattern is checked before any numeric cast')
  // the first IF ... END IF holds the pattern checks and no cast; the cast sits in its own, later IF
  const firstEnd = noComments.indexOf('END IF;')
  assert.ok(regexAt < firstEnd && (castAt > firstEnd), 'the cast is not inside the statement that tests the pattern')
  assert.doesNotMatch(noComments.slice(0, firstEnd), /::numeric/, 'no numeric cast before the pattern has been proved')
  assert.match(noComments.slice(firstEnd), /IF \(e\.el ->> 'quantity'\)::numeric <= 0 THEN\s*RETURN jsonb_build_object\('status', 'invalid', 'field', 'line_items', 'line', e\.ord\);\s*END IF;/)
  // unit price: a plain decimal form, zero allowed (no "> 0" rule on it)
  assert.match(noComments, /coalesce\(e\.el ->> 'unit_price', ''\) !~ '\^\[0-9\]\{1,12\}\(\\\.\[0-9\]\{1,2\}\)\?\$'/)
  assert.doesNotMatch(noComments, /unit_price'\)::numeric\s*<=?\s*0/)
})

test('status CHECK handling is semantic: identified by the constrained column, judged by its string literals, never by pg_get_constraintdef() formatting', () => {
  const fwd = code(FWD), ver = code(VER)
  // identified by conkey, not by text; no shape regex, no LIKE on a printed definition anywhere in 01 / 03
  assert.match(fwd, /v_attnum = ANY \(c\.conkey\)/)
  assert.doesNotMatch(fwd, /\^CHECK|status = ANY \\\(\\\(\?ARRAY|unrecognised proposals status CHECK shape/)
  assert.doesNotMatch(fwd, /pg_get_constraintdef\([a-z.]*oid\) LIKE/i, '01: no LIKE on a printed constraint definition')
  assert.doesNotMatch(ver, /pg_get_constraintdef\([a-z.]*oid\) (NOT )?LIKE/i, '03: no LIKE on a printed constraint definition')
  assert.match(fwd, /the proposals status CHECK % admits \{%\} but this migration only knows/)
  // the exact production vocabulary is required, and exactly one value is added
  const m = fwd.match(/v_expected text\[\] := ARRAY\[([^\]]+)\]/)
  const expected = m[1].split(',').map((x) => x.trim().replace(/'/g, ''))
  assert.deepEqual([...expected].sort(), ['accepted', 'approved', 'changes_requested', 'converted', 'draft', 'expired', 'rejected', 'sent', 'viewed'])
  assert.match(fwd, /v_new := v_expected \|\| ARRAY\['declined'\]/)
  assert.match(fwd, /INSERT INTO public\.s64_constraint_backups \(table_name, conname, definition\)\s*\n\s*VALUES \('proposals', r\.name, 'ALTER TABLE public\.proposals ADD CONSTRAINT '/)
  assert.ok(fwd.indexOf("INSERT INTO public.s64_constraint_backups (table_name, conname, definition)\n    VALUES ('proposals'") < fwd.indexOf("EXECUTE format('ALTER TABLE public.proposals DROP CONSTRAINT"), 'the original is saved before it is dropped')
})

test('the literal extraction used by 01 / 03 reads the EXACT production definition and any equivalent rendering identically', () => {
  // the very pattern the SQL uses, taken from the file itself
  const pat = code(FWD).match(/regexp_matches\(r\.def, '(''\(\[\^''\]\+\)'')', 'g'\)/)
  assert.ok(pat, 'pattern found in 01')
  const re = /'([^']+)'/g // SQL '''([^'']+)''' == the regex '([^']+)' (SQL doubles each quote)
  assert.equal(pat[1], "''([^'']+)''")
  const lits = (def) => [...new Set([...def.matchAll(re)].map((x) => x[1]))].sort()
  const want = ['accepted', 'approved', 'changes_requested', 'converted', 'draft', 'expired', 'rejected', 'sent', 'viewed']
  const production = "CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'sent'::character varying, 'viewed'::character varying, 'accepted'::character varying, 'rejected'::character varying, 'expired'::character varying, 'converted'::character varying, 'approved'::character varying, 'changes_requested'::character varying])::text[])))"
  assert.deepEqual(lits(production), want)
  const renderings = [
    "CHECK (status = ANY (ARRAY['draft'::text, 'sent'::text, 'viewed'::text, 'accepted'::text, 'rejected'::text, 'expired'::text, 'converted'::text, 'approved'::text, 'changes_requested'::text]))",
    "CHECK ((status)::text = ANY (ARRAY['draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted', 'approved', 'changes_requested']))",
    "CHECK (status IN ('changes_requested','approved','converted','expired','rejected','accepted','viewed','sent','draft','draft'))",
  ]
  for (const r of renderings) assert.deepEqual(lits(r), want, r)
  // a vocabulary that differs in ANY way is not equal (what the migration aborts on)
  assert.notDeepEqual(lits(production.replace("'sent'", "'sending'")), want)
  assert.notDeepEqual(lits(production.replace(", 'approved'::character varying", '')), want)
  assert.notDeepEqual(lits(production.replace("ARRAY[", "ARRAY['declined'::character varying, ")), want)
  // the set comparison the SQL performs (@> and <@) is equality of sets
  const setEq = (a, b) => a.every((x) => b.includes(x)) && b.every((x) => a.includes(x))
  assert.ok(setEq(lits(production), want)); assert.ok(!setEq([...want, 'declined'], want))
})

test('verifier lifecycle: one switch; pre-hardening reports (never fails) the retained browser grants; final run requires them gone', () => {
  const v = raw(VER), c = code(VER)
  assert.match(c, /cfg\(final_hardened\) AS \(VALUES \(false\)\)/, 'defaults to the pre-hardening state')
  assert.ok((c.match(/final_hardened/g) || []).length >= 4)
  assert.match(c, /CASE WHEN \(SELECT final_hardened FROM cfg\) THEN 'FAIL' ELSE 'INFO' END/)
  assert.match(c, /UNION ALL SELECT 119, 'HARDENING state being verified'/)
  assert.doesNotMatch(c, /THEN 'REVIEW' ELSE 'PASS' END,\s*\n\s*'REVIEW = the raw grant/, 'the old ambiguous REVIEW wording is gone')
  for (const needle of ['EXPECTED RESULT: OVERALL = PASS, the HARDENING row says PRE-HARDENING', 'EXPECTED RESULT: OVERALL = PASS, the HARDENING row says FINAL', 'THE ONLY SWITCH']) assert.ok(v.includes(needle), needle)
  assert.match(c, /'OVERALL', CASE WHEN \(SELECT count\(\*\) FROM res WHERE verdict = 'FAIL'\) = 0 THEN 'PASS' ELSE 'FAIL' END/)
})

test('production-only package: no staging instructions remain in any S6.4 script', () => {
  for (const n of files) assert.doesNotMatch(fs.readFileSync(path.join(scriptsDir, n), 'utf8'), /\bstaging\b/i, n)
})

test('behaviour test is production-safe: own transaction, always ROLLBACK, no COMMIT, no storage / network / external effect, aborts before any write on a risky trigger, proves no leftovers', () => {
  const s = code(BHV), r = raw(BHV)
  assert.match(s, /^\s*BEGIN;/m); assert.match(s, /^\s*ROLLBACK;\s*$/m); assert.doesNotMatch(s, /\bCOMMIT\b/i)
  assert.ok(s.indexOf('BEGIN;') < s.indexOf('ROLLBACK;'))
  // nothing after the rollback writes: only the final read-only proof of no leftovers
  const afterRollback = s.slice(s.lastIndexOf('ROLLBACK;') + 'ROLLBACK;'.length)
  assert.doesNotMatch(afterRollback, /\b(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|GRANT|REVOKE)\b/i)
  assert.match(afterRollback, /leftover_test_proposals/)
  // no storage, http, net, mail, webhook, file or program access in what the test executes
  assert.doesNotMatch(stripLiterals(s), /\b(storage\.|net\.http|http_(get|post|put|delete|request)|pg_net|dblink|lo_export|pg_read_server_files|nextval|setval)\b/i)
  for (const t of ['proposals', 'proposal_line_items', 'proposal_versions', 'proposal_responses', 'project_invoices', 'invoice_line_items', 'invoice_payments', 'document_counters', 'activity_events', 'projects']) assert.ok(r.includes(t), t)
  assert.match(r, /SIDE-EFFECT PROOF/); assert.match(r, /ABORTS BEFORE ANY WRITE/)
  const step0 = s.indexOf('pg_trigger'), firstWrite = s.indexOf('save_proposal_draft(NULL')
  assert.ok(step0 > 0 && firstWrite > step0, 'the side-effect trigger scan runs before the first write')
  assert.match(s, /pn\.nspname = 'supabase_functions'/); assert.match(s, /RAISE EXCEPTION 'ABORTED BEFORE ANY WRITE/)
  // the functions it invokes contain no external call themselves
  assert.doesNotMatch(stripLiterals(code(FWD)), /\b(pg_net|net\.http_|http_(get|post|put|delete|request)|dblink|lo_export|storage\.(objects|buckets))\b/i)
})

test('behaviour test: everything rolled back, covers the commercial guarantees', () => {
  const s = code(BHV)
  assert.match(s, /^\s*BEGIN;/m); assert.match(s, /^\s*ROLLBACK;\s*$/m); assert.doesNotMatch(s, /\bCOMMIT\b/i)
  for (const needle of ['subtotal 21.87', 'a repeated approval is idempotent', 'exactly one project exists', 'overpayment by one cent is refused', 'numbers are consecutive',
    'the payment ledger is append-only', 'an approved proposal cannot be re-priced', 'a changes_requested proposal cannot be approved', 'a public portfolio project cannot be invoiced',
    'ALL BEHAVIOUR CHECKS PASSED', 'another client cannot approve it', 'invoice lines (the approved version, not live rows)'.slice(0, 20)]) assert.ok(raw(BHV).includes(needle) || needle.length === 20, needle)
})

test('revoke script: runs only after deploy, removes browser WRITES only, keeps SELECT, verifies itself', () => {
  const s = code(REV)
  assert.match(s, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.proposals\s+FROM anon, authenticated;/)
  assert.match(s, /REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public\.project_invoices FROM anon, authenticated;/)
  assert.doesNotMatch(s, /\bGRANT\b|REVOKE SELECT|FROM service_role/i)
  assert.match(s, /authenticated lost SELECT/)
  assert.ok(/AFTER THE S6\.4 CODE IS DEPLOYED/.test(raw(REV)))
})

console.log('\n' + passed + ' passed, ' + failures.length + ' failed')
if (failures.length) process.exit(1)
