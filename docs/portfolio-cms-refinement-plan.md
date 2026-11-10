# Portfolio CMS refinement — preparation plan (Phase C v3)

Status: **PREPARATION ONLY.** No SQL has been executed against any real database, no feature
flag has been changed, no production data or Beautovia content has been modified, nothing has
been committed, pushed or deployed. Everything below is for owner review.

Evidence labels used throughout: **[repo]** read from this repository, **[live]** observed on the
public site, **[unverified]** not provable from here (needs the owner, the Supabase dashboard or a
staging database).

## 1. What changed in the repository (uncommitted)

| File | Change |
|---|---|
| `scripts/portfolio-creative-00-preflight.sql` | Read-only. Also reports any pre-existing video / classification / optional columns, parent row counts (counts only), and both portfolio buckets (`project-images`, `portfolio-images`). |
| `scripts/portfolio-creative-01-forward.sql` | **Revised to v3.** Adds typed video support to `portfolio_media`, controlled classification to `portfolio_items`, keeps the six-argument RPC signature. Safe on a clean database and on one where the earlier draft was applied. |
| `scripts/portfolio-creative-02-rollback.sql` | Access/application rollback unchanged; header now states precisely what is retained. |
| `scripts/portfolio-creative-03-verify.sql` | Read-only. New blocks for video columns, classification defaults/constraints, existing-row classification, RPC body/marker, optional columns. |
| `scripts/portfolio-creative-04-optional-forward.sql` | **New, optional, isolated:** `deliverables` list and `og_image_url`. Not required by anything else. |
| `scripts/portfolio-creative-05-staging-constraint-tests.sql` | **New, staging only:** opt-in guard, always ends in `ROLLBACK`. Exercises constraints, classification, RPC behaviour and role access. |
| `scripts/test-portfolio-sql-drafts.cjs` | **New, offline:** static assertions over the six SQL files. |
| `docs/portfolio-creative-phase-c.md` | One pointer paragraph to this plan. |

No application code (`src/`) was changed. The existing editor and public pages keep working unchanged
against the revised SQL (see 3.4).

## 2. Data model (v3)

### 2.1 `portfolio_media` (child; created by 01-forward, additive columns)

| Column | Purpose | Rule |
|---|---|---|
| `media_kind` | `image` or `video` | default `image`; CHECK |
| `image_url` (existing) | the image — **for a video it is the required poster** | NOT NULL, https or local `/path` |
| `alt_text` (existing) | describes the image — **for a video, the poster** | NOT NULL, non-blank, ≤ 300 chars (owner decision; a ceiling, not a target) |
| `title` | asset title | ≤ 160; **required for video** |
| `description` | short description | ≤ 600; **required for video** |
| `video_url` | video source (https file URL) | NULL for images; **required for video**; https only, no credentials/quotes/backslashes/whitespace, ≤ 2048 |
| `captions_url` | optional captions track (e.g. `.vtt`) | NULL or https, same safety rules |
| `transcript` | optional plain-text transcript | ≤ 20 000; empty for images |
| `caption`, `display_order`, `is_visible`, `fit_mode`, `width/height`, `asset_type` | unchanged | `is_visible` still defaults to **false** |

`asset_type` is deliberately **unchanged** (15 roles). A video uses whichever role fits
(`social-creative`, `campaign-graphic`, `other`, …) and `media_kind` says it is a video. That keeps the
existing TypeScript role list, presentation rules and preflight/verify checks valid.

Shape rule (one named CHECK, `portfolio_media_kind_shape`): an image may not carry `video_url`,
`captions_url` or a transcript; a video must have `video_url`, a non-blank title and a non-blank
description. Poster and poster alt text are required for **every** row by the pre-existing constraints.

### 2.2 `portfolio_items` (parent; additive columns)

| Column | Values | Default | Why |
|---|---|---|---|
| `engagement_type` | `client`, `studio_team` | **`studio_team`** | The default does not claim anything. Every existing row (including the hidden ones) becomes `studio_team`; nothing is Client work until an owner sets `client` deliberately. |
| `project_status` | `completed`, `ongoing` | `completed` | Public code shows a badge only for `ongoing`, so the default asserts nothing. |

Unknown values cannot be stored (named CHECK constraints; `NOT NULL`). The migration never writes
`'client'` to any row (asserted by `test-portfolio-sql-drafts.cjs`).

**Public rule (must ship with the code phase, covers a database without the migration):** a row is
Client work **only** if `row.engagement_type === 'client'` (exact string). `undefined`, `null`, any other
spelling → treated as `studio_team`: no "Client" row, no "Case study" wording.

### 2.3 Optional add-on (04-optional-forward, separate)

`deliverables text[]` (≤ 12 items, no NULL/blank, ≤ 2000 bytes joined; per-item ≤ 160 is an application rule
because CHECK cannot hold a subquery) and `og_image_url text` (https only, ≤ 2048). Both default empty/NULL,
neither is read by any current code, and the Phase B editor's allowlist does not write them. **Skip 04
entirely if either feature is not built.**

### 2.4 RPC `save_portfolio_creative`

Same signature `(text, jsonb, text[], bigint, boolean, boolean)`. Revision locking, conflict (`40001`),
atomic child save, explicit clear flags and ACL reset are unchanged. New asset keys are **optional**:
absent key on an existing asset keeps the stored value; absent on a new asset takes the column default.
An old client therefore neither fails nor wipes a video's fields.

## 3. Editor design — smallest changes (not implemented)

### 3.1 Classification (Basics section)
- Two selects: **Engagement** (`Client engagement` / `Studio or team project`) and **Status**
  (`Completed` / `Ongoing`). Helper text: "Only 'Client engagement' shows Client and Case study wording on the
  public page. Leave as Studio or team project if unsure."
- Allowlist change in `src/lib/admin/portfolio-editor.ts`: include the two fields in the save payload **only if
  the loaded row contains the key** (`'engagement_type' in row`). Before the migration, a payload containing an
  unknown column would make every save fail; this gating prevents that.
- Validation: enum membership; anything else rejected in the editor and by the database.
- **Owner decision — explicit status:** the database default (`completed`) exists only so existing rows stay valid. The editor must start a
  **new** project with *no* status selected and **refuse to publish** (set Active) until Engagement and Status are both chosen deliberately.
  Likewise a new project must not default to Client.

### 3.2 Creative media (`PortfolioCreativeMedia.tsx`, mounted only behind the flag)
- Per asset, add: **Type** (`Image` / `Video`), **Title**, **Description** (both optional for images behind a
  "More details" disclosure, required for video).
- For video, relabel the image block **"Poster image (required)"** with the existing uploader; add **Video URL**
  (required), **Captions URL**, **Transcript**. First release: **video by URL only** (no video uploader).
- Unchanged: ordering (move up/down), visibility checkbox, caption, alt text (required), fit mode, dimensions,
  remove, explicit clear flags, revision/conflict handling.
- `src/lib/portfolio-creative.ts`: extend `PortfolioMedia`, `validateCreativeMedia` (mirror the SQL rules and the
  length caps so errors appear in the editor, not as RPC failures), `readCreativeMedia`, `creativeSavePayload`.
- Alt text is always typed and reviewed by a person. No automatic alt generation. No keyword, canonical or hidden-text fields.

### 3.3 Public template (smallest change, no redesign; must follow the existing Hbee visual system)
- Label logic from a single helper: `isClient = engagement_type === 'client'`. Client row, "Case study" wording and
  the live-site "Client" framing appear only for `isClient`; otherwise "Studio project".
- "Ongoing" shown only when `project_status === 'ongoing'`.
- Evidence section renders typed assets with their alt/caption; a video asset renders a native `<video controls
  preload="none" playsInline poster=…>` with an optional `<track kind="captions">` and a `<details>` transcript.
  No autoplay.
- Visual refinement (spacing, type, media treatment) is a **separate** later pass, using the existing tokens, Manrope
  headings and Inter body.

### 3.4 Compatibility proof points
- Existing TypeScript sends no new keys → the RPC accepts it (omitted-key preservation, asserted statically; behaviour
  must be confirmed in staging with the 05 script).
- Existing public code reads `select('*')` and ignores new columns.
- `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` stays off until every gate below is passed.

## 4. Storage, uploads, hosting and access (reviewed, nothing altered)

### 4.1 Facts from the repository **[repo]**
- Browser uploads go straight to Supabase Storage with the admin's session (no server route):
  `supabase.storage.from('project-images').upload(…)`; PNG/JPEG/WebP/GIF/AVIF only, ≤ 5 MB, header must match the declared
  type, random filename, folder name validated, SVG rejected.
- Folders in use: `portfolio/`, `portfolio-before-after/` (current) and a legacy `portfolio-images/before-after/` bucket
  (Beautovia's two screenshots live there). Typed assets would use `portfolio/<id>/…`.
- Removing a reference or deleting a project never deletes the stored file (documented in the editor). Orphaned files
  accumulate; every file in a public bucket is reachable by URL regardless of the `is_visible` flag.
- `video_url` is a plain URL: no upload, no storage policy, no new bucket is needed for the first release.

### 4.2 Not verifiable from here **[unverified]**
Bucket public flag, `file_size_limit`, `allowed_mime_types`, and the `storage.objects` write policies (admin-only write?). The
read-only preflight reports them. Also unverified: plan quotas (storage size, egress, Vercel bandwidth) and whether Supabase
standard upload is suitable for large files (resumable upload is generally recommended for big files — check current docs).

### 4.3 Video-hosting options

| Option | Needs | Pros | Cons |
|---|---|---|---|
| **A. URL to an owner-managed host/CDN file** | Nothing in the repo or Supabase | No storage policy change; first release can ship soon | Owner manages files and CORS; captions on another origin need CORS headers |
| B. New dedicated public Supabase bucket (`mp4`/`webm`, size limit, admin-only write) | A storage policy/bucket change (separate approval) **and** an uploader | Single admin workflow | Policy surface grows; quota/egress cost; large-file upload UX needs work |
| C. YouTube/Vimeo embed | Iframe rendering, CSP and consent review | Free hosting, adaptive streaming | Third-party cookies/consent (GA is consent-gated), layout/brand control, extra privacy review |

**Recommendation:** Option A for the first real video; revisit B only when volume justifies it. C is deferred.

### 4.4 Public access and write permissions
- Public reads of typed assets: only `is_visible` rows of **active** parents (policy `portfolio_media_published`). Hidden asset
  metadata is not readable publicly; hidden does **not** make an already-public file private.
- Writes: active `admin_users` only (policy `*_admin`), RPC is `SECURITY INVOKER` with an explicit active-admin check first.
- The migration changes **no** storage policy and touches no `storage.*` object (asserted by the static test).

## 5. Beautovia Essence content update plan (NOT applied)

Principle: publish only what is **owner-confirmed**, **stored** earlier, or **visible in the screenshots**. Do not name the earlier
business name. No sales, revenue, ROAS, conversion or other performance claim. The "before" screenshot is an **early theme draft
(Shopify theme editor, default theme)**; it is **not** presented as a previously live storefront.

### 5.1 Fields that can be updated today in the existing admin

| Field | Proposed value | Basis |
|---|---|---|
| Project title | `Beautovia Essence Brand Identity and Shopify Store` | approved |
| SEO title | `Beautovia Essence Brand Identity & Shopify Store` | approved |
| Short description | `An ongoing partnership: Hbee created the Beautovia Essence name, logo and brand identity, built its Shopify store experience and now supports its marketing.` | approved, owner-confirmed facts |
| SEO description | `How Hbee Digitals created the Beautovia Essence name, logo and brand identity, built its Shopify store experience and continues to support its growth.` | approved |
| Project type | `Brand Identity, E-commerce Experience & Growth Marketing` | approved |
| Category / Industry | `Beauty` / `Beauty & Personal Care` | unchanged |
| Technologies used | `Shopify` | only confirmed technology |
| Metric value / label | clear both | unsupported "100% / Brand Experience Upgrade" (not rendered today) |
| Legacy results | clear | contains "increase engagement and improve conversion potential" |
| Website URL | leave blank until the client consents and the live domain is verified | consent |

### 5.2 Story fields — draft wording (owner to edit; every sentence is supported or flagged)

**Project context / brief** (starting point):
> Beautovia Essence is a beauty and wellness e-commerce brand selling beauty tools, wellness products and skincare for self-care
> routines. The business began with a generic identity. Hbee Digitals helped shape the Beautovia Essence name and brand, then built
> its Shopify store around it. The first image in the Evidence section shows an early storefront in a default theme draft; it is not a
> previously published version of the store.

**Owner decision on wording:** describe the "before" screenshot as *an early Shopify/theme draft during the Hbee engagement* — e.g. replace the
last sentence with "The first image in the Evidence section shows an early Shopify theme draft from the start of the engagement." Never as a
previously live pre-Hbee website.

Supported by: stored brief (what the brand sells), owner-confirmed history (generic identity, naming), before-screenshot (default theme
draft in the theme editor).

**Challenge:** leave empty (the homepage card then uses the first 170 characters of the brief).

**Solution** (what was delivered), three short paragraphs:
> **Brand.** Hbee developed the Beautovia Essence name, logo, brand concept and visual identity.
> **Store.** Hbee worked on the Shopify storefront experience, including a customised homepage, header and announcement bar, and
> product presentation.
> **Ongoing.** The engagement continues beyond the initial build. Hbee currently supports the brand's marketing, including Meta advertising.

Supported by: owner confirmations; the "after" screenshot (custom hero, logo, announcement bar, navigation, benefit icons); stored text
for product presentation. **Add only if the owner reconfirms:** simplified navigation, mobile layout work, trust/value messaging, any
custom theme or Liquid work. Story fields are plain text; paragraph breaks may collapse — check on a preview.

**Public results summary** (no digits — digits are suppressed):
> The Beautovia Essence brand identity and Shopify storefront foundation are in place, and the engagement is ongoing.

### 5.3 Evidence images
- Keep the current before/after pair for now; the starting-point text states what the early image is. **Decision D3** (below) covers
  replacing it with captioned typed assets once the flag is on.
- Recommended future captions (typed assets): early → "Early storefront in the default theme (theme-editor draft view)"; current →
  "Customised storefront homepage (theme-editor view)". Alt text as in the C1.7 report.
- The "after" capture has the navigation overlapping the hero headline. **Owner decision:** the pair may stay temporarily; replace the After
  screenshot later, and migrate the pair into captioned typed assets once available.
- The cover graphic contains baked-in text "Shopify Store Transformation" and the tagline "redefine everyday beauty" while the store logo
  tagline reads "radiate everyday beauty". Decide whether to regenerate the cover and align the tagline.
- Cover photography provenance (photographed, stock or generated) and usage rights: owner to confirm.

### 5.4 Classification (only after the migration **and** code ship)
`engagement_type = client`, `project_status = ongoing`.

### 5.5 Owner confirmations required before applying
1. The sequence: was the store built new on the new identity, or restyled from an earlier store? (decides "built" vs "redesigned").
2. Which of: navigation, mobile layout, product presentation, trust elements, custom theme/Liquid work, can be stated.
3. Client permission to name the brand, mention marketing and Meta advertising publicly, show the screenshots, and (optionally) link the live site.
4. Cover image decisions (text, tagline, provenance).
5. Whether the earlier business name may ever be mentioned (default: never).

## 6. Risk register

| ID | Risk | L | I | Mitigation |
|---|---|---|---|---|
| R1 | SQL has not run on any PostgreSQL engine; only parsed | H | H | Staging gate + `05` tests; verification file; no production run before they pass |
| R2 | A migration/lock on `portfolio_items` (small table) blocks admin saves briefly | L | L | Run off-hours; metadata-only constant defaults (no rewrite) |
| R3 | Unknown engagement type shown as Client | L | H | DB CHECK + safe default + exact-match public rule + tests |
| R4 | Existing rows wrongly default to `studio_team` (e.g. Beautovia loses Client wording after code ships) | M | M | Owner sets Beautovia to `client` in the same release window; acceptance criterion |
| R5 | Editor writes new columns before migration → every save fails | M | H | Payload gating on key presence; flag-off default |
| R6 | Old client overwrites video fields | L | M | Omitted-key preservation in RPC; staging test |
| R7 | Large/unsuitable video files exhaust storage/egress/bandwidth | M | M | Option A hosting; no uploader in v1; verify quotas |
| R8 | Captions on another origin blocked by CORS | M | L | Same-origin or CORS-enabled host; acceptance test |
| R9 | Public bucket exposes "hidden" files by URL | H (by design) | M | Documented; never upload private material |
| R10 | Orphaned files accumulate (no delete path) | H | L | Documented; optional later cleanup tool |
| R11 | Before/after labels imply an unconfirmed "before" | M | M | Starting-point text; D3 decision; captions after flag |
| R12 | Unsupported claims enter the Beautovia story | M | H | §5 supported-claims table; owner sign-off; digit suppression stays |
| R13 | Enabling the flag before the tables exist breaks admin load | L | M | Gate order; flag change only after verification |
| R14 | Memory-limited dev machine cannot build/run engines locally | H | L | Preview deploys; staging DB runs the tests |
| R15 | Third-party/embedded video privacy | L | M | Embeds out of scope (Option C deferred) |

## 7. Migration checklist (owner-controlled; nothing here is done)

1. [ ] Approve this plan and decisions D1–D8.
2. [ ] Export/snapshot `portfolio_items` rows and policies (backup).
3. [ ] Run **00-preflight** read-only on production; review: PK type, gallery type, existing objects/columns, RLS, grants, buckets.
4. [ ] **Prerequisite:** a separate staging Supabase project/branch/database with the same schema (none exists today); confirm by hostname that it is not the production project.
5. [ ] Staging: run **01-forward**; run **03-verify**; run **05-staging tests** (with the opt-in setting); review output.
6. [ ] Staging: re-run **01-forward** (idempotency) and exercise **02-rollback** then re-apply.
7. [ ] **04-optional is deferred** and not part of this path; revisit only after the minimum release.
8. [ ] Code phase on a QA branch; Vercel preview with the flag **on** against staging data; acceptance criteria (§9).
9. [ ] Production: run **01-forward** → **03-verify**; (optional 04) → verify.
10. [ ] Set `engagement_type='client'`, `project_status='ongoing'` on Beautovia (admin).
11. [ ] Enable the flag in an owner-controlled deployment; re-verify.
12. [ ] Rollback path: disable flag + redeploy → run **02-rollback**.

## 8. Test plan

- **Done now (offline):** `node scripts/test-portfolio-sql-drafts.cjs` (static SQL contract); `node scripts/test-portfolio-admin.cjs` (existing regression, still passing); SQL parsed with the real PostgreSQL parser (`libpg-query`) — all six files and both PL/pgSQL functions parse.
- **Staging (database):** `05-staging-constraint-tests.sql` — 14 media rejections, 5 classification rejections, safe default, admin RPC (old and new payload, omitted-key preservation, stale conflict, invalid video), non-admin refusal, anon isolation.
- **Code phase (unit):** video/poster/alt validators mirror SQL; editor payload omits classification when the key is absent; label helper (`'client'` only; `undefined`/`'Client'`/`'partner'` → studio); WorkDetail renders video with poster/captions/transcript and escapes text; flag-off regression.
- **Manual/preview:** §9.

## 9. Preview acceptance criteria

1. Flag off: every public Work page and the admin render exactly as today.
2. Flag on (staging data): image and video assets render with the stored alt/caption; hidden assets absent; order respected.
3. A video shows its poster, plays only on user action (no autoplay), captions load, transcript expands; keyboard and screen-reader usable.
4. A row with `engagement_type` unset/unknown shows **no** Client row and **no** Case study wording; `client` shows them; `ongoing` shows the badge.
5. Beautovia (set to client/ongoing) reads truthfully per §5; no performance claims; early image described as a draft.
6. Mobile (≈375 px) and desktop layouts follow the Hbee system; no horizontal scroll; media keeps its aspect ratio.
7. Social metadata unchanged (canonical, title, description); if 04 shipped, OG override used only when set.
8. Typecheck, relevant tests and the Vercel preview build pass.

## 10. Approval gates

| Gate | Needs owner approval for |
|---|---|
| G0 | This plan and unresolved decisions |
| G1 | Running read-only preflight on production |
| G2 | Provisioning/using a staging database |
| G3 | Applying SQL to staging |
| G4 | Starting the code phase (QA branch) |
| G5 | Pushing the QA branch for a preview |
| G6 | Applying SQL to production |
| G7 | Enabling the flag / editing Beautovia content / promoting to `main` |

## 11. Owner decisions (recorded) and what is still open

Recorded decisions (applied to the drafts and this plan):
- **Video, first release:** HTTPS URL to an owner-managed/external host. The poster/thumbnail uses the existing image-upload flow. Direct video-file upload to Supabase is **deferred** until quotas, file-size limits and delivery are deliberately reviewed. The model still supports real UGC/video projects.
- **File 04 (deliverables, social-image override):** **deferred**; not part of the minimum migration path; kept as a documented later enhancement.
- **Beautovia "before" image:** an early Shopify/theme draft during the Hbee engagement, never a previously live pre-Hbee site. The pair may stay temporarily; replace the After image later; migrate into captioned media later.
- **Classification:** `engagement_type` (`client` / `studio_team`), existing rows never become `client` automatically; `project_status` (`completed` / `ongoing`) with `completed` as a safe backwards-compatible default only. The future editor must require an explicit status (and engagement) before publish. Beautovia becomes `client` + `ongoing` explicitly, later.
- **Storage ceilings:** title 160, description 600, caption 1000, alt text **300**, transcript 20 000 (ceilings, not writing targets).
- **Staging:** production is never staging. No migration touches production until a separate staging database exists (see report section K).
- **Public labels:** no change while Beautovia is the only visible project. When `studio_team` work is published, the collection framing becomes neutral (e.g. "Selected Work"); client items may use "Client work" / "Case study"; studio items never inherit client wording.
- **SQL parser tooling:** the repository test needs **no** new dependency (Node built-ins only). The PostgreSQL parser (`libpg-query`) lived only in a scratch folder outside the repo. Recommendation: **do not add it**; staging execution is the authoritative validation.
- **Selected Brands:** unchanged and deferred.

Still open: (a) which staging mechanism (separate Supabase project vs branch vs restored copy) and its cost/plan limits; (b) the five Beautovia publication confirmations in section 5.5 (store sequence, which store work can be stated, client permission, cover provenance/text, earlier business name never used); (c) editor wording for the status/engagement selects; (d) the final neutral collection label when studio work is published.

## 12. Verification commands (eventual; use environment variables for connection strings, never paste secrets)

```powershell
# offline
node scripts/test-portfolio-sql-drafts.cjs
node scripts/test-portfolio-admin.cjs
npx tsc --noEmit --incremental false

# production — READ ONLY, after G1
psql "$env:PROD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-00-preflight.sql

# staging — after G2/G3
psql "$env:STAGING_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-01-forward.sql
psql "$env:STAGING_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-03-verify.sql
psql "$env:STAGING_DB_URL" -v ON_ERROR_STOP=1 -c "set hbee.allow_staging_tests = 'yes'" -f scripts/portfolio-creative-05-staging-constraint-tests.sql
psql "$env:STAGING_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-04-optional-forward.sql   # only if approved
psql "$env:STAGING_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-02-rollback.sql           # rehearsal

# production — only after G6
psql "$env:PROD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-01-forward.sql
psql "$env:PROD_DB_URL" -v ON_ERROR_STOP=1 -f scripts/portfolio-creative-03-verify.sql
```
Expected: preflight/verify report no `BLOCKER`/`MISSING`; the staging script ends with no `FAIL:` exception; verify shows every existing parent as
`studio_team` / `completed` and `invalid_*_rows = 0`.
