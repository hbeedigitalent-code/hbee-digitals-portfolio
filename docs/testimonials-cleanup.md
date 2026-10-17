# Testimonials cleanup and trust proof audit

## Architecture found before implementation

This is a repository audit, not a production database inspection. No SQL or
production data reads/mutations were performed. Schema fields below are evidenced
by existing readers/writers; live constraints/defaults and provenance are unverified.

| Source/surface | Classification | Existing behavior |
| --- | --- | --- |
| `testimonials` via `/admin/testimonials` | ACTIVE, canonical text testimonials | Admin manages name, position, company, content, image URL, order and visibility. It defaults rating to five, exposes only ratings 3–5, ignores write errors and provides no preview. |
| `getHomepageProof` -> `HomeProof` on `src/app/(site)/page.tsx` | ACTIVE | Reads active `testimonials`, ascending `display_order`, candidate limit 12, returns up to two. Requires 40 characters, strips HTML/collapses whitespace, reads role/avatar legacy fallbacks. Does not use ratings, featured state, trust-section state, portfolio links or capability mapping. Static grid with reveal motion and large decorative quotation glyph. After the diagnostic section, before principles; brands are earlier after HomeBridge. |
| `trust_section.partner_logos` -> `getHomepageBrands` -> `HomeTrustedBrands` | ACTIVE, separate logo evidence | `/admin/trust` manages logos and `trust_section.is_active`. It preserves unrelated trust JSON. Homepage brands depend on this switch and each logo's visibility, independently of `testimonials.is_active`. |
| `trust_section.testimonials` -> `(marketing)/reviews/page.tsx` -> `TrustSection` | LEGACY / DISCONNECTED by routing | Separate JSON entries: name, role, quote, rating, avatar. The trust row's `is_active` gates this page and logos together. `next.config.js` permanently redirects `/reviews` to `/work`, bypassing the legacy page. TrustSection includes unconditional five-star decoration/claims. No active editor for this legacy quote JSON after Phase E. |
| `video_testimonials` via `/admin/video-testimonials` | ACTIVE admin route; DISCONNECTED public source | Title, image URL/media type and order; uploads image/video proof to `proofs/proofs/`. Separate media records, no public reader found. Not merged or modified. |
| `HomePageClient` -> `TestimonialsSection` | LEGACY / DISCONNECTED | Old homepage has an unused featured-testimonial fetch. Its child fetches independently, rotates every 6.5 seconds, rejects names by heuristic, supplies five-star defaults and says verified. No active route imports HomePageClient. |
| `ReviewCarousel.tsx` | LEGACY / DISCONNECTED; provenance UNKNOWN | No imports found. Three hard-coded statements attributed to Austin Zarecky, Christiana Kwarteng, and Zafar, with hard-coded job labels/five stars. Not assumed genuine or demo; needs owner evidence. No replacement or deletion. |
| `portfolio_items.testimonial` | LEGACY stored field; provenance UNKNOWN | Existing admin deliberately preserves it; active public work adapters/renderers do not display it. No evidenced testimonial foreign key to `portfolio_items`. |
| Client Portal / operational projects | No testimonial system found | Growth reviews, proposal review states, and customer-review assessment questions are unrelated to published testimonials. No ownership or operational linking added. |

No active hard-coded testimonial array or publicly reachable testimonial demo
component was found in route composition. This does not establish the provenance
of production rows. A name resembling a demo name is not proof of fabrication;
records are not merged, deleted, or suppressed based on name similarity.

## Visibility decision

Active homepage surfaces are already independent: `trust_section.is_active`
controls brands, while each `testimonials.is_active` controls testimonials.
No new switch, JSON configuration, table, migration, or fallback state is needed.
The trust admin explanation now makes this independence explicit. The retired
reviews page retains its existing coupling; reactivating that route would require
a separate review of its visibility and legacy proof content. Phase E readers,
storage, marquee, parser and payload are unchanged.

## Narrow implementation and final fields

Canonical active text evidence stays in `testimonials`; legacy JSON/media is not
imported or merged. The existing admin route is the only text editor.

| Field | Final management/public behavior |
| --- | --- |
| `name`, `content` | Required, nonblank. Exact entered wording is saved and rendered as escaped plain text, including line breaks; no minimum quote length, rewriting, HTML interpretation or truncation. |
| `position`, `company` | Optional explicit attribution, editable and displayed only when supplied. Existing `role` is a fallback only when position is absent/null; explicitly clearing position stays cleared. |
| `image_url` | Optional HTTPS/local image reference, shared validation and contained rendering. `avatar_url` is a fallback only when the canonical field is absent/null. Empty canonical value clears it. Broken images disappear without removing attribution. No new upload system. |
| `display_order` | Existing integer order, editable; lower numbers first. Candidate limit remains 12 and homepage output remains up to two. |
| `is_active` | Existing per-record visibility; new entries start hidden. Separate from Trusted Brands. No global testimonial switch invented. |
| `rating`, `is_featured` | Omitted from active editing/payloads and public rendering. Existing values remain stored. Creates send no rating; any live database default remains a database concern, not asserted source evidence. No fake star requirement. |
| Date/provenance/relationship/other columns | Existing values are preserved by narrow updates, not inferred or expanded. Owner must verify source/permission/attribution; no fabricated verification badge. |

Admin list and editor show status/order, inline errors, saved-state feedback,
original quote preview, validation and existing delete confirmation. Failed saves
keep the editor open. Read failures block editing. Pending mutations disable
controls and duplicate submissions. Deletes remove only the selected testimonial
record when the owner uses the existing action; no storage deletions are added.

`testimonialForm`, `testimonialPayload`, and `testimonialQuote` centralize mapping.
`TestimonialQuote` is shared by public and admin preview/list; optional image failure
handling is a small client leaf. Other homepage sections and placement are intact.
The proof heading becomes “What clients say” with “Client feedback”; cards use
existing site tokens, full quotes, clear attribution, and contained optional
images. Large quote marks, card reveal motion, ratings and carousel controls are
absent. Empty output hides the section; one stands alone; two form a static grid
and stack on mobile. Semantic figure/blockquote/figcaption, decorative empty-alt
images, wrapping text, and no cloned cards or motion controls.

No supported optional portfolio reference or explicit capability data was found
on the testimonial model. Both relationships are deferred, without inferring
brand matches or linking operational/private projects. No schema work is proposed.

## Verification and limits

- `node --jitless --max-old-space-size=256 scripts/test-testimonials.cjs` exercises
  real helpers, data readers, admin handlers and SSR rendering with offline
  Supabase/auth mocks. Covers independent visibility, canonical source, ordering,
  create/edit/error/delete handling, exact text/escaping, attribution and image
  clearing/failure, no rating writes, and empty/one/few static arrangements.
- Phase E `scripts/test-trusted-brands.cjs` passes unchanged as regression coverage.
- `npx tsc --noEmit` passes. Build skipped: free RAM was 227,056 KiB (about 222 MiB)
  of 4,010,576 KiB; conditions did not materially improve.
- Browser layout, live RLS, live schema/defaults (including insert behavior when
  rating is omitted), remote images, production row volume/provenance, and source
  permissions remain unverified. Browser execution tooling is unavailable here.
- No SQL, migrations, staging, commits, push, deployment or production mutation.
  Legacy files/data are retained. Portfolio, Insights, Client Portal and email
  implementations are unchanged. `scratchpad/` is untouched and untracked.
