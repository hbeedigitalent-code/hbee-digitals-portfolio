# ADR-0003 — Scope the public rebuild's design system to its own surface

- **Status:** Accepted (rebuild Phase 1)
- **Date:** 2026-10-04
- **Decided by:** Project owner (Phase 0 / 0.5 decisions), implemented in Phase 1

## Context

The existing CSS custom properties in `src/app/globals.css` and the shared
primitives in `src/components/ui/` serve the public site, Admin and the Client
Portal at once — Admin and the Portal reference the root tokens thousands of
times. The rebuilt public site needs a different, light/Cloud-led visual system
that ignores the global dark-first theme.

Changing existing token values or shared primitives would restyle Admin and the
Portal.

## Decision

1. **Separate surface.** The new public site renders inside
   `[data-surface="site"]` (set by `src/app/(site)/layout.tsx`). All new tokens
   are `--hb-*`, defined only under that selector in `src/styles/site-tokens.css`.
   Existing global tokens are not renamed, removed or re-valued.
2. **Tones, not theme.** Sections choose an environment with
   `data-tone="cloud | white | mist | night | deep"`. The global `.dark` /
   `data-theme` state is not read by the site surface.
3. **Own components.** New public components live under `src/components/site/`.
   `components/ui/*`, `components/Navbar.tsx` and `components/Footer.tsx` are not
   modified; the live routes keep using them until launch.
4. **Fonts.** Manrope (display) is registered in `src/components/site/fonts.ts`
   and applied on the surface wrapper only. Inter stays global.
5. **Tailwind.** `tailwind.config.ts` gains additive `hb.*` colour and
   `hb-display` / `hb-body` font aliases. They resolve only inside the surface.
6. **Specificity contract.** Scoped overrides of global element rules use
   `html :where([data-surface='site']) <el>` (0,0,2): above the global element
   rules, below any single Tailwind utility. Layout helpers (`.hb-container`,
   `.hb-grid`) use zero-specificity `:where()`.
7. **Routes.** Route groups cannot share a pathname, so live pages move from
   `(marketing)` into `(site)` one at a time in the launch phase — never by
   duplication.

## Consequences

- Admin and the Client Portal are visually unaffected by rebuild work.
- Two visual systems coexist until launch; the legacy one is retired only after
  every public route has moved.
- Global rules that leak into every page (`h1–h6` colour, mobile 44px min-size on
  all links, the root layout's `nav { position: fixed }`) are neutralised inside
  the surface rather than changed globally. Removing those globals later is a
  separate decision.
