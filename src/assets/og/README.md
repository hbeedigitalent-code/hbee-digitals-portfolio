# Social-preview card assets

Read at request time by `src/lib/site/og-card.tsx` (see `src/app/og/[kind]/[slug]/route.tsx`) and by `scripts/build-og-default.cjs`.

- `Manrope-700.ttf`, `Manrope-800.ttf`, `Inter-500.ttf`: the static Latin instances of the two brand families, downloaded from Google Fonts
  (fonts.gstatic.com). Both families are licensed under the SIL Open Font License 1.1. The site itself loads the same families through `next/font`.
  They are static (not variable) files because the card renderer (`next/og` / Satori) does not support variable fonts.
- `hbee-lockup.png`: the approved lockup `public/brand/hbee-digitals-logo-lockup.png`, trimmed to its content and scaled once. Not redrawn or recoloured.
- `hbee-system.jpg`: the site's own module artwork `public/brand/modules/hbee-system.webp`, flattened onto the card surface colour (#f7f9fc).

Do not add brand artwork that is not already approved in `public/brand/`.
