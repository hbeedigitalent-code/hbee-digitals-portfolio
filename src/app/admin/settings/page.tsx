'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'

export default function SiteSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [activeTab, setActiveTab] = useState('branding')
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
      logo_url: '',
      logo_position: 'left',
      header_style: 'solid',
      primary_color: '#0A1D37',
      secondary_color: '#FFFFFF',
      accent_color: '#3B82F6',
      gradient_start: '#0A1D37',
      gradient_end: '#1a3a5c',
      body_bg_color: '#FFFFFF',
      body_text_color: '#1F2937',
      heading_color: '#0A1D37',
      link_color: '#3B82F6',
      link_hover_color: '#2563EB',
      button_bg_color: '#0A1D37',
      button_text_color: '#FFFFFF',
      button_hover_bg: '#1a3a5c',
      footer_bg_color: '#0A1D37',
      footer_text_color: '#FFFFFF',
      footer_heading_color: '#00BFFF',
      contact_email: '',
      contact_phone: '',
      contact_address: '',
      social_facebook: '',
      social_twitter: '',
      social_linkedin: '',
      social_instagram: '',
      social_github: '',
      social_whatsapp: '',
      social_telegram: '',
      social_youtube: '',
      heading_font: 'Poppins',
      body_font: 'Poppins',
      base_font_size: '16px',
      heading_uppercase: false,
    })
    setLoading(false)
  }

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) { setMessage({ type: 'error', text: 'Please upload an image file' }); return }
    if (file.size > 2 * 1024 * 1024) { setMessage({ type: 'error', text: 'Logo must be less than 2MB' }); return }
    setUploading(true)
    try {
      const fileName = `logo-${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('images').upload(fileName, file, { cacheControl: '3600', upsert: true })
      if (uploadError) throw uploadError
      const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName)
      if (urlData?.publicUrl) {
        setSettings({ ...settings, logo_url: urlData.publicUrl })
        setMessage({ type: 'success', text: 'Logo uploaded! Now click Save All Settings.' })
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: 'Upload failed: ' + err.message })
    } finally { setUploading(false) }
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    const root = document.documentElement.style
    root.setProperty('--primary-color', settings.primary_color || '#0A1D37')
    root.setProperty('--secondary-color', settings.secondary_color || '#FFFFFF')
    root.setProperty('--accent-color', settings.accent_color || '#3B82F6')

    // Use update with eq if id exists, otherwise insert
    if (settings.id) {
      const { error } = await supabase
        .from('site_settings')
        .update(settings)
        .eq('id', settings.id)
      if (error) { setMessage({ type: 'error', text: 'Error: ' + error.message }) }
      else { setMessage({ type: 'success', text: 'Settings saved! Refresh homepage (F5) to see changes.' }) }
    } else {
      const { data, error } = await supabase
        .from('site_settings')
        .insert([settings])
        .select()
      if (error) { setMessage({ type: 'error', text: 'Error: ' + error.message }) }
      else if (data?.length) { setSettings(data[0]); setMessage({ type: 'success', text: 'Settings saved! Refresh homepage (F5) to see changes.' }) }
    }
    setSaving(false)
  }

  const update = (key: string, value: any) => setSettings({ ...settings, [key]: value })

  const colorFields = (label: string, key: string, def: string) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <div className="flex gap-2">
        <input type="color" value={settings?.[key] || def} onChange={e => update(key, e.target.value)} className="w-9 h-9 rounded border cursor-pointer" />
        <input type="text" value={settings?.[key] || def} onChange={e => update(key, e.target.value)} className="flex-1 p-2 border rounded-lg text-xs" />
      </div>
    </div>
  )

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" /></div>
  if (!settings) return null

  const tabs = [
    { id: 'branding', label: 'Branding', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
    { id: 'colors', label: 'Colors', icon: 'M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01' },
    { id: 'typography', label: 'Typography', icon: 'M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18' },
    { id: 'header', label: 'Header', icon: 'M4 6h16M4 12h16M4 18h16' },
    { id: 'contact', label: 'Contact', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { id: 'social', label: 'Social', icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4 sticky top-0 z-20" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Theme Settings</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80 flex items-center gap-1 text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-4 lg:p-6 max-w-5xl">
        {message && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`mb-4 p-4 rounded-lg flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.type === 'success' ? (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
            )}
            {message.text}
          </motion.div>
        )}

        <div className="flex flex-wrap gap-1 mb-6 bg-white rounded-xl p-1 shadow-sm">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'text-white shadow-md' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}
              style={activeTab === tab.id ? { backgroundColor: 'var(--primary-color)' } : {}}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.icon} /></svg>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <AnimatePresence mode="wait">
            
            {activeTab === 'branding' && (
              <motion.div key="branding" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg> Branding</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Name</label><input value={settings.site_name || ''} onChange={e => update('site_name', e.target.value)} className="w-full p-2.5 border rounded-lg" placeholder="Hbee Digitals" /></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Title (SEO)</label><input value={settings.site_title || ''} onChange={e => update('site_title', e.target.value)} className="w-full p-2.5 border rounded-lg" /></div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Site Description</label><textarea value={settings.site_description || ''} onChange={e => update('site_description', e.target.value)} rows={2} className="w-full p-2.5 border rounded-lg" /></div>
                
                <div className="border-t pt-6">
                  <h3 className="font-semibold text-gray-900 mb-3">Logo</h3>
                  <div className="flex items-center gap-4 flex-wrap">
                    {settings.logo_url && <div className="w-40 h-14 bg-gray-100 rounded-lg flex items-center justify-center border"><img src={settings.logo_url} alt="Logo" className="max-w-full max-h-full object-contain p-1" /></div>}
                    <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>{uploading ? 'Uploading...' : 'Upload Logo'}</button>
                    <input ref={fileInputRef} type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                  </div>
                  <input value={settings.logo_url || ''} onChange={e => update('logo_url', e.target.value)} className="w-full p-2.5 border rounded-lg mt-3 text-sm" placeholder="Or paste logo URL (e.g. /svgs/logo.svg)" />
                </div>
              </motion.div>
            )}

            {activeTab === 'colors' && (
              <motion.div key="colors" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343" /></svg> Colors</h2>
                <div><h3 className="font-semibold text-sm text-gray-700 mb-3">General</h3><div className="grid md:grid-cols-3 gap-4">{colorFields('Primary', 'primary_color', '#0A1D37')}{colorFields('Secondary', 'secondary_color', '#FFFFFF')}{colorFields('Accent', 'accent_color', '#3B82F6')}</div></div>
                <div className="border-t pt-4"><h3 className="font-semibold text-sm text-gray-700 mb-3">Background & Text</h3><div className="grid md:grid-cols-3 gap-4">{colorFields('Body BG', 'body_bg_color', '#FFFFFF')}{colorFields('Body Text', 'body_text_color', '#1F2937')}{colorFields('Heading', 'heading_color', '#0A1D37')}</div></div>
                <div className="border-t pt-4"><h3 className="font-semibold text-sm text-gray-700 mb-3">Links & Buttons</h3><div className="grid md:grid-cols-3 gap-4">{colorFields('Link', 'link_color', '#3B82F6')}{colorFields('Link Hover', 'link_hover_color', '#2563EB')}{colorFields('Button BG', 'button_bg_color', '#0A1D37')}{colorFields('Button Text', 'button_text_color', '#FFFFFF')}{colorFields('Button Hover', 'button_hover_bg', '#1a3a5c')}</div></div>
                <div className="border-t pt-4"><h3 className="font-semibold text-sm text-gray-700 mb-3">Footer</h3><div className="grid md:grid-cols-3 gap-4">{colorFields('Footer BG', 'footer_bg_color', '#0A1D37')}{colorFields('Footer Text', 'footer_text_color', '#FFFFFF')}{colorFields('Footer Heading', 'footer_heading_color', '#00BFFF')}</div></div>
                <div className="border-t pt-4"><h3 className="font-semibold text-sm text-gray-700 mb-3">Gradient</h3><div className="grid md:grid-cols-2 gap-4">{colorFields('Gradient Start', 'gradient_start', '#0A1D37')}{colorFields('Gradient End', 'gradient_end', '#1a3a5c')}</div></div>
              </motion.div>
            )}

            {activeTab === 'typography' && (
              <motion.div key="typography" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M3 8h18M3 12h18M3 16h18M3 20h18" /></svg> Typography</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Heading Font</label><select value={settings.heading_font || 'Poppins'} onChange={e => update('heading_font', e.target.value)} className="w-full p-2.5 border rounded-lg">{['Poppins','Inter','Roboto','Montserrat','Raleway','Nunito'].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Body Font</label><select value={settings.body_font || 'Poppins'} onChange={e => update('body_font', e.target.value)} className="w-full p-2.5 border rounded-lg">{['Poppins','Inter','Roboto','Nunito','Open Sans','Lato'].map(f=><option key={f} value={f}>{f}</option>)}</select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Base Font Size</label><select value={settings.base_font_size || '16px'} onChange={e => update('base_font_size', e.target.value)} className="w-full p-2.5 border rounded-lg">{['14px','15px','16px','17px','18px'].map(s=><option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="flex items-center pt-6"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={settings.heading_uppercase || false} onChange={e => update('heading_uppercase', e.target.checked)} className="w-4 h-4" /><span className="text-sm text-gray-700">Headings in uppercase</span></label></div>
                </div>
              </motion.div>
            )}

            {activeTab === 'header' && (
              <motion.div key="header" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg> Header Settings</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Header Style</label><select value={settings.header_style || 'solid'} onChange={e => update('header_style', e.target.value)} className="w-full p-2.5 border rounded-lg"><option value="solid">Solid Color</option><option value="transparent">Transparent</option><option value="gradient">Gradient</option><option value="blur">Blur/Glass</option></select></div>
                  <div><label className="block text-sm font-medium text-gray-700 mb-1">Logo Position</label><select value={settings.logo_position || 'left'} onChange={e => update('logo_position', e.target.value)} className="w-full p-2.5 border rounded-lg"><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></div>
                </div>
              </motion.div>
            )}

            {activeTab === 'contact' && (
              <motion.div key="contact" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900"><svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>Contact</h2>
                <div className="grid md:grid-cols-2 gap-4"><div><label className="block text-sm font-medium text-gray-700 mb-1">Email</label><input value={settings.contact_email || ''} onChange={e => update('contact_email', e.target.value)} className="w-full p-2.5 border rounded-lg" /></div><div><label className="block text-sm font-medium text-gray-700 mb-1">Phone</label><input value={settings.contact_phone || ''} onChange={e => update('contact_phone', e.target.value)} className="w-full p-2.5 border rounded-lg" /></div></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Address</label><input value={settings.contact_address || ''} onChange={e => update('contact_address', e.target.value)} className="w-full p-2.5 border rounded-lg" /></div>
              </motion.div>
            )}

            {activeTab === 'social' && (
              <motion.div key="social" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">
                <h2 className="text-lg font-bold text-gray-900"><svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" /></svg>Social Links</h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {[{key:'social_facebook',label:'Facebook'},{key:'social_twitter',label:'Twitter/X'},{key:'social_instagram',label:'Instagram'},{key:'social_linkedin',label:'LinkedIn'},{key:'social_github',label:'GitHub'},{key:'social_youtube',label:'YouTube'},{key:'social_whatsapp',label:'WhatsApp'},{key:'social_telegram',label:'Telegram'}].map(s => (
                    <div key={s.key}><label className="block text-sm font-medium text-gray-700 mb-1">{s.label}</label><input value={settings[s.key] || ''} onChange={e => update(s.key, e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder={`https://...`} /></div>
                  ))}
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        <button onClick={handleSave} disabled={saving}
          className="w-full mt-6 px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2 text-lg shadow-lg"
          style={{ backgroundColor: 'var(--primary-color)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
          {saving ? 'Saving...' : 'Save All Settings'}
        </button>
      </div>
    </div>
  )
}