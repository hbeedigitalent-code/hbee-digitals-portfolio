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
  const [message, setMessage] = useState('')
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
    setMessage('')

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

      const { error: updateError } = await supabase
        .from('clients')
        .update({ profile_image: urlData.publicUrl })
        .eq('user_id', client.user_id)

      if (updateError) throw updateError

      setFormData({ ...formData, profile_image: urlData.publicUrl })
      setMessage('Profile image updated successfully!')
      
      // Refresh client data
      await fetchClient()
    } catch (error) {
      console.error('Upload error:', error)
      setMessage('Failed to upload image. Please try again.')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage('')

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

      setMessage('Profile updated successfully!')
      
      // Refresh client data
      await fetchClient()
    } catch (error) {
      console.error('Update error:', error)
      setMessage('Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-black text-[var(--text-primary)]">Profile Settings</h2>
      <p className="text-sm text-[var(--text-secondary)]">Manage your account information and preferences.</p>

      {message && (
        <div className={`rounded-xl border p-4 text-sm font-bold ${
          message.includes('Failed') 
            ? 'border-red-500/20 bg-red-500/10 text-red-400' 
            : 'border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]'
        }`}>
          {message}
        </div>
      )}

      {/* Profile Image Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="profile" size={18} color="var(--accent)" />
          Profile Photo
        </h3>
        <div className="flex items-center gap-6">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded-full bg-[var(--accent-orange)] text-4xl font-bold text-white overflow-hidden">
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
              className="absolute -bottom-1 -right-1 rounded-full bg-[var(--accent-orange)] p-2 text-white hover:bg-[var(--orange-600)] disabled:opacity-50 transition"
            >
              <SvgIcon name="edit" size={16} color="white" />
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
            <p className="text-lg font-medium text-[var(--text-primary)]">{formData.full_name || 'Client'}</p>
            <p className="text-sm text-[var(--text-muted)]">{formData.email}</p>
            {uploading && <p className="text-sm text-[var(--text-muted)] mt-1">Uploading...</p>}
            <p className="text-xs text-[var(--text-muted)] mt-2">Click the edit icon to change your profile photo</p>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="user" size={18} color="var(--accent)" />
          Personal Information
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Full Name</label>
            <input
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Business Name</label>
            <input
              value={formData.business_name}
              onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Your business name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Email Address</label>
            <input
              value={formData.email}
              disabled
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-muted)] cursor-not-allowed"
            />
            <p className="mt-1 text-xs text-[var(--text-muted)]">Email cannot be changed</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">WhatsApp</label>
            <input
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="+1 234 567 8900"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Website</label>
            <input
              value={formData.website_url}
              onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="https://yourstore.com"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-bold text-[var(--text-secondary)]">Country</label>
            <input
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              placeholder="Your country"
            />
          </div>
        </div>
      </div>

      {/* Account Information */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-black text-[var(--text-primary)]">
          <SvgIcon name="security" size={18} color="var(--accent)" />
          Account Information
        </h3>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Account Status</p>
            <div className="mt-1 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-green-500" />
              <span className="font-medium text-[var(--text-primary)]">Active</span>
            </div>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Member Since</p>
            <p className="mt-1 font-medium text-[var(--text-primary)]">
              {client?.created_at ? new Date(client.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              }) : 'Recently'}
            </p>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-secondary)]">Account ID</p>
            <p className="mt-1 font-mono text-sm text-[var(--text-primary)]">
              {client?.id?.slice(0, 8) || 'N/A'}
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02] disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save All Settings'}
      </button>
    </div>
  )
}