# Admin routes that exist on disk but are not in the navigation

Audit only (Phase A1 closure). No route was added to the navigation, changed, retired or deleted.
Method: read each page, list the tables / APIs it touches, and search `src`, `scripts` and `docs` for inbound
references (`/admin/<route>`) and for any public reader of its data. "Likely" labels are inferences from code,
not confirmed usage — no production data was consulted.

| Route | Purpose (from code) | Data / API touched | Referenced elsewhere? | Assessment |
|---|---|---|---|---|
| `/admin/notifications` | Full list of notifications, mark read / read all | `/api/notifications` (+ `/[id]`, `/read-all`), all exist | **Yes** — the header `NotificationBell` links to it | **Likely active** (modified Sept 2026). It is reached from the bell, so it is not orphaned |
| `/admin/email-logs` | Outbound email log viewer | `/api/admin/email-logs` (exists) | Only by its own API route | **Likely active** (modified Sept 2026); just not linked from the sidebar |
| `/admin/video-testimonials` | Video / image client proofs: title, media, order; uploads to storage bucket `proofs` | `video_testimonials`, `proofs` | `docs/testimonials-cleanup.md` records it as "ACTIVE admin route; DISCONNECTED public source" | **Unclear** — admin works, no public reader found |
| `/admin/backup` | Triggers / restores data backups | `/api/backup` (exists) | None | **Unclear.** Sensitive capability, no inbound links, untouched since April 2026. Needs an owner decision before it is ever exposed |
| `/admin/export` | Export table data | `/api/export` (exists) | None | **Unclear** — functional code, no inbound links |
| `/admin/bulk-delete` | Select and delete rows across tables from the browser | direct `supabase.from(table)` reads / deletes (relies on RLS) | None | **Legacy and risky.** Destructive, no links; do not surface without review |
| `/admin/seo` | Per-page SEO overrides; "regenerate sitemap" button | `seo_settings`, `POST /api/sitemap` (exists) | Only a test | **Legacy.** Its public reader (`src/components/SEO.tsx`) is imported nowhere; SEO is now code-driven (`test-technical-seo.cjs`) |
| `/admin/cta` | Homepage "call to action" section editor | `cta_section` | Only read by `components/home/HomePageClient.tsx`, which nothing imports | **Legacy / disconnected** — the current homepage (H1–H3) does not read it |
| `/admin/images` | Image gallery browser | `projects` | Doc mention only | **Legacy** — pre-dates `portfolio_items`; April 2026 |
| `/admin/messages` | Inbox over a `messages` table (read / delete) | `messages` | `docs/ROADMAP.md` lists "Messaging"; the Client Portal deliberately uses **Requests**, not Messages | **Legacy / unclear** — do not link until messaging scope is decided |
| `/admin/email-settings` | Email settings + "send test email" | `email_settings`; posts to `/api/send-email` | None | **Likely broken** — `/api/send-email` does not exist in `src/app/api`. Nothing reads `email_settings` |
| `/admin/email-templates` | Edit email templates | `email_templates` | None; nothing outside the page reads the table | **Legacy / disconnected** — transactional email now uses the code-based email design system |
| `/admin/analytics` | Analytics screen | No data source (state initialised to zeros; no query or fetch found) | None | **Likely placeholder** — GA4 data would come via `/api/google-analytics`, which this page does not call |

## Suggested later decisions (not made here)

1. Promote to navigation: `notifications` (already reachable) and `email-logs`.
2. Decide intentionally: `backup`, `export`, `bulk-delete` — powerful, unlinked. Keep hidden, or gate and document.
3. Retire after confirmation: `seo`, `cta`, `images`, `email-templates`, `email-settings`, `analytics` (disconnected or placeholder).
4. `messages` and `video-testimonials` depend on product scope decisions.
