# Admin Phase A2 — Growth Review, Inquiries & Client Operations

Status: implemented, uncommitted. Presentation and navigation only. No workflow, decision rule, RLS policy, email
or database object was changed. No production SQL.

## A1 closure items

| Item | What was done |
|---|---|
| Password recovery | New `/admin/reset-password` (recovery only). Reuses the Client Portal's mechanism: Supabase recovery email → cookie-backed browser client (PKCE) exchanges the link code → `updateUser({ password })` → the recovery session is signed out → continue to `/admin/login`. States: checking, invalid/expired, choose password, saving, validation errors, success. `/admin/login?reset=1` opens the request form. |
| Security touch | `middleware.ts` and `admin/layout.tsx` exempt **exactly** `/admin/reset-password` (like `/admin/login`) because the emailed link arrives without a session. The page does no data access. 2FA, session and active-admin checks for every other `/admin/*` route are unchanged. |
| Currency | `src/lib/admin/money.ts`. `project_invoices` stores `amount` and `currency` per row. Amounts are formatted in their own currency, never summed across currencies, and rows without a valid currency are counted ("N with no currency recorded") rather than given one. Applies to the dashboard and `/admin/workspace`. |
| Dark mode | Tokens kept. `ADMIN_THEME_TOGGLE_ENABLED = false` in `AdminShell.tsx` hides the toggle and ignores any stored preference. Later task: dark-mode visual QA, then flip the flag. |
| Unlisted routes | Inventory in `docs/admin-unlisted-routes.md`. Audit only. |

## The real Growth Review workflow (from the code)

```text
Public Growth Review form  (POST /api/growth-assessment, Turnstile + rate limit)
→ submit_growth_assessment()  — ONE transaction:
     merchants row (resolved by email; an ambiguous email is stored and flagged for an admin, never guessed)
     growth_assessments row (HGRI + five pillar scores, raw_answers_json)
     merchant_status, growth_reviews row (status 'pending'), queued emails (receipt + admin notice)
→ Admin: /admin/growth-reviews  (queue)  →  /admin/growth-reviews/[id]
     human review: scores, strengths, opportunities, notes      PATCH /api/admin/growth-reviews/[id]
     "Complete review" → POST /api/growth-reviews/[id]/complete  → growth_profiles row prepared
     (completing is NOT approval; a profile already released needs a second explicit confirmation)
→ Programme decision (ProgramDecisionPanel → POST /api/admin/growth-assessments/[id]/decision)
     record_program_decision(): approved | declined | withdrawn, against the admin's own session
     refusals name the missing link: merchant, client, profile, review not completed, unverified history…
     approved + no portal account → portal invitation created, approval email queued, invitation email queued
     declined → one factual email (optional shared message); withdrawn → no automatic email
→ Merchant ↔ client relationship: clients.merchant_id
     portal invitation (merchant accepts while signed in with the invited, verified email) or an audited
     admin link (POST /api/admin/clients/link-merchant, link_client_to_merchant())
→ Client Portal Growth Profile, released only when: approved decision + profile bound to it
     + a linked client + GROWTH_PROFILE_RELEASE_ENABLED
```

Inquiries are separate: `/api/contact` → `contact_submissions` (`is_read` is the only workflow state; the
table stores **no** merchant/client identifier, so an inquiry is never linked to a business record).

### Table relationships used for navigation (stored identifiers only)

- `growth_reviews.merchant_id → merchants.id`, `growth_reviews.assessment_id → growth_assessments.id`
- `growth_assessments.merchant_id`, `growth_profiles.merchant_id / assessment_id`
- `clients.merchant_id → merchants.id`
- Not related: `merchant_accounts` (the Merchants **list** page) is a different table from `merchants`.

## What changed

- **Growth Reviews / Growth Assessments** — one shared `GrowthReviewQueue` (both routes list the same records; each
  assessment has exactly one review). Search, status filters (All / Needs review / Pending / In progress /
  Completed), sort, attention callout, cards with HGRI, classification, review status, "Marked approved/not
  approved" (the *stored* mark, never claimed as a recorded decision). `?merchant=<id>` narrows the queue.
- **Review detail** — sections: Who is this business? / Answers / What did Hbee find? / What has happened? /
  Decision. Pinned save bar with unsaved state. Alerts replaced by in-page notices. After completing, the page
  stays and offers "Open the Growth Profile" (it used to redirect). All endpoints and confirmations unchanged.
- **Programme decision panel** — same logic; adds real links (merchant, portal account, Growth Profile), a plain
  statement of what each decision does, and a decision history.
- **`/admin/growth-assessments/[id]`** — was an older duplicate review editor that only worked with a *review*
  id. It is now a read-only resolver that finds the review by assessment id (or review id) and forwards to the
  canonical page. This fixes dashboard/notification links that passed an assessment id.
- **Inquiries** — master/detail, search, All/Unread/Read, honest error state, confirmation on delete.
  Data access is unchanged (browser read of `contact_submissions`).
- **Merchant record** — assessments + their reviews, Growth Profiles, linked portal account(s), business details.
  Removed links that did not hold up (`growth-assessments/new` has no route; the merchant id was passed where a
  client id belongs). `GET /api/admin/merchants/[id]` gained two read-only fields, `clients` and `reviews`
  (null = "could not be read", shown differently from "none").
- **Client detail** — a link to the merchant record when `clients.merchant_id` is set.
- **Dashboard** — "Growth reviews to do" (reviews still pending/in progress) replaces "Pending assessments";
  recent assessment entries use business names and link to the review.

## Not done in A2

Growth Profiles list/detail, Merchants list, CRM/Clients lists and the other legacy admin areas remain under the
compatibility skin. "Profiles requiring action" is not shown on the dashboard because no stored state defines it.

---

# A2 continuation (branch `feature/admin-workspace-a2`)

| Phase | Outcome | Detail |
|---|---|---|
| 2 Recovery security | Hardened | `docs/admin-password-recovery-staging.md`. Link accepted only on Supabase's `PASSWORD_RECOVERY` event (an existing session never opens the form); the 2FA cookie is cleared when a link is accepted and after the change; sign-out is global; admin password minimum is **12** (`src/lib/admin/password-policy.ts`) on the recovery page and Profile Settings. The Supabase-side minimum must be raised separately (staging first). Real-session tests are written, **not run** |
| 3 Navigation | One entry | "Growth Assessments" removed from the nav; `/admin/growth-assessments` redirects to `/admin/growth-reviews` keeping every query parameter, and still highlights Growth Reviews. `/admin/growth-assessments/[id]` still resolves to the review. Business logic untouched |
| 4 Merchant identity | Mapped | `docs/admin-merchant-architecture.md`. `merchants` = business; `clients.merchant_id` = the only stored person→business link; `merchant_accounts` = sign-up login (id = auth user id). The Merchants page now has **Businesses** (default) and **Sign-up accounts** views. Nothing merged, no SQL |
| 5 Route audit | Documented | `docs/admin-route-security-audit.md`. Unauthenticated `POST /api/sitemap` (file write), `GET /api/backup`, `GET /api/analytics`, `GET /api/google-analytics`; direct-browser table access on several legacy pages. **No fixes applied** — proposed fixes await approval |
| 6 Growth Profiles | Migrated | List + detail on the A2 system. Each profile shows review, programme decision, portal account, invitation and **client visibility** as separate stored facts; never "released" from completion. `GET` routes gained read-only `status` (via `src/lib/admin/profile-context.ts`); `PATCH`/`POST` unchanged |

## Growth Profile status: what each label means

| Label | Source | Not implied by |
|---|---|---|
| Review completed | `growth_reviews.status = 'completed'` (matched by `assessment_id`) | approval, visibility |
| Approved for this profile | merchant's latest `growth_program_decisions` row (highest `decision_seq`) is `approved` **and** its `profile_id` is this profile | completion, `review_status`, Archive flag |
| Portal account linked | `clients.merchant_id = merchant` | an invitation merely existing |
| Invitation open / accepted / expired / revoked | latest `portal_invitations` row (token never read) | a link (acceptance is what creates the link) |
| Visible to client | all four of: approved decision naming this profile, a linked client, release gate on, assessment bound — i.e. what `/api/client-portal/growth-profile` enforces | `is_active` (the portal does not read it) |

A source that cannot be read shows "unknown"; it is never presented as "none".

**Finding:** the Archive / Activate flag does not change what the Client Portal shows for an existing approval
(the portal binds to `growth_program_decisions.profile_id`). The UI now says so before archiving. Withdrawing is a
recorded decision on the review.
