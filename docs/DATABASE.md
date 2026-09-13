# Database

Platform: **Supabase PostgreSQL**, accessed through the Supabase JS client. There
is no ORM — see [ADR-0002](decisions/0002-retain-supabase-over-prisma-and-authjs.md).

## How this inventory was produced

Evidence grade: **read from source**. Every table name below was extracted by
scanning all 430 `.ts`/`.tsx` files under `src/` for `.from('<name>')` calls and
de-duplicating the results.

Important limits on this method, stated plainly:

- It lists tables the **application code references**. It is not a dump of the
  live schema. Tables that exist in Supabase but are only touched from the
  dashboard, from SQL, or from a trigger will be missing here.
- It gives **no columns, types, constraints, defaults, indexes or foreign keys**.
  Those are not recoverable from call sites.
- Three names caught by the scan — `avatars`, `images`, `proofs` — were checked
  individually and are **storage buckets**, reached via `supabase.storage.from()`,
  not tables. They are excluded from the count below.

**64 distinct tables** are referenced from application code.

**Unverified:** the live schema, row counts, column definitions, foreign keys,
and which of these tables have RLS enabled. Producing that requires querying the
database, which was not done. See "Next step" at the end.

## Tables by domain

### Identity and access (6)

`admin_users`, `admin_2fa`, `clients`, `merchants`, `merchant_accounts`,
`merchant_status`

`admin_users` and `clients` are the role source of truth for
[the middleware access boundary](ARCHITECTURE.md#4-the-access-boundary).
`admin_2fa` holds TOTP secrets and backup codes and is the most sensitive table
in the system.

### Projects and delivery (10)

`projects`, `project_requests`, `project_files`, `project_deliverables`,
`project_invoices`, `project_messages`, `tasks`, `agreements`, `proofs`,
`client_proofs`

### Commercial (3)

`proposals`, `leads`, `pricing_packages`

### Growth systems (8)

`growth_assessments`, `growth_profiles`, `growth_profile_pdfs`, `growth_reviews`,
`growth_scores`, `growth_opportunities`, `growth_program_decisions`,
`audit_reports`

This cluster is the distinguishing feature of Growth OS and has no equivalent in
an ordinary agency CRM.

### Client onboarding (2)

`client_onboarding_submissions`, `client_onboarding_files`

### Communication (7)

`messages`, `notifications`, `email_logs`, `email_events`, `email_settings`,
`email_templates`, `contact_submissions`

### Newsletter (5)

`newsletter_subscribers`, `newsletter_campaigns`, `newsletter_sends`,
`newsletter_clicks`, `subscribers`

`subscribers` and `newsletter_subscribers` both exist. Whether that is a
deliberate split or a legacy duplicate is **unverified** and worth resolving.

### Uploads (2)

`upload_batches`, `upload_sessions`

### Marketing site content (21)

`portfolio_items`, `blog_posts`, `blog_categories`, `blog_comments`, `services`,
`testimonials`, `video_testimonials`, `faqs`, `faq_categories`, `team_members`,
`hero_section`, `about_page`, `about_section`, `featured_about_section`,
`about_stats`, `about_values`, `cta_section`, `trust_section`, `footer_settings`,
`menu_items`, `site_settings`, `seo_settings`, `images`

These back the public site's CMS. `about_page`, `about_section` and
`featured_about_section` overlap by name; the distinction is **unverified**.

## Row Level Security

The one migration script in the repository is
[`scripts/phase2-security-rls.sql`](../scripts/phase2-security-rls.sql) (141
lines). Read from source, it is idempotent, re-runnable, and structured as an
inspect-then-change script: STEP 0 prints current state for review before STEP
1–3 make changes. It covers three tables.

**`admin_users`** — a prior policy referenced `admin_users` inside its own
`USING` clause, causing `infinite recursion detected (42P17)`, which made every
read return HTTP 500. The fix drops all policies and adds one non-recursive
self-select: `auth.uid() = user_id`. The app never writes this table from the
anon or session client.

**`clients`** — additively adds a guaranteed self-select for authenticated users.
Existing policies, including any admin "read all clients" policy, are left
untouched.

**`admin_2fa`** — anon could previously `SELECT` the full row, including the TOTP
`secret` and `backup_codes`, and anon `PATCH` was accepted (204). The table was
effectively unprotected. The fix enables RLS, drops every policy, and revokes
table grants from `anon` and `authenticated`, leaving no policy and therefore no
access through the public API. The 2FA routes continue to work because they use
the service-role key, which bypasses RLS.

**Unverified:** whether this script has actually been run against production, and
what the RLS posture of the other 61 tables is. The script's own STEP 0 is the
correct way to check the three it covers.

## Standards for future database work

1. **Migrations are files.** Every schema change goes in a numbered, reviewed SQL
   file in `scripts/`, never applied ad hoc through the dashboard alone.
2. **Idempotent and re-runnable.** Follow the pattern in
   `phase2-security-rls.sql`: guard with `if exists` / `if not exists`, and make
   a second run a no-op.
3. **Inspect before you change.** Open with a read-only STEP 0 that prints
   current state, so the operator reviews before mutating.
4. **Non-destructive by default.** No dropping columns or tables, and no data
   deletion, without explicit written approval.
5. **Read-only inspection SQL must use `pg_class`/`pg_namespace`** for RLS flags
   rather than `pg_tables`, which does not expose `relrowsecurity`.
6. **Every new table should carry** an id, created and updated timestamps, an
   ownership column where rows belong to a user or client, and an explicit RLS
   policy decided at creation time rather than retrofitted.
7. **Document the change here** in the same batch.

## Database functions

**12 functions** are invoked from application code via `.rpc()` (read from
source):

`claim_email_event`, `claim_email_events`, `claim_notification_events`,
`cleanup_claim_expired_uploads`, `cleanup_mark_upload_cleaned`, `finalize_upload`,
`link_client_to_merchant`, `record_email_event_attempt`,
`record_notification_attempt`, `recover_stale_email_claims`,
`recover_stale_upload_claims`, `settle_upload_sessions`

Concurrency correctness for the email worker and the upload lifecycle lives in
these functions rather than in the application — `claim_email_events` is
documented at its call site as using `FOR UPDATE SKIP LOCKED` for exclusive,
expiring claims. **Unverified:** that each exists in the database with the
expected signature, and whether any is `SECURITY DEFINER` (which bypasses RLS).

## Next step

The read-only inspection script now exists:
[`scripts/audit-01-schema-inspection.sql`](../scripts/audit-01-schema-inspection.sql).
It dumps tables, columns, foreign keys, RLS flags, policies, functions, triggers,
indexes and role grants, and flags exposed or locked-out tables directly. **It has
not been run.** Once it is executed against production, this document should be
rewritten from its output. Findings and remediation are tracked in
[the Phase 02 audit](audits/2026-09-13-database-security-audit.md).

The remaining work this unblocks: replacing the call-site inventory above with
verified schema — columns, types, foreign keys and constraints — and recording
the RLS posture of all 64 tables rather than the three currently covered.
