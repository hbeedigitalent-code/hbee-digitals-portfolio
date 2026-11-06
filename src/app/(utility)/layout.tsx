import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '@/styles/site-tokens.css'
import { manrope } from '@/components/site/fonts'
import { NOINDEX } from '@/lib/site/seo'

export const metadata: Metadata = NOINDEX

/** Focused public utilities use the rebuilt visual system without marketing chrome. */
export default function UtilityLayout({ children }: { children: ReactNode }) {
  return <div data-surface="site" data-surface-root="" className={manrope.variable}>{children}</div>
}
