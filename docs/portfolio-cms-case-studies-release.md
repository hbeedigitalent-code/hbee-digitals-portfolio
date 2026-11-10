# Portfolio CMS + Case Studies - production release (Phase C2)

Branch `release/portfolio-cms-case-studies`, cut from production `main` = `ed954fbe1c8a6f7fe668e56fcf19a6e60e1fbc67`.
Nothing here has been run against production or Supabase. Nothing is pushed or deployed.

## 1. What this release is

The approved C1.7 / C1.8 / C1.8.1 / C1.8.2 Portfolio work, carried onto production `main` without disturbing the live homepage H1-H3,
the Admin shell, 2FA/security, middleware or the A4 RLS hardening.

Provenance: that work lived as **uncommitted changes** in the primary development worktree (on `feature/admin-workspace-a2`), on top
of code that `main` already contains (the gated creative-media architecture). The release copies only the Portfolio files; the
homepage files in that worktree are identical to production and were not touched.

Architecture preserved exactly:

| Route | Meaning |
|---|---|
| `/work` | broad portfolio library (all active projects) |
| `/work/[slug]` | Standard Work project; **redirects (307) to `/case-studies/[slug]`** when the project is a Case Study |
| `/case-studies` | selected deeper projects (404 while the flag is off) |
| `/case-studies/[slug]` | deeper editorial Case Study; **redirects (307) to `/work/[slug]`** when the project is not a Case Study |

Classification is explicit and independent: `is_case_study`, `engagement_type` (`client` / `studio_team`), `project_status`
(`completed` / `ongoing`). A Case Study is never inferred from engagement type. Mockups are first-class media through
`asset_type = 'mockup'`.

## 2. Schema change (additive, data-preserving)

`public.portfolio_items` (production shape from the earlier read-only discovery: 46 columns, `id uuid`, RLS on, anon SELECT,
authenticated SELECT/INSERT/UPDATE/DELETE, a public read policy for active rows and one admin policy) gains four columns, all with
constant defaults (metadata-only, no table rewrite, no row is updated):

| Column | Type | Default | Constraint |
|---|---|---|---|
| `creative_revision` | bigint not null | 0 | `>= 0` |
| `engagement_type` | text not null | `'studio_team'` | in (`client`, `studio_team`) |
| `project_status` | text not null | `'completed'` | in (`completed`, `ongoing`) |
| `is_case_study` | boolean not null | `false` | - |

Every existing project therefore becomes **Studio work, Completed, Standard Work**. Nothing is promoted to Client or Case Study.

New tables: `portfolio_media` (typed image/video assets; `asset_type`, `image_url`, `alt_text`, `caption`, `display_order`,
`is_visible` default false, `fit_mode`, `width`/`height`, video fields) and `portfolio_capabilities` (`portfolio_id`,
`capability_slug`, six approved slugs). Both cascade from `portfolio_items`. New functions: `save_portfolio_creative` (SECURITY
INVOKER, atomic save with revision conflict control) and `bump_portfolio_creative_revision` (trigger function).

`portfolio_items` policies and grants are **not changed**, and the forward proves it before COMMIT.

## 3. Legacy compatibility

No legacy column is renamed, merged or backfilled. The public layer keeps mapping `overview`/`brief`, `challenge`, `solution`,
`results`, `process`, `services`, `technologies`, `testimonial` and `gallery_images`. No `Objectives` field exists. With no rows in
`portfolio_media` / `portfolio_capabilities` the routes fall back to those fields and render no empty module. With the flag off the
public site is built from the legacy fields only and never reads the new tables or columns.

## 4. RLS design

Predicate (identical to the rest of the platform): `exists (select 1 from admin_users a where a.user_id = auth.uid() and a.is_active = true)`.

| Table | Policy | Command / roles | Rule |
|---|---|---|---|
| `portfolio_media` | `portfolio_media_published` | SELECT, anon + authenticated | `is_visible` and the parent is `is_active` |
| `portfolio_media` | `portfolio_media_admin` | ALL, authenticated | active admin (USING and WITH CHECK) |
| `portfolio_capabilities` | `portfolio_capabilities_published` | SELECT, anon + authenticated | parent is `is_active` |
| `portfolio_capabilities` | `portfolio_capabilities_admin` | ALL, authenticated | active admin (USING and WITH CHECK) |

Grants: `anon` SELECT only; `authenticated` SELECT/INSERT/UPDATE/DELETE (rows gated by the admin policy; an ordinary signed-in user
and an inactive admin can write nothing); nobody holds TRUNCATE, TRIGGER or REFERENCES; PUBLIC holds nothing; `service_role` is
unaffected. `save_portfolio_creative` is executable by `authenticated` only and re-checks the active admin itself.

Known, deliberately unchanged limit (same as the rest of the Admin): RLS cannot see the 2FA cookie, so an active admin's browser
session can write these tables directly without the second factor. Moving writes behind `requireActiveAdmin()` routes is the
already-documented follow-up for the whole Admin, not part of this release.

The global Admin RLS work is not reopened.

## 5. Feature flag `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED`

Read in exactly one place (`src/lib/portfolio-creative.ts`); only the exact string `true` enables it. It is not set by any tracked
file, so it is off unless it is set in Vercel. It is a `NEXT_PUBLIC_` variable: **its value is inlined at build time, so changing it
requires a redeploy.**

With the flag **off**: `/work`, `/work/[slug]` and the sitemap are built from legacy fields only; `/case-studies*` return 404;
no query touches `portfolio_media`, `portfolio_capabilities` or the new columns; the admin editor shows the legacy gallery and a note
instead of the creative sections. So the release code is safe to deploy **while the database still lacks the new tables**.

With the flag **on but the migration not applied**: reads fail and degrade (no media, no capabilities, no Case Studies, no crash), but
the public pages would start showing the default classification wording (Studio work / Completed) for every project, and the admin
editor would show load errors. That is why the flag is enabled last.

### Rollout sequence

1. Confirm in Vercel that the flag is **unset or not `true`** for Production (read only; do not change it).
2. Deploy this branch with the flag off. Smoke `/work`, one `/work/[slug]`, `/case-studies` (404), `/admin/portfolio`.
3. Run the read-only checks and send the output: `prod-portfolio-00-preflight-readonly.sql`, `prod-portfolio-01-data-readonly.sql`,
   `prod-portfolio-03-verify-readonly.sql` (the "before" picture: problems > 0 is expected here).
4. Only if `ready_for_forward` is true: run `prod-portfolio-02-forward-PRODUCTION.sql` (first line `set hbee.confirm_production = 'yes';`).
5. Run `prod-portfolio-03-verify-readonly.sql`: `problem_count` must be 0. Re-run the data check: row counts unchanged.
6. Smoke again with the flag still off (nothing visible should have changed).
7. Set `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED=true` in Vercel Production and redeploy.
8. In `/admin/portfolio/[id]` classify and curate deliberately; nothing is a Case Study until an editor chooses it.

## 6. Scripts (all in `scripts/`)

| File | Role |
|---|---|
| `prod-portfolio-00-preflight-readonly.sql` | read-only: every condition the forward enforces, as `blockers`; `ready_for_forward` |
| `prod-portfolio-01-data-readonly.sql` | read-only, counts only: row/published/slug/duplicate/skipped-row counts and constraint compatibility |
| `prod-portfolio-02-forward-PRODUCTION.sql` | guarded one-transaction forward (first apply only) |
| `prod-portfolio-03-verify-readonly.sql` | read-only target-state verifier (`problem_count`) |
| `prod-portfolio-04-access-rollback-PRODUCTION.sql` | non-destructive rollback: closes browser access, keeps all data |
| `prod-portfolio-05-empty-structural-rollback-PRODUCTION.sql` | drops the new objects, but only while nothing has been created |

The reviewed drafts they derive from (`portfolio-creative-00..03`, `portfolio-case-study-01..03`) remain for reference. The middle of
the forward is `portfolio-creative-01-forward.sql` unchanged; a static test keeps them in step. Staging scripts are not part of this
release.

## 7. Rollback and forward-fix

* **Before the flag is on, or at any time:** `prod-portfolio-04-access-rollback-PRODUCTION.sql` (after turning the flag off and
  redeploying). It destroys nothing: both tables, every row, the revision counter and the classification columns stay.
  The three `grant` statements that re-open access are listed in its header.
* **Structural rollback is only possible while nothing exists:** `prod-portfolio-05` aborts if either table has a row, or if any project
  has been classified, revised or marked as a Case Study. It needs a second confirmation (`hbee.confirm_irreversible`).
* **Once editors have created content, do not roll back structurally.** Dropping the tables or columns would destroy their work. Fix
  forward: correct the data with the admin editor or a reviewed forward SQL patch, and use the flag and the access rollback to
  withdraw exposure.
* Uploaded files in storage are never touched by any script here.

## 8. Assets

The release adds **no files under `public/`** and no storage change. Portfolio media is referenced by URL (HTTPS or a local `/path`)
that editors supply, normally from the existing `project-images` bucket. Natural dimensions are measured in the editor and stored with
the asset; alt text is required for every asset and for a video poster; ordering is `display_order`. Nothing is duplicated.
The preflight reports whether `project-images` exists and is public.

## 9. Tests

Static: `scripts/test-portfolio-prod-sql.cjs`, `scripts/test-portfolio-sql-drafts.cjs`. Behavioural (mocked data layer, no network):
`scripts/test-portfolio-admin.cjs` (Standard Work and Case Study rendering, canonical redirects in both directions, flag on/off,
legacy fallback, media ordering, capability mapping, classification, admin editor) and `scripts/test-technical-seo.cjs` (sitemap
lists a Case Study once, at its canonical URL, and only with the flag on).

## 10. Not proven

* The SQL has never run against production or Supabase. It was parsed with the PostgreSQL parser and exercised only in a throw-away
  in-memory PostgreSQL against a stub shaped like the production discovery. Real policy bodies, the real `admin_users` row set,
  real default privileges and Supabase's PostgREST layer were not seen.
* The live flag value in Vercel was not checked (no access); step 1 of the rollout asks the owner to confirm it.
* Nothing is verified in production or staging.
