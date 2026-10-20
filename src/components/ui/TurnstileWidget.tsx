'use client'

import { useEffect, useRef, useState } from 'react'

interface TurnstileWidgetProps {
  onVerify: (token: string) => void
  onError?: () => void
  onExpire?: () => void
  reset?: boolean
  theme?: 'light' | 'dark'
  size?: 'normal' | 'compact'
}

declare global {
  interface Window {
    turnstile: any
  }
}

export default function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  reset = false,
  theme = 'light',
  size = 'normal',
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  useEffect(() => {
    if (!siteKey) {
      console.warn('⚠️ Turnstile: Site key is missing. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY')
      setError('Security configuration missing')
      return
    }

    // Multiple forms may mount while the same script is still loading. Wait for
    // its load event rather than treating presence as API readiness.
    let script = document.querySelector<HTMLScriptElement>('script[src*="turnstile/v0/api.js"]')
    const created = !script
    if (!script) {
      script = document.createElement('script')
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
      script.async = true
      script.defer = true
    }
    const ready = () => setIsLoaded(true)
    const failed = () => {
      setError('Failed to load security verification')
      onError?.()
    }
    script.addEventListener('load', ready)
    script.addEventListener('error', failed)
    if (window.turnstile) ready()
    if (created) document.head.appendChild(script)

    return () => {
      script?.removeEventListener('load', ready)
      script?.removeEventListener('error', failed)
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
          widgetIdRef.current = null
        } catch (e) {
          // Ignore
        }
      }
    }
  }, [siteKey, onError])

  useEffect(() => {
    if (!isLoaded || !window.turnstile || !containerRef.current || !siteKey) {
      return
    }

    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      } catch (e) {
        // Ignore
      }
    }

    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    try {
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: size,
        callback: (token: string) => {
          // Verification tokens are private authentication material; never log them.
          setIsVerifying(false)
          onVerify(token)
        },
        'error-callback': () => {
          console.error('❌ Turnstile: Error callback triggered')
          setIsVerifying(false)
          setError('Verification failed. Please try again.')
          onError?.()
        },
        'expired-callback': () => {
          console.log('⏰ Turnstile: Token expired')
          setIsVerifying(false)
          setError('Verification expired. Please verify again.')
          onExpire?.()
        },
        'timeout-callback': () => {
          console.log('⏰ Turnstile: Timeout')
          setIsVerifying(false)
          setError('Verification timed out. Please try again.')
          onError?.()
        },
      })
      
      console.log('🎯 Turnstile: Widget rendered, ID:', widgetIdRef.current)
      setIsVerifying(true)
    } catch (err) {
      console.error('❌ Turnstile: Render error:', err)
      setError('Failed to initialize security verification')
      onError?.()
    }
  }, [isLoaded, siteKey, theme, size, onVerify, onError, onExpire])

  useEffect(() => {
    if (reset && widgetIdRef.current && window.turnstile) {
      try {
        window.turnstile.reset(widgetIdRef.current)
        console.log('🔄 Turnstile: Widget reset')
        setIsVerifying(true)
        setError(null)
      } catch (e) {
        // Ignore
      }
    }
  }, [reset])

  if (error) {
    return (
      <div className="text-center py-2">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => {
            setError(null)
            setIsVerifying(true)
            if (containerRef.current) {
              containerRef.current.innerHTML = ''
            }
            setIsLoaded(false)
            setTimeout(() => setIsLoaded(true), 100)
          }}
          className="mt-2 text-xs text-[var(--accent)] hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!siteKey) {
    return (
      <div className="text-center py-2 text-yellow-400 text-sm">
        ⚠️ Security configuration in progress.
      </div>
    )
  }

  return (
    <div className="flex justify-center py-2">
      <div ref={containerRef} />
      {isVerifying && (
        <div className="mt-1 text-xs text-[var(--text-muted)] flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
          Verifying...
        </div>
      )}
    </div>
  )
}
