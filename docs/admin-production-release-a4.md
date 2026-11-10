# Admin production release (Phase A4): minimal hardening on top of the live homepage

Base: `origin/main` = `c1d890b` (homepage H1-H3, live). Release branch: `release/admin-security-a1-a2`. Everything below is a **draft
that has not been executed or parsed by PostgreSQL**; no SQL was run, nothing was pushed or deployed, production was not touched.

## 1. Scope

In: the approved Admin/security chain (`ed21c7d`, `507886a`, `657ae65`, `4288eab`, `8a7ad7a`) carried onto `c1d890b`, plus one commit that
adds the production SQL package and removes three Portfolio-only staging scripts.

Out (separate, later production release): everything that needs `portfolio_media` / `portfolio_capabilities`, the Portfolio creative
and Case Study migrations, and the Portfolio admin pages that depend on them. Production has `portfolio_items` only. The three
staging scripts `admin-rls-01/02/03-portfolio-*-STAGING.sql` (and their test blocks) exist on the feature branch and are not shipped
here; `docs/admin-staging-schema-readiness.md` still mentions them because it describes the staging work.

## 2. Production `admin_2fa(user_id)` uniqueness (not executed)

Owner-reported production state (read-only): 1 active admin; `admin_2fa` 1 row / 1 enabled; 0 duplicate `user_id` groups; 0 NULL
`user_id`; `secret` NOT NULL; RLS ON; no browser grants; **no unique constraint or index on `user_id`**.

| File | Role |
|---|---|
| `prod-admin-2fa-03-verify-readonly.sql` | read-only, run before and after |
| `prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql` | adds only `UNIQUE (user_id)` as `admin_2fa_user_id_key` |
| `prod-admin-2fa-02-user-id-unique-rollback-PRODUCTION.sql` | drops only that constraint |

Forward guarantees: refuses without `set hbee.confirm_production = 'yes';` as the first line of the run; `lock_timeout` 5s (fails fast
rather than blocking); aborts, changing nothing, on duplicates, NULL `user_id`, a nullable `secret`, or an existing constraint/index; adds
exactly one constraint; changes no row data and leaves `secret` NOT NULL; then proves, inside the database, that the row count, the
enabled count and a digest of every row (including the secret, which is never selected or shown) are identical to before, that `secret`
is still NOT NULL, and that the constraint covers exactly `(user_id)`. Any failed check rolls the whole transaction back. The enrolled
admin keeps working throughout (the application reads by `user_id`).

## 3. Production RLS classification (code-derived intent; live definitions NOT yet seen)

**What is established and what is not.** The repository contains policy SQL for only `admin_users`, `clients` and `admin_2fa`; the
policies on the other tables exist only in the production database. This release was prepared **without the per-policy production
output** (only the summary that production holds a mixture of legitimate and unsafe policies). So the table below is the *intent the
application code implies* for each table, evidence-labelled "code". Whether a live policy matches that intent is decided by running
`prod-rls-00-cms-policy-audit-readonly.sql`, which prints every policy's exact USING / WITH CHECK text and compares it with this intent,
marking a policy `UNSAFE` only where it allows a non-admin a write that the code never needs. **No remediation SQL is included until that
output proves which policies are unsafe**: a forward script written now would be a guess, and a mass rewrite risks breaking the contact
form, newsletter, comments or the client portal.

| Table | Code evidence (who touches it, how) | Intended policy model |
|---|---|---|
| `about_page` | public site reads (`lib/site/about-data.ts`); admin About page writes from the browser | public read, admin-only write |
| `about_stats` | admin About page (select/insert/update/delete) | admin-only write |
| `about_values` | admin About page (select/insert/update/delete) | admin-only write |
| `blog_categories` | admin categories page writes from the browser | admin-only write (public read of categories if used) |
| `blog_comments` | public `BlogComments` component selects and inserts; admin Comments page updates/deletes | public insert + approved read, admin-only update/delete |
| `client_onboarding_submissions` | inserted by `/api/onboarding` with the service role; admin pages select/update | no public insert needed; admin read/update |
| `clients` | portal routes use the service role; `middleware.ts` reads the signed-in client's own row; admin through server routes | client-own read; writes service-role or admin |
| `contact_submissions` | inserted by `/api/contact` with the service role; admin Inquiries and layout read/update/delete from the browser (the known concern) | no public insert needed; admin read/update/delete |
| `email_settings` | admin Email Settings page only; holds `smtp_password` | admin-only read and write; nothing for anon/clients |
| `email_templates` | admin templates pages only | admin-only |
| `notifications` | service-role routes only (`lib/notifications`, `/api/notifications/*`); dead browser code in `merchant-lifecycle.ts` | no browser need; service role |
| `pricing_packages` | public pricing page reads; admin pricing pages write | public read, admin-only write |
| `project_requests` | service-role portal routes insert/select/update; admin dashboard/health select | client-own or service role; admin read |
| `subscribers` | public `NewsletterSubscribe` inserts from the browser; `/api/analytics` reads | anon INSERT only; admin/service for the rest |
| `trust_section` | public pages and `TrustedBy` read; admin Trust page writes | public read, admin-only write |
| `video_testimonials` | admin page only (select/insert/delete) | admin-only write (public read if the site shows them) |

Preserved by design (the audit never marks these unsafe): public content reads; contact-form and newsletter inserts; public
approved-comment reads and comment inserts; client-own reads/updates; service-role access (it bypasses RLS and is never touched).

**Truly unsafe policies: not yet established.** They are exactly the audit's `UNSAFE` rows. To proceed, send the audit output (policy rows
only; it contains expressions, no data). The remediation will then be a forward/rollback/verifier set limited to those named policies.

## 4. SMTP check (not executed)

`prod-smtp-00-password-presence-readonly.sql` returns two numbers: rows in `email_settings`, and rows with a non-empty `smtp_password`.
The password is used only inside a count predicate and is never returned. A non-zero second number means a credential is at rest in a
table the admin browser client can reach: rotate it and plan to keep it only as a server-side secret.

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

## 6. Portfolio stays out

No Portfolio migration, media/capability SQL, Case Study code or Portfolio-schema-dependent Admin page is in this release. The existing
gated creative code that is already on `main` is unchanged; `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` behaviour is unchanged.

## 7. RLS and the 2FA cookie (documented, deferred)

RLS can prove "an active admin" through `admin_users`, but it cannot see the custom Admin 2FA cookie. So an active admin who has not
completed 2FA could still write directly from a browser to a table that allows admin-checked writes. The long-term fix is to move
sensitive Admin writes behind server routes guarded by `requireActiveAdmin()` (which does check the 2FA cookie) and then reduce or
revoke the browser write grants. **This release does not do that.** The admin API routes already hardened (backup, export, analytics,
merchants, growth profiles, 2FA) are covered by `requireActiveAdmin()`; direct browser CMS writes (`docs/admin-browser-table-access.md`)
remain a deferred, separately approved migration.

## 8. Run order and rollback

1. `prod-smtp-00-password-presence-readonly.sql` and `prod-rls-00-cms-policy-audit-readonly.sql` (read-only; send the outputs).
2. `prod-admin-2fa-03-verify-readonly.sql` (before).
3. Set the Vercel variables above, **then** deploy the application (the 2FA cookie secret and Upstash must exist before the new code
   serves admin traffic).
4. `prod-admin-2fa-01-user-id-unique-forward-PRODUCTION.sql` (with the confirmation line), then the verifier again. rollback:
   `prod-admin-2fa-02-user-id-unique-rollback-PRODUCTION.sql`.
5. Application rollback: redeploy the previous Vercel deployment (`c1d890b`); the constraint is harmless to the old code.
