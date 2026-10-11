// src/app/client-portal/layout.tsx
//
// Client Portal layout (Phase 18.1). Declares the portal's own scoped surface
// ([data-surface="portal"]) — the Hbee palette, light-first — and hands the rest
// to PortalAuthGate (the unchanged browser-side session + client lookup) and
// PortalShell (the left navigation, bell/profile controls and mobile drawer).
//
// Server-side protection is NOT here: middleware.ts guards /client-portal/*
// before this renders, exactly as before.

import type { ReactNode } from 'react'

import '@/styles/site-tokens.css'
import '@/styles/portal-tokens.css'
import { manrope } from '@/components/site/fonts'
import { PortalAuthGate } from '@/components/client-portal/PortalAuthGate'

export default function ClientPortalLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="portal" className={manrope.variable}>
      <PortalAuthGate>{children}</PortalAuthGate>
    </div>
  )
}
