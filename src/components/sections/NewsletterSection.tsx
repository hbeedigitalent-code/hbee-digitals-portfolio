'use client'

import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

export default function NewsletterSection() {
  const reducedMotion = useReducedMotion()

  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!email) return

    try {
      setLoading(true)
      setError('')

      await new Promise((resolve) => setTimeout(resolve, 1200))

      setSuccess(true)
      setEmail('')

      setTimeout(() => {
        setSuccess(false)
      }, 4500)
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden bg-[var(--bg-page)] py-16 text-[var(--text-primary)] sm:py-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[300px] w-[380px] rounded-full bg-[var(--accent)]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[var(--accent-lime)]/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.02)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-card)] shadow-[var(--shadow-lg)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--accent)]/55 to-transparent" />

          <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-12 lg:py-14">
            {/* Left Column - Content */}
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                <SvgIcon name="messages" size={14} color="var(--accent)" />
                Growth Insights
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.055em] text-[var(--text-primary)] sm:text-5xl md:text-6xl">
                Stay updated with smarter digital{' '}
                <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)] bg-clip-text text-transparent">
                  growth insights.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base md:text-lg md:leading-8">
                Get practical updates on Shopify optimization, websites,
                accessibility, branding, and conversion systems.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {['No spam', 'Growth focused', 'Premium insights'].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/14 bg-[var(--accent)]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--accent)]"
                  >
                    <SvgIcon name="verified" size={12} color="var(--accent)" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Right Column - Form */}
            <div className="relative">
              <div className="rounded-[1.8rem] border border-[var(--border)] bg-[var(--bg-section)]/72 p-5 shadow-[var(--shadow-md)] backdrop-blur-xl sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10">
                    <SvgIcon name="email" size={20} color="var(--accent)" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)]">
                      Join the newsletter
                    </h3>
                    <p className="text-sm text-[var(--text-muted)]">
                      Weekly premium updates
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="h-14 w-full rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5 pr-14 text-sm font-medium text-[var(--text-primary)] outline-none transition placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/35 focus:bg-[var(--bg-card-hover)]"
                    />
                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <SvgIcon name="messages" size={18} color="rgba(57,217,122,0.8)" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[var(--accent)] px-6 text-sm font-black text-[var(--btn-primary-text)] shadow-[0_0_35px_rgba(57,217,122,0.16)] transition duration-300 hover:scale-[1.01] hover:bg-[var(--accent-lime)] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--btn-primary-text)]/20 border-t-[var(--btn-primary-text)]" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        Subscribe Now
                        <SvgIcon
                          name="arrow-diagonal"
                          size={16}
                          color="var(--btn-primary-text)"
                          className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </>
                    )}
                  </button>

                  {success && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 px-4 py-3 text-sm font-semibold text-[var(--accent)]"
                    >
                      Successfully subscribed to updates.
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      {error}
                    </motion.div>
                  )}
                </form>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--accent)]/14 bg-[var(--accent)]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--accent)]">
                    <SvgIcon name="security" size={12} color="var(--accent)" />
                    Secure
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)]/3 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[var(--text-muted)]">
                    <SvgIcon name="star" size={12} color="var(--accent-lime)" />
                    Trusted Updates
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}