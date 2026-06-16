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
  const [error, setError] = useState<string | null>(null)

  // Debug: Log environment variable status
  useEffect(() => {
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    console.log('🔑 Turnstile Debug:')
    console.log('  - Site Key exists?', !!siteKey)
    console.log('  - Site Key starts with?', siteKey ? siteKey.substring(0, 10) : 'none')
    console.log('  - Component mounted')
  }, [])

  // Load Turnstile script
  useEffect(() => {
    // Check if script already exists
    if (document.querySelector('script[src*="turnstile"]')) {
      console.log('✅ Turnstile script already loaded')
      setIsLoaded(true)
      return
    }

    console.log('📥 Loading Turnstile script...')
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.defer = true
    script.onload = () => {
      console.log('✅ Turnstile script loaded successfully')
      setIsLoaded(true)
    }
    script.onerror = (err) => {
      console.error('❌ Failed to load Turnstile script:', err)
      setError('Failed to load security verification')
    }
    document.head.appendChild(script)

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
      }
    }
  }, [])

  // Initialize widget
  useEffect(() => {
    if (!isLoaded || !window.turnstile || !containerRef.current) {
      console.log('⏳ Waiting for Turnstile to be ready...', {
        isLoaded,
        hasTurnstile: !!window.turnstile,
        hasContainer: !!containerRef.current
      })
      return
    }

    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
    if (!siteKey) {
      console.error('❌ Turnstile site key is missing! Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to .env.local')
      setError('Security configuration missing')
      return
    }

    console.log('🎨 Rendering Turnstile widget with site key:', siteKey.substring(0, 10) + '...')

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
          console.log('✅ Turnstile verification successful, token received')
          onVerify(token)
        },
        'error-callback': () => {
          console.error('❌ Turnstile error callback triggered')
          onError?.()
        },
        'expired-callback': () => {
          console.log('⏰ Turnstile token expired')
          onExpire?.()
        },
      })
      console.log('🎯 Turnstile widget rendered, widget ID:', widgetIdRef.current)
    } catch (err) {
      console.error('❌ Error rendering Turnstile:', err)
      setError('Failed to initialize security verification')
    }
  }, [isLoaded, theme, size, onVerify, onError, onExpire])

  // Handle reset
  useEffect(() => {
    if (reset && widgetIdRef.current && window.turnstile) {
      console.log('🔄 Resetting Turnstile widget')
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [reset])

  if (error) {
    return (
      <div className="text-center py-2 text-red-400 text-sm">
        {error}
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center py-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
        <span className="ml-2 text-xs text-[var(--text-muted)]">Loading security...</span>
      </div>
    )
  }

  return (
    <div className="flex justify-center">
      <div ref={containerRef} />
    </div>
  )
}