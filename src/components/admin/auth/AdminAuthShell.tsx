import type { ReactNode } from 'react'
import Link from 'next/link'

import '@/styles/site-tokens.css'
import '@/styles/admin-tokens.css'
import { manrope } from '@/components/site/fonts'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { HbeeModuleGlyph } from '@/components/site/module/HbeeModule'
import styles from './admin-auth.module.css'

/**
 * Signed-out Admin entrance (Phase A1): the login screen and the 2FA challenge both sit inside it.
 *
 * Related to the Client Portal entrance (the same Cloud grid canvas, the Hbee mark and orange node) but
 * clearly the internal product: a Night "Hbee Administration" panel beside the form. LOGIN ONLY: there is
 * no sign-up and no "create account" control anywhere in this shell; admin access is provisioned.
 */

export function AdminAuthShell({ children }: { children: ReactNode }) {
  return (
    <div data-surface="admin" data-admin-theme="light" className={manrope.variable}>
      <div className={styles.shell}>
        <aside className={styles.panel}>
          <div className={styles.panelTop}>
            <span className={styles.brand}>
              <HbeeLogo onDark withName={false} href="/" />
              <span className={styles.wordmark} aria-hidden="true">Hbee Digitals</span>
            </span>
            <Link href="/" className={styles.siteLink}>hbeedigitals.com</Link>
          </div>
          <div className={styles.panelCopy}>
            <p className={styles.context}><span aria-hidden="true" className={styles.node} />Hbee Administration</p>
            <p className={styles.panelTitle}>The internal workspace for the Hbee team.</p>
            <p className={styles.panelText}>Website content, growth reviews, clients and delivery, in one place. Access is provisioned by Hbee for team members only.</p>
          </div>
          <p className={styles.panelFoot}>Authorised use only. Sign-in activity is protected by the same session and verification controls as the rest of Hbee.</p>
          <HbeeModuleGlyph signal="quiet" className={styles.panelGlyph} />
        </aside>

        <div className={styles.formSide}>
          <main id="main-content" className={styles.formBody}>{children}</main>
          <footer className={styles.footer}>
            <span>Hbee Administration</span>
            <Link href="/client-login">Client Portal sign in</Link>
            <Link href="/">Back to the website</Link>
          </footer>
        </div>
      </div>
    </div>
  )
}
