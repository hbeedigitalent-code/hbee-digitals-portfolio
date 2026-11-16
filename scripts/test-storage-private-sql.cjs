// Tests for the storage effective-access verifier (scripts/storage-private-03-verify-readonly.sql).
//
// WHAT THIS IS
//   1. A reference model of PostgreSQL's row-level-security combination rule, with regression cases:
//        effective = (OR of applicable PERMISSIVE) AND (AND of applicable RESTRICTIVE); no permissive policy => deny.
//   2. That model loaded with the PRODUCTION policy shapes the owner reported, asserting the effective-access table for every
//      relevant bucket/operation.
//   3. Static checks that the verifier SQL implements the same rule (it must not filter to permissive policies only, which was the
//      earlier, wrong version), is one read-only statement, and makes the four private client buckets required PASS conditions.
//   4. Checks that no application code depends on direct browser reads of the private buckets.
//
// WHAT IT IS NOT: a PostgreSQL parse or run. No Postgres engine is available in this repository; the SQL is NOT executed here. The
// owner runs the verifier read-only against production and reports the rows.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8')
const strip = (s) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

// ── 1. the combination rule (mirrors the verifier SQL exactly) ───────────────────────────────────────────────────────────
// policy: { name, permissive: boolean, cmd: 'SELECT'|'INSERT'|'UPDATE'|'DELETE'|'ALL', roles: string[], check(probe) => boolean|null }
function applicable(policy, probe) {
  const roleOk = policy.roles.includes('public') || policy.roles.includes(probe.role)
  const cmdOk = policy.cmd === 'ALL' || policy.cmd === probe.op
  return roleOk && cmdOk
}
function effective(policies, probe) {
  const hits = policies.filter((p) => applicable(p, probe))
  const permissive = hits.filter((p) => p.permissive)
  const restrictive = hits.filter((p) => !p.permissive)
  const permissiveOk = permissive.some((p) => p.check(probe) === true) // no permissive policy => false
  const restrictiveOk = restrictive.every((p) => p.check(probe) === true) // a NULL result is not a pass; none => true
  return {
    allowed: permissiveOk && restrictiveOk,
    permissiveBy: permissive.filter((p) => p.check(probe) === true).map((p) => p.name),
    blockedBy: restrictive.filter((p) => p.check(probe) !== true).map((p) => p.name),
  }
}
const P = (name, permissive, cmd, roles, check) => ({ name, permissive, cmd, roles, check })

console.log('combination rule')

// regression cases demanded by the review
{
  const probe = { role: 'authenticated', op: 'SELECT', bucket: 'b', name: 'x' }
  const allow = P('allow', true, 'SELECT', ['public'], () => true)
  const deny = P('deny', false, 'SELECT', ['authenticated'], () => false)
  const pass = P('pass', false, 'SELECT', ['authenticated'], () => true)

  assert.equal(effective([allow, deny], probe).allowed, false, 'permissive allow + restrictive false = DENY')
  assert.deepEqual(effective([allow, deny], probe).blockedBy, ['deny'])
  assert.equal(effective([allow, pass], probe).allowed, true, 'permissive allow + restrictive true = ALLOW')
  assert.equal(effective([pass], probe).allowed, false, 'restrictive true with ZERO permissive policies = DENY')
  assert.equal(effective([], probe).allowed, false, 'no policies at all = DENY')
  assert.equal(effective([P('p', true, 'SELECT', ['public'], () => false), pass], probe).allowed, false, 'permissive false + restrictive true = DENY')

  // a PUBLIC permissive policy and an AUTHENTICATED-only restrictive one: the restrictive applies to authenticated, not to anon
  const publicRead = P('public-read', true, 'SELECT', ['public'], () => true)
  const authOnlyGuard = P('auth-guard', false, 'SELECT', ['authenticated'], () => false)
  assert.equal(effective([publicRead, authOnlyGuard], { ...probe, role: 'authenticated' }).allowed, false, 'the guard narrows authenticated')
  assert.equal(effective([publicRead, authOnlyGuard], { ...probe, role: 'anon' }).allowed, true, 'the same guard does not apply to anon')
  // a different command is not applicable
  assert.equal(effective([allow, P('insert-guard', false, 'INSERT', ['public'], () => false)], probe).allowed, true, 'a restrictive INSERT policy does not narrow SELECT')
  // ALL applies to every command
  assert.equal(effective([allow, P('all-guard', false, 'ALL', ['public'], () => false)], probe).allowed, false, 'a restrictive ALL policy narrows SELECT')
  // a NULL restrictive result is not a pass (SQL: coalesce(..., false))
  assert.equal(effective([allow, P('null-guard', false, 'SELECT', ['public'], () => null)], probe).allowed, false)
}
console.log('  ok   regression cases')

// ── 2. the PRODUCTION policy shapes reported by the owner ────────────────────────────────────────────────────────────────
const GUARDED = ['client-portal-files', 'onboarding-files', 'project-files']
const production = [
  P('Allow public to view project-files', true, 'SELECT', ['public'], (o) => o.bucket === 'project-files'),
  P('m10_private_buckets_no_client_select', false, 'SELECT', ['anon', 'authenticated'], (o) => !GUARDED.includes(o.bucket)),
  P('Allow authenticated users to upload client-portal files', true, 'INSERT', ['public'], (o) => o.bucket === 'client-portal' && o.role === 'authenticated'),
  P('m10_client_portal_own_avatar_insert', false, 'INSERT', ['authenticated'], (o) => o.bucket !== 'client-portal' || (o.uid != null && o.name.startsWith('profile-images/' + o.uid + '-'))),
  P('Give public access to client-portal-files', true, 'SELECT', ['public'], (o) => o.bucket === 'client-portal-files'),
  P('Allow public to view onboarding-files', true, 'SELECT', ['public'], (o) => o.bucket === 'onboarding-files'),
  P('Give public access to onboarding-files', true, 'SELECT', ['public'], (o) => o.bucket === 'onboarding-files'),
]
const ME = '00000000-0000-4000-8000-0000000000a1', OTHER = '00000000-0000-4000-8000-0000000000b2'
const probe = (role, op, bucket, name) => ({ role, op, bucket, name, uid: role === 'authenticated' ? ME : null })
const allowed = (policies, ...args) => effective(policies, probe(...args)).allowed

console.log('production effective access (policy shapes reported by the owner)')

for (const bucket of ['project-files', 'proposal-files', 'client-portal-files', 'onboarding-files']) {
  for (const role of ['anon', 'authenticated']) {
    assert.equal(allowed(production, role, 'SELECT', bucket, 'probe/' + OTHER + '/x.pdf'), false, role + ' SELECT ' + bucket + ' is DENIED')
  }
}
console.log('  ok   anon and authenticated cannot read project-files, proposal-files, client-portal-files or onboarding-files')

// WHY: the legacy permissive read policies do grant; only the restrictive guard stops them
for (const [bucket, legacy] of [['project-files', 'Allow public to view project-files'], ['client-portal-files', 'Give public access to client-portal-files'], ['onboarding-files', 'Allow public to view onboarding-files']]) {
  const r = effective(production, probe('anon', 'SELECT', bucket, 'x'))
  assert.ok(r.permissiveBy.includes(legacy), legacy + ' does grant on its own')
  assert.deepEqual(r.blockedBy, ['m10_private_buckets_no_client_select'], bucket + ' is blocked by the restrictive guard')
  assert.equal(r.allowed, false)
  // ...and the guard is the SOLE barrier: remove it and the exposure is real
  assert.equal(allowed(production.filter((p) => p.name !== 'm10_private_buckets_no_client_select'), 'anon', 'SELECT', bucket, 'x'), true, 'without the guard ' + bucket + ' would be readable')
}
console.log('  ok   the legacy permissive reads are redundant while the restrictive guard holds (and live if it is removed)')

// proposal-files: denied because NO permissive policy grants it, not because of the guard
{
  const r = effective(production, probe('anon', 'SELECT', 'proposal-files', 'x'))
  assert.deepEqual(r.permissiveBy, [])
  assert.deepEqual(r.blockedBy, [])
  assert.equal(r.allowed, false)
}
console.log('  ok   proposal-files is denied by the absence of any permissive grant (adding it to the guard is optional hardening)')

// writes to project-files / proposal-files: no applicable permissive policy
for (const bucket of ['project-files', 'proposal-files']) {
  for (const role of ['anon', 'authenticated']) {
    for (const op of ['INSERT', 'UPDATE', 'DELETE']) assert.equal(allowed(production, role, op, bucket, 'x/y.pdf'), false, role + ' ' + op + ' ' + bucket)
  }
}
console.log('  ok   no browser role can write project-files or proposal-files')

// client-portal avatars
assert.equal(allowed(production, 'authenticated', 'INSERT', 'client-portal', 'profile-images/' + ME + '-1.png'), true, 'a user CAN upload its own avatar')
assert.equal(allowed(production, 'authenticated', 'INSERT', 'client-portal', 'profile-images/' + OTHER + '-1.png'), false, 'another user avatar path is denied by the restrictive policy')
assert.equal(allowed(production, 'authenticated', 'INSERT', 'client-portal', 'documents/probe.pdf'), false, 'a path outside profile-images/ is denied')
assert.equal(allowed(production, 'anon', 'INSERT', 'client-portal', 'profile-images/' + OTHER + '-1.png'), false, 'anon cannot write (auth.role() = authenticated is required)')
assert.deepEqual(effective(production, probe('authenticated', 'INSERT', 'client-portal', 'documents/probe.pdf')).blockedBy, ['m10_client_portal_own_avatar_insert'])
console.log('  ok   avatar uploads: own path allowed; another user, arbitrary path and anon denied')

// THE TRAP: dropping the broad permissive INSERT policy breaks legitimate avatar uploads
{
  const withoutBroad = production.filter((p) => p.name !== 'Allow authenticated users to upload client-portal files')
  assert.equal(allowed(withoutBroad, 'authenticated', 'INSERT', 'client-portal', 'profile-images/' + ME + '-1.png'), false, 'with ONLY the restrictive policy left, even the own avatar path is denied')
}
console.log('  ok   regression: dropping "Allow authenticated users to upload client-portal files" would BREAK avatar upload (restrictive-only = deny)')

// other buckets keep whatever permissive grants they had: the guard does not touch buckets outside its list
assert.equal(allowed(production, 'anon', 'SELECT', 'team-avatars', 'x.png'), false, 'with no permissive policy for it, an unlisted bucket is denied (public buckets are served by public URLs, not by policy)')

// ── 3. the verifier SQL implements the same rule ───────────────────────────────────────────────────────────────────────
console.log('verifier SQL')
const VER = 'scripts/storage-private-03-verify-readonly.sql'
const rawVer = read(VER)
function tokenize(raw) {
  const literals = []
  let code = ''
  for (let i = 0; i < raw.length; ) {
    if (raw.startsWith('--', i)) { while (i < raw.length && raw[i] !== '\n') i++; continue }
    if (raw[i] === "'") {
      let j = i + 1, text = ''
      while (j < raw.length) { if (raw[j] === "'" && raw[j + 1] === "'") { text += "'"; j += 2 } else if (raw[j] === "'") break; else text += raw[j++] }
      assert.ok(j < raw.length, 'unterminated string literal')
      literals.push(text); code += "''"; i = j + 1; continue
    }
    code += raw[i++]
  }
  return { code, literals, lower: code.toLowerCase() }
}
const ver = tokenize(rawVer)
{ let d = 0; for (const ch of ver.code) { if (ch === '(') d++; if (ch === ')') d--; assert.ok(d >= 0); } assert.equal(d, 0, 'balanced parentheses') }

// the earlier bug: policies were filtered to PERMISSIVE only
assert.doesNotMatch(rawVer.replace(/--[^\n]*/g, ''), /pol\.permissive\s*=\s*'PERMISSIVE'/, 'the join must NOT drop restrictive policies')
assert.ok(/pol\.permissive as kind/.test(rawVer), 'every policy keeps its permissive/restrictive kind')
assert.ok(/bool_or\(e\.passes\)\s+filter \(where e\.kind = 'PERMISSIVE'\)/.test(rawVer), 'permissive policies are OR-ed')
assert.ok(/bool_and\(e\.passes\) filter \(where e\.kind = 'RESTRICTIVE'\)/.test(rawVer), 'restrictive policies are AND-ed')
assert.ok(/coalesce\(bool_or\(e\.passes\)[^)]*\),\s*false\)/.test(rawVer.replace(/\s+/g, ' ')) || /coalesce\(bool_or\(e\.passes\)\s+filter \(where e\.kind = 'PERMISSIVE'\),\s+false\)/.test(rawVer), 'no permissive policy => false (deny)')
assert.ok(/coalesce\(bool_and\(e\.passes\) filter \(where e\.kind = 'RESTRICTIVE'\), true\)/.test(rawVer), 'no restrictive policy => true')
assert.ok(/pp\.permissive_ok and pp\.restrictive_ok/.test(rawVer), 'effective access is permissive AND restrictive')
assert.ok(/pol\.roles && array\[p\.role_name::name, 'public'::name\]/.test(rawVer), 'role applicability covers the role and PUBLIC')
assert.ok(/pol\.cmd = p\.op or pol\.cmd = 'ALL'/.test(rawVer), 'command applicability covers the command and ALL')
assert.ok(/as\s+passes/.test(rawVer) && /::boolean as passes/.test(rawVer), 'each policy expression is evaluated to a boolean')
assert.ok(rawVer.includes("'auth.uid()'") && rawVer.includes("'auth.role()'"), 'auth.uid() and auth.role() are substituted with the probe identity')

// read-only, one statement
assert.match(ver.lower.trim(), /^with\b/); assert.equal((ver.code.match(/;/g) || []).length, 1, 'one statement')
for (const forbidden of [/\binsert\s+into\b/, /\bupdate\s+\w+\s+set\b/, /\bdelete\s+from\b/, /\bdrop\b/, /\balter\b/, /\bcreate\b/, /\bgrant\b/, /\brevoke\b/, /\btruncate\b/, /\bcommit\b/, /\bbegin\b/]) {
  assert.doesNotMatch(ver.lower, forbidden, 'verify must be read-only: ' + forbidden)
}
const reads = new Set([...rawVer.replace(/--[^\n]*/g, '').matchAll(/\bfrom\s+([a-z_]+\.[a-z_]+)/gi)].map((m) => m[1].toLowerCase()))
for (const t of reads) assert.ok(['storage.buckets', 'pg_policies'].includes(t), 'verify reads only storage.buckets and pg_policies, found ' + t)
assert.ok(!/storage\.objects\s+(o|obj|where)\b/i.test(rawVer.replace(/--[^\n]*/g, '').replace(/'[^']*'/g, "''")), 'verify never reads storage.objects rows')
assert.ok(/service_role/.test(rawVer) && !/service_role/.test(ver.lower), 'service_role appears only in comments')

// required conditions
for (const b of ['project-files', 'proposal-files', 'client-portal-files', 'onboarding-files']) {
  for (const role of ['anon', 'authenticated']) {
    const line = rawVer.split('\n').find((l) => l.includes("'" + b + ": " + role + " cannot SELECT'") || l.includes("'" + b + ": " + role + " cannot SELECT"))
    assert.ok(line, 'verify requires ' + b + ' ' + role + ' SELECT to be denied')
    assert.ok(line.includes("'" + b + "'") && line.includes("'" + role + "'") && line.includes("'SELECT'") && /'deny'\)/.test(line), b + ' ' + role + ' SELECT: expect = deny => FAIL when effectively allowed')
  }
}
for (const b of ['project-files', 'proposal-files', 'client-portal-files', 'onboarding-files']) assert.ok(rawVer.includes('bucket ' + b + ' is private'), 'verify requires ' + b + ' to be private')
assert.ok(/b\.id not in \('project-files', 'proposal-files', 'client-portal-files', 'onboarding-files'\)/.test(rawVer), 'the REVIEW-only list excludes all four required buckets')
assert.ok(/when pp\.expect = 'deny'\s+then case when pp\.permissive_ok and pp\.restrictive_ok then 'FAIL' else 'PASS' end/.test(rawVer), 'an effectively-allowed required denial is a FAIL')
assert.ok(/when pp\.expect = 'allow' then case when pp\.permissive_ok and pp\.restrictive_ok then 'PASS' else 'FAIL' end/.test(rawVer), 'a required allowance (own avatar upload) fails if denied')
assert.ok(/else\s+case when pp\.permissive_ok and pp\.restrictive_ok then 'REVIEW' else 'PASS' end/.test(rawVer), 'only out-of-scope probes are REVIEW')
assert.ok(/case when \(select count\(\*\) from rows_out where verdict = 'FAIL'\) = 0 then 'PASS' else 'FAIL' end/.test(rawVer), 'OVERALL passes only with zero FAIL rows')
// legacy policies are INFO now (they are redundant while the guard holds), not failures
assert.doesNotMatch(rawVer, /legacy policy "[^"]+" is gone/, 'legacy policies are not required to be dropped')
assert.ok(/guard m10_private_buckets_no_client_select is RESTRICTIVE/.test(rawVer), 'the sole barrier is itself a required, verified condition')
for (const needle of ['profile-images/{me}-1.png', 'profile-images/{other}-1.png', 'documents/probe.pdf', 'query_to_xml', 'blocked_by', 'permissive_by', 'OVERALL'])
  assert.ok(rawVer.includes(needle), 'verify covers ' + needle)
for (const op of ['SELECT', 'INSERT', 'UPDATE', 'DELETE']) assert.ok(ver.literals.includes(op), 'verify probes ' + op)

// ── 4. no migration is part of S6.2, and nothing in the application depends on direct browser reads ───────────────────────────
console.log('package and application')
for (const f of ['scripts/storage-private-01-forward.sql', 'scripts/storage-private-02-rollback.sql']) {
  assert.ok(!fs.existsSync(path.join(root, f)), f + ' was discarded: it was built on a permissive-only model and would have dropped the avatar upload policy')
}
function walk(d) { return fs.readdirSync(path.join(root, d), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(d + '/' + e.name) : [d + '/' + e.name])) }
const sources = walk('src').filter((f) => /\.(ts|tsx)$/.test(f))
const PROTECTED = /storage\s*\.from\(\s*['"](project-files|proposal-files|client-portal-files|onboarding-files)['"]/
for (const f of sources) {
  const src = read(f)
  if (/^\s*['"]use client['"]/.test(src)) assert.doesNotMatch(src, PROTECTED, f + ': browser code must not touch a private bucket')
  assert.doesNotMatch(strip(src), /storage\s*\.from\(\s*['"](project-files|proposal-files|client-portal-files|onboarding-files)['"]\s*\)\s*\.getPublicUrl/, f + ': no public URL for a private bucket')
}
const onboarding = strip(read('src/app/api/onboarding/route.ts'))
assert.ok(/onboarding-files/.test(onboarding) && !/getPublicUrl/.test(onboarding), 'the onboarding upload stores a path, never a public URL')
const settings = read('src/app/client-portal/settings/page.tsx')
assert.ok(/profile-images\/\$\{fileName\}/.test(settings) && /\$\{user\.id\}-\$\{Date\.now\(\)\}/.test(settings), 'the avatar path is profile-images/<user id>-<timestamp>.<ext>, which the own-path restrictive policy matches')
assert.doesNotMatch(strip(settings), /storage[\s\S]{0,160}(upsert|\.remove\()/, 'the avatar upload is a plain INSERT')
assert.ok(/isOwnAvatarUrl/.test(read('src/app/api/client-portal/settings/route.ts')), 'the server accepts only the caller\'s own avatar URL')

console.log('PASS: storage effective-access verifier - restrictive-policy semantics modelled and regression-tested; production shapes yield DENY for all four private client buckets and for foreign/arbitrary avatar paths; the own-avatar upload stays allowed; no migration is required by this package. The SQL itself is NOT executed here.')
