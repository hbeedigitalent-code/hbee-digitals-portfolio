# Newsletter security reconciliation — OWNER REVIEW ONLY

Stage A has been applied and verified in production. Stage B and the safe-containment
rollback have not been executed. Capture remains disabled. This supersedes the earlier
illustrative SQL in `footer-newsletter-phase-2.md`.

## Final authoritative evidence and remaining preflight checks

Owner supplied final production evidence: `newsletter_subscribers` is owned by
`postgres`, RLS is enabled but not forced, and the exact `UNIQUE(email)` index is
present. There are zero `lower(btrim(email))` duplicate groups. `anon` and
`authenticated` are neither superusers nor RLS-bypass roles; `service_role` is a
non-superuser with `BYPASSRLS=true`. Existing policies/grants include unrestricted
anonymous UPDATE and authenticated SELECT and therefore require the stage-B cutover.
The authoritative post-Stage-A subscriber evidence is 14 rows (9 active, 5 bounced,
zero unsubscribed/NULL/other statuses) with legacy-projection fingerprint
`b9ec19e5467d2ceb0c42d7531cc1ee67`. The projection removes only the three nullable
Stage-A consent fields, so it is comparable with the pre-Stage-A row shape.

Stage A now records those exact owner/RLS/role facts as fail-closed guards:

```sql
expected_relrowsecurity := true;
expected_relforcerowsecurity := false;
expected_table_owner := 'postgres';
```

00 remains mandatory immediately before execution to detect drift and inventory ACLs
including PUBLIC/column grants/inheritance, views, routines, triggers, default
privileges, indexes and settings. The exact email uniqueness check is structural and
does not assume that production uniqueness is a named constraint rather than a
standalone unique index.
UUID identity must also have a verified PRIMARY KEY(id) or exact validated UNIQUE(id),
with a valid/ready nonpartial unique backing index; NOT NULL alone is insufficient
for UUID-targeted admin updates and deterministic fingerprints. The scripts abort
instead of adding/changing a primary key if this evidence is absent. Live distinct
statuses and exact index equivalence remain unverified; source uses `active`,
`unsubscribed`, `bounced`, and potentially NULL/unknown statuses. Campaign selection
requires `status='active'`. No status values/defaults will be changed by migration.

## Final architecture and effective access

| Role | Direct table access | Supported path |
| --- | --- | --- |
| anon | None, including INSERT and administrative privileges | Guarded public subscribe/unsubscribe routes only |
| ordinary authenticated | None | Same public routes; admin gate denies access |
| active admin browser | None | `/api/admin/subscribers`: existing session + user-bound 2FA + active `admin_users` guard, then server client |
| service_role | Existing privileges retained; CRUD explicitly ensured | Subscribe, unsubscribe, campaigns, protected admin API |

Final RLS: ENABLE + FORCE, zero policies on this table (default deny). Service-role
BYPASSRLS is a mandatory precondition; owner must not be a browser role or inherited
by one. Browser table/column grants and PUBLIC grants are revoked. Postconditions
abort if inherited privileges survive. No policy on another table is modified.

This deliberately avoids a SECURITY DEFINER admin helper and bypasses no 2FA check.
Newsletter POST also fails closed when Upstash is unconfigured/unreachable
(`degraded:true`); the shared limiter's contact/onboarding behavior is unchanged.
Turnstile remains independently fail-closed. No client sees server credentials.
All direct subscriber reads/writes in three admin screens move to the protected API;
campaign-table operations stay unchanged. No new mailing list is introduced.

One narrowly scoped normalized-identity RPC returns only id/status, is SECURITY
INVOKER, fixes search_path to pg_catalog/pg_temp, uses fully qualified table access,
and grants EXECUTE only to service_role (plus unavoidable owner rights). It is needed
because an exact `.eq('email', normalized)` misses historical mixed-case/space-padded
rows without modifying their stored values. Public callers cannot execute it.

Other browser-callable SECURITY DEFINER routines require explicit signature review
in the cutover allowlist; dependent browser-accessible views block cutover. Catalog
text searches cannot prove arbitrary dynamic SQL safe. No unrelated function's ACL
is silently modified to make the verifier pass.

The final production allowlist pins `current_client_id()` to
`298d2fb4275c92b8b24f4ad3a2a0ba8d`, `increment_blog_view(uuid)` to
`a1bb0427d93116b48eed7b86e0dd1f06`, and `is_active_admin()` to
`ff158b21fdc826346db24a298bf7bf5f`. Keys are deterministically schema-qualified in
the guard. The SECURITY INVOKER identity RPC is separately pinned to
`7ff011c458b629e471f3629f7d389e1a`; it is not admitted to the definer allowlist.

## Data decisions

- Keep exact UNIQUE(email), add UNIQUE(lower(btrim(email))). Do not drop either
  non-unique email/status index in this rollout. Preflight compares structural keys,
  opclasses, collations, predicates, expressions and flags; redundant candidates are
  optional later cleanup, not proven redundant from names alone.
- Use exactly `consent_given_at timestamptz NULL`, `consent_source text NULL`,
  `consent_version text NULL`, no defaults. Replace the unexecuted local proposal's
  `marketing_consent`/`consent_at`; abort on unexpected preexisting alternative columns.
  New explicit footer/popup inserts set server time/source/version. Existing rows
  remain NULL; duplicates do not update source, status or consent.
- Normal public submissions never reactivate a row. Only already-active duplicates
  may return already-subscribed. NULL, bounced and unsubscribed do not. Dedicated
  public resubscription is deferred. Existing explicit admin status controls remain
  admin-only; CSV import inserts new records and skips duplicates without overwriting
  source, status, tags or historical consent.
- New input normalization removes ASCII edge spaces, lowercases and validates;
  other whitespace padding is rejected, matching btrim's default space semantics.
  New newsletter inputs are ASCII-only until SMTPUTF8/Unicode locale behavior is
  separately verified. Contact settings keep their existing validator behavior.
  Historical Unicode rows are untouched; unsubscribe passes their original Unicode
  spelling to the RPC, so PostgreSQL lower() is the authority rather than JavaScript
  casefolding. The normalized RPC/index are the database authority for historical identity.
- `/api/unsubscribe` remains service-role-only, resolves normalized identity and
  updates by UUID. Missing identity is an idempotent no-op; database failure is never
  reported as a successful unsubscribe. Campaign sends continue selecting active only.
- Only add `site_settings.newsletter_settings jsonb NULL`. Existing contact,
  description and social fields remain authoritative; no duplicate columns. Current
  validated version-1 JSON already covers headline, description, popup headline,
  switches and delay. Button label/consent version remain code-owned constants to
  keep the consent-copy contract intact. No automatic activation or JSON row update.

## Owner-controlled rollout and rollback

1. Stage A of 01 has already completed: its NULL columns, normalized index and
   server-only RPC are present, and its evidence reports unchanged historical rows.
2. Commit `09a69cc46ceb02beb34943ae2c24937f5bd8fdfb` is deployed with capture OFF;
   the protected admin page, public routes and unauthenticated API denial were verified.
3. Immediately before owner execution, run/read 00 separately to detect any new drift.
4. Then confirm the stage B application-cutover guard and run only stage B. Its pinned
   row/routine evidence closes grants and replaces policies with default deny. Do not
   rerun Stage A or run the complete file blindly; the two transactions are intentional.
5. Run 03, review all FAIL/REVIEW results, perform authenticated runtime checks as admin
   and ordinary user; only later separately authorize newsletter activation.

Both stages lock writes and compare counts plus row fingerprints before/after; Stage B
also requires the authoritative 14-row legacy projection before making access changes.
The normalized-index comment records aggregate evidence, never subscriber values. 03
recomputes the same schema-stable legacy projection. A later legitimate write changes
that fingerprint; distinguish that from migration DML.

02 is a **safe access/application rollback**, retaining the hardened perimeter and the
last compatible server-mediated application. It intentionally does NOT restore known
public/ordinary-user exposure. Consent/index/RPC remain available. Restoring broad grants
or destructive schema rollback is NOT included or authorized. If application rollback
would require browser table grants, stop for a separately reviewed narrow access plan.

## Verification limits and references

All local checks are mocked/static. SQL has not been parsed by PostgreSQL or run,
and live RLS flags, existing routine safety, trigger behavior and role memberships are
not proven by local tests. The four artifacts are ready for owner SQL review, not blind
execution. PostgreSQL documents [RLS and BYPASSRLS](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
and [table/column REVOKE](https://www.postgresql.org/docs/16/sql-revoke.html).
