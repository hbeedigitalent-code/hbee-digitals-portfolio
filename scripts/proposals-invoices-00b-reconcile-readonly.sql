-- =============================================================================
-- S6.4 PROPOSALS V2 + INVOICES — PREFLIGHT 00b: RECONCILIATION (READ-ONLY)
-- Run in: Supabase SQL Editor (production), AFTER 00 and BEFORE the forward migration is written.
-- NOT YET EXECUTED.
--
-- SCOPE (deliberately narrow). Production revealed one relation the application-code audit did not know about:
--     public.proposal_requests
-- and the preflight mis-reported the proposal -> project link (it probed guessed column names). This script inspects ONLY:
--   A. public.proposal_requests  — what it is, how it is built, who can touch it, whether it already stores
--      change-request / revision comments or decisions, and what in the database refers to it;
--   B. the proposals -> projects link (the REAL columns, found by pattern on the catalog) and its data integrity.
-- Nothing else is read.
--
-- ONE statement, ONE grid: (section, item, value, note). It reads pg_catalog / information_schema and COUNTS rows.
-- PRIVACY: it never returns a comment, note, reason, message, name, email, title, proposal content, amount or path.
--   * Per-column evidence is COUNTS of non-empty values, nothing more.
--   * The only stored values it can show are VOCABULARY values — values of columns whose name ends in
--     status / type / category / kind / state / decision / action / stage — and only when the value is a short word
--     (letters, spaces, underscores, hyphens, at most 30 characters). Anything else is reported as its length.
-- It writes nothing.
-- =============================================================================
WITH
prel AS (
  SELECT c.oid, c.relkind::text AS kind, c.relrowsecurity AS rls, c.relforcerowsecurity AS force_rls
  FROM pg_class c WHERE c.oid = to_regclass('public.proposal_requests')
),
pr AS (SELECT to_jsonb(x) AS r FROM public.proposal_requests x),

-- ── A1. identity ────────────────────────────────────────────────────────────────────────────────────────────
a1 AS (
  SELECT 'A1. identity' AS section, 'relation kind' AS item,
         coalesce((SELECT CASE kind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'p' THEN 'partitioned table' WHEN 'm' THEN 'materialized view' ELSE kind END FROM prel), 'DOES NOT EXIST') AS value,
         'public.proposal_requests' AS note
  UNION ALL SELECT 'A1. identity', 'exact row count', (SELECT count(*) FROM pr)::text, '0 = no data to migrate or preserve'
  UNION ALL SELECT 'A1. identity', 'created / updated range (dates only)',
         coalesce(min(r ->> 'created_at')::timestamptz::date::text, '-') || ' .. ' || coalesce(max(coalesce(r ->> 'updated_at', r ->> 'created_at'))::timestamptz::date::text, '-'), 'null when the table has no created_at' FROM pr
  UNION ALL SELECT 'A1. identity', 'RLS enabled / forced', coalesce((SELECT rls::text || ' / ' || force_rls::text FROM prel), '-'), ''
  UNION ALL SELECT 'A1. identity', 'table comment', coalesce((SELECT obj_description(oid, 'pg_class') FROM prel), '<none>'), 'a DBA-written description of its purpose, if any'
),

-- ── A2. columns ─────────────────────────────────────────────────────────────────────────────────────────────
a2 AS (
  SELECT 'A2. columns', c.column_name::text,
         c.data_type::text || CASE WHEN c.character_maximum_length IS NOT NULL THEN '(' || c.character_maximum_length::text || ')' ELSE '' END
           || CASE WHEN c.data_type = 'USER-DEFINED' THEN ' ' || c.udt_name::text ELSE '' END,
         CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END || coalesce(' default ' || c.column_default, '')
           || coalesce(' | comment: ' || col_description((SELECT oid FROM prel), c.ordinal_position::int), '')
  FROM information_schema.columns c WHERE c.table_schema = 'public' AND c.table_name = 'proposal_requests'
),

-- ── A3. constraints, foreign keys (both directions), indexes, triggers, policies, grants ──────────────────────
a3 AS (
  SELECT 'A3. constraints on proposal_requests', k.conname::text, pg_get_constraintdef(k.oid), k.contype::text
  FROM pg_constraint k WHERE k.conrelid = (SELECT oid FROM prel)
  UNION ALL
  SELECT 'A3. foreign keys pointing AT proposal_requests', k.conrelid::regclass::text || ' :: ' || k.conname::text, pg_get_constraintdef(k.oid), ''
  FROM pg_constraint k WHERE k.confrelid = (SELECT oid FROM prel)
),
a4 AS (
  SELECT 'A4. indexes', i.indexname::text, i.indexdef, '' FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename = 'proposal_requests'
),
a5 AS (
  SELECT 'A5. triggers', t.tgname::text, pg_get_triggerdef(t.oid), CASE WHEN t.tgenabled::text = 'D' THEN 'DISABLED' ELSE 'enabled' END
  FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid = (SELECT oid FROM prel)
),
a6 AS (
  SELECT 'A6. policies', p.policyname::text, p.cmd::text || ' ' || p.permissive::text || ' ' || p.roles::text,
         'USING ' || coalesce(p.qual, '<none>') || ' | CHECK ' || coalesce(p.with_check, '<none>')
  FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = 'proposal_requests'
),
a7 AS (
  -- RAW grants only (RLS is judged separately by the policies above). SELECT / INSERT / UPDATE can be held per column or per
  -- table; DELETE only per table, because has_any_column_privilege rejects it with 22023.
  SELECT 'A7. raw grants (not an exposure by themselves)', x.role,
         coalesce(nullif(concat_ws(',',
           CASE WHEN has_any_column_privilege(x.role, (SELECT oid FROM prel), 'SELECT') OR has_table_privilege(x.role, (SELECT oid FROM prel), 'SELECT') THEN 'SELECT' END,
           CASE WHEN has_any_column_privilege(x.role, (SELECT oid FROM prel), 'INSERT') OR has_table_privilege(x.role, (SELECT oid FROM prel), 'INSERT') THEN 'INSERT' END,
           CASE WHEN has_any_column_privilege(x.role, (SELECT oid FROM prel), 'UPDATE') OR has_table_privilege(x.role, (SELECT oid FROM prel), 'UPDATE') THEN 'UPDATE' END,
           CASE WHEN has_table_privilege(x.role, (SELECT oid FROM prel), 'DELETE') THEN 'DELETE' END), ''), '(none)'),
         ''
  FROM (VALUES ('anon'), ('authenticated'), ('service_role')) AS x(role)
  WHERE EXISTS (SELECT 1 FROM prel)
),

-- ── A8. what is actually stored: COUNTS of non-empty values per column, never the values ─────────────────────
a8 AS (
  SELECT 'A8. non-empty values per column (counts only)', e.k, count(*) FILTER (WHERE e.v IS NOT NULL AND btrim(e.v) <> '')::text || ' of ' || count(*)::text,
         CASE WHEN e.k ~* '(comment|note|message|reason|feedback|decision|response|body|text|description|change|revision|request|detail)' THEN 'free-text-looking column' ELSE '' END
  FROM pr, jsonb_each_text(pr.r) AS e(k, v) GROUP BY e.k
),

-- ── A9. vocabulary of status-like columns (short words only) ────────────────────────────────────────────────
a9 AS (
  SELECT 'A9. vocabulary', e.k || ' = ' ||
         CASE WHEN e.v IS NULL THEN '<null>' WHEN e.v ~ '^[A-Za-z][A-Za-z _-]{0,29}$' THEN e.v ELSE '<not a short word: ' || length(e.v)::text || ' chars>' END,
         count(*)::text, 'value distribution'
  FROM pr, jsonb_each_text(pr.r) AS e(k, v)
  WHERE e.k ~* '(status|type|category|kind|state|decision|action|stage)$'
  GROUP BY e.k, 2
),

-- ── A10. relationships: do its *_id columns resolve to real parents? (counts only) ───────────────────────────
a10 AS (
  SELECT 'A10. relationships' AS section, 'proposal_id: rows with a value / resolving to a proposal' AS item,
         count(*) FILTER (WHERE r ->> 'proposal_id' IS NOT NULL)::text || ' / ' ||
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.proposals p WHERE p.id::text = pr.r ->> 'proposal_id'))::text AS value, '' AS note FROM pr
  UNION ALL SELECT 'A10. relationships', 'client_id: rows with a value / resolving to a client',
         count(*) FILTER (WHERE r ->> 'client_id' IS NOT NULL)::text || ' / ' ||
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.clients c WHERE c.id::text = pr.r ->> 'client_id'))::text, '' FROM pr
  UNION ALL SELECT 'A10. relationships', 'merchant_id: rows with a value / resolving to a merchant',
         count(*) FILTER (WHERE r ->> 'merchant_id' IS NOT NULL)::text || ' / ' ||
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.merchants m WHERE m.id::text = pr.r ->> 'merchant_id'))::text, '' FROM pr
  UNION ALL SELECT 'A10. relationships', 'project_id: rows with a value / resolving to a project',
         count(*) FILTER (WHERE r ->> 'project_id' IS NOT NULL)::text || ' / ' ||
         count(*) FILTER (WHERE EXISTS (SELECT 1 FROM public.projects pj WHERE pj.id::text = pr.r ->> 'project_id'))::text, '' FROM pr
  UNION ALL SELECT 'A10. relationships', '*_id / user-like columns present (names only)',
         coalesce((SELECT string_agg(c.column_name::text, ', ' ORDER BY c.column_name::text) FROM information_schema.columns c
                   WHERE c.table_schema = 'public' AND c.table_name = 'proposal_requests' AND c.column_name::text ~* '(_id$|^user|created_by|requested_by|author)'), 'none'),
         'compare with the foreign keys in A3'
),

-- ── A11. is anything in the database already using it? ───────────────────────────────────────────────────────
a11 AS (
  SELECT 'A11. referenced from the database' AS section, 'function: ' || p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')' AS item,
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS value, 'its body mentions proposal_requests' AS note
  FROM pg_proc p WHERE p.pronamespace = 'public'::regnamespace AND p.prosrc ~* 'proposal_requests'
  UNION ALL SELECT 'A11. referenced from the database', 'view: ' || v.viewname::text, 'view', 'its definition mentions proposal_requests'
         FROM pg_views v WHERE v.schemaname = 'public' AND v.definition ~* 'proposal_requests'
  UNION ALL SELECT 'A11. referenced from the database', 'application code (repository grep, recorded by the preparer)', 'no reference in src/, scripts/ or docs/', 'verified against b3ec20e'
),

-- ── B. the proposals -> projects link, from the REAL catalog ─────────────────────────────────────────────────
b1 AS (
  SELECT 'B1. proposals link columns' AS section, c.column_name::text AS item, c.data_type::text AS value,
         CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END || coalesce(' default ' || c.column_default, '') AS note
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name = 'proposals' AND c.column_name::text ~* '(project|convert)'
  UNION ALL
  SELECT 'B1. proposals link constraints', k.conname::text, pg_get_constraintdef(k.oid), k.contype::text
  FROM pg_constraint k WHERE k.conrelid = 'public.proposals'::regclass
    AND EXISTS (SELECT 1 FROM unnest(k.conkey) ck JOIN pg_attribute a ON a.attrelid = k.conrelid AND a.attnum = ck WHERE a.attname::text ~* '(project|convert)')
  UNION ALL
  SELECT 'B1. proposals link indexes', i.indexname::text, i.indexdef, '' FROM pg_indexes i
  WHERE i.schemaname = 'public' AND i.tablename = 'proposals' AND i.indexdef ~* '(project|convert)'
),
pj AS (SELECT to_jsonb(p) AS r FROM public.proposals p),
b2 AS (
  SELECT 'B2. proposal -> project integrity' AS section, 'proposals total' AS item, count(*)::text AS value, '' AS note FROM pj
  UNION ALL SELECT 'B2. proposal -> project integrity', 'status = ' || coalesce(r ->> 'status', '<null>') || ' / converted_to_project_id ' ||
           CASE WHEN r ->> 'converted_to_project_id' IS NULL THEN 'null' ELSE 'set' END, count(*)::text, 'approved + set = converted (derived)'
         FROM pj GROUP BY r ->> 'status', (r ->> 'converted_to_project_id' IS NULL)
  UNION ALL SELECT 'B2. proposal -> project integrity', 'link set and the project EXISTS', count(*)::text, 'must equal the number set'
         FROM pj WHERE r ->> 'converted_to_project_id' IS NOT NULL AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id::text = pj.r ->> 'converted_to_project_id')
  UNION ALL SELECT 'B2. proposal -> project integrity', 'link set and the project belongs to the SAME client', count(*)::text, 'cross-client links would be a defect'
         FROM pj JOIN public.projects p ON p.id::text = pj.r ->> 'converted_to_project_id' WHERE p.client_id::text IS NOT DISTINCT FROM pj.r ->> 'client_id' AND pj.r ->> 'client_id' IS NOT NULL
  UNION ALL SELECT 'B2. proposal -> project integrity', 'link set and the project is a PUBLIC portfolio row (no client)', count(*)::text, 'must be 0: conversion never touches portfolio rows'
         FROM pj JOIN public.projects p ON p.id::text = pj.r ->> 'converted_to_project_id' WHERE p.client_id IS NULL
  UNION ALL SELECT 'B2. proposal -> project integrity', 'projects linked by more than one proposal', count(*)::text, 'non-zero would break one-project-per-proposal'
         FROM (SELECT r ->> 'converted_to_project_id' AS pid FROM pj WHERE r ->> 'converted_to_project_id' IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT 'B2. proposal -> project integrity', 'link set but status is not approved', count(*)::text, 'non-zero = a link on a proposal that was never approved'
         FROM pj WHERE r ->> 'converted_to_project_id' IS NOT NULL AND coalesce(r ->> 'status', '') <> 'approved'
)

SELECT * FROM a1
UNION ALL SELECT * FROM a2
UNION ALL SELECT * FROM a3
UNION ALL SELECT * FROM a4
UNION ALL SELECT * FROM a5
UNION ALL SELECT * FROM a6
UNION ALL SELECT * FROM a7
UNION ALL SELECT * FROM a8
UNION ALL SELECT * FROM a9
UNION ALL SELECT * FROM a10
UNION ALL SELECT * FROM a11
UNION ALL SELECT * FROM b1
UNION ALL SELECT * FROM b2
ORDER BY 1, 2;
