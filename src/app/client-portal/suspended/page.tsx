// src/app/client-portal/suspended/page.tsx
//
// Where middleware sends a suspended portal account. The visible state is rendered by PortalAuthGate (which
// shows it for every portal route when /api/client-portal/me answers 403 suspended), so this page has no body
// of its own: it exists so the redirect target is a real route.

export default function PortalSuspendedPage() {
  return null
}
