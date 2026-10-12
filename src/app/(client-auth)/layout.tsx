// src/app/(client-auth)/layout.tsx
//
// Shell for the signed-out Client Portal routes: /client-login, /client-signup,
// /client-confirmation and /client-reset-password. The URLs are unchanged (route
// groups do not appear in a URL); what changes is the chrome. These pages used to
// inherit the legacy marketing Navbar/Footer; they now sit on the portal's own
// light-first surface with the Hbee mark and nothing else.
//
// Deliberately NOT here: marketing navigation, the subscribe popup, floating
// WhatsApp, cursor glow. Kept from the marketing layout: consent-gated analytics
// and the cookie banner (same storage key), so measurement behaviour is unchanged.
//
// Authentication itself is untouched: middleware.ts still guards /client-portal/*
// and sends signed-out visitors to /client-login.

import type { ReactNode } from 'react'
import { Suspense } from 'react'
import Link from 'next/link'

import '@/styles/site-tokens.css'
import '@/styles/portal-tokens.css'
import { manrope } from '@/components/site/fonts'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { SiteCookieConsent } from '@/components/site/layout/SiteCookieConsent'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import styles from '@/components/client-portal/auth-shell.module.css'

export default function ClientAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <Suspense fallback={null}>
        <GoogleAnalytics />
      </Suspense>

      <div data-surface="portal" className={`${manrope.variable} ${styles.shell}`}>
        <header className={styles.header}>
          <div className={styles.brand}>
            <HbeeLogo href="/" />
            <p className={styles.context}>
              <span aria-hidden="true" className={styles.node} />
              Client Portal
            </p>
          </div>
          <Link href="/" className={styles.site}>
            hbeedigitals.com
          </Link>
        </header>

        <div className={styles.body}>{children}</div>

        <footer className={styles.footer}>
          <span>© {new Date().getFullYear()} Hbee Digitals</span>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/contact">Contact</Link>
        </footer>

        <SiteCookieConsent />
      </div>
    </>
  )
}
