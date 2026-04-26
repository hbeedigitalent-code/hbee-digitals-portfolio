'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SiteSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) router.push('/admin/login')
      else fetchSettings()
    }
    checkUser()
  }, [])

  const fetchSettings = async () => {
    const { data } = await supabase.from('site_settings').select('*').single()
    setSettings(data || {
      site_name: 'Hbee Digitals',
      site_title: 'Hbee Digitals - Digital Solutions',
      site_description: 'Modern digital agency building exceptional web experiences',
      primary_color: '#0A1D37',
      secondary_color: '#FFFFFF',
      accent_color: '#3B82F6',
      logo_url: '',
      contact_email: '',
      contact_phone: '',
      contact_address: '',
      social_twitter: '',
      social_linkedin: '',
      social_github: '',
      social_instagram: '',
    })
    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Logo must be less than 2MB' })
      return
    }

    setUploading(true)
    try {
      const fileName = `logo-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)

      if (urlData?.publicUrl) {
        setSettings({ ...settings, logo_url: urlData.publicUrl })
        setMessage({ type: 'success', text: 'Logo uploaded!' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message })
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    document.documentElement.style.setProperty('--primary-color', settings.primary_color || '#0A1D37')
    document.documentElement.style.setProperty('--secondary-color', settings.secondary_color || '#FFFFFF')
    document.documentElement.style.setProperty('--accent-color', settings.accent_color || '#3B82F6')

    const { error } = await supabase.from('site_settings').upsert(settings, { onConflict: 'id' })

    if (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Settings saved! Refresh site to see changes.' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading...</p>
      </div>
    </div>
  )

  if (!settings) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Site Settings</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80 flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-3xl">
        {message && (
          <div className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.type === 'success' ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            )}
            {message.text}
          </div>
        )}

        <div className="space-y-6">
          
          {/* BRANDING */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Branding</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label>
                <input value={settings.site_name || ''} onChange={e => setSettings({...settings, site_name: e.target.value})}
                  className="w-full p-2.5 border rounded-lg" placeholder="Hbee Digitals" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Site Title (SEO)</label>
                <input value={settings.site_title || ''} onChange={e => setSettings({...settings, site_title: e.target.value})}
                  className="w-full p-2.5 border rounded-lg" placeholder="Hbee Digitals - Digital Solutions" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Site Description (SEO)</label>
              <textarea value={settings.site_description || ''} onChange={e => setSettings({...settings, site_description: e.target.value})}
                rows={2} className="w-full p-2.5 border rounded-lg" />
            </div>
          </div>

          {/* LOGO */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Logo</h2>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              {settings.logo_url && (
                <div className="w-40 h-14 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden border">
                  <img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" />
                </div>
              )}
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                {uploading ? 'Uploading...' : 'Upload Logo'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
            </div>
            <input value={settings.logo_url || ''} onChange={e => setSettings({...settings, logo_url: e.target.value})}
              className="w-full p-2.5 border rounded-lg mt-3 text-sm" placeholder="Or paste logo URL" />
          </div>

          {/* COLORS */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Colors</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { label: 'Primary', key: 'primary_color', def: '#0A1D37', desc: 'Header, buttons' },
                { label: 'Secondary', key: 'secondary_color', def: '#FFFFFF', desc: 'Text on primary' },
                { label: 'Accent', key: 'accent_color', def: '#3B82F6', desc: 'Hover effects' },
              ].map(c => (
                <div key={c.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{c.label} Color</label>
                  <div className="flex gap-2">
                    <input type="color" value={settings[c.key] || c.def}
                      onChange={e => setSettings({...settings, [c.key]: e.target.value})}
                      className="w-10 h-10 rounded border cursor-pointer" />
                    <input type="text" value={settings[c.key] || c.def}
                      onChange={e => setSettings({...settings, [c.key]: e.target.value})}
                      className="flex-1 p-2 border rounded-lg text-sm" />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CONTACT */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Contact</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input value={settings.contact_email || ''} onChange={e => setSettings({...settings, contact_email: e.target.value})}
                  className="w-full p-2.5 border rounded-lg" placeholder="hello@hbeedigitals.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input value={settings.contact_phone || ''} onChange={e => setSettings({...settings, contact_phone: e.target.value})}
                  className="w-full p-2.5 border rounded-lg" placeholder="+1 (555) 123-4567" />
              </div>
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <input value={settings.contact_address || ''} onChange={e => setSettings({...settings, contact_address: e.target.value})}
                className="w-full p-2.5 border rounded-lg" placeholder="123 Digital Street" />
            </div>
          </div>

          {/* SOCIAL */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--primary-color)' }}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Social Links</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              {['twitter', 'linkedin', 'github', 'instagram'].map(s => (
                <div key={s}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">{s}</label>
                  <input value={settings[`social_${s}`] || ''} onChange={e => setSettings({...settings, [`social_${s}`]: e.target.value})}
                    className="w-full p-2.5 border rounded-lg" placeholder={`https://${s}.com/...`} />
                </div>
              ))}
            </div>
          </div>

          {/* SAVE */}
          <button onClick={handleSave} disabled={saving}
            className="w-full px-6 py-3 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-lg"
            style={{ backgroundColor: 'var(--primary-color)' }}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? 'Saving...' : 'Save All Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}