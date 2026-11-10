-- =====================================================================================================================
-- email_settings.smtp_password — presence check.  PRODUCTION.  READ-ONLY.  DRAFT — NOT EXECUTED, NOT PARSED.
--
-- Returns TWO NUMBERS and nothing else:
--     settings_rows               how many rows email_settings has
--     rows_with_stored_password   how many of them hold a non-empty smtp_password
-- The password column is used only inside a COUNT predicate. Its value is never selected, returned, logged or displayed.
--
-- WHY: the Admin Email Settings page no longer reads, shows, holds or sends the password (fixed in code). Whether a value is
-- STILL STORED in the database, and who could read it, was UNVERIFIED. A non-zero second number means a credential is at rest in
-- a table the browser admin client can reach: rotate it and decide where it should live (a server-side secret, not a table
-- column). This script does not change anything.
--
-- One statement, one row. Catalog-free: it reads only the table named below. Run as the table owner.
-- =====================================================================================================================

SELECT
  count(*) AS settings_rows,
  count(*) FILTER (WHERE smtp_password IS NOT NULL AND btrim(smtp_password::text) <> '') AS rows_with_stored_password
FROM public.email_settings;
