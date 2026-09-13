# Development roadmap and gap analysis

The Master Development Initialization Prompt defines six phases. This document
maps those phases onto what the repository actually contains, so later phases
build on fact rather than on the assumption of a greenfield start.

Evidence grade: the "what exists" column is **read from source** — route files,
table references and configuration. It records that code exists, not that the
code behaves correctly. Nothing in this document was confirmed by running the
application or querying the database.

## Summary

The repository is substantially further along than the phase order assumes. Work
from Phases 01–04 is largely present, Phase 05 is absent, and Phase 06 is blocked
by the absence of any test framework.

| Phase | Brief's intent | Actual state |
|---|---|---|
| 01 — Foundation | Build it | **Largely complete**; documentation was the gap, now closed |
| 02 — Core Operations | Build it | **Largely built**; needs verification, not construction |
| 03 — Commercial Operations | Build it | **Largely built**; invoicing is the thin area |
| 04 — Growth Systems | Build it | **Largely built**; the most developed area of the system |
| 05 — AI & Automation | Build it | **Not started** |
| 06 — Refinement & Launch | Build it | **Blocked** — no test framework exists |

## Phase 01 — Foundation

| Requirement | State | Evidence |
|---|---|---|
| Next.js application | Exists | Next.js 14.2, App Router |
| TypeScript configured | Exists | `tsconfig.json`; `tsc --noEmit` exits 0 |
| Tailwind configured | Exists | `tailwind.config.ts`, Tailwind 3.4 |
| Git repository | Exists | Branch `main`, clean at phase start |
| Documentation structure | **Created in this phase** | This `docs/` folder |
| Database connection | Exists | Supabase, 64 tables referenced |
| Migration system | Partial | One reviewed SQL script; no numbered sequence yet |
| User / Role / Permission models | Exists, different shape | `admin_users`, `clients`, `admin_2fa` rather than a generic RBAC schema |
| Organization model | Different shape | `merchants`, `merchant_accounts`, `merchant_status` |
| Registration / login / logout | Exists | Supabase Auth; client signup, login, reset flows under `(marketing)` |
| Session management | Exists | `@supabase/ssr`, cookie-bound server client |
| Role system | Exists, narrower | Administrator and Client are implemented. **Team Member and Partner roles do not exist** as access roles |
| Protected routes | Exists | `src/middleware.ts`, three enforcement layers |
| Application shell, navigation, profile area | Exists | Admin and portal layouts; `/admin/profile` |

**Remaining Phase 01 gaps:** the Team Member and Partner roles from the brief are
not implemented — `src/lib/` has no role concept beyond admin and client, and
`team_members` is a marketing-site content table, not an access role. A numbered
migration sequence does not exist. Both are carried into Phase 02.

## Phase 02 — Core Operations

Clients, projects, tasks, deliverables, files, communication.

| Capability | State |
|---|---|
| Client records | `clients`, `/admin/client-portal`, `/admin/crm` |
| Client onboarding | `client_onboarding_submissions`, `/admin/client-onboarding`, `/api/onboarding` |
| Projects | `projects`, `/admin/projects`, `/client-portal/projects` |
| Project requests | `project_requests`, `/client-portal/project-request` |
| Tasks | `tasks`, `/admin/tasks` |
| Deliverables | `project_deliverables`, `/client-portal/deliverables` |
| Files | `project_files`, resumable uploads, per-file signed URLs |
| Messaging | `messages`, `project_messages`, `/admin/messages`, `/client-portal/messages` |
| Notifications | `notifications`, full API with unread counts |

**Phase 02 is a verification phase, not a construction phase.** Proposed tasks:

1. **Schema inspection script** — a read-only SQL script dumping tables, columns,
   foreign keys and RLS flags, so [DATABASE.md](DATABASE.md) can be replaced with
   verified schema instead of call-site inference. Highest value item in the plan.
2. **RLS audit across all 64 tables** — `phase2-security-rls.sql` covers three.
   The posture of the rest is unknown.
3. **Implement Team Member and Partner roles**, if they are still wanted.
4. **Resolve the naming overlaps** flagged in DATABASE.md: `subscribers` vs
   `newsletter_subscribers`, and the three `about_*` section tables.

## Phase 03 — Commercial Operations

| Capability | State |
|---|---|
| Proposals | `proposals`, full lifecycle: create, send, view tracking, approve, request changes, per-file signed URLs |
| Agreements | `agreements`, `/admin/agreements` |
| Pricing | `pricing_packages`, `/admin/pricing` |
| Leads / CRM | `leads`, `/admin/crm`, `/admin/inquiries` |
| Invoices | `project_invoices`, `/client-portal/invoices` — **thin**: no admin invoicing module, no payment provider |

**Gap:** there is no payment integration anywhere in the dependency list. If
Growth OS is to handle commercial workflows end to end, that is a Phase 03
decision that has not been made.

## Phase 04 — Growth Systems

The most developed part of the platform, and the one with no off-the-shelf
equivalent.

| Capability | State |
|---|---|
| Growth assessments | `growth_assessments`, public funnel at `/(focused)/assessment`, admin review, decision endpoint |
| Growth profiles | `growth_profiles`, `growth_profile_pdfs`, client-facing at `/client-portal/growth-profile`, behind `GROWTH_PROFILE_RELEASE_ENABLED` |
| Growth reviews | `growth_reviews`, admin module, completion endpoint |
| Growth intelligence | `growth_opportunities`, `audit_reports`, `/admin/growth-intelligence` |
| Scoring | `growth_scores`, `src/lib/scoring` |
| Program decisions | `growth_program_decisions` |
| Client health | `/admin/client-health` |
| Newsletter / lifecycle email | 5 tables, campaigns, sends, open and click tracking |

**Gap:** the scoring logic in `src/lib/scoring` is two files and is untested.
Scores drive client-facing profiles and program decisions, so this is the single
highest-consequence piece of untested logic in the codebase.

## Phase 05 — AI & Automation

**Nothing exists.** No AI dependency, no `ai/` module, no `workflows/` module.

The brief's constraints on this phase stand and should be honoured when it
begins: AI systems must use approved data only, respect existing permission
boundaries, maintain audit records, have clear stated purposes, and support human
decisions rather than take autonomous action.

The natural first application is the growth cluster — assessment summarisation,
opportunity identification and review drafting — because that is where the
structured data already exists. **This phase should not begin until the Phase 02
schema verification is done**, since an AI layer reading an unverified schema
with unknown RLS posture would inherit every gap beneath it.

## Phase 06 — Refinement & Launch

**Blocked.** The brief requires functional testing, permission testing and error
handling for every major feature. There is currently no test framework, no test
directory, no test script and no CI.

This is the largest structural gap in the project. Given a 46-module admin
surface, a client portal and a security boundary enforced across three layers,
the absence of automated permission tests means every change is verified by hand.

Recommended minimum before launch:
1. A test runner and a `test` script in `package.json`.
2. Permission tests that assert the middleware boundary: anonymous, wrong-role
   and un-2FA'd requests must be rejected for `/admin/*` and `/client-portal/*`.
3. Tests for `src/lib/scoring`, given its consequence.
4. CI running the type check and tests on push.

## Phase ordering note

The brief says not to skip phases and not to build advanced features before
foundations exist. Both rules are honoured by the plan above, but the *content*
of the early phases changes: for this repository, Phases 02–04 are largely about
verifying and hardening what exists rather than building it. The foundation that
is genuinely missing is **testing**, which the brief places in Phase 06. That
ordering should be reconsidered — permission tests are a foundation, not a
finishing step.
