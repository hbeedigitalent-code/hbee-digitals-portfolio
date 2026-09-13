# Database & Security Foundation Audit

- **Phase:** 02, Task 1
- **Date:** 2026-09-13
- **Scope:** Audit only. No schema was modified, no RLS policy was changed, no data was written.
- **Inspection script:** [`scripts/audit-01-schema-inspection.sql`](../../scripts/audit-01-schema-inspection.sql)

## Evidence grades used in this report

| Grade | Meaning |
|---|---|
| **CONFIRMED** | Established by running a command in this repository and reading the result. |
| **PENDING-DB** | Requires the inspection script to be run against production. Not yet known. |
| **UNVERIFIED** | Believed, but not checked against any running system. |

**The single most important statement in this report:** no live database was
queried. The inspection script was written and proven read-only, but it has not
been executed, because this workstation has no direct Postgres connection string
and no `psql`, and the Supabase service-role key reaches only the `public` schema
through PostgREST, not `pg_catalog`. **Section A is therefore PENDING-DB.**
Sections B–E are built from source-level evidence that was actually gathered, and
each finding states which grade it carries.

---

## The inspection script

`scripts/audit-01-schema-inspection.sql` covers everything the task listed:
tables, columns, relationships, foreign keys, RLS enabled status, existing
policies, functions and triggers — plus indexes, role grants, and a findings
query that flags dangerous states directly.

**Proven read-only (CONFIRMED).** The file was parsed mechanically: 11
statements, every one beginning with `select`. No `CREATE`, `ALTER`, `DROP`,
`INSERT`, `UPDATE`, `DELETE`, `GRANT`, `REVOKE`, `TRUNCATE` or `DO $$` block
appears outside of comments. It is safe to run on production and safe to re-run.

RLS flags are read from `pg_class`/`pg_namespace` (`relrowsecurity`,
`relforcerowsecurity`), not `pg_tables`, which does not expose them.

**How to run it.** The Supabase SQL Editor returns only the last result set when
statements are run together, so each of SECTIONS 1–10 is written to be run on its
own. SECTION 10 is the findings query — run that first. SECTION 11 returns the
entire audit as a single JSON document in one cell; copy that out and hand it
back, and Section A of this report can be completed from it.

---

## A. Verified database structure

**Status: PENDING-DB.** This section will be filled from the script's output.

What is known today is inventory inferred from call sites, already recorded in
[DATABASE.md](../DATABASE.md): **64 tables** referenced from application code,
grouped into 10 domains, plus **5 storage buckets** and **12 database functions**
invoked by RPC. That inventory carries known limits — it lists what the code
touches, not what exists; it provides no columns, types, foreign keys or
constraints; and tables reached only from SQL, triggers or the dashboard are
invisible to it.

The 12 functions the application depends on, extracted from `.rpc()` call sites
(CONFIRMED as code references; their existence in the database is PENDING-DB):

`claim_email_event`, `claim_email_events`, `claim_notification_events`,
`cleanup_claim_expired_uploads`, `cleanup_mark_upload_cleaned`, `finalize_upload`,
`link_client_to_merchant`, `record_email_event_attempt`,
`record_notification_attempt`, `recover_stale_email_claims`,
`recover_stale_upload_claims`, `settle_upload_sessions`

These carry real weight — `claim_email_events` is documented in the route as
using `FOR UPDATE SKIP LOCKED` for exclusive claims, meaning concurrency
correctness for the email worker lives in the database, not the application. If
any is missing, renamed, or has a changed signature, the failure is silent at
build time and only appears at runtime.

---

## B. Security gaps

### B1 — No rate limiting anywhere in the application · CONFIRMED

A scan of all 430 source files for `rate limit`, `ratelimit`, `Upstash` or
`throttle` returned two hits, both unrelated (a blog component and an email
layout string). **There is no rate limiting on any endpoint.**

This matters most where it combines with B2.

### B2 — Public, unauthenticated routes using the RLS-bypassing service-role client · CONFIRMED

27 files use the service-role key. **A positive first:** none of them is a client
component — the key appears only in `route.ts` handlers and `src/lib` server
modules, so it is not exposed to the browser.

However, seven service-role routes are public and unauthenticated. Their guards,
checked individually:

| Route | Bot protection | Input validation | Auth |
|---|---|---|---|
| `/api/growth-assessment` | Turnstile | validators | none (by design) |
| `/api/subscribe` | none | validators | none |
| `/api/track-open` | none | validators | none |
| `/api/contact` | **none** | **presence-check only** | none |
| `/api/onboarding` | **none** | **none** | none |
| `/api/track-click` | none | none | none |
| `/api/unsubscribe` | none | none | none |

`/api/growth-assessment` is the model to follow — it verifies Turnstile and uses
`src/lib/validators`. `/api/contact` and `/api/onboarding` are the outliers.

**`/api/contact`** (153 lines, read in full) accepts `req.json()`, constructs a
service-role client inline, and validates only that `fullName`, `email` and
`message` are non-empty. There is no email-format check, no length cap, no
Turnstile, and no rate limit. It then inserts into `contact_submissions`.

**`/api/onboarding`** (158 lines) is the same pattern with less: it checks only
that a payload and env config exist, then inserts with a service-role client, and
also writes file records.

Combined with B1, both are unbounded public write paths into production tables
with an RLS-bypassing credential.

### B3 — Unescaped user input in outbound email HTML · CONFIRMED

In `/api/contact`, attacker-controlled values are interpolated raw into HTML
email bodies — `${fullName}` at lines 121, 138 and 148, `${email}` at 139, and
`${message}` at 142. The route imports no sanitizer.

The admin notification email therefore embeds unescaped submitted content and is
delivered to `ADMIN_NOTIFICATION_EMAIL`. Mail clients generally block scripts, so
this is HTML/link injection into an internal inbox rather than script execution —
a phishing and content-spoofing vector aimed at staff, not remote code execution.
`sanitize-html` is already a project dependency and is used elsewhere
(`sanitize-blog-html.ts`), so the fix is cheap.

### B4 — `ADMIN_2FA_COOKIE_SECRET` declared twice with different values · CONFIRMED

`.env.local` declares `ADMIN_2FA_COOKIE_SECRET` on two separate lines **with
different values**. Whichever line the parser takes last becomes the signing key.

This is a local-environment defect, not a production vulnerability, but it is the
signing key for the admin 2FA cookie: changing which value wins silently
invalidates every previously issued cookie and forces re-verification, and it
makes the local environment's behaviour dependent on file ordering. Whether the
Vercel environment holds a third, different value is **UNVERIFIED**.

### B5 — Nine code-referenced environment variables absent from `.env.local` · CONFIRMED

`ADMIN_NOTIFICATION_EMAIL`, `CRON_SECRET`, `GA_API_SECRET`,
`GROWTH_PROFILE_RELEASE_ENABLED`, `NEXT_PUBLIC_SITE_URL`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `RESEND_REPLY_TO_EMAIL`, `UPLOADS_DISABLED`.

**This is not a security hole, and the reason is worth recording as a positive
finding.** Both secret-guarded subsystems fail closed, verifiably:

- Both cron routes require `CRON_SECRET` to exist **and be at least 16
  characters**, compare it in constant time via `timingSafeEqual`, and refuse
  every request when it is unset — they do not run unauthenticated.
- `admin-2fa-cookie.ts` returns `null` from `signAdmin2FACookie` and `false` from
  `verifyAdmin2FACookie` when the secret is missing, and both calling routes
  return HTTP 500 rather than proceeding. The module's comment states the
  invariant explicitly: nothing treats a missing secret as "2FA not required".

That is correct, defensive design. The gap is operational: whether Vercel holds
all nine is **UNVERIFIED**, and email, cron and the upload kill switch are
inoperative locally.

### B6 — No automated permission tests · CONFIRMED

Carried forward from Phase 01. There is no test framework, no test directory and
no test script. The middleware boundary — session, role, 2FA cookie — across a
46-module admin surface and a client portal is verified only by hand.

### B7 — RLS posture unknown for 61 of 64 tables · PENDING-DB

`scripts/phase2-security-rls.sql` addresses three tables (`admin_users`,
`clients`, `admin_2fa`). The remaining 61 have never been audited. Whether that
script has itself been applied to production is also **UNVERIFIED** — its own
STEP 0 is the check.

### B8 — `SECURITY DEFINER` functions unreviewed · PENDING-DB

The 12 RPC functions are strong candidates for `SECURITY DEFINER`, since claiming
and settling rows across users is exactly what that flag is for. A `SECURITY
DEFINER` function runs as its owner and bypasses RLS; one **without a pinned
`search_path`** is a well-known privilege-escalation hazard. SECTION 6 of the
script returns both the security mode and `proconfig` for every function.

---

## C. Missing policies

**Status: PENDING-DB** — a definitive list requires the script. What can be
stated now is the method and the expected shape of the answer.

SECTION 10 of the script classifies every `public` table into three states:

- **`ANON_READABLE`** — RLS disabled *and* `anon` holds `SELECT`. Publicly
  readable through the API. On any table in the identity, projects, commercial,
  growth, onboarding or communication domains this is a critical finding.
- **`EXPOSED`** — RLS disabled. Access rests entirely on table grants.
- **`LOCKED_OUT`** — RLS enabled with zero policies. Correct and deliberate for
  `admin_2fa`; a bug anywhere else.

Expected legitimate exceptions, to avoid false alarms when the results come back:

- **`admin_2fa` should be `LOCKED_OUT`.** That is the intended end state of
  `phase2-security-rls.sql` STEP 3 — RLS on, every policy dropped, grants revoked
  from `anon` and `authenticated`. Its routes work through the service role.
- **Marketing CMS tables** (`portfolio_items`, `blog_posts`, `services`, `faqs`,
  `hero_section`, `testimonials`, and the rest of the 21 content tables) are
  *supposed* to be anon-readable — they render the public site. For these the
  question is not whether `anon` can `SELECT`, but whether `anon` can `INSERT`,
  `UPDATE` or `DELETE`. SECTION 9 answers that.

The tables where a missing policy would be most serious, given what they hold:
`admin_users`, `clients`, `merchants`, `merchant_accounts`, `projects`,
`project_files`, `project_invoices`, `project_messages`, `proposals`,
`agreements`, `leads`, `messages`, `notifications`, `growth_assessments`,
`growth_profiles`, `growth_reviews`, `client_onboarding_submissions`,
`client_onboarding_files`, `contact_submissions`, `email_logs`, `upload_sessions`.

---

## D. Risk priority ranking

Ranked by severity × likelihood × exploitability. Grade shown for each.

| # | Risk | Grade | Severity | Why this rank |
|---|---|---|---|---|
| **1** | Unknown RLS posture on 61 tables | PENDING-DB | **Critical** | Unbounded. If one client-data table is `ANON_READABLE`, client records are publicly readable now. Cannot be de-risked by reasoning — only by running the script. |
| **2** | `SECURITY DEFINER` functions without pinned `search_path` | PENDING-DB | **Critical** | Textbook privilege-escalation path. 12 candidate functions, all RLS-relevant. |
| **3** | Public service-role writes with no rate limit or bot protection (`/api/contact`, `/api/onboarding`) | CONFIRMED | **High** | Exploitable today by anyone with the URL. Unbounded inserts into production tables; storage writes via onboarding. No authentication required. |
| **4** | No automated permission tests | CONFIRMED | **High** | Not an exploit, a systemic one. Every future change to the three-layer boundary is unverified, so it compounds every other risk on this list. |
| **5** | Unescaped user input in admin notification emails | CONFIRMED | **Medium** | Real and confirmed, but bounded — targets staff inboxes with injected HTML/links, not code execution. Cheap fix with an existing dependency. |
| **6** | `phase2-security-rls.sql` application status unknown | PENDING-DB | **Medium** | If unapplied, `admin_2fa` still exposes TOTP secrets and backup codes to `anon`, which would be **Critical**. Ranked here only because the script was written to fix precisely this and is likely applied. Verify first, then re-rank. |
| **7** | Duplicate `ADMIN_2FA_COOKIE_SECRET` with differing values | CONFIRMED | **Low** | Local-environment defect. Causes confusing 2FA invalidation, not unauthorized access — the module fails closed. |
| **8** | Nine env vars missing locally | CONFIRMED | **Low** | Operational, not a vulnerability; both guarded subsystems verifiably fail closed. |

Note on ranking discipline: risks 1, 2 and 6 outrank the confirmed findings
despite being unverified **because their worst case is worse and their status is
unknown**. That is the argument for running the script before doing anything
else, not for assuming the worst.

---

## E. Recommended remediation order

Nothing below has been carried out. This audit changed no schema, no policy and
no application code.

### Step 0 — Run the inspection script *(blocks everything else)*

Run SECTION 10 first, then SECTION 11, in the Supabase SQL Editor against
production. Hand back the JSON from SECTION 11. This converts risks 1, 2 and 6
from PENDING-DB to fact, completes Section A, and replaces the inferred inventory
in `DATABASE.md` with verified schema. **Until this runs, every remediation below
risk 3 is guesswork.**

### Step 1 — Triage the findings query

Any table classified `ANON_READABLE` outside the marketing CMS set is an
incident, not a backlog item, and should be closed the same day. `EXPOSED`
non-CMS tables come next. `LOCKED_OUT` tables other than `admin_2fa` are likely
broken features rather than security holes.

### Step 2 — Confirm `phase2-security-rls.sql` was applied

Its own STEP 0 answers this in one run. If `admin_2fa` is not locked down, it
jumps to the top of this list.

### Step 3 — Pin `search_path` on every `SECURITY DEFINER` function

Once SECTION 6 identifies them. Small, mechanical, high value.

### Step 4 — Close the public write paths *(can start immediately; needs no DB result)*

1. Add Turnstile verification to `/api/contact` and `/api/onboarding`, matching
   the pattern already working in `/api/growth-assessment`.
2. Move both routes onto `src/lib/validators` with real field validation and
   length caps, replacing the presence-only checks.
3. Add rate limiting. Since there is none anywhere, this is a platform decision,
   not a per-route fix — it should be one shared helper applied to every public
   endpoint.
4. Escape user input before interpolating it into email HTML, using the existing
   `sanitize-html` dependency.

### Step 5 — Write the permission tests

A test runner, plus tests asserting that anonymous, wrong-role and un-2FA'd
requests are rejected for `/admin/*` and `/client-portal/*`. This is what stops
the boundary from regressing silently, and Phase 01 already flagged it as
misplaced in Phase 06.

### Step 6 — Environment hygiene

Remove the duplicate `ADMIN_2FA_COOKIE_SECRET` line, confirm all nine variables
are set in Vercel, and add a `.env.example` documenting every variable the code
reads. `.gitignore` already permits `.env.example`.

### Step 7 — Rewrite `DATABASE.md` from verified output

Replace the call-site inventory with real schema, and record the RLS posture of
every table. Then Phase 02's remaining tasks can proceed on fact.

---

## What this audit did not do

- No live database query, so no table, column, constraint, policy, function or
  trigger has been verified to exist.
- No runtime testing of any endpoint. The route findings come from reading source,
  which proves what the code says, not what it does under load.
- No check of the Vercel environment.
- No browser or inbox verification; the email-injection finding is a source-level
  finding and has not been demonstrated against a real message.
- No penetration testing. `/api/contact` and `/api/onboarding` were **not** sent
  live requests.
