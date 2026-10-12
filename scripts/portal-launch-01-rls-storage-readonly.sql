-- ═════════════════════════════════════════════════════════════════════════════
-- Hbee Growth OS — Client Portal launch inspection (READ-ONLY)
--
-- Purpose : give the owner launch confidence about the row-level security and storage
--           policies that the rebuilt Client Portal still depends on.
-- Safety  : SELECT statements only. It reads catalogs (pg_class, pg_namespace, pg_policies,
--           information_schema, storage.buckets) plus three AGGREGATED counts (no row contents,
--           no file names, no personal data). It changes nothing and takes only AccessShareLock.
--           Safe to re-run from the top for a consistent snapshot, or section by section.
-- Run     : paste into the Supabase SQL editor and read every result set before deciding anything.
--           A table missing from a result simply returns no row: that means "does not exist",
--           not "protection disabled".
--
-- What each result answers
--   1  Is row-level security ENABLED / FORCED on every portal table?
--   2  Which policies exist on those tables, for which roles and commands, and with what predicate?
--      (Look for any policy usable by anon/authenticated that is not scoped to the caller.)
--   3  Which privileges do anon and authenticated hold on those tables?
--   4  Do the columns the portal's server routes select actually exist?
--   5  Which storage buckets exist and which are PUBLIC? (project-files and client-portal)
--   6  Which policies protect storage.objects?
--   7  What path shapes do the portal buckets hold? (counts only)
--   8  What shape are deliverable links and profile images in the data? (counts only)
-- ═════════════════════════════════════════════════════════════════════════════


-- 1. Row-level security flags on the portal tables ---------------------------------------------
SELECT n.nspname AS schemaname,
       c.relname AS tablename,
       c.relrowsecurity      AS rls_enabled,
       c.relforcerowsecurity AS rls_forced
FROM   pg_class c
JOIN   pg_namespace n ON n.oid = c.relnamespace
WHERE  n.nspname = 'public'
AND    c.relkind = 'r'
AND    c.relname IN ('clients', 'projects', 'project_requests', 'project_files',
                     'project_deliverables', 'project_invoices', 'project_milestones')
ORDER  BY c.relname;


-- 2. Policies on the portal tables ---------------------------------------------------------------
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'public'
AND    tablename IN ('clients', 'projects', 'project_requests', 'project_files',
                     'project_deliverables', 'project_invoices', 'project_milestones')
ORDER  BY tablename, cmd, policyname;


-- 3. Table privileges held by the browser-facing roles -------------------------------------------
SELECT table_name, grantee, privilege_type
FROM   information_schema.role_table_grants
WHERE  table_schema = 'public'
AND    grantee IN ('anon', 'authenticated')
AND    table_name IN ('clients', 'projects', 'project_requests', 'project_files',
                      'project_deliverables', 'project_invoices', 'project_milestones')
ORDER  BY table_name, grantee, privilege_type;


-- 4. Columns on the portal tables (confirms the column names the portal routes select) ---------
SELECT table_name, column_name, data_type, is_nullable
FROM   information_schema.columns
WHERE  table_schema = 'public'
AND    table_name IN ('clients', 'projects', 'project_requests', 'project_files',
                      'project_deliverables', 'project_invoices', 'project_milestones')
ORDER  BY table_name, ordinal_position;


-- 5. Storage buckets and whether each is public ----------------------------------------------------
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM   storage.buckets
ORDER  BY name;


-- 6. Policies on storage.objects --------------------------------------------------------------------
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM   pg_policies
WHERE  schemaname = 'storage'
AND    tablename = 'objects'
ORDER  BY cmd, policyname;


-- 7. Path shapes inside the portal buckets (counts only — no object names are returned) -------------
SELECT bucket_id,
       split_part(name, '/', 1) AS first_path_segment,
       count(*)                 AS objects
FROM   storage.objects
WHERE  bucket_id IN ('project-files', 'client-portal')
GROUP  BY bucket_id, split_part(name, '/', 1)
ORDER  BY bucket_id, objects DESC;


-- 8a. Shape of stored deliverable links (counts only) -----------------------------------------------
SELECT CASE
         WHEN file_url IS NULL OR btrim(file_url) = ''                          THEN 'empty'
         WHEN file_url LIKE '%/storage/v1/object/public/project-files/%'        THEN 'public project-files URL'
         WHEN file_url LIKE '%/storage/v1/%'                                    THEN 'other storage URL'
         WHEN file_url ~* '^https://'                                           THEN 'external https link'
         WHEN file_url ~* '^[a-z][a-z0-9+.-]*:'                                 THEN 'other scheme (review)'
         ELSE                                                                         'bare path'
       END   AS deliverable_link_shape,
       count(*) AS deliverables
FROM   public.project_deliverables
GROUP  BY 1
ORDER  BY deliverables DESC;


-- 8b. Shape of stored profile images (counts only) ---------------------------------------------------
SELECT CASE
         WHEN profile_image IS NULL OR btrim(profile_image) = ''                       THEN 'empty'
         WHEN profile_image LIKE '%/storage/v1/object/public/client-portal/%'         THEN 'public client-portal URL'
         WHEN profile_image ~* '^https://'                                             THEN 'other https URL'
         ELSE                                                                               'other (review)'
       END   AS profile_image_shape,
       count(*) AS clients
FROM   public.clients
GROUP  BY 1
ORDER  BY clients DESC;
