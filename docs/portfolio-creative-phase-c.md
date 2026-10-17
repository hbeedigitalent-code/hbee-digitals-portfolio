# Phase C: creative media and explicit capability attribution

Status: implementation and SQL artifacts prepared for owner review. No SQL executed.
`NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` is absent/false by default. Do not enable
it until the rollout below is approved and verified. This is a public feature
flag, not a credential. Changing it requires an owner-controlled build/deployment.

## Evidence before design

- `docs/DATABASE.md` explicitly calls its inventory source-derived and says
  columns/types/policies are unverified. It is not a live-schema export.
- No checked-in DDL, generated database types, audit output or migration proves
  the PostgreSQL type of `portfolio_items.gallery_images`. Whether it is `text[]`,
  `json`, `jsonb` or another type remains UNPROVEN. We did not query the database.
- `src/lib/admin/portfolio-editor.ts` accepts string arrays (or JSON-encoded
  string arrays) and saves a string array. `src/lib/site/work-data.ts` likewise
  accepts arrays/JSON strings and consumes string URLs. This proves application
  expectations, not the SQL column type.
- The legacy main-image chain is `image_url` -> `featured_image` -> `after_image`.
  The genuine before/after pair, gallery de-duplication, slugs, SEO and featured
  ordering are implemented in `work-data.ts`. They are retained.
- No existing portfolio media table, capability relation, category table, image
  metadata model or dormant creative migration was found in repository evidence.
  Absence in the live database is NOT established.
- `ImageUpload.tsx` targets the existing `project-images` bucket and calls
  `getPublicUrl`; current paths are `portfolio/` and `portfolio-before-after/`.
  This proves intended public URL use, not the bucket's live public flag or ACLs.
- `docs/ARCHITECTURE.md` identifies active `admin_users` membership as the admin
  role source. Repository security audits explicitly leave marketing-table and
  storage RLS/grants unverified. Middleware is not a substitute for database RLS.

## Decision

Use additive child tables `portfolio_media` and `portfolio_capabilities` attached
to the existing portfolio engagement, plus a `creative_revision bigint NOT NULL
DEFAULT 0` metadata column on the parent. Do not change or remove `gallery_images`.
The migration derives the parent's ID type from `pg_attribute`/`format_type`,
rather than guessing UUID vs bigint vs text. Existing objects without this
migration's marker cause an exception, requiring reconciliation before rollout.

Structured JSON inside `gallery_images` is rejected because its SQL type is
unknown and current readers/editors require URL strings. Another parent JSON
column or capability array would inherit row-level public exposure: a hidden
asset's metadata would be readable with its published parent. Child tables give
per-asset RLS, individual metadata, FK integrity, order indexes and stable IDs
without rewriting existing rows or duplicating the portfolio system.

Asset types (stable stored values, human labels): logo, alternate-logo,
identity-system, colour-palette, typography, stationery, flyer, social-creative,
campaign-graphic, mockup, brand-application, packaging, website, storefront, other.
Industry and project/engagement label remain free-text parent fields; category
remains the existing public grouping. Capability assignments are explicit and
many-to-many, restricted to the six approved service slugs by SQL constraints
and application validation. Nothing is inferred from technologies or category.

## Artifacts and permissions

1. `scripts/portfolio-creative-00-preflight.sql`: read-only column/type/default,
   constraint, RLS, grants, policy and bucket inspection. No row contents or keys.
2. `scripts/portfolio-creative-01-forward.sql`: transactional additive tables,
   FKs, indexes, checks, RLS, revision column/triggers and atomic child-save RPC.
   Existing parent business/gallery fields are untouched. Requires parent RLS enabled; review the actual
   policies and grants before running. Do not assume enabled means safe.
3. `scripts/portfolio-creative-02-rollback.sql`: APPLICATION / ACCESS ROLLBACK. Disable application flag first,
   then revoke new browser/API privileges. Keeps all new metadata and every
   legacy row and the revision column; no destructive DROP or data loss. Forward restores these grants
   after review if reactivation is needed.
4. `scripts/portfolio-creative-03-verify.sql`: read-only post-change inspection
   plus staging session-test instructions. Preflight/verification include exact
   PK/domain/base/typmod evidence, raw/column/default ACLs including PUBLIC,
   effective browser-role privileges, indexes, triggers, function owner/body/
   security/path/ACL and explicit BLOCKER assessments. It is not proof that RLS works.

Anon and ordinary authenticated readers may see visible media only for active
parents, and capability assignments only for active parents. Active admins can
manage the children. The RPC is SECURITY INVOKER with a pinned search_path,
explicit active-admin check FIRST, per-parent lock and cross-engagement ID protection.
Signature: `save_portfolio_creative(text,jsonb,text[],bigint,boolean,boolean) RETURNS text`.
The last three arguments are expected revision, clear_media and clear_capabilities.
Revisions are returned/transmitted as decimal strings to avoid JS bigint rounding.
Child media/removals and capability assignments save atomically. Parent Phase B
fields save separately; the admin UI explicitly labels the separate save action.
No new server credential is needed. service_role remains trusted-server-only,
with table access/RLS bypass; the admin RPC deliberately requires a user session.
No private project/client tables or private upload routes are used.

### Revision, replacement and upload failure safety

The former three-argument RPC had no snapshot version: a stale empty collection
could delete newer data. The revised contract locks the parent, compares the
expected revision, and rejects mismatches with SQLSTATE 40001 BEFORE replacement.
The editor retains dirty edits on conflict; users must reload/review and reapply,
not silently merge. Every successful RPC increments the parent counter at least
once. BEFORE row triggers on both child tables also increment it for direct
INSERT/UPDATE/DELETE, including both parents on reparenting. The version can jump
by several counts in one save; it is an opaque monotonic version, not a save count.
Parent cascade deletion keeps the child cascade behavior. Phase B excludes the
revision field from its save allowlist. Never manually reset the revision column.
Parent admin SELECT/UPDATE RLS and grants are required; these are not replaced.

Load reads the parent revision as text, loads both collections, then reads it
again. A mismatch or any failed/invalid response disables creative saving. This
prevents inconsistent cross-query snapshots. A commit after loading is caught
by the locked save check. No parent business fields are included in child saves.

Empty collections without explicit clear flags PRESERVE their saved collection.
Nonempty collections replace that collection. Clearing requires an explicit
boolean with an empty collection and the correct current revision. Bulk clear
buttons, removing the last asset, and unchecking the last capability record this
deliberate intent; a visible notice explains what will be removed on save. No
extra confirmation dialog is added for ordinary removal or reorder actions.

Pending uploads block creative save and expose upload counts. Upload controls
also refuse new work while saving. A synchronous mutation-version guard prevents
save completion from overwriting any later callback/edit: the returned server
revision is retained but newer local data stays dirty for another save. Upload
success followed by metadata failure leaves the URL/state retryable; storage
files are not automatically deleted.

### Function ownership and ACL expectations

The owner must approve the schema migration role before execution. New functions
are owned by that executing role; reruns reject existing creative functions owned
by another role or without the expected marker. Every explicit/default function
grant (including grant options and PUBLIC) is revoked from all non-owner grantees
across all matching overloads. Only the revised six-argument save RPC is granted
to authenticated, without grant option. The old three-argument overload, if it
exists, remains owner-only; it is not an accessible bypass. Trigger execution is
granted to authenticated/service_role; the trigger function is not a callable
PostgREST save RPC. Active-admin identity/RLS remain the security boundaries,
independent of the public feature flag. Verification flags unexpected direct or
effective EXECUTE privileges. Owner/superuser powers cannot be revoked by an ACL
reset; actual owners and role memberships must be checked before rollout.

## Compatibility and public presentation

With the flag off, no new-table queries or writes are made. The Phase B editor,
legacy galleries and safe capability empty state continue working. With it on,
valid visible typed assets take precedence over the legacy gallery array. If no
valid visible typed assets are available, reads fail, or tables are unavailable,
legacy rendering remains. Admin load failures disable creative saving rather
than replacing stored metadata with an empty array.

Main cover, featured-image fallback, before/after pair and SEO remain independent
of typed assets. Typed assets do not become project cards. The detail view uses
contained padded frames for logos/identity/palettes/typography/stationery; flyers
have a portrait default; optional dimensions set other ratios. Explicit cover
fit cannot crop logos. Public media is limited to 100 assets per engagement.
Captions/alt text are rendered through React text/attribute escaping, not HTML.

Only explicitly assigned published projects appear in capability Real work,
maximum three, featured first then display order. Failures/no assignments keep
the existing empty message and /work CTA. No technologies-based mapping exists.
Category query strings now select an actual returned category and support browser
Back/Forward. No new browsing taxonomy was introduced. The unsupported
`?type=concept` menu link now opens the overview; no concept classification is
fabricated. Unknown category query values safely show all projects.

A hidden typed asset is not a mechanism to unpublish a matching legacy URL.
Existing public gallery/cover references remain unchanged until edited by an
owner. Hiding metadata also cannot make a file in a public bucket private.

## Storage

No bucket or policy is created/changed. New typed uploads use
`portfolio/<engagement-id>/<timestamp>-<random-uuid>.<validated-extension>`.
Legacy uploader folders stay valid. Client validation permits PNG/JPEG/WebP/GIF/
AVIF up to 5MB, checks the header against the declared MIME, generates filenames
without the supplied extension/name, and rejects SVG uploads. Existing trusted
SVG URLs remain image references, never inline SVG markup. New SVG ingestion
requires a separately reviewed sanitizer or raster export. Client checks are UX
checks, not an authorization boundary or comprehensive malware scanner; direct
Storage API use must be restricted by actual bucket MIME/size settings and
admin-only write policies. Live policies/public status remain unverified.

## Owner-controlled rollout and remaining evidence

- Review preflight output WITHOUT executing mutation SQL. Establish the actual
  gallery type, parent primary key, existing/dormant objects, active-admin
  self-read policy, public published-only reads, admin-only parent writes, and
  bucket public/MIME/size/admin-write settings. Do not expose object names/keys.
- If policies are insufficient, prepare/review a separate narrowly scoped change.
  No storage or existing-parent policy changes are bundled here.
- Review forward/rollback; snapshot/export current portfolio data and policies.
- Apply artifacts in staging only after authorization. Test anon, non-admin,
  active-admin and server roles; valid/invalid RPCs, visibility, removal,
  concurrency, constraints, FK/cascade behavior and rollback/re-enable. Include
  stale full replacements, explicit clear flags, direct child-write revision
  invalidation, mixed-read load conflicts, late upload completion, failure/retry,
  exact owner/ACLs and rejection of the old RPC overload.
- Existing rows require NO backfill. Populate children only through deliberate
  owner curation. Do not auto-convert technologies/categories or gallery arrays.
- After staging validation and explicit production migration approval, owner
  applies the reviewed schema, verifies it, then enables the flag in the
  owner-controlled build/deployment. Keep it false while any prerequisite is
  unproven. Disable it first if reverting; revoke child access to retain data.

SQL files have only been statically reviewed here: PostgreSQL execution,
permissions, concurrency, storage access, live saves and production rendering
are not verified. No production mutation is authorized by this document.
