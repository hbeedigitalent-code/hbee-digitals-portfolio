'use client'

import { useState } from 'react'

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
    <section className="mt-14 rounded-[2rem] border border-[var(--border)] bg-[#07111F] p-6 text-white shadow-xl sm:p-8">
      <div className="mx-auto max-w-2xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2">
          <img src="/svgs/newsletter.svg" alt="" className="h-4 w-4" />
          <span className="text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
            Growth Newsletter
          </span>
        </div>

        <h2 className="text-2xl font-black tracking-[-0.04em] sm:text-3xl">
          Get ecommerce growth insights in your inbox
        </h2>

        <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-white/70">
          Practical ideas on conversion, customer trust, Shopify growth, website
          performance, and digital systems from Hbee Digitals.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#39D97A]"
          />

          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            type="email"
            className="rounded-full border border-white/10 bg-white/10 px-5 py-3 text-sm text-white outline-none placeholder:text-white/45 focus:border-[#39D97A]"
          />

          <button
            disabled={status === 'loading'}
            className="rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#07111F] transition hover:scale-[1.02] disabled:opacity-60"
          >
            {status === 'loading' ? 'Joining...' : 'Subscribe'}
          </button>
        </form>

        {message && (
          <p
            className={`mt-4 text-sm font-bold ${
              status === 'success' ? 'text-[#39D97A]' : 'text-red-300'
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </section>
  )
}