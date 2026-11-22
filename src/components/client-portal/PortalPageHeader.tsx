import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/cn'
import prim from './portal-primitives.module.css'
import screens from './portal-screens.module.css'

/**
 * The header every portal screen shares: an optional back link, the eyebrow (with the Hbee signal node), one h1, an optional lead and
 * meta line, and an optional action on the right (the screen's one primary action). Presentation only.
 */
export function PortalPageHeader({
  eyebrow,
  title,
  lead,
  meta,
  action,
  back,
  className,
}: {
  eyebrow?: string
  title: ReactNode
  lead?: ReactNode
  meta?: ReactNode
  action?: ReactNode
  back?: { href: string; label: string }
  className?: string
}) {
  return (
    <header className={cn(screens.head, className)}>
      <div className={screens.headMain}>
        {back && (
          <Link href={back.href} className={prim.link}>
            <ArrowLeft aria-hidden="true" />
            {back.label}
          </Link>
        )}
        {eyebrow && (
          <p className={prim.eyebrow}>
            <span aria-hidden="true" className={prim.node} />
            {eyebrow}
          </p>
        )}
        <h1 className={screens.h1}>{title}</h1>
        {lead && <p className={screens.lead}>{lead}</p>}
        {meta && <div className={screens.meta}>{meta}</div>}
      </div>
      {action && <div className={screens.headActions}>{action}</div>}
    </header>
  )
}

/** A section label inside a panel or ruled section: the eyebrow with its signal node. */
export function PortalEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className={prim.eyebrow}>
      <span aria-hidden="true" className={prim.node} />
      {children}
    </p>
  )
}
