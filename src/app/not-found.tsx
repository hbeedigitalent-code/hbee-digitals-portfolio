import type { Metadata } from 'next'
import '@/styles/site-tokens.css'
import { manrope } from '@/components/site/fonts'
import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { SiteNotFound } from '@/components/site/not-found/SiteNotFound'

// Next.js emits the not-found noindex directive; clear inherited index:true.
export const metadata: Metadata = { robots: null }

/** Unknown URLs have no (site) layout; explicit site misses reuse its own boundary. */
export default function NotFound() {
  return <div data-surface="site" data-surface-root="" className={`${manrope.variable} flex min-h-screen flex-col`}>
    <header data-tone="night" className="py-5"><div className="hb-container"><HbeeLogo onDark /></div></header>
    <main id="main-content" tabIndex={-1} className="flex-1"><SiteNotFound /></main>
  </div>
}
