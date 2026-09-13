# ADR-0002 — Retain Supabase; do not adopt Prisma or Auth.js

- **Status:** Accepted
- **Date:** 2026-09-13
- **Decided by:** Project owner
- **Amends:** The technology stack in the Master Development Initialization Prompt

## Context

The brief specified **Prisma** as the ORM and **Auth.js** for authentication,
over PostgreSQL.

The codebase implements neither. Read from source, it uses the Supabase JS client
for data access with no ORM, Supabase Auth for authentication, and PostgreSQL Row
Level Security together with `src/middleware.ts` for authorization. Schema
changes are made through reviewed SQL scripts rather than a migration tool.

This is not a matter of an unfinished preference. The two models make different
assumptions about where authorization lives, and that difference is load-bearing
here.

## Decision

**Supabase Auth, Supabase Storage and direct PostgreSQL with RLS are the approved
stack.** Neither Prisma nor Auth.js is adopted. [STACK.md](../STACK.md) records
the approved stack and supersedes the brief's stack section.

### Why not Auth.js

Authentication, authorization and the admin 2FA boundary are already implemented,
deployed, and holding production data. `src/middleware.ts` enforces three layers
before any protected page renders: a valid session, a role resolved from
`admin_users` or `clients`, and a signed HMAC 2FA cookie for admin routes.

Replacing that with Auth.js means rewriting the security boundary of a running
system. The realistic failure mode of such a migration is a privilege regression
— a role check that silently stops being enforced — and that failure is quiet
rather than loud. This is a migration project deserving its own phase, approval
and test coverage. It is emphatically not a Phase 01 foundation task, and there
is no functional gap motivating it.

### Why not Prisma

The stronger objection. Authorization in this system is enforced inside
PostgreSQL: RLS policies evaluate `auth.uid()`, which is a property of the
Supabase session carried on the request. `phase2-security-rls.sql` is built
entirely on this — `clients_select_own` and `admin_users_select_own` both reduce
to `auth.uid() = user_id`.

Prisma connects with its own pooled database credential. Queries issued through
it do not carry the visitor's `auth.uid()`, so RLS policies written against it
either fail closed or, if the connection is privileged, are bypassed entirely.
Introducing Prisma alongside the current model therefore creates **two
authorization paths that disagree** — RLS-enforced for Supabase-client reads,
RLS-bypassed for Prisma reads — with correctness depending on every future
developer remembering which client they are holding. The existing
service-role/session-client distinction is already a boundary requiring care;
adding a third path with different semantics multiplies that risk.

The benefits Prisma would bring — type-safe queries and a managed migration
sequence — are real, and the current lack of both is a genuine weakness. They can
be obtained without the authorization hazard: generated TypeScript types from the
live Supabase schema give type safety, and a numbered, reviewed SQL migration
sequence gives migration discipline. Both are proposed in
[ROADMAP.md](../ROADMAP.md) under Phase 02.

## Consequences

**Positive.** The security boundary is left intact. No migration of production
authentication data. RLS stays the single enforcement point for row ownership.
Development continues on a stack the codebase already uses consistently.

**Negative, and worth stating plainly.** Queries are not type-checked against the
real schema — the type check passing proves the TypeScript is internally
consistent, not that any column named in a query exists. Migrations remain
manual SQL, run against the dashboard, with the correctness of any given
environment resting on whether someone ran the script. [DATABASE.md](../DATABASE.md)
records both as open weaknesses, and Phase 02 addresses them.

**Revisiting this.** If type safety and migration discipline are later judged to
outweigh the authorization hazard, the migration path is to move authorization
out of RLS and into the application layer first, then adopt Prisma — in that
order, never the reverse. Adopting Prisma while RLS remains the enforcement point
is the specific combination this ADR rejects.
