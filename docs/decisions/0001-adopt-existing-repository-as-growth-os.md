# ADR-0001 — Adopt the existing repository as Hbee Growth OS

- **Status:** Accepted
- **Date:** 2026-09-13
- **Decided by:** Project owner
- **Supersedes:** TASK 001 of the Master Development Initialization Prompt

## Context

The Master Development Initialization Prompt opened with TASK 001: initialize a
new `hbee-growth-os` repository — create a Next.js application, configure
TypeScript and Tailwind, and establish a repository structure — and instructed
that authentication and database work wait until that foundation was verified.

Inspection of the working directory before any code was written found that the
repository was not a greenfield starting point. Read from source, it contained:

- Next.js 14.2 with the App Router, TypeScript and Tailwind 3.4 already configured
- 430 TypeScript files, 125 page routes, 70 API route handlers, 141 components
- A 46-module admin dashboard covering CRM, projects, tasks, proposals,
  agreements, analytics, email and the full growth cluster
- A 14-page client portal with deliverables, invoices, proposals, messages,
  notifications and file uploads
- Supabase Auth with admin TOTP 2FA and a three-layer access boundary in
  `src/middleware.ts`
- 64 database tables in active use, and a live Vercel deployment

Executing TASK 001 literally would have created a second Next.js application
beside a working production platform. The consequence would not have been
confined to Phase 01: Phases 02 through 05 would have meant rebuilding the admin
dashboard, the client portal, the growth systems and the security boundary from
scratch, or abandoning them.

## Decision

**This repository is Hbee Growth OS.** No second application is scaffolded.

Phase 01 is redefined from construction to audit and documentation. Its
deliverables become:

1. The `docs/` structure the brief called for, which was genuinely absent.
2. Documentation of the architecture, data layer and stack as they actually are.
3. A gap analysis of the existing system against the six-phase roadmap.

The brief's proposed repository layout (`features/`, `ai/`, `workflows/`,
`prisma/`, `tests/` at the root) is not adopted. The existing `src/` layout is
the standard. Future AI and workflow code belongs under `src/lib/` in a named
subfolder, consistent with `src/lib/emails`, `src/lib/uploads` and
`src/lib/scoring`.

The two-domain split described in the brief — `hbeedigitals.com` for marketing
and `app.hbeedigitals.com` for the OS — is not implemented today; both are served
by one application using route groups. This ADR does not decide that question.
Splitting domains later remains possible and should get its own ADR.

## Consequences

**Positive.** No working code is discarded. The growth systems, which are the
distinguishing asset of the platform and have no off-the-shelf equivalent, are
preserved. The production deployment is undisturbed. Later phases inherit a
documented map of the system rather than an assumption.

**Negative.** The brief's clean phase progression no longer matches reality. The
phases must be re-read as "verify and harden" rather than "build" for Phases 02
through 04, which [ROADMAP.md](../ROADMAP.md) now sets out explicitly.

**Exposed by this decision.** Documenting the system surfaced gaps that a
greenfield start would have hidden until much later: there is no test framework
at all, the Team Member and Partner roles from the brief do not exist, the RLS
posture of 61 of the 64 tables is unverified, and the growth scoring logic that
drives client-facing profiles is untested.
