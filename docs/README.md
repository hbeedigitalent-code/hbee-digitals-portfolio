# Hbee Growth OS — Documentation

This folder is the documentation root for **Hbee Growth OS**, the business
operating system of Hbee Digitals. It was created in Phase 01 (Foundation).

## Contents

| Document | Purpose |
|---|---|
| [ARCHITECTURE.md](ARCHITECTURE.md) | How the application is structured: routes, layers, auth boundary, storage, email. |
| [DATABASE.md](DATABASE.md) | The data layer: tables in use, grouped by domain, plus RLS posture. |
| [STACK.md](STACK.md) | The approved technology stack and why it differs from the original brief. |
| [ROADMAP.md](ROADMAP.md) | The six development phases, with a gap analysis of what already exists. |
| [decisions/](decisions/) | Architecture Decision Records (ADRs). |
| [audits/](audits/) | Point-in-time security and database audits. |

## Audits

| Audit | Status |
|---|---|
| [2026-09-13 — Database & security foundation](audits/2026-09-13-database-security-audit.md) | Source-level findings complete; database sections **pending** execution of [`scripts/audit-01-schema-inspection.sql`](../scripts/audit-01-schema-inspection.sql) |

## How to read this documentation

Every factual claim in these documents carries the grade of evidence behind it.
The grades used are:

- **Read from source** — established by reading the repository's code or SQL.
  This proves what the code says, not what it does at runtime.
- **Verified by execution** — established by actually running a command in this
  repository, with the result recorded.
- **Unverified** — stated in the brief, inferred from documentation, or
  believed true but not confirmed against a running system or live database.

Claims about the live Supabase database, deployed behaviour, or email delivery
are marked **unverified** unless a recorded run backs them. No live database was
queried and no browser check was performed while writing this set.

## Documentation rules

1. When a feature changes, update the affected document in the same batch.
2. Do not upgrade a claim's evidence grade without a recorded check.
3. New architectural decisions get an ADR in `decisions/`, numbered sequentially.
4. Keep the phase gap analysis in `ROADMAP.md` current as phases complete.
