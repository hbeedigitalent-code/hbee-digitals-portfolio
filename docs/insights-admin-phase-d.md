# Phase D: Insights / admin parity

The public source remains `blog_posts`. Public topics come from `tags`; the
disconnected `blog_categories` screen is marked legacy and removed from primary
navigation. Its records and CRUD route remain available. Stored `featured_badge`,
`cta_text`, and `cta_link` values are preserved; active editors no longer expose or
write these unused fields.

## Routes and filters

Public links and same-site canonical hints use `/insights`. Admin editing stays
under `/admin/blog`; existing `/blog` redirects are unchanged. Valid external
canonicals remain supported. Public filters initialize from `topic` (also accepting
legacy `category` and `tag`), coexist with `q`, and respond to Back/Forward. Unknown
topics fall back to all topics. Topic selections push browser history; typing
search replaces the current entry. Existing mobile controls and styles remain.

## Publication and metadata

Both list and editor use `writeInsightPost`. New drafts have no publication date;
first publication sets an absent date with a conditional database update. Ordinary
edits, unpublishing, and republishing preserve that date, including a date set
after an editor was opened. Failed and zero-row writes surface errors. Date labels
include the year and UTC to avoid timezone ambiguity.

Reading time uses the existing shared estimator at 200 words per minute, with a
minimum of one minute. Valid positive whole-minute stored values win. Public
detail fallback retains its existing minimum body-length threshold; list queries
do not fetch article bodies to estimate missing values. Author remains plain text.
Image URL, the existing `blog-images` upload, and editable alt text remain; saves
retain the existing legacy `alt_text` compatibility field. SEO/OG controls retain
their values and allow existing public fallbacks when blank.

## Safe preview

The editor requests a snapshot from `/api/admin/insights/preview`. The route uses
the existing session, two-factor, and active-admin guard before processing input;
it returns private, uncached results and bounds request size. It calls the existing
public `toInsightDetail` sanitizer and heading pipeline on supplied editor values.
It does not read or write articles. The shared public article-body component
renders only this sanitized HTML. The panel also shows title, excerpt, image,
author, reading time, and publication information. Changes require refreshing the
snapshot. This is a body preview, not an embedded full public page or a second CMS.

## Deliberate deferrals and verification limits

- No manual publication-date editing or scheduler: status currently controls
  visibility, and a future date would not safely schedule publication.
- The listing limit remains 60 and related candidate limit remains 40. Repository
  inspection does not establish live volume; no production query was run. Safe
  capacity for current production volume is therefore unproven. Pagination awaits
  volume evidence and an approved scope.
- No schema, SQL, migration, storage-policy, portfolio, Client Portal, email,
  testimonials, or trusted-brand changes.
- `scripts/test-insights-admin.cjs` exercises the actual helpers, components, and
  preview handler with in-memory database/auth/browser mocks and the real public
  sanitizer. It covers routes/redirects, filters/history, publication transitions,
  concurrency/date preservation, reading time, legacy field preservation, image
  alt, SEO/canonical mapping, draft exclusion, related articles, preview access
  denial and sanitization. It does not validate live auth, RLS, uploads, production
  content volume, or browser layout. No production email or data mutation occurs.
- Focused tests, the existing portfolio admin regression script, and TypeScript
  checks passed. Build was skipped because the host had about 641 MiB free RAM
  out of 3.8 GiB at the resource check. Public visual stability has not been
  verified in a real browser or production during this phase.

No files have been staged or committed; no push or deployment was performed.
