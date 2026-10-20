// Static artifact safety contract only. No SQL parser, DB driver, network, or SQL execution.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const names = ['00-preflight', '01-forward', '02-rollback', '03-verify'];
const files = Object.fromEntries(names.map(name => [name, fs.readFileSync(path.join(__dirname, `newsletter-security-${name}.sql`), 'utf8')]));
const withoutComments = source => source.replace(/--[^\r\n]*/g, '');
for (const [name, source] of Object.entries(files)) {
  assert.doesNotMatch(source, /[^\S\r\n]+\r?$/m, `${name}: trailing whitespace`);
  assert.ok(source.endsWith('\n'), `${name}: final newline`);
  const sql = withoutComments(source);
  assert.doesNotMatch(sql, /\b(?:INSERT\s+INTO|DELETE\s+FROM|UPDATE\s+(?:public\.)?(?:newsletter_subscribers|site_settings)|TRUNCATE\s+(?:TABLE\s+)?(?:public\.)?newsletter_subscribers)\b/i,
    `${name}: must never mutate subscriber/settings rows or fabricate consent`);
  assert.doesNotMatch(sql, /\bDROP\s+(?:TABLE|COLUMN|INDEX|FUNCTION)\b/i, `${name}: no destructive schema rollback/cleanup`);
  assert.doesNotMatch(sql, /\bGRANT\b[^;]*\bTO\s+(?:PUBLIC|anon|authenticated)\b/i, `${name}: never restore broad access`);
}
for (const name of ['00-preflight', '03-verify']) {
  const sql = withoutComments(files[name]);
  assert.match(sql, /^BEGIN READ ONLY;/m);
  assert.doesNotMatch(sql, /^\s*(?:ALTER|CREATE|DROP|DO|GRANT|REVOKE|LOCK|NOTIFY)\b/im, `${name}: read-only statements only`);
  assert.match(sql, /aclexplode\(a\.attacl\)/, `${name}: NULL column ACLs must produce no rows`);
  for (const evidence of ['relrowsecurity', 'relforcerowsecurity', 'pg_has_role', 'has_any_column_privilege', 'pg_proc', 'pg_rewrite']) {
    assert.ok(sql.includes(evidence), `${name}: missing security evidence ${evidence}`);
  }
}
for (const [name, source] of Object.entries(files)) {
  assert.doesNotMatch(withoutComments(source), /aclexplode\(coalesce\([^)]*attacl\s*,\s*'\{\}'::aclitem\[\]\)\)/i,
    `${name}: do not pass an untyped-dimension empty ACL array to aclexplode`);
}
const forward = withoutComments(files['01-forward']);
const [preparation, cutover] = forward.split(/COMMIT;/i);
assert.equal((forward.match(/^BEGIN;/gm) || []).length, 2, 'preparation and cutover are separate transactions');
assert.equal((forward.match(/^COMMIT;/gm) || []).length, 2);
assert.match(preparation, /expected_relrowsecurity boolean := true/);
assert.match(preparation, /expected_relforcerowsecurity boolean := false/);
assert.match(preparation, /expected_table_owner name := 'postgres'/);
assert.match(preparation, /rolname IN \('anon','authenticated'\)[\s\S]*NOT rolsuper AND NOT rolbypassrls/);
assert.match(preparation, /rolname = 'service_role' AND NOT rolsuper AND rolbypassrls/);
for (const name of ['01-forward', '03-verify']) {
  const sql = withoutComments(files[name]);
  assert.match(sql, /con\.contype IN \('p','u'\) AND con\.convalidated/,
    `${name}: UUID identity needs an enforced primary/unique constraint`);
  assert.match(sql, /i\.indisunique AND i\.indisvalid AND i\.indisready AND i\.indnkeyatts = 1 AND i\.indpred IS NULL/);
}
assert.match(files['03-verify'], /FROM \(VALUES \('anon'\),\('authenticated'\)\) expected\(rolname\)/,
  'missing browser roles must produce explicit verifier failures');
assert.match(files['03-verify'], /FROM \(VALUES \('service_role'\)\) expected\(rolname\)/,
  'missing service_role must produce an explicit verifier failure');
assert.match(preparation, /Require authoritative PRIMARY KEY\(id\) or exact validated UNIQUE\(id\) evidence/);
for (const name of ['01-forward', '03-verify']) {
  const sql = withoutComments(files[name]);
  assert.match(sql, /i\.indkey\[0\] = \(SELECT attnum FROM pg_attribute[\s\S]*attname = 'email'/,
    `${name}: retain structurally exact UNIQUE(email) independent of object name`);
  assert.match(sql, /i\.indexprs IS NULL AND i\.indpred IS NULL AND am\.amname = 'btree'/);
}
assert.doesNotMatch(preparation, /DROP POLICY|ENABLE ROW LEVEL SECURITY|REVOKE ALL PRIVILEGES ON TABLE/i,
  'old admin access remains until reviewed compatible application deployment');
assert.match(cutover, /compatible_application_cutover_confirmed boolean := true/);
for (const [signature, hash] of Object.entries({
  'public.current_client_id()': '298d2fb4275c92b8b24f4ad3a2a0ba8d',
  'public.increment_blog_view(uuid)': 'a1bb0427d93116b48eed7b86e0dd1f06',
  'public.is_active_admin()': 'ff158b21fdc826346db24a298bf7bf5f',
})) {
  assert.ok(cutover.includes(`"${signature}":"${hash}"`), `missing reviewed SECURITY DEFINER hash: ${signature}`);
}
assert.match(cutover, /expected_identity_rpc_hash text := '7ff011c458b629e471f3629f7d389e1a'/);
assert.match(cutover, /expected_legacy_row_count bigint := 14/);
assert.match(cutover, /expected_legacy_projection_fingerprint text := 'b9ec19e5467d2ceb0c42d7531cc1ee67'/);
assert.match(cutover, /format\('%I\.%I\(%s\)',n\.nspname,p\.proname,oidvectortypes\(p\.proargtypes\)\)/,
  'SECURITY DEFINER allowlist keys must be deterministically schema-qualified');
assert.match(cutover, /LOCK TABLE public\.site_settings IN ACCESS EXCLUSIVE MODE/,
  'capture settings cannot change while the cutover gate is checked');
for (const name of ['01-forward', '03-verify']) {
  const sql = withoutComments(files[name]);
  for (const key of ['footer_enabled', 'popup_enabled', 'enabled']) {
    assert.ok(sql.includes(`newsletter_settings->>'${key}' = 'true'`), `${name}: reject enabled capture switch ${key}`);
  }
}
assert.match(files['00-preflight'], /historical_non_ascii_email_count/);
assert.match(files['00-preflight'], /convert_to\(email,'UTF8'\)/);
assert.match(files['00-preflight'], /datcollate, datctype/);
assert.match(files['00-preflight'], /pg_collation_actual_version/);
for (const column of ['consent_given_at timestamptz', 'consent_source text', 'consent_version text', 'newsletter_settings jsonb']) {
  assert.ok(preparation.includes(`ADD COLUMN ${column} NULL;`), `nullable, default-free additive field: ${column}`);
}
assert.match(preparation, /CREATE UNIQUE INDEX newsletter_subscribers_email_normalized_key\s+ON public\.newsletter_subscribers \(lower\(btrim\(email\)\)\)/);
assert.match(preparation, /CREATE FUNCTION public\.newsletter_subscriber_identity\(p_email text\)/);
assert.match(preparation, /RETURNS TABLE\(id uuid,status text\)/);
assert.match(preparation, /SECURITY INVOKER\s+SET search_path = pg_catalog, pg_temp/);
assert.match(preparation, /FROM public\.newsletter_subscribers AS ns/);
assert.match(preparation, /Historical rows remain NULL/);
assert.ok(preparation.includes('consent_given_at IS NOT NULL'), 'reject fabricated historical consent');
for (const name of ['01-forward', '02-rollback']) {
  const sql = withoutComments(files[name]);
  assert.match(sql, /REVOKE ALL PRIVILEGES ON TABLE public\.newsletter_subscribers FROM PUBLIC,anon,authenticated/);
  assert.match(sql, /REVOKE ALL PRIVILEGES \(%s\) ON TABLE public\.newsletter_subscribers FROM PUBLIC,anon,authenticated/);
  assert.match(sql, /ENABLE ROW LEVEL SECURITY/);
  assert.match(sql, /FORCE ROW LEVEL SECURITY/);
  assert.match(sql, /GRANT SELECT,INSERT,UPDATE,DELETE ON TABLE public\.newsletter_subscribers TO service_role/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.newsletter_subscriber_identity\(text\) TO service_role/);
  assert.doesNotMatch(sql, /CREATE POLICY/i, 'default-deny model has zero policies');
  assert.match(sql, /before_count,before_fingerprint/);
  assert.match(sql, /after_count,after_fingerprint/);
  assert.match(sql, /IS DISTINCT FROM \(after_count,after_fingerprint\)/);
  assert.match(sql, /ACCESS EXCLUSIVE MODE/);
  assert.match(sql, /NOTIFY pgrst, 'reload schema'/);
}
const verifier = withoutComments(files['03-verify']);
assert.match(verifier, /to_jsonb\(t\) - ARRAY\[\s*'consent_given_at','consent_source','consent_version'\]/,
  'verifier must use the schema-stable legacy subscriber projection');
assert.doesNotMatch(verifier, /string_agg\(md5\(to_jsonb\(t\)::text\)/,
  'verifier must not compare a Stage-A-sensitive full-row fingerprint');
assert.match(verifier, /'b9ec19e5467d2ceb0c42d7531cc1ee67'/,
  'verifier must pin the authoritative legacy projection fingerprint');
assert.ok(fs.existsSync(path.join(root, 'docs/newsletter-security-review.md')), 'owner rollout context exists');
console.log('Newsletter SQL static safety contracts passed. SQL was not parsed or executed.');
