'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface CTAData {
  id: string
  title: string
  subtitle: string
  button_text: string
  button_link: string
  is_active: boolean
}

export default function CTAEditor() {
  const { user, loading: authLoading } = useAdminAuth()
  const [cta, setCta] = useState<CTAData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchCTA()
    }
  }, [authLoading, user])

  const fetchCTA = async () => {
    try {
      const { data } = await supabase.from('cta_section').select('*').single()
      setCta(data || {})
    } catch (err) {
      console.error('Error fetching CTA:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!cta) return
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('cta_section')
        .update({
          title: cta.title,
          subtitle: cta.subtitle,
          button_text: cta.button_text,
          button_link: cta.button_link,
          is_active: cta.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', cta.id)

      if (error) {
        setMessage({ type: 'error', text: 'Error: ' + error.message })
      } else {
        setMessage({ type: 'success', text: 'CTA section updated successfully!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">CTA Section Editor</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-4xl">
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-6">Call-to-Action Section</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={cta?.title || ''}
                onChange={(e) => setCta({ ...cta!, title: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Ready to start your project?"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <textarea
                value={cta?.subtitle || ''}
                onChange={(e) => setCta({ ...cta!, subtitle: e.target.value })}
                rows={2}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Let's create something amazing together"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Button Text</label>
                <input
                  type="text"
                  value={cta?.button_text || ''}
                  onChange={(e) => setCta({ ...cta!, button_text: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="Contact Us"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Button Link</label>
                <input
                  type="text"
                  value={cta?.button_link || ''}
                  onChange={(e) => setCta({ ...cta!, button_link: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="/contact"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={cta?.is_active || false}
                  onChange={(e) => setCta({ ...cta!, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Active (visible on website)</span>
              </label>
            </div>

            <div className="border-t pt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link
                href="/admin/dashboard"
                className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-6 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
          <div className="p-8 text-center rounded-lg" style={{ backgroundColor: 'var(--primary-color)' }}>
            <h3 className="text-2xl font-bold text-white mb-2">{cta?.title || 'Title'}</h3>
            <p className="text-white/90 mb-4">{cta?.subtitle || 'Subtitle'}</p>
            <span className="inline-block px-6 py-2 bg-white rounded-lg" style={{ color: 'var(--primary-color)' }}>
              {cta?.button_text || 'Button'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}