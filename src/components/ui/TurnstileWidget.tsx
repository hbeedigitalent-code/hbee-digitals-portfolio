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

  // Get site key from environment
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Load Turnstile script
  useEffect(() => {
    // Check if site key exists
    if (!siteKey) {
      console.error('❌ Turnstile: Site key is missing. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to .env.local')
      setError('Security configuration missing')
      return
    }

    // Check if script already exists
    if (document.querySelector('script[src*="turnstile"]')) {
      console.log('✅ Turnstile: Script already loaded')
      setIsLoaded(true)
      return
    }

    console.log('📥 Turnstile: Loading script...')
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    
    script.onload = () => {
      console.log('✅ Turnstile: Script loaded successfully')
      setIsLoaded(true)
    }
    
    script.onerror = (err) => {
      console.error('❌ Turnstile: Failed to load script:', err)
      setError('Failed to load security verification')
      onError?.()
    }
    
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current)
        } catch (e) {
          // Ignore removal errors
        }
      }
    }
  }, [siteKey, onError])

  // Initialize or reset widget
  useEffect(() => {
    if (!isLoaded || !window.turnstile || !containerRef.current) {
      return
    }

    if (!siteKey) {
      return
    }

    // Remove existing widget if any
    if (widgetIdRef.current) {
      try {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      } catch (e) {
        // Ignore
      }
    }

    // Clear container
    if (containerRef.current) {
      containerRef.current.innerHTML = ''
    }

    try {
      // Render the widget
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: theme,
        size: size,
        callback: (token: string) => {
          console.log('✅ Turnstile: Verification successful')
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

  // Handle reset
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
            // Re-render by triggering effect
            if (containerRef.current) {
              containerRef.current.innerHTML = ''
            }
            // Force re-render
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
      <div className="text-center py-2 text-red-400 text-sm">
        Security configuration in progress. Please refresh and try again.
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