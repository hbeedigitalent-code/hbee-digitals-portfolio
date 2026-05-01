'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [budget, setBudget] = useState('')
  const [message, setMessage] = useState('')
  const [projectDetails, setProjectDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const budgetOptions = [
    { value: '', label: 'Select budget range' },
    { value: 'under-5k', label: 'Under $5,000' },
    { value: '5k-10k', label: '$5,000 - $10,000' },
    { value: '10k-25k', label: '$10,000 - $25,000' },
    { value: '25k-50k', label: '$25,000 - $50,000' },
    { value: '50k-plus', label: '$50,000+' },
    { value: 'not-sure', label: 'Not sure / TBD' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: dbError } = await supabase.from('messages').insert([
      { 
        name, 
        email, 
        phone: phone || null,
        budget: budget || null,
        message, 
        project_details: projectDetails || null,
        is_read: false 
      }
    ])

    if (dbError) {
      setError('Failed to send message. Please try again.')
      setLoading(false)
      return
    }

    try {
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          budget,
          message,
          projectDetails,
          subject: `New Project Inquiry from ${name}`
        })
      })
    } catch (emailError) {
      console.error('Email notification failed:', emailError)
    }

    setSubmitted(true)
    setName('')
    setEmail('')
    setPhone('')
    setBudget('')
    setMessage('')
    setProjectDetails('')
    setLoading(false)
  }

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
              Start Your Project
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
            <p className="text-gray-600">
              Tell us about your project and we'll get back to you within 24 hours.
            </p>
          </div>

          {submitted ? (
            <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-8 rounded-xl text-center">
              <div className="text-5xl mb-4">🎉</div>
              <p className="font-bold text-lg mb-2">Thank you for reaching out!</p>
              <p className="mb-4">We've received your inquiry and will get back to you shortly.</p>
              <button
                onClick={() => setSubmitted(false)}
                className="mt-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
                  {error}
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-5 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    placeholder="+1 (555) 000-0000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Project Budget *</label>
                  <select
                    required
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition bg-white"
                  >
                    {budgetOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Project Description *</label>
                <textarea
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  placeholder="Briefly describe your project..."
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Additional Details (optional)</label>
                <textarea
                  value={projectDetails}
                  onChange={(e) => setProjectDetails(e.target.value)}
                  rows={3}
                  className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                  placeholder="Timeline, specific requirements, design preferences..."
                />
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-6 text-white rounded-xl font-semibold text-base hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--primary-color)' }}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      Send Inquiry
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l10 10M7 7v10m10-10H7" />
                      </svg>
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-400 text-center mt-4">
                We'll never share your information. By submitting, you agree to our 
                <Link href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</Link>.
              </p>
            </form>
          )}
        </div>
      </main>

      <Footer />
    </>
  )
}