# Admin Media Batch 3: video, background video and UGC

Status: built on `feature/media-video-batch-3`. **No SQL has been run. Nothing has been deployed.**

## What Batch 1 had already prepared

`media_assets` accepts `kind = video`, `video/mp4` and `video/webm`, the categories `video`, `bgc_video` and
`ugc_video`, `duration_seconds` and `poster_asset_id`. The update trigger leaves duration and poster editable. **No table
change is needed.** What was missing: a storage location for video, an upload path, and any UI.

## Storage

A new public bucket, `site-media`: MP4 / WebM only, 40 MB per object. Writes are limited to active admins by two
policies on `storage.objects` (select, insert). There is no update or delete policy. Images stay in `project-images`.

Run order (each step needs owner approval):

1. `scripts/admin-media-video-00-preflight-readonly.sql` (zero FAIL; read every REVIEW row)
2. In the Supabase dashboard confirm the project's global upload limit is at least 40 MB, and check the plan's storage
   and egress allowance. **Neither could be verified from the repository.**
3. `scripts/admin-media-video-01-forward.sql`
4. `scripts/admin-media-video-03-verify-readonly.sql`
5. Deploy, then upload one small test clip as an admin and confirm that it plays from its public URL.

Rollback: `scripts/admin-media-video-02-rollback.sql` removes the two policies. It deletes no file and no bucket.

Until step 3 is done, the "Upload video" form fails at upload time with a storage error. Everything else works.

## Upload

Resumable (TUS, 6 MB chunks) from the browser with the signed-in admin's session token, so row-level security decides.
No service-role key and no new server route. Every attempt uses a new object path, so nothing is overwritten. If the
bytes upload but saving the library row fails, "Retry saving" registers the stored file without sending it again.
A cancelled or abandoned upload can leave a partial upload that the storage service expires on its own.

## Limits

| Rule | Value | Enforced |
|---|---|---|
| Formats | MP4, WebM (identified from file bytes) | app and bucket |
| Size | 40 MB maximum | app and bucket |
| Duration | 180 s maximum | app |
| Must open in the browser | yes | app |
| Poster | required for background video, recommended otherwise; active image asset | app |

Warnings only: background video over 8 MB or 20 s, other video over 25 MB, longest side over 1920px.

## Encoding recommendations

| Use | Resolution | Bitrate | Length | Size target |
|---|---|---|---|---|
| Background loop | 1280 x 720 | 1 to 2 Mbps | 10 to 20 s | under 8 MB |
| Content / case study | 1280 x 720 (1080p only if detail matters) | 2.5 to 4 Mbps | under 90 s | under 25 MB |
| UGC (vertical) | 720 x 1280 | 2 to 3 Mbps | under 60 s | under 25 MB |

MP4 (H.264, `yuv420p`, "fast start" so metadata is at the front) plays everywhere. Remove the audio track from
background loops. There is no transcoding service: encode before uploading.

Egress matters more than storage. An 8 MB background clip watched 1,000 times is about 8 GB of transfer. Check this
against the plan before putting video on a high-traffic page.

## Public rendering primitives (not placed on any page)

- `BackgroundVideo`: poster first. No `<video>` element for reduced motion, screens under 768px (unless `allowMobile`)
  or data saver. Muted, looped, inline, no controls, hidden from assistive technology, paused off-screen. A pause button
  appears on keyboard focus.
- `ContentVideo`: native controls, no autoplay, `preload="none"` when there is a poster, captions (WebVTT) and
  transcript when supplied.

`media_assets` has no captions or transcript columns. Those come from the content that references the video
(`portfolio_media` already has `captions_url` and `transcript`).

## Not done, on purpose

- **Hero video control.** The current homepage Hero (`HomeHero`) is code-owned and does not read
  `hero_section.video_url`; only the retired `components/home/Hero.tsx` did. Whether the column exists in production is
  not verified (the preflight reports it). An Admin control would save a value that changes nothing on the live site.
  It needs an owner decision about whether the current Hero should support video at all.
- **Portfolio creative media.** `portfolio_media.video_url` accepts any HTTPS file URL, so a library video URL works
  there today. A picker button inside that editor is a later step, and `NEXT_PUBLIC_PORTFOLIO_CREATIVE_ENABLED` stays off.
- **Video proofs (`/admin/video-testimonials`).** Unchanged: it still uploads to the legacy `proofs` bucket. It has its
  own 15 MB rule and a delete button. Pointing it at the Media Library is a separate change; no files were migrated.
- **`/services/creative-ugc`.** Unchanged. `ugc_video` assets are available to it later.
