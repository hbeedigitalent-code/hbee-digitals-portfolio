# Homepage Phase H1 - Hbee Brand Modules

Status: implemented locally, uncommitted, not deployed. Presentation only: no copy, routing, data or SEO changes.

## The flat Hbee Surface
`src/components/site/module/hbee-surface.module.css` is the 2D expression of the module anatomy, for modules that carry real content. It reuses three ideas from the dimensional `HbeeModule`:

1. **Sweep** - one large-radius corner (the D) on an otherwise near-square shell. `.compact` gives small surfaces a restrained sweep.
2. **Open Channel** - a slim line on the top edge, deliberately broken by a **Connection Gap** (the mark's separated stem): solid run, gap, softer continuation. It extends on hover/focus (accent movement, no card lift) and respects reduced motion.
3. **Signal Insert** - the orange capsule, at most one per composition.

Variants: `.base` (outlined, neutral), `.soft` (Mist, blue-led), `.blue` (Royal Blue, the one stronger brand moment; re-points the semantic text roles so existing classes stay legible), `.night` / `.nightOption` (raised on dark). `.rule` is the same channel as a free-standing rule for un-boxed items. Channel colours follow `--hb-structure` / `--hb-structure-soft`, so the same markup works on Cloud, White and Night.

## Where it is used
| Section | Before | After |
|---|---|---|
| Capabilities (3 groups) | three identical Mist slabs | neutral -> blue-led -> Royal Blue, each with Sweep + Open Channel + 01/02/03 marker; Growth carries the Signal Insert |
| Quick diagnostic (6 options + result) | rounded utility boxes | numbered 01-06 (shared with the Conditions rail), Open Channel, compact sweep, capsule widens on hover and turns orange when chosen; result panel gets the channel |
| Problem symptoms (4) | plain blue 2px rule | the same rule with the Connection Gap |

Deliberately unchanged in H1 (the hero and the Problem/Final 3D graphics were then replaced in H2, below): Conditions rail, Growth System track, Principles (already uses the channel motif), Selected Work cards, Insights, Selected Brands.

## H2 (done)
The hero right-side composition and the 3D graphics were addressed in Phase H2, below.

---

# Phase H2 - Canonical 3D module integration and section differentiation

## Assets (public/brand/modules/)
Six individual modules (`brand`, `experience`, `technology`, `creative`, `discovery`, `growth`) and the complete connected system (`hbee-system`), from the supplied transparent PNGs. Processing was non-destructive: only isolated, disconnected alpha-dust fragments (max alpha <= 8/255, i.e. < 3.2% opacity; thousands per image) were dropped, fully transparent margins were trimmed, and the result is stored as lossless WebP with the alpha channel intact. No resize, recolour or filter. Delivery goes through `next/image` (e.g. the 1.0 MB system asset is served at about 48 KB at 640w). The opaque reference images (hub composition, angle study) are not shipped.

## Where each is used (hierarchy is intentional)
| Section | Visual | Why |
|---|---|---|
| Hero | the complete connected system, whole (`HomeHeroSystem`) | the Hero perspective only exists in this artwork, which also carries the central mark, connectors and backing |
| "Growth rarely breaks in just one place" | the six individual modules in a separated, depth-staggered field with connectors and a quiet flat glyph (`HomeModuleField`) | a second narrative state of the same six parts; different camera angle and composition from the Hero |
| "Find what should move next" (final CTA) | the five Growth Review diagnostic areas (`DiagnosticSystem`) | this CTA is about the Growth Review, not the six business modules |

The six Hbee business modules (Brand, Experience, Technology, Creative, Discovery, Growth) and the five Growth Review diagnostic dimensions (Visibility, Conversion, Retention, Authority, Scalability) are two different systems and are never interchanged.

## Motion
Transform-only, all gated on `prefers-reduced-motion: no-preference`: one slow whole-system float and an expanding ring over each baked-in connector node (Hero); independent slow vertical drift per module and node pulses (dark section). The Hero entrance has no opacity step so the image can paint as the LCP. Nothing rotates, scales beyond a rounding step, or filters the artwork.

## Temporary / not final
The final-CTA diagnostic visual is the existing CSS five-module `DiagnosticSystem` reused as-is. It is NOT a canonical 3D asset and uses a different material from the six business modules. It stays until the dedicated diagnostic module assets are produced.

## Recommended next phase: Hbee Diagnostic Module family
Produce five canonical transparent assets (Visibility, Conversion, Retention, Authority, Scalability) with the same material principles as the six business modules (Royal Blue depth, polished edge light, translucent backing, recessed channels, white icon and label, selective orange) but their own labels, icons and meaning, plus a five-module connected-system asset with the Hbee mark and connectors. Then replace `DiagnosticSystem` on `/growth-review` (hero, received and idle states) and on the homepage final CTA in one pass, keeping the orange Signal on the single module the review starts from.

---

# Phase H3 - Scroll motion grammar, sequencing and footer separation

## Mechanism (extended, not replaced)
Same as the existing site motion: a `SiteReveal` group flips `data-revealed` once (IntersectionObserver, disconnects after the first reveal, so nothing replays), hidden start states exist only under the pre-paint `data-motion-ready` gate (so no-JS, reduced motion and failed hydration simply show content), compositor properties only. New: scrolled-past content is also revealed, so a fast scroll or anchor jump can never leave it hidden.

## Families (site-tokens.css, "H3 motion families")
`eyebrow` (left-to-right wipe) · `headline` (masked line reveal; `SiteDisplayHeading lines=[...]`) · `soft` (paragraph fade-up) · `item` (list/sequence entry) · `rule` · `card` (rise with a hint of depth) · `visual` (fade + scale) · `rail` + `step` (Growth System). Stagger ~90 ms text / ~140 ms cards (60 / 90 ms and 10px travel on phones). No bounce, spin, typing or looping.

## Section order
Eyebrow -> headline lines -> body -> list/cards/visual -> CTA. Conditions: items 01-06 down a rail that draws downward. Growth System: heading, rail draws, steps 01-05 follow it, the orange signal starts only once the rail has begun. Capabilities/Selected work/Insights: cards rise in sequence. Final CTA: eyebrow, headline, body, controls, then the diagnostic visual; the diagnostic's own assemble/connect/signal now waits for that reveal (scoped to the homepage via `data-gate-motion`; /growth-review is unchanged).

## CTA -> footer
The footer is a deeper navy than the CTA's Night (`#030a15` vs `#061426`), has an electric top edge with a soft glow under it, one orange signal on the divider aligned with the page content edge, and more air above its content.

Kept static on purpose (existing guards): the testimonials section is not reveal-gated, and the footer boundary path stays a static Royal Blue line (the CTA/footer separation comes from the deeper surface, the electric top edge, the orange signal and the added space).
