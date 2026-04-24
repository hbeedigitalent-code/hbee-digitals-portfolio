'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface HeroData {
  id: string
  title: string
  subtitle: string
  primary_cta_text: string
  primary_cta_link: string
  secondary_cta_text: string
  secondary_cta_link: string
  background_image: string
  is_active: boolean
}

export default function HeroEditor() {
  const { user, loading: authLoading } = useAdminAuth()
  const [hero, setHero] = useState<HeroData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchHero()
    }
  }, [authLoading, user])

  const fetchHero = async () => {
    try {
      const { data } = await supabase.from('hero_section').select('*').single()
      setHero(data || {})
    } catch (err) {
      console.error('Error fetching hero:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!hero) return
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('hero_section')
        .update({
          title: hero.title,
          subtitle: hero.subtitle,
          primary_cta_text: hero.primary_cta_text,
          primary_cta_link: hero.primary_cta_link,
          secondary_cta_text: hero.secondary_cta_text,
          secondary_cta_link: hero.secondary_cta_link,
          background_image: hero.background_image,
          is_active: hero.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', hero.id)

      if (error) {
        setMessage({ type: 'error', text: 'Error: ' + error.message })
      } else {
        setMessage({ type: 'success', text: 'Hero section updated successfully!' })
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
          <h1 className="text-xl font-bold text-white">Hero Section Editor</h1>
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
          <h2 className="text-2xl font-bold mb-6">Hero Section Content</h2>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={hero?.title || ''}
                onChange={(e) => setHero({ ...hero!, title: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Subtitle</label>
              <textarea
                value={hero?.subtitle || ''}
                onChange={(e) => setHero({ ...hero!, subtitle: e.target.value })}
                rows={3}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Primary CTA Text</label>
                <input
                  type="text"
                  value={hero?.primary_cta_text || ''}
                  onChange={(e) => setHero({ ...hero!, primary_cta_text: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Primary CTA Link</label>
                <input
                  type="text"
                  value={hero?.primary_cta_link || ''}
                  onChange={(e) => setHero({ ...hero!, primary_cta_link: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Secondary CTA Text</label>
                <input
                  type="text"
                  value={hero?.secondary_cta_text || ''}
                  onChange={(e) => setHero({ ...hero!, secondary_cta_text: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Secondary CTA Link</label>
                <input
                  type="text"
                  value={hero?.secondary_cta_link || ''}
                  onChange={(e) => setHero({ ...hero!, secondary_cta_link: e.target.value })}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Background Image URL</label>
              <input
                type="text"
                value={hero?.background_image || ''}
                onChange={(e) => setHero({ ...hero!, background_image: e.target.value })}
                className="w-full p-3 border rounded-lg"
                placeholder="https://example.com/hero-bg.jpg"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={hero?.is_active || false}
                  onChange={(e) => setHero({ ...hero!, is_active: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">Active (visible on website)</span>
              </label>
            </div>

            <div className="border-t pt-6 flex gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <Link href="/admin/dashboard" className="px-6 py-2 bg-gray-300 rounded-lg hover:bg-gray-400">
                Cancel
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}