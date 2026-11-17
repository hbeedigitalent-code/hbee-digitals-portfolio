# S6.3 — Requests & Projects operational completion

Status: implemented on `feature/s6-requests-projects` (base `29d7bcc`). **SQL drafted, not executed.**

## 1. Evidence behind the model (what the repository proves and does not)

| Object | Proven from code | Not provable from the repo |
|---|---|---|
| `project_requests` | id, client_id, title, description, status (`'open'` written), project_id, response, created_at | real status values in production; whether a CHECK exists |
| `project_messages` | named in docs only. **No reader, no writer anywhere** (the Phase 18 audit said the same) | its columns, row count, policies |
| `messages` | the **contact-form inbox** (`name`, `email`, `budget`, `is_read`) — unrelated to threads | — |
| `project_milestones` | id, project_id, title, description, status, due_date (read only) | status CHECK |
| `project_deliverables` | id, project_id, title, description, version, uploaded_at, file_url (read only) | — |
| `project_files` | rows are inserted inside the `finalize_upload` RPC, which is **not in the repo**; `uploaded_by` exists | what `uploaded_by` contains |
| `admin_users` | `user_id`, `is_active` | any display-name column; uniqueness of `user_id` |

Run `scripts/requests-projects-00-preflight-readonly.sql` before the forward migration: it reports every one of the "not provable" items.

## 2. Decisions

**Thread model — new `thread_messages`, `project_messages` untouched.** `project_messages` is dead (no code path) and its structure is unverifiable, so extending it would mean altering a table of unknown shape. `thread_messages` carries `request_id` (FK, cascade), optional `project_id`, `client_id` (tenant scope), `author_role`, `is_internal`, per-side read timestamps and an idempotency key. A CHECK makes a client-authored internal note impossible. If the preflight shows `project_messages` is empty and shaped usefully, it can be dropped from the model later; nothing here depends on it.

**Legacy `project_requests.response` is kept.** Every public Admin reply also mirrors its text into `response`, so the old single-reply UI and any export keep working.

**Status model** — `open → in_review → answered → closed`, enforced in SQL (`post_request_message`, `set_request_status`), mirrored in `src/lib/requests/request-status.ts`. Legacy values map through `hbee_request_status()` (e.g. `resolved`→`closed`, unknown→`open`); no stored value is rewritten and no CHECK is added to `project_requests.status`.

| Event | Result |
|---|---|
| Admin public reply on open / in_review | → answered |
| Admin public reply on answered | stays answered |
| Client reply on answered | → open |
| Client reply on open / in_review | unchanged |
| Any public reply on closed | refused (409); Admin re-opens by status |
| Internal note | never changes status; allowed on any request |
| Client "mark resolved" | only answered → closed |
| Admin status change | any of the four |

**Atomic request creation** — `create_portal_request()` creates request + project + link + two activity events in one transaction. A duplicate project reference raises 23505 and rolls everything back; the route retries with a fresh reference. The Admin notification stays outside the transaction (a notification failure must never undo a client's request); it is idempotent on the request id.

**Activity** — `activity_events`, append-only (no UPDATE/DELETE grant, triggers refuse UPDATE/DELETE/TRUNCATE, no FKs so history survives deletion of what it describes). `visibility` is `client` | `internal`; every Portal read filters `visibility = 'client'` inside the database query.

**Team assignment** — `project_team_assignments` references `admin_users.user_id` (FK only when that column is provably unique). The public `team_members` CMS table is not an identity and is not used. **Clients see only a count**: no display-name column on `admin_users` is evidenced, and exposing emails is forbidden. Named delivery team for clients is deferred until preflight section G shows a safe name field.

**Files** — `project_files.uploaded_by_role` (`client`|`admin`), stamped by `finalize` from the verified binding. A client may delete only `'client'` rows; `'admin'` and NULL (unclassified) are refused (fail closed). Existing rows stay NULL until classified from preflight section F evidence in a separate reviewed statement — **until then clients cannot delete their older files**, which is a deliberate safe default.

**Deliverables** — added `status` (`draft|ready|delivered|revised`, default `ready` so existing rows stay visible) and `due_date`. Admin attaches a file from the client's existing `project_files` rows; the stored path becomes `file_url`, served only through the existing signed-URL route. Drafts are filtered in the query in the project detail, files list, dashboard and signed-URL route.

**Project edit** — name, description, status, progress, expected completion. `client_id` and `start_date` stay refused (ownership/creation date are not edited after the fact).

## 3. Security model

New tables are server-only: RLS on, **no policies**, all privileges revoked from PUBLIC/anon/authenticated, `service_role` only. Functions are `SECURITY DEFINER` with pinned `search_path`, `EXECUTE` for `service_role` only. Every Portal route derives the client from `resolvePortalClient`; every Admin route uses `requireActiveAdmin`. Child rows are addressed `(id = :child AND project_id = :project)`.

## 4. Rollout order (owner-controlled)

1. Run preflight (00); review.
2. Run forward (01) in a staging project first; run verify (03).
3. Deploy the code. (Code reads the new tables and columns; deploying it before the migration makes the thread/activity parts report "unavailable" but does not break existing pages — except `create_portal_request`, which does not exist until step 2, so request submission fails until then.)
4. Optional: classify `uploaded_by_role` for existing files.

## 5. Not done / deferred

Client-supplied attachments on thread messages (the column and RPC check exist; no UI or upload wiring), named delivery team for clients, Admin file deletion/management routes, email templates for new notification types (in-app notifications only), a real-Supabase walkthrough.

## 6. Production reconciliation (preflight 00 result)

Facts from the owner's run of `requests-projects-00-preflight-readonly.sql`; everything else is **unproven** until `requests-projects-00b-reconcile-readonly.sql` is run.

| Topic | Production fact | Consequence |
|---|---|---|
| `project_milestones.completed_at` | **already exists** | Forward no longer adds it (it would have aborted); asserted to be a date/time type; rollback no longer drops it. |
| `project_messages` | columns `message`, `sender_id`, `sender_role` NOT NULL, `attachment_url`, `project_id` nullable, `created_at`; **no `request_id`, `client_id`, internal flag or read state**; RLS on; `authenticated` holds SELECT; row count `-1` (never analysed = unknown) | Keep `thread_messages` (see below). |
| `project_requests` | 4 rows, all `open`; no CHECK constraint | Mapper covers every stored value; forward aborts on any value it cannot account for or any unexpected CHECK. |
| `project_files.uploaded_by` | `text`; all 25 rows match neither a `clients.user_id` nor an `admin_users.user_id` | It cannot classify history. `uploaded_by_role` stays NULL for existing rows (client cannot delete). |
| `project_milestones` | no rows (status histogram empty) | `sort_order` backfill is a no-op; no vocabulary to preserve; no CHECK. |
| `projects` | only `projects_status_check` (allows `Pending Review`, the operational statuses and `draft`/`published`); `anon` and `authenticated` hold SELECT | Portfolio and client rows share the table: client-only guards added (below). |
| `admin_users` | `user_id` is unique (`u`); columns id, user_id, email, role, is_active, created_at; **no display name** | FK on `user_id` is valid; no client-visible names; emails never exposed. |
| New names | all free | — |

### `project_messages` — keep `thread_messages`
Reuse would mean adding `request_id`, `client_id`, an internal flag and read state to a table that (a) has a free-text NOT NULL `sender_role` with unknown values, (b) stores a raw `attachment_url` (contrary to the signed-URL rule), (c) has a nullable `project_id`, so tenant ownership of existing rows is undetermined, and (d) is **browser-readable** (`authenticated` SELECT under unknown policies) — an internal-note flag there would depend on a policy nobody has verified. `thread_messages` is server-only. It stays; `project_messages` is untouched.

### `finalize_upload` — not replaced
Its definition is not in the repo and the preflight did not return it. Nothing here depends on guessing it: S6.3 does **not** replace it. `uploaded_by_role` is stamped by the finalize route after the RPC succeeds (best effort, only for `client_file`); a failed stamp leaves NULL, which is the safe direction. Replacing the RPC to stamp atomically is only worth doing after 00b section 1 shows its exact body, callers and ACL — then as an additive, defaulted parameter, with a rollback that restores the captured original verbatim.

### Historical file ownership
Not classified. The only deterministic source is `upload_sessions` (`result_file_id` ↔ session uploader), which 00b section 5 summarises per file; only rows with exactly one session whose uploader is unambiguously an admin or the file's client may ever be backfilled, in a separate reviewed statement. All others stay NULL.

### Projects vs public portfolio
Milestone, deliverable and team routes refuse any project with no `client_id` (409 `not_client_project`); name/description edits do the same. Status/progress editing keeps its S6.2 behaviour. The `projects` anon SELECT privilege is pre-existing and **not changed by S6.3**: confirm from 00b that its policy limits anon to published, client-less rows.

### Atomic request function
Requests link to projects through `project_requests.project_id`, and the live form already creates one `Pending Review` project per request. Production has 4 requests; 00b section 4 reports whether projects are shared by several requests or exist without a request. Until it says otherwise, S6.3 preserves the existing request → project behaviour exactly (same columns, same `Pending Review` status that the CHECK allows).

## 7. Final production reconciliation (00b result)

Authoritative facts: `project_messages` has **0 rows**; exactly one `public.finalize_upload(p_upload_id uuid, p_actor uuid) → jsonb` (SECURITY DEFINER, owner postgres, `search_path = public, pg_temp`, EXECUTE for postgres + service_role only) whose project-file branch does `v_uploaded_by := v_s.uploader_role` and inserts `uploaded_by`; `upload_sessions.uploader_role` is CHECKed to `admin`/`client`; 25 files, **19** with unambiguous client-session evidence, **6** with no session; 4 requests (3 linked to a same-client project, none shared, 2 client projects without a request); notifications have a unique partial index on `idempotency_key`, `recipient_scope` admin/client and **no CHECK on `type`**; milestones and deliverables are empty and `project_deliverables.file_url` is NOT NULL; look-alike tables are only `audit_reports` and `email_events` (not reusable); `admin_users.user_id` is UNIQUE.

| Decision | Result |
|---|---|
| `thread_messages` | Kept. `project_messages` stays untouched legacy. |
| File ownership | **Atomic.** `finalize_upload` is edited in place (two tokens: `uploaded_by_role` + `v_s.uploader_role` next to the existing `uploaded_by` / `v_uploaded_by`), derived from the live definition and proven to differ by nothing else. The original is saved in `public.s63_function_backups`; the rollback restores it verbatim **before** dropping the column. The application's post-RPC UPDATE is removed. |
| Historical files | 19 classified `client` (exactly one session, client role, matching client + login, no admin session). 6 stay NULL. `uploaded_by` (free text) is never used. Nothing is backfilled as `admin`. |
| Verifier | Judges **effective RLS** (policy applies × privilege held × not confined to admin / own rows / published client-less rows). Raw grants that RLS confines are INFO, not failures. |
| `projects_status_check` | Read and asserted (all 9 statuses this release writes), never replaced; the unexpected-CHECK guard does not scan `projects`. |
| Request → project | Preserved: one new `Pending Review` project per request, linked atomically. No uniqueness rule is added; independent client projects and the unlinked historical request stay valid. |
| Notifications | Compatible: one system, deterministic keys, no `type` CHECK to satisfy. |
| `activity_events` | Kept; subject ids are deliberately **not** foreign keys, so history survives deletion of the thing it describes. **Trade-off:** orphan ids are possible, and nothing cascades. |
| Deliverables | Because `file_url` is NOT NULL, **every deliverable requires a file or an https link**: create without one → 400, clearing → 400, the UI requires a file, and no placeholder URL is ever inserted. Drafts therefore also carry a file. |
| Team | `admin_users.user_id` FK; no display name; clients see only a count. |
