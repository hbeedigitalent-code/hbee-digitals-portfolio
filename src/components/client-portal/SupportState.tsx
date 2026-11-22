// Shared loading / error / ambiguous states for the portal screens.
import Link from 'next/link'
import prim from './portal-primitives.module.css'
import screens from './portal-screens.module.css'

export function SupportLoading() {
  return (
    <div className={screens.center} role="status" aria-label="Loading">
      <div className={screens.spinner} />
    </div>
  )
}

export function SupportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={screens.center}>
      <div className={screens.centerBody}>
        <p>{message}</p>
        <button type="button" onClick={onRetry} className={prim.secondary}>
          Try Again
        </button>
      </div>
    </div>
  )
}

export function SupportAmbiguous({ what }: { what: string }) {
  return (
    <div className={screens.center}>
      <div className={screens.centerBody}>
        <p>
          Your sign-in is linked to more than one business record, so we have not shown your {what}. Please contact us and we will sort it out.
        </p>
        <Link href="/contact" className={prim.secondary}>
          Contact Hbee Digitals
        </Link>
      </div>
    </div>
  )
}

/** "Not found" / withdrawn: a calm page with a way back. */
export function SupportNotFound({ title, text, links }: { title: string; text?: string; links: Array<{ href: string; label: string }> }) {
  return (
    <div className={screens.page}>
      <div className={screens.center}>
        <div className={screens.centerBody}>
          <h2>{title}</h2>
          {text && <p>{text}</p>}
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={prim.link}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
