# Phase S1 — Semantic Services Architecture (FINAL DECISION APPLIED)

**Owner decision supersedes sections 0 and B below.** The six live slugs are kept (no DB migration, no redirects, no new artwork). Three deliberate layers: module identity (Brand, Experience, Technology, Creative, Discovery, Growth) · capability name · explicit page H1.

| Module | Capability name | Route (unchanged) |
|---|---|---|
| Brand | Brand & Positioning | /services/brand-positioning |
| Experience | Website & Conversion | /services/commerce-experience |
| Technology | Digital Systems & Analytics | /services/digital-systems |
| Creative | Creative & UGC | /services/creative-ugc |
| Discovery | Traffic & Visibility | /services/discovery-traffic |
| Growth | Retention & Customer Value | /services/retention-growth |

Product & Offer is a service area inside Website & Conversion (anchor `#product-and-offer`), connected to Brand & Positioning. Analytics & Diagnostics lives primarily in Digital Systems & Analytics and connects to /growth-review. No seventh or eighth module. Implemented first pass: shared model (`capability-entities.ts`), `CapabilityModuleCard`, `/services`, `/services/commerce-experience`. Remaining pages: see the "Remaining" list in the S1 report. The original audit follows unchanged.

---

# Phase S1 — Semantic Services Architecture + Capability Module Upgrade

Status: audit and architecture proposal. No code changed, nothing committed, pushed, deployed or run against a database.
Evidence labels: **[code]** read in the repo this session · **[inferred]** follows from code but not run · **[unproven]** needs DB/production/owner confirmation.

## 0. Blocking finding — three competing "six" systems

| System | Names | Where it lives | Status |
|---|---|---|---|
| Live capability routes | Brand & Positioning · Digital Systems · Creative & UGC · Discovery & Traffic · Commerce Experience · Retention & Growth | `services-content.ts`, `capability-content.ts`, nav, footer, sitemap, Work classification, `portfolio_capabilities` DB check constraint **[code]** | Live, owner-approved ("approved Services capability system") |
| 3D homepage modules | Brand · Experience · Technology · Creative · Discovery · Growth | `public/brand/modules/*.webp`, `SystemModule` type, `HomeModuleField`, `CapabilityFocusSystem` **[code]** | Live on homepage / capability heroes |
| S1 brief "canonical" | Brand & Positioning · Website & Conversion · Product & Offer · Traffic & Visibility · Retention & Customer Value · Analytics & Diagnostics | this brief | Proposed |

The brief and the live system overlap on only two of six (Brand & Positioning; Retention). Adopting the brief's names as slugs would:
- break six live URLs (SEO loss unless 301s), nav, footer, sitemap, Work cards;
- require a **production DB migration**: `portfolio_capabilities.capability_slug` has a `check (... in (6 live slugs))` **[code: scripts/portfolio-creative-01-forward.sql:77]** and `CAPABILITY_SLUGS` in `src/lib/portfolio-creative.ts:13`;
- orphan the six 3D module assets, which have no Product & Offer or Analytics & Diagnostics artwork.

**Recommendation (needs owner decision): keep the six live slugs, add semantic H1/definition layers, and map the brief's entities onto them.** See B. Analytics & Diagnostics has no live equivalent and is the one real content gap.

## A. Existing route / entity map

| Route | Source | Notes |
|---|---|---|
| `/services` | `(site)/services/page.tsx` + `components/site/services/*` | Hero, capability system (3 groups × 2), method, work, CTA, FAQ (4 Qs). Metadata via `pageMetadata`. **No JSON-LD** on this page. |
| `/services/[capability]` ×6 | `(site)/services/[capability]/page.tsx`, `dynamicParams=false` | `brand-positioning`, `digital-systems`, `creative-ugc`, `discovery-traffic`, `commerce-experience`, `retention-growth`. Service + BreadcrumbList JSON-LD present. Sections: Hero, Opportunity, What we do, Work/Insights, System fit, FAQ (3 Qs), CTA. |
| `/services/creative-ugc` | same template | Not a special route; it is one of the six. |
| `/growth-review` | `(site)/growth-review`, `growthReviewHref(constraint)` | Diagnostic route; `?constraint=` helper exists. |
| `/work`, `/work/[slug]`, `/case-studies` | `(site)/work`, `(site)/case-studies` | Capability↔Work link via `portfolio_capabilities` + `getCapabilityWork`. |
| `/insights/[slug]` | `(site)/insights` | Capability→Insight via `insightSlugs`; existence of those 9 slugs in the DB is **[unproven]**. |
| `(marketing)/pricing, /faq, …` | legacy group | Pricing/service-package links are in the legacy marketing layout; not audited for overlap. |

Existing JSON-LD: Organization + WebSite (`StructuredData.tsx`, site layout), Service + BreadcrumbList on capability pages, article schema on Insights. `FAQPage` exists only in legacy `(marketing)/faq` **[code]**. Sitemap includes `/services` (0.9) and all six capability routes **[code]**. Canonical/OG via `pageMetadata` **[code]**.

Gaps **[code]**: services hub has no BreadcrumbList/WebPage schema; capability JSON-LD lacks `serviceType`, `audience`; titles are keyword-led but H1s are slogans ("From interest to purchase."), so the H1 does not name the service; no direct-answer paragraph; FAQs are 3 per page; no symptom→capability routing; no Analytics & Diagnostics page.

## B. Proposed canonical capability architecture (mapped, URLs preserved)

| Brief entity | Live slug (kept) | Semantic H1 (proposed) | Module (3D asset) | Change |
|---|---|---|---|---|
| Brand & Positioning | `brand-positioning` | Ecommerce Brand Positioning & Messaging | Brand | rename none; deepen |
| Website & Conversion | `commerce-experience` (+ storefront half of `digital-systems`) | Shopify Website & Conversion Optimization | Experience | **owner decision: slug stays `commerce-experience`; display name "Website & Conversion"?** |
| Product & Offer | no live equivalent (partly `creative-ugc`, `commerce-experience`) | Product Presentation & Offer Strategy | none | **new route + new module asset** |
| Traffic & Visibility | `discovery-traffic` | Shopify SEO & Ecommerce Traffic | Discovery | display-name only |
| Retention & Customer Value | `retention-growth` | Shopify Retention & Lifecycle Email | Growth | display-name only |
| Analytics & Diagnostics | none (closest: `/growth-review`) | Ecommerce Analytics & Growth Diagnostics | none | **new route + new module asset** |
| (cross-capability) | `creative-ugc` | UGC & Creator-Led Ecommerce Content | Creative | keep; tag to Traffic, Website, Product |
| Digital Systems | `digital-systems` | Shopify Store Development & Redesign | Technology | **owner decision: fold under Website & Conversion, or stay a separate build-focused service?** |

This yields 8 pages (6 brief entities with `digital-systems` and `creative-ugc` as sub-services) versus 6 live. Fully replacing live names is a larger, riskier change than the brief's goals require.

## C / M. Search intent & question map (per capability; questions answered inline, FAQ schema NOT used)

- **Website & Conversion** — Definition: What does a Shopify conversion audit examine? · Problem: Why does a store get traffic but not sales? · Evaluation: When should a Shopify store be redesigned? · Comparison: Redesign vs CRO; fix traffic or conversion first? · Commercial: What should I expect from a conversion engagement? · Diagnostic: What should be fixed before raising ad spend?
- **Brand & Positioning** — What is ecommerce brand positioning? · Why does it affect conversion? · How do I know mine is unclear? · Brand strategy vs visual identity.
- **Product & Offer** — Why do shoppers view but not buy? · What makes an offer stronger? · Product strategy vs promotion · How to bundle/merchandise.
- **Traffic & Visibility** — Why no organic traffic? · Traffic or conversion first? · How do search and product pages work together? · Which sources fit an ecommerce brand? (Define "WTO" wherever used.)
- **Retention & Customer Value** — Which email automations should a store have? · What is ecommerce retention? · How to raise repeat purchase? · When to build lifecycle email?
- **Analytics & Diagnostics** — Which metrics to track? · How to diagnose a non-growing store? · Traffic, conversion or retention first? · What is an ecommerce growth audit?
- **Creative & UGC** — What is UGC for ecommerce? · Does it help? · What makes a good UGC ad? · UGC vs influencer marketing · UGC on product pages.

Existing FAQs already answer ~14 of these partly (see N). Net-new questions are ~3–5 per page; answers placed inside the relevant section, direct answer first.

## D. Services hub structure

1. Hero — H1 answers "What does Hbee Digitals help ecommerce brands with?" in 2 sentences, before creative language.
2. Connected growth system — six modules as real `<a>` links with HTML labels; flow Brand → Offer → Experience → Visibility → Retention → Measurement; "not every merchant needs every capability" kept (existing `notBundle`).
3. Merchant symptoms — 7 symptoms, each an anchor to the relevant capability section.
4. Capabilities — definition, example problems, core work, contextual CTA (descriptive anchors).
5. How capabilities connect — why isolated fixes fail (reuse `METHOD_INTRO`).
6. Proof — `ServicesWork` (exists).
7. Diagnostic route — Growth Review with `?constraint=`.
8. Questions — 4 existing + 3–4 cross-capability.
Add schema: `WebPage` + `BreadcrumbList` + `ItemList` of the capability Service entities.

## E. Capability page structure (extends existing template, same component)

Hero (semantic H1 + 2–4 sentence direct answer) → "What it looks like when broken" (symptoms) → "What we diagnose" → "What we do" → "Why it matters" → "How it connects" (related modules) → Proof → Process → Questions → Next step. Existing sections map: Opportunity→symptoms+why, Approach→what we do/process, SystemFit→how it connects, FAQ→questions, CTA→next step. **New fields only: `definition`, `symptoms[]`, `diagnose[]`, `questions[]` (grouped by intent).** No new template.

## F–I. Module upgrade specification

- Data: one `CAPABILITY_MODULES` record per capability: name, descriptor, problem, href, module asset key, neighbours[]; single source feeding hub, detail page, nav and footer (replaces duplicated strings).
- Hub: all six modules via existing `HbeeModuleGroup`/`HomeModuleField` pattern; each wrapped in an `<a>` with HTML label + descriptor in DOM (text never only in the image); hover/focus extends Open Channel (already in `hbee-surface`); neighbour connectors highlighted on focus.
- Capability page: `CapabilityFocusSystem` (exists) – active dominant, related at mid scale, unrelated receded; related ones become anchors with descriptive text ("Explore Website & Conversion").
- Mobile: no constellation; vertical stack — active module, one-line explanation, then related-capability list as full-width links (44px targets); optional horizontal scroll-snap row of neighbours, still real anchors.
- Assets: Product & Offer and Analytics & Diagnostics need new 3D artwork matching the existing material rules; until delivered, use the flat `hbee-surface` module with a glyph (labelled as temporary).

## J. Entity / internal-link graph

Services ⇄ each capability · capability ⇄ 2–3 related capabilities (hand-defined, not all-to-all) · capability → Work via `portfolio_capabilities` · capability → Insight via `insightSlugs` (only where it expands an answer) · every capability → `/growth-review?constraint=<slug>` · Work cards → capability (exists via `capabilityRefs`). Anchor text descriptive; ban "Learn more".

## K. Structured data plan

- Keep Organization + WebSite.
- Hub: `WebPage`, `BreadcrumbList`, `ItemList` → Service ids.
- Capability: keep `Service`; add `serviceType`, `audience` (Audience: ecommerce brands / Shopify merchants), `areaServed` **only if the owner confirms** (unproven; omit otherwise). No `offers`, price, review or rating — none exist on the pages.
- FAQ: no FAQPage (Google restricts FAQ rich results to a few authoritative sites; questions are content, not markup).
- All schema fields must be derivable from rendered text.

## L. Metadata / semantic HTML

Titles already keyword-led on capability pages; hub title "Services & Capabilities" is weak → "Ecommerce Growth Services for Shopify Brands". One H1 naming the service, H2 per section phrased as meaning-bearing headings, lists for symptoms/diagnostics, canonical + OG via `pageMetadata` (exists), sitemap entries exist. Add new routes to `CAPABILITY_DETAILS` → sitemap and `generateStaticParams` follow automatically **[code]**. Image alt: module alt derives from the descriptor.

## N. Reusable existing content

Per-capability `opportunity`, `approach`, `systemFit.relations`, 16 FAQ answers (e.g. "Do I need more traffic or a better conversion experience?", "What is Shopify conversion optimization?", "Is retention only email marketing?"), `METHOD_STAGES`, `notBundle`, 9 mapped Insights, `SERVICES_FAQ`. Homepage `home-content.ts` symptoms can seed the hub symptom list.

## O. Missing content / evidence

- Analytics & Diagnostics and Product & Offer: no copy, no assets, no Work mapping.
- Hbee-specific first-party insight (what you inspect, priority rules, common patterns): needs owner/founder input; none exists in the repo in structured form. No client statistics will be invented.
- areaServed, pricing/engagement facts: [unproven].
- Whether the 9 `insightSlugs` are published: [unproven].
- Growth Review `constraint` values vs capability slugs: not mapped.
- Tooling gap: `plugin:marketing:ahrefs` and similar are unauthenticated, so no keyword-volume validation is possible in this session.

## P. Implementation phases

1. S1a — semantic data layer (`CAPABILITY_MODULES`, definitions, symptoms, diagnose lists) — types + tests, no visual change.
2. S1b — Website & Conversion page (on `commerce-experience`) rewritten to the new structure; template gains optional sections.
3. S1c — Services hub: direct-answer hero, symptom routing, linked module system, schema.
4. S1d — remaining existing capabilities rolled onto the template.
5. S1e — Product & Offer and Analytics & Diagnostics (new routes; needs DB constraint migration only if they must be assignable to Work; the SQL would be proposed, not run).
6. S1f — mobile module sequence + QA (Lighthouse, rich results test, link crawl).

## Q. Implement first

S1a + S1b: the semantic data layer and the Website & Conversion page on the existing `/services/commerce-experience` URL, with the template extended in place. It needs no DB change, no URL change and no new 3D assets, and it validates the reusable structure before the hub and new pages are built.

## Decisions needed from the owner

1. Keep the six live slugs and map the brief's entities onto them (recommended), or migrate to the brief's six (URL redirects + DB constraint migration + new assets)?
2. Is Website & Conversion the display name for `commerce-experience`, and does `digital-systems` fold under it or stay separate?
3. Are Product & Offer and Analytics & Diagnostics new pages now, or deferred until their module assets exist?
4. Which worktree? AGENTS.md names `C:\Users\ADDIS\hbee-worktrees\rebuild-public-experience` (clean, at `0e36698`); this session is in the main checkout on `feature/admin-workspace-a2`, which holds uncommitted homepage-module and portfolio changes. Services code should be built where those H1/H2 module changes live.
