'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function NewsletterSection() {
  const reducedMotion = useReducedMotion()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')
    setMessage('')

    const { error } = await supabase.from('subscribers').insert([
      {
        email,
        name: name || null,
        source: 'newsletter_section',
      },
    ])

    if (error) {
      setStatus('error')
      setMessage(error.code === '23505' ? 'This email is already subscribed.' : 'Could not subscribe. Please try again.')
    } else {
      setStatus('success')
      setMessage('You’re in. Growth insights will now come your way.')
      setEmail('')
      setName('')
    }

    setLoading(false)
  }

  return (
    <section className="relative overflow-hidden bg-[#050B16] py-16 text-white sm:py-20">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-1/2 top-0 h-[360px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/12 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl px-5 sm:px-6 md:px-10">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="overflow-hidden rounded-[2rem] border border-[#39D97A]/16 bg-[#071427]/88 p-6 text-center shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-8 md:p-10"
        >
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#39D97A] shadow-[0_0_40px_rgba(57,217,122,0.3)]">
            <SvgIcon name="newsletter" size={26} color="#06101F" />
          </div>

          <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
            Growth Notes
          </p>

          <h2 className="text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
            Stay close to smarter digital growth.
          </h2>

          <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            Get practical website, Shopify, conversion, and brand growth insights from Hbee Digitals.
          </p>

          <form onSubmit={handleSubmit} className="mx-auto mt-8 grid max-w-3xl gap-3 md:grid-cols-[1fr_1fr_auto]">
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/45 focus:bg-[#39D97A]/8"
            />

            <input
              type="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-full border border-white/10 bg-white/[0.045] px-5 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/45 focus:bg-[#39D97A]/8"
            />

            <button
              type="submit"
              disabled={loading}
              className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Subscribing...' : 'Subscribe'}
              <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
            </button>
          </form>

          <AnimatePresence>
            {status !== 'idle' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className={`mx-auto mt-5 max-w-xl rounded-2xl border px-4 py-3 text-sm font-bold ${
                  status === 'success'
                    ? 'border-[#39D97A]/25 bg-[#39D97A]/10 text-[#39D97A]'
                    : 'border-red-400/25 bg-red-400/10 text-red-300'
                }`}
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <p className="mt-5 text-xs font-semibold text-white/35">
            No spam. Only useful growth insights.
          </p>
        </motion.div>
      </div>
    </section>
  )
}