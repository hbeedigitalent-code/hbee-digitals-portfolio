'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface SiteSettings {
  id?: string
  site_name: string
  logo_url: string
  favicon_url: string
  contact_email: string
  contact_phone: string
  contact_address: string
  footer_description: string
  google_analytics_id: string
  meta_description: string
  meta_keywords: string
  facebook_url: string
  twitter_url: string
  instagram_url: string
  linkedin_url: string
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: 'Hbee Digitals',
    logo_url: '/svgs/logo.svg',
    favicon_url: '/favicon.ico',
    contact_email: 'contact@hbeedigitals.com',
    contact_phone: '+234 815 315 3827',
    contact_address: 'Abuja, Nigeria - Serving Brands Internationally',
    footer_description: 'Premium websites, ecommerce systems, Shopify optimization, and conversion-focused digital experiences.',
    google_analytics_id: '',
    meta_description: 'Premium websites, Shopify optimization, and conversion-focused digital experiences for ambitious brands.',
    meta_keywords: 'web development, ecommerce, shopify, digital marketing, branding, UI/UX',
    facebook_url: '',
    twitter_url: '',
    instagram_url: '',
    linkedin_url: '',
  })

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    const { data } = await supabase.from('site_settings').select('*').single()
    if (data) setSettings({ ...settings, ...data })
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    setMessage('')

    const { error } = await supabase.from('site_settings').upsert({
      ...settings,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      setMessage(`Error: ${error.message}`)
    } else {
      setMessage('Settings saved successfully!')
    }
    setSaving(false)
    setTimeout(() => setMessage(''), 3000)
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-[var(--text-primary)]">Site Settings</h2>
      <p className="text-sm text-[var(--text-secondary)]">Manage your website configuration, SEO, and contact information.</p>

      {message && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${message.includes('Error') ? 'border-red-500/20 bg-red-500/10 text-red-400' : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'}`}>
          {message}
        </div>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="settings" size={18} color="var(--accent)" />
          General Settings
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Site Name</label>
            <input value={settings.site_name} onChange={(e) => setSettings({ ...settings, site_name: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Logo URL</label>
            <input value={settings.logo_url} onChange={(e) => setSettings({ ...settings, logo_url: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Favicon URL</label>
            <input value={settings.favicon_url} onChange={(e) => setSettings({ ...settings, favicon_url: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Google Analytics ID</label>
            <input value={settings.google_analytics_id} onChange={(e) => setSettings({ ...settings, google_analytics_id: e.target.value })} placeholder="G-XXXXXXXXXX" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="email" size={18} color="var(--accent)" />
          Contact Information
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email</label>
            <input value={settings.contact_email} onChange={(e) => setSettings({ ...settings, contact_email: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Phone</label>
            <input value={settings.contact_phone} onChange={(e) => setSettings({ ...settings, contact_phone: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Address</label>
            <input value={settings.contact_address} onChange={(e) => setSettings({ ...settings, contact_address: e.target.value })} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Footer Description</label>
            <textarea value={settings.footer_description} onChange={(e) => setSettings({ ...settings, footer_description: e.target.value })} rows={3} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="branding" size={18} color="var(--accent)" />
          Social Media Links
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Facebook</label>
            <input value={settings.facebook_url} onChange={(e) => setSettings({ ...settings, facebook_url: e.target.value })} placeholder="https://facebook.com/..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Twitter/X</label>
            <input value={settings.twitter_url} onChange={(e) => setSettings({ ...settings, twitter_url: e.target.value })} placeholder="https://twitter.com/..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Instagram</label>
            <input value={settings.instagram_url} onChange={(e) => setSettings({ ...settings, instagram_url: e.target.value })} placeholder="https://instagram.com/..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">LinkedIn</label>
            <input value={settings.linkedin_url} onChange={(e) => setSettings({ ...settings, linkedin_url: e.target.value })} placeholder="https://linkedin.com/..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="search" size={18} color="var(--accent)" />
          SEO Settings
        </h3>
        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Meta Description</label>
            <textarea value={settings.meta_description} onChange={(e) => setSettings({ ...settings, meta_description: e.target.value })} rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Appears in search engine results (150-160 characters)</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Meta Keywords</label>
            <input value={settings.meta_keywords} onChange={(e) => setSettings({ ...settings, meta_keywords: e.target.value })} placeholder="keyword1, keyword2, keyword3" className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5" />
          </div>
        </div>
      </div>

      <button onClick={saveSettings} disabled={saving} className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50">
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}