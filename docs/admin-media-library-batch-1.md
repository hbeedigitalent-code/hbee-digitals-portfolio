# Admin Media Library, Batch 1 (images and logos)

Status: **application code and SQL are written; no SQL has been executed anywhere.** The owner reviews and runs the SQL.

## Scope

Batch 1 adds a registry of uploaded images and logos, a validated shared uploader, a reusable `MediaPicker`, `/admin/media`, and the first consumer, Trusted Brands (`/admin/trust`). It is additive: public pages keep reading the raw URLs already stored in their own content tables.

Not in Batch 1: video / BGC / UGC upload, a `site-media` bucket, resumable CMS uploads, a Hero video field, moving or rewriting any existing file or URL, hard deletion, and integrations into Insights, Work, About, Team, Hero or video testimonials (Batch 2 / 3).

## Storage

New uploads go to the existing public `project-images` bucket under `media/<folder>/`:

| Category | Folder |
|---|---|
| `brand_logo` | `media/brand-logos/` |
| `graphic` | `media/graphics/` |
| `project_image` | `media/project-images/` |
| `insight_image` | `media/insight-images/` |
| `general` | `media/general/` |

Object name: `<sanitised-name>-<uuid>.<ext>`; the extension comes from the detected image type, never the filename. The registry stores `bucket` + `object_path`, so later batches can register legacy files where they already live (`blog-images`, `portfolio-images`, etc.). **No storage bucket, policy or object is created or changed by the SQL.**

## Database: `public.media_assets`

- Image and video kinds, eight categories (`brand_logo`, `graphic`, `insight_image`, `project_image`, `general`, `video`, `bgc_video`, `ugc_video`); Batch 1 only uploads the five image categories.
- Alt text is required unless the asset is explicitly marked decorative (`is_decorative`).
- SVG is not an allowed MIME type (database or UI).
- `unique (bucket, object_path)`; SHA-256 `checksum` for duplicate warnings.
- A `BEFORE UPDATE` trigger makes the file identity (bucket, path, URL, checksum, kind, MIME, size, dimensions, creator) immutable and maintains `updated_at`.

### RLS

- RLS enabled. Policies for role `authenticated` only, each requiring an active `admin_users` row: SELECT, INSERT (also `created_by = auth.uid()`), UPDATE.
- No DELETE policy and no DELETE grant: the library archives, it never hard-deletes.
- No `anon` / public SELECT: public pages never read this table. Client Portal users are non-admin and have no access.
- No effect on the private client buckets or their restrictive guard.

## Application behaviour

- **Upload:** PNG, JPEG, WebP, AVIF up to 8 MB. Declared type is checked against magic bytes; SVG/markup rejected; the image must decode and its dimensions are read; SHA-256 computed. File name, size, dimensions and type are shown before upload.
- **Duplicates:** a checksum match shows "This file already exists in the Media Library" with *Use existing asset* / *Upload anyway*. Never blocked silently.
- **Archive / restore:** sets `status` only. The file and every existing reference stay as they are. Before archiving, the usage scan runs and the owner confirms.
- **Usage scan (on demand):** reads `blog_posts`, `portfolio_items`, `portfolio_media`, `trust_section`, `hero_section`, `team_members`, `about_page` and reports where the asset's URL or path appears (including article body HTML). Free-form content elsewhere may not be detected; "not found" never means "safe to delete".
- **Trusted Brands:** logos are chosen from, or uploaded into, the Media Library. The stored `logo` stays a URL so the homepage is unchanged. New optional fields per brand: `asset_id`, `alt_text`, `relationship` (`none` default, `client`, `partner`, `collaborated`, `featured_by`, `custom` + label). The relationship is admin metadata only and is not rendered publicly. The public logo alt uses the stored description when present, otherwise the brand name (unchanged for existing rows). Editing the raw URL (Advanced) detaches the `asset_id`.
- `/admin/images` redirects (temporarily) to `/admin/media`; its page file is retained.

## Production SQL: owner execution order

Run in the Supabase SQL editor, in this order, reviewing the output of each step before the next:

1. `scripts/admin-media-00-preflight-readonly.sql`: read-only. Proceed only with zero FAIL rows; read every REVIEW row (bucket MIME / size limits).
2. `scripts/admin-media-01-forward.sql`: creates the table, trigger, RLS policies and grants (single transaction).
3. `scripts/admin-media-03-verify-readonly.sql`: read-only. `OVERALL = PASS` required.
4. Deploy / use the application. `/admin/media` shows a "table is not installed" error until step 2 has run; public pages are unaffected either way.

Rollback: `scripts/admin-media-02-rollback.sql` removes browser access and drops the objects only when the table is empty; a populated registry is kept. Storage files are never touched.

## Unverified (needs the live project)

- `project-images` bucket public flag, size limit, allowed MIME types (preflight rows 30-31; AVIF and 8 MB depend on them).
- The existing `storage.objects` INSERT policy that lets admin sessions upload to `project-images` (the existing uploaders already depend on it; preflight row 32 reports it).
- Real-browser behaviour of the picker (focus trap, drag and drop) and AVIF decoding: tests cover logic and server-rendered markup only.
