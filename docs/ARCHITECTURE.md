# Architecture

Evidence grade for this document: **read from source**, except where a line is
marked otherwise. Nothing here was confirmed against the deployed environment.

## 1. Shape of the system

Hbee Growth OS is a **single Next.js 14.2 application** using the App Router. It
serves three distinct audiences from one codebase and one deployment:

| Surface | Route space | Audience | Access control |
|---|---|---|---|
| Public marketing site | `src/app/(marketing)`, `src/app/(focused)` | Anonymous visitors | None (public) |
| Admin dashboard | `src/app/admin` | Hbee staff | Session + active admin row + 2FA cookie |
| Client portal | `src/app/client-portal` | Clients | Session + client row |

The original brief anticipated splitting the marketing site and the Growth OS
across two domains. In the current implementation they are one application; the
route groups provide the separation. See
[ADR-0001](decisions/0001-adopt-existing-repository-as-growth-os.md).

### Scale (counted from the repository)

- 430 TypeScript/TSX files under `src/`
- 125 page routes (`page.tsx`)
- 70 API route handlers (`route.ts`)
- 141 React components under `src/components/`
- 64 database tables referenced from application code
- 5 storage buckets

## 2. Directory layout

```
src/
├── app/                  Next.js App Router
│   ├── (marketing)/      Public site — 26 pages
│   ├── (focused)/        Standalone funnels (assessment, growth-readiness)
│   ├── admin/            Admin dashboard — 46 modules
│   ├── client-portal/    Client portal — 14 pages
│   ├── admin-2fa-challenge/  Deliberately top-level (see §4)
│   └── api/              70 route handlers
├── components/           141 shared React components
├── context/              React context providers
├── hooks/                Custom React hooks
├── lib/                  Server/shared logic (see §3)
├── styles/               Global styles
├── types/                Shared TypeScript types
├── utils/                Utility helpers
└── middleware.ts         The authoritative access boundary
```

The brief specified a different top-level layout (`features/`, `ai/`,
`workflows/`, `prisma/`). That layout was not adopted; the existing `src/`
structure is the standard for this repository. Future AI and workflow code
should be placed under `src/lib/` in a named subfolder, consistent with how
`src/lib/emails`, `src/lib/uploads` and `src/lib/scoring` are organised today.

## 3. The `src/lib` layer

Business logic lives in `src/lib`, not in route handlers. Current modules:

| Module | Contents |
|---|---|
| `emails/` | 19 files — templates and send logic |
| `services/` | 6 files — service-domain logic |
| `uploads/` | 3 files — resumable upload lifecycle |
| `validators/` | 3 files — input validation |
| `notifications/` | 2 files |
| `projects/` | 2 files |
| `scoring/` | 2 files — growth scoring |

Notable single-file modules: `supabase-client.ts` (browser), `supabase-server.ts`
(server, session-bound), `supabaseAdmin.ts` (service-role), `admin-api-auth.ts`,
`admin-2fa-cookie.ts`, `turnstile.ts`, `provision-account.ts`.

### Supabase client discipline

Three distinct clients exist, and the distinction is a security boundary:

- **`supabase-client.ts`** — browser client, anon key, subject to RLS.
- **`supabase-server.ts`** — server client bound to the visitor's session cookie,
  subject to RLS.
- **`supabaseAdmin.ts`** — service-role key, **bypasses RLS**. This must only be
  used in server-side route handlers that perform their own authorization check
  first. It must never be imported into client components.

## 4. The access boundary

`src/middleware.ts` is the authoritative gate. It runs before any protected page
or layout renders, so page bundles and data are never served to an
unauthenticated or wrong-role visitor. Client-side gates in the two layouts
remain as a second layer.

Matcher: `['/admin/:path*', '/admin-2fa-challenge', '/client-portal/:path*']`

Three layers are enforced:

1. **Session** — a valid Supabase session must exist.
2. **Role** — resolved from existing tables, with no hardcoded emails:
   - admin → a row in `admin_users` with `user_id = auth.uid()` and `is_active = true`
   - client → a row in `clients` with `user_id = auth.uid()`
3. **Admin 2FA** — a signed, httpOnly cookie is required for every `/admin/*`
   route except `/admin/login` and `/admin-2fa-challenge`.

The middleware uses only the public anon key plus the visitor's own session
cookie. Verifying the 2FA cookie is pure HMAC signature and expiry checking. The
service-role key appears only in `/api/admin/2fa/status` and
`/api/admin/2fa/login`, which are the only code paths that read `admin_2fa`.

`/admin-2fa-challenge` is a top-level route rather than nested under `/admin/`
specifically so it does not inherit the admin dashboard shell — the challenge
must render before the sidebar and navigation are ever shown. Because it sits
outside the `/admin/:path*` matcher, it is listed explicitly so layers 1 and 2
still apply to it; only layer 3 is skipped.

## 5. File storage

Supabase Storage, with five buckets: `avatars`, `blog-images`, `images`,
`project-images`, `proofs`.

Large client-facing uploads use a **resumable (tus) flow** rather than posting
through a Next.js route, coordinated by three endpoints —
`/api/uploads/initiate`, `/api/uploads/finalize`, `/api/uploads/cancel` — with
state tracked in `upload_sessions` and `upload_batches`. Abandoned sessions are
cleaned up by `/api/cron/uploads/cleanup`. An `UPLOADS_DISABLED` environment flag
exists as a kill switch.

Private files are served through per-file `signed-url` endpoints rather than
public URLs. This pattern appears for client files, project files, proposal files
and onboarding files.

## 6. Email

Outbound email uses **Resend**. Templates live in `src/lib/emails` and are
rendered with `@react-email/render`. Delivery is instrumented: `email_logs`
records sends, `email_events` records provider events collected by
`/api/cron/email-events`, and open/click tracking runs through `/api/track-open`
and `/api/track-click`.

An email provider accepting a message is not proof of delivery or of inbox
rendering. Admin-facing surfaces should describe such messages as **accepted**,
not "sent", unless a provider event confirms otherwise.

## 7. Scheduled work

Two cron endpoints exist, guarded by a `CRON_SECRET`:

- `/api/cron/email-events` — pulls provider email events
- `/api/cron/uploads/cleanup` — reclaims abandoned upload sessions

## 8. Environment variables

Read from source (`process.env` references in `src/`):

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role — bypasses RLS, server only |
| `ADMIN_2FA_COOKIE_SECRET` | HMAC secret for the 2FA cookie |
| `CRON_SECRET` | Guards the cron endpoints |
| `RESEND_API_KEY` | Email provider key |
| `RESEND_FROM_EMAIL` / `RESEND_REPLY_TO_EMAIL` | Sender identity |
| `ADMIN_NOTIFICATION_EMAIL` | Internal notification recipient |
| `TURNSTILE_SECRET_KEY` / `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Bot protection |
| `NEXT_PUBLIC_GA_ID` / `GA_API_SECRET` | Google Analytics |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `GROWTH_PROFILE_RELEASE_ENABLED` | Feature flag |
| `UPLOADS_DISABLED` | Upload kill switch |
| `NODE_ENV`, `VERCEL_ENV` | Runtime environment |

## 9. Build and deployment

Deployment target is **Vercel** (`vercel.json` present at the repository root).
Next.js experiments enabled: `optimizeCss`, `scrollRestoration`.

**Verified by execution (2026-09-13, this workstation):**

- `npx tsc --noEmit` → **exit 0**, no type errors across all 430 files. A first
  attempt crashed with a stack/heap fault; it passed once run with
  `NODE_OPTIONS=--max-old-space-size=4096`.
- `npm run build` → **fails on this workstation** with
  `FATAL ERROR: Zone Allocation failed - process out of memory` in Next.js build
  workers. The host has 3.82 GB total RAM with 0.27 GB free and 4 logical CPUs.
  The failure is host memory exhaustion during compilation, not a code defect —
  the worker died at roughly 290 MB heap while allocating a compiler zone, and
  raising `--max-old-space-size` cannot help on a machine with this little
  physical memory.

**Unverified:** that the production build succeeds on Vercel. That is likely,
given the type check passes and the project has deployed commits, but no build
was observed here. A local full build needs either more RAM or a reduced worker
count; changing build configuration was outside this phase's scope.
