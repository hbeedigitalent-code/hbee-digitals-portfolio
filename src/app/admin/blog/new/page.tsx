'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BlogPostEditor from '@/components/admin/BlogPostEditor'

export default function NewBlogPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/admin/login')
        return
      }
      setAuthenticated(true)
      setChecking(false)
    }
    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-page)]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#39D97A] border-t-transparent" />
      </div>
    )
  }

  if (!authenticated) return null

  return (
    <div className="min-h-screen bg-[var(--bg-page)] p-4 sm:p-8">
      <BlogPostEditor mode="new" />
    </div>
  )
}