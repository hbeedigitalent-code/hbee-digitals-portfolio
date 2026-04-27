'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminProfile() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [avatarUrl, setAvatarUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        router.push('/admin/login')
      } else {
        const { data: { user: refreshed } } = await supabase.auth.getUser()
        setUser(refreshed)
        setEmail(refreshed?.email || '')
        setFullName(refreshed?.user_metadata?.full_name || '')
        setAvatarUrl(refreshed?.user_metadata?.avatar_url || '')
      }
      setLoading(false)
    }
    getUser()
  }, [router])

  const refreshUser = async () => {
    const { data: { user: refreshed } } = await supabase.auth.getUser()
    if (refreshed) {
      setUser(refreshed)
      setFullName(refreshed.user_metadata?.full_name || '')
      setAvatarUrl(refreshed.user_metadata?.avatar_url || '')
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please upload an image file' })
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image must be less than 2MB' })
      return
    }

    setUploading(true)
    setMessage(null)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `avatar-${user.id}-${Date.now()}.${fileExt}`
      const filePath = `avatars/${fileName}`

      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file)
      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(filePath)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
      })
      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile picture updated!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to upload image' })
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setUploading(true)
    setMessage(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: null }
      })
      if (updateError) throw updateError

      setAvatarUrl('')
      await refreshUser()
      setMessage({ type: 'success', text: 'Profile picture removed!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to remove image' })
    } finally {
      setUploading(false)
    }
  }

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      })
      if (updateError) throw updateError

      await refreshUser()
      setMessage({ type: 'success', text: 'Profile updated!' })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update profile' })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' })
      return
    }

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters' })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error

      setMessage({ type: 'success', text: 'Password updated!' })
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update password' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-center py-12">Loading profile...</div>

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Admin Profile</h2>

      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-center gap-2 ${
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

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-3xl font-bold text-white overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span>{fullName ? fullName.charAt(0).toUpperCase() : email.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <label className="absolute bottom-0 right-0 cursor-pointer bg-white rounded-full p-1.5 shadow-md hover:bg-gray-50 transition">
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} ref={fileInputRef} />
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            {uploading && <p className="text-sm text-gray-500">Uploading...</p>}
            {avatarUrl && (
              <button onClick={handleRemoveAvatar} className="text-sm text-red-600 hover:text-red-700 transition" disabled={uploading}>
                Remove Photo
              </button>
            )}
            <p className="text-xs text-gray-400 text-center">Click camera icon to upload<br />JPG, PNG, GIF (max 2MB)</p>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Your full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={email} disabled className="w-full p-2.5 border rounded-lg bg-gray-50 text-gray-500" />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
            </div>
            <button type="submit" disabled={saving || uploading}
              className="w-full px-4 py-2.5 text-white rounded-lg hover:opacity-90 disabled:opacity-50 font-medium"
              style={{ backgroundColor: 'var(--primary-color)' }}>
              {saving ? 'Saving...' : 'Update Profile'}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            Change Password
          </h3>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="••••••••" minLength={6} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full p-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={saving || uploading}
              className="w-full px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 font-medium">
              {saving ? 'Updating...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}