# Footer/newsletter Phase 2 — local implementation, activation pending

The production-evidence reconciliation in [newsletter-security-review.md](newsletter-security-review.md)
and its four `scripts/newsletter-security-*.sql` artifacts supersede the original
additive-only database sketch below. No SQL has been run. Final consent names are
`consent_given_at`, `consent_source`, `consent_version`; no boolean is fabricated.

## Architecture conclusion (repository audit before implementation)

Evidence is repository source, not a live database inspection. No database request, SQL,
email send, deployment or production mutation was made for this work.

| System | Classification | Evidence / decision |
| --- | --- | --- |
| `newsletter_subscribers` | ACTIVE / REUSABLE | `/api/subscribe`, `/admin/subscribers`, `/admin/newsletter`, campaign audience selection and `/api/unsubscribe` already converge here. Reuse this list. |
| `/api/subscribe` | REUSABLE, requires repair | Anonymous DB client, weak validation, no consent/abuse guards; duplicate constraint errors incorrectly report success regardless of stored status. Harden this existing endpoint. |
| `subscribers` | LEGACY | `NewsletterSubscribe`, analytics/export/backup and the old `/unsubscribe` page reference this different list. Do not merge, copy or delete records during this phase. |
| Legacy footer / `SubscribePopup` | LEGACY, reachable on marketing-group routes | Existing `/api/subscribe` callers; popup uses 45 seconds, session dismissal and `hbee_subscribed`. Not mounted on `(site)`. Do not restore legacy visuals. Legacy submissions without explicit consent now fail safely. |
| `BlogNewsletterSignup`, `NewsletterSection`, `NewsletterSubscribe` | DISCONNECTED from active site | No imports found in active site routes. `NewsletterSection` simulates success: do not reuse it. |
| `site_settings` | ACTIVE / REUSABLE | `settings_key='site'` is the application canonical selector. Existing admin mapping stores `contact_email`, `footer_description`, and `social_*`. Contact/description remain managed there. |
| `footer_settings.social_links` | REUSABLE | Existing `/admin/footer` already stores platform, URL, icon, `is_active`. Use it for footer visibility; no second social collection. Keep legacy columns and unrelated JSON entries. |
| `site_settings.social_*` | ACTIVE legacy settings, DISCONNECTED from new footer | Preserve those values. Explain that footer profiles are managed in `/admin/footer`; do not silently combine conflicting sources. |
| Newsletter content / enable / delay configuration | MISSING verified storage | Propose one JSON column on the existing canonical site-settings row. No new settings table. |
| Durable explicit subscription consent | MISSING verified evidence | Propose nullable consent columns on the canonical subscriber table. Never backfill historical consent as true. |
| Resend | ACTIVE | Campaign delivery and transactional email. Subscribe only persists opt-in; no automatic email or provider call is added. Existing campaign unsubscribe remains authoritative. |
| Klaviyo | MISSING integration | Searches found icons/technology branding, no API/provider/popup implementation or concrete plan. Do not invent a provider or create a second list. |
| Turnstile / Upstash / email validation | ACTIVE / REUSABLE | Contact/onboarding security helpers, existing widget and `validateEmail`. Reuse them. |
| Storage / modal behavior | REUSABLE patterns | Existing popup safe storage/session suppression, cookie-consent events, and modal Escape/focus restoration patterns. New site popup uses native modal dialog semantics. |

## Chosen pipeline

Footer and site popup -> one shared `NewsletterForm` -> `POST /api/subscribe` ->
same-origin JSON + bounded input + explicit versioned consent + named distributed
rate limit + fail-closed Turnstile -> server-only service client -> existing
`newsletter_subscribers` -> existing subscriber admin/campaigns -> existing
`/api/unsubscribe` status update. No automatic Resend sends or Klaviyo calls.

New subscription inserts record server consent time/version. Duplicates are checked:
only an already-active record may report already subscribed. Opted-out/bounced records
are not reactivated or rewritten. DB errors never report success. Historical consent
remains unknown; no invented analytics, attribution, IP collection or consent backfill.

Footer navigation/legal/wordmark/boundary/motif remain code-owned. Existing site settings
own contact/description; existing footer settings own social enable/URL state. Newsletter
configuration is additive. Missing/invalid configuration disables both capture surfaces.
Public settings use a 60-second Next data cache/ISR refresh, followed by a page reload;
subscription guards use uncached server reads. If multiple footer records exist, reads
fail safely rather than choosing an arbitrary first record. No second record is inserted.

## Superseded additive sketch — DO NOT EXECUTE IN ISOLATION

Before applying: verify actual table/column types, canonical settings uniqueness,
normalized unique subscriber email constraint, defaults, privileges and RLS. Repository
call sites are not schema proof. Audit existing duplicate/mixed-case emails without
modifying them. Stop if uniqueness or defaults differ; do not silently deduplicate.

Use the reviewed staged forward/security plan instead of an isolated additive SQL
snippet. It also hardens grants/RLS and introduces a service-only normalized identity
lookup; browser subscriber administration moves behind the existing active-admin gate.
There is no default enablement, subscriber-row update, consent backfill or new list.
The application supports `newsletter_settings` version 1, for example (not applied):

```json
{"version":1,"headline":"Growth thinking, delivered occasionally.","description":"Insights on brand, commerce, creative and digital growth. No noise. Just useful thinking.","popup_headline":"Stay connected to what moves growth.","enabled":false,"footer_enabled":false,"popup_enabled":false,"popup_delay_seconds":240}
```

Activation requires both `enabled: true` and the reviewed surface switch. Enable only
after schema, real RLS, email uniqueness, unsubscribe and configured Turnstile/Upstash
are owner-verified in the target environment. API insert/read failures
fail closed. Existing authenticated-admin RLS must authorize settings writes and subscriber
visibility; anon must never SELECT subscribers. The security reconciliation removes
direct browser subscriber access, including authenticated admin-browser access, and
keeps administration working through the protected server API.

Rollback: disable both switches first, revert application code if necessary, retain
consent evidence. Do not drop populated consent columns as routine rollback. Removing
unused new columns requires a separate approved, backed-up database change.

## Review limits

No production verification. Offline mocked checks cannot prove deployed schema/defaults,
RLS, provider credentials, browser-native modal behavior or rendered responsive geometry.
Phase C and all case-study/media schema work remain untouched.
