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

      await new Promise((resolve) =>
        setTimeout(resolve, 1200)
      )

      setSuccess(true)
      setEmail('')

      setTimeout(() => {
        setSuccess(false)
      }, 4500)
    } catch (err) {
      setError(
        'Something went wrong. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="relative overflow-hidden py-16 text-white sm:py-20">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[300px] w-[380px] rounded-full bg-[#39D97A]/7 blur-[120px]" />

        <div className="absolute bottom-0 right-0 h-[280px] w-[360px] rounded-full bg-[#C6F135]/5 blur-[110px]" />

        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.02)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <motion.div
          initial={
            reducedMotion
              ? false
              : { opacity: 0, y: 24 }
          }
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] via-[#0B1625] to-[#07111F] shadow-[0_35px_120px_rgba(0,0,0,0.3)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

          <div className="relative grid gap-10 px-6 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-12 lg:py-14">
            <div>
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon
                  name="messages"
                  size={14}
                  color="#39D97A"
                />
                Growth Insights
              </div>

              <h2 className="max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.055em] text-white sm:text-5xl md:text-6xl">
                Stay updated with smarter digital{' '}
                <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                  growth insights.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-sm leading-7 text-white/60 sm:text-base md:text-lg md:leading-8">
                Get practical updates on Shopify optimization, websites,
                accessibility, branding, and conversion systems.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                {[
                  'No spam',
                  'Growth focused',
                  'Premium insights',
                ].map((item) => (
                  <div
                    key={item}
                    className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/14 bg-[#39D97A]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
                  >
                    <SvgIcon
                      name="verified"
                      size={12}
                      color="#39D97A"
                    />

                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="rounded-[1.8rem] border border-[#1E314A] bg-[#07111F]/72 p-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                    <SvgIcon
                      name="email"
                      size={20}
                      color="#39D97A"
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-black text-white">
                      Join the newsletter
                    </h3>

                    <p className="text-sm text-white/45">
                      Weekly premium updates
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) =>
                        setEmail(e.target.value)
                      }
                      placeholder="Enter your email address"
                      className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#0E1B2D] px-5 pr-14 text-sm font-medium text-white outline-none transition placeholder:text-white/28 focus:border-[#39D97A]/35 focus:bg-[#13233A]"
                    />

                    <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2">
                      <SvgIcon
                        name="messages"
                        size={18}
                        color="rgba(57,217,122,0.8)"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="group flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#39D97A] px-6 text-sm font-black text-[#06101F] shadow-[0_0_35px_rgba(57,217,122,0.16)] transition duration-300 hover:scale-[1.01] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#06101F]/20 border-t-[#06101F]" />
                        Subscribing...
                      </>
                    ) : (
                      <>
                        Subscribe Now

                        <SvgIcon
                          name="arrow-diagonal"
                          size={16}
                          color="#06101F"
                          className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                        />
                      </>
                    )}
                  </button>

                  {success && (
                    <motion.div
                      initial={
                        reducedMotion
                          ? false
                          : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-3 text-sm font-semibold text-[#39D97A]"
                    >
                      Successfully subscribed to updates.
                    </motion.div>
                  )}

                  {error && (
                    <motion.div
                      initial={
                        reducedMotion
                          ? false
                          : { opacity: 0, y: 8 }
                      }
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-red-500/18 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-300"
                    >
                      {error}
                    </motion.div>
                  )}
                </form>

                <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[#1E314A] pt-5">
                  <div className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/14 bg-[#39D97A]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#39D97A]">
                    <SvgIcon
                      name="security"
                      size={12}
                      color="#39D97A"
                    />

                    Secure
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/45">
                    <SvgIcon
                      name="star"
                      size={12}
                      color="#C6F135"
                    />

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