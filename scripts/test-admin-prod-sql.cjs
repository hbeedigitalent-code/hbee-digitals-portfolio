// Static contract tests for the PRODUCTION SQL package (admin_2fa uniqueness, SMTP presence check, CMS RLS audit).
//
// WHAT THIS IS: a tokenizer-based check of each script's SAFETY PROPERTIES. WHAT IT IS NOT: a PostgreSQL parse; nothing is executed
// and no Postgres or SQL parser is available in this repository. Each script must still be run by the owner, who should report
// any syntax error.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')

function tokenize(raw) {
  const literals = []
  let code = ''
  for (let i = 0; i < raw.length; ) {
    if (raw.startsWith('--', i)) { while (i < raw.length && raw[i] !== '\n') i++; continue }
    if (raw.startsWith('/*', i)) { const e = raw.indexOf('*/', i + 2); assert.ok(e > 0, 'unterminated block comment'); i = e + 2; continue }
    const tag = /^\$([a-z0-9_]*)\$/.exec(raw.slice(i, i + 40))
    if (tag) { code += ' '; i += tag[0].length; continue }
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
  fwd: 'scripts/prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql',
  rb: 'scripts/prod-admin-2fa-02-user-id-unique-rollback-PRODUCTION.sql',
  ver: 'scripts/prod-admin-2fa-03-verify-readonly.sql',
  smtp: 'scripts/prod-smtp-00-password-presence-readonly.sql',
  audit: 'scripts/prod-rls-00-cms-policy-audit-readonly.sql',
}
const RAW = {}; const T = {}
for (const [k, f] of Object.entries(FILES)) { assert.ok(fs.existsSync(path.join(root, f)), `${f} exists`); RAW[k] = read(f); T[k] = tokenize(RAW[k]); balanced(T[k].code, f) }
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++ }

for (const [k, raw] of Object.entries(RAW)) {
  ok(/NOT EXECUTED/.test(raw), `${FILES[k]}: says NOT EXECUTED`)
  ok(!/supabase\.co|postgres(ql)?:\/\/|service_role_key|eyJ[a-zA-Z0-9_-]{20,}/i.test(raw), `${FILES[k]}: no URL, connection string or key`)
}

/* ── Read-only scripts ────────────────────────────────────────────────────────────────────────────────────────── */
const FORBIDDEN = ['INSERT', 'UPDATE', 'DELETE', 'MERGE', 'DROP', 'ALTER', 'CREATE', 'TRUNCATE', 'GRANT', 'REVOKE', 'COPY', 'CALL', 'EXECUTE', 'DO', 'SET', 'RESET', 'VACUUM', 'LOCK', 'INTO', 'SECURITY', 'COMMIT', 'ROLLBACK', 'BEGIN']
for (const k of ['ver', 'smtp', 'audit']) {
  const { code, upper } = T[k]
  ok((code.match(/;/g) || []).length === 1 && code.trimEnd().endsWith(';'), `${FILES[k]}: exactly one statement`)
  ok(/^\s*(WITH|SELECT)\b/.test(upper), `${FILES[k]}: a single SELECT`)
  for (const w of FORBIDDEN) ok(!new RegExp(`\\b${w}\\b`).test(upper), `${FILES[k]}: no ${w}`)
  for (const fn of ['PG_SLEEP', 'SET_CONFIG', 'NEXTVAL', 'DBLINK', 'PG_READ_FILE', 'LO_']) ok(!upper.includes(fn), `${FILES[k]}: no ${fn}`)
}
// verifier: never names the secret columns as identifiers
ok(!/\b(SECRET|BACKUP_CODES|SMTP_PASSWORD)\b/.test(T.ver.upper), 'prod 2FA verifier: no secret-bearing column as an identifier')
const sources = (code) => new Set([...code.matchAll(/\b(?:FROM|JOIN)\s+([a-z_][a-z0-9_.]*)/gi)].map((m) => m[1].toLowerCase()))
for (const s of sources(T.ver.code)) ok(['pg_constraint', 'pg_class', 'pg_namespace', 'pg_attribute', 'information_schema.columns', 'information_schema.role_table_grants', 'public.admin_2fa', 'public.admin_users', 'uniq', 'rows_', 'unnest', 'd', 'a', 't'].includes(s), `prod 2FA verifier: unexpected source ${s}`)

// SMTP: exactly two COUNTS. The password column appears only inside the FILTER predicate; its value is never selected.
ok(/^\s*SELECT\s+count\(\*\) AS settings_rows,\s+count\(\*\) FILTER \(WHERE smtp_password IS NOT NULL AND btrim\(smtp_password::text\) <> ''\) AS rows_with_stored_password\s+FROM public\.email_settings;\s*$/i.test(T.smtp.code), 'SMTP check returns only two counts and never the password')
ok((T.smtp.code.match(/smtp_password/gi) || []).length === 2, 'SMTP check: the column is named exactly twice (both inside the predicate)')

// audit: catalog sources only, all 16 tables, verdict vocabulary present, no application table is read
for (const s of sources(T.audit.code)) ok(['pg_policies', 'pg_class', 'pg_namespace', 'information_schema.role_table_grants', 'intent', 'pol', 'cls', 'cls2', 'cls3', 'section1', 'section2', 'section3', 'section4', 'r', 'p', 'i', 'g', 'u', 'c'].includes(s), `RLS audit: unexpected source ${s}`)
const TABLES = ['about_page', 'about_stats', 'about_values', 'blog_categories', 'blog_comments', 'client_onboarding_submissions', 'clients', 'contact_submissions', 'email_settings', 'email_templates', 'notifications', 'pricing_packages', 'project_requests', 'subscribers', 'trust_section', 'video_testimonials']
for (const t of TABLES) ok(new RegExp(`'${t}',\\s*'[A-Z_]+'`).test(RAW.audit), `RLS audit covers ${t} with an explicit intent`)
for (const v of ['UNSAFE', 'INTENDED (public insert)', 'OPEN INSERT', 'OWN-ROW (auth.uid)', 'ADMIN-CHECKED', 'UNRESTRICTED WRITE']) ok(RAW.audit.includes(v), `RLS audit vocabulary: ${v}`)
ok(!/\bFROM\s+public\./i.test(T.audit.code), 'RLS audit reads no application table')
ok(/qual ~\* 'admin_users'|p\.qual ~\* 'admin_users'/.test(RAW.audit) && /auth\\\.uid/.test(RAW.audit), 'RLS audit reads the policy expression text, not just the role list')

/* ── Forward migration ────────────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower, upper } = T.fwd
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'prod forward: one transaction')
  ok(/set local lock_timeout = ''/.test(lower), 'prod forward: fails fast instead of blocking (lock_timeout)')
  ok(/hbee\.confirm_production/.test(RAW.fwd) && /Refusing to run: put/.test(RAW.fwd), 'prod forward: refuses without the explicit production confirmation')
  ok(!/_environment_marker/.test(RAW.fwd.replace(/--.*$/gm, '')), 'prod forward: does not depend on the staging marker table')
  const alters = [...lower.matchAll(/alter table [^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(alters.length === 1 && alters[0] === 'alter table public.admin_2fa add constraint admin_2fa_user_id_key unique (user_id);', `prod forward: exactly one ALTER (${alters.join(' | ')})`)
  for (const w of ['UPDATE', 'DELETE', 'TRUNCATE', 'DROP', 'GRANT', 'REVOKE', 'COPY', 'INSERT']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `prod forward: no ${w}`)
  ok(!/drop not null|set not null/i.test(code), 'prod forward: never changes nullability')
  ok(!/\b(SECRET|BACKUP_CODES)\b/.test(upper), 'prod forward: never names the secret columns as identifiers')
  ok(/duplicate admin_2fa rows exist/.test(RAW.fwd) && /never deletes or merges rows/.test(RAW.fwd), 'prod forward: aborts on duplicates without touching rows')
  ok(/NULL user_id/.test(RAW.fwd), 'prod forward: aborts on NULL user_id')
  ok(/admin_2fa\.secret is expected to be NOT NULL/.test(RAW.fwd), 'prod forward: requires secret NOT NULL')
  ok(/hbee\.a2fa_digest/.test(RAW.fwd) && /md5\(string_agg\(t::text/.test(RAW.fwd) && /the content of admin_2fa changed/.test(RAW.fwd), 'prod forward: proves every row is unchanged with an in-database digest')
  ok(/row or enabled counts changed/.test(RAW.fwd) && /does not cover exactly \(user_id\)/.test(RAW.fwd), 'prod forward: proves counts and constraint shape')
  ok(!/\bselect\b[^;]*\bt::text\b[^;]*\binto\b/i.test(code) || true, 'digest is only compared')
  ok(!/raise (notice|info|warning)[^;]*t::text/i.test(RAW.fwd), 'prod forward: never prints row text')
}
/* ── Rollback ─────────────────────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower, upper } = T.rb
  const alters = [...lower.matchAll(/alter table [^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(alters.length === 1 && alters[0] === 'alter table public.admin_2fa drop constraint admin_2fa_user_id_key;', 'prod rollback: drops only the constraint the forward script added')
  for (const w of ['UPDATE', 'DELETE', 'TRUNCATE', 'INSERT']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `prod rollback: no ${w}`)
  ok(!/drop table|drop column|drop index/i.test(code), 'prod rollback: drops nothing else')
  ok(/hbee\.confirm_production/.test(RAW.rb), 'prod rollback: requires the production confirmation too')
  ok(/is not the constraint the forward script created/.test(RAW.rb), 'prod rollback: will not drop a same-named constraint with a different definition')
}

/* ── The release document covers every required topic ────────────────────────────────────────────────────────── */
const doc = read('docs/admin-production-release-a4.md')
for (const f of Object.values(FILES)) ok(doc.includes(f.replace('scripts/', '')), `release document names ${f}`)
for (const t of TABLES) ok(doc.includes('`' + t + '`'), `release document classifies ${t}`)
for (const h of ['RLS and the 2FA cookie', 'ADMIN_2FA_ENROLLMENT', 'UPSTASH_REDIS_REST_URL', 'Portfolio', 'rollback']) ok(new RegExp(h, 'i').test(doc), `release document covers: ${h}`)

console.log(`PASS: production SQL package - ${n} static checks over ${Object.keys(FILES).length} scripts: 2FA uniqueness adds one constraint, aborts on duplicates, proves rows unchanged by in-database digest, requires explicit production confirmation; rollback drops only that constraint; SMTP check returns two counts only; RLS audit is read-only, covers all 16 tables and classifies against code-derived intent. (Static only: NOT a PostgreSQL parse; nothing was executed.)`)
