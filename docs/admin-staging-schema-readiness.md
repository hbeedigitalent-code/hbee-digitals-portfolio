# Admin staging readiness: policies, `admin_2fa` uniqueness, schema parity

Prepared after the staging-only security preflight was run on the Hbee Digitals Staging Supabase project.
**Nothing in this package has been executed.** No SQL was run, nothing was deployed, production was not touched, and no
data was copied. Every SQL file below is a draft that has also **not been parsed by PostgreSQL** (no parser or database was
available locally); each has a static contract test, and each must be run on staging by the owner, who should report any
syntax error.

## 1. Exact policy findings (from repository definitions only)

| Policy | Repository definition | Source |
|---|---|---|
| `portfolio_items_admin_all` | `FOR ALL TO authenticated USING (exists (select 1 from public.admin_users au where au.user_id = auth.uid() and au.is_active = true)) WITH CHECK (<same>)` | `scripts/portfolio-staging-01-bootstrap-structure.sql` (reproduces production exactly, per its header) |
| `portfolio_media_admin` | `FOR ALL TO authenticated USING (exists (select 1 from public.admin_users a where a.user_id = auth.uid() and a.is_active = true)) WITH CHECK (<same>)` | `scripts/portfolio-creative-01-forward.sql` |
| `admin_users_select_own` | `FOR SELECT TO authenticated USING (auth.uid() = user_id)` — grants: `authenticated` = SELECT only; anon none | `scripts/phase2-security-rls.sql` STEP 1 (production) and the staging bootstrap |

**Do the first two authorize every authenticated user? In the repository definitions, no.** Each requires an **active
`admin_users` row for `auth.uid()`**. The earlier preflight called them `BLOCKER` because it classified on the **role list**
("ALL to authenticated") and did not print the `USING` / `WITH CHECK` text. That was a flaw in my classifier, not a proven
hole. (`portfolio_items` also has the read policy `Public can view active portfolio items`, `TO public USING (is_active = true)`,
and `portfolio_media_published` for published media; those are the public-site reads and are not write paths.)

**What the repository cannot prove is the live definition on the staging database.** If someone edited a policy by hand, or
the bootstrap was applied differently, the live text could differ. Run
`scripts/admin-rls-00-policy-definitions-readonly.sql`: it prints the actual `USING` / `WITH CHECK` text and labels each write
policy `ADMIN-CHECKED` or `UNRESTRICTED WRITE`. **That output, not this document, settles it.**

**`admin_users_select_own`** — the condition is exactly `auth.uid() = user_id`. That lets a signed-in user read only the row
whose `user_id` is their own uid, so one admin cannot see another admin's row, and an ordinary user sees none. The verifier labels
it `OWN-ROW ONLY` when the live expression compares `user_id` with `auth.uid()` and contains no `OR`; the behaviour test proves it
with a second synthetic admin (admin 1 sees 1 row and cannot see admin 2). With only one real admin in staging, the verifier alone
cannot demonstrate "does not reveal other admins"; the behaviour test can.

**What an admin-only policy does NOT give you.** RLS cannot see the 2FA cookie. An active admin who has not completed 2FA can
still write directly from a browser. The real fix is to move the Admin CMS writes behind `requireActiveAdmin()` routes and then
revoke the browser write grants (see `docs/admin-browser-table-access.md`). The portfolio policies are therefore "ADMIN-WRITE",
not "BLOCKER", but they are not the finish line.

## 2. Portfolio RLS remediation draft (not executed)

Run order, all on **staging**:

1. `scripts/admin-rls-00-policy-definitions-readonly.sql` (read-only): confirm the live definitions.
2. **Only if** step 1 shows `UNRESTRICTED WRITE` (or you want the exact repository definitions re-asserted):
   `scripts/admin-rls-01-portfolio-policies-forward-STAGING.sql`.
3. `scripts/admin-rls-00-policy-definitions-readonly.sql` again, then
   `scripts/admin-rls-03-portfolio-behaviour-tests-STAGING.sql`.
4. If the public Work or Case Study pages misbehave: `scripts/admin-rls-02-portfolio-policies-rollback-STAGING.sql`.

What the forward script does: it re-creates the single browser-role write policy on `portfolio_items`, `portfolio_media` and
`portfolio_capabilities` with the verified-admin predicate, reusing `admin_users` (no new role system, no new function). It
leaves the public SELECT policies, `service_role` and the table grants alone, and revokes `anon`/`PUBLIC` write privileges if any
exist (it re-asserts that anon keeps SELECT on `portfolio_items`). Safeguards:

- refuses without the staging marker; refuses if RLS is off or the structure is unexpected;
- **aborts, and lists them, if any other browser-role write policy exists** instead of dropping it;
- snapshots the current policies and grants into two collision-checked backup tables first;
- re-checks afterwards (every write policy admin-checked, SELECT policy count unchanged, no `anon` write grants, `anon` still has
  SELECT) and rolls everything back if any check fails.

The rollback restores exactly the captured policies and grants (it restores *what was there*; if that was unsafe, that is what
returns), and never drops the backup tables.

The behaviour test (`admin-rls-03`) runs **26 checks as real roles** inside one `DO` statement that ends by raising an exception
carrying the report, so nothing persists (the "error" is the report; first line is PASS / FAIL / INCONCLUSIVE):

| Caller | Checked |
|---|---|
| ordinary signed-in user (not in `admin_users`) | cannot insert / update / delete a portfolio item or media; sees only published rows; sees no `admin_users` row |
| `anon` | sees only published rows (public pages keep working); cannot write; cannot read `admin_users` |
| active admin | can insert, select (incl. hidden), update, delete items and insert media; sees exactly its own `admin_users` row and not another admin's |
| second synthetic admin | the same own-row rule; then **deactivated**: loses write access (`is_active` is honoured) |
| `service_role` | can still insert (server behaviour preserved) |

## 3. `admin_2fa(user_id)` uniqueness (not executed)

Confirmed by the preflight: **no unique constraint or index on `admin_2fa(user_id)`**; zero duplicates today; `secret` is
`NOT NULL`; `backup_codes` exists and is nullable (unused by the application). The application reads the row with
`maybeSingle()`, so a duplicate makes the status read error and **fail closed**: an admin locked out, which the database should
make impossible.

Run order (staging first): `admin-2fa-03-user-id-unique-verify-readonly.sql` (before) → `admin-2fa-01-user-id-unique-forward-STAGING.sql`
→ `admin-2fa-03-...verify-readonly.sql` (after; counts must be identical) → rollback only if needed:
`admin-2fa-02-user-id-unique-rollback-STAGING.sql`.

The forward script: requires the staging marker; **detects duplicates and aborts** (printing user ids, never secrets; it never
deletes or merges); aborts on `NULL user_id`; aborts if `secret` is not `NOT NULL`; adds exactly one named constraint
`admin_2fa_user_id_key UNIQUE (user_id)`; then proves the row count and enabled count are unchanged, `secret` is still `NOT NULL`,
and the constraint covers exactly `(user_id)`. It does not touch rows or columns, does not make `secret` nullable and does not
re-introduce disabling 2FA. Today's state (one active admin, no enrollment, no rows) is preserved.

Application effect: a true race between two first-time enrollments would make the second insert fail with `23505`, which the setup
route reports as a generic "Setup failed" (the admin retries). No other route is affected.

## 4. Admin owner-recovery procedure

There is no self-service bypass: no backup-code login, no "disable 2FA" (refused while enrollment is mandatory), and password
recovery never touches 2FA. A lost authenticator is reset by the **owner**:

1. **Verify identity outside the application** (call/video/in person with someone who can vouch). Email or chat alone is not
   enough, because a mailbox compromise would otherwise be enough to request a reset.
2. Confirm the admin's auth user id matches an **active** `admin_users` row.
3. Record the reset in the owner's log (who, why, when, how identity was verified, user id). The database keeps no audit row; the
   log is the audit trail.
4. Run `scripts/admin-2fa-04-owner-reset-enrollment-TEMPLATE.sql` with the user id filled in and the exact phrase
   `RESET 2FA ENROLLMENT` typed. It **deletes that one `admin_2fa` row** and nothing else. It ships inert (null id, empty phrase).
   **It never sets `secret = NULL`** (the column is `NOT NULL`; the mechanism is deleting the row).
5. Revoke the admin's sessions from the Supabase dashboard if the device was lost or stolen (an Auth action, not SQL).
6. The admin signs in; with no enrollment record the app answers "enrollment required" and issues no cookie until they scan a new
   secret and confirm a code. The old secret no longer exists anywhere.

## 5. Staging schema gap inventory

**Why staging has so few tables.** It was built deliberately minimal. `portfolio-staging-01-bootstrap-structure.sql` recreates
*"ONLY the minimum portfolio/admin baseline"* — `admin_users`, `admin_2fa`, `portfolio_items`, the marker, plus storage — taken from a
read-only production structure discovery scoped to those tables, and `portfolio-creative-01-forward.sql` adds `portfolio_media`
and `portfolio_capabilities`. `docs/portfolio-staging-preparation.md` lists `admin_2fa` as optional and explains the project exists to
validate the portfolio CMS migration. Nothing else was ever scripted. So the small subset is a consequence of scope, not a
failure.

**Why it cannot simply be extended from the repo.** The repository's SQL is *incremental*: hardening, portal-invitation,
newsletter and portfolio migrations that `ALTER` tables created before the repository's history (the Supabase dashboard / early
code). Of the tables the application queries, only six have `CREATE TABLE` anywhere in the repo, and most of the database
functions the app calls have no DDL at all:

| RPC the application calls | DDL in the repo |
|---|---|
| `submit_growth_assessment`, `link_client_to_merchant`, `resolve_ambiguous_submission`, `settle_upload_sessions`, `finalize_upload`, `cleanup_claim_expired_uploads`, `cleanup_mark_upload_cleaned`, `recover_stale_upload_claims`, `claim_email_event(s)`, `claim_notification_events`, `record_email_event_attempt`, `record_notification_attempt`, `recover_stale_email_claims` | **none** |
| `record_program_decision`, `consume_portal_invitation`, `newsletter_subscriber_identity`, `save_portfolio_creative` | present, but as *modifications/additions* (`portal-invite-04`, `portal-invite-02`, `newsletter-security-01`, `portfolio-creative-01`) |

### Inventory (generated from the repository)

Columns: where the schema exists in the repo; whether the current staging has it (the user's preflight, plus what the staging
scripts create); whether A1/A2 need it (tables referenced by the admin pages/routes committed in the two checkpoints, plus the
tables behind the growth/portal RPCs); whether staging security validation needs it. "Inferred" means no staging script creates
it; only the tables you named were individually reported as `TABLE NOT FOUND`.

| Table the app queries | Where its schema exists in the repo | In current staging (preflight) | Needed by A1/A2 | Needed for staging security validation |
|---|---|---|---|---|
| `about_page` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `about_section` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `about_stats` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `about_values` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `admin_2fa` | CREATE TABLE: portfolio-staging-01-bootstrap-structure.sql | yes (reported) | yes | yes - mandatory enrollment, uniqueness, rate-limit tests |
| `admin_users` | CREATE TABLE: portfolio-staging-01-bootstrap-structure.sql | yes (reported) | yes | yes - admin identity, RLS own-row check |
| `agreements` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `audit_reports` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `blog_categories` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `blog_comments` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `blog_posts` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - /api/backup column list and dashboard |
| `client_onboarding_files` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `client_onboarding_submissions` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - dashboard |
| `client_proofs` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `clients` | ALTER / policy / reference only in phase2-security-rls.sql, portal-db-hardening-01-forward.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - merchant/client linkage, portal |
| `contact_submissions` | ALTER / policy / reference only in portfolio-staging-00-structure-discovery.sql, portfolio-staging-00b-structure-discovery-single-result.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - inquiries + the known RLS concern |
| `cta_section` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `email_events` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - outbox / invitations |
| `email_logs` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `email_settings` | named in docs/DATABASE.md only (no DDL) | no (reported TABLE NOT FOUND) | yes | yes - the SMTP-password question is UNVERIFIED without it |
| `email_templates` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `faq_categories` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `faqs` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `featured_about_section` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `footer_settings` | ALTER / policy / reference only in newsletter-security-00-preflight.sql, portfolio-staging-00-structure-discovery.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `growth_assessments` | ALTER / policy / reference only in portal-invite-04-approval-relaxation.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - Growth Reviews |
| `growth_opportunities` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `growth_profile_pdfs` | named in docs/DATABASE.md only (no DDL) | no (reported TABLE NOT FOUND) | yes | yes - Growth Profile detail |
| `growth_profiles` | ALTER / policy / reference only in portal-invite-04-approval-relaxation.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - Growth Profiles |
| `growth_program_decisions` | ALTER / policy / reference only in portal-invite-01-preflight-readonly.sql, portal-invite-03-rollback.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - decision panel, release gate |
| `growth_reviews` | ALTER / policy / reference only in portal-invite-04-approval-relaxation.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - Growth Reviews + admin API 2FA denial tests |
| `growth_scores` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `hero_section` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `leads` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - dashboard |
| `menu_items` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `merchant_accounts` | named in docs/DATABASE.md only (no DDL) | no (reported TABLE NOT FOUND) | yes | yes - sign-up accounts list |
| `merchant_status` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - merchants list |
| `merchants` | ALTER / policy / reference only in portal-invite-01-preflight-readonly.sql, portal-invite-02-forward.sql (base DDL NOT in repo) | no (reported TABLE NOT FOUND) | yes | yes - Growth Review identity |
| `messages` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `newsletter_campaigns` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `newsletter_clicks` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `newsletter_sends` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `newsletter_subscribers` | ALTER / policy / reference only in newsletter-security-00-preflight.sql, newsletter-security-01-forward.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `notifications` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - header notifications |
| `portal_invitations` | CREATE TABLE: portal-invite-02-forward.sql | no (inferred: no staging script creates it) | yes | yes - invitation state |
| `portfolio_capabilities` | CREATE TABLE: portfolio-creative-01-forward.sql | yes by construction (portfolio-creative-01); not in the first preflight list, so unconfirmed | no | yes - RLS write policy |
| `portfolio_items` | CREATE TABLE: portfolio-staging-01-bootstrap-structure.sql | yes (reported) | yes | yes - RLS write policy |
| `portfolio_media` | CREATE TABLE: portfolio-creative-01-forward.sql | yes (reported) | no | yes - RLS write policy |
| `pricing_packages` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `project_deliverables` | ALTER / policy / reference only in portal-launch-01-rls-storage-readonly.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `project_files` | ALTER / policy / reference only in portal-launch-01-rls-storage-readonly.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `project_invoices` | ALTER / policy / reference only in portal-launch-01-rls-storage-readonly.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | yes | yes - dashboard currency checks |
| `project_milestones` | ALTER / policy / reference only in portal-launch-01-rls-storage-readonly.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `project_requests` | ALTER / policy / reference only in portal-db-hardening-01-forward.sql, portal-db-hardening-02-rollback.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `projects` | ALTER / policy / reference only in portal-db-hardening-01-forward.sql, portal-db-hardening-02-rollback.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | yes | yes - dashboard |
| `proofs` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `proposal_files` | none | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `proposals` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `seo_settings` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `services` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `site_settings` | ALTER / policy / reference only in newsletter-security-00-preflight.sql, newsletter-security-01-forward.sql (base DDL NOT in repo) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `subscribers` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - A1/A2 page or route |
| `tasks` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | yes | yes - dashboard |
| `team_members` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `testimonials` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `trust_section` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `upload_batches` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `upload_sessions` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |
| `video_testimonials` | named in docs/DATABASE.md only (no DDL) | no (inferred: no staging script creates it) | no | later - CMS/legacy page, test with the RLS write review |

**Totals:** 69 tables queried by the application; **6** have `CREATE TABLE` in the repo; **16** appear only in `ALTER` / policy /
reference statements (base DDL not in the repo); **46** are named only in `docs/DATABASE.md` / `ARCHITECTURE.md` with no DDL; 1 has
no trace. **32** are needed by A1/A2; **29 of those 32 are missing from the current staging.** 34 are needed for staging security
validation, **29 of which are missing.**

## 6. Recommended schema-parity approach

**The repository cannot reliably reconstruct production's schema, and I will not fabricate a migration to pretend it can.**
Six of 69 tables have DDL; 14 database functions the application calls (RPCs) have none. A hand-written bootstrap would be guesswork
presented as parity, which is worse than none.

Recommended (every step is an owner action; none is run here):

1. **Create a NEW, separate staging project ("staging-full").** Do **not** modify the current staging project: it holds the
   validated portfolio state (hand-reproduced `admin_users`, `admin_2fa`, `portfolio_items`, the creative migration, seeds and
   the marker). Keep it as-is for portfolio work.
2. **Take a schema-only export of production, run by the owner, no data.** For example the Supabase CLI
   `supabase db dump --linked --schema public` (a schema-only dump is the default; do **not** pass `--data-only`), plus the
   `storage` bucket **policies** (not objects). This is a read of the catalog, not of customer data. It needs the owner's
   production database credentials, which I will not request or handle.
3. **Review the dump before it goes anywhere**: grep it for anything secret-shaped (function bodies and column defaults can embed
   URLs or keys; `vault` data is not part of a `public` schema dump). Remove roles/owner statements that do not apply. It must contain
   no `COPY`/`INSERT` data. Commit **nothing** from the dump to the repository until reviewed.
4. **Apply it to staging-full**, then run `scripts/staging-00-environment-marker-STAGING.sql` **before** creating any user or row
   (it refuses unless the schema is empty of data and `auth.users` is empty, so it cannot mark production).
5. **Apply the not-yet-in-production migrations in rollout order**, exactly as they would reach production: the portfolio creative
   and case-study migrations, then any other pending ones. This tests the real rollout sequence rather than a snapshot of an
   already-migrated database.
6. **Prove parity with read-only queries run on BOTH databases and diff the outputs** (`scripts/admin-security-preflight-readonly.sql`
   and `scripts/admin-rls-00-policy-definitions-readonly.sql` return no row data), plus a table/column/function/policy comparison.
   Any difference is investigated, not papered over.
7. **Create synthetic data only**: a synthetic admin (no 2FA, to exercise enrollment), a second admin enrolled through the UI, a
   non-admin client user, and a handful of invented assessments, merchants, inquiries and one profile. These inserts cannot be
   written until the real column lists are known from step 2; writing them now would be guessing. **No production rows, credentials or
   secrets are ever copied.**

**Compatibility with the validated portfolio staging** (analysis): the dump's `portfolio_items`, `admin_users` and `admin_2fa` are the
same production definitions the bootstrap reproduced "exactly", so they should match. The differences to expect and check: (a) the dump
will have *all* the other tables, functions and policies; (b) the production `portfolio_items` will not yet have the creative columns
(they come from step 5); (c) the marker comes from step 4. Because staging-full is a separate project, none of this can disturb the
existing one.

**Fallback if a dump is not possible:** extend the *authorized read-only structure discovery* already used for the portfolio bootstrap
to every table in the inventory (it returns structure JSON, not data) and generate DDL from that JSON. It is slower and more manual, but
is derived from production rather than invented.

## 7. SMTP check

`email_settings` does not exist in the current staging database, so the preflight **could not determine** whether an SMTP password is
stored there. That is recorded as **UNVERIFIED, not safe**. No SMTP secret was added to or copied into staging. What *was* done in
code: the Admin page no longer reads, shows, holds or sends the password. What remains unverified: whether a value is stored in
production, and the table's RLS. It must be checked in staging-full (schema only, so the stored value will be absent by design: the
check is about the table's grants and policies) and in production with the read-only preflight (owner action).

## 8. Rate limiter (release blocker, unchanged)

The limiter fails **open** when Upstash is unconfigured or unreachable (it logs `[rate-limit] … rate limiting is DISABLED`). That
behaviour is **not changed** here. Staging needs these environment variable **names** (values are the owner's, never written here):

| Variable | Used for |
|---|---|
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | `src/lib/rate-limit.ts`. Use a **separate Upstash database for staging**, never production's, so test attempts cannot lock real admins out or pollute production counters |
| `ADMIN_2FA_COOKIE_SECRET` | signs the 2FA cookie (set once; a new staging value) |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | the staging project's own values |
| `ADMIN_2FA_ENROLLMENT` | leave **unset** (mandatory). `optional` is a deliberate downgrade |
| `GROWTH_PROFILE_RELEASE_ENABLED` | only for the Growth Profile tests; leave unchanged otherwise |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | only to submit the public Growth Review form (use Cloudflare's published test keys, not production's) |

Meaningful tests: the TOTP bucket is `hbee:rl:adminTotp:<admin user id>`, **8 attempts per 10 minutes per account**. Test E7 (nine wrong
codes → the ninth returns 429 with `Retry-After`, and a correct code is refused during the window) only means something if the log shows
**no** "rate limiting is DISABLED" line at startup. If it does, E7 will *pass trivially for the wrong reason or fail*; fix the variables first.

## 9. What can already be tested safely on the CURRENT staging

- Admin Login, middleware redirects, the 2FA challenge page and the **mandatory enrollment flow** (needs only `admin_users` + `admin_2fa`).
- Password recovery R1–R17 (needs only Auth + `admin_users`; R3 uses the existing un-enrolled admin).
- 2FA tests E1–E10, **including** rate limiting once the Upstash variables are set.
- The `admin_2fa(user_id)` uniqueness migration, its verifier and its rollback.
- Portfolio RLS: the policy-definition verifier, the forward/rollback drafts and the 26-check behaviour test.
- The Admin shell, navigation and the migrated Portfolio list/editor; the **denial** probes for any admin API (they answer 401 before
  reading any table).
- The public Work / Case Study pages (if seeded), to confirm the public SELECT behaviour survives an RLS change.

## 10. What CANNOT yet be tested

Growth Reviews, Growth Profiles and the decision panel; Inquiries; Merchants/Clients and every A2 cross-link; portal invitations and the
release gate; the dashboard's counts and currency summaries; `/api/backup` and `/api/analytics` **permitted** paths (denial works, success
needs `blog_posts`, `contact_submissions`, `subscribers`); the Email Settings page and the SMTP question; the RLS review of the
other browser-queried tables; upload flows; Client Portal isolation. All of these need staging-full.

## 11. Remaining release blockers

1. **Staging is not representative**: the A1/A2 rollout cannot be validated until staging-full exists (section 6).
2. **`admin_2fa(user_id)` uniqueness is not enforced** until the forward migration is applied and verified (staging, then a separate production decision).
3. **Live policy definitions are unconfirmed**: run `admin-rls-00` and the behaviour test; until `ADMIN-CHECKED` and the 26 checks pass, treat the portfolio write policies as unverified.
4. **RLS for the other browser-queried tables (48 mapped; the portfolio tables are covered above) is unverified**, and admin-checked RLS still bypasses 2FA for direct browser writes.
5. **SMTP password: UNVERIFIED** (table absent in staging).
6. **Upstash must be configured and proven active** on staging and production; the limiter fails open.
7. **Recovery tests R1–R17 and 2FA tests E1–E10 have not been run.**
8. **Owner recovery must be adopted as a written procedure** (section 4) before every admin is forced to enroll.
9. The two checkpoint commits are **local only**; nothing has been reviewed as a pull request.

## 12. Exact owner actions, in order

1. Run `scripts/admin-rls-00-policy-definitions-readonly.sql` on the **current staging** and send me the output. *(read-only)*
2. Run `scripts/admin-2fa-03-user-id-unique-verify-readonly.sql` on the current staging (the "before" picture). *(read-only)*
3. If step 1 shows any `UNRESTRICTED WRITE`, run `admin-rls-01-…-forward-STAGING.sql`, then `admin-rls-03-…-behaviour-tests-STAGING.sql`, and send me the report. If it shows only `ADMIN-CHECKED`, run just the behaviour test.
4. Run `admin-2fa-01-user-id-unique-forward-STAGING.sql` on the current staging, then `admin-2fa-03-…verify-readonly.sql` again.
5. Create the separate **staging Upstash** database and give the app its two variables (names above); confirm there is no "rate limiting is DISABLED" log line.
6. Decide on **staging-full** (section 6): who runs the schema-only export of production, and where the reviewed dump is stored.
7. Approve the owner-recovery procedure (section 4) in writing.
8. After staging-full exists: run the preflight and policy verifier on it, then the recovery (R) and 2FA (E) tests in `docs/admin-password-recovery-staging.md`.
