-- =============================================================================
-- PORTAL INVITATIONS — PREFLIGHT (READ-ONLY)
-- Hbee Growth OS · Phase 16.6 · Decision → Invitation → Account → Portal
--
-- Run in: Supabase Dashboard -> SQL Editor (production), BEFORE
-- portal-invite-02-forward.sql. Strictly read-only: catalog reads only, no
-- table rows, no changes. Paste every section's output back for review.
-- =============================================================================

-- 1. The new objects must NOT already exist (any relkind). Expect: no rows.
SELECT n.nspname, c.relname, c.relkind
FROM   pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public'
AND    c.relname IN ('portal_invitations', 'portal_invitations_token_hash_key',
                     'portal_invitations_one_open_per_merchant', 'portal_invitations_merchant_idx');

SELECT p.oid::regprocedure
FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public' AND p.proname = 'consume_portal_invitation';

-- 2. Columns the migration and the function depend on (type + nullability).
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public'
AND    ((table_name = 'clients'   AND column_name IN ('id', 'user_id', 'merchant_id', 'email'))
     OR (table_name = 'merchants' AND column_name IN ('id', 'email', 'contact_name', 'business_name')))
ORDER  BY table_name, column_name;

-- 3. Unique objects on clients (is clients.user_id / clients.merchant_id unique?).
SELECT i.relname AS index_name, ix.indisunique, pg_get_indexdef(ix.indexrelid) AS definition
FROM   pg_index ix
JOIN   pg_class t ON t.oid = ix.indrelid
JOIN   pg_class i ON i.oid = ix.indexrelid
JOIN   pg_namespace n ON n.oid = t.relnamespace
WHERE  n.nspname = 'public' AND t.relname = 'clients';

-- 4. Triggers on clients (anything that reacts to merchant_id changes).
SELECT t.tgname, t.tgenabled, pg_get_triggerdef(t.oid, true) AS definition
FROM   pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relname = 'clients' AND NOT t.tgisinternal;

-- 5. gen_random_uuid() available (core in PG13+). Expect one row.
SELECT p.oid::regprocedure FROM pg_proc p WHERE p.proname = 'gen_random_uuid';

-- 6. FOR THE APPROVAL RELAXATION (not changed by this migration — needed to
--    design that change safely). Full current definitions and the decision
--    table's client_id nullability.
SELECT p.oid::regprocedure AS signature, p.prosecdef AS security_definer, pg_get_functiondef(p.oid) AS definition
FROM   pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE  n.nspname = 'public'
AND    p.proname IN ('record_program_decision', 'link_client_to_merchant')
AND    p.prokind = 'f';

SELECT column_name, data_type, is_nullable, column_default
FROM   information_schema.columns
WHERE  table_schema = 'public' AND table_name = 'growth_program_decisions'
ORDER  BY ordinal_position;

SELECT con.conname, pg_get_constraintdef(con.oid)
FROM   pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public' AND c.relname = 'growth_program_decisions';
