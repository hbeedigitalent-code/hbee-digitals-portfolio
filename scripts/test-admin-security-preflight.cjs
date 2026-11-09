// Static contract test for scripts/admin-security-preflight-readonly.sql.
//
// WHAT THIS IS: a tokenizer-based check that the file is a single, read-only, catalog-only query that never reads a secret
// value. WHAT IT IS NOT: a PostgreSQL parse. No Postgres or SQL parser is available in this repository, so syntactic
// validity against a real server is NOT proven here; the script must still be run on staging and any error reported.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const file = path.resolve(__dirname, 'admin-security-preflight-readonly.sql')
const raw = fs.readFileSync(file, 'utf8')

// 1. Strip comments and string literals, keeping a record of the literals (they are data, not code).
const literals = []
let code = ''
for (let i = 0; i < raw.length; ) {
  if (raw.startsWith('--', i)) { while (i < raw.length && raw[i] !== '\n') i++; continue }
  if (raw.startsWith('/*', i)) { const end = raw.indexOf('*/', i + 2); assert.ok(end > 0, 'unterminated block comment'); i = end + 2; continue }
  if (raw[i] === "'") {
    let j = i + 1, text = ''
    while (j < raw.length) { if (raw[j] === "'" && raw[j + 1] === "'") { text += "'"; j += 2 } else if (raw[j] === "'") break; else text += raw[j++] }
    assert.ok(j < raw.length, 'unterminated string literal')
    literals.push(text); code += "''"; i = j + 1; continue
  }
  if (raw[i] === '"') { const end = raw.indexOf('"', i + 1); assert.ok(end > 0, 'unterminated quoted identifier'); code += '"x"'; i = end + 1; continue }
  code += raw[i++]
}
const upper = code.toUpperCase()

// 2. One statement, ending with a single semicolon, starting with WITH.
assert.equal((code.match(/;/g) || []).length, 1, 'exactly one semicolon')
assert.ok(code.trimEnd().endsWith(';'), 'the semicolon terminates the file')
assert.match(upper.trimStart(), /^WITH\b/, 'a single WITH ... SELECT query')

// 3. Balanced parentheses.
let depth = 0
for (const ch of code) { if (ch === '(') depth++; if (ch === ')') depth--; assert.ok(depth >= 0, 'closing parenthesis without an opener') }
assert.equal(depth, 0, 'parentheses balance')

// 4. Read-only: no statement or function that writes, locks, changes settings, runs code or touches files / extensions.
const FORBIDDEN = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'CALL', 'EXECUTE', 'DO', 'SET', 'RESET', 'VACUUM', 'ANALYZE', 'REINDEX', 'CLUSTER', 'COMMENT', 'LOCK', 'LISTEN', 'NOTIFY', 'PREPARE', 'DISCARD', 'REFRESH', 'SECURITY', 'INTO']
for (const word of FORBIDDEN) assert.doesNotMatch(upper, new RegExp(`\\b${word}\\b`), `forbidden keyword: ${word}`)
const FORBIDDEN_FUNCTIONS = ['PG_SLEEP', 'SET_CONFIG', 'NEXTVAL', 'SETVAL', 'LO_', 'PG_READ_FILE', 'PG_READ_BINARY_FILE', 'PG_LS_DIR', 'PG_TERMINATE_BACKEND', 'PG_CANCEL_BACKEND', 'DBLINK', 'PG_ADVISORY', 'TXID_', 'PG_RELOAD_CONF', 'PG_ROTATE_LOGFILE', 'PG_STAT_RESET', 'PG_START_BACKUP', 'PG_STOP_BACKUP', 'PG_SWITCH_WAL']
for (const fn of FORBIDDEN_FUNCTIONS) assert.ok(!upper.includes(fn), `forbidden function family: ${fn}`)
assert.doesNotMatch(upper, /\bFOR\s+(UPDATE|SHARE|NO\s+KEY)/, 'no row locks')

// 5. Catalog / metadata sources only, plus the two application tables read for COUNTS in section 3.
const sources = [...code.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_.]*)/gi)].map((m) => m[1].toLowerCase()).filter((s) => !['wanted', 'rls', 'grants', 'pol', 'pol0', 'section1', 'section2', 'section3', 'u', 'd'].includes(s))
const ALLOWED = new Set(['pg_class', 'pg_namespace', 'pg_policies', 'pg_index', 'pg_attribute', 'information_schema.role_table_grants', 'information_schema.columns', 'public.admin_2fa', 'public.admin_users'])
for (const source of new Set(sources)) assert.ok(ALLOWED.has(source), `unexpected data source: ${source}`)

// 6. No secret VALUE is ever selected: secret-bearing column names may appear only as string literals (metadata filters),
//    never as an identifier in the query text. The 2FA tables are used for counts and ids only.
for (const name of ['SECRET', 'BACKUP_CODES', 'SMTP_PASSWORD', 'TOKEN_HASH', 'PASSWORD']) assert.ok(!new RegExp(`\\b${name}\\b`).test(upper), `${name} must not appear as an identifier (only inside string literals)`)
assert.doesNotMatch(code, /SELECT\s+(?:\w+\.)?\*\s+FROM\s+public\.(admin_2fa|admin_users)\b/i, 'no SELECT * from the 2FA/admin tables')
assert.ok(/FROM\s+public\.admin_2fa\b/i.test(code) && !/\b(SECRET|BACKUP_CODES)\b/.test(upper), 'the 2FA table is read, but no secret-bearing column can be named in the query text')
assert.ok(!/SELECT\s+\*\s+FROM\s+public\./i.test(code), 'no SELECT * from an application table')
assert.ok(literals.some((l) => /secret|backup_codes/.test(l)), 'secret column NAMES are inspected as metadata (information_schema.columns) only')

// 7. Shape: the three sections, the verdict vocabulary, and the output columns.
for (const w of ['BLOCKER', 'REVIEW', 'OK-ISH', 'PUBLIC-CMS', 'TABLE NOT FOUND']) assert.ok(literals.includes(w), `verdict present: ${w}`)
assert.match(code, /SELECT section, object, finding\s+FROM \(/, 'one three-column result set')
assert.match(code, /\) u\s+ORDER BY/, 'ORDER BY is applied to the wrapped UNION (expressions are not allowed directly on a UNION)')
assert.match(code, /pg_class c JOIN pg_namespace n/, 'RLS flags come from pg_class / pg_namespace')
assert.match(code, /relforcerowsecurity/, 'forced-RLS is read from pg_class (pg_tables has no such column)')
assert.doesNotMatch(upper, /\bPG_TABLES\b/, 'pg_tables is not used')

// 8. Every table the browser code touches that this script claims to cover is present (spot-check the critical ones).
const wantedTables = literals.filter((l) => /^[a-z_0-9]+$/.test(l))
for (const t of ['email_settings', 'admin_2fa', 'admin_users', 'contact_submissions', 'clients', 'merchants', 'growth_reviews', 'portal_invitations', 'blog_posts', 'portfolio_items']) assert.ok(wantedTables.includes(t), `covered table: ${t}`)
const listed = [...raw.matchAll(/\('([a-z_0-9]+)',\s*'(?:secret|private|cms)'\)/g)].map((m) => m[1]).filter((t) => !['secret', 'private', 'cms'].includes(t))
assert.equal(new Set(listed).size, listed.length, 'no table listed twice in the VALUES list'); assert.ok(listed.length >= 50, 'the full table list is present (' + listed.length + ')')

// 9. The header says plainly that it is unexecuted, unparsed and read-only.
assert.match(raw, /NOT EXECUTED and NOT PARSED/); assert.match(raw, /READ-ONLY/)

assert.ok(/ADMIN-WRITE/.test(raw) && /<UNRESTRICTED>/.test(raw) && /<admin-checked>/.test(raw), 'v2 verdicts: ADMIN-WRITE and the <UNRESTRICTED> / <admin-checked> policy tags exist')
console.log(`PASS: preflight SQL static contract - single read-only WITH/SELECT, ${new Set(sources).size} metadata sources, ${wantedTables.length} table/class literals, no secret value selectable, no write/lock/setting/file function. (Static check only: NOT a PostgreSQL parse.)`)
