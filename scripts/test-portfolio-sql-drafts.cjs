// Offline STATIC checks of the Phase C v3 SQL drafts that the production scripts are built from. No database, no network.
// These prove what the files say, NOT how PostgreSQL behaves: constraint/RLS/RPC behaviour
// is NOT proven here (staging behaviour tests are intentionally not part of this release).
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8')
const stripComments = (sql) => sql.replace(/--[^\n]*/g, '')
const forward = read('portfolio-creative-01-forward.sql')
const rollback = read('portfolio-creative-02-rollback.sql')
const preflight = read('portfolio-creative-00-preflight.sql')
const verify = read('portfolio-creative-03-verify.sql')
const code = (sql) => stripComments(sql).toLowerCase()

/* -- Every draft is labelled as not executed ----------------------------------- */
for (const [name, sql] of Object.entries({ forward, rollback, preflight, verify })) {
  assert.match(sql, /NOT EXECUTED/i, `${name} is labelled NOT EXECUTED`)
}

/* -- Minimum migration: video + classification, nothing optional --------------- */
for (const column of ['media_kind', 'title', 'description', 'video_url', 'captions_url', 'transcript']) {
  assert.match(forward, new RegExp(`add column if not exists ${column}\\b`), `forward adds portfolio_media.${column}`)
}
assert.match(forward, /add column if not exists engagement_type text not null default 'studio_team'/, 'engagement_type defaults to the NON-client value')
assert.match(forward, /add column if not exists project_status text not null default 'completed'/)
assert.match(forward, /engagement_type in \('client','studio_team'\)/, 'only the two approved engagement types can be stored')
assert.match(forward, /project_status in \('completed','ongoing'\)/)
assert.doesNotMatch(code(forward), /set\s+engagement_type\s*=\s*'client'/, 'forward never promotes any row to client (no backfill)')
for (const column of ['deliverables', 'og_image_url']) assert.ok(!code(forward).includes(column), `${column} is not part of the minimum migration`)
assert.doesNotMatch(code(forward), /default\s+'client'/, 'client is never a default')
assert.match(forward, /media_kind = 'video' and video_url is not null and length\(btrim\(title\)\) > 0 and length\(btrim\(description\)\) > 0/, 'video requires video_url, title and description')
assert.match(forward, /media_kind = 'image' and video_url is null and captions_url is null and transcript = ''/, 'an image cannot carry video fields')
assert.match(forward, /alt_text text not null check \(length\(btrim\(alt_text\)\) > 0\)/, 'alt text stays required (it describes the poster for a video)')
assert.match(forward, /length\(title\) <= 160 and length\(description\) <= 600 and length\(caption\) <= 1000 and length\(alt_text\) <= 300 and length\(transcript\) <= 20000/, 'owner-approved storage ceilings (title 160, description 600, caption 1000, alt 300, transcript 20000)')
assert.match(forward, /image_url text not null/, 'poster (image_url) stays required')
assert.match(forward, /video_url ~\* '\^https:\/\//, 'video URL must be https')
assert.match(forward, /is_visible boolean not null default false/, 'new assets stay hidden by default')

/* -- RPC: same signature, optional new keys, revision contract intact ---------- */
assert.match(forward, /create or replace function public\.save_portfolio_creative\(p_portfolio_id text, p_media jsonb, p_capabilities text\[\], p_expected_revision bigint, p_clear_media boolean default false, p_clear_capabilities boolean default false\)/, 'six-argument signature unchanged')
for (const key of ['media_kind', 'title', 'description', 'video_url', 'captions_url', 'transcript']) {
  assert.match(forward, new RegExp(`${key} = case when asset \\? '${key}' then excluded\\.${key} else public\\.portfolio_media\\.${key} end`), `omitted ${key} key preserves the stored value`)
}
assert.ok(forward.indexOf('for update;') < forward.indexOf('current_revision <> p_expected_revision'))
assert.ok(forward.indexOf('current_revision <> p_expected_revision') < forward.indexOf('insert into public.portfolio_media'))
assert.match(forward, /Hbee portfolio creative Phase C v3/)
assert.match(forward, /'Hbee portfolio creative Phase C v1','Hbee portfolio creative Phase C v2','Hbee portfolio creative Phase C v3'/, 'earlier markers still accepted (upgrade path)')

/* -- Nothing destructive anywhere except inside the rolled-back staging test --- */
for (const [name, sql] of Object.entries({ forward, rollback })) {
  assert.doesNotMatch(code(sql), /\bdrop\s+(table|column|schema)\b/, `${name} drops no table/column/schema`)
  assert.doesNotMatch(code(sql), /\btruncate\b/, `${name} truncates nothing`)
  assert.doesNotMatch(code(sql), /\bdelete\s+from\s+public\.portfolio_items\b/, `${name} never deletes portfolio rows`)
  assert.doesNotMatch(code(sql), /\bstorage\.(objects|buckets)\b/, `${name} does not touch storage tables or policies`)
}
assert.doesNotMatch(code(forward), /\balter\s+policy\b|create\s+policy[^;]*storage/, 'no storage policy change')
assert.doesNotMatch(code(forward), /\bupdate\s+public\.portfolio_items\s+set\s+(?!creative_revision)/, 'forward updates no portfolio business field')
assert.doesNotMatch(code(rollback), /^\s*(update|delete|insert)\b/m, 'rollback has no active data-mutating statement')

/* -- Preflight and verify are strictly read-only ------------------------------- */
for (const [name, sql] of Object.entries({ preflight, verify })) {
  const statements = stripComments(sql).split(';').map((s) => s.trim()).filter(Boolean)
  assert.ok(statements.length > 10, `${name} has statements`)
  for (const s of statements) assert.match(s, /^(select\b|with\s+\w+\s+as\s+materialized\s*\()/i, `${name}: every statement is a SELECT or a read-only WITH ... SELECT (found: ${s.slice(0, 40)}...)`)
  assert.doesNotMatch(code(sql), /\b(insert\s+into|update\s+\w|delete\s+from|create\s|drop\s|alter\s|truncate\s|grant\s|revoke\s)/i, `${name}: no write/DDL keywords`)
}
assert.doesNotMatch(code(preflight), /coalesce\([^)]*'\{\}'::aclitem\[\]/, 'preflight never feeds an empty aclitem[] to aclexplode()')
assert.doesNotMatch(code(verify), /coalesce\([^)]*'\{\}'::aclitem\[\]/, 'verify never feeds an empty aclitem[] to aclexplode()')
assert.doesNotMatch(code(verify), /aclexplode\(coalesce\(/, 'verify: no coalesce(...) straight into aclexplode()')
for (const re of [/cardinality\(c\.relacl\)>0/, /cardinality\(a\.attacl\)>0/, /cardinality\(d\.defaclacl\)>0/, /cardinality\(p\.proacl\)>0/]) assert.match(code(verify), re, 'verify guards ' + re)
assert.match(verify, /BLOCKER: UNSAFE DEFAULT \(must be studio_team\)/, 'verify blocks an unsafe engagement_type default')
assert.match(verify, /invalid_engagement_rows/)
assert.match(verify, /portfolio_media_kind_shape/)



/* -- Case Study classification: isolated, additive, never auto-promoting ---------- */
const csForward = read('portfolio-case-study-01-forward.sql')
const csRollback = read('portfolio-case-study-02-rollback.sql')
const csVerify = read('portfolio-case-study-03-verify.sql')
for (const [name, sql] of Object.entries({ csForward, csRollback, csVerify })) assert.match(sql, /NOT EXECUTED/i, `${name} is labelled NOT EXECUTED`)
assert.match(csForward, /add column if not exists is_case_study boolean not null default false/, 'existing rows default to Standard Work')
assert.equal((code(csForward).match(/\balter table\b/g) || []).length, 1, 'forward alters exactly one thing')
assert.doesNotMatch(code(csForward), /\bupdate\b|\binsert\b|\bdelete\b|\bdrop\b|\btruncate\b|\bgrant\b|\brevoke\b|\bcreate (policy|function|trigger|table|index)\b/, 'forward is column-only: no backfill, no grants, no policy/function/trigger changes')
assert.doesNotMatch(code(csForward), /is_case_study\s*=\s*true|default true/, 'nothing is ever promoted to a Case Study')
assert.ok(!/is_case_study/.test(forward + rollback), 'the validated creative migration is not rewritten to add the field')
assert.match(csForward, /Hbee portfolio case study v1/, 'ownership marker')
assert.match(csForward, /requires review/, 'unexpected pre-existing column aborts')
assert.match(csRollback, /drop column is_case_study/, 'rollback drops only this column')
assert.equal((code(csRollback).match(/\bdrop\b/g) || []).length, 1, 'rollback drops exactly one object')
assert.match(csRollback, /is not the column created by portfolio-case-study-01-forward\.sql/, 'rollback refuses a column it did not create')
assert.doesNotMatch(code(csRollback), /portfolio_media|portfolio_capabilities|engagement_type|project_status|creative_revision/, 'rollback touches no other object')
assert.doesNotMatch(code(csVerify), /\binsert\b|\bupdate\b|\bdelete\b|\bdrop\b|\balter\b|\bcreate\b|\btruncate\b/, 'verify is read-only')
assert.equal((stripComments(csVerify).match(/;/g) || []).length, 1, 'verify is a single statement')
assert.match(csVerify, /has_column_privilege\('anon'/, 'verify checks anon can read the new column')

console.log('PASS: Phase C v3 SQL drafts (static) - video + classification, safe engagement default, unchanged RPC signature, no destructive/storage statements, read-only preflight/verify, isolated Case Study column. PostgreSQL behaviour NOT verified.')
