# C1.8 — Portfolio CMS application: public experience first

Status: implemented locally, uncommitted, **not deployed**. Database work is frozen at the validated staging checkpoint (no SQL/migrations in this phase).
`NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` stays **unset/false** by default; nothing here changes that.

## 1. Flag contract

| Flag | `/work`, `/work/[slug]` | Admin portfolio editor |
|---|---|---|
| OFF (default) | Identical to production behaviour: same queries (`portfolio_items` only), same markup, "Case studies" eyebrow, no classification wording | Existing editor; creative section shows the rollout notice |
| ON (staging only) | Classification, capabilities, typed media (image + video), platforms, next project | Adds "Engagement & status" and video fields in the creative editor |

Defence in depth: only the exact string `engagement_type = 'client'` ever produces client wording; any other value (missing column, wrong case, null) reads as **Studio work**. Only the exact string `project_status = 'ongoing'` reads as ongoing.

## 2. One flexible template

No separate templates. `WorkDetailPage` renders optional modules only when data exists:
hero + context tags → context / challenge → work + capabilities + at-a-glance (engagement, status, platforms) → video → media evidence → outcome (or **Progress so far** when ongoing) → next project → CTA.

- Studio work never says "Client" (no client name line, glance label "Project", tag "Studio work").
- Ongoing work says "The work so far / What is being built / Progress so far" — never "Outcome" or "What was delivered".
- Videos: native `<video controls preload="none" poster>` for direct `.mp4/.webm/.m4v/.mov/.ogv` HTTPS files, with captions track and transcript when stored; hosted-player pages (YouTube/Vimeo etc.) are linked externally, never iframed. No autoplay, no uploads.
- Hidden media is excluded by query (`is_visible = true`), RLS, and again in the mapper. Order = `display_order`, then id.
- Listing: cards show an engagement tag (plus an **Ongoing** chip only for ongoing), category/type, and at most two capability names. Category filtering/history behaviour is unchanged. Cover falls back to the first visible typed media only when the parent has no image.

## 3. Admin (minimal, portal-inspired direction)

Only what is required to author the new fields:
- `PortfolioClassification` — radio cards with plain-language consequences; saves **only** `engagement_type` and `project_status`; safe defaults; visible save/validation states.
- Creative media editor — media kind, title, description, video URL, captions URL, transcript; client validation mirrors the database constraints; the existing revision-conflict (40001) handling is untouched.
Unrelated admin routes are untouched.

## 4. Deferred: Admin UX phase (document only)

A later phase will redesign, using the Client Portal as the reference ("Connected Growth in Practice"): admin dashboard home; main navigation/sidebar; page shell; cards and metrics; tables/list pages; forms/editors; loading/skeleton states; empty states; success/error notifications; mobile admin; and the admin authentication screen.
The future Admin Login should visually align with the Client Portal authentication experience. **There will be no public Admin Sign Up**: admin access stays provisioned/restricted unless a separate invitation/provisioning architecture is explicitly approved.

## 5. Next public task: Homepage Hbee brand modules

Not started, no speculative changes made. A refinement pass (not an identity redesign) on the homepage module/card system: composition, internal spacing, balance, hierarchy, geometry, visual density, relationship between icon/graphic, heading and copy, desktop rhythm, mobile simplification, and consistency with the 12-part Hbee visual system (logo-derived geometry, colour, typography, grid/spacing, module anatomy, surfaces, controls, cards, imagery, motion grammar, 3D/Spline rules, mobile simplification). Logo/wordmark unchanged.

## 6. Not built (no structured data yet)

Testimonial and Process modules: no attributed testimonial or process fields exist in `portfolio_items`; inventing them would fabricate content. Add once fields are approved.

## 7. Manual staging verification

Local `.env` pointing at the staging project with `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED=true`, then check `/work` and each seeded `/work/<slug>` (client vs studio, ongoing vs completed, the seeded video, hidden asset absent). Then unset the flag and confirm legacy output.

---

# C1.8.1 - Work vs Case Studies

## Hierarchy
```text
/work                    broad portfolio library (Standard Work + Case Study cards)
/work/[slug]             lightweight project detail - Standard Work only
/case-studies            selected deep engagements only
/case-studies/[slug]     rich editorial Case Study (canonical for a Case Study)
```
`is_case_study` is independent of `engagement_type`: client + Standard Work, client + Case Study and studio_team + Standard Work (or Case Study, still worded as Studio work) are all valid. Nothing is auto-promoted.

## Schema (isolated, NOT executed)
`scripts/portfolio-case-study-01-forward.sql` (one additive column, default false, no backfill/grants/policies), `-02-rollback.sql` (drops only that column, only if it carries the v1 marker), `-03-verify.sql` (read-only, one JSON cell, checks anon/authenticated column privileges). The validated creative migration was not touched.

## Fail-safe behaviour
Missing column => `is_case_study` reads undefined => Standard Work. Flag off => `/case-studies` and `/case-studies/[slug]` return 404, `/work/[slug]` never redirects, sitemap unchanged. A Case Study visited under `/work/[slug]` redirects (307, deliberately temporary so demoting it later is safe) to `/case-studies/[slug]`; a non-Case-Study under `/case-studies/[slug]` redirects to `/work/[slug]`.

## Case Study template modules (each only when data exists)
Hero + tags -> context -> challenge -> work + capabilities + at-a-glance (+platforms) -> media sequenced by asset type (brand identity / website and storefront / creative and campaign / presentation / more) -> video -> outcome or Progress so far -> related projects -> CTA. The editor's `display_order` decides which group comes first and the order inside it. Mockups sit under "Presentation" with the note that they are not performance results. No objectives, role, process or testimonial modules exist because the data model has no such fields; they are not invented.

## Homepage (future, not built)
"Selected Case Studies" can use the existing `featured` flag: `selectFeaturedCaseStudies(items, limit)` returns only Case Studies that are also featured. Paths: "Explore Case Studies" -> `/case-studies`, "Explore all Work" -> `/work`.

## Visual review (local mock data, no Supabase)
Headless Chrome against a local fixture server at ~1280, 820 and 500px: `/work`, `/case-studies`, a Case Study with web + mockup + video, a studio ongoing Case Study, a Standard Work page. Admin screens need a signed-in admin and were not screenshotted: see the owner checklist in the C1.8.1 report.

---

# C1.8.2 - Completion and polish

## Case Study concept -> existing field (no migration)
| Concept | Existing field | Status |
|---|---|---|
| Brief / context | `brief`, older `overview` | usable (`overview` is the creative-mode fallback) |
| Challenge, approach, results | `challenge`, `solution`, `results_summary`/`results` | usable (already wired; numeric results stay suppressed) |
| Process | `process` (jsonb) | needs adaptation: parsed defensively (strings, or objects with title/name + description/text); no admin editor yet |
| Services / role | `services` (jsonb) | needs adaptation: shown as "Services" in the at-a-glance box, Case Study only |
| Platforms | `technologies_used`, then `technologies`, then `technology` | usable (fallback chain) |
| Testimonial | `testimonial` (text) | needs adaptation: client Case Studies only, plain quote, never an invented attribution; JSON `{quote, author, role}` is honoured |
| Objectives | none | genuinely missing (`metrics`/`result_metrics` are figures, not objectives) |
| Hbee's role (distinct from services) | none | not separate from `services` |
| Long-form body | `case_study_content` (text) | present but format unverified (HTML? markdown?) - NOT rendered |

## Read-only check an owner can run on staging or production (never executed by the author)
```sql
select count(*) filter (where nullif(btrim(testimonial), '') is not null) as testimonial_rows,
       count(*) filter (where jsonb_typeof(process) = 'array' and jsonb_array_length(process) > 0) as process_rows,
       count(*) filter (where jsonb_typeof(services) = 'array' and jsonb_array_length(services) > 0) as services_rows,
       count(*) filter (where nullif(btrim(case_study_content), '') is not null) as case_study_content_rows,
       count(*) filter (where nullif(btrim(overview), '') is not null) as overview_rows
from public.portfolio_items;
```

## Media framing
Explicit `fit_mode` always wins. Auto: only a KNOWN landscape website/storefront screenshot fills its frame; portrait or tall screenshots, mockups, brand applications and unknown sizes are contained. The frame follows the real aspect ratio; very tall images are height-capped (88vh) so they stay fully visible.

## Dimension detection (admin)
On upload, replacement upload and URL blur the editor reads the image's natural size client-side and fills width/height when both are empty (or were auto-detected). Manual values are never overwritten except by pressing "Detect size for asset N". "Detect missing image sizes" fills legacy assets in one click. Failure never blocks upload or save.
