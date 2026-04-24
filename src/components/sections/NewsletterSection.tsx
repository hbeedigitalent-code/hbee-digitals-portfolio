'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

export default function NewsletterSection() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    let ipAddress = ''
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      ipAddress = data.ip
    } catch {
      ipAddress = 'unknown'
    }

    const { error } = await supabase.from('subscribers').insert([
      { email, name: name || null, ip_address: ipAddress, source: 'newsletter_section' }
    ])

    if (error) {
      if (error.code === '23505') {
        setStatus('error')
        setMessage('This email is already subscribed!')
      } else {
        setStatus('error')
        setMessage('Failed to subscribe. Please try again.')
      }
    } else {
      setStatus('success')
      setMessage('Thanks for subscribing! 🎉')
      setEmail('')
      setName('')
      
      await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: `New Newsletter Subscriber: ${email}`,
          html: `<h2>New Subscriber</h2><p>Email: ${email}</p><p>Name: ${name || 'Not provided'}</p>`
        })
      })
    }
    setLoading(false)

    setTimeout(() => {
      if (status === 'success') {
        setStatus('idle')
        setMessage('')
      }
    }, 5000)
  }

  return (
    <section className="py-16 bg-gradient-to-r from-[#0A1D37] to-[#1a2a4a]">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Stay Updated
            </h2>
            <p className="text-white/80 mb-8">
              Subscribe to our newsletter for the latest news, updates, and exclusive offers.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="flex flex-col sm:flex-row gap-4"
          >
            <input
              type="text"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="flex-1 px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 px-6 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50 whitespace-nowrap"
            >
              {loading ? 'Subscribing...' : 'Subscribe →'}
            </button>
          </motion.form>

          {status !== 'idle' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`mt-4 p-3 rounded-lg text-center ${
                status === 'success' 
                  ? 'bg-green-500/20 text-green-300 border border-green-500/30' 
                  : 'bg-red-500/20 text-red-300 border border-red-500/30'
              }`}
            >
              {message}
            </motion.div>
          )}

          <p className="text-white/40 text-xs mt-4">
            No spam. Unsubscribe anytime.
          </p>
        </div>
      </div>
    </section>
  )
}