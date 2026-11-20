-- =============================================================================
-- S6.4 PROPOSALS V2 + INVOICES + PDF — PRODUCTION PREFLIGHT (READ-ONLY)
-- Run in: Supabase SQL Editor (production) BEFORE any S6.4 migration is designed or run.
-- Prepared for S6.4. NOT YET EXECUTED.
--
-- WHY IT EXISTS. The repository holds NO DDL for proposals, proposal_files or project_invoices, so every fact below
-- is currently inferred from application code. The S6.4 model decisions (reuse project_invoices or add a table, how
-- legacy proposal JSON maps to line items, how money is stored, how invoice numbers are issued) are made from THIS
-- result and not from the code.
--
-- ONE statement, ONE grid: (section, item, value, note). It reads pg_catalog / information_schema and COUNTS rows.
-- It never returns a title, a description, an amount, a name, an email, a note, a path or a payment link. The only
-- stored literals it can show are STATUS words and CURRENCY codes (both non-sensitive vocabularies) and JSON KEY NAMES.
-- It writes nothing.
-- =============================================================================
WITH
tbls(name) AS (VALUES ('proposals'), ('proposal_files'), ('project_invoices'), ('projects'), ('clients'), ('merchants'),
                      ('notifications'), ('upload_sessions')),
rel AS (SELECT t.name, c.oid FROM tbls t JOIN pg_class c ON c.relname = t.name AND c.relnamespace = 'public'::regnamespace),

-- ── 1. every look-alike object (so nothing is duplicated by accident) ───────────────────────────────────────
s1 AS (
  SELECT '1. look-alike relations' AS section, c.relname::text AS item,
         CASE c.relkind::text WHEN 'r' THEN 'table' WHEN 'v' THEN 'view' WHEN 'S' THEN 'sequence' WHEN 'p' THEN 'partitioned table' WHEN 'm' THEN 'materialized view' ELSE c.relkind::text END AS value,
         'rows ~' || greatest(c.reltuples::bigint, 0)::text || ' (estimate; -1/0 = never analysed)' AS note
  FROM pg_class c
  WHERE c.relnamespace = 'public'::regnamespace AND c.relkind::text IN ('r', 'v', 'S', 'p', 'm')
    AND c.relname ~* '(proposal|invoice|payment|quote|billing|receipt|line_item|ledger|document|currency|counter|sequence)'
),
s1fn AS (
  SELECT '1. look-alike functions', p.proname::text || '(' || pg_get_function_identity_arguments(p.oid) || ')',
         CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END, 'returns ' || pg_get_function_result(p.oid)
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND (p.proname ~* '(proposal|invoice|payment|numbering|document_number)'
         OR p.prosrc ~* '(from|into|update|join)\s+(public\.)?(proposals|project_invoices)\M')
),

-- ── 2. the shape of the tables the commercial workflow already uses ───────────────────────────────────────────
s2cols AS (
  SELECT '2. columns', c.table_name::text || '.' || c.column_name::text,
         c.data_type::text || CASE WHEN c.data_type = 'numeric' THEN '(' || coalesce(c.numeric_precision::text, '?') || ',' || coalesce(c.numeric_scale::text, '?') || ')' ELSE '' END,
         CASE WHEN c.is_nullable = 'NO' THEN 'NOT NULL' ELSE 'nullable' END || coalesce(' default ' || c.column_default, '')
  FROM information_schema.columns c
  WHERE c.table_schema = 'public' AND c.table_name IN ('proposals', 'proposal_files', 'project_invoices')
     OR (c.table_schema = 'public' AND c.table_name = 'projects')
),
s2con AS (
  SELECT '2. constraints', r.name || ' :: ' || k.conname::text, pg_get_constraintdef(k.oid), k.contype::text
  FROM pg_constraint k JOIN rel r ON r.oid = k.conrelid WHERE r.name IN ('proposals', 'proposal_files', 'project_invoices', 'projects')
),
s2idx AS (
  SELECT '2. indexes', i.tablename::text || ' :: ' || i.indexname::text, i.indexdef, ''
  FROM pg_indexes i WHERE i.schemaname = 'public' AND i.tablename IN ('proposals', 'proposal_files', 'project_invoices', 'projects')
),
s2trg AS (
  SELECT '2. triggers', t.tgrelid::regclass::text || ' :: ' || t.tgname::text, pg_get_triggerdef(t.oid), ''
  FROM pg_trigger t WHERE NOT t.tgisinternal AND t.tgrelid IN (SELECT oid FROM rel WHERE name IN ('proposals', 'proposal_files', 'project_invoices'))
),
s2pol AS (
  SELECT '2. policies', p.tablename::text || ' :: ' || p.policyname::text, p.cmd::text || ' ' || p.permissive::text || ' ' || p.roles::text,
         'USING ' || coalesce(p.qual, '<none>') || ' | CHECK ' || coalesce(p.with_check, '<none>')
  FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename IN ('proposals', 'proposal_files', 'project_invoices')
),
s2priv AS (
  -- SELECT / INSERT / UPDATE can be held per column or per table; DELETE only per table (has_any_column_privilege
  -- rejects it with 22023), so DELETE uses has_table_privilege alone. RLS is separate: a raw grant is not an exposure.
  SELECT '2. browser privileges (grant only; RLS is judged separately)', r.name || ' / ' || x.role,
         concat_ws(',', CASE WHEN has_any_column_privilege(x.role, r.oid, 'SELECT') OR has_table_privilege(x.role, r.oid, 'SELECT') THEN 'SELECT' END,
                        CASE WHEN has_any_column_privilege(x.role, r.oid, 'INSERT') OR has_table_privilege(x.role, r.oid, 'INSERT') THEN 'INSERT' END,
                        CASE WHEN has_any_column_privilege(x.role, r.oid, 'UPDATE') OR has_table_privilege(x.role, r.oid, 'UPDATE') THEN 'UPDATE' END,
                        CASE WHEN has_table_privilege(x.role, r.oid, 'DELETE') THEN 'DELETE' END),
         'RLS enabled: ' || (SELECT c2.relrowsecurity::text FROM pg_class c2 WHERE c2.oid = r.oid)
  FROM rel r CROSS JOIN (VALUES ('anon'), ('authenticated')) AS x(role)
  WHERE r.name IN ('proposals', 'proposal_files', 'project_invoices')
),

-- ── 3. proposals: what is stored, as SHAPES and COUNTS only ───────────────────────────────────────────────
pj AS (SELECT to_jsonb(p) AS r FROM public.proposals p),
s3 AS (
  SELECT '3. proposals' AS section, 'rows' AS item, count(*)::text AS value, '' AS note FROM pj
  UNION ALL SELECT '3. proposals', 'status = ' || coalesce(r ->> 'status', '<null>'), count(*)::text, 'legacy vocabulary check' FROM pj GROUP BY r ->> 'status'
  UNION ALL SELECT '3. proposals', 'with client_id', count(*)::text, 'null client_id = merchant-only, cannot be opened in the portal' FROM pj WHERE r ->> 'client_id' IS NOT NULL
  UNION ALL SELECT '3. proposals', 'without client_id', count(*)::text, '' FROM pj WHERE r ->> 'client_id' IS NULL
  UNION ALL SELECT '3. proposals', 'proposal_number shape = ' ||
           CASE WHEN r ->> 'proposal_number' ~ '^PROP-[0-9]{8}-[0-9A-F]{6}$' THEN 'PROP-YYYYMMDD-XXXXXX' WHEN r ->> 'proposal_number' IS NULL THEN 'null' ELSE 'other' END,
           count(*)::text, 'numbering convention in use' FROM pj GROUP BY 2
  UNION ALL SELECT '3. proposals', 'duplicate proposal_number values', count(*)::text, 'must be 0 before a unique index is trusted'
         FROM (SELECT r ->> 'proposal_number' AS n FROM pj WHERE r ->> 'proposal_number' IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT '3. proposals', 'services json type = ' || coalesce(jsonb_typeof(r -> 'services'), 'absent'), count(*)::text, 'array expected' FROM pj GROUP BY 2
  UNION ALL SELECT '3. proposals', 'services element key = ' || k, count(*)::text, 'keys only; values are never shown'
         FROM pj, jsonb_array_elements(CASE WHEN jsonb_typeof(r -> 'services') = 'array' THEN r -> 'services' ELSE '[]'::jsonb END) e,
              LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(e) = 'object' THEN e ELSE '{}'::jsonb END) k GROUP BY k
  UNION ALL SELECT '3. proposals', 'services[].price json type = ' || coalesce(jsonb_typeof(e -> 'price'), 'absent'), count(*)::text, 'string vs number decides the parsing rule'
         FROM pj, jsonb_array_elements(CASE WHEN jsonb_typeof(r -> 'services') = 'array' THEN r -> 'services' ELSE '[]'::jsonb END) e GROUP BY 2
  UNION ALL SELECT '3. proposals', 'services[].price not a plain decimal', count(*)::text, 'non-zero = legacy values the converter must not guess'
         FROM pj, jsonb_array_elements(CASE WHEN jsonb_typeof(r -> 'services') = 'array' THEN r -> 'services' ELSE '[]'::jsonb END) e
         WHERE coalesce(e ->> 'price', '') !~ '^[0-9]+(\.[0-9]{1,2})?$'
  UNION ALL SELECT '3. proposals', 'pricing json type = ' || coalesce(jsonb_typeof(r -> 'pricing'), 'absent'), count(*)::text, '' FROM pj GROUP BY 2
  UNION ALL SELECT '3. proposals', 'pricing key = ' || k, count(*)::text, 'keys only'
         FROM pj, LATERAL jsonb_object_keys(CASE WHEN jsonb_typeof(r -> 'pricing') = 'object' THEN r -> 'pricing' ELSE '{}'::jsonb END) k GROUP BY k
  UNION ALL SELECT '3. proposals', 'pricing.currency = ' || coalesce(r -> 'pricing' ->> 'currency', '<absent>'), count(*)::text, 'currency codes only'
         FROM pj GROUP BY 2
  UNION ALL SELECT '3. proposals', 'pricing.total json type = ' || coalesce(jsonb_typeof(r -> 'pricing' -> 'total'), 'absent'), count(*)::text, '' FROM pj GROUP BY 2
  UNION ALL SELECT '3. proposals', 'pricing.total disagrees with the sum of services prices', count(*)::text, 'non-zero = stored totals that cannot be trusted'
         FROM (SELECT r, (SELECT coalesce(sum(CASE WHEN coalesce(e ->> 'price', '') ~ '^[0-9]+(\.[0-9]+)?$' THEN (e ->> 'price')::numeric ELSE 0 END), 0)
                          FROM jsonb_array_elements(CASE WHEN jsonb_typeof(r -> 'services') = 'array' THEN r -> 'services' ELSE '[]'::jsonb END) e) AS s FROM pj) z
         WHERE z.r -> 'pricing' ->> 'total' ~ '^[0-9]+(\.[0-9]+)?$' AND abs((z.r -> 'pricing' ->> 'total')::numeric - z.s) > 0.005
  UNION ALL SELECT '3. proposals', 'lifecycle timestamps: sent_at / accepted_at / expires_at set',
         count(*) FILTER (WHERE r ->> 'sent_at' IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE r ->> 'accepted_at' IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE r ->> 'expires_at' IS NOT NULL)::text, '' FROM pj
  UNION ALL SELECT '3. proposals', 'approved but changed after approval (updated_at > accepted_at)', count(*)::text, 'evidence the approved commercial text may already have drifted'
         FROM pj WHERE r ->> 'status' = 'approved' AND r ->> 'accepted_at' IS NOT NULL AND r ->> 'updated_at' IS NOT NULL AND (r ->> 'updated_at')::timestamptz > (r ->> 'accepted_at')::timestamptz + interval '1 minute'
  UNION ALL SELECT '3. proposals', 'rows with a growth_profile_id', count(*) FILTER (WHERE r ->> 'growth_profile_id' IS NOT NULL)::text, '' FROM pj
  -- Project-link columns are found by PATTERN on the real catalog, never by a guessed name: the column that exists in
  -- production is converted_to_project_id (an earlier version of this row looked for project_id / converted_project_id
  -- and wrongly reported "no project column"). The catalog (section 2 columns / constraints) is the evidence.
  UNION ALL SELECT '3. proposals', 'project-link columns present (matched by name pattern on the catalog)',
         coalesce((SELECT string_agg(c.column_name::text, ', ' ORDER BY c.column_name::text) FROM information_schema.columns c
                   WHERE c.table_schema = 'public' AND c.table_name = 'proposals' AND c.column_name::text ~* '(project|convert)'), 'none'),
         'see section 2 constraints for the foreign key'
  UNION ALL SELECT '3. proposals', 'rows whose converted_to_project_id is set', count(*) FILTER (WHERE r ->> 'converted_to_project_id' IS NOT NULL)::text,
         'null count is the rest; the dedicated check is in 00b' FROM pj
  UNION ALL SELECT '3. proposal_files', 'rows', count(*)::text, '' FROM public.proposal_files
),

-- ── 4. project_invoices: is it usable as the invoice record? ──────────────────────────────────────────────────
ij AS (SELECT to_jsonb(i) AS r FROM public.project_invoices i),
s4 AS (
  SELECT '4. project_invoices' AS section, 'rows' AS item, count(*)::text AS value, '' AS note FROM ij
  UNION ALL SELECT '4. project_invoices', 'status = ' || coalesce(r ->> 'status', '<null>'), count(*)::text, 'legacy vocabulary (the admin dashboard reads status = overdue)' FROM ij GROUP BY r ->> 'status'
  UNION ALL SELECT '4. project_invoices', 'currency = ' || coalesce(r ->> 'currency', '<null>'), count(*)::text, 'currency codes only' FROM ij GROUP BY r ->> 'currency'
  UNION ALL SELECT '4. project_invoices', 'amount json type = ' || coalesce(jsonb_typeof(r -> 'amount'), 'absent'), count(*)::text, 'number / string decides the money representation' FROM ij GROUP BY 2
  UNION ALL SELECT '4. project_invoices', 'amount with more than 2 decimals', count(*)::text, 'non-zero = amounts that are not whole cents'
         FROM ij WHERE r ->> 'amount' ~ '\.[0-9]{3,}'
  UNION ALL SELECT '4. project_invoices', 'invoice_number shape = ' ||
           CASE WHEN r ->> 'invoice_number' IS NULL THEN 'null' WHEN r ->> 'invoice_number' ~ '^HBD-INV-[0-9]{4}-[0-9]{4,}$' THEN 'HBD-INV-YYYY-NNNN' WHEN r ->> 'invoice_number' ~ '^INV-' THEN 'INV-*' ELSE 'other' END,
           count(*)::text, 'numbering convention in use' FROM ij GROUP BY 2
  UNION ALL SELECT '4. project_invoices', 'duplicate invoice_number values', count(*)::text, 'must be 0 before a unique index is trusted'
         FROM (SELECT r ->> 'invoice_number' AS n FROM ij WHERE r ->> 'invoice_number' IS NOT NULL GROUP BY 1 HAVING count(*) > 1) d
  UNION ALL SELECT '4. project_invoices', 'whose project belongs to a client / to no client / to no project',
         count(*) FILTER (WHERE p.client_id IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE p.id IS NOT NULL AND p.client_id IS NULL)::text || ' / ' || count(*) FILTER (WHERE p.id IS NULL)::text,
         'ownership is project_id -> projects.client_id today (no client_id on the invoice)'
         FROM ij LEFT JOIN public.projects p ON p.id::text = ij.r ->> 'project_id'
  UNION ALL SELECT '4. project_invoices', 'with a payment_link / a due_date', count(*) FILTER (WHERE r ->> 'payment_link' IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE r ->> 'due_date' IS NOT NULL)::text, 'presence only'  FROM ij
),

-- ── 5. who and what else the commercial flow touches ──────────────────────────────────────────────────────
s5 AS (
  SELECT '5. notifications' AS section, 'type = ' || n.type::text AS item, count(*)::text AS value, 'types already accepted (no CHECK on type was proven in S6.3)' AS note
  FROM public.notifications n WHERE n.type::text ~* '(proposal|invoice|payment)' GROUP BY n.type
  UNION ALL SELECT '5. projects', 'client projects / public portfolio rows', count(*) FILTER (WHERE client_id IS NOT NULL)::text || ' / ' || count(*) FILTER (WHERE client_id IS NULL)::text, 'conversion must never touch the second group' FROM public.projects
  UNION ALL SELECT '5. storage buckets', b.name::text, CASE WHEN b.public THEN 'PUBLIC' ELSE 'private' END, 'where immutable proposal / invoice PDFs could live (no new public bucket will be created)'
         FROM storage.buckets b
  UNION ALL SELECT '5. extensions', e.extname::text, e.extversion::text, '' FROM pg_extension e WHERE e.extname IN ('pgcrypto', 'uuid-ossp', 'pg_cron')
  UNION ALL SELECT '5. upload_sessions', 'proposal-context sessions', count(*)::text, 'the existing proposal attachment pipeline' FROM public.upload_sessions WHERE context = 'proposal'
),

-- ── 6. names the design intends to create must be free ────────────────────────────────────────────────────────
s6 AS (
  SELECT '6. planned object names' AS section, n.name AS item,
         coalesce((SELECT c.relkind::text FROM pg_class c WHERE c.relname = n.name AND c.relnamespace = 'public'::regnamespace LIMIT 1),
                  (SELECT 'function' FROM pg_proc p WHERE p.proname = n.name AND p.pronamespace = 'public'::regnamespace LIMIT 1), 'free') AS value,
         CASE WHEN EXISTS (SELECT 1 FROM pg_class c WHERE c.relname = n.name AND c.relnamespace = 'public'::regnamespace)
                OR EXISTS (SELECT 1 FROM pg_proc p WHERE p.proname = n.name AND p.pronamespace = 'public'::regnamespace) THEN 'FAIL: name already in use' ELSE 'ok' END AS note
  FROM (VALUES ('proposal_versions'), ('proposal_line_items'), ('invoices'), ('invoice_line_items'), ('invoice_payments'),
               ('document_counters'), ('next_document_number'), ('approve_proposal'), ('send_proposal'), ('create_invoice_from_proposal'),
               ('issue_invoice'), ('record_invoice_payment'), ('void_invoice'), ('proposals_immutable_after_decision')) AS n(name)
)

SELECT * FROM s1
UNION ALL SELECT * FROM s1fn
UNION ALL SELECT * FROM s2cols
UNION ALL SELECT * FROM s2con
UNION ALL SELECT * FROM s2idx
UNION ALL SELECT * FROM s2trg
UNION ALL SELECT * FROM s2pol
UNION ALL SELECT * FROM s2priv
UNION ALL SELECT * FROM s3
UNION ALL SELECT * FROM s4
UNION ALL SELECT * FROM s5
UNION ALL SELECT * FROM s6
ORDER BY 1, 2;
