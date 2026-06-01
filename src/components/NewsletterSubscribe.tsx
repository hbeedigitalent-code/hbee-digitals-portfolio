'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    let ipAddress = ''
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      ipAddress = data.ip
    } catch {
      ipAddress = 'unknown'
    }

    const { error } = await supabase.from('subscribers').insert([
      { email, name: name || null, ip_address: ipAddress, source: 'website' }
    ])

    if (error) {
      if (error.code === '23505') {
        setStatus('error')
        setMessage('This email is already subscribed!')
      } else {
        setStatus('error')
        setMessage('Failed to subscribe. Please try again.')
      }
    } else {
      setStatus('success')
      setMessage('Thanks for subscribing! 🎉')
      setEmail('')
      setName('')
      
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `New Newsletter Subscriber: ${email}`,
            html: `
              <h2>New Newsletter Subscriber</h2>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Name:</strong> ${name || 'Not provided'}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `
          })
        })
      } catch {
        // Silent fail for notification
      }
    }
    setLoading(false)

    setTimeout(() => {
      if (status === 'success') {
        setStatus('idle')
        setMessage('')
      }
    }, 5000)
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 backdrop-blur-sm">
      <h3 className="mb-2 text-xl font-bold text-[var(--text-primary)]">Subscribe to Our Newsletter</h3>
      <p className="mb-4 text-sm text-[var(--text-secondary)]">
        Get the latest updates and exclusive offers.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50 focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-[var(--accent)] px-4 py-2 font-semibold text-[var(--btn-primary-text)] transition hover:bg-[var(--accent-lime)] hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-3 rounded p-2 text-center text-sm ${
              status === 'success' ? 'text-[var(--accent)]' : 'text-red-400'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
      
      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  )
}