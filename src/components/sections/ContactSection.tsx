'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75 sm:-bottom-3 sm:h-5"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function ContactSection() {
  const reducedMotion = useReducedMotion()
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')
    setErrorMessage('')

    const form = e.currentTarget
    const formData = new FormData(form)

    const payload = {
      fullName: formData.get('fullName'),
      email: formData.get('email'),
      company: formData.get('company'),
      phone: formData.get('phone'),
      service: formData.get('service'),
      budget: formData.get('budget'),
      message: formData.get('message'),
    }

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        setStatus('error')
        setErrorMessage(data.error || 'Something went wrong. Please try again.')
        return
      }

      setStatus('success')
      form.reset()
      setShowSuccessModal(true)
    } catch {
      setStatus('error')
      setErrorMessage('Network error. Please check your connection and try again.')
    }
  }

  return (
    <section className="relative overflow-hidden bg-[#060E1C] pb-20 pt-32 text-white">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[520px] w-[680px] rounded-full bg-[#39D97A]/12 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/8 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.045)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#39D97A]/12 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="growth" size={14} color="#39D97A" />
              Start A Project
            </div>

            <h1 className="text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Let’s build your digital
              <br />
              <CurvedUnderlineText>growth system.</CurvedUnderlineText>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
              Tell us what you’re building, what needs fixing, or where your brand needs to grow.
              We’ll review your request and respond with the best next step.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                { label: 'Strategy-first', icon: 'strategy' },
                { label: 'Premium execution', icon: 'precision' },
                { label: 'Growth support', icon: 'analytics' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-[#39D97A]/15 bg-[#39D97A]/8 p-4 transition hover:border-[#39D97A]/35 hover:bg-[#39D97A]/12"
                >
                  <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
            
            <div className="mt-8">
  <a
    href="https://wa.me/2348153153827"
    target="_blank"
    rel="noopener noreferrer"
    className="group inline-flex items-center gap-3 rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/8 px-5 py-4 text-sm font-bold text-white/70 transition-all duration-300 hover:border-[#39D97A]/35 hover:bg-[#39D97A]/14 hover:text-white"
  >
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#39D97A] shadow-[0_0_25px_rgba(57,217,122,0.28)]">
      <SvgIcon name="whatsapp" size={20} color="#06101F" />
    </div>

    <div className="text-left">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
        WhatsApp Support
      </p>

      <p className="mt-1 text-sm font-black tracking-[0.02em] text-white">
        +234 815 315 3827
      </p>
    </div>

    <SvgIcon
      name="arrow-diagonal"
      size={16}
      color="#39D97A"
      className="ml-2 transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
    />
  </a>
</div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative overflow-hidden rounded-[2rem] border border-[#39D97A]/18 bg-[#071427]/90 p-5 shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6 md:p-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_38%)]" />

            <div className="relative grid gap-5">
              <div className="grid gap-5 md:grid-cols-2">
                <input
                  name="fullName"
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                  placeholder="Full name"
                  required
                />
                <input
                  name="email"
                  type="email"
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                  placeholder="Email address"
                  required
                />
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <input
                  name="company"
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                  placeholder="Company / brand name"
                />
                <input
                  name="phone"
                  className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                  placeholder="Phone / WhatsApp"
                />
              </div>

              <select
                name="service"
                className="rounded-2xl border border-white/10 bg-[#071427] px-4 py-4 text-sm text-white outline-none transition focus:border-[#39D97A]/55"
              >
                <option>Website Design / Redesign</option>
                <option>Shopify Store Optimization</option>
                <option>Brand Identity</option>
                <option>Conversion / Growth System</option>
                <option>Technical Support</option>
                <option>Full Digital Growth System</option>
              </select>

              <select
                name="budget"
                className="rounded-2xl border border-white/10 bg-[#071427] px-4 py-4 text-sm text-white outline-none transition focus:border-[#39D97A]/55"
              >
                <option>Estimated budget</option>
                <option>Below $500</option>
                <option>$500 - $1,500</option>
                <option>$1,500 - $5,000</option>
                <option>$5,000 - $10,000</option>
                <option>$10,000 - $15,000</option>
                <option>$15,000+</option>
                <option>Custom / Not sure yet</option>
              </select>

              <textarea
                name="message"
                className="min-h-[170px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                placeholder="Tell us about your project, current problem, or goal..."
                required
              />

              <button
                disabled={status === 'loading'}
                className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] shadow-[0_0_36px_rgba(57,217,122,0.25)] transition hover:scale-[1.02] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === 'loading' ? 'Submitting Inquiry...' : 'Submit Project Inquiry'}
                <SvgIcon
                  name="arrow-diagonal"
                  size={16}
                  color="#06101F"
                  className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </button>

              {status === 'error' && (
                <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">
                  {errorMessage}
                </p>
              )}
            </div>
          </motion.form>
        </div>
      </div>

      <AnimatePresence>
        {showSuccessModal && (
          <motion.div
            className="fixed inset-0 z-[999] flex items-center justify-center bg-[#02070F]/80 px-5 backdrop-blur-xl"
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 30, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: 20, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="relative w-full max-w-xl overflow-hidden rounded-[2rem] border border-[#39D97A]/25 bg-[#071427] p-6 text-center shadow-[0_40px_130px_rgba(0,0,0,0.5)] sm:p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(57,217,122,0.22),transparent_45%)]" />

              <div className="relative">
                <motion.div
                  initial={reducedMotion ? false : { scale: 0.6, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.08 }}
                  className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#39D97A] shadow-[0_0_60px_rgba(57,217,122,0.4)]"
                >
                  <SvgIcon name="precision" size={36} color="#06101F" />
                </motion.div>

                <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.2em] text-[#39D97A]">
                  Inquiry Submitted
                </p>

                <h2 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                  Congratulations, your request has been received.
                </h2>

                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/65 sm:text-base">
                  Thank you for reaching out to Hbee Digitals. We’ve received your project inquiry
                  and our team will get back to you within the next 24 hours.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    'Request received',
                    'Review in progress',
                    'Reply within 24 hours',
                  ].map((item) => (
                    <div
                      key={item}
                      className="rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/8 px-4 py-3 text-xs font-bold text-white/65"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false)
                    setStatus('idle')
                  }}
                  className="mt-8 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                >
                  Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}