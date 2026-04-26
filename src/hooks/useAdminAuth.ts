// src/hooks/useAdminAuth.ts
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'

export function useAdminAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkUser = async () => {
      try {
        const supabase = createClientComponentClient()
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          if (isMounted) {
            router.replace('/admin/login')
          }
        } else {
          if (isMounted) {
            setUser(user)
          }
        }
      } catch (err) {
        console.error('Auth error:', err)
        setError(err instanceof Error ? err.message : 'Authentication failed')
        if (isMounted) {
          // Don't redirect on build errors
          if (typeof window !== 'undefined') {
            router.replace('/admin/login')
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    checkUser()

    return () => {
      isMounted = false
    }
  }, [router])

  return { user, loading, error }
}