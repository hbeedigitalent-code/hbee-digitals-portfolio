'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { COOKIE_CONSENT_EVENT, readCookieConsent } from '@/lib/cookie-consent'
import { NEWSLETTER_SUBSCRIBED_EVENT, dismissNewsletterPopup, scheduleNewsletterPopup } from '@/lib/newsletter-client'
import { newsletterCaptureEnabled, type NewsletterSettings } from '@/lib/footer-settings'
import { NewsletterForm } from './NewsletterForm'
import styles from './newsletter.module.css'

/** Native top-layer modal keeps the site's tokens, while providing keyboard focus containment. */
export function SiteNewsletterPopup({ settings }: { settings: NewsletterSettings }) {
  const ref = useRef<HTMLDialogElement>(null), cookieChoice = useRef(false)
  const [open, setOpen] = useState(false)
  const captureEnabled = newsletterCaptureEnabled(settings, 'popup')
  const dismiss = useCallback(() => { dismissNewsletterPopup(); setOpen(false) }, [])
  useEffect(() => {
    if (!captureEnabled) return
    cookieChoice.current = Boolean(readCookieConsent())
    const onCookie = () => { cookieChoice.current = true }
    window.addEventListener(COOKIE_CONSENT_EVENT, onCookie)
    const cancel = scheduleNewsletterPopup({ delaySeconds: settings.popup_delay_seconds,
      canOpen: () => cookieChoice.current && !document.hidden && !document.querySelector('dialog[open], [role="dialog"][aria-modal="true"]')
        && !document.activeElement?.closest('form') && typeof ref.current?.showModal === 'function',
      onOpen: () => setOpen(true),
    })
    window.addEventListener(NEWSLETTER_SUBSCRIBED_EVENT, cancel)
    window.addEventListener('storage', cancelOnSubscription)
    function cancelOnSubscription(event: StorageEvent) { if (event.key === 'hbee_subscribed' && event.newValue) cancel() }
    return () => { cancel(); window.removeEventListener(COOKIE_CONSENT_EVENT, onCookie); window.removeEventListener(NEWSLETTER_SUBSCRIBED_EVENT, cancel); window.removeEventListener('storage', cancelOnSubscription) }
  }, [captureEnabled, settings.popup_delay_seconds])

  useEffect(() => {
    const dialog = ref.current
    if (!open || !dialog || !captureEnabled) return
    const previous = document.activeElement as HTMLElement | null, overflow = document.body.style.overflow
    dialog.showModal()
    dialog.querySelector<HTMLButtonElement>('button')?.focus()
    document.body.style.overflow = 'hidden'
    return () => { dialog.close(); document.body.style.overflow = overflow; previous?.focus({ preventScroll: true }) }
  }, [open, captureEnabled])

  if (!captureEnabled) return null
  return <dialog ref={ref} className={styles.popup} data-tone="white" aria-modal="true" aria-labelledby="newsletter-popup-title" aria-describedby="newsletter-popup-description" onCancel={event => { event.preventDefault(); dismiss() }} onClose={() => { if (open) dismiss() }}>
    <button type="button" aria-label="Close newsletter signup" className={styles.close} onClick={dismiss}><X size={20} aria-hidden="true" /></button>
    <p className={styles.eyebrow}>Stay connected</p>
    <h2 id="newsletter-popup-title">{settings.popup_headline}</h2>
    <p id="newsletter-popup-description">{settings.description}</p>
    {open && <NewsletterForm source="popup" />}
  </dialog>
}
