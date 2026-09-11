// src/components/SubscribePopup.tsx
//
// The promotional newsletter popup. This is the component whose X used to
// COLLAPSE rather than close.
//
// WHAT WAS WRONG. `handleDismissToCollapsed()` set isCollapsed = true, which
// rendered a skewed "Stay Updated" tab pinned to the right edge of every page,
// permanently — for the X, for "No, thanks", and even after a successful
// subscribe there was a path back into it. Closing something is a request for
// it to go away; turning it into a smaller always-on advert is not that. It
// also wrote a PERMANENT localStorage flag, so the visitor's single "not now"
// was recorded as "never", and the dialog had no dialog semantics at all: no
// role, no Escape, no scroll lock, no focus management.
//
// WHAT IT DOES NOW.
//   * The X and "No, thanks" both dismiss completely. There is no collapsed
//     tab any more — the component renders null, and no floating control is
//     introduced to replace it. The deliberate way to subscribe remains the
//     newsletter form in the site Footer, which is unchanged.
//   * Dismissal is remembered for THIS BROWSER TAB only, under a stable
//     campaign key, so the choice is not silently permanent. A visitor who
//     dismissed it under the old permanent flag is still honoured — that flag
//     is read, never written.
//   * Dismissing changes presentation only. It deletes no record and touches
//     no consent state; the cookie banner is a separate component.
//   * The 45-second timer is cleared on dismissal and the dismissal is
//     re-checked on mount, so neither the timer nor a route change can reopen
//     the same dismissed popup.
//   * It is a real modal: role="dialog", aria-modal, labelled by its heading,
//     Escape closes it, focus moves in and is restored to the element that had
//     it, Tab is trapped inside, and the body scroll lock is released on every
//     exit path.
//
// COLOURS. Every hardcoded value is gone in favour of the existing semantic
// tokens, including --success/--error for the two result messages. The
// previous version also used `bg-gradient-orange-green`, a class that is
// defined nowhere in this project — it rendered as no background at all, which
// left white text on a transparent button. Actions now use --cta/--cta-hover
// with --cta-text, and focus uses --ring. The one deliberate exception is the
// backdrop scrim, which stays a neutral black wash: that is what every other
// modal in this codebase uses, and it is the only value that must NOT invert
// with the theme.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Stable identifier for this popup/campaign. Changing it is how a NEW campaign
 * gets shown to someone who dismissed the previous one; leaving it alone is
 * what makes a dismissal stick for the rest of the tab session.
 */
const CAMPAIGN_ID = 'newsletter-2026-01';
const DISMISS_KEY = `hbee:popup:${CAMPAIGN_ID}:dismissed`;

/** Written only on a successful subscribe. A subscription is not a dismissal. */
const SUBSCRIBED_KEY = 'hbee_subscribed';

/**
 * The old permanent dismissal flag. READ ONLY — someone who already said no
 * under the previous behaviour keeps their answer; nothing writes this again.
 */
const LEGACY_DISMISSED_KEY = 'hbee_popup_dismissed';

const SHOW_AFTER_MS = 45000;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-card)]';

/** Storage can throw (private mode, blocked site data). Never let it break the page. */
function safeRead(storage: 'session' | 'local', key: string): string | null {
  try {
    const s = storage === 'session' ? window.sessionStorage : window.localStorage;
    return s.getItem(key);
  } catch {
    return null;
  }
}

function safeWrite(storage: 'session' | 'local', key: string, value: string) {
  try {
    const s = storage === 'session' ? window.sessionStorage : window.localStorage;
    s.setItem(key, value);
  } catch {
    /* nothing to do — the popup simply reappears in a new tab */
  }
}

export default function SubscribePopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Presentation only: it hides the popup and records the choice. Nothing else. */
  const dismiss = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    safeWrite('session', DISMISS_KEY, '1');
    setIsOpen(false);
  }, []);

  useEffect(() => {
    // Re-checked on every mount, so crossing between route groups (which
    // remounts this component) cannot resurrect a dismissed popup.
    if (
      safeRead('local', SUBSCRIBED_KEY) ||
      safeRead('local', LEGACY_DISMISSED_KEY) ||
      safeRead('session', DISMISS_KEY)
    ) {
      return;
    }

    timerRef.current = setTimeout(() => setIsOpen(true), SHOW_AFTER_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Modal behaviour: scroll lock, Escape, focus in and back out, Tab trap.
  useEffect(() => {
    if (!isOpen) return;

    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        dismiss();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      // Released on EVERY exit path, including an unmount while open.
      document.body.style.overflow = previousOverflow;
      returnFocusRef.current?.focus?.();
    };
  }, [isOpen, dismiss]);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setStatus('loading');

    try {
      const response = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, source: 'popup' }),
      });

      const data = await response.json();

      if (data.success === true) {
        setStatus('success');
        safeWrite('local', SUBSCRIBED_KEY, 'true');
        successTimerRef.current = setTimeout(() => setIsOpen(false), 1200);
      } else {
        console.error('Subscription error:', data.error);
        setStatus('error');
        setTimeout(() => setStatus('idle'), 3000);
      }
    } catch (err) {
      console.error('Subscription error:', err);
      setStatus('error');
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        // Clicking the scrim is the same request as the X.
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="subscribe-popup-title"
        aria-describedby="subscribe-popup-description"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]"
      >
        <button
          ref={closeButtonRef}
          type="button"
          onClick={dismiss}
          aria-label="Close subscribe offer"
          className={`absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-muted)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="border-b border-[var(--border)] bg-[var(--bg-section)] p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--cta)] text-[var(--cta-text)]">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="26"
              height="26"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </div>
          <h2
            id="subscribe-popup-title"
            className="text-2xl font-bold text-[var(--text-primary)]"
          >
            Stay updated
          </h2>
          <p
            id="subscribe-popup-description"
            className="mt-2 text-sm text-[var(--text-secondary)]"
          >
            Occasional updates, tips and tutorials. No spam, and you can unsubscribe at any
            time.
          </p>
        </div>

        <form onSubmit={handleSubscribe} className="space-y-4 p-6">
          <div>
            <label
              htmlFor="subscribe-popup-name"
              className="mb-1 block text-sm font-semibold text-[var(--text-primary)]"
            >
              Name
            </label>
            <input
              id="subscribe-popup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ${FOCUS_RING}`}
            />
          </div>

          <div>
            <label
              htmlFor="subscribe-popup-email"
              className="mb-1 block text-sm font-semibold text-[var(--text-primary)]"
            >
              Email <span aria-hidden="true">*</span>
            </label>
            <input
              id="subscribe-popup-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className={`w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] ${FOCUS_RING}`}
            />
          </div>

          <div aria-live="polite">
            {status === 'success' && (
              <p className="rounded-lg border border-[var(--success)] bg-[var(--success-subtle)] p-3 text-center text-sm text-[var(--success)]">
                Subscribed. Thank you.
              </p>
            )}
            {status === 'error' && (
              <p className="rounded-lg border border-[var(--error)] bg-[var(--error-subtle)] p-3 text-center text-sm text-[var(--error)]">
                Something went wrong. Please try again.
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={status === 'loading'}
              className={`flex-1 rounded-full bg-[var(--cta)] px-4 py-2 font-semibold text-[var(--cta-text)] transition hover:bg-[var(--cta-hover)] disabled:opacity-50 ${FOCUS_RING}`}
            >
              {status === 'loading' ? 'Subscribing…' : 'Join the list'}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className={`rounded-full border border-[var(--border)] px-4 py-2 font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)] ${FOCUS_RING}`}
            >
              No, thanks
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
