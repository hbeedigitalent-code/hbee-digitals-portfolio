# Merchant identity: `merchants`, `merchant_accounts`, `clients`

Investigation only (Phase 4). Evidence is the application code and the migration scripts in the repository.
No database was queried and no SQL was run. Where the repository cannot show something (foreign keys, nullability,
row counts) it is listed under "Not verifiable from the repository".

## Relationship map

```text
auth.users  (a person's login)
   │ id
   ├──────────────► merchant_accounts.id          the SIGN-UP PROFILE of that login
   │                  business_name, contact_name, email (unique), whatsapp, website_url, country,
   │                  industry, status ('active' at creation), email_verified
   │                  created by provisionAccount() at email confirmation; NO merchant_id, NO client link
   │
   └──────────────► clients.user_id               the PORTAL ACCOUNT of that login
                      full_name, email, business_name, website_url, whatsapp, country, status, …
                      clients.merchant_id  (nullable)  ───────────────┐   the ONLY stored link
                                                                      │   person → business
                                                                      ▼
public Growth Review form ──► submit_growth_assessment()      merchants.id   the BUSINESS record
   resolves the submitted email to a merchant                    business_name, contact_name, email, website,
   (ambiguous email → stored unresolved,                         industry, country, business_stage, store_age
    an admin chooses via resolve-merchant)                                │
                                                                          ├─ growth_assessments.merchant_id
                                                                          ├─ growth_reviews.merchant_id   (NOT NULL)
                                                                          ├─ growth_profiles.merchant_id (+ assessment_id)
                                                                          ├─ merchant_status.merchant_id (lifecycle)
                                                                          ├─ portal_invitations.merchant_id
                                                                          └─ growth_program_decisions (merchant at decision time)
```

## What each table is

| Table | Represents | Keyed by | Created by | Authoritative for |
|---|---|---|---|---|
| `merchants` | A **business** that submitted a Growth Review | its own id; matched by submitted email | `submit_growth_assessment()` | **Business identity** and everything in the Growth Review workflow |
| `clients` | A **portal account** (one login) | `user_id` = auth user id | `provisionAccount()` at email confirmation | Who can sign in, and — via `merchant_id` — **which business** they belong to |
| `merchant_accounts` | The **sign-up profile** of one login | `id` = auth user id | `provisionAccount()` at email confirmation | Nothing downstream. It duplicates profile fields that `clients` also carries |

The Client Portal documents the only authoritative chain as `auth.uid → clients.user_id → clients.merchant_id`
(`src/app/api/client-portal/growth-profile/route.ts`). It explicitly stopped resolving by email match
(`merchants.email`, `merchant_accounts.email`) or by user metadata, because those could be manipulated or guessed.

## Findings

1. **The admin "Merchants" list is a list of sign-up logins, not businesses.** It reads `merchant_accounts`. The merchant
   *detail* page (`/admin/merchants/[id]`) reads `merchants`. Different tables with different ids, so a list row can
   never open a detail page. This is why nothing linked there before.
2. **`merchant_accounts` has no stored relationship to `merchants` or `clients`** other than sharing the auth user id
   with `clients.user_id`. Connecting a sign-up row to a business would require an email match — which is the pattern
   the portal deliberately removed — or following `clients.user_id = merchant_accounts.id` then `clients.merchant_id`.
   The latter is a real, stored chain and is what the new list uses.
3. **`merchant_accounts.status` ('active') is not programme approval.** `provision-account.ts` says so explicitly. Showing
   it as a status next to businesses would mislead.
4. **Many logins, one business is possible; one login, one business is the intent.** `clients.user_id` currently has a
   non-unique index (per `provision-account.ts`), so more than one client row per login is possible; the code refuses to
   guess and reports "ambiguous".
5. **A business with no linked client is normal** (every assessment submitter before they accept an invitation).
6. **The merchant→client direction is not unique either**: `clients.merchant_id` is not unique, so several clients
   could point at one merchant. The admin UI already shows "More than one portal account is linked".

## Decision applied to the Merchants list (no data changed)

- **Authoritative source for "merchant identity": `merchants`.** Authoritative source for "linked account": `clients.merchant_id`.
- The Merchants page now has two clearly labelled views:
  - **Businesses** (`merchants`) — default. Each row opens the merchant record. Shows lifecycle status from
    `merchant_status`, reviews needing attention, and whether a portal account is linked (a count of `clients` rows whose
    `merchant_id` is that merchant).
  - **Sign-up accounts** (`merchant_accounts`) — the previous list, unchanged in content, relabelled. Rows show whether the
    login has a portal account (`clients.user_id = merchant_accounts.id`) and, **only if** that client has a `merchant_id`, a
    link to that business. Otherwise it says nothing is linked. No email matching, no name matching.
- A read-only `view` parameter was added to `GET /api/admin/merchants` (enumerated, defaults to the old behaviour).
  No endpoint writes anything; no SQL; no records merged.

## Not verifiable from the repository

- Foreign keys: whether `merchant_status.merchant_id`, `growth_reviews.merchant_id` etc. are declared FKs (queries here
  join in application code instead of relying on PostgREST embeds for this reason).
- Whether `merchant_accounts` has any column not used by the code, or any trigger that sets a merchant link.
- Row counts, duplicates, orphaned `merchant_accounts` without `clients`, or `clients` without `merchant_accounts`.

### Suggested read-only checks for staging (proposed, NOT run — needs approval)

```sql
-- Counts only; no data is modified.
SELECT 'merchants' t, count(*) FROM public.merchants
UNION ALL SELECT 'merchant_accounts', count(*) FROM public.merchant_accounts
UNION ALL SELECT 'clients', count(*) FROM public.clients
UNION ALL SELECT 'clients with merchant_id', count(*) FROM public.clients WHERE merchant_id IS NOT NULL
UNION ALL SELECT 'merchant_accounts without a client', count(*) FROM public.merchant_accounts a WHERE NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.user_id = a.id)
UNION ALL SELECT 'merchants linked to >1 client', count(*) FROM (SELECT merchant_id FROM public.clients WHERE merchant_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) x
UNION ALL SELECT 'logins with >1 client row', count(*) FROM (SELECT user_id FROM public.clients WHERE user_id IS NOT NULL GROUP BY 1 HAVING count(*) > 1) y;
```

## Risks to take to the owner

- Two near-duplicate profiles (`merchant_accounts`, `clients`) can drift; neither is the business record.
- Anyone who reads "Merchants" in the nav as "businesses" was seeing logins. The new default fixes the meaning; the
  nav label stays "Merchants".
- Consolidating `merchant_accounts` into `clients` (or dropping it) is a database decision, deliberately not made here.
