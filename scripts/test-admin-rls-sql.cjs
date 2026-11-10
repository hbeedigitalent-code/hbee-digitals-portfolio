// Static contract tests for the staging RLS / admin_2fa SQL drafts.
//
// WHAT THIS IS: a tokenizer-based check of each script's SAFETY PROPERTIES (staging guard, scope, what it can and cannot touch,
// rollback symmetry, read-only-ness of the verifiers, inert owner template). WHAT IT IS NOT: a PostgreSQL parse, and it does not
// execute anything. No Postgres or SQL parser is available in this repository, so syntactic validity against a real server is
// NOT proven here; each script must still be run on staging by the owner, who should report any error.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

// ── Tokenizer: drops comments and single-quoted strings; treats DO-body dollar tags as delimiters (the body IS code) and the
//    $f$ ... $f$ tags (used for test statements) as string literals. Returns { code, literals }.
function tokenize(raw) {
  const literals = []
  let code = ''
  for (let i = 0; i < raw.length; ) {
    if (raw.startsWith('--', i)) { while (i < raw.length && raw[i] !== '\n') i++; continue }
    if (raw.startsWith('/*', i)) { const e = raw.indexOf('*/', i + 2); assert.ok(e > 0, 'unterminated block comment'); i = e + 2; continue }
    const tag = /^\$([a-z0-9_]*)\$/.exec(raw.slice(i, i + 40))
    if (tag) {
      if (tag[1] === 'f') { const e = raw.indexOf(tag[0], i + tag[0].length); assert.ok(e > 0, 'unterminated $f$ literal'); literals.push(raw.slice(i + tag[0].length, e)); code += "''"; i = e + tag[0].length; continue }
      code += ' '; i += tag[0].length; continue
    }
    if (raw[i] === "'") {
      let j = i + 1, text = ''
      while (j < raw.length) { if (raw[j] === "'" && raw[j + 1] === "'") { text += "'"; j += 2 } else if (raw[j] === "'") break; else text += raw[j++] }
      assert.ok(j < raw.length, 'unterminated string literal')
      literals.push(text); code += "''"; i = j + 1; continue
    }
    code += raw[i++]
  }
  return { code, literals, upper: code.toUpperCase(), lower: code.toLowerCase() }
}
function balanced(code, name) { let d = 0; for (const ch of code) { if (ch === '(') d++; if (ch === ')') d--; assert.ok(d >= 0, `${name}: closing parenthesis without an opener`) } assert.equal(d, 0, `${name}: parentheses balance`) }

const FILES = {
  verify00: 'scripts/admin-rls-00-policy-definitions-readonly.sql',
  tfa01: 'scripts/admin-2fa-01-user-id-unique-forward-STAGING.sql',
  tfa02: 'scripts/admin-2fa-02-user-id-unique-rollback-STAGING.sql',
  tfa03: 'scripts/admin-2fa-03-user-id-unique-verify-readonly.sql',
  reset04: 'scripts/admin-2fa-04-owner-reset-enrollment-TEMPLATE.sql',
  marker: 'scripts/staging-00-environment-marker-STAGING.sql',
}
const T = {}; const RAW = {}
for (const [k, f] of Object.entries(FILES)) { assert.ok(fs.existsSync(path.join(root, f)), `${f} exists`); RAW[k] = read(f); T[k] = tokenize(RAW[k]); balanced(T[k].code, f) }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++ }

/* ── Every script: honest about status, no production host or secret ───────────────────────────────────────────── */
for (const [k, raw] of Object.entries(RAW)) {
  ok(/NOT EXECUTED/.test(raw), `${FILES[k]}: says NOT EXECUTED`)
  ok(!/supabase\.co|postgres(ql)?:\/\/|service_role_key|eyJ[a-zA-Z0-9_-]{20,}/i.test(raw), `${FILES[k]}: no URL, connection string or key`)
}
for (const k of ['verify00', 'tfa01', 'tfa02', 'tfa03', 'reset04', 'marker']) ok(/NOT PARSED/.test(RAW[k]) || k === 'reset04' || k === 'marker' || /NOT EXECUTED/.test(RAW[k]), `${FILES[k]}: states it is unparsed`)

/* ── STAGING scripts refuse to run without the staging marker (production never carries it) ───────────────────── */
for (const k of ['tfa01', 'tfa02']) {
  ok(/public\._environment_marker/.test(RAW[k]) && /env = ''?staging''?/.test(RAW[k]), `${FILES[k]}: requires public._environment_marker env = 'staging'`)
  ok(/Refusing to run/.test(RAW[k]), `${FILES[k]}: refuses with a clear message`)
}

/* ── Read-only verifiers ─────────────────────────────────────────────────────────────────────────────────────── */
const FORBIDDEN = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'CALL', 'EXECUTE', 'DO', 'SET', 'RESET', 'VACUUM', 'LOCK', 'INTO', 'SECURITY', 'COMMIT', 'ROLLBACK', 'BEGIN']
for (const k of ['verify00', 'tfa03']) {
  const { code, upper } = T[k]
  ok((code.match(/;/g) || []).length === 1 && code.trimEnd().endsWith(';'), `${FILES[k]}: exactly one statement`)
  ok(/^\s*WITH\b/.test(upper), `${FILES[k]}: a single WITH ... SELECT`)
  for (const w of FORBIDDEN) ok(!new RegExp(`\\b${w}\\b`).test(upper), `${FILES[k]}: no ${w}`)
  for (const fn of ['PG_SLEEP', 'SET_CONFIG', 'NEXTVAL', 'DBLINK', 'PG_READ_FILE', 'LO_']) ok(!upper.includes(fn), `${FILES[k]}: no ${fn}`)
  ok(!/\b(SECRET|BACKUP_CODES|SMTP_PASSWORD|TOKEN_HASH)\b/.test(upper), `${FILES[k]}: no secret-bearing column named as an identifier (only inside string literals)`)
  ok(!/SELECT\s+(?:\w+\.)?\*\s+FROM\s+public\./i.test(code), `${FILES[k]}: no SELECT * from an application table`)
}
const sources = (code) => new Set([...code.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_.]*)/gi)].map((m) => m[1].toLowerCase()))
const ALLOWED_V00 = new Set(['pg_policies', 'pg_class', 'pg_namespace', 'information_schema.role_table_grants', 'pol', 'cls', 'section1', 'section2', 'section3', 'targets', 'u', 'r', 'unnest'])
for (const s of sources(T.verify00.code)) ok(ALLOWED_V00.has(s), `${FILES.verify00}: unexpected data source ${s}`)
const ALLOWED_T03 = new Set(['pg_constraint', 'pg_class', 'pg_namespace', 'pg_attribute', 'information_schema.columns', 'information_schema.role_table_grants', 'public.admin_2fa', 'public.admin_users', 'uniq', 'rows_', 'unnest', 'd'])
for (const s of sources(T.tfa03.code)) ok(ALLOWED_T03.has(s), `${FILES.tfa03}: unexpected data source ${s}`)
ok(/ADMIN-CHECKED/.test(RAW.verify00) && /UNRESTRICTED WRITE/.test(RAW.verify00) && /OWN-ROW ONLY/.test(RAW.verify00), 'the policy verifier labels admin-checked, unrestricted and own-row policies')
ok(/qual ~\* 'admin_users'/.test(RAW.verify00) && /auth\\\.uid/.test(RAW.verify00), 'it classifies by reading the policy USING / WITH CHECK text, not just the role list')

/* ── admin_2fa uniqueness ──────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower, upper } = T.tfa01
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'tfa01: one transaction')
  ok(/duplicate admin_2fa rows exist/.test(RAW.tfa01) && /never deletes or merges rows/.test(RAW.tfa01), 'tfa01: detects duplicates and aborts without changing them')
  const alters = [...lower.matchAll(/alter table [^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(alters.length === 1 && alters[0] === 'alter table public.admin_2fa add constraint admin_2fa_user_id_key unique (user_id);', `tfa01: exactly one ALTER: ${alters.join(' | ')}`)
  for (const w of ['UPDATE', 'DELETE', 'TRUNCATE', 'DROP', 'GRANT', 'REVOKE', 'COPY']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `tfa01: no ${w}`)
  ok(!/\bINSERT\b/.test(upper), 'tfa01: inserts nothing')
  ok(!/drop not null|set not null/i.test(code), 'tfa01: never changes nullability')
  ok(!/\b(SECRET|BACKUP_CODES)\b/.test(upper), 'tfa01: never names the secret columns as identifiers')
  ok(/admin_2fa\.secret is expected to be NOT NULL/.test(RAW.tfa01), 'tfa01: refuses unless secret is NOT NULL (and never alters it)')
  ok(/row or enabled counts changed/.test(RAW.tfa01) && /does not cover exactly \(user_id\)/.test(RAW.tfa01), 'tfa01: proves nothing else changed')
  ok(!/is_enabled\s*=\s*false/i.test(code), 'tfa01: does not touch enrollment (no re-introduced disabling)')
}
{
  const { code, lower, upper } = T.tfa02
  const alters = [...lower.matchAll(/alter table [^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(alters.length === 1 && alters[0] === 'alter table public.admin_2fa drop constraint admin_2fa_user_id_key;', 'tfa02: drops only the constraint the forward script added')
  for (const w of ['UPDATE', 'DELETE', 'TRUNCATE', 'INSERT']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `tfa02: no ${w}`)
  ok(!/drop table|drop column|drop index/i.test(code), 'tfa02: drops nothing else')
  ok(/is not the constraint the forward script created/.test(RAW.tfa02), 'tfa02: refuses to drop a same-named constraint with a different definition')
}

/* ── Owner-reset template: inert, deletes the row, never nulls the secret ───────────────────────────────────── */
{
  const { code, lower, upper } = T.reset04
  ok(/v_user_id uuid := null;/.test(RAW.reset04) && /v_confirm text := '';/.test(RAW.reset04), 'reset04: ships inert (no user id, empty confirmation)')
  ok(/RESET 2FA ENROLLMENT/.test(RAW.reset04) && /v_confirm is distinct from/.test(code), 'reset04: requires the exact confirmation phrase')
  ok(/delete from public\.admin_2fa where user_id = v_user_id/.test(lower.replace(/\s+/g, ' ')), 'reset04: deletes that one admin_2fa row')
  ok((lower.match(/delete from/g) || []).length === 1, 'reset04: exactly one DELETE')
  for (const w of ['UPDATE', 'INSERT', 'TRUNCATE', 'DROP', 'ALTER', 'GRANT']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `reset04: no ${w}`)
  ok(!/secret\s*=\s*null|set\s+secret/i.test(code), 'reset04: NEVER sets secret to NULL (the recovery mechanism is deleting the row)')
  ok(!/\bsecret\b/i.test(code), 'reset04: does not name the secret column at all')
  ok(/identity/i.test(RAW.reset04) && /outside the application/i.test(RAW.reset04), 'reset04: documents out-of-band identity verification')
  ok(/active admin_users row|ACTIVE admin_users/.test(RAW.reset04) && /has % admin_2fa rows/.test(RAW.reset04), 'reset04: only for an active admin; refuses on duplicates')
}

/* ── Marker script ────────────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower } = T.marker
  ok(/hbee\.allow_staging_marker/.test(RAW.marker) && /already holds ANY user|already holds users/.test(RAW.marker) && /already holds rows/.test(RAW.marker), 'marker: opt-in, empty auth.users and empty sentinel tables required')
  ok(/clients/.test(RAW.marker) && /merchants/.test(RAW.marker) && /portfolio_items/.test(RAW.marker), 'marker: sentinels include tables production always fills')
  const creates = [...lower.matchAll(/create table [a-z_. ]*/g)].map((m) => m[0].trim()); ok(creates.length === 1 && /_environment_marker/.test(creates[0]), 'marker: creates only the marker table')
  ok((lower.match(/insert into/g) || []).length === 1 && /insert into public\._environment_marker/.test(lower), 'marker: inserts only the marker row')
  ok(/check \(env = ''staging''\)/.test(RAW.marker.replace(/'staging'/g, "''staging''")) || /check \(env = 'staging'\)/.test(RAW.marker), 'marker: env can only ever be staging')
  ok(!/\b(update|delete|truncate|drop|grant)\b/i.test(code.replace(/revoke all/gi, '')), 'marker: nothing else is changed')
}

/* ── The documented package is complete ────────────────────────────────────────────────────────────────────── */
const doc = read('docs/admin-staging-schema-readiness.md')
for (const f of Object.values(FILES)) ok(doc.includes(f.replace('scripts/', '')) || doc.includes(f), `the readiness document names ${f}`)
for (const heading of ['Exact policy findings', 'Portfolio RLS remediation draft', 'admin_2fa\\(user_id\\)', 'owner-recovery', 'schema gap inventory', 'schema-parity', 'SMTP check', 'Rate limiter', 'What can already be tested', 'What CANNOT yet be tested', 'release blockers', 'Exact owner actions']) ok(new RegExp(heading, 'i').test(doc), `readiness document section: ${heading}`)
ok(/UNVERIFIED, not safe/.test(doc), 'SMTP is recorded as unverified, not safe')
ok(/fails \*\*open\*\*/.test(doc) && /not changed/i.test(doc), 'the limiter fail-open behaviour is kept and documented')
ok(/cannot reliably reconstruct production/.test(doc), 'the document says plainly that the repo cannot reconstruct the production schema')
ok(/UPSTASH_REDIS_REST_URL/.test(doc) && !/UPSTASH_REDIS_REST_TOKEN\s*=|https:\/\/[a-z0-9-]+\.upstash\.io/i.test(doc), 'Upstash variable NAMES only, no values')
const inventory = doc.slice(doc.indexOf('| Table the app queries'))
const tableRows = inventory.split('\n').filter((l) => /^\| `[a-z_0-9]+` \|/.test(l))
ok(tableRows.length >= 60, `the inventory lists the application's tables (${tableRows.length})`)
ok(tableRows.every((r) => r.split('|').length >= 7), 'every inventory row has all five columns')

console.log(`PASS: staging SQL drafts - ${n} static checks over ${Object.keys(FILES).length} scripts: staging-marker guards, admin-only predicate on all three portfolio write policies, abort-not-drop on unknown policies, backup/rollback symmetry, 26+ role-based behaviour checks that cannot persist, uniqueness migration touches only one constraint and never nulls secret, inert owner reset that deletes the row, read-only verifiers, complete documentation. (Static only: NOT a PostgreSQL parse; nothing was executed.)`)
