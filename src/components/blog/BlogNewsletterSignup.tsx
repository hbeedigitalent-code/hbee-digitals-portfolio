'use client'

import { useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

export default function BlogNewsletterSignup() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (!email || !email.includes('@')) {
      setStatus('error')
      setMessage('Please enter a valid email address.')
      return
    }

    setStatus('loading')
    setMessage('')

    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, source: 'blog_article' }),
    })

    const result = await response.json()

    if (!response.ok) {
      setStatus('error')
      setMessage(result.error || 'Subscription failed. Please try again.')
      return
    }

    setStatus('success')
    setMessage('You are subscribed. Growth insights will now come your way.')
    setEmail('')
    setName('')
  }

  return (
    <section className="mt-14 rounded-2xl border border-[var(--accent)]/20 bg-[var(--bg-navy)] p-6 text-white sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-4 py-2">
          <SvgIcon name="newsletter" size={14} color="var(--accent)" />
          <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
            Growth Newsletter
          </span>
        </div>

        <h2 className="text-2xl font-bold tracking-[-0.02em] text-white sm:text-3xl">
          Get ecommerce growth insights in your inbox
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--text-on-dark-muted)]">
          Practical ideas on conversion, customer trust, Shopify growth, website
          performance, and digital systems from Hbee Digitals.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[var(--accent)]"
          />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            type="email"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[var(--accent)]"
          />

          <Button
            type="submit"
            disabled={status === 'loading'}
            variant="cta"
            size="md"
            className="min-w-[120px]"
          >
            {status === 'loading' ? 'Joining...' : 'Subscribe'}
          </Button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm font-bold ${
              status === 'success' ? 'text-[var(--accent)]' : 'text-red-300'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  )
}