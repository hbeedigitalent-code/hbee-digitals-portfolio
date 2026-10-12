// Shared loading / error / ambiguous states for the supporting portal pages (Phase 18.7).
import Link from 'next/link'
import styles from './support.module.css'

export function SupportLoading() {
  return (
    <div className={styles.center}>
      <div className={styles.spinner} />
    </div>
  )
}

export function SupportError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className={styles.center}>
      <div className={styles.centerBody}>
        <p>{message}</p>
        <button type="button" onClick={onRetry} className={styles.secondary}>
          Try Again
        </button>
      </div>
    </div>
  )
}

export function SupportAmbiguous({ what }: { what: string }) {
  return (
    <div className={styles.center}>
      <div className={styles.centerBody}>
        <p>
          Your sign-in is linked to more than one business record, so we have not shown your {what}. Please contact us and we will sort it out.
        </p>
        <Link href="/contact" className={styles.secondary}>
          Contact Hbee Digitals
        </Link>
      </div>
    </div>
  )
}
