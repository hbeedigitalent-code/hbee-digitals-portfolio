-- =====================================================================================================================
-- Clear the stored SMTP password.  PRODUCTION.  IRREVERSIBLE.  DRAFT — NOT EXECUTED, NOT PARSED BY POSTGRESQL.
--
-- WHAT IT DOES: sets email_settings.smtp_password to NULL where it holds a value, and changes nothing else.
-- WHY IT IS SAFE TO CLEAR (runtime dependency audit, whole repository, see docs/admin-production-release-a4.md section 6):
--   * the only code that touches public.email_settings is src/app/admin/email-settings/page.tsx, which since Phase A1/A2 selects an
--     explicit non-secret column list and upserts only named non-secret columns; it never reads, shows or sends smtp_password;
--   * no code anywhere uses an SMTP transport: there is no nodemailer / createTransport, and no SMTP_* environment variable. All
--     outgoing mail (inquiry, Growth Review, lifecycle, newsletter) goes through Resend with RESEND_API_KEY;
--   * the page's "send test email" posts to /api/send-email, which does not exist in src/app/api;
--   * no database function, view or trigger in this repository's SQL reads the column.
--   NOT PROVEN by the repository: an external consumer (a Supabase Edge Function, an automation tool, another app) that reads this
--   table with its own credentials.  If one exists it would stop authenticating over SMTP.  Confirm there is none before running.
--
-- IT CANNOT BE UNDONE: the value is not copied anywhere (copying a credential into another table would defeat the purpose).  There is
-- therefore NO rollback script.  Because the old admin page loaded this password into the browser, treat it as exposed regardless:
-- rotate the credential at the mail provider (or confirm the account is unused / revoked) whether or not you run this.
--
-- GUARDS: needs BOTH  set hbee.confirm_production = 'yes';  and  set hbee.confirm_irreversible = 'yes';  as the first lines of the run.
-- Aborts, changing nothing, if the table or column is missing, the column is NOT NULL (it would have to be '' instead — decide by
-- hand), or the table has more than 50 rows (this was audited as a single-settings table).
-- PROOF: the password value is never selected or shown.  Before and after, the script compares inside the database: row count,
-- the number of rows holding a password (before: n, after: 0), and a digest of every OTHER column of every row (updated_at excluded,
-- because a trigger may legitimately refresh it).
--
-- BEFORE / AFTER COUNTS you read yourself: scripts/prod-smtp-00-password-presence-readonly.sql
--   before: settings_rows = 1, rows_with_stored_password = 1        after: settings_rows = 1, rows_with_stored_password = 0
-- =====================================================================================================================

begin;

set local lock_timeout = '5s';

do $guard$
declare
  v_rows bigint;
  v_with bigint;
  v_nullable text;
begin
  if coalesce(current_setting('hbee.confirm_production', true), '') <> 'yes' then
    raise exception 'Refusing to run: put  set hbee.confirm_production = ''yes'';  as the first line of this run.';
  end if;
  if coalesce(current_setting('hbee.confirm_irreversible', true), '') <> 'yes' then
    raise exception 'Refusing to run: this cannot be undone. Put  set hbee.confirm_irreversible = ''yes'';  in the run to confirm the credential has been rotated or is no longer needed.';
  end if;
  if to_regclass('public.email_settings') is null then
    raise exception 'Refusing to run: public.email_settings does not exist.';
  end if;
  select is_nullable into v_nullable from information_schema.columns where table_schema = 'public' and table_name = 'email_settings' and column_name = 'smtp_password';
  if v_nullable is null then raise exception 'Refusing to run: email_settings.smtp_password does not exist.'; end if;
  if v_nullable <> 'YES' then raise exception 'Refusing to run: email_settings.smtp_password is NOT NULL, so it cannot be set to NULL. Decide by hand (an empty string is the alternative).'; end if;

  select count(*), count(*) filter (where smtp_password is not null and btrim(smtp_password::text) <> '') into v_rows, v_with from public.email_settings;
  if v_rows > 50 then raise exception 'Refusing to run: email_settings has % rows; it was audited as a single-settings table.', v_rows; end if;
  if v_with = 0 then raise exception 'Nothing to do: no row holds a stored SMTP password.'; end if;

  perform set_config('hbee.smtp_rows', v_rows::text, true);
  perform set_config('hbee.smtp_with', v_with::text, true);
  -- digest of everything except the password and updated_at; never returned
  perform set_config('hbee.smtp_digest', (select coalesce(md5(string_agg((to_jsonb(t) - 'smtp_password' - 'updated_at')::text, '|' order by (to_jsonb(t) - 'smtp_password' - 'updated_at')::text)), 'empty') from public.email_settings t), true);
end $guard$;

update public.email_settings set smtp_password = null where smtp_password is not null;

do $post$
declare
  v_rows bigint;
  v_with bigint;
  v_digest text;
begin
  select count(*), count(*) filter (where smtp_password is not null and btrim(smtp_password::text) <> '') into v_rows, v_with from public.email_settings;
  if v_rows <> current_setting('hbee.smtp_rows')::bigint then raise exception 'Post-condition failed: the row count changed (% -> %).', current_setting('hbee.smtp_rows'), v_rows; end if;
  if v_with <> 0 then raise exception 'Post-condition failed: % row(s) still hold a stored password.', v_with; end if;
  select coalesce(md5(string_agg((to_jsonb(t) - 'smtp_password' - 'updated_at')::text, '|' order by (to_jsonb(t) - 'smtp_password' - 'updated_at')::text)), 'empty') into v_digest from public.email_settings t;
  if v_digest is distinct from current_setting('hbee.smtp_digest') then raise exception 'Post-condition failed: a column other than smtp_password changed. Nothing is committed.'; end if;
end $post$;

commit;
-- Then run scripts/prod-smtp-00-password-presence-readonly.sql: rows_with_stored_password must be 0.
