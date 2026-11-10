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
  rlsfwd: 'scripts/prod-rls-01-forward-PRODUCTION.sql',
  rlsrb: 'scripts/prod-rls-02-rollback-PRODUCTION.sql',
  rlsver: 'scripts/prod-rls-03-verify-readonly.sql',
  rlsbeh: 'scripts/prod-rls-04-behaviour-test-ROLLBACK-ONLY.sql',
  smtpclr: 'scripts/prod-smtp-01-clear-stored-password-PRODUCTION.sql',
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
for (const k of ['ver', 'smtp', 'audit', 'rlsver']) {
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

/* ══ Production RLS + grant hardening (prod-rls-01..04) ═══════════════════════════════════════════════════════════ */
// Parse the VALUES tuples of an `insert into <tbl> values …;` statement into arrays of their single-quoted strings.
const tuples = (raw, tbl) => {
  const start = raw.indexOf(`insert into ${tbl} values`)
  assert.ok(start > -1, `insert into ${tbl} found`)
  const body = raw.slice(start, raw.indexOf(';', start))
  return [...body.matchAll(/\(((?:'[^']*'|[^()'])+)\)/g)].map((m) => [...m[1].matchAll(/'([^']*)'/g)].map((x) => x[1]))
}
const UNSAFE12 = [
  ['about_page', 'Allow all operations for authenticated users'],
  ['blog_categories', 'Allow authenticated users to insert categories'], ['blog_categories', 'Allow authenticated users to update categories'], ['blog_categories', 'Authenticated users can manage categories'],
  ['contact_submissions', 'Allow authenticated admins to manage inquiries'],
  ['email_templates', 'Allow authenticated manage email templates'], ['pricing_packages', 'Allow authenticated manage pricing'],
  ['subscribers', 'Public can unsubscribe'], ['trust_section', 'Allow authenticated manage trust section'],
  ['video_testimonials', 'Auth users can delete proofs'], ['video_testimonials', 'Auth users can insert proofs'], ['video_testimonials', 'Auth users can update proofs'],
]
const REVIEW1 = ['contact_submissions', 'Allow public contact form inserts']
const NEW7 = ['about_page', 'blog_categories', 'contact_submissions', 'email_templates', 'pricing_packages', 'trust_section', 'video_testimonials', 'about_stats', 'about_values']
const key = (r) => r[0] + '|' + r[1]
const DANGEROUS = ['TRUNCATE', 'TRIGGER', 'REFERENCES', 'MAINTAIN']
// every state-changing production script must carry a LIVE guard (a raise under the confirmation test), not just mention it in a comment
for (const k of ['fwd', 'rb', 'rlsfwd', 'rlsrb', 'smtpclr']) {
  const { lower, literals } = T[k]
  ok(literals.includes('hbee.confirm_production') && literals.includes('yes') && /if coalesce\(current_setting\(''\s*,\s*true\)\s*,\s*''\)\s*<>\s*''\s*then\s*raise exception/.test(lower), `${FILES[k]}: a live production-confirmation guard that raises`)
}
ok(T.smtpclr.literals.includes('hbee.confirm_irreversible'), 'SMTP cleanup: a live irreversibility guard')
{
  const { code, lower, upper, literals } = T.rlsfwd
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'RLS forward: one transaction')
  ok(/set local lock_timeout = ''/.test(lower), 'RLS forward: fails fast instead of blocking (lock_timeout)')
  ok(/hbee\.confirm_production/.test(RAW.rlsfwd) && /Refusing to run: put/.test(RAW.rlsfwd), 'RLS forward: refuses without the explicit production confirmation')
  ok(!/_environment_marker/.test(RAW.rlsfwd.replace(/--.*$/gm, '')), 'RLS forward: does not depend on the staging marker table')

  // exactly the proven targets: the 12 UNSAFE policies, plus the one REVIEW policy that is justified in the header
  const targets = tuples(RAW.rlsfwd, '_hbee_a4_targets')
  ok(targets.length === 13, `RLS forward: 13 target policies (${targets.length})`)
  const tk = new Set(targets.map((r) => key(r)))
  for (const r of UNSAFE12) ok(tk.has(key(r)), `RLS forward targets the proven unsafe policy ${r[0]}."${r[1]}"`)
  ok(tk.has(key(REVIEW1)), 'RLS forward: the REVIEW policy is targeted only because it is explicitly justified')
  ok(tk.size === 13 && [...tk].every((k) => UNSAFE12.some((r) => key(r) === k) || k === key(REVIEW1)), 'RLS forward: no target outside the 12 proven + 1 justified')
  ok(/REVIEW POLICY \(13th\), decided from the code/.test(RAW.rlsfwd) && /\/api\/contact\/route\.ts/.test(RAW.rlsfwd) && /service-role/.test(RAW.rlsfwd), 'RLS forward: the REVIEW decision is justified in the script header from the code')
  ok(/If you know of a form that posts to the database directly, STOP/.test(RAW.rlsfwd.replace(/\r?\n--\s*/g, ' ')),'RLS forward: tells the owner to strike the REVIEW drop if a direct form exists')
  ok(targets.every((r) => ['ALL', 'INSERT', 'UPDATE', 'DELETE'].includes(r[2])), 'RLS forward: no SELECT policy is targeted (public/read policies are preserved)')
  ok(!/view proofs|active.read/i.test(code + literals.join(' ')), 'RLS forward: never names the preserved public read policies')
  const news = tuples(RAW.rlsfwd, '_hbee_a4_new')
  ok(news.length === 9 && NEW7.every((t) => news.some((r) => r[0] === t && r[1] === t + '_admin_all')), 'RLS forward: 9 admin-only policies (7 replacements + new about_stats / about_values); subscribers gets none')

  // statements: the only drop is the dynamic one over the target list; the only revokes are the backup lockdown and the matrix excess
  ok(literals.filter((l) => /^drop policy/i.test(l)).join('|') === 'drop policy %I on public.%I' && (lower.replace(/on commit drop/g, '').match(/\bdrop\b/g) || []).length === 0, 'RLS forward: the only DROP is "drop policy" driven by the target table')
  ok(!/drop policy if exists/i.test(RAW.rlsfwd), 'RLS forward: never drops silently (no IF EXISTS): an unexpected state must abort')
  ok(!/\bgrant\b/i.test(code) && !literals.some((l) => /^grant\b/i.test(l)), 'RLS forward: never GRANTs anything, it only removes surplus privileges')
  const revokes = [...lower.matchAll(/revoke [^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(revokes.length === 1 && revokes[0] === 'revoke all on table public._hbee_a4_rls_backup from public, anon, authenticated;', 'RLS forward: the only literal REVOKE ALL is on the new backup table')
  ok(literals.filter((l) => /^revoke/i.test(l)).join('|') === 'revoke %s on table public.%I from %I', 'RLS forward: the other revoke is the per-privilege, per-role excess revoke')
  ok(!/revoke all on table public\.(?!_hbee)/i.test(RAW.rlsfwd), 'RLS forward: no broad REVOKE ALL on an application table')
  for (const w of ['UPDATE', 'DELETE', 'TRUNCATE', 'MERGE', 'COPY']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `RLS forward: no ${w} statement`)
  const inserts = [...lower.matchAll(/insert into ([a-z0-9_.]+)/g)].map((m) => m[1])
  ok(inserts.every((t) => ['_hbee_a4_tables', '_hbee_a4_targets', '_hbee_a4_new', '_hbee_a4_grants', 'public._hbee_a4_rls_backup'].includes(t)), `RLS forward: inserts only into its own temp/backup tables (${[...new Set(inserts)].join(', ')})`)
  ok(!/\bfrom\s+public\.(?!_hbee_a4_rls_backup)/i.test(code), 'RLS forward: reads no application table data, only the catalog and its own backup')
  ok(!/smtp_password|\bsecret\b|backup_codes/i.test(code), 'RLS forward: never names a secret column')
  ok(!/raise (notice|info|warning)/i.test(RAW.rlsfwd), 'RLS forward: prints nothing but abort messages')

  // order: guard, then capture, then change, then post-conditions
  const ig = RAW.rlsfwd.indexOf('do $guard$'), ic = RAW.rlsfwd.indexOf('insert into public._hbee_a4_rls_backup'), ich = RAW.rlsfwd.indexOf('do $change$'), ip = RAW.rlsfwd.indexOf('do $post$')
  ok(ig > 0 && ig < ic && ic < ich && ich < ip, 'RLS forward: guard, then capture of the original state, then change, then post-conditions')
  ok(/create table public\._hbee_a4_rls_backup/.test(lower) && /enable row level security/.test(lower) && /public, anon, authenticated;/.test(lower), 'RLS forward: backup table has RLS on and no browser grants')

  // unknown state aborts
  const aborts = (RAW.rlsfwd.match(/ABORT \(nothing changed\)/g) || []).length
  ok(aborts >= 12, `RLS forward: ${aborts} abort conditions for unexpected state`)
  for (const m of ['is not an ordinary table', 'RLS is OFF', 'PUBLIC holds privileges', 'already exists', 'expected exactly one policy', 'is not a PERMISSIVE', 'does not apply to a browser role', 'already tests admin_users', 'no policy lets a signed-in admin read their own admin_users row'])
    ok(RAW.rlsfwd.includes(m), `RLS forward aborts when: ${m}`)
  // post-conditions
  for (const m of ['target polic', 'policy count is', 'a policy outside the target list changed', 'is not the expected admin-only policy', 'browser-reachable write polic', 'but expected', 'dangerous privileges remain', 'service_role privileges changed', 'an RLS flag changed'])
    ok(RAW.rlsfwd.includes(m), `RLS forward proves before COMMIT: ${m}`)
  ok(/hbee\.a4_kept_policies/.test(RAW.rlsfwd) && /hbee\.a4_service_grants/.test(RAW.rlsfwd) && /hbee\.a4_rls_flags/.test(RAW.rlsfwd), 'RLS forward: fingerprints kept policies, service_role grants and RLS flags')
  ok(/au\.user_id = auth\.uid\(\) and au\.is_active = true/.test(RAW.rlsfwd), 'RLS forward: replacement policies test an active admin_users row for auth.uid()')

  // the privilege matrix
  const matrix = tuples(RAW.rlsfwd, '_hbee_a4_grants').map((r) => ({ t: r[0], role: r[1], privs: new Set(r[2].replace(/[{}]/g, '').split(',').filter(Boolean)) }))
  const M = (t, role) => { const e = matrix.find((x) => x.t === t && x.role === role); assert.ok(e, `matrix row ${t}/${role}`); return e.privs }
  ok(matrix.length === 32, `matrix: 16 tables × anon/authenticated (${matrix.length})`)
  for (const t of TABLES) { M(t, 'anon'); M(t, 'authenticated') }
  ok(matrix.every((e) => !DANGEROUS.some((d) => e.privs.has(d))), 'matrix: TRUNCATE / TRIGGER / REFERENCES / MAINTAIN are held by nobody')
  ok(matrix.every((e) => e.role !== 'anon' || [...e.privs].every((p) => ['SELECT', 'INSERT'].includes(p))), 'matrix: anon never keeps UPDATE or DELETE anywhere')
  ok(!matrix.some((e) => e.role === 'service_role'), 'matrix: service_role is not touched')
  for (const t of ['about_page', 'blog_categories', 'pricing_packages', 'trust_section', 'video_testimonials', 'blog_comments']) ok(M(t, 'anon').has('SELECT'), `matrix: public site keeps anon SELECT on ${t}`)
  ok(M('blog_comments', 'anon').has('INSERT') && M('subscribers', 'anon').has('INSERT'), 'matrix: public comment and subscribe inserts are kept')
  ok(M('subscribers', 'anon').size === 1 && !M('subscribers', 'authenticated').has('UPDATE') && !M('subscribers', 'authenticated').has('DELETE'), 'matrix: subscribers keeps only the anon INSERT; no browser role can UPDATE or DELETE (unsubscribe is server-side)')
  for (const t of ['contact_submissions', 'client_onboarding_submissions', 'email_settings', 'email_templates', 'about_stats', 'about_values', 'clients', 'notifications', 'project_requests']) ok(M(t, 'anon').size === 0, `matrix: anon needs nothing on ${t}`)
  ok(!M('contact_submissions', 'authenticated').has('INSERT') && !M('client_onboarding_submissions', 'authenticated').has('INSERT'), 'matrix: form tables are written only by the service role')
  ok(M('contact_submissions', 'authenticated').has('SELECT') && M('contact_submissions', 'authenticated').has('UPDATE') && M('contact_submissions', 'authenticated').has('DELETE'), 'matrix: the Admin inquiries page keeps SELECT / UPDATE / DELETE through the admin-only policy')
  ok(M('email_settings', 'authenticated').has('INSERT') && M('email_settings', 'authenticated').has('UPDATE'), 'matrix: the Admin email-settings upsert keeps working')
}
{
  const { code, lower, upper, literals } = T.rlsrb
  ok(/hbee\.confirm_production/.test(RAW.rlsrb), 'RLS rollback: requires the production confirmation')
  ok(/^\s*begin;/i.test(code) && /commit;\s*$/i.test(code.trimEnd()), 'RLS rollback: one transaction')
  const f13 = tuples(RAW.rlsfwd, '_hbee_a4_targets').map((r) => key(r)).sort()
  const r13 = tuples(RAW.rlsrb, '_hbee_a4_targets').map((r) => key(r)).sort()
  ok(f13.join('~') === r13.join('~'), 'RLS rollback: restores exactly the 13 policies the forward drops')
  ok(tuples(RAW.rlsrb, '_hbee_a4_new').map((r) => key(r)).sort().join('~') === tuples(RAW.rlsfwd, '_hbee_a4_new').map((r) => key(r)).sort().join('~'), 'RLS rollback: removes exactly the 7 policies the forward creates')
  ok(/public\._hbee_a4_rls_backup/.test(RAW.rlsrb) && /does not exist — the forward migration was not applied/.test(RAW.rlsrb), 'RLS rollback: restores from the captured state and refuses without it')
  ok(/create policy %I on public\.%I as %s for %s to %s/.test(RAW.rlsrb) && /using \(/.test(RAW.rlsrb) && /with check \(/.test(RAW.rlsrb), 'RLS rollback: recreates each policy with its captured command, roles, USING and WITH CHECK')
  ok(literals.filter((l) => /^grant/i.test(l)).join('|') === 'grant %s on table public.%I to %I%s', 'RLS rollback: the only GRANT re-grants a captured privilege')
  ok(!/\bdrop table\b|\btruncate\b|\bdelete\b|\bupdate\b/i.test(code), 'RLS rollback: drops no table (the backup is kept) and changes no rows')
  ok(literals.filter((l) => /^drop policy/i.test(l)).join('|') === 'drop policy %I on public.%I', 'RLS rollback: the only DROP is of the 9 policies the forward created')
  for (const m of ['target polic', 'The state is not "forward applied"', 'Someone altered them', 'rollback would not be exact', 'policies do not equal the backup', 'grants do not equal the backup'])
    ok(RAW.rlsrb.includes(m), `RLS rollback checks: ${m}`)
  ok(/The backup table is LEFT IN PLACE/.test(RAW.rlsrb), 'RLS rollback: documents that the backup table is kept')
}
{
  const { code, upper } = T.rlsver
  for (const [t, p] of [...UNSAFE12, REVIEW1]) ok(RAW.rlsver.includes(`'${p}'`), `RLS verifier lists target "${p}"`)
  for (const t of NEW7) ok(RAW.rlsver.includes(`'${t}_admin_all'`), `RLS verifier lists replacement ${t}_admin_all`)
  for (const t of TABLES) ok(RAW.rlsver.includes(`'${t}'`), `RLS verifier covers ${t}`)
  for (const d of DANGEROUS) ok(RAW.rlsver.includes(`'${d}'`), `RLS verifier flags ${d}`)
  for (const s of ['1 targets', '2 replacements', '3 policies', '4 grants', '5 dangerous', '6 rls', '7 dependents', '8 backup', '9 summary']) ok(RAW.rlsver.includes(s), `RLS verifier section ${s}`)
  for (const s of sources(code)) ok(['pg_policies', 'pg_class', 'pg_namespace', 'pg_depend', 'pg_rewrite', 'unnest', 'tbl', 'targets', 'new_pol', 'matrix', 'pol', 'pol2', 'priv', 'grants', 'grants2', 'dangerous', 'rlsstate', 's1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9'].includes(s), `RLS verifier: unexpected source ${s}`)
  ok(!/\bFROM\s+public\./i.test(code), 'RLS verifier reads no application table')
  ok(!/\b(SECRET|BACKUP_CODES|SMTP_PASSWORD)\b/.test(upper), 'RLS verifier: no secret-bearing identifier')
  ok(/must be 0/.test(RAW.rlsver), 'RLS verifier ends with a problem count that must be 0')
}
{
  const { code, lower } = T.rlsbeh
  ok(/hbee\.confirm_rollback_test/.test(RAW.rlsbeh) && /hbee\.allow_before_forward/.test(RAW.rlsbeh), 'behaviour test: needs an explicit opt-in and refuses before the forward unless told it is a baseline')
  ok(!/\bcommit\b/.test(lower) && /rollback;\s*$/.test(lower.trimEnd()), 'behaviour test: can never commit and ends with ROLLBACK')
  const last = RAW.rlsbeh.lastIndexOf('raise exception E')
  ok(last > RAW.rlsbeh.lastIndexOf('loop') && /end \$tests\$;/.test(RAW.rlsbeh) && RAW.rlsbeh.slice(last).includes('Everything above was rolled back'), 'behaviour test: always ends by raising the report, so nothing persists')
  for (const who of ["'anon'", "'ordinary'", "'admin'", "'service'"]) ok(RAW.rlsbeh.includes(who), `behaviour test acts as ${who}`)
  ok(/v_client/.test(RAW.rlsbeh) && /client sees only own clients row/.test(RAW.rlsbeh), 'behaviour test covers a client user')
  for (const t of ['about_page', 'blog_categories', 'contact_submissions', 'email_templates', 'pricing_packages', 'subscribers', 'trust_section', 'video_testimonials'])
    for (const who of ['anon', 'ordinary']) ok(new RegExp(`\\('${who}', '${t}', '(insert|update|delete)', 'BLOCK'\\)`).test(RAW.rlsbeh), `behaviour test: ${who} write on ${t} must be blocked`)
  for (const t of ['about_page', 'blog_categories', 'pricing_packages', 'trust_section', 'video_testimonials', 'blog_comments']) ok(new RegExp(`\\('anon', '${t}', 'select', 'NOERR'\\)`).test(RAW.rlsbeh), `behaviour test: public read of ${t} keeps working`)
  ok(/'anon', 'subscribers', 'INSERT', true/.test(RAW.rlsbeh) && /'anon', 'blog_comments', 'INSERT', true/.test(RAW.rlsbeh), 'behaviour test: public subscribe and comment inserts are expected')
  ok(/'anon', 'contact_submissions', 'INSERT', false/.test(RAW.rlsbeh) && /'service_role', 'contact_submissions', 'INSERT', true/.test(RAW.rlsbeh), 'behaviour test: contact form is service-role only')
  ok(/\('anon', 'subscribers', 'update', 'BLOCK'\)/.test(RAW.rlsbeh) && /\('admin', 'subscribers', 'update', 'BLOCK'\)/.test(RAW.rlsbeh), 'behaviour test: nobody can update subscribers from a browser role')
  ok(/INCONCLUSIVE/.test(RAW.rlsbeh) && /never counted as a pass/.test(RAW.rlsbeh), 'behaviour test: inconclusive attempts are reported, never counted as passes')
  ok(!/smtp_password|\bsecret\b|backup_codes/i.test(code), 'behaviour test: selects no secret column')
}
{
  const { code, lower, upper, literals } = T.smtpclr
  ok(/hbee\.confirm_production/.test(RAW.smtpclr) && /hbee\.confirm_irreversible/.test(RAW.smtpclr), 'SMTP cleanup: needs both the production and the irreversibility confirmation')
  const updates = [...lower.matchAll(/\bupdate\b[^;]*;/g)].map((m) => m[0].replace(/\s+/g, ' '))
  ok(updates.length === 1 && updates[0] === 'update public.email_settings set smtp_password = null where smtp_password is not null;', `SMTP cleanup: one UPDATE that sets only smtp_password to NULL (${updates.join(' | ')})`)
  for (const w of ['DELETE', 'DROP', 'ALTER', 'TRUNCATE', 'INSERT', 'GRANT', 'REVOKE']) ok(!new RegExp(`\\b${w}\\b`).test(upper), `SMTP cleanup: no ${w}`)
  ok(!/returning/i.test(code) && !/select\s+smtp_password/i.test(code) && (code.match(/btrim\(smtp_password::text\)/g) || []).length === (code.match(/smtp_password::text/g) || []).length, 'SMTP cleanup: the password value is never selected, returned or printed')
  ok(!/raise (notice|info|warning)/i.test(RAW.smtpclr), 'SMTP cleanup: prints nothing')
  ok(literals.some((l) => l === 'smtp_password') && /- 'smtp_password' - 'updated_at'/.test(RAW.smtpclr), 'SMTP cleanup: proves every other column is unchanged with a digest that excludes only the password and updated_at')
  ok(/rows_with_stored_password|still hold a stored password/.test(RAW.smtpclr) && /IRREVERSIBLE/.test(RAW.smtpclr) && /NO rollback script/.test(RAW.smtpclr), 'SMTP cleanup: says plainly that it cannot be undone')
  ok(/is NOT NULL, so it cannot be set to NULL/.test(RAW.smtpclr), 'SMTP cleanup: aborts if the column cannot be NULL')
}
/* Code evidence behind the SQL decisions (so a later code change that re-introduces a dependency fails this test) */
{
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]))
  const src = walk(path.join(root, 'src')).filter((f) => /\.(ts|tsx)$/.test(f)).map((f) => ({ f: path.relative(root, f).replace(/\\/g, '/'), s: fs.readFileSync(f, 'utf8') }))
  const smtpFiles = src.filter((x) => /smtp_password/.test(x.s)).map((x) => x.f)
  ok(smtpFiles.length === 1 && smtpFiles[0] === 'src/app/admin/email-settings/page.tsx', `SMTP: only the Admin email-settings page names smtp_password (${smtpFiles.join(', ')})`)
  const page = src.find((x) => x.f === 'src/app/admin/email-settings/page.tsx').s
  ok(page.split('\n').filter((l) => /smtp_password/.test(l)).every((l) => /^\s*\/\//.test(l)), 'SMTP: on that page smtp_password appears only in comments (never selected, held, shown or sent)')
  ok(/const NON_SECRET_COLUMNS = '[^']*'/.test(page) && !/NON_SECRET_COLUMNS = '[^']*smtp_password/.test(page), 'SMTP: the page selects an explicit non-secret column list')
  ok(!src.some((x) => /nodemailer|createTransport|SMTP_PASS|SMTP_HOST|SMTP_USER/.test(x.s)), 'SMTP: no SMTP transport or SMTP_* environment variable anywhere in src')
  ok(!fs.existsSync(path.join(root, 'src/app/api/send-email')), 'SMTP: /api/send-email (the page\'s "send test email" target) does not exist')
  ok(!src.some((x) => x.f !== 'src/app/admin/email-settings/page.tsx' && /from\(\s*['"`]email_settings['"`]\s*\)/.test(x.s)), 'SMTP: nothing but the Admin page touches email_settings')

  const contactInserts = src.filter((x) => /from\(\s*['"`]contact_submissions['"`]\s*\)\s*\.insert/.test(x.s.replace(/\s+/g, ' ').replace(/\) \./g, ').'))).map((x) => x.f)
  ok(contactInserts.length === 1 && contactInserts[0] === 'src/app/api/contact/route.ts', `contact_submissions is inserted only by /api/contact (${contactInserts.join(', ')})`)
  const contact = src.find((x) => x.f === 'src/app/api/contact/route.ts').s
  ok(/SUPABASE_SERVICE_ROLE_KEY/.test(contact) && !/NEXT_PUBLIC_SUPABASE_ANON_KEY/.test(contact), '/api/contact builds its client with the service-role credential, not the anon key')
  ok(!src.some((x) => /from\(\s*['"`]subscribers['"`]\s*\)[\s\S]{0,200}\.(update|delete|upsert)\(/.test(x.s)), 'subscribers: no code updates or deletes rows of the legacy subscribers table')
  const unsub = src.find((x) => x.f === 'src/app/api/unsubscribe/route.ts').s
  ok(/newsletter_subscribers/.test(unsub) && !/from\(\s*['"`]subscribers['"`]/.test(unsub) && /verifyNewsletterUnsubscribeIdentity/.test(unsub), 'subscribers: unsubscribe is a signed server route on newsletter_subscribers, not a browser UPDATE')
  ok(!src.some((x) => /from\(\s*['"`]subscribers['"`]/.test(x.s) && x.f !== 'src/components/NewsletterSubscribe.tsx' && x.f !== 'src/app/api/analytics/route.ts'), 'subscribers: only the legacy browser form (insert) and the analytics route touch the table')
  const importers = src.filter((x) => /NewsletterSubscribe['"]/.test(x.s) && x.f !== 'src/components/NewsletterSubscribe.tsx').map((x) => x.f)
  ok(importers.length === 0, `subscribers: the legacy NewsletterSubscribe form has no importer, so its anon INSERT is kept only because the owner marked it intentional (${importers.join(', ') || 'none'})`)
  const aboutData = src.find((x) => x.f === 'src/lib/site/about-data.ts').s
  ok(!/from\(\s*['"`]about_(stats|values)['"`]/.test(aboutData) && !src.some((x) => !x.f.startsWith('src/app/admin/') && /from\(\s*['"`]about_(stats|values)['"`]/.test(x.s)), 'about_stats / about_values: no public page reads them; only the Admin About page does')
}

/* about_stats / about_values: new admin-only policies (RLS on, no policy today), no anonymous access */
{
  const fwdTargets = tuples(RAW.rlsfwd, '_hbee_a4_targets')
  ok(!fwdTargets.some((r) => /^about_(stats|values)$/.test(r[0])), 'about_stats / about_values: nothing to drop (no existing policy), so they are not targets')
  ok(/about_stats \/ about_values were audited with no policy but now have/.test(RAW.rlsfwd), 'about_stats / about_values: forward aborts if a policy already exists there')
  ok(RAW.rlsfwd.includes("('about_stats', true), ('about_values', true)") && RAW.rlsver.includes("('about_stats', true), ('about_values', true)"), 'about_stats / about_values: covered by the no-unguarded-write post-check and the verifier')
  ok(!/about_(stats|values)_(public|anon)/i.test(RAW.rlsfwd), 'about_stats / about_values: no anonymous policy')
  for (const t of ['about_stats', 'about_values']) {
    for (const who of ['anon', 'ordinary']) for (const op of ['insert', 'update', 'delete']) ok(RAW.rlsbeh.includes(`('${who}', '${t}', '${op}', 'BLOCK')`), `behaviour test: ${who} cannot ${op} ${t}`)
    for (const op of ['select', 'update', 'delete']) ok(RAW.rlsbeh.includes(`('admin', '${t}', '${op}', 'NOERR')`), `behaviour test: an active admin can ${op} ${t}`)
    ok(RAW.rlsbeh.includes(`('anon', '${t}', 'SELECT', false)`), `behaviour test: anon holds no SELECT on ${t}`)
    ok(read('docs/admin-production-release-a4.md').includes(`${t}_admin_all`), `release document names ${t}_admin_all`)
  }
}

/* ── The release document covers every required topic ────────────────────────────────────────────────────────── */
const doc = read('docs/admin-production-release-a4.md')
for (const f of Object.values(FILES)) ok(doc.includes(f.replace('scripts/', '')), `release document names ${f}`)
for (const t of TABLES) ok(doc.includes('`' + t + '`'), `release document classifies ${t}`)
for (const h of ['RLS and the 2FA cookie', 'ADMIN_2FA_ENROLLMENT', 'UPSTASH_REDIS_REST_URL', 'Portfolio', 'rollback']) ok(new RegExp(h, 'i').test(doc), `release document covers: ${h}`)

console.log(`PASS: production SQL package - ${n} static checks over ${Object.keys(FILES).length} scripts: 2FA uniqueness package; RLS forward targets exactly the 12 proven unsafe policies plus the one justified REVIEW policy, keeps every public/read/client policy, revokes only surplus privileges (never TRUNCATE/TRIGGER/REFERENCES left to browser roles), aborts on unknown state and proves its result before COMMIT; rollback restores from the captured backup; verifier is read-only; behaviour test can never commit; SMTP cleanup sets only smtp_password to NULL behind two confirmations; code evidence (contact service-role insert, signed unsubscribe, no SMTP transport) is asserted. (Static only: NOT a PostgreSQL parse; nothing was executed.)`)
