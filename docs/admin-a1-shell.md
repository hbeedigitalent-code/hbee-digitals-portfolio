# Admin Phase A1 — Shell, Dashboard & Authentication

Status: implemented, uncommitted. Scope: presentation and information architecture only. No authentication,
database, RLS, storage or Client Portal behaviour was changed.

## Design system

`[data-surface='admin']` joins `site` and `portal` in the shared Hbee palette block of
`src/styles/site-tokens.css` (additive selector). `src/styles/admin-tokens.css` adds:

- semantic `--ad-*` roles (canvas, surface, border, ink/body/muted, accent, signal, success/warning/danger);
- a legacy-variable alias layer (`--bg-card`, `--text-primary`, `--accent`, …) so the ~80 unmigrated admin
  pages are re-skinned without edits;
- a `data-admin-theme='dark'` variant (toggle persisted in `localStorage` key `hbee-admin-theme`);
- a reset of the global fixed `<nav>` rule inside the surface.

Royal Blue = structure/active state; Orange = primary action and "needs attention" signals; neutral
surfaces and clear borders; restrained shadows. Glossy 3D homepage modules are deliberately not used.

## Components

`src/components/admin/shell/` — `AdminShell` (sidebar, topbar, mobile drawer), `admin-nav.ts` (single nav source).
`src/components/admin/ui/AdminUi.tsx` — `AdminPageHeader`, `AdminCard`, `AdminSection`, `AdminMetric`,
`AdminActionBar(+Status/+Actions)`, `AdminNotice`, `AdminEmptyState`, `AdminErrorState`, `AdminLoadingState`,
`AdminStatusBadge`, `AdminButton`, `adminBtn()` class helper.
`src/components/admin/auth/AdminAuthShell.tsx` — login and 2FA layout.

## Authentication (unchanged behaviour)

Login only; no sign-up/"create account" anywhere. Browser check in `layout.tsx` (session + active `admin_users`
row), middleware remains the authoritative boundary (session, active admin, signed 2FA cookie), 2FA challenge
stays at `/admin-2fa-challenge`, logout = POST `/api/admin/logout` then `signOut()`.

## Navigation

Six groups (Overview, Growth, Clients & Delivery, Website Content, Inbox, Account) containing exactly the 36
routes of the previous sidebar. `UNLISTED_ROUTES` records admin routes that exist on disk but were never linked.

## Tests

`node scripts/test-admin-shell.cjs` covers nav integrity (same routes, all real), active matching, login-only
guarantees, preserved auth logic, token coverage, dashboard honesty and primitive rendering.

## Future Admin UX notes

- Migrate remaining pages onto `AdminPageHeader`/`AdminSection` one area at a time (Growth Reviews, Clients, Blog).
- Pricing pages (`/admin/pricing*`) use hard-coded navy cards and a green accent; migrate to tokens.
- Add the missing `/admin/reset-password` page (the login reset email redirects there; no page exists).
- Dashboard currency is rendered as `$`; confirm the intended currency with the owner.
- Consider a command palette / global search once more areas share the shell.
