'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface AboutData {
  id: string
  title: string
  subtitle: string
  description: string
  image_url: string
  stats: any[]
  values: any[]
}

export default function AboutEditor() {
  const { user, loading: authLoading } = useAdminAuth()
  const [about, setAbout] = useState<AboutData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!authLoading && user) {
      fetchAbout()
    }
  }, [authLoading, user])

  const fetchAbout = async () => {
    try {
      const { data } = await supabase.from('about_section').select('*').single()
      setAbout(data || { stats: [], values: [] })
    } catch (err) {
      console.error('Error fetching about:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!about) return
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('about_section')
        .update({
          title: about.title,
          subtitle: about.subtitle,
          description: about.description,
          image_url: about.image_url,
          stats: about.stats,
          values: about.values,
          updated_at: new Date().toISOString()
        })
        .eq('id', about.id)

      if (error) {
        setMessage({ type: 'error', text: 'Error: ' + error.message })
      } else {
        setMessage({ type: 'success', text: 'About section updated successfully!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const addStat = () => {
    setAbout({
      ...about!,
      stats: [...(about?.stats || []), { number: '0', label: 'New Stat' }]
    })
  }

  const updateStat = (index: number, field: string, value: string) => {
    const newStats = [...(about?.stats || [])]
    newStats[index][field] = value
    setAbout({ ...about!, stats: newStats })
  }

  const removeStat = (index: number) => {
    const newStats = [...(about?.stats || [])]
    newStats.splice(index, 1)
    setAbout({ ...about!, stats: newStats })
  }

  const addValue = () => {
    setAbout({
      ...about!,
      values: [...(about?.values || []), { icon: '/svgs/', title: 'New Value', description: 'Description here' }]
    })
  }

  const updateValue = (index: number, field: string, value: string) => {
    const newValues = [...(about?.values || [])]
    newValues[index][field] = value
    setAbout({ ...about!, values: newValues })
  }

  const removeValue = (index: number) => {
    const newValues = [...(about?.values || [])]
    newValues.splice(index, 1)
    setAbout({ ...about!, values: newValues })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4 sticky top-0 z-10" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">About Section Editor</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6 max-w-5xl">
        {message && (
          <div className={`mb-4 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-2xl font-bold mb-6">About Section Content</h2>

          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={about?.title || ''}
                  onChange={(e) => setAbout({ ...about!, title: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subtitle</label>
                <input
                  type="text"
                  value={about?.subtitle || ''}
                  onChange={(e) => setAbout({ ...about!, subtitle: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={about?.description || ''}
                onChange={(e) => setAbout({ ...about!, description: e.target.value })}
                rows={5}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Image URL</label>
              <input
                type="text"
                value={about?.image_url || ''}
                onChange={(e) => setAbout({ ...about!, image_url: e.target.value })}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="/about-image.jpg"
              />
              <p className="text-xs text-gray-500 mt-1">Path to image in public folder or full URL</p>
            </div>

            {/* Stats Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Statistics</h3>
                <button 
                  onClick={addStat} 
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                >
                  + Add Stat
                </button>
              </div>
              <div className="space-y-3">
                {(about?.stats || []).map((stat, index) => (
                  <div key={index} className="flex gap-3 items-center p-3 bg-gray-50 rounded-lg">
                    <input
                      type="text"
                      value={stat.number}
                      onChange={(e) => updateStat(index, 'number', e.target.value)}
                      className="w-1/3 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="50+"
                    />
                    <input
                      type="text"
                      value={stat.label}
                      onChange={(e) => updateStat(index, 'label', e.target.value)}
                      className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Projects Completed"
                    />
                    <button 
                      onClick={() => removeStat(index)} 
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              {(about?.stats || []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No stats added yet. Click "Add Stat" to create one.</p>
              )}
            </div>

            {/* Values Section */}
            <div className="border-t pt-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Core Values</h3>
                <button 
                  onClick={addValue} 
                  className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                >
                  + Add Value
                </button>
              </div>
              <div className="space-y-4">
                {(about?.values || []).map((value, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex gap-3 mb-3">
                      <input
                        type="text"
                        value={value.icon}
                        onChange={(e) => updateValue(index, 'icon', e.target.value)}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="/svgs/icon.svg"
                      />
                      <button 
                        onClick={() => removeValue(index)} 
                        className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        ×
                      </button>
                    </div>
                    <input
                      type="text"
                      value={value.title}
                      onChange={(e) => updateValue(index, 'title', e.target.value)}
                      className="w-full p-2 border rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Value Title"
                    />
                    <textarea
                      value={value.description}
                      onChange={(e) => updateValue(index, 'description', e.target.value)}
                      className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      rows={2}
                      placeholder="Value description..."
                    />
                  </div>
                ))}
              </div>
              {(about?.values || []).length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No values added yet. Click "Add Value" to create one.</p>
              )}
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
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </Link>
            </div>
          </div>
        </div>

        {/* Live Preview */}
        <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">Live Preview</h3>
          <div className="border rounded-lg p-6">
            <h4 className="text-xl font-bold mb-2">{about?.title || 'Title'}</h4>
            <p className="text-gray-600 mb-4">{about?.description || 'Description...'}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(about?.stats || []).slice(0, 4).map((stat, i) => (
                <div key={i} className="text-center">
                  <div className="text-2xl font-bold" style={{ color: 'var(--primary-color)' }}>{stat.number}</div>
                  <div className="text-xs text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}