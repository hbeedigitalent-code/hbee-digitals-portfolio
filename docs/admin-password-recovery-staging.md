# Admin password recovery and 2FA — staging readiness

**Status: NOT EXECUTED.** Nothing in the results columns below has been run against a real Supabase project. The code and
the offline tests (`scripts/test-admin-operations.cjs`, `test-admin-api-authz.cjs`, `test-admin-2fa.cjs`) were checked;
that is all. Use an **isolated staging** project and staging data only. Do not use production recovery tokens, accounts or
settings, and do not change live Auth settings from this document.

## 1. How it works (from the code)

1. `/admin/login` → "Forgot password?" → `resetPasswordForEmail(email, { redirectTo: <origin>/admin/reset-password })`.
2. The email link returns to `/admin/reset-password?code=…` (PKCE). The cookie-backed browser client exchanges the code.
   **Only** Supabase's `PASSWORD_RECOVERY` event opens the form; an existing ordinary session never does.
3. On acceptance the page clears any "2FA verified" cookie already in the browser (`POST /api/admin/logout`).
4. `updateUser({ password })` (minimum 12 characters in the UI) → clear the cookie again → `signOut()` (default scope
   `global`, which ends the user's other sessions) → "Continue to sign in".
5. Normal sign-in → `/admin/dashboard` → middleware finds no 2FA cookie → `/admin-2fa-challenge` → `/api/admin/2fa/status`:
   - 2FA enabled → ask for the 6-digit code (`/2fa/login`, rate limited);
   - **not enrolled (default policy) → enrollment is required**: scan a secret, confirm one code (`/2fa/setup` then
     `/2fa/verify`). Only that proof issues the cookie. Nothing in the admin opens before it.
6. Every admin API route requires that cookie and an active `admin_users` row. A recovery session alone reaches nothing.

## 2. Staging configuration checklist (owner action; do these first)

| # | Item | Required value | How to confirm |
|---|---|---|---|
| C1 | Supabase Auth → URL Configuration → **Redirect URLs** | Contains exactly `https://<staging-origin>/admin/reset-password` | Request a reset; the email link's host/path is your page, not the Site URL |
| C2 | Supabase Auth → URL Configuration → **Site URL** | The staging origin | — |
| C3 | Supabase Auth → Providers → Email → **Minimum password length** | **12** (the UI enforces it, but this is the server-side floor) | Test 12 below |
| C4 | Supabase Auth → Email Templates → **Reset Password** | The **default** `{{ .ConfirmationURL }}` link. It must **not** be pointed at `/api/auth/confirm`, which belongs to *client* confirmation and would divert an admin to `/client-confirmation` | Open the received email's raw link |
| C5 | Supabase Auth → Rate limits / SMTP | A working sender for the staging project | The reset email actually arrives |
| C6 | Staging env var `ADMIN_2FA_COOKIE_SECRET` | A **new** staging value, set **once** (the audit found a duplicate declaration locally) | Admin login reaches the challenge page; no "Server configuration error" |
| C7 | Staging env var `SUPABASE_SERVICE_ROLE_KEY` | The staging project's key | Admin APIs answer 200 for a verified admin |
| C8 | Staging env vars `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Set. If unset, the TOTP rate limit silently does **not** apply (it fails open) | Test E7 |
| C9 | Staging env var `ADMIN_2FA_ENROLLMENT` | **Unset** (mandatory enrollment). `optional` is a deliberate downgrade and must not be used for these tests | Test E1 |
| C10 | Staging env var `GROWTH_PROFILE_RELEASE_ENABLED` | Unchanged (not part of these tests) | — |
| C11 | `admin_2fa` structure | Run `scripts/admin-security-preflight-readonly.sql` section 3 on staging: no duplicate `user_id` rows (duplicates make the status read fail closed) | Output reviewed; any `BLOCKER` resolved |
| C12 | Open the reset email in the **same browser** that requested it | PKCE keeps the verifier in that browser's cookies | Test R8 |

Test accounts needed on staging: **A** an admin with 2FA enabled; **B** an admin with no `admin_2fa` row; **C** a
non-admin (client) user; **D** an admin with 2FA enabled for the session-revocation test.

## 3. Recovery tests (R)

| # | Scenario | Expected | Evidence to record | Result |
|---|---|---|---|---|
| R1 | Account A: request reset, open the link, set a 12+ character password | Form appears → "Password updated" → sign in → **TOTP challenge** | screenshots; the login then the challenge page | not run |
| R2 | Account A already signed in **and** 2FA-verified; request + open a reset link in the same browser | After the link is accepted `/admin/dashboard` demands the TOTP challenge again (cookie cleared) | network log showing `POST /api/admin/logout` | not run |
| R3 | Account B (no 2FA): reset, then sign in | Redirected to **enrollment**, not the dashboard | screenshot of the "Set up your authenticator" page | not run |
| R4 | Open the same link a **second time** | "This reset link is not valid" within about 8 s | screenshot | not run |
| R5 | Open an **expired** link (wait out the OTP expiry or shorten it on staging) | "not valid" | screenshot | not run |
| R6 | While signed in as an admin, open a used or expired link | "not valid" — **never** a password form | screenshot | not run |
| R7 | Visit `/admin/reset-password` directly, no link | "not valid" immediately | screenshot | not run |
| R8 | Request on one browser, open on another | "not valid" | screenshot | not run |
| R9 | During the recovery session (form open, before submitting) call `GET /api/admin/growth-reviews` with that browser's cookies | **401** | the response | not run |
| R10 | During the recovery session browse to `/admin/dashboard` as account A | Redirected to `/admin-2fa-challenge` | final URL | not run |
| R11 | Submit an 11-character password | Rejected in the UI: "Use at least 12 characters." | screenshot | not run |
| R12 | After C3 is set to 12, call `supabase.auth.updateUser({ password: '<11 chars>' })` from the console | **Rejected by Supabase** (proves the server-side floor) | the error | not run |
| R13 | After a successful reset, check another signed-in browser for account D | That session is signed out (global scope) | the second browser's next request | not run |
| R14 | Use the **old** password after a reset | Fails | — | not run |
| R15 | Complete a reset for **C** (non-admin) | The password changes (same as the Client Portal); `/admin/login` then leads to `/client-portal`, no admin access | final URL | not run |
| R16 | Request a reset for an unknown email | Same neutral "Reset link sent"; no account created | — | not run |
| R17 | Confirm no sign-up control exists on `/admin/login`, `/admin/reset-password` or the challenge page | None | screenshots | not run |

## 4. 2FA tests (E)

| # | Scenario | Expected | Result |
|---|---|---|---|
| E1 | Account B signs in (password only) | Challenge page offers **enrollment**; `GET /api/admin/growth-reviews` returns **401** until enrollment completes | not run |
| E2 | B scans the QR, enters a **wrong** code | Rejected; still 401 on the admin API | not run |
| E3 | B enters a correct code | Cookie issued; dashboard opens; the Profile page shows 2FA enabled | not run |
| E4 | **Password-only attacker vs account A:** with only A's session (no cookie) call `POST /api/admin/2fa/setup` | **403** "Verify with your authenticator code…"; A's secret unchanged | not run |
| E5 | Same attacker calls `POST /api/admin/2fa/disable` | **403**; A's 2FA still enabled | not run |
| E6 | Same attacker calls `GET /api/admin/2fa/status` | `{ enabled: true, ready: false }` and **no** `Set-Cookie`; admin APIs still 401 | not run |
| E7 | Submit 9 wrong codes within 10 minutes for A | The 9th is **429** with `Retry-After`; a correct code is also refused during the window | not run |
| E8 | A (verified) clicks "Disable 2FA" on the Profile page | Refused with the "required for administrators" message | not run |
| E9 | Break the `admin_2fa` read on staging (e.g. a duplicate row for B) and sign in | The challenge page shows an error; **no** cookie is issued (fails closed) | not run |
| E10 | Lost authenticator: an owner resets B's `admin_2fa` row (approved service-role action) | B must enroll again at next sign-in; no bypass exists | not run |

### Quick probes (run with a signed-in browser's cookies, minus the 2FA cookie)

```bash
# Replace <cookie> with only the Supabase session cookie(s); omit admin_2fa_verified.
curl -i -H "Cookie: <cookie>" https://<staging>/api/admin/growth-reviews     # expect 401 {"error":"Not authenticated"}
curl -i -H "Cookie: <cookie>" https://<staging>/api/backup                    # expect 401
curl -i -H "Cookie: <cookie>" https://<staging>/api/analytics                 # expect 401
curl -i -X POST https://<staging>/api/sitemap                                 # expect 404 (route removed)
```

## 5. Notes

- R15 documents that the admin reset page can set the password of any Supabase user holding a valid recovery link. It
  cannot grant admin access: middleware and `requireActiveAdmin` check `admin_users` and the 2FA cookie.
- The Client Portal's password forms (6-character minimum) are intentionally unchanged.
- Backup codes are not issued, stored or shown anywhere (nothing accepts them at login). A lost authenticator is reset by an owner (test E10).
- **Do not mark any row passed unless it ran against the isolated staging project.**
