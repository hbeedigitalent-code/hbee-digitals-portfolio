'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientLoginPage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      router.push('/client-portal')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/client-portal`,
        },
      })

      if (error) throw error

      setError('Magic link sent! Check your email.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send magic link')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-20">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <SvgIcon name="logo" size={48} color="var(--accent-orange)" />
            </div>
            <h1 className="text-2xl font-bold text-white">Client Portal</h1>
            <p className="mt-2 text-[var(--text-muted)]">Sign in to access your projects</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="you@email.com"
                  required
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className={`rounded-lg p-3 text-sm ${error.includes('sent') ? 'bg-[var(--accent-lime)]/10 text-[var(--accent-lime)]' : 'bg-red-500/10 text-red-400'}`}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[var(--bg-card-dark)] px-2 text-[var(--text-muted)]">Or continue with</span>
                </div>
              </div>

              <button
                onClick={handleMagicLink}
                disabled={loading}
                className="mt-4 w-full rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)] disabled:opacity-50"
              >
                Send Magic Link
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}