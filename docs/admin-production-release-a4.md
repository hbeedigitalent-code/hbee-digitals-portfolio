# Admin production release (Phase A4): minimal hardening on top of the live homepage

Base: `origin/main` = `c1d890b` (homepage H1-H3, live). Release branch: `release/admin-security-a1-a2`. Every SQL file below is a **draft
that has not been executed or parsed by PostgreSQL**; no SQL was run, nothing was pushed or deployed, production was not touched. The
static test `scripts/test-admin-prod-sql.cjs` checks each script's safety properties with a tokenizer; it is not a PostgreSQL parse.

## 1. Scope

In: the approved Admin/security chain (`ed21c7d`, `507886a`, `657ae65`, `4288eab`, `8a7ad7a`) carried onto `c1d890b`, plus the production
SQL package (2FA uniqueness, RLS + grant hardening, SMTP cleanup) and its tests.

Out (separate, later production release): everything that needs `portfolio_media` / `portfolio_capabilities`, the Portfolio creative
and Case Study migrations, and the Portfolio admin pages that depend on them. Production has `portfolio_items` only. The three
staging scripts `admin-rls-01/02/03-portfolio-*-STAGING.sql` (and their test blocks) exist on the feature branch and are not shipped
here; `docs/admin-staging-schema-readiness.md` still mentions them because it describes the staging work.

## 2. Production `admin_2fa(user_id)` uniqueness (not executed; unchanged by this task)

Owner-reported production state (read-only): 1 active admin; `admin_2fa` 1 row / 1 enabled; 0 duplicate `user_id` groups; 0 NULL
`user_id`; `secret` NOT NULL; RLS ON; no browser grants; **no unique constraint or index on `user_id`**.

| File | Role |
|---|---|
| `prod-admin-2fa-03-verify-readonly.sql` | read-only, run before and after |
| `prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql` | adds only `UNIQUE (user_id)` as `admin_2fa_user_id_key` |
| `prod-admin-2fa-02-user-id-unique-rollback-PRODUCTION.sql` | drops only that constraint |

Forward guarantees: refuses without `set hbee.confirm_production = 'yes';`; `lock_timeout` 5s; aborts, changing nothing, on duplicates, NULL
`user_id`, a nullable `secret`, or an existing constraint/index; adds exactly one constraint; then proves, inside the database, that the row
count, the enabled count and a digest of every row (the secret is never selected or shown) are identical to before. A failed check rolls
the whole transaction back.

## 3. Production RLS: what the audit found and exactly what changes

The owner ran `prod-rls-00-cms-policy-audit-readonly.sql` on production. It found **12 UNSAFE policies** (a non-admin may write where the
code only ever needs an active admin) and **1 REVIEW policy**. All other policies on the 16 tables were OK or INTENDED and are not touched.

| Table | Dropped | Replaced by |
|---|---|---|
| `about_page` | `Allow all operations for authenticated users` (ALL, true/true) | `about_page_admin_all` |
| `blog_categories` | `Allow authenticated users to insert categories`, `Allow authenticated users to update categories`, `Authenticated users can manage categories` | `blog_categories_admin_all` |
| `contact_submissions` | `Allow authenticated admins to manage inquiries` (ALL, true/true) | `contact_submissions_admin_all` |
| `email_templates` | `Allow authenticated manage email templates` | `email_templates_admin_all` |
| `pricing_packages` | `Allow authenticated manage pricing` | `pricing_packages_admin_all` |
| `subscribers` | `Public can unsubscribe` (UPDATE to public) | nothing (see below) |
| `trust_section` | `Allow authenticated manage trust section` | `trust_section_admin_all` |
| `video_testimonials` | `Auth users can delete proofs`, `Auth users can insert proofs`, `Auth users can update proofs` | `video_testimonials_admin_all` |
| `contact_submissions` | `Allow public contact form inserts` (**REVIEW**, the 13th) | nothing (see below) |
| `about_stats` | nothing to drop: RLS on, **no policy today** | `about_stats_admin_all` (**new**) |
| `about_values` | nothing to drop: RLS on, **no policy today** | `about_values_admin_all` (**new**) |

Each of the 9 policies (7 replacements + 2 new) is `ALL` to `authenticated`, permissive, `USING` and `WITH CHECK` both `exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true)`,
the expression the audit calls ADMIN-CHECKED and the staging Portfolio behaviour test proved. **Preserved untouched:** every public/read policy
(including `Public can view proofs`, the public pricing read and the trust-section active read), the public `subscribers` INSERT, `blog_comments`
public insert and approved read, client-own policies, and the service role.

**Why `Public can unsubscribe` can go.** Unsubscribe is `POST /api/unsubscribe`: a signed, same-origin server route that verifies an HMAC of the
address and updates `newsletter_subscribers` with the service role. Nothing in `src/` updates the legacy `subscribers` table from a browser
(the test asserts this). The only browser code touching `subscribers` is `NewsletterSubscribe.tsx` (INSERT), which currently has **no importer**;
the anon INSERT is kept because the owner marked public subscribe intentional.

**Why `Allow public contact form inserts` goes (REVIEW decided from code).** The only writer of `contact_submissions` is `src/app/api/contact/route.ts`,
which builds its client with the service-role credential, and no other file inserts into the table (asserted by the test). An anonymous INSERT
policy therefore serves nothing the site does and lets anyone post straight to the database through the public API, bypassing Turnstile, the rate
limiter and the payload validator. If you know of a form that posts to the database directly, delete that one row from the target list and the
INSERT revoke before running. The rollback restores it.

**Safety.** One transaction, production-confirmation line, 5s `lock_timeout`; **aborts, changing nothing,** if any target is missing, already tests
`admin_users`, has a different command, is not reachable by a browser role, if a replacement name is taken, a table has RLS off, PUBLIC holds
privileges, the admin_users read policy the replacements rely on is missing, or the backup table already exists. Before changing anything it copies
every policy and every anon/authenticated/PUBLIC/service_role grant of the 16 tables into `public._hbee_a4_rls_backup` (RLS on, no browser grants).
Before COMMIT it proves: the 13 targets are gone and the policy count changed by exactly −13 + 9; every other policy is byte-identical (fingerprint);
the 9 policies are exactly the admin-only policy; no browser-reachable write policy without an admin check remains on the modified tables (the
`subscribers` anon INSERT is the one exception); grants equal `before ∩ matrix`; no browser role holds TRUNCATE/TRIGGER/REFERENCES/MAINTAIN;
service_role grants and every RLS flag are unchanged.

| File | Role |
|---|---|
| `prod-rls-03-verify-readonly.sql` | read-only; run before (shows the problems being fixed) and after (summary must read 0) |
| `prod-rls-01-forward-PRODUCTION.sql` | the migration above |
| `prod-rls-02-rollback-PRODUCTION.sql` | restores exactly the 13 dropped policies and the revoked privileges from the backup, drops the 9 created policies; proves equality with the backup; keeps the backup table |
| `prod-rls-04-behaviour-test-ROLLBACK-ONLY.sql` | acts as anon, ordinary user, active admin, client and service role; always raises its report so nothing persists; requires an explicit opt-in; **not run** |

## 4. Browser-role grants: the matrix and its evidence

RLS does not govern TRUNCATE, TRIGGER, REFERENCES or MAINTAIN, so those are revoked from `anon` and `authenticated` on all 16 tables, and every
DML privilege the application does not need is revoked too. The migration **only revokes**: it never grants, and it keeps `before ∩ matrix` for each role.
`service_role` is never touched (the server routes need it). "Server" below means the service role or a server-side admin route, which RLS and the browser grants do not affect.

| Table | `anon` keeps | `authenticated` keeps | Evidence (code) |
|---|---|---|---|
| `about_page` | SELECT | SELECT, INSERT, UPDATE, DELETE | `lib/site/about-data.ts` reads it with the anon client; the Admin About page writes it from the browser |
| `about_stats` | none | SELECT, INSERT, UPDATE, DELETE | only the Admin About page; no public page reads it (`about-data.ts` says so) |
| `about_values` | none | SELECT, INSERT, UPDATE, DELETE | only the Admin About page |
| `blog_categories` | SELECT | SELECT, INSERT, UPDATE, DELETE | Admin categories page writes; public read policy preserved |
| `blog_comments` | SELECT, INSERT | SELECT, INSERT, UPDATE, DELETE | public `BlogComments` selects approved and inserts; the Admin Comments page moderates |
| `client_onboarding_submissions` | none | SELECT, UPDATE | `/api/onboarding` inserts with the service role; the Admin pages read and update |
| `clients` | none | SELECT, INSERT, UPDATE, DELETE | `middleware.ts` reads the signed-in client's row; portal routes use the service role; existing own-row/admin policies kept, only anon and the dangerous privileges are removed |
| `contact_submissions` | none | SELECT, UPDATE, DELETE | `/api/contact` inserts with the service role; the Admin Inquiries page reads, updates, deletes |
| `email_settings` | none | SELECT, INSERT, UPDATE | only the Admin Email Settings page (select + upsert) |
| `email_templates` | none | SELECT, INSERT, UPDATE, DELETE | only the Admin template pages |
| `notifications` | none | SELECT, INSERT, UPDATE, DELETE | service-role routes; existing own-row policies kept |
| `pricing_packages` | SELECT | SELECT, INSERT, UPDATE, DELETE | public pricing page reads with the anon client; Admin pricing pages write |
| `project_requests` | none | SELECT, INSERT, UPDATE, DELETE | portal routes use the service role; **overlaps `portal-db-hardening-01`**, which (if applied) already left `authenticated` with SELECT only: the intersection rule makes this migration a no-op there |
| `subscribers` | INSERT | SELECT, INSERT | legacy browser form inserts; no browser role may UPDATE or DELETE (unsubscribe is server-side) |
| `trust_section` | SELECT | SELECT, INSERT, UPDATE, DELETE | public pages and `TrustedBy` read; the Admin Trust page writes |
| `video_testimonials` | SELECT | SELECT, INSERT, UPDATE, DELETE | only the Admin page uses it; the public view policy is preserved |

Where `authenticated` keeps DML on an admin-managed table, the policies it passes through are admin-only after this migration (the forward proves it).
Two conservative choices are deliberate: the client-own tables (`clients`, `notifications`, `project_requests`) keep their existing authenticated DML
because their own-row policies bound it and the repository cannot prove a browser path is unused; tightening them is a follow-up. **`about_stats` / `about_values`:** RLS is on and there is no policy, so the Admin About editor cannot read or write them today. The migration therefore
**creates** `about_stats_admin_all` and `about_values_admin_all` (active-admin `ALL` to `authenticated`, same predicate as the others). There is no anonymous policy and
`anon` keeps no privilege; `authenticated` keeps SELECT/INSERT/UPDATE/DELETE, which is what the editor uses (select, insert, update, delete); ordinary signed-in
users are blocked by the policy. Nothing is dropped (there is nothing to drop), and the forward aborts if a policy already exists on either table. The rollback drops only these two
new policies (with the other 7) and restores the grant state from the backup.

Not covered, by design: column-level grants, and views over these tables (the verifier lists any view that reads them so you can review its owner and grants).

## 5. Production environment (Vercel) required by this release

Names read from the code; values are never written here.

| Variable | Requirement |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required (production project `hbee-digitals-cms`); baked in at build |
| `SUPABASE_SERVICE_ROLE_KEY` | required, server only |
| `ADMIN_2FA_COOKIE_SECRET` | **required**: without it the 2FA login and status routes refuse and no admin can pass 2FA. Generate a new strong random value used only in production; do not reuse staging's; changing it later signs everyone out of 2FA |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **required**: the limiter fails open without them (logs `rate limiting is DISABLED`). Use a production-only database, separate from staging's |
| `NEXT_PUBLIC_SITE_URL` | set to `https://hbeedigitals.com` (the apex is canonical: `next.config.js` redirects `www` to it). Unset, `/client-login` falls back to a `www` URL |
| `RESEND_API_KEY` | required for emails (11 modules construct the client at import time) |
| `ADMIN_2FA_ENROLLMENT` | **leave unset**: unset (or anything other than `optional`) means enrollment is mandatory |
| `CRON_SECRET`, `PORTAL_INVITATION_SECRET`, `NEWSLETTER_UNSUBSCRIBE_SECRET`, `GROWTH_PROFILE_RELEASE_ENABLED`, `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `ADMIN_NOTIFICATION_EMAIL`, `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED`, `UPLOADS_DISABLED` | already production values for existing flows; this release does not change them |

Production Supabase Auth must allow `https://hbeedigitals.com/admin/reset-password` as a redirect URL (the admin reset email uses
`window.location.origin`), and its Site URL should be `https://hbeedigitals.com`.

## 6. SMTP stored password: runtime dependency audit and cleanup

Production read-only result: `email_settings` has 1 row and 1 row with a non-empty `smtp_password`.

**Runtime dependency audit (whole repository, asserted by the static test so it cannot silently regress):**

- `smtp_password` is named in exactly one source file, `src/app/admin/email-settings/page.tsx`, and there only in comments: the page selects an explicit
  non-secret column list and upserts named non-secret columns; it never reads, holds, shows or sends the password.
- `email_settings` is touched by nothing except that page. No other route, library, cron job or component reads it.
- There is no SMTP transport anywhere: no `nodemailer`, no `createTransport`, no `SMTP_*` variable. All mail (inquiries, Growth Review, lifecycle,
  newsletter) goes through Resend (`RESEND_API_KEY`).
- The page's "send test email" posts to `/api/send-email`, which does not exist.
- No SQL in this repository (function, view, trigger) reads the column.
- **Not provable from the repository:** an external consumer (a Supabase Edge Function, an automation tool, another app) reading the table with its own
  credentials. Confirm there is none.

Conclusion: nothing live depends on the stored value. `prod-smtp-01-clear-stored-password-PRODUCTION.sql` sets **only** `smtp_password = NULL`, needs two
confirmations (`hbee.confirm_production` and `hbee.confirm_irreversible`), proves row count, `rows_with_stored_password` 1 -> 0 and an unchanged digest of
every other column (excluding `updated_at`), and never selects or prints the value. **It cannot be undone and has no rollback**: copying a credential
elsewhere would defeat the point. Because the old admin page loaded the password into the browser, treat it as exposed and rotate it at the provider
regardless. Before/after counts: `prod-smtp-00-password-presence-readonly.sql` (expect `1, 1` before and `1, 0` after).

## 7. RLS and the 2FA cookie (documented, deferred)

RLS can prove "an active admin" through `admin_users`, but it cannot see the custom Admin 2FA cookie. So an active admin who has not
completed 2FA could still write directly from a browser to a table that allows admin-checked writes. The long-term fix is to move
sensitive Admin writes behind server routes guarded by `requireActiveAdmin()` (which does check the 2FA cookie) and then reduce or
revoke the browser write grants; the admin-managed rows of the matrix in section 4 are the list to shrink. **This release does not do that.** The admin
API routes already hardened (backup, export, analytics, merchants, growth profiles, 2FA) are covered by `requireActiveAdmin()`; direct browser CMS
writes (`docs/admin-browser-table-access.md`) remain a deferred, separately approved migration.

## 8. Run order and rollback

All SQL is run by the owner in the Supabase SQL editor, one file per run, with `set hbee.confirm_production = 'yes';` as the first line of every
production-guarded file.

1. Read-only, send the outputs: `prod-rls-03-verify-readonly.sql` (the "before" picture), `prod-admin-2fa-03-verify-readonly.sql`, `prod-smtp-00-password-presence-readonly.sql`.
2. Set the Vercel variables (section 5) and the Supabase Auth redirect URL, **then** deploy the application (the 2FA cookie secret and Upstash must
   exist before the new code serves admin traffic). Smoke the Admin pages.
3. `prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql`, then `prod-admin-2fa-03-verify-readonly.sql` (rows/enabled must still be 1 / 1).
4. `prod-rls-01-forward-PRODUCTION.sql`, then `prod-rls-03-verify-readonly.sql` (summary: 0 problems), then re-smoke the Admin CMS pages (About, Categories, Pricing, Trust, Video, Email templates, Inquiries) and the public site (home, contact form, blog comments, pricing).
5. Optional but recommended: `prod-rls-04-behaviour-test-ROLLBACK-ONLY.sql` with `set hbee.confirm_rollback_test = 'yes';` (the result is the "error" text; line one is PASS or FAIL).
6. After rotating the credential: `prod-smtp-01-clear-stored-password-PRODUCTION.sql` (two confirmations), then `prod-smtp-00-...` again.

Rollback: 2FA `prod-admin-2fa-02-...`; RLS `prod-rls-02-rollback-PRODUCTION.sql` (needs the backup table the forward created); SMTP has none; application: redeploy the previous
Vercel deployment (`c1d890b`). The constraint and the tightened policies/grants are harmless to the old code, which uses the same tables the same way.

## 9. Portfolio stays out

No Portfolio migration, media/capability SQL, Case Study code or Portfolio-schema-dependent Admin page is in this release. The existing
gated creative code that is already on `main` is unchanged; `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` behaviour is unchanged.
