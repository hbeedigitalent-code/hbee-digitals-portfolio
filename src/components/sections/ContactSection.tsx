'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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
      fullName: String(formData.get('fullName') || ''),
      email: String(formData.get('email') || ''),
      company: String(formData.get('company') || ''),
      phone: String(formData.get('phone') || ''),
      service: String(formData.get('service') || ''),
      budget: String(formData.get('budget') || ''),
      timeline: String(formData.get('timeline') || ''),
      website: String(formData.get('website') || ''),
      message: String(formData.get('message') || ''),
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
    <section className="relative overflow-hidden bg-[#07111F] pb-20 pt-32 text-white lg:pt-36">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[520px] w-[680px] rounded-full bg-[#39D97A]/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/6 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="lg:sticky lg:top-28"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="growth" size={14} color="#39D97A" />
              Start A Project
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Let’s build your digital <GradientHeading>growth system.</GradientHeading>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg">
              Tell us what you’re building, what needs fixing, or where your brand needs to grow.
              We’ll review your request and respond with a clear next step.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                {
                  label: 'Clear Project Review',
                  text: 'We review your goals, current gaps, and best direction.',
                  icon: 'analytics',
                },
                {
                  label: 'Strategy First',
                  text: 'Every recommendation starts with trust, UX, and conversion.',
                  icon: 'strategy',
                },
                {
                  label: 'Fast Response',
                  text: 'You can expect a reply within 24 hours.',
                  icon: 'messages',
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-4 transition hover:border-[#39D97A]/28 hover:bg-[#13233A]"
                >
                  <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                    <SvgIcon name={item.icon} size={19} color="#39D97A" />
                  </div>

                  <p className="text-sm font-black text-white">{item.label}</p>

                  <p className="mt-2 text-xs leading-5 text-white/45">
                    {item.text}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-[1.6rem] border border-[#1E314A] bg-[#0E1B2D] p-5">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Prefer direct conversation?
              </p>

              <a
                href="https://wa.me/2348153153827"
                target="_blank"
                rel="noopener noreferrer"
                className="group inline-flex w-full items-center gap-4 rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/8 px-5 py-4 text-sm font-bold text-white/70 transition hover:border-[#39D97A]/35 hover:bg-[#39D97A]/14 hover:text-white"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#39D97A] shadow-[0_0_25px_rgba(57,217,122,0.28)]">
                  <SvgIcon name="whatsapp" size={21} color="#06101F" />
                </div>

                <div className="min-w-0 flex-1 text-left">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">
                    WhatsApp Support
                  </p>

                  <p className="mt-1 text-sm font-black tracking-[0.02em] text-white">
                    +234 815 315 3827
                  </p>
                </div>

                <SvgIcon name="arrow-diagonal" size={16} color="#39D97A" />
              </a>
            </div>
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={reducedMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.1 }}
            className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]/95 p-5 shadow-[0_35px_110px_rgba(0,0,0,0.35)] backdrop-blur-2xl sm:p-6 md:p-8"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.14),transparent_38%)]" />

            <div className="relative">
              <div className="mb-7">
                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Project Inquiry
                </p>

                <h2 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                  Tell us about your project.
                </h2>

                <p className="mt-3 text-sm leading-7 text-white/55">
                  The more context you give, the better we can recommend the right next step.
                </p>
              </div>

              <div className="grid gap-5">
                <div className="grid gap-5 md:grid-cols-2">
                  <Field name="fullName" placeholder="Full name" required />
                  <Field name="email" type="email" placeholder="Email address" required />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <Field name="company" placeholder="Company / brand name" />
                  <Field name="phone" placeholder="Phone / WhatsApp" />
                </div>

                <Field name="website" placeholder="Current website / store URL" />

                <div className="grid gap-5 md:grid-cols-2">
                  <Select name="service" defaultValue="Website Design / Redesign">
                    <option>Website Design / Redesign</option>
                    <option>Shopify Store Optimization</option>
                    <option>Ecommerce Growth System</option>
                    <option>Brand Strategy / Identity</option>
                    <option>UI/UX Improvement</option>
                    <option>Digital Marketing Support</option>
                    <option>Technical Support</option>
                    <option>Full Digital Growth System</option>
                  </Select>

                  <Select name="budget" defaultValue="Estimated budget">
                    <option>Estimated budget</option>
                    <option>Below $500</option>
                    <option>$500 - $1,500</option>
                    <option>$1,500 - $5,000</option>
                    <option>$5,000 - $10,000</option>
                    <option>$10,000+</option>
                    <option>Custom / Not sure yet</option>
                  </Select>
                </div>

                <Select name="timeline" defaultValue="Project timeline">
                  <option>Project timeline</option>
                  <option>ASAP / urgent</option>
                  <option>Within 2 weeks</option>
                  <option>Within 1 month</option>
                  <option>1 - 3 months</option>
                  <option>Still planning</option>
                </Select>

                <textarea
                  name="message"
                  className="min-h-[180px] rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
                  placeholder="Tell us about your project, current problem, goals, or what you want improved..."
                  required
                />

                <button
                  disabled={status === 'loading'}
                  className="group inline-flex min-h-[56px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] shadow-[0_0_36px_rgba(57,217,122,0.25)] transition hover:scale-[1.02] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === 'loading' ? 'Submitting Inquiry...' : 'Submit Project Inquiry'}
                  <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
                </button>

                {status === 'error' && (
                  <p className="rounded-2xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm font-bold text-red-300">
                    {errorMessage}
                  </p>
                )}

                <p className="text-center text-xs leading-6 text-white/38">
                  By submitting this form, you agree to be contacted about your project inquiry.
                </p>
              </div>
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
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#39D97A] shadow-[0_0_60px_rgba(57,217,122,0.4)]">
                  <SvgIcon name="verified" size={36} color="#06101F" />
                </div>

                <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                  Inquiry Submitted
                </p>

                <h2 className="text-3xl font-black leading-tight tracking-[-0.045em] text-white sm:text-4xl">
                  Your request has been received.
                </h2>

                <p className="mx-auto mt-5 max-w-md text-sm leading-7 text-white/65 sm:text-base">
                  Thank you for reaching out to Hbee Digitals. We’ll review your inquiry and respond
                  within the next 24 hours with the best next step.
                </p>

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

function Field({
  name,
  placeholder,
  type = 'text',
  required = false,
}: {
  name: string
  placeholder: string
  type?: string
  required?: boolean
}) {
  return (
    <input
      name={name}
      type={type}
      required={required}
      className="rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm text-white outline-none placeholder:text-white/35 transition focus:border-[#39D97A]/55 focus:bg-[#39D97A]/8"
      placeholder={placeholder}
    />
  )
}

function Select({
  name,
  children,
  defaultValue,
}: {
  name: string
  children: React.ReactNode
  defaultValue?: string
}) {
  return (
    <select
      name={name}
      defaultValue={defaultValue}
      className="rounded-2xl border border-white/10 bg-[#071427] px-4 py-4 text-sm text-white outline-none transition focus:border-[#39D97A]/55"
    >
      {children}
    </select>
  )
}