'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SiteSettings() {
  const [settings, setSettings] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
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
    setSettings(data || {})
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    
    const { error } = await supabase.from('site_settings').update(settings).eq('id', settings.id)
    
    if (error) {
      setMessage({ type: 'error', text: 'Error: ' + error.message })
    } else {
      // Update CSS variables
      document.documentElement.style.setProperty('--primary-color', settings.primary_color)
      document.documentElement.style.setProperty('--secondary-color', settings.secondary_color)
      document.documentElement.style.setProperty('--accent-color', settings.accent_color || '#3B82F6')
      document.documentElement.style.setProperty('--gradient-start', settings.gradient_start || '#f8fafc')
      document.documentElement.style.setProperty('--gradient-end', settings.gradient_end || '#ffffff')
      
      setMessage({ type: 'success', text: 'Settings saved successfully!' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  if (loading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Site Settings</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80 transition">← Back to Dashboard</Link>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-3xl">
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-100 text-green-700 border border-green-200' 
              : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--primary-color)' }}>Colors & Branding</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Primary Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.primary_color || '#0A1D37'} 
                  onChange={e => setSettings({...settings, primary_color: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.primary_color || '#0A1D37'} 
                  onChange={e => setSettings({...settings, primary_color: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for headers, buttons, and main accents</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Secondary Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.secondary_color || '#FFFFFF'} 
                  onChange={e => setSettings({...settings, secondary_color: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.secondary_color || '#FFFFFF'} 
                  onChange={e => setSettings({...settings, secondary_color: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for text on primary backgrounds</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Accent Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.accent_color || '#3B82F6'} 
                  onChange={e => setSettings({...settings, accent_color: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.accent_color || '#3B82F6'} 
                  onChange={e => setSettings({...settings, accent_color: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Used for highlights and hover effects</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Text Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.text_color || '#1F2937'} 
                  onChange={e => setSettings({...settings, text_color: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.text_color || '#1F2937'} 
                  onChange={e => setSettings({...settings, text_color: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">Default text color on light backgrounds</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-6" style={{ color: 'var(--primary-color)' }}>Background Gradients</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Gradient Start Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.gradient_start || '#f8fafc'} 
                  onChange={e => setSettings({...settings, gradient_start: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.gradient_start || '#f8fafc'} 
                  onChange={e => setSettings({...settings, gradient_start: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Gradient End Color</label>
              <div className="flex gap-2">
                <input 
                  type="color" 
                  value={settings.gradient_end || '#ffffff'} 
                  onChange={e => setSettings({...settings, gradient_end: e.target.value})} 
                  className="w-12 h-10 rounded border cursor-pointer" 
                />
                <input 
                  type="text" 
                  value={settings.gradient_end || '#ffffff'} 
                  onChange={e => setSettings({...settings, gradient_end: e.target.value})} 
                  className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                />
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-6" style={{ color: 'var(--primary-color)' }}>Contact Information</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input 
                type="email" 
                value={settings.contact_email || ''} 
                onChange={e => setSettings({...settings, contact_email: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="hello@example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Contact Phone</label>
              <input 
                value={settings.contact_phone || ''} 
                onChange={e => setSettings({...settings, contact_phone: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium mb-1">Contact Address</label>
            <input 
              value={settings.contact_address || ''} 
              onChange={e => setSettings({...settings, contact_address: e.target.value})} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="123 Digital Street, Tech City"
            />
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-6" style={{ color: 'var(--primary-color)' }}>Social Media Links</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium mb-1">Twitter URL</label>
              <input 
                value={settings.social_twitter || ''} 
                onChange={e => setSettings({...settings, social_twitter: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="https://twitter.com/..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
              <input 
                value={settings.social_linkedin || ''} 
                onChange={e => setSettings({...settings, social_linkedin: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="https://linkedin.com/..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">GitHub URL</label>
              <input 
                value={settings.social_github || ''} 
                onChange={e => setSettings({...settings, social_github: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="https://github.com/..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Instagram URL</label>
              <input 
                value={settings.social_instagram || ''} 
                onChange={e => setSettings({...settings, social_instagram: e.target.value})} 
                className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
                placeholder="https://instagram.com/..."
              />
            </div>
          </div>

          <h2 className="text-2xl font-bold mt-8 mb-6" style={{ color: 'var(--primary-color)' }}>SEO</h2>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Site Title</label>
            <input 
              value={settings.site_title || ''} 
              onChange={e => setSettings({...settings, site_title: e.target.value})} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="Hbee Digitals"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-1">Site Description</label>
            <textarea 
              value={settings.site_description || ''} 
              onChange={e => setSettings({...settings, site_description: e.target.value})} 
              rows={3} 
              className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" 
              placeholder="Modern digital agency building exceptional web experiences"
            />
          </div>

          <div className="border-t pt-6 flex gap-3">
            <button 
              onClick={handleSave} 
              disabled={saving} 
              className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              {saving ? 'Saving...' : 'Save All Settings'}
            </button>
            <Link 
              href="/admin/dashboard" 
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
            >
              Cancel
            </Link>
          </div>
        </div>

        {/* Live Preview Section */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
          <div className="p-6 rounded-lg" style={{ 
            backgroundColor: 'var(--primary-color)',
            background: `linear-gradient(135deg, ${settings.gradient_start || '#f8fafc'}, ${settings.gradient_end || '#ffffff'})`
          }}>
            <div className="flex gap-4 flex-wrap">
              <button className="px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--primary-color)' }}>
                Primary Button
              </button>
              <button className="px-4 py-2 rounded-lg border-2" style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}>
                Secondary Button
              </button>
              <span className="text-sm" style={{ color: 'var(--primary-color)' }}>Link Text</span>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Your settings will affect buttons, headers, and backgrounds throughout the site.</p>
        </div>
      </div>
    </div>
  )
}