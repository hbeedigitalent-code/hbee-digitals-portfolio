'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useAdminAuth } from '@/hooks/useAdminAuth'

interface FooterData {
  id: string
  logo_text: string
  copyright_text: string
  columns: any[]
  social_links: any[]
}

export default function FooterEditor() {
  const { user, loading: authLoading } = useAdminAuth()
  const [footer, setFooter] = useState<FooterData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [activeTab, setActiveTab] = useState<'basic' | 'columns' | 'social'>('basic')

  useEffect(() => {
    if (!authLoading && user) {
      fetchFooter()
    }
  }, [authLoading, user])

  const fetchFooter = async () => {
    try {
      const { data } = await supabase.from('footer_settings').select('*').single()
      setFooter(data || { columns: [], social_links: [] })
    } catch (err) {
      console.error('Error fetching footer:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!footer) return
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('footer_settings')
        .update({
          logo_text: footer.logo_text,
          copyright_text: footer.copyright_text,
          columns: footer.columns,
          social_links: footer.social_links,
          updated_at: new Date().toISOString()
        })
        .eq('id', footer.id)

      if (error) {
        setMessage({ type: 'error', text: 'Error: ' + error.message })
      } else {
        setMessage({ type: 'success', text: 'Footer settings updated successfully!' })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  const addColumn = () => {
    setFooter({
      ...footer!,
      columns: [...(footer?.columns || []), { title: 'New Column', links: [{ label: 'Link', href: '/' }] }]
    })
  }

  const updateColumn = (colIndex: number, field: string, value: string) => {
    const newColumns = [...(footer?.columns || [])]
    newColumns[colIndex][field] = value
    setFooter({ ...footer!, columns: newColumns })
  }

  const removeColumn = (colIndex: number) => {
    const newColumns = [...(footer?.columns || [])]
    newColumns.splice(colIndex, 1)
    setFooter({ ...footer!, columns: newColumns })
  }

  const addLink = (colIndex: number) => {
    const newColumns = [...(footer?.columns || [])]
    newColumns[colIndex].links.push({ label: 'New Link', href: '/' })
    setFooter({ ...footer!, columns: newColumns })
  }

  const updateLink = (colIndex: number, linkIndex: number, field: string, value: string) => {
    const newColumns = [...(footer?.columns || [])]
    newColumns[colIndex].links[linkIndex][field] = value
    setFooter({ ...footer!, columns: newColumns })
  }

  const removeLink = (colIndex: number, linkIndex: number) => {
    const newColumns = [...(footer?.columns || [])]
    newColumns[colIndex].links.splice(linkIndex, 1)
    setFooter({ ...footer!, columns: newColumns })
  }

  const addSocialLink = () => {
    setFooter({
      ...footer!,
      social_links: [...(footer?.social_links || []), { platform: 'New Platform', url: 'https://', icon: '/svgs/' }]
    })
  }

  const updateSocialLink = (index: number, field: string, value: string) => {
    const newLinks = [...(footer?.social_links || [])]
    newLinks[index][field] = value
    setFooter({ ...footer!, social_links: newLinks })
  }

  const removeSocialLink = (index: number) => {
    const newLinks = [...(footer?.social_links || [])]
    newLinks.splice(index, 1)
    setFooter({ ...footer!, social_links: newLinks })
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
          <h1 className="text-xl font-bold text-white">Footer Editor</h1>
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

        <div className="bg-white rounded-xl shadow-sm">
          {/* Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'basic' 
                  ? 'border-b-2' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ 
                borderColor: activeTab === 'basic' ? 'var(--primary-color)' : 'transparent',
                color: activeTab === 'basic' ? 'var(--primary-color)' : undefined
              }}
            >
              Basic Info
            </button>
            <button
              onClick={() => setActiveTab('columns')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'columns' 
                  ? 'border-b-2' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ 
                borderColor: activeTab === 'columns' ? 'var(--primary-color)' : 'transparent',
                color: activeTab === 'columns' ? 'var(--primary-color)' : undefined
              }}
            >
              Footer Columns
            </button>
            <button
              onClick={() => setActiveTab('social')}
              className={`px-6 py-3 font-medium transition ${
                activeTab === 'social' 
                  ? 'border-b-2' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ 
                borderColor: activeTab === 'social' ? 'var(--primary-color)' : 'transparent',
                color: activeTab === 'social' ? 'var(--primary-color)' : undefined
              }}
            >
              Social Links
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Logo Text</label>
                  <input
                    type="text"
                    value={footer?.logo_text || ''}
                    onChange={(e) => setFooter({ ...footer!, logo_text: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Hbee Digitals"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Copyright Text</label>
                  <input
                    type="text"
                    value={footer?.copyright_text || ''}
                    onChange={(e) => setFooter({ ...footer!, copyright_text: e.target.value })}
                    className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="© 2024 Hbee Digitals. All rights reserved."
                  />
                </div>
              </div>
            )}

            {activeTab === 'columns' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Footer Columns</h3>
                  <button 
                    onClick={addColumn} 
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                  >
                    + Add Column
                  </button>
                </div>
                {(footer?.columns || []).length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No columns added yet. Click "Add Column" to create one.</p>
                )}
                {(footer?.columns || []).map((column, colIndex) => (
                  <div key={colIndex} className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center mb-3">
                      <input
                        type="text"
                        value={column.title}
                        onChange={(e) => updateColumn(colIndex, 'title', e.target.value)}
                        className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Column Title"
                      />
                      <button 
                        onClick={() => removeColumn(colIndex)} 
                        className="ml-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                      >
                        ×
                      </button>
                    </div>
                    <div className="ml-4 space-y-2">
                      {(column.links || []).map((link: any, linkIndex: number) => (
                        <div key={linkIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={link.label}
                            onChange={(e) => updateLink(colIndex, linkIndex, 'label', e.target.value)}
                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Link Label"
                          />
                          <input
                            type="text"
                            value={link.href}
                            onChange={(e) => updateLink(colIndex, linkIndex, 'href', e.target.value)}
                            className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="/link"
                          />
                          <button 
                            onClick={() => removeLink(colIndex, linkIndex)} 
                            className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addLink(colIndex)} 
                        className="text-sm text-blue-600 hover:underline mt-2"
                      >
                        + Add Link
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'social' && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Social Media Links</h3>
                  <button 
                    onClick={addSocialLink} 
                    className="px-3 py-1 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition"
                  >
                    + Add Social Link
                  </button>
                </div>
                {(footer?.social_links || []).length === 0 && (
                  <p className="text-gray-400 text-sm text-center py-8">No social links added yet. Click "Add Social Link" to create one.</p>
                )}
                {(footer?.social_links || []).map((link, index) => (
                  <div key={index} className="flex gap-3 mb-3 p-3 bg-gray-50 rounded-lg items-center">
                    <input
                      type="text"
                      value={link.platform}
                      onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                      className="w-1/4 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="Facebook"
                    />
                    <input
                      type="text"
                      value={link.url}
                      onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                      className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="https://facebook.com/..."
                    />
                    <input
                      type="text"
                      value={link.icon || ''}
                      onChange={(e) => updateSocialLink(index, 'icon', e.target.value)}
                      className="w-1/4 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="/svgs/facebook.svg"
                    />
                    <button 
                      onClick={() => removeSocialLink(index)} 
                      className="px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="border-t pt-6 mt-6 flex gap-3">
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
          <div className="border rounded-lg p-6" style={{ backgroundColor: 'var(--primary-color)' }}>
            <div className="text-white">
              <div className="font-bold text-xl mb-4">{footer?.logo_text || 'Logo'}</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                {(footer?.columns || []).map((col, i) => (
                  <div key={i}>
                    <div className="font-semibold mb-2">{col.title}</div>
                    <ul className="text-sm space-y-1 text-white/70">
                      {(col.links || []).slice(0, 3).map((link: any, j: number) => (
                        <li key={j}>{link.label}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="text-sm text-white/50 pt-4 border-t border-white/20">
                {footer?.copyright_text || 'Copyright'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}