'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Campaign {
  id: string
  subject: string
  content: string
  status: string
  sent_at: string
  total_recipients: number
}

export default function NewsletterPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchCampaigns()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchCampaigns = async () => {
    const { data } = await supabase
      .from('newsletter_campaigns')
      .select('*')
      .order('created_at', { ascending: false })
    
    setCampaigns(data || [])
    setLoading(false)
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setMessage(null)

    // Get all active subscribers
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('email, name')
      .eq('status', 'active')

    if (!subscribers || subscribers.length === 0) {
      setMessage({ type: 'error', text: 'No active subscribers to send to.' })
      setSending(false)
      return
    }

    // Save campaign
    const { data: campaign, error: campaignError } = await supabase
      .from('newsletter_campaigns')
      .insert([{
        subject,
        content,
        status: 'sent',
        sent_at: new Date().toISOString(),
        total_recipients: subscribers.length
      }])
      .select()
      .single()

    if (campaignError) {
      setMessage({ type: 'error', text: campaignError.message })
      setSending(false)
      return
    }

    // Send emails (batch process)
    let successCount = 0
    let failCount = 0

    for (const subscriber of subscribers) {
      try {
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: subscriber.email,
            subject: subject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: #0A1D37; padding: 20px; text-align: center;">
                  <h1 style="color: white; margin: 0;">Hbee Digitals</h1>
                </div>
                <div style="padding: 30px; background: white;">
                  <h2>${subject}</h2>
                  <div style="line-height: 1.6;">${content.replace(/\n/g, '<br>')}</div>
                  <hr style="margin: 20px 0;">
                  <p style="color: #666; font-size: 12px;">
                    You're receiving this because you subscribed to our newsletter.
                    <br>
                    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/unsubscribe?email=${subscriber.email}" style="color: #0A1D37;">
                      Unsubscribe here
                    </a>
                  </p>
                </div>
              </div>
            `
          })
        })
        successCount++
      } catch {
        failCount++
      }
    }

    setMessage({ 
      type: 'success', 
      text: `Campaign sent! Delivered to ${successCount} subscribers. Failed: ${failCount}` 
    })
    setShowForm(false)
    setSubject('')
    setContent('')
    fetchCampaigns()
    setSending(false)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading campaigns...</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Newsletter Campaigns</h2>
          <p className="text-sm text-gray-500 mt-1">Create and send email campaigns to subscribers</p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            + New Campaign
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-100 text-green-700 border border-green-200' 
            : 'bg-red-100 text-red-700 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create New Campaign</h3>
          <form onSubmit={handleSend} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Subject *</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Email subject line"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Content *</label>
              <textarea
                required
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={10}
                className="w-full p-2 border rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Write your email content here..."
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={sending}
                className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {sending ? 'Sending...' : 'Send Campaign'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {campaigns.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">📨</div>
            <p className="text-gray-500">No campaigns yet. Create your first newsletter!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Subject</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Status</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Recipients</th>
                  <th className="p-4 text-left text-sm font-semibold text-gray-600">Sent Date</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="p-4 font-medium text-gray-800">{campaign.subject}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{campaign.total_recipients}</td>
                    <td className="p-4 text-sm text-gray-500">
                      {campaign.sent_at ? new Date(campaign.sent_at).toLocaleString() : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">📧 About Newsletter</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Subscribers can sign up from the website footer</li>
          <li>• Manage subscribers in the Subscribers section</li>
          <li>• Campaigns are sent to all active subscribers</li>
          <li>• Each email includes an unsubscribe link</li>
        </ul>
      </div>
    </div>
  )
}