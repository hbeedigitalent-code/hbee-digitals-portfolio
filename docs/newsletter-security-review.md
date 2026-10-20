# Newsletter security reconciliation — OWNER REVIEW ONLY

Nothing in this plan has been executed against a database. Capture remains disabled.
This supersedes the earlier illustrative SQL in `footer-newsletter-phase-2.md`.

## Final authoritative evidence and remaining preflight checks

Owner supplied final production evidence: `newsletter_subscribers` is owned by
`postgres`, RLS is enabled but not forced, and the exact `UNIQUE(email)` index is
present. There are zero `lower(btrim(email))` duplicate groups. `anon` and
`authenticated` are neither superusers nor RLS-bypass roles; `service_role` is a
non-superuser with `BYPASSRLS=true`. Existing policies/grants include unrestricted
anonymous UPDATE and authenticated SELECT and therefore require the stage-B cutover.

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

1. Run/read 00 separately. Fill the expected RLS flags in stage A from authoritative
   output; review all dependent functions/views, role attributes, exact constraint,
   row fingerprint and settings. Unknown/colliding objects block execution.
2. Stage A of 01 is additive preparation only (one transaction): lock/recheck duplicates,
   add NULL columns, normalized index, server-only RPC; prove original row fingerprint
   unchanged. Old browser admin access is still present during this staging interval.
3. Deploy the reviewed compatible application with capture still OFF. Test admin gate,
   normalized lookup, unsubscribing and campaign counts in the owner-controlled environment.
4. Only then confirm the stage B application-cutover guard and reviewed routine signatures,
   and run stage B (separate transaction). This closes grants and replaces policies with
   default deny. Do not run the complete file blindly: two transactions are intentional
   to avoid breaking an old deployed browser-admin release.
5. Run 03, review all FAIL/REVIEW results, perform authenticated runtime checks as admin
   and ordinary user; only later separately authorize newsletter activation.

Both stages lock writes and compare counts plus original-row fingerprints before/after;
the normalized index comment records aggregate evidence, never subscriber values.
03 can compare the cutover fingerprint while capture/admin writes are quiescent. A later
legitimate write changes that fingerprint; distinguish that from migration DML.

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
