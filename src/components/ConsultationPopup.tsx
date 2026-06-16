'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import TurnstileWidget from '@/components/ui/TurnstileWidget'

interface ConsultationPopupProps {
  isOpen: boolean
  onClose: () => void
}

interface FormData {
  full_name: string
  email: string
  phone: string
  business_name: string
  website_url: string
  service_interest: string
  current_challenge: string
  contact_method: string
}

const serviceOptions = [
  'Web Development',
  'Shopify Optimization',
  'E-commerce Solutions',
  'UI/UX Design',
  'Digital Marketing',
  'Brand Strategy',
  'Technical Consulting',
  'SEO Optimization',
  'PPC Management',
  'Other'
]

const contactMethodOptions = ['Email', 'Phone', 'WhatsApp', 'Video Call']

export default function ConsultationPopup({ isOpen, onClose }: ConsultationPopupProps) {
  const [formData, setFormData] = useState<FormData>({
    full_name: '',
    email: '',
    phone: '',
    business_name: '',
    website_url: '',
    service_interest: '',
    current_challenge: '',
    contact_method: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const [resetTurnstile, setResetTurnstile] = useState(false)

  // Check if Turnstile is configured
  const isTurnstileConfigured = !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY

  // Handle ESC key press
  const handleEscKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    },
    [isOpen, onClose]
  )

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      window.addEventListener('keydown', handleEscKey)
    } else {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEscKey)
      // Reset form when modal closes after delay
      setTimeout(() => {
        if (!isOpen) {
          setSubmitted(false)
          setError('')
          setTurnstileToken(null)
          setResetTurnstile(prev => !prev)
          setFormData({
            full_name: '',
            email: '',
            phone: '',
            business_name: '',
            website_url: '',
            service_interest: '',
            current_challenge: '',
            contact_method: ''
          })
        }
      }, 300)
    }

    return () => {
      document.body.style.overflow = 'unset'
      window.removeEventListener('keydown', handleEscKey)
    }
  }, [isOpen, handleEscKey])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleTurnstileVerify = (token: string) => {
    setTurnstileToken(token)
    setError('')
  }

  const handleTurnstileError = () => {
    setError('Security verification failed. Please try again.')
    setTurnstileToken(null)
  }

  const handleTurnstileExpire = () => {
    setTurnstileToken(null)
    setError('Security verification expired. Please verify again.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Only check Turnstile if configured
    if (isTurnstileConfigured && !turnstileToken) {
      setError('Please complete the security verification.')
      return
    }
    
    setLoading(true)
    setError('')

    try {
      const requestBody: any = {
        form_type: 'free_consultation',
        source: 'consultation_popup',
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        business_name: formData.business_name,
        website_url: formData.website_url,
        service_interest: formData.service_interest,
        current_challenge: formData.current_challenge,
        message: formData.current_challenge,
        preferred_contact: formData.contact_method,
      }

      // Only include turnstile token if configured
      if (isTurnstileConfigured && turnstileToken) {
        requestBody.turnstile_token = turnstileToken
      }

      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const data = await response.json()

      if (response.ok) {
        setSubmitted(true)
        setTimeout(() => {
          onClose()
        }, 4000)
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
        setResetTurnstile(prev => !prev)
        setTurnstileToken(null)
      }
    } catch (err) {
      console.error('Submission error:', err)
      setError('Network error. Please try again.')
      setResetTurnstile(prev => !prev)
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[var(--bg-card)] shadow-2xl border border-[var(--border)]"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-[var(--bg-section)] transition-colors"
              aria-label="Close"
            >
              <img 
                src="/svgs/x-close.svg" 
                alt="Close" 
                width="20" 
                height="20"
                className="opacity-70 hover:opacity-100 transition-opacity"
              />
            </button>

            <div className="p-6 md:p-8">
              {!submitted ? (
                <>
                  <div className="mb-6 text-center">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
                      <span className="text-xs font-semibold text-[var(--accent)]">Free Consultation</span>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
                      Let's Talk Growth
                    </h2>
                    <p className="mt-2 text-sm text-[var(--text-secondary)]">
                      Tell us about your brand and goals. We'll review and get back to you within 24 hours.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          name="full_name"
                          value={formData.full_name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                          placeholder="John Doe"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Email Address *
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                          placeholder="hello@yourbrand.com"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Phone Number
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Business / Brand Name *
                        </label>
                        <input
                          type="text"
                          name="business_name"
                          value={formData.business_name}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                          placeholder="Your Brand"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Website URL
                        </label>
                        <input
                          type="url"
                          name="website_url"
                          value={formData.website_url}
                          onChange={handleChange}
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                          placeholder="https://yourstore.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                          Service Interested In *
                        </label>
                        <select
                          name="service_interest"
                          value={formData.service_interest}
                          onChange={handleChange}
                          required
                          className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                        >
                          <option value="">Select a service...</option>
                          {serviceOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        What is your current biggest challenge? *
                      </label>
                      <textarea
                        name="current_challenge"
                        value={formData.current_challenge}
                        onChange={handleChange}
                        required
                        rows={3}
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition resize-none"
                        placeholder="Tell us about your goals, challenges, and what you're looking to achieve..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                        Preferred Contact Method *
                      </label>
                      <select
                        name="contact_method"
                        value={formData.contact_method}
                        onChange={handleChange}
                        required
                        className="w-full px-4 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/50 transition"
                      >
                        <option value="">Select method...</option>
                        {contactMethodOptions.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </div>

                    {/* Turnstile Widget - Only show if configured */}
                    {isTurnstileConfigured && (
                      <div className="py-2">
                        <TurnstileWidget
                          onVerify={handleTurnstileVerify}
                          onError={handleTurnstileError}
                          onExpire={handleTurnstileExpire}
                          reset={resetTurnstile}
                          theme="light"
                          size="normal"
                        />
                      </div>
                    )}

                    {error && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || (isTurnstileConfigured && !turnstileToken)}
                      className="btn-primary w-full justify-center py-3 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Submitting...
                        </span>
                      ) : (
                        'Request Free Consultation'
                      )}
                    </button>
                  </form>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--accent)]/10 flex items-center justify-center">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="32"
                      height="32"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2">
                    Thank You!
                  </h3>
                  <p className="text-[var(--text-secondary)]">
                    Your consultation request has been received. We'll review your details and get back to you shortly.
                  </p>
                  <button
                    onClick={onClose}
                    className="btn-primary mt-6"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}