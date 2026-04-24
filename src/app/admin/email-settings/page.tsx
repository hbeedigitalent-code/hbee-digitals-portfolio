'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function EmailSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchSettings()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/admin/login')
    }
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('email_settings').select('*').single()
    setSettings(data || {})
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    const { error } = await supabase
      .from('email_settings')
      .upsert({
        id: settings.id,
        admin_email: settings.admin_email,
        from_name: settings.from_name,
        from_email: settings.from_email,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        smtp_password: settings.smtp_password,
        notify_new_message: settings.notify_new_message,
        notify_new_project: settings.notify_new_project,
        updated_at: new Date().toISOString()
      })

    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Email settings saved successfully!' })
    }
    setSaving(false)
  }

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' })
      return
    }

    setTesting(true)
    setMessage(null)

    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test Email from Hbee Digitals CMS',
          html: '<h1>Test Email</h1><p>This is a test email from your CMS. Email notifications are working!</p>',
          name: 'Test User',
          email: testEmail,
          message: 'This is a test message to verify email notifications.'
        })
      })

      if (response.ok) {
        setMessage({ type: 'success', text: `Test email sent to ${testEmail}! Check your inbox.` })
      } else {
        setMessage({ type: 'error', text: 'Failed to send test email' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error sending test email' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        <p className="mt-2 text-gray-600">Loading settings...</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Email Notifications</h2>
          <p className="text-sm text-gray-500 mt-1">Configure email settings for notifications</p>
        </div>
        <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-800">
          ← Back
        </Link>
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

      <form onSubmit={handleSave} className="bg-white rounded-xl shadow-sm p-6 space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
            Notification Settings
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Admin Email *</label>
              <input
                type="email"
                required
                value={settings?.admin_email || ''}
                onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="admin@example.com"
              />
              <p className="text-xs text-gray-400 mt-1">Emails will be sent to this address</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">From Name</label>
              <input
                type="text"
                value={settings?.from_name || 'Hbee Digitals'}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">From Email</label>
              <input
                type="email"
                value={settings?.from_email || ''}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="noreply@example.com"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
            SMTP Configuration (Optional)
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Leave empty to use the default email logging. Configure SMTP for real email delivery.
          </p>
          
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Host</label>
              <input
                type="text"
                value={settings?.smtp_host || ''}
                onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Port</label>
              <input
                type="number"
                value={settings?.smtp_port || 587}
                onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="587"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Username</label>
              <input
                type="text"
                value={settings?.smtp_user || ''}
                onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="user@example.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">SMTP Password</label>
              <input
                type="password"
                value={settings?.smtp_password || ''}
                onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
            Notification Triggers
          </h3>
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings?.notify_new_message || false}
                onChange={(e) => setSettings({ ...settings, notify_new_message: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Send email when new contact message is received</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings?.notify_new_project || false}
                onChange={(e) => setSettings({ ...settings, notify_new_project: e.target.checked })}
                className="w-4 h-4"
              />
              <span className="text-sm">Send email when new project is added</span>
            </label>
          </div>
        </div>

        <div className="border-t pt-6 flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: 'var(--primary-color)' }}
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <Link href="/admin/dashboard" className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
            Cancel
          </Link>
        </div>
      </form>

      {/* Test Email Section */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--primary-color)' }}>
          Test Email
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          Send a test email to verify your settings are working correctly.
        </p>
        <div className="flex gap-3">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            placeholder="test@example.com"
            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={handleTestEmail}
            disabled={testing}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
          >
            {testing ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">📧 About Email Notifications</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Emails are currently logged to the server console</li>
          <li>• For real email delivery, configure SMTP or use a service like Resend</li>
          <li>• Test emails will appear in your server logs if SMTP is not configured</li>
          <li>• Contact form submissions will trigger notifications automatically</li>
        </ul>
      </div>
    </div>
  )
}