# Approved technology stack

This document records the stack Hbee Growth OS actually runs on. Where it differs
from the original Master Development Initialization Prompt, the difference is
deliberate and recorded here with its reason.

Evidence grade: **read from source** (`package.json`, configuration files and
application code), except the deployment line, which is **unverified** beyond the
presence of `vercel.json`.

## Approved stack

| Layer | Approved | Notes |
|---|---|---|
| Framework | **Next.js 14.2** (App Router) | |
| Language | **TypeScript 5** | Type check passes with zero errors |
| Styling | **Tailwind CSS 3.4** | + `clsx`, custom `cn()` helper |
| Animation | **Framer Motion 11** | |
| Icons | **lucide-react** | |
| Database | **Supabase PostgreSQL** | |
| Data access | **Supabase JS client** (`@supabase/supabase-js`, `@supabase/ssr`) | No ORM |
| Migrations | **Reviewed SQL files** in `scripts/` | See [DATABASE.md](DATABASE.md) |
| Authentication | **Supabase Auth** | + TOTP 2FA for admins (`otplib`, `speakeasy`, `qrcode`) |
| Authorization | **Row Level Security + `src/middleware.ts`** | Role from `admin_users` / `clients` |
| Storage | **Supabase Storage** | Resumable uploads via `tus-js-client` |
| Email | **Resend** + `@react-email/render` | |
| Charts | **Recharts** | |
| Rich text | **Quill** (`react-quill`), sanitised with `sanitize-html` | |
| Bot protection | **Cloudflare Turnstile** | |
| Analytics | **Google Analytics** (`@next/third-parties`), `web-vitals` | |
| Deployment | **Vercel** | |
| Version control | **Git + GitHub** | |

## Deviations from the original brief

The brief named **Prisma** as ORM and **Auth.js** for authentication. Neither is
adopted. The reasoning is recorded in full in
[ADR-0002](decisions/0002-retain-supabase-over-prisma-and-authjs.md); in short:

- **Auth.js is not adopted** because authentication, authorization and the admin
  2FA boundary are already built on Supabase Auth and enforced in middleware over
  live production data. Replacing the security boundary of a running system is a
  migration project with real risk of privilege regression, not a foundation task.
- **Prisma is not adopted** because authorization in this system depends on
  PostgreSQL Row Level Security evaluating `auth.uid()`. That model is a property
  of the Supabase session, not of an ORM connection, and introducing a
  connection-pooled ORM alongside it creates two disagreeing authorization paths.

The brief's repository layout (`features/`, `ai/`, `workflows/`, `prisma/`,
`tests/` at the root) is likewise not adopted; `src/` is the standard here. See
[ARCHITECTURE.md](ARCHITECTURE.md#2-directory-layout).

## Known gaps in the stack

Stated plainly, because the brief asks for them and they do not exist yet:

- **No test framework.** There is no `tests/` directory, no test runner in
  `package.json`, and no test script. The brief requires functional and
  permission testing for every major feature. This is the largest single gap and
  is the main Phase 06 dependency.
- **No AI layer.** Phase 05 has no foundation in place yet.
- **No CI.** Nothing runs the type check automatically on push.

## Adding a dependency

The brief's rule stands: no unnecessary dependencies. Before adding one, check
whether an existing dependency covers the need, and record non-obvious additions
in an ADR.
