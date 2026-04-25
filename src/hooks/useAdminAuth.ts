'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useAdminAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let isMounted = true

    const checkUser = async () => {
      try {        
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
        if (isMounted) {
          router.replace('/admin/login')
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

  return { user, loading }
}
