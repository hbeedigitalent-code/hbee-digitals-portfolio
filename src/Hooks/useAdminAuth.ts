'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function useAdminAuth() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        
        if (error || !user) {
          router.push('/admin/login')
        } else {
          setUser(user)
        }
      } catch (err) {
        console.error('Auth error:', err)
        router.push('/admin/login')
      } finally {
        setLoading(false)
      }
    }
    
    checkUser()
  }, [router])

  return { user, loading }
}