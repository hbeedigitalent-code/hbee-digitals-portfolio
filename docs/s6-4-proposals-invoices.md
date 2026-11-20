# S6.4 — Proposals v2, Invoices, PDF documents

Status: **audit + design proposal. No migration, no application change yet.** Base `b3ec20e` (= `origin/main`, S6.3 released).
Everything marked *(unproven)* depends on `scripts/proposals-invoices-00-preflight-readonly.sql` being run against production: the repository holds **no DDL** for `proposals`, `proposal_files` or `project_invoices`.

## 1. What the repository proves today

### Proposals
| Fact | Evidence |
|---|---|
| Columns written/read: `id, proposal_number (NOT NULL), merchant_id, client_id (nullable), title, status, services, pricing, timeline, terms, notes, expires_at, sent_at, accepted_at, created_at, updated_at, created_by`, optionally `growth_profile_id` (probed at runtime — existence unproven) | `api/admin/proposals`, `…/[id]/status`, client routes |
| `services` = JSON array of `{name, description, price}` where **price is a string**; `pricing` = JSON `{total, payment_terms, currency}` with **currency hard-coded `'USD'`**; total = `parseFloat` sum, `toFixed(2)` (**JS floating point**) | `api/admin/proposals` L195–L230 |
| Number format `PROP-YYYYMMDD-XXXXXX` (random suffix, pre-check + retry) | same file |
| Status vocabulary `draft, sent, viewed, approved, changes_requested, rejected, expired`; `rejected` has **no producer**; "expired" is **derived** (`expires_at` passed while sent/viewed), never stored | `lib/proposal-status.ts`, `proposal-display.ts` |
| Send requires a non-null `client_id`; send/approve use conditional UPDATEs (`.in('status', …)`) so double clicks are harmless | status + approve routes |
| Client approve / request-changes / viewed are Portal-resolver routes (`requireConnected`), ownership by `client_id` | `api/client-portal/proposals/[id]/*` |
| Attachments: `proposal_files` + private bucket `proposal-files`, upload context `proposal`, signed URLs only | upload-session, signed-url routes |
| **No project is created or linked on approval by the application** — but production HAS `proposals.converted_to_project_id` with a foreign key to `projects(id)` (the repository never references it; the catalog is the evidence, and an earlier preflight row that said "no project column" was wrong because it probed guessed names). Production also has an unreferenced relation `public.proposal_requests`, inspected by `00b`. | grep + production catalog |
| `merchant_status` is advanced (`proposal_ready` / `proposal_accepted`) | lifecycle code |
| No PDF library is installed and no PDF is generated anywhere (`growth_profile_pdfs` stores URLs of externally supplied PDFs) | `package.json`, grep |

### Invoices
| Fact | Evidence |
|---|---|
| `project_invoices` is **read-only in the app**: only `id, invoice_number, amount, currency, status, due_date, payment_link, created_at, project_id` are ever read. **No writer exists** ("no admin invoicing module", ROADMAP). | grep |
| No `client_id`: ownership is `project_id → projects.client_id` | `api/client-portal/invoices` |
| Admin dashboard counts `status = 'overdue'` as a **stored** value | dashboard, workspace |
| `amount` is a single figure with a per-row `currency`; no tax, discount, line items, payments, paid/balance, issue date, void | — |
| No payment provider, no ledger, no payment table | grep |

### Integrity gaps found (these drive the design)
1. **Admin proposal mutations run from the browser** (`admin-browser-table-access.md`: `proposals` select + **update**; the status page does `supabase.from('proposals').update(...)`). That path has no 2FA cookie and **no column restriction**, so an approved proposal's pricing/terms can be edited after approval, silently.
2. `request-changes` **does not persist the client's reason** (it lives only in an admin notification) — there is no revision trail.
3. There is **no draft edit page**: a proposal can be created but not revised, so "changes requested → revise → resend" cannot actually be completed.
4. The notification key is `(type, entity, scope, recipient)`: a **second `proposal_sent` for the same proposal would be silently deduplicated** — a revised proposal would never notify the client unless the key includes the version.
5. Money is floating-point JS over string prices; currency is not selectable.

## 2. Proposed model (to be confirmed by the preflight)

**Money.** `numeric(14,2)` in the database; line `amount` is a **generated column** `round(quantity * unit_price, 2)` so the database, not the browser or JS, is authoritative; totals are computed in SQL inside the same transaction. Application arithmetic uses integer minor units / decimal strings (never `number` addition). ISO codes `USD, NGN, GBP, EUR` (all 2-decimal), one currency per proposal; an invoice inherits it.

**Proposal v2 — additive on `proposals`** (nullable first, backfilled, constraints only where safe): `currency, subtotal, discount_amount, total, summary, scope, deliverables, issue_date, version (default 1), revision_note, project_id → projects, declined_at, approved_version, approved_by`. Existing columns (`title, timeline, terms, notes (internal), expires_at, sent_at, accepted_at, created_by, status`) are **kept** and reused. Legacy `services`/`pricing` JSON stay as the legacy record; they are converted to line items **only where every price is a plain decimal** (preflight counts the rest); unconvertible legacy proposals stay legacy and the UI renders their JSON as it does today.

**Line items.** `proposal_line_items(proposal_id, version, sort_order, title, description, quantity, unit_price, amount GENERATED)`; `invoice_line_items` likewise, **copied** from the approved version at invoice creation (never joined live).

**Revisions / snapshot.** `proposal_versions(proposal_id, version, snapshot jsonb, currency, total, sent_at, approved_at, …)` written by `send_proposal()` — the snapshot is exactly what the client saw. Editing is allowed only while `draft` or `changes_requested`; sending again bumps `version` and writes a new snapshot. The client approves a **specific version** (`p_confirm_version` must equal the current version), so a stale page cannot approve a newer text.

**Immutability, enforced in the database.** A trigger `proposals_immutable_after_decision` rejects any change to commercial columns once `status IN ('approved','declined','rejected')` or `project_id` is set, **for every role including the browser path in gap 1**; line items and snapshots are insert-only after send. The Admin proposal mutations move to `requireActiveAdmin()` routes and the browser `UPDATE` privilege is reviewed with the verifier.

**Status.** Keep the stored vocabulary: `draft, sent, viewed, changes_requested, approved, rejected, expired`. Proposed: write **`declined`** for new client declines and treat legacy `rejected` as the same state in display; **do not add a stored `converted` status** — "converted" = `approved AND project_id IS NOT NULL` (derived), so `approved` stays a single immutable commercial fact. *Open decision for you.* `approved` is allowed from `sent`/`viewed` only (a `changes_requested` proposal must be re-sent as a new version before it can be approved); the current code also allows approval from `changes_requested`, which would let a client approve a text they had asked to change.

**Approval, atomically.** `approve_proposal(proposal, client, user, confirm_version, project_reference)` — `SECURITY DEFINER`, pinned `search_path`, `service_role` only. One transaction: lock the proposal, verify ownership, status, expiry and version, return `already_approved` if repeated, set `accepted_at / approved_version / approved_by`, **reuse `project_id` if valid else create one `Pending Review` client project** (reference retry on 23505 exactly like `create_portal_request`), link it, write activity events with dedupe keys. Notifications run after commit and are keyed on `proposal_versions.id`, so a revised send notifies and a retried approval does not.

**Invoices.** Decision depends on the preflight:
- if `project_invoices` has **no rows** (or only a handful of well-shaped rows): **extend it** additively (`client_id, merchant_id, proposal_id, subtotal, discount_amount, tax_amount, total, amount_paid, issue_date, notes, payment_instructions, paid_at, voided_at, updated_at`) — no duplicate table, the dashboard reader keeps working;
- otherwise: new `invoices`, and `project_invoices` stays a read-only legacy list merged into the Portal view.

`invoice_payments` is an **append-only ledger**; `record_invoice_payment()` locks the invoice, rejects overpayment (`sum + amount ≤ total`), inserts, and updates `amount_paid` and status in the same transaction. A trigger blocks changes to financial columns and line items once `status <> 'draft'`.

**Numbering.** `document_counters(kind, year, last_value)` bumped with `INSERT … ON CONFLICT DO UPDATE … RETURNING` inside the issuing transaction (row-locked, gap-free per year): `HBD-INV-2026-0001`; new proposals `HBD-PRO-2026-0001`. Existing `PROP-…` numbers are untouched. (A plain sequence would also be collision-safe but cannot reset per year.)

**Invoice status.** Stored `draft, issued, partially_paid, paid, void`. **`overdue` is computed** (`due_date < today` while `issued` / `partially_paid`), never written by page-load logic; existing legacy `overdue` rows are kept and the Admin dashboard query is updated to compute it.

**PDF.** Server-generated with **`pdf-lib`** (pure JavaScript, MIT, no native binary, runs in a Node route on Vercel) using the built-in Helvetica faces — no screenshot rendering, no font files to host. Adding it needs your approval because it changes `package.json` and the lockfile. **Storage:** generated **on demand** from the immutable snapshot/issued rows, delivered through an authenticated route (no storage object, no URL to leak, no new bucket). Because the source rows are immutable the content is reproducible; the footer carries a template version. If legal later needs a byte-frozen copy, store it in the existing **private** bucket with signed delivery only.

**Activity / notifications / email.** Reuse `activity_events` (client/internal visibility) and `notifications` (deterministic keys). Email: only wire event hooks; the existing `proposal-ready` template and outbox can be connected in S6.5.

## 3. Rollout order (PRODUCTION ONLY — there is no staging step)
1. Release gate: targeted tests + SQL static tests, `tsc --noEmit`, `git diff --check` (all green).
2. Run `proposals-invoices-01-forward.sql` against PRODUCTION (one guarded transaction; aborts rather than guesses).
3. Run `03-verify-readonly.sql` with `final_hardened = false` (the default). EXPECTED: `OVERALL = PASS`, HARDENING row = PRE-HARDENING, row 120 = INFO x4 (the retained browser write grants on `proposals` / `project_invoices`).
4. Run `04-behaviour-test-ROLLBACK-ONLY.sql` against PRODUCTION. One self-opened transaction, always ends in `ROLLBACK`, no `COMMIT`; Step 0 aborts before any write if a trigger on a written table could reach the network, a webhook or the file system; no function it calls touches storage, HTTP, email or payments (those are sent by the application). After the rollback its final SELECT must return `0, 0` leftovers. Expected last notice: `ALL BEHAVIOUR CHECKS PASSED`.
5. Only after that DB proof: commit / push / deploy the application code (owner-controlled).
6. Focused production application walkthrough (draft -> send -> client view/PDF -> change request -> resend -> approve -> invoice -> payment).
7. Run `05-revoke-browser-writes-AFTER-DEPLOY.sql` against PRODUCTION.
8. Run `03` again with `final_hardened = true` (edit the single `cfg` line). EXPECTED: `OVERALL = PASS`, HARDENING row = FINAL, row 120 = PASS x4. Any surviving browser write grant is a FAIL in this run.

## Final state (implementation complete, nothing executed)

- SQL package: 00 preflight, 00b reconcile, 01 forward, 02 rollback, 03 verify (read-only), 04 behaviour test (ROLLBACK-ONLY), 05 revoke browser writes (run only AFTER the code is deployed). None has been executed; static tests: `test-proposals-invoices-sql.cjs` (45 checks).
- Application behaviour is tested offline against JS models of the SQL functions: `test-proposals-invoices.cjs` (37 checks). These prove the routes, authorization, money handling, notifications and PDFs; they do NOT prove the SQL, RLS, grants or triggers.
- Legacy suites adjusted for S6.4 (intended behaviour changes only): `test-portal-access` (invoice fixture uses a delivered status; approve/request-changes/viewed foreign-id 404s are proved in the S6.4 suite because they now run in database functions), `test-admin-operations` (dashboard overdue query also reads `due_date`), `test-admin-shell` (Invoices nav entry).
- Rollout order: see section 3 (production-only).
- PDF note: very long unbroken tokens are split by binary search (a linear search was quadratic and hung on a 16,000-character token).

## Release-gate corrections (post-review)

- **Payment terms are part of the immutable version.** `proposal_versions.payment_terms` (NOT NULL, default empty, max 2000). `send_proposal` writes it for every version; the legacy backfill takes it deterministically from `pricing.payment_terms` (legacy JSON preserved, no longer authoritative for delivered versions). The existing append-only trigger covers the column; `pricing` is frozen on the live row once sent. The client page, client PDF and admin view read it from the version; only an unsent draft preview reads the live fields.
- **Dashboard money is exact.** `summariseMoney` accumulates integer minor units (BigInt) per currency; floating point is used only to format the exact result. Amounts that are not exact two-decimal figures are counted as unreadable instead of being rounded in.
- **Verifier lifecycle.** One switch (`cfg.final_hardened`). Before script 05 the retained browser grants are INFO; in the final run they are FAIL.
