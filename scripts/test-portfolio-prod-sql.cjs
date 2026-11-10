// Offline STATIC checks of the Portfolio CMS + Case Studies production scripts and release wiring. No database, no network.
// They prove what the files say. PostgreSQL behaviour is NOT proven here (the scripts were parsed and exercised only in a throw-away
// in-memory sandbox outside this repository, never against Supabase).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const sqlRead = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8').replace(/\r\n/g, '\n')
const srcRead = (f) => fs.readFileSync(path.join(root, f), 'utf8').replace(/\r\n/g, '\n')
const stripComments = (sql) => sql.replace(/--[^\n]*/g, '')
const code = (sql) => stripComments(sql).toLowerCase()

const F = {
  preflight: 'prod-portfolio-00-preflight-readonly.sql',
  data: 'prod-portfolio-01-data-readonly.sql',
  forward: 'prod-portfolio-02-forward-PRODUCTION.sql',
  verify: 'prod-portfolio-03-verify-readonly.sql',
  access: 'prod-portfolio-04-access-rollback-PRODUCTION.sql',
  structural: 'prod-portfolio-05-empty-structural-rollback-PRODUCTION.sql',
}
const S = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, sqlRead(f)]))

/* -- every script exists, is labelled, and is plain ASCII (no encoding damage can reach the SQL editor) ------------------------- */
for (const [name, sql] of Object.entries(S)) {
  assert.match(sql, /NOT EXECUTED/i, `${name} is labelled NOT EXECUTED`)
  assert.ok(/^[\x00-\x7F]*$/.test(sql), `${name} is ASCII only`)
  assert.doesNotMatch(code(sql), /\bsupabase_service_role|service_role_key|password\s*=|secret\s*=|eyJ[a-z0-9]{10,}/i, `${name} holds no secret`)
}

/* -- read-only scripts: ONE statement, a SELECT, no write or DDL keyword ------------------------------------------------------- */
for (const name of ['preflight', 'data', 'verify']) {
  const sql = S[name]
  const statements = stripComments(sql).replace(/'(?:[^']|'')*'/g, "''").split(';').map((s) => s.trim()).filter(Boolean)
  assert.equal(statements.length, 1, `${name} is exactly one statement`)
  assert.match(statements[0], /^(with|select)\b/i, `${name} is a SELECT / WITH ... SELECT`)
  const noLiterals = code(sql).replace(/'(?:[^']|'')*'/g, "''")
  assert.doesNotMatch(noLiterals, /\b(insert\s+into|update\s+\w|delete\s+from|create\s|drop\s|alter\s|truncate\s|grant\s|revoke\s|call\s|do\s+\$|copy\s)/, `${name}: no write/DDL keyword`)
  assert.doesNotMatch(noLiterals, /\bfrom\s+auth\.|\bfrom\s+public\.admin_users\b(?!\s+where\s+is_active)/, `${name} reads no auth rows and no admin identities`)
  assert.match(sql, /\)\) as portfolio_(preflight|data_check|verification)(\s+from agg a)?;\s*$/, `${name} returns one JSON cell`)
}
// the data check returns counts only
{
  const noLiterals = code(S.data).replace(/'(?:[^']|'')*'/g, "''")
  assert.doesNotMatch(noLiterals, /string_agg|array_agg|jsonb_agg\s*\(\s*(slug|j\b|r\.|valid\.)/, 'data check never aggregates project content')
  for (const key of ['total', 'null_or_blank', 'invalid_for_public_url', 'duplicate_slug_groups', 'existing_rows_violating_new_constraints', 'new_objects_conflict', 'verdict']) assert.match(S.data, new RegExp(`'${key}'`), `data check reports ${key}`)
}
for (const key of ['ready_for_forward', 'blockers', 'review']) assert.match(S.preflight, new RegExp(`'${key}'`), `preflight reports ${key}`)
for (const key of ['problem_count', 'problems', 'parent_columns', 'classification', 'child_tables', 'policies', 'functions']) assert.match(S.verify, new RegExp(`'${key}'`), `verifier reports ${key}`)

/* -- the state-changing scripts: live production guard, one transaction, lock timeout ------------------------------------------ */
for (const name of ['forward', 'access', 'structural']) {
  const c = code(S[name])
  assert.match(c, /current_setting\('hbee\.confirm_production', true\)/, `${name}: live production confirmation guard`)
  assert.match(c, /<> 'yes' then\s+raise exception 'refusing to run/, `${name}: refuses without the confirmation`)
  assert.equal((c.match(/^begin;/gm) || []).length, 1, `${name}: exactly one transaction`)
  assert.match(c, /^commit;/m, `${name}: commits once, at the end`)
  assert.doesNotMatch(c.replace(/'(?:[^']|'')*'/g, "''"), /\brollback\b|\bsavepoint\b/, `${name}: no ROLLBACK / SAVEPOINT statement`)
  assert.match(c, /set local lock_timeout = '5s'/, `${name}: lock timeout`)
  assert.ok(c.indexOf("hbee.confirm_production") < c.indexOf('create ') || name !== 'forward', `${name}: guard precedes DDL`)
}
// the confirmation must be the FIRST executable statement after BEGIN/SET (nothing is changed before it)
{
  const c = code(S.forward)
  const guardAt = c.indexOf("hbee.confirm_production")
  const firstDdl = c.search(/\b(create|alter|drop|grant|revoke|insert|update|delete)\b/)
  assert.ok(guardAt > 0 && guardAt < firstDdl, 'forward: the confirmation guard runs before any DDL or DML')
}

/* -- forward = the reviewed draft, UNCHANGED, inside a production wrapper -------------------------------------------------------- */
{
  const draft = sqlRead('portfolio-creative-01-forward.sql')
  const start = draft.indexOf('\nbegin;\n'), end = draft.lastIndexOf('\ncommit;')
  assert.ok(start > 0 && end > start, 'draft markers found')
  const body = draft.slice(start + '\nbegin;\n'.length, end).replace(/[^\x00-\x7F]/g, '-')
  assert.ok(S.forward.includes(body), 'forward embeds scripts/portfolio-creative-01-forward.sql unchanged (only non-ASCII comment characters normalised)')
  assert.ok(S.forward.indexOf('BEGIN scripts/portfolio-creative-01-forward.sql') < S.forward.indexOf(body.slice(0, 120)), 'draft body sits between the markers')
  const cs = sqlRead('portfolio-case-study-01-forward.sql')
  assert.match(cs, /add column if not exists is_case_study boolean not null default false/)
  assert.match(S.forward, /add column if not exists is_case_study boolean not null default false/, 'forward folds in the Case Study column exactly as the reviewed draft defines it')
  assert.match(S.forward, /comment on column public\.portfolio_items\.is_case_study is 'Hbee portfolio case study v1'/)
}

/* -- additive and data-preserving ---------------------------------------------------------------------------------------------- */
{
  const c = code(S.forward)
  assert.doesNotMatch(c, /\bdrop\s+(table|column|schema|function|type)\b/, 'forward drops no table/column/schema/function')
  assert.doesNotMatch(c.replace(/'(?:[^']|'')*'/g, "''"), /\btruncate\b|\balter\s+table\s+public\.portfolio_items\s+drop\b/, 'forward truncates nothing and drops no column')
  assert.deepEqual([...c.matchAll(/\bdelete\s+from\s+([\w.]+)/g)].map((m) => m[1]).sort(), ['public.portfolio_capabilities', 'public.portfolio_media'], 'the only DELETEs are the save RPC replacing child rows, never project rows')
  const updates = [...c.matchAll(/\bupdate\s+public\.portfolio_items\s+set\s+([^;]*?)\s+where\b/g)].map((m) => m[1].replace(/\s+/g, ''))
  assert.ok(updates.length >= 3, 'the revision bumps exist')
  for (const u of updates) assert.equal(u, 'creative_revision=creative_revision+1', 'the only UPDATE of portfolio_items is the +1 revision bump (save RPC and trigger), never a value or a backfill')
  assert.equal((c.match(/\bupdate\s+public\.portfolio_items\b/g) || []).length, updates.length, 'every UPDATE of portfolio_items has a WHERE and is a revision bump')
  assert.doesNotMatch(c, /\binsert\s+into\s+public\.portfolio_items\b/, 'forward inserts no project')
  assert.doesNotMatch(c, /\bstorage\.(objects|buckets)\b/, 'no storage change')
  assert.doesNotMatch(c, /alter\s+table\s+public\.portfolio_items\s+(disable|no\s+force|force)\s+row/, 'portfolio_items RLS flags are not touched')
  assert.doesNotMatch(c, /(create|alter|drop)\s+policy[^;]*on\s+public\.portfolio_items/, 'portfolio_items policies are not changed')
  assert.doesNotMatch(c, /(grant|revoke)[^;]*on\s+(table\s+)?public\.portfolio_items\b/, 'portfolio_items grants are not changed')
  assert.equal((c.match(/alter table public\.portfolio_items add column if not exists/g) || []).length, 4, 'exactly four new parent columns (revision, engagement, status, case study)')
  for (const col of ['creative_revision bigint not null default 0', "engagement_type text not null default 'studio_team'", "project_status text not null default 'completed'", 'is_case_study boolean not null default false']) assert.ok(c.includes(col), `safe constant default: ${col}`)
  assert.doesNotMatch(c, /default\s+'client'|default\s+'ongoing'|default\s+true/, 'no default can promote a row to client / ongoing / case study')
  // strict first apply
  assert.match(c, /not a first apply - already present/, 'first-apply guard')
  assert.match(c, /to_regclass\('public\.' \|\| r\) is not null/, 'guard checks both tables')
  // fingerprints proving the rows survive
  assert.match(c, /hbee\.pf_digest/); assert.match(c, /an existing portfolio_items value changed/)
  assert.match(c, /portfolio_items policies changed/); assert.match(c, /portfolio_items grants changed/)
}

/* -- RLS: public reads only what rendering needs; only an ACTIVE admin writes ----------------------------------------------------- */
{
  const c = code(S.forward)
  const policies = [...c.matchAll(/create policy (\w+) on public\.(\w+) for (\w+) to ([\w, ]+?)\s+(using|with)/g)].map((m) => ({ name: m[1], table: m[2], cmd: m[3], roles: m[4].trim() }))
  assert.equal(policies.length, 4, 'exactly four policies, all on the two new tables')
  assert.deepEqual(policies.map((p) => p.name).sort(), ['portfolio_capabilities_admin', 'portfolio_capabilities_published', 'portfolio_media_admin', 'portfolio_media_published'])
  for (const p of policies.filter((x) => x.name.endsWith('_published'))) { assert.equal(p.cmd, 'select', `${p.name} is read-only`); assert.equal(p.roles, 'anon, authenticated') }
  for (const p of policies.filter((x) => x.name.endsWith('_admin'))) { assert.equal(p.cmd, 'all'); assert.equal(p.roles, 'authenticated', `${p.name} is for signed-in users only`) }
  const admin = /exists \(select 1 from public\.admin_users a where a\.user_id = auth\.uid\(\) and a\.is_active = true\)/g
  assert.equal((c.match(admin) || []).length >= 5, true, 'the active-admin predicate is used for both USING and WITH CHECK of both policies, and by the RPC')
  assert.doesNotMatch(c, /using\s*\(\s*true\s*\)|with check\s*\(\s*true\s*\)/, 'no open policy')
  assert.match(c, /is_visible and exists \(select 1 from public\.portfolio_items p where p\.id = portfolio_media\.portfolio_id and p\.is_active = true\)/, 'public media: visible assets of ACTIVE projects only')
  assert.match(c, /from public\.portfolio_items p where p\.id = portfolio_capabilities\.portfolio_id and p\.is_active = true/, 'public capabilities: ACTIVE projects only')
  assert.match(c, /alter table public\.portfolio_media enable row level security/); assert.match(c, /alter table public\.portfolio_capabilities enable row level security/)
  // grants
  const grants = [...c.matchAll(/\bgrant\s+([^;]+?)\s+on\s+([^;]+?)\s+to\s+([^;]+);/g)].map((m) => ({ priv: m[1].trim(), on: m[2].trim(), to: m[3].trim() }))
  for (const g of grants) assert.doesNotMatch(g.priv, /\ball\b|truncate|trigger|references/, `no broad/dangerous grant: ${g.priv} to ${g.to}`)
  const tableGrants = grants.filter((g) => /portfolio_media/.test(g.on))
  assert.deepEqual(tableGrants.map((g) => `${g.priv} -> ${g.to}`).sort(), ['select -> anon', 'select, insert, update, delete -> authenticated', 'select, insert, update, delete -> service_role'])
  assert.match(c, /revoke all on public\.portfolio_media, public\.portfolio_capabilities from public, anon, authenticated/, 'default API-role privileges are revoked before the minimum is granted')
  assert.match(c, /grant execute on function public\.save_portfolio_creative\(text,jsonb,text\[\],bigint,boolean,boolean\) to authenticated;/, 'the save RPC is executable by authenticated only')
  assert.doesNotMatch(c, /grant execute[^;]*\bto\b[^;]*\b(anon|public)\b/, 'no function is executable by anon / PUBLIC')
  assert.match(c, /security invoker/, 'RPC runs with the caller rights')
  assert.doesNotMatch(c.replace(/'(?:[^']|'')*'/g, "''"), /security definer/, 'no security definer function anywhere')
  assert.match(c, /if not exists \(select 1 from public\.admin_users a where a\.user_id = auth\.uid\(\) and a\.is_active = true\) then\s+raise exception 'active admin required'/, 'RPC re-checks the active admin itself')
}
// post-conditions prove the result before COMMIT
{
  const post = code(S.forward).split('do $prod_post$')[1]
  assert.ok(post && post.indexOf('commit;') > 0, 'post-condition block precedes COMMIT')
  for (const frag of ['row count changed', 'did not take the safe defaults', 'rls is not enabled on', 'constraints present', 'revision triggers enabled', 'unguarded write policy', 'anon holds a write/dangerous privilege', 'public holds a privilege', 'is security definer', 'anon can execute', 'portfolio_items policies changed', 'portfolio_items grants changed']) assert.ok(post.includes(frag), `post-condition: ${frag}`)
}

/* -- legacy compatibility: nothing is renamed, merged or backfilled ------------------------------------------------------------- */
{
  const c = code(S.forward)
  for (const legacy of ['overview', 'brief', 'challenge', 'solution', 'results', 'process', 'services', 'technologies', 'testimonial', 'gallery_images', 'gallery', 'before_image', 'after_image']) {
    assert.doesNotMatch(c, new RegExp(`\\b${legacy}\\b`), `forward does not touch legacy field ${legacy}`)
  }
  assert.doesNotMatch(c, /objectives/, 'no Objectives field is introduced')
}

/* -- rollbacks ------------------------------------------------------------------------------------------------------------------ */
{
  const a = code(S.access)
  assert.doesNotMatch(a.replace(/'(?:[^']|'')*'/g, "''"), /\bdrop\b|\btruncate\b|\bdelete\b|\binsert\b|\bupdate\s+\w/, 'access rollback destroys and rewrites nothing')
  assert.match(a, /revoke all on public\.portfolio_media, public\.portfolio_capabilities from public, anon, authenticated/)
  assert.match(a, /revoke all on function public\.save_portfolio_creative\(text,jsonb,text\[\],bigint,boolean,boolean\) from public, anon, authenticated/)
  assert.match(a, /a child row count changed/); assert.match(a, /portfolio_items policies changed/)
  assert.match(S.access, /set NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED off|FIRST set NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED off/, 'access rollback states the flag-first order')

  const s = code(S.structural)
  assert.match(s, /hbee\.confirm_irreversible/, 'structural rollback needs the irreversible confirmation')
  assert.match(s, /select count\(\*\) into v_n from public\.portfolio_media;\s+if v_n <> 0 then raise exception 'abort \(nothing changed\): portfolio_media holds % row\(s\)/)
  assert.match(s, /select count\(\*\) into v_n from public\.portfolio_capabilities;\s+if v_n <> 0 then raise exception 'abort \(nothing changed\): portfolio_capabilities holds % row\(s\)/)
  assert.match(s, /creative_revision <> 0 or engagement_type <> 'studio_team' or project_status <> 'completed' or is_case_study <> false/, 'aborts if any project was classified or revised')
  assert.match(s, /hbee portfolio creative phase c v1/, 'ownership marker check')
  assert.ok(s.indexOf('drop trigger') > s.indexOf('end $guard$'), 'drops come only after the guards')
  assert.doesNotMatch(s, /drop table public\.portfolio_items|delete from|truncate/, 'never touches project rows')
  assert.equal([...s.matchAll(/\bdrop (table|function|trigger)\b/g)].length, 6, 'drops exactly 2 triggers, 2 functions, 2 tables')
  assert.match(s, /drop column is_case_study, drop column project_status, drop column engagement_type, drop column creative_revision/, 'and exactly the four columns')
  assert.match(s, /a portfolio_items value changed/)
}

/* -- feature flag and routing wiring (the SQL is not the only safety) ------------------------------------------------------------ */
{
  const flag = srcRead('src/lib/portfolio-creative.ts')
  assert.match(flag, /process\.env\.NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED === 'true'/, 'only the exact string true enables the experience')
  const tracked = require('node:child_process').execSync('git ls-files', { cwd: root }).toString().split('\n')
  for (const f of tracked.filter((x) => /^(\.env|vercel\.json|next\.config)/.test(x))) assert.doesNotMatch(fs.readFileSync(path.join(root, f), 'utf8'), /PORTFOLIO_CREATIVE_ENABLED/, `${f} does not set the flag`)

  const workData = srcRead('src/lib/site/work-data.ts')
  assert.match(workData, /if \(!portfolioCreativeEnabled\(\)\) return toWorkDetail\(data as Row, media\)/, 'flag off: detail is built without creative options')
  assert.match(workData, /if \(!portfolioCreativeEnabled\(\)\) return buildWorkData\(data as Row\[\]\)/, 'flag off: listing is built without creative options')
  assert.match(workData, /const caseStudy = Boolean\(creative\) && isCaseStudy\(row\.is_case_study\)/, 'flag off: a row can never be a Case Study')
  assert.equal((workData.match(/\.eq\('is_active', true\)/g) || []).length >= 3, true, 'listing, detail and SEO reads all filter to active (published) projects')

  const data = srcRead('src/lib/site/portfolio-creative-data.ts')
  for (const fn of ['getPortfolioMedia', 'getPortfolioCapabilities', 'getWorkCreativeIndex', 'getCapabilityWork']) assert.match(data, new RegExp(`export async function ${fn}[^{]*\\{\\s*(?:\\n\\s*)?(?:\\/\\*[^]*?\\*\\/)?[^]*?if \\(!portfolioCreativeEnabled\\(\\)`), `${fn} returns before any new-table read when the flag is off`)
  assert.equal((data.match(/catch \{/g) || []).length >= 4, true, 'every new-table read degrades instead of throwing')
  assert.match(data, /return error \? \[\] : readCreativeMedia/, 'a missing table (error) reads as no media')

  // canonical routing: the two detail routes are mutually exclusive, so no redirect loop is possible
  const w = srcRead('src/app/(site)/work/[slug]/page.tsx'), cs = srcRead('src/app/(site)/case-studies/[slug]/page.tsx')
  assert.match(w, /if \(detail\.creative\?\.caseStudy\) redirect\(`\/case-studies\/\$\{params\.slug\}`\)/)
  assert.match(cs, /if \(!detail\.creative\?\.caseStudy\) redirect\(`\/work\/\$\{params\.slug\}`\)/)
  assert.match(cs, /if \(!portfolioCreativeEnabled\(\)\) notFound\(\)/, 'flag off: /case-studies/[slug] is a 404, never a redirect')
  assert.match(srcRead('src/app/(site)/case-studies/page.tsx'), /if \(!portfolioCreativeEnabled\(\)\) notFound\(\)/)
  assert.match(w, /const detail = await getWorkDetail\(params\.slug\)\s+if \(!detail\) notFound\(\)/, 'unpublished or unknown project: 404 before any redirect')
  assert.match(cs, /const detail = await getWorkDetail\(params\.slug\)\s+if \(!detail\) notFound\(\)/)
}

/* -- release documentation ------------------------------------------------------------------------------------------------------- */
{
  const doc = srcRead('docs/portfolio-cms-case-studies-release.md')
  for (const f of Object.values(F)) assert.ok(doc.includes(f), `release doc names ${f}`)
  for (const h of ['Rollout sequence', 'Rollback and forward-fix', 'Not proven']) assert.ok(doc.includes(h), `release doc has "${h}"`)
}

console.log('PASS: Portfolio CMS + Case Studies production SQL (static) - strict first apply, data-preserving, active-admin-only writes, minimal grants, safe rollbacks, flag-off safety and loop-free routing. PostgreSQL behaviour NOT proven by this test.')
