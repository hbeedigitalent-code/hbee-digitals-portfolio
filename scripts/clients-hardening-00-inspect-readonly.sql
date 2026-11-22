-- =============================================================================
-- CLIENTS BROWSER-WRITE HARDENING — STEP 0: LIVE INSPECTION (READ-ONLY). Run in the Supabase SQL Editor on PRODUCTION
-- (project hbee-digitals-cms). NOT YET RUN.
--
-- WHY. The portal's identity lock (full_name / business_name read-only) is enforced by the application. Repository evidence
-- says the `authenticated` role may still hold table-level INSERT / UPDATE / DELETE on public.clients and an own-row policy,
-- so a signed-in browser could write its own row directly with the public key. The repository holds no live policy dump for
-- this table, so the final hardening must be decided from THIS result, not from old migrations.
--
-- WHAT IT DOES. ONE statement, ONE grid: (section, subject, detail). It reads ONLY the catalogs (pg_class, pg_attribute,
-- pg_policies, privilege functions). It never reads a row of public.clients: no name, email or id is returned. It writes
-- nothing and creates nothing, so it is safe to run repeatedly.
--
-- WHAT IT REPORTS (exactly the requested scope):
--   A  the table, whether RLS is enabled / forced, and its owner
--   B  EFFECTIVE table-level privileges for anon, authenticated, service_role (includes anything inherited from PUBLIC)
--   C  the RAW table ACL (explicit grants, including PUBLIC)
--   D  column-level privileges held on columns only (not on the whole table), plus the raw column ACL
--   E  every RLS policy: command, permissive, roles, USING and WITH CHECK
--   F  a short summary of the four questions that decide the hardening
--
-- NOT INCLUDED on purpose: triggers on clients. Ask for a separate read-only query if a guard trigger needs checking.
--
-- HOW TO READ IT.
--   * Row F2 = YES means a browser role can write clients today (the exposure). Row F3 lists the policies a browser role
--     passes through. An ADMIN-only policy (an active admin_users predicate) is expected there; an own-row policy
--     (auth.uid() = user_id) is the one that lets a client write their own row.
--   * Row F4 must show service_role holding SELECT, INSERT and UPDATE: every server route that writes clients depends on it.
-- =============================================================================
WITH
t AS (
  SELECT c.oid, c.relrowsecurity AS rls, c.relforcerowsecurity AS forced, c.relacl,
         pg_get_userbyid(c.relowner)::text AS owner
  FROM pg_class c
  WHERE c.oid = to_regclass('public.clients')
),
roles(r) AS (VALUES ('anon'::text), ('authenticated'), ('service_role')),
privs(p) AS (VALUES ('SELECT'::text), ('INSERT'), ('UPDATE'), ('DELETE'), ('TRUNCATE'), ('REFERENCES'), ('TRIGGER')),
colprivs(p) AS (VALUES ('SELECT'::text), ('INSERT'), ('UPDATE'), ('REFERENCES')),
-- effective table-level privileges per role
tbl AS (
  SELECT r.r AS role, p.p AS priv
  FROM roles r CROSS JOIN privs p CROSS JOIN t
  WHERE has_table_privilege(r.r, t.oid, p.p)
),
-- privileges a role holds on a COLUMN but not on the whole table
colp AS (
  SELECT r.r AS role, cp.p AS priv, a.attname::text AS colname, a.attnum
  FROM roles r CROSS JOIN colprivs cp CROSS JOIN t
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum > 0 AND NOT a.attisdropped
  WHERE has_column_privilege(r.r, t.oid, a.attnum, cp.p)
    AND NOT has_table_privilege(r.r, t.oid, cp.p)
),
pol AS (
  SELECT policyname::text AS name, cmd::text AS cmd, permissive::text AS permissive, roles::text AS roles_txt,
         qual, with_check,
         (roles && ARRAY['public', 'anon', 'authenticated']::name[]) AS browser
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'clients'
)
SELECT section, subject, detail
FROM (
  -- A. the table
  SELECT 10 AS ord, 'A. TABLE'::text AS section, 'public.clients'::text AS subject,
         CASE WHEN t.oid IS NULL THEN 'TABLE NOT FOUND'
              ELSE 'RLS enabled = ' || t.rls::text || '; RLS forced = ' || t.forced::text || '; owner = ' || t.owner END AS detail
  FROM (SELECT 1) x LEFT JOIN t ON true

  -- B. effective table privileges
  UNION ALL
  SELECT 20, 'B. EFFECTIVE TABLE PRIVILEGES', r.r,
         COALESCE((SELECT string_agg(tb.priv, ', ' ORDER BY tb.priv) FROM tbl tb WHERE tb.role = r.r), 'NONE')
  FROM roles r

  -- C. raw table ACL
  UNION ALL
  SELECT 30, 'C. RAW TABLE ACL (explicit grants)',
         CASE WHEN a.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(a.grantee)::text END,
         string_agg(a.privilege_type, ', ' ORDER BY a.privilege_type) || CASE WHEN bool_or(a.is_grantable) THEN ' (grantable)' ELSE '' END
  FROM t, aclexplode(t.relacl) a
  GROUP BY a.grantee
  UNION ALL
  SELECT 30, 'C. RAW TABLE ACL (explicit grants)', '(owner only)', 'relacl is NULL: no explicit grants'
  FROM t WHERE t.relacl IS NULL

  -- D. column-level privileges
  UNION ALL
  SELECT 40, 'D. COLUMN-ONLY PRIVILEGES (held on columns, not on the whole table)', c.role || ' ' || c.priv,
         string_agg(c.colname, ', ' ORDER BY c.attnum)
  FROM colp c
  GROUP BY c.role, c.priv
  UNION ALL
  SELECT 40, 'D. COLUMN-ONLY PRIVILEGES (held on columns, not on the whole table)', '(none)',
         'no role holds a column-only privilege on public.clients'
  WHERE NOT EXISTS (SELECT 1 FROM colp)
  UNION ALL
  SELECT 41, 'D2. RAW COLUMN ACL', pa.attname::text,
         string_agg(CASE WHEN ax.grantee = 0 THEN 'PUBLIC' ELSE pg_get_userbyid(ax.grantee)::text END || ': ' || ax.privilege_type, ', ' ORDER BY ax.grantee, ax.privilege_type)
  FROM t
  JOIN pg_attribute pa ON pa.attrelid = t.oid AND pa.attnum > 0 AND NOT pa.attisdropped AND pa.attacl IS NOT NULL
  CROSS JOIN LATERAL aclexplode(pa.attacl) ax
  GROUP BY pa.attname, pa.attnum

  -- E. RLS policies
  UNION ALL
  SELECT 50, 'E. RLS POLICIES', p.name,
         'cmd = ' || p.cmd || '; ' || p.permissive || '; roles = ' || p.roles_txt
         || '; USING = ' || COALESCE(p.qual, '(none)') || '; WITH CHECK = ' || COALESCE(p.with_check, '(none)')
  FROM pol p
  UNION ALL
  SELECT 50, 'E. RLS POLICIES', '(none)', 'no policies on public.clients'
  WHERE NOT EXISTS (SELECT 1 FROM pol)

  -- F. the four questions that decide the hardening
  UNION ALL
  SELECT 60, 'F. SUMMARY', 'F1  anon holds ANY access to clients (target: no)',
         CASE WHEN EXISTS (SELECT 1 FROM tbl WHERE role = 'anon') OR EXISTS (SELECT 1 FROM colp WHERE role = 'anon')
              THEN 'YES - anon should hold none' ELSE 'no' END
  UNION ALL
  SELECT 60, 'F. SUMMARY', 'F2  authenticated can WRITE clients: INSERT / UPDATE / DELETE / TRUNCATE at table or column level (target: no)',
         CASE WHEN EXISTS (SELECT 1 FROM tbl WHERE role = 'authenticated' AND priv IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))
                OR EXISTS (SELECT 1 FROM colp WHERE role = 'authenticated' AND priv IN ('INSERT', 'UPDATE'))
              THEN 'YES - ' || COALESCE((SELECT string_agg(DISTINCT priv, ', ') FROM (
                     SELECT priv FROM tbl WHERE role = 'authenticated' AND priv IN ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
                     UNION SELECT priv || ' (column-level)' FROM colp WHERE role = 'authenticated' AND priv IN ('INSERT', 'UPDATE')) w), '')
              ELSE 'no' END
  UNION ALL
  SELECT 60, 'F. SUMMARY', 'F3  policies a browser role (public / anon / authenticated) passes through for a WRITE',
         COALESCE((SELECT string_agg(name || ' [' || cmd || ']', '; ' ORDER BY name) FROM pol WHERE browser AND cmd IN ('INSERT', 'UPDATE', 'DELETE', 'ALL')), 'none')
  UNION ALL
  SELECT 60, 'F. SUMMARY', 'F4  service_role privileges (must include SELECT, INSERT, UPDATE for the server routes)',
         COALESCE((SELECT string_agg(priv, ', ' ORDER BY priv) FROM tbl WHERE role = 'service_role'), 'NONE')
         || CASE WHEN (SELECT count(*) FROM tbl WHERE role = 'service_role' AND priv IN ('SELECT', 'INSERT', 'UPDATE')) = 3
                 THEN '  -> OK' ELSE '  -> REVIEW: a server route may break' END
) q
ORDER BY ord, subject, detail;
