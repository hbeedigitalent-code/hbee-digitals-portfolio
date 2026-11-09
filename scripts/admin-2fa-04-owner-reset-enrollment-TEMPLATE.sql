-- =====================================================================================================================
-- Owner-assisted reset of ONE admin's 2FA enrollment.  TEMPLATE — NOT EXECUTED, NOT PARSED.  Ships INERT.
--
-- WHEN: an admin has lost their authenticator. There is deliberately no self-service bypass in the application: no backup-
-- code login, no "disable 2FA" button (it is refused while enrollment is mandatory), and password recovery does not touch
-- 2FA. A reset is a deliberate, recorded owner action.
--
-- THE PROCEDURE (the owner does all of this; none of it is automated)
--   1. VERIFY IDENTITY OUTSIDE THE APPLICATION. A call or video meeting, or an in-person check, with someone who can vouch
--      for the person. Email or chat alone is not enough: an attacker who has the admin's mailbox could ask for a reset.
--   2. Find the admin's auth user id (Supabase dashboard -> Authentication -> Users) and confirm it matches an ACTIVE row in
--      public.admin_users for the expected email.
--   3. Write the reset down in the owner's log: who, why, when, how identity was verified, user id. (The database keeps no
--      audit row for this; the log is the audit trail.)
--   4. Run THIS script with the two values filled in (below). It deletes that admin's admin_2fa row and nothing else.
--   5. The admin signs in. Middleware finds no verified 2FA cookie, /api/admin/2fa/status sees no enrolled record and answers
--      "enrollment required", and the challenge page walks them through scanning a NEW secret and confirming a code. Nothing
--      in the admin opens until that succeeds. The old secret no longer exists anywhere.
--   6. Run scripts/admin-2fa-03-user-id-unique-verify-readonly.sql afterwards and keep the result with the log entry.
--
-- WHAT IT NEVER DOES
--   * set secret to NULL (the column is NOT NULL; the recovery mechanism is deleting the row, not blanking it);
--   * touch any other admin, admin_users, auth.users, passwords or sessions;
--   * run by accident: it does nothing until BOTH values below are set AND the confirmation text is typed exactly.
--
-- To also end the admin's existing sessions (recommended if the device was lost or stolen), use Supabase dashboard ->
-- Authentication -> Users -> "Sign out user"/revoke sessions. That is an Auth action, not SQL in this file.
-- =====================================================================================================================

begin;

do $reset$
declare
  -- ▼▼ THE OWNER FILLS THESE TWO IN. Leaving either as is makes the script refuse. ▼▼
  v_user_id uuid := null;                 -- e.g. '00000000-0000-0000-0000-000000000000'::uuid (the admin's auth user id)
  v_confirm text := '';                   -- type exactly:  RESET 2FA ENROLLMENT
  -- ▲▲ ----------------------------------------------------------------------------- ▲▲
  v_admin_email text;
  v_rows bigint;
  v_deleted bigint;
begin
  if v_user_id is null then
    raise exception 'Refusing to run: set v_user_id to the admin''s auth user id first.';
  end if;
  if v_confirm is distinct from 'RESET 2FA ENROLLMENT' then
    raise exception 'Refusing to run: v_confirm must be exactly "RESET 2FA ENROLLMENT". Identity must be verified outside the application first.';
  end if;

  select email into v_admin_email from public.admin_users where user_id = v_user_id and is_active = true;
  if v_admin_email is null then
    raise exception 'Refusing to run: % is not an ACTIVE admin_users row. A reset is only for an active admin.', v_user_id;
  end if;

  select count(*) into v_rows from public.admin_2fa where user_id = v_user_id;
  if v_rows = 0 then
    raise exception 'Nothing to reset: % (%) has no admin_2fa row; they will already be asked to enroll.', v_user_id, v_admin_email;
  end if;
  if v_rows > 1 then
    raise exception 'Refusing to run: % has % admin_2fa rows. Resolve the duplicate by hand first (decide which to keep).', v_user_id, v_rows;
  end if;

  delete from public.admin_2fa where user_id = v_user_id;
  get diagnostics v_deleted = row_count;
  if v_deleted <> 1 then
    raise exception 'Post-condition failed: expected to delete exactly 1 row, deleted %.', v_deleted;
  end if;
  if exists (select 1 from public.admin_2fa where user_id = v_user_id) then
    raise exception 'Post-condition failed: a row for % still exists.', v_user_id;
  end if;

  raise notice 'Reset complete for % (%): 1 admin_2fa row removed. The admin must enroll again at next sign-in.', v_user_id, v_admin_email;
end $reset$;

commit;
