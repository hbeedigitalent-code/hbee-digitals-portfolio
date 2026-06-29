// src/app/client-portal/settings/page.tsx
'use client'

import { useEffect, useState, useRef } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'

export default function ClientSettingsPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    business_name: '',
    email: '',
    whatsapp: '',
    website_url: '',
    country: '',
    profile_image: '',
  })

  useEffect(() => {
    fetchClient()
  }, [])

  async function fetchClient() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClient(clientData)
        setFormData({
          full_name: clientData.full_name || '',
          business_name: clientData.business_name || '',
          email: clientData.email || '',
          whatsapp: clientData.whatsapp || '',
          website_url: clientData.website_url || '',
          country: clientData.country || '',
          profile_image: clientData.profile_image || '',
        })
      }
    }

    setLoading(false)
  }

  async function handleProfileImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !client) return

    setUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${client.user_id}-${Date.now()}.${fileExt}`
      const filePath = `profile-images/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('client-portal')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('client-portal')
        .getPublicUrl(filePath)

      // Update client profile with image URL
      const { error: updateError } = await supabase
        .from('clients')
        .update({ profile_image: urlData.publicUrl })
        .eq('user_id', client.user_id)

      if (updateError) throw updateError

      setFormData({ ...formData, profile_image: urlData.publicUrl })
      setMessage({ type: 'success', text: 'Profile image updated successfully!' })
    } catch (error) {
      console.error('Upload error:', error)
      setMessage({ type: 'error', text: 'Failed to upload image. Please try again.' })
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          full_name: formData.full_name,
          business_name: formData.business_name,
          whatsapp: formData.whatsapp,
          website_url: formData.website_url,
          country: formData.country,
        })
        .eq('user_id', client.user_id)

      if (error) throw error

      setMessage({ type: 'success', text: 'Profile updated successfully!' })
    } catch (error) {
      console.error('Update error:', error)
      setMessage({ type: 'error', text: 'Failed to update profile. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Settings</h1>
        <p className="text-[var(--text-muted)]">Manage your account settings</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-white p-6">
        {/* Profile Image */}
        <div className="mb-6 flex items-center gap-6">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--accent-orange)] text-3xl font-bold text-white">
              {formData.profile_image ? (
                <img
                  src={formData.profile_image}
                  alt="Profile"
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                formData.full_name?.charAt(0) || 'C'
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent-orange)] p-1.5 text-white hover:bg-[var(--orange-600)] disabled:opacity-50"
            >
              <SvgIcon name="edit" size={14} color="white" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleProfileImageUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="font-medium text-[var(--text-primary)]">{formData.full_name}</p>
            <p className="text-sm text-[var(--text-muted)]">{formData.email}</p>
            {uploading && <p className="text-sm text-[var(--text-muted)]">Uploading...</p>}
          </div>
        </div>

        {message && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Full Name</label>
              <input
                type="text"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Business Name</label>
              <input
                type="text"
                value={formData.business_name}
                onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Email</label>
              <input
                type="email"
                value={formData.email}
                disabled
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-[var(--text-muted)]">Email cannot be changed</p>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">WhatsApp</label>
              <input
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Website</label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="https://yourstore.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-[var(--text-primary)]">Country</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="w-full rounded-lg border border-[var(--border)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                placeholder="Your country"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}