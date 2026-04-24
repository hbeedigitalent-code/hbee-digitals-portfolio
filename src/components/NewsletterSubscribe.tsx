'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

export default function NewsletterSubscribe() {
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setStatus('idle')

    // Get IP address (simple version)
    let ipAddress = ''
    try {
      const res = await fetch('https://api.ipify.org?format=json')
      const data = await res.json()
      ipAddress = data.ip
    } catch {
      ipAddress = 'unknown'
    }

    const { error } = await supabase.from('subscribers').insert([
      { email, name: name || null, ip_address: ipAddress, source: 'website' }
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
      
      // Send notification to admin
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: `New Newsletter Subscriber: ${email}`,
            html: `
              <h2>New Newsletter Subscriber</h2>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Name:</strong> ${name || 'Not provided'}</p>
              <p><strong>IP Address:</strong> ${ipAddress}</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
            `
          })
        })
      } catch {
        // Silent fail for notification
      }
    }
    setLoading(false)

    // Auto-hide success message after 5 seconds
    setTimeout(() => {
      if (status === 'success') {
        setStatus('idle')
        setMessage('')
      }
    }, 5000)
  }

  return (
    <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
      <h3 className="text-xl font-bold text-white mb-2">Subscribe to Our Newsletter</h3>
      <p className="text-white/70 text-sm mb-4">
        Get the latest updates and exclusive offers.
      </p>
      
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          type="text"
          placeholder="Your name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="email"
          required
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
      
      <AnimatePresence>
        {status !== 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`mt-3 p-2 rounded text-sm text-center ${
              status === 'success' ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {message}
          </motion.div>
        )}
      </AnimatePresence>
      
      <p className="text-white/40 text-xs text-center mt-3">
        No spam. Unsubscribe anytime.
      </p>
    </div>
  )
}