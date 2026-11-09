'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

// SECRETS STAY OUT OF THE BROWSER. This page used to select('*') from email_settings and upsert the whole object back,
// so an SMTP password — a credential — was pulled into the browser, held in React state and written back on every
// save, protected only by whatever RLS the table happens to have. Nothing in the application reads that table (mail is
// sent through the configured provider's environment variables), so the page now:
//   - selects an explicit list of NON-secret columns only;
//   - never displays, holds or sends smtp_password (there is no password field);
//   - upserts only named columns, so a value already stored is neither read nor overwritten.
// Removing the stored value itself is a database action (see docs/admin-browser-table-access.md) and is not done here.
const NON_SECRET_COLUMNS = 'id, admin_email, from_name, from_email, notify_new_inquiry, smtp_host, smtp_port, smtp_user'

export default function EmailSettings() {
  const [settings, setSettings] = useState<any>({
    admin_email: '',
    from_name: 'Hbee Digitals',
    from_email: 'noreply@hbeedigitals.com',
    notify_new_inquiry: true,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchSettings()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchSettings = async () => {
    const { data } = await supabase.from('email_settings').select(NON_SECRET_COLUMNS).single()
    if (data) setSettings(data)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    const { error } = await supabase
      .from('email_settings')
      .upsert({
        // Named fields only: never spread the row, so no column (least of all a credential) rides along by accident.
        ...(settings.id ? { id: settings.id } : {}),
        admin_email: settings.admin_email,
        from_name: settings.from_name,
        from_email: settings.from_email,
        notify_new_inquiry: settings.notify_new_inquiry,
        smtp_host: settings.smtp_host,
        smtp_port: settings.smtp_port,
        smtp_user: settings.smtp_user,
        updated_at: new Date().toISOString()
      })

    if (error) setMessage(`Error: ${error.message}`)
    else setMessage('Email settings saved!')

    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  const handleTestEmail = async () => {
    if (!testEmail) { setMessage('Enter a test email address'); return }
    setTesting(true)
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: testEmail,
          subject: 'Test Email from Hbee Digitals CMS',
          html: '<h1>Test Email</h1><p>Your email settings are working correctly!</p>',
        })
      })
      if (response.ok) setMessage(`Test email sent to ${testEmail}!`)
      else setMessage('Failed to send test email')
    } catch { setMessage('Error sending test email') }
    finally { setTesting(false); setTimeout(() => setMessage(''), 3000) }
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Email Settings</h2><p className="text-sm text-[var(--text-secondary)]">Configure email notifications and SMTP.</p></div>
        <Link href="/admin/dashboard" className="text-[var(--text-muted)] hover:text-[var(--accent)]">← Back</Link>
      </div>

      {message && <div className={`rounded-xl border p-4 text-sm ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>{message}</div>}

      <form onSubmit={handleSave} className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Admin Email *</label><input type="email" required value={settings.admin_email || ''} onChange={(e) => setSettings({ ...settings, admin_email: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        <div className="grid gap-4 md:grid-cols-2">
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">From Name</label><input type="text" value={settings.from_name || 'Hbee Digitals'} onChange={(e) => setSettings({ ...settings, from_name: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
          <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">From Email</label><input type="email" value={settings.from_email || ''} onChange={(e) => setSettings({ ...settings, from_email: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-lg font-black text-[var(--text-primary)]">SMTP Configuration</h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">SMTP Host</label><input type="text" value={settings.smtp_host || ''} onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" placeholder="smtp.gmail.com" /></div>
            <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">SMTP Port</label><input type="number" value={settings.smtp_port || 587} onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <div><label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">SMTP Username</label><input type="text" value={settings.smtp_user || ''} onChange={(e) => setSettings({ ...settings, smtp_user: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <p className="text-sm text-[var(--text-muted)] md:col-span-2">SMTP passwords are no longer edited or shown here: a credential should not pass through the browser. Outbound email is sent through the platform&rsquo;s configured provider, not through these fields.</p>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="mb-3 text-lg font-black text-[var(--text-primary)]">Notifications</h3>
          <label className="flex items-center gap-3"><input type="checkbox" checked={settings.notify_new_inquiry || false} onChange={(e) => setSettings({ ...settings, notify_new_inquiry: e.target.checked })} className="h-4 w-4" /> Send email when new inquiry is received</label>
        </div>

        <div className="flex gap-3 pt-4">
          <button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : 'Save Settings'}</button>
          <Link href="/admin/dashboard" className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black">Cancel</Link>
        </div>
      </form>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-3 text-lg font-black text-[var(--text-primary)]">Test Email</h3>
        <div className="flex gap-3">
          <input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="test@example.com" className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
          <button onClick={handleTestEmail} disabled={testing} className="rounded-full bg-[var(--accent)]/10 px-5 py-2 text-sm font-black text-[var(--accent)]">{testing ? 'Sending...' : 'Send Test'}</button>
        </div>
      </div>
    </div>
  )
}