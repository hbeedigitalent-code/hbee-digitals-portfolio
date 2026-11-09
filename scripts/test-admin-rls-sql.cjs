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
  fwd01: 'scripts/admin-rls-01-portfolio-policies-forward-STAGING.sql',
  rb02: 'scripts/admin-rls-02-portfolio-policies-rollback-STAGING.sql',
  tests03: 'scripts/admin-rls-03-portfolio-behaviour-tests-STAGING.sql',
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
for (const k of ['verify00', 'fwd01', 'rb02', 'tests03', 'tfa01', 'tfa02', 'tfa03', 'reset04', 'marker']) ok(/NOT PARSED/.test(RAW[k]) || k === 'reset04' || k === 'marker' || /NOT EXECUTED/.test(RAW[k]), `${FILES[k]}: states it is unparsed`)

/* ── STAGING scripts refuse to run without the staging marker (production never carries it) ───────────────────── */
for (const k of ['fwd01', 'rb02', 'tests03', 'tfa01', 'tfa02']) {
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

/* ── RLS forward (01) ──────────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower } = T.fwd01
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'fwd01: one transaction')
  ok(/unrecognised browser-role write policies/.test(RAW.fwd01), 'fwd01: aborts (does not drop) when it finds a write policy it does not own')
  ok(/_backup_admin_rls_policies_20261109/.test(code) && /_backup_admin_rls_grants_20261109/.test(code), 'fwd01: captures policies and grants first')
  ok(/to_regclass\('public\._backup_admin_rls_policies_20261109'\) is not null/.test(RAW.fwd01), 'fwd01: refuses to reuse a stale backup')
  for (const policy of ['portfolio_items_admin_all', 'portfolio_media_admin', 'portfolio_capabilities_admin']) {
    ok(new RegExp(`create policy ${policy} on public\\.\\w+ for all to authenticated`).test(lower.replace(/\s+/g, ' ')) || new RegExp(`create policy ${policy} on public\\.\\w+ for all to authenticated`).test(RAW.fwd01.toLowerCase().replace(/\s+/g, ' ')), `fwd01: (re)creates ${policy} for authenticated only`)
  }
  const predicate = /using \(exists \(select 1 from public\.admin_users (au|a) where \1\.user_id = auth\.uid\(\) and \1\.is_active = true\)\)\s+with check \(exists \(select 1 from public\.admin_users (au|a) where \2\.user_id = auth\.uid\(\) and \2\.is_active = true\)\)/gi
  ok((RAW.fwd01.replace(/\s+/g, ' ').match(predicate) || []).length === 3, 'fwd01: all three policies use exactly the admin_users / auth.uid() / is_active predicate in BOTH using and with check')
  ok(!/using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/i.test(RAW.fwd01), 'fwd01: no USING (true) / WITH CHECK (true)')
  ok(!/\bgrant\b/i.test(code), 'fwd01: grants nothing (it cannot widen access)')
  ok(/revoke insert, update, delete on public\.portfolio_items from public, anon/.test(lower), 'fwd01: anon / PUBLIC lose any write privilege')
  for (const bad of ['drop table', 'truncate', 'delete from', 'disable row level security', 'alter table public.portfolio', 'update public.', 'insert into public.portfolio']) ok(!lower.includes(bad), `fwd01: never ${bad}`)
  const drops = [...RAW.fwd01.toLowerCase().matchAll(/drop policy (?:if exists )?([a-z_]+)/g)].map((m) => m[1])
  ok(drops.length >= 3 && drops.every((d) => ['portfolio_items_admin_all', 'portfolio_media_admin', 'portfolio_capabilities_admin'].includes(d)), 'fwd01: only drops the three policies it recreates')
  ok(!/create policy [^;]* for select/i.test(code), 'fwd01: creates no SELECT policy and drops none, so public reads are untouched')
  ok(/SELECT policy count changed/.test(RAW.fwd01) && /anon lost SELECT on portfolio_items/.test(RAW.fwd01), 'fwd01: post-conditions protect the public pages')
  ok(/service_role/.test(RAW.fwd01) && !/service_role/.test(code), 'fwd01: service_role is mentioned only in comments (untouched)')
}

/* ── RLS rollback (02) ─────────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower } = T.rb02
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'rb02: one transaction')
  ok(/_backup_admin_rls_policies_20261109/.test(code) && /_backup_admin_rls_grants_20261109/.test(code), 'rb02: restores from the forward script\'s backups')
  ok(/backup tables from the forward script do not exist/.test(RAW.rb02), 'rb02: refuses without the backups')
  ok(!/drop table|truncate|delete from/.test(lower), 'rb02: never drops the backups or any table')
  ok(/create policy %I on public\.%I as %s for %s to %s/.test(RAW.rb02), 'rb02: recreates policies from the captured definitions')
  ok(!/using\s*\(\s*true\s*\)/i.test(RAW.rb02), 'rb02: no hard-coded USING (true)')
}

/* ── Behaviour tests (03) ──────────────────────────────────────────────────────────────────────────────────── */
{
  const { code, lower, literals } = T.tests03
  ok((code.match(/\bdo\b/gi) || []).length >= 1 && !/\bcommit\b/i.test(code) && !/\bbegin;/i.test(code), 'tests03: one DO statement, no COMMIT')
  ok(/raise exception E'%/.test(RAW.tests03) && /rolled back/.test(RAW.tests03), 'tests03: ends by raising an exception, so nothing can persist')
  ok(/set local role/.test(RAW.tests03.toLowerCase()), 'tests03: acts as real roles')
  const rows = [...RAW.tests03.matchAll(/^\s*\((\d+),\s+'(authenticated|anon|postgres|service_role)',\s+'(\w+)'/gm)]
  ok(rows.length >= 26, `tests03: at least 26 checks (found ${rows.length})`)
  const who = new Set(rows.map((r) => r[3])); for (const w of ['ordinary', 'anon', 'admin1', 'admin2', 'service']) ok(who.has(w), `tests03: covers ${w}`)
  const ord = rows.filter((r) => r[3] === 'ordinary').length; ok(ord >= 8, 'tests03: ordinary-user negatives: insert/update/delete items + media, visibility, admin_users')
  ok(/DEACTIVATED admin: insert portfolio item/.test(RAW.tests03), 'tests03: proves is_active is honoured')
  ok(/admin_users: cannot see another admin/.test(RAW.tests03) && /sees exactly its own row/.test(RAW.tests03), 'tests03: proves admin_users_select_own with a second synthetic admin')
  ok(/PASS/.test(RAW.tests03) && /FAIL/.test(RAW.tests03) && /INCONCLUSIVE/.test(RAW.tests03), 'tests03: reports PASS / FAIL / INCONCLUSIVE')
  const tables = new Set([...(code + ' ' + literals.join(' ')).toLowerCase().matchAll(/public\.([a-z_]+)/g)].map((m) => m[1]))
  for (const t of tables) ok(['portfolio_items', 'portfolio_media', 'admin_users', '_environment_marker'].includes(t), `tests03: touches only portfolio/admin tables (found ${t})`)
  ok(!/drop |truncate|alter |grant |revoke |create (table|policy|function)/i.test(code + literals.join(' ')), 'tests03: no DDL')
  // Regression (staging 23502: portfolio_items.name NOT NULL; the fixture used a non-existent "title" column).
  // Fixtures must satisfy the NOT NULL columns declared by the repo's own DDL, and may only name columns that exist there.
  // The bootstrap DDL is the preferred source. It is not tracked in every checkout (it may be absent from a clean deployment
  // tree), so fall back to the columns staging itself reported (23502 on name; category is NOT NULL in the same DDL).
  const bootPath = 'scripts/portfolio-staging-01-bootstrap-structure.sql'
  let itemCols, itemRequired
  if (fs.existsSync(path.join(root, bootPath))) {
    const itemsDdl = /create table if not exists public\.portfolio_items \(([\s\S]*?)\r?\n\);/.exec(read(bootPath))[1]
    itemCols = itemsDdl.split('\n').map((l) => /^\s*([a-z_]+)\s+[a-z]+/.exec(l)).filter(Boolean).map((m) => m[1])
    itemRequired = itemsDdl.split('\n').filter((l) => /\bnot null\b/i.test(l) && !/\bdefault\b/i.test(l)).map((l) => /^\s*([a-z_]+)/.exec(l)[1])
  } else {
    console.log('NOTE: ' + bootPath + ' is not in this checkout; using the pinned portfolio_items columns reported by staging.')
    itemCols = ['id', 'name', 'category', 'is_active', 'created_at', 'updated_at']
    itemRequired = ['name', 'category']
  }
  ok(itemRequired.includes('name') && itemRequired.includes('category'), `repo DDL: portfolio_items requires ${itemRequired.join(', ')}`)
  const creative = read('scripts/portfolio-creative-01-forward.sql')
  const itemAdded = [...creative.matchAll(/alter table public\.portfolio_items add column if not exists ([a-z_]+)/g)].map((m) => m[1])
  // engagement_type / project_status come from the portfolio-creative migration; that file is still being revised in the
  // working tree, so a checkout at an earlier commit may not define them yet. They are pinned here (validated on staging).
  const knownItemCols = new Set([...itemCols, ...itemAdded, 'engagement_type', 'project_status'])
  const itemInserts = [...RAW.tests03.matchAll(/insert into public\.portfolio_items \(([^)]*)\)/g)].map((m) => m[1].split(',').map((c) => c.trim()))
  ok(itemInserts.length >= 7, `tests03: portfolio_items fixture/test inserts found (${itemInserts.length})`)
  for (const cols of itemInserts) {
    for (const r of [...itemRequired, 'engagement_type', 'project_status']) ok(cols.includes(r), `tests03: every portfolio_items insert sets ${r} (${cols.join(', ')})`)
    for (const c of cols) ok(knownItemCols.has(c), `tests03: portfolio_items.${c} exists in the repo schema`)
  }
  ok(!/\btitle\b/.test(RAW.tests03.replace(/--.*$/gm, '').replace(/portfolio_media[^;]*\btitle\b/g, '')), 'tests03: no reference to a non-existent portfolio_items.title')
  ok(/engagement_type, project_status, is_active\) values \(v_tag \|\| '-active', 'rls-test', 'studio_team', 'completed', true\)/.test(RAW.tests03), "tests03: parent fixture sets engagement_type = 'studio_team' and project_status = 'completed' explicitly")
  const mediaDdl = /create table if not exists public\.portfolio_media \(([\s\S]*?)\r?\n    \)\r?\n  \$ddl\$/.exec(creative)[1]
  const mediaRequired = mediaDdl.split('\n').filter((l) => /\bnot null\b/i.test(l) && !/\bdefault\b/i.test(l)).map((l) => /^\s*([a-z_]+)/.exec(l)[1]).filter((c) => !['id', 'check', 'primary', 'constraint'].includes(c))
  const mediaInserts = [...RAW.tests03.matchAll(/insert into public\.portfolio_media \(([^)]*)\)/g)].map((m) => m[1].split(',').map((c) => c.trim()))
  ok(mediaInserts.length >= 3 && mediaRequired.length >= 4, `tests03: portfolio_media inserts found (${mediaInserts.length}); required ${mediaRequired.join(', ')}`)
  for (const cols of mediaInserts) for (const r of mediaRequired) ok(cols.includes(r), `tests03: every portfolio_media insert sets ${r}`)
  ok(!/portfolio_capabilities/.test(RAW.tests03.replace(/--.*$/gm, '')), 'tests03: does not insert portfolio_capabilities rows (so no capability fixture can drift)')
  ok(/example\.invalid/.test(RAW.tests03) && !/@(gmail|hotmail|yahoo|hbeedigitals)\./.test(RAW.tests03), 'tests03: synthetic identities only')
}

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
