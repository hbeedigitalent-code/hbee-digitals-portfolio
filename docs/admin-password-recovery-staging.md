# Admin password recovery — staging test instructions

**Status: NOT EXECUTED.** Everything below needs a real Supabase recovery session. The code and offline tests
(`scripts/test-admin-operations.cjs`) were checked; none of this table has been run. Use **staging** only. Do not
use production recovery tokens, and do not change live Auth settings from this document.

## How it works (from the code)

1. `/admin/login` → "Forgot password?" → `supabase.auth.resetPasswordForEmail(email, { redirectTo: <origin>/admin/reset-password })`.
2. The email link returns to `/admin/reset-password?code=…` (PKCE). The cookie-backed browser client exchanges the
   code. **Only** Supabase's `PASSWORD_RECOVERY` event opens the form; an ordinary existing session never does.
3. On acceptance the page clears any "2FA verified" cookie already in the browser (`POST /api/admin/logout`).
4. `updateUser({ password })` → clear the 2FA cookie again → `signOut()` (default scope `global`, which ends the
   user's other sessions) → "Continue to sign in" → normal login → 2FA challenge when enabled.

Access model that already exists and was not changed: every admin page and API needs the user-bound 2FA cookie.
For an admin with 2FA enabled, a recovery session reaches nothing until TOTP is verified. For an admin **without**
2FA, `/api/admin/2fa/status` stamps the cookie automatically, so the emailed link is effectively the credential.

## Configuration to confirm on staging (owner action)

| Setting | Required value | Why |
|---|---|---|
| Auth → URL Configuration → Redirect URLs | Allow-list `https://<staging-origin>/admin/reset-password` (and production's, later) | Otherwise Supabase ignores `redirectTo` and lands on the Site URL |
| Auth → Email Templates → "Reset Password" | Keep the default `{{ .ConfirmationURL }}`. **Do not** point it at `/api/auth/confirm` | That route handles *client* confirmation and would divert admins to `/client-confirmation` |
| Auth → Password → Minimum password length | 12 | The 12-character rule in the UI is only a guard; this is the server-side floor |
| Auth → rate limits / SMTP | Working sender | Recovery needs a delivered email |
| Open the email link in the **same browser** that requested it | — | PKCE keeps the verifier in that browser's cookies. A different browser shows "not valid" by design |

## Test matrix (record the result of each)

| # | Scenario | Expected | Result |
|---|---|---|---|
| 1 | Admin **with 2FA**: request reset, open link, set a 12+ char password | Form appears; success; "Continue to sign in"; login then asks for the TOTP code | not run |
| 2 | Same, but sign in first and verify 2FA, **then** request + open a reset link in the same browser | After the link is accepted `/admin/dashboard` demands the TOTP challenge again (cookie was cleared) | not run |
| 3 | Admin **without 2FA** | Reset works; sign-in goes straight to the dashboard. Record this as the known "link is the credential" behaviour | not run |
| 4 | Open the link a **second time** | "This reset link is not valid" within about 8 s | not run |
| 5 | Open an **expired** link (wait out the OTP expiry, or shorten it on staging) | "not valid" | not run |
| 6 | While **signed in as an admin**, open a used or expired link | "not valid" — never a password form | not run |
| 7 | Visit `/admin/reset-password` directly, no link | "not valid" immediately | not run |
| 8 | Request the link on one browser, open it on another | "not valid" | not run |
| 9 | During the recovery session (before submitting), call an admin API, e.g. `GET /api/admin/growth-reviews` with the browser cookies | `401` for a 2FA admin (no 2FA cookie) | not run |
| 10 | During the recovery session, browse to `/admin/dashboard` as a 2FA admin | Redirected to `/admin-2fa-challenge` | not run |
| 11 | Submit an 11-character password | Rejected in the UI: "Use at least 12 characters." | not run |
| 12 | After the Supabase minimum is set to 12, call `updateUser({ password: '11chars....' })` from the console | Rejected by Supabase | not run |
| 13 | After a successful reset, check another signed-in browser/session for the same admin | That session is signed out (global scope) | not run |
| 14 | After a successful reset, use the **old** password | Fails | not run |
| 15 | Request a reset for a **client** (non-admin) email via the admin form, finish it | The password changes (same as the Client Portal reset). Signing in at `/admin/login` leads to `/client-portal` — no admin access. | not run |
| 16 | Request a reset for an unknown email | Same neutral "Reset link sent" behaviour as Supabase returns; no account is created | not run |
| 17 | Confirm no sign-up control exists on `/admin/login` and `/admin/reset-password` | None | covered by offline test; also check visually |

## Notes

- Test 15 documents that the admin reset page can set the password of any Supabase user who holds a valid
  recovery link. It cannot grant admin access (middleware and `requireActiveAdmin` check `admin_users`).
- The Client Portal's password forms (6-character minimum) are intentionally unchanged.
