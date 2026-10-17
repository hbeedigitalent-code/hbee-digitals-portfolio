# Phase E: reconnect trusted brands

## Proven repository model and disconnection

`/admin/trust` already reads/writes `trust_section`. Its `partner_logos` value is
an ordered JSON array (readers also accept a serialized JSON string). Each entry
has `name`, `logo`, and `active`; absent per-logo `active` historically means
visible. The row's `is_active` is the existing section-level switch. Uploads use
`project-images/trust-logos/`. No schema change is needed.

The promoted `src/app/(site)/page.tsx` did not load this data. Legacy `TrustedBy`
loaded it in the browser, ignored section visibility, and imposed grayscale/dark
inversion. `PartnerMarquee` contains technology logos, which are not client proof.
`HomePageClient` is disconnected from the active homepage. All three legacy files
remain unchanged; the new component reuses the existing model and the useful
array/string parsing, per-logo visibility, and contained-image principles.

## Final behavior

- Growth OS exposes **Trusted Brands** at `/admin/trust` in content navigation.
- Admin retains brand names, URLs/uploads, reorder, removal, and visibility; adds
  accessible field labels, contained white previews, optional brand website URLs,
  persistent save/error feedback, retry on read failure, validation, and pending
  upload/save guards. Unknown entry metadata is retained. An explicitly hidden
  logo remains hidden; malformed visibility values fail closed publicly.
- Active editing is scoped to logos and section visibility. Legacy copy, stats,
  badges, CTA, and testimonial controls are omitted; saves send only
  `partner_logos`, `is_active`, and `updated_at`, targeting the loaded row ID.
  Unrelated stored columns are preserved. An absent row uses an insert through
  the existing table; schema/RLS failures are surfaced. Multiple-row reads or
  corrupt JSON block editing rather than silently overwrite the collection.
- The existing section visibility also affects the legacy Reviews & Trust page;
  the admin UI explicitly explains this shared switch. No independent visibility
  column or second logo model was introduced.
- An optional `url` is stored inside the existing logo JSON, without new columns.
  Logos without a valid URL are images, not links. Relationship metadata is deferred.
- The active homepage loads brands server-side alongside its existing reads,
  using the existing anonymous Supabase client and RLS. It keeps the existing
  300-second homepage revalidation. Missing/inactive rows, failed queries, empty
  collections, or wholly invalid data render no band. Valid entries retain order;
  entries missing a name/image or using unsafe URLs are skipped. No placeholder
  names, logos, relationships, or hard-coded technology logos are used publicly.
- Placement is after `HomeBridge`, before `HomeProblem`. The fixed restrained
  heading is **Selected brands we've supported** (rendered with a typographic
  apostrophe). No other homepage design changes are made.
- White, compact treatment; natural colours/proportions; contained images capped
  at 160 by 48 CSS pixels (120 by 40 on small screens); no forced crop or inversion.
  Fewer than six valid visible logos wrap statically. Six or more use an 85-second
  continuous CSS track, paused on hover or a native checkbox. Focus stops motion
  and restores the original group to its untransformed, scrollable position so
  original links cannot remain translated off-screen during keyboard navigation. The native
  pause works without JavaScript. Reduced-motion and browsers without the motion
  media query get static wrapping with hidden duplicate copies and no pause UI.
  Copies are aria-hidden, have empty alt, and contain no links or keyboard stops.
- Existing local and HTTP(S) image references, including existing SVG URLs, remain
  supported as image sources. New uploads allow PNG/JPEG/WebP only, up to 5 MiB;
  MIME, size, and raster signature checks run before upload. Paths use a generated
  token and MIME-derived extension. No new bucket, storage policy, or deletion.
  Upload then save is explicit; removing an entry does not delete storage files.

## Verification and limits

`node --jitless --max-old-space-size=256 scripts/test-trusted-brands.cjs` exercises
the real parser, loader, admin component handlers, renderer, SSR markup, and CSS
AST with mocked Supabase/storage. Coverage includes order, visibility, malformed
data, empty/few/many states, upload mapping/validation, save/load failures, pending
guards, unknown-metadata preservation, optional links, alt/hidden duplicates,
native pause/reduced-motion rules, sidebar and homepage placement, and narrow
payloads preserving testimonial columns. No environment or external data is used.

TypeScript passes. Build is skipped: free host RAM was 492,644 KiB (about 481 MiB)
of 4,010,576 KiB, not materially improved over Phase D. The browser execution tool
is not exposed in this session; real browser layout/animation, keyboard scrolling,
and reduced-motion interaction remain unverified. Live RLS, storage uploads,
first-row schema defaults, current production logo volume, remote image
availability, and actual brand relationships are not production-verified.

No SQL, migration, production mutation, staging, commit, push, or deployment.
Portfolio, Insights, testimonials, Client Portal, and email implementations are
unchanged. `scratchpad/` remains untouched and untracked. Owner review is required.
