'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, Loader2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'

export default function ContactPage() {
  const contactInfo = [
    {
      icon: <Mail className="w-6 h-6" />,
      title: 'Email Us',
      detail: 'hbeedigitalent@gmail.com',
      link: 'mailto:hbeedigitalent@gmail.com',
    },
    {
      icon: <Phone className="w-6 h-6" />,
      title: 'Call Us',
      detail: '+234 912 191 3997',
      link: 'tel:+2349121913997',
    },
    {
      icon: <MapPin className="w-6 h-6" />,
      title: 'Visit Us',
      detail: 'Plot 241, Lambata Kwali Abuja FCT, Nigeria',
      link: '#',
    },
  ]

  const socialLinks = [
    { name: 'Facebook', url: '#', icon: '/svgs/facebook.svg' },
    { name: 'Twitter', url: '#', icon: '/svgs/twitter.svg' },
    { name: 'LinkedIn', url: '#', icon: '/svgs/linkedin.svg' },
    { name: 'Instagram', url: '#', icon: '/svgs/instagram.svg' },
    { name: 'GitHub', url: '#', icon: '/svgs/github.svg' },
  ]

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white" id="main-content">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Get In Touch</h1>
              <p className="text-lg text-gray-600 mb-8">
                Ready to start your next project? Let’s create something amazing together.
              </p>

              <div className="space-y-6 mb-8">
                {contactInfo.map((item, index) => (
                  <motion.a
                    key={item.title}
                    href={item.link}
                    className="flex items-center p-4 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-300 group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    whileHover={{ x: 10 }}
                  >
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 mr-4">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-gray-900 font-semibold group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </div>
                      <div className="text-gray-600 text-sm">{item.detail}</div>
                    </div>
                  </motion.a>
                ))}
              </div>

              {/* Social Links */}
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Follow Us</h4>
                <div className="flex space-x-4">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.name}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 bg-gray-100 text-gray-600 rounded-lg flex items-center justify-center border border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition-all duration-300 group"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + index * 0.1 }}
                      whileHover={{ scale: 1.1 }}
                      aria-label={`Follow us on ${social.name}`}
                    >
                      <div className="w-6 h-6 relative">
                        <Image
                          src={social.icon}
                          alt={social.name}
                          fill
                          className="object-contain filter group-hover:brightness-0 group-hover:invert transition-all duration-300"
                        />
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <ContactForm />
            </motion.div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function ContactForm() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
    _honey: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [submitMessage, setSubmitMessage] = useState('')
  const statusRef = useRef<HTMLDivElement>(null)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.email.trim()) newErrors.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) newErrors.email = 'Please enter a valid email'
    if (!formData.subject.trim()) newErrors.subject = 'Subject is required'
    if (!formData.message.trim()) newErrors.message = 'Message is required'
    else if (formData.message.trim().length < 10) newErrors.message = 'Message must be at least 10 characters'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    if (formData._honey) {
      setSubmitStatus('success')
      setSubmitMessage('Thank you! Your message has been sent.')
      return
    }
    setIsSubmitting(true)
    setSubmitStatus('idle')
    setSubmitMessage('')
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: '',
          service: formData.subject,
          budget: 'Not specified',
          message: formData.message,
        }),
      })
      const result = await response.json()
      if (response.ok) {
        setSubmitStatus('success')
        setSubmitMessage('Thank you! Your message has been sent successfully. We will get back to you within 24 hours.')
        setFormData({ name: '', email: '', subject: '', message: '', _honey: '' })
        statusRef.current?.focus()
      } else {
        setSubmitStatus('error')
        setSubmitMessage(result.error || 'Failed to send message. Please try again.')
        statusRef.current?.focus()
      }
    } catch (error) {
      setSubmitStatus('error')
      setSubmitMessage('A network error occurred. Please check your connection and try again.')
      statusRef.current?.focus()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Contact form">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Your Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
              errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="John Doe"
            aria-required="true"
            aria-invalid={errors.name ? 'true' : 'false'}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          {errors.name && (
            <p id="name-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.name}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
            Your Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
              errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
            }`}
            placeholder="john@example.com"
            aria-required="true"
            aria-invalid={errors.email ? 'true' : 'false'}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
          {errors.email && (
            <p id="email-error" className="mt-1 text-sm text-red-600" role="alert">
              {errors.email}
            </p>
          )}
        </div>
      </div>
      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
          Subject <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="subject"
          name="subject"
          value={formData.subject}
          onChange={handleChange}
          className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-colors ${
            errors.subject ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder="Project Inquiry"
          aria-required="true"
          aria-invalid={errors.subject ? 'true' : 'false'}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
        />
        {errors.subject && (
          <p id="subject-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.subject}
          </p>
        )}
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
          Message <span className="text-red-500">*</span>
        </label>
        <textarea
          id="message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          rows={6}
          className={`w-full px-4 py-3 bg-white border rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none transition-colors resize-none ${
            errors.message ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
          }`}
          placeholder="Tell us about your project..."
          aria-required="true"
          aria-invalid={errors.message ? 'true' : 'false'}
          aria-describedby={errors.message ? 'message-error' : undefined}
        />
        {errors.message && (
          <p id="message-error" className="mt-1 text-sm text-red-600" role="alert">
            {errors.message}
          </p>
        )}
      </div>

      {/* Honeypot */}
      <div className="absolute opacity-0 top-0 left-0 h-0 w-0 overflow-hidden" aria-hidden="true">
        <label htmlFor="_honey">Leave this empty</label>
        <input
          type="text"
          id="_honey"
          name="_honey"
          value={formData._honey}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <motion.button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-gradient-to-r from-blue-600 to-blue-500 text-white py-4 rounded-lg font-semibold hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
        whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Sending Message...</span>
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            <span>Send Message</span>
          </>
        )}
      </motion.button>

      {submitStatus !== 'idle' && (
        <div
          ref={statusRef}
          tabIndex={-1}
          className={`p-4 rounded-lg ${
            submitStatus === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
          role="status"
          aria-live="polite"
        >
          {submitStatus === 'success' && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {submitMessage}
            </div>
          )}
          {submitStatus === 'error' && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {submitMessage}
            </div>
          )}
        </div>
      )}
    </form>
  )
}