# Browser-side database access in the Admin (Phase 4)

Inspection of application code only. **No database was queried, no SQL was run, no policy was changed.** Every statement
about RLS below is either (a) what the code assumes or (b) marked **UNVERIFIED**. Nothing here proves a table is safe.

## Why this matters

`middleware.ts` protects admin **pages** and `requireActiveAdmin()` protects admin **API routes**; both enforce the
user-bound 2FA cookie. A call made from the browser straight to Supabase (`supabase.from('x')…`) enforces neither. A
page that does this is protected only by the table's RLS policy, and an RLS policy cannot see the 2FA cookie. So for
every table below, "an admin page uses it" is **not** a security control: a signed-in user of any kind (including a
Client Portal user, or an admin who has not completed 2FA) can issue the same request from a console, unless RLS and
grants stop it.

The repository contains policy SQL for only three tables (`admin_users`, `clients`, `admin_2fa` in
`scripts/phase2-security-rls.sql`). The database audit (`docs/audits/2026-09-13-database-security-audit.md`) records the
RLS posture of the other 61 tables as **never audited (PENDING-DB)**. That is the unresolved fact behind everything here.

## The map (48 tables touched from admin / shared browser code)

Operations are those the code issues (`select`, `insert`, `update`, `delete`, `upsert`). "Class" is my classification of
what the table holds.

### A. Credentials — release blockers until verified

| Table | Ops from browser | Where | Finding |
|---|---|---|---|
| `email_settings` | select, upsert | `/admin/email-settings` | Holds `smtp_password`. **Fixed in code (this phase):** the page no longer selects, displays, holds or sends the password, and upserts only named non-secret columns. **Not fixed:** a value already stored, and whether `authenticated`/`anon` can read it (**UNVERIFIED**). Nothing in the application reads this table, so it can be dropped or have the column removed once approved |
| `admin_2fa` | none from the browser (service-role server routes only) | `/api/admin/2fa/*` | Correct design. `phase2-security-rls.sql` STEP 3 locks it (RLS on, no policies, grants revoked) — **application status UNVERIFIED** |
| `admin_users` | select | `admin/layout.tsx`, `lib/services/admin-service.ts` | The layout's own membership check (defence in depth). Needs a select-own policy only; **UNVERIFIED** |

### B. Personal / commercial / operational data

| Table | Ops from browser | Where |
|---|---|---|
| `contact_submissions` | select, update, delete | `/admin/inquiries`, layout unread count — *the known RLS concern; deliberately not changed* |
| `leads` | select, update | `/admin/crm`, dashboard |
| `client_onboarding_submissions` | select, update | `/admin/client-onboarding` |
| `proposals` | select, update | `/admin/proposals` (list/detail; creation goes through `/api/admin/proposals`) |
| `agreements` | select, update | `/admin/agreements` |
| `projects`, `tasks` | select, update | workspace, client-portal admin, tasks, images |
| `project_invoices`, `project_requests` | select | dashboard, client-health |
| `messages` | select, update, delete | `/admin/messages` |
| `newsletter_campaigns` | select, delete | `/admin/newsletter` |
| `subscribers` | insert | public `NewsletterSubscribe` component |
| `email_templates` | select, insert, update, delete | `/admin/email-templates*` |
| `clients`, `growth_assessments`, `growth_reviews`, `growth_profiles`, `growth_profile_pdfs`, `merchant_status`, `notifications` | select/insert/update | **`lib/services/merchant-lifecycle.ts`, `growth-profile-service.ts`: no importers anywhere — dead code that still contains browser-side writes to these tables** |

### C. Public CMS content (anon `SELECT` is expected; the question is browser-role *writes*)

`about_page`, `about_stats`, `about_values`, `blog_categories`, `blog_comments`, `blog_posts`, `client_proofs`, `cta_section`,
`faq_categories`, `faqs`, `featured_about_section`, `footer_settings`, `hero_section`, `menu_items`, `portfolio_items`,
`portfolio_media`, `pricing_packages`, `seo_settings`, `services`, `site_settings`, `team_members`, `testimonials`,
`trust_section`, `video_testimonials` — written from their admin pages with the browser client.

Only `email_settings` carries a credential-like column among the tables the admin pages read; no other admin browser
query references `password`, `secret`, `token`, `api_key` or `webhook` fields (checked by scanning the code).

## What can be fixed in application code, and what cannot

| Item | Application-code fix | Needs database work (not done) |
|---|---|---|
| SMTP password reaching the browser | **Done** (this phase): page no longer handles it | Remove the stored value / column, or drop `email_settings`; confirm `authenticated`/`anon` cannot select it |
| Admin-page writes to category B/C tables | Move each to an `/api/admin/…` route behind `requireActiveAdmin()` (one area at a time, as done for Growth, Merchants, Clients, Proposals) | After the routes exist: `REVOKE INSERT, UPDATE, DELETE … FROM PUBLIC, anon, authenticated` and drop browser write policies, so RLS finally agrees with the 2FA cookie |
| Dead browser services with writes | Delete `merchant-lifecycle.ts`, `growth-profile-service.ts`, `admin-service.ts` (no importers) | — |
| `contact_submissions` read/update/delete from the browser | Route through `/api/admin/…` | The known RLS hardening (separate approved migration) |

## Verification to run on **staging** first (read-only; not run)

`scripts/admin-security-preflight-readonly.sql` — a single result set that reports, for each table above, RLS on/off and
forced, `anon` / `authenticated` / `PUBLIC` privileges, policy names and commands, and a verdict:

- `BLOCKER` — a secret or private table where a browser role can read/write without RLS protection, or a CMS table
  where a browser role can write;
- `REVIEW` — browser privileges exist and RLS is on: read the policies;
- `OK-ISH` — service-role only (the target for sensitive tables);
- `PUBLIC-CMS` — expected public reads.

It also checks the 2FA rollout facts (section 3 of its output): duplicate `admin_2fa.user_id` rows, how many active
admins have no enabled 2FA, whether `secret` is `NOT NULL`, and whether `user_id` is unique. It selects **no secret
values**. It has not been parsed or executed.

## Deployment-blocking status

| Item | Status |
|---|---|
| Stored SMTP password readable by a browser role | **UNVERIFIED → BLOCKER until the preflight shows otherwise** |
| Any category-A/B table with browser-role write or an RLS-off read | **UNVERIFIED → BLOCKER** |
| `admin_2fa` locked down as intended | **UNVERIFIED** (the audit's risk #6) |
| Category-C browser writes | **UNVERIFIED**; medium until SECTION 9 of the audit script is run |

Per the standing rule, unverified secret access and unverified dangerous RLS policies are treated as **unresolved
deployment blockers**.
