'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import SvgIcon from '@/components/ui/SvgIcon'

interface TeamMember {
  id: string
  name: string
  position: string
  bio: string
  image_url: string
  social_twitter: string
  social_linkedin: string
  social_github: string
  social_instagram: string
  display_order: number
  is_active: boolean
}

export default function TeamMembersPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<TeamMember | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [messageType, setMessageType] = useState<'success' | 'error'>('success')
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [formData, setFormData] = useState({
    name: '',
    position: '',
    bio: '',
    image_url: '',
    social_twitter: '',
    social_linkedin: '',
    social_github: '',
    social_instagram: '',
    display_order: 0,
    is_active: true
  })
  const router = useRouter()

  useEffect(() => { checkAuth(); fetchMembers() }, [])

  const checkAuth = async () => { 
    const { data: { user } } = await supabase.auth.getUser(); 
    if (!user) router.push('/admin/login') 
  }

  const fetchMembers = async () => {
    const { data } = await supabase.from('team_members').select('*').order('display_order')
    setMembers(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ 
      name: '', position: '', bio: '', image_url: '', 
      social_twitter: '', social_linkedin: '', social_github: '', social_instagram: '', 
      display_order: 0, is_active: true 
    })
    setEditingItem(null)
    setShowForm(false)
    setMessage('')
    setUploadProgress(0)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const showMessage = (msg: string, type: 'success' | 'error' = 'success') => {
    setMessage(msg)
    setMessageType(type)
    setTimeout(() => setMessage(''), 5000)
  }

  const handleFileUpload = async (file: File) => {
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      showMessage('File size exceeds 10MB limit. Please choose a smaller file.', 'error')
      return null
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    if (!allowedTypes.includes(file.type)) {
      showMessage('Please upload a valid image file (JPEG, PNG, WebP, GIF, or SVG).', 'error')
      return null
    }

    setUploading(true)
    setUploadProgress(0)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`
      const filePath = `team-members/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('team-avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('Upload error:', uploadError)
        showMessage('Failed to upload image. Please try again.', 'error')
        setUploading(false)
        return null
      }

      setUploadProgress(100)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('team-avatars')
        .getPublicUrl(filePath)

      setUploading(false)
      return urlData.publicUrl
    } catch (err) {
      console.error('Upload error:', err)
      showMessage('Failed to upload image. Please try again.', 'error')
      setUploading(false)
      return null
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const imageUrl = await handleFileUpload(file)
    if (imageUrl) {
      setFormData({ ...formData, image_url: imageUrl })
      showMessage('Image uploaded successfully!', 'success')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')

    try {
      if (editingItem) {
        const { error } = await supabase
          .from('team_members')
          .update(formData)
          .eq('id', editingItem.id)
        
        if (error) throw error
        showMessage('Team member updated successfully!', 'success')
      } else {
        const { error } = await supabase
          .from('team_members')
          .insert([formData])
        
        if (error) throw error
        showMessage('Team member added successfully!', 'success')
      }

      await fetchMembers()
      resetForm()
    } catch (err) {
      console.error('Save error:', err)
      showMessage('Failed to save team member. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: TeamMember) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      position: item.position,
      bio: item.bio || '',
      image_url: item.image_url || '',
      social_twitter: item.social_twitter || '',
      social_linkedin: item.social_linkedin || '',
      social_github: item.social_github || '',
      social_instagram: item.social_instagram || '',
      display_order: item.display_order,
      is_active: item.is_active
    })
    setShowForm(true)
    setMessage('')
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this team member?')) {
      await supabase.from('team_members').delete().eq('id', id)
      await fetchMembers()
      showMessage('Team member deleted.', 'success')
    }
  }

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('team_members').update({ is_active: !current }).eq('id', id)
    await fetchMembers()
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[var(--text-primary)]">Team Members</h2>
          <p className="text-sm text-[var(--text-secondary)]">Manage your team members with images.</p>
        </div>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)] hover:bg-[var(--accent-hover)] transition"
          >
            + Add Member
          </button>
        )}
      </div>

      {message && (
        <div className={`rounded-lg p-4 text-sm ${
          messageType === 'success' 
            ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
            : 'bg-red-500/10 border border-red-500/30 text-red-400'
        }`}>
          {message}
        </div>
      )}

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black">{editingItem ? 'Edit Member' : 'Add Member'}</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name & Position */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">Name *</label>
                <input 
                  required 
                  value={formData.name} 
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold">Position *</label>
                <input 
                  required 
                  value={formData.position} 
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })} 
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="mb-1 block text-sm font-bold">Bio</label>
              <textarea 
                rows={3} 
                value={formData.bio} 
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })} 
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
              />
            </div>

            {/* Image Upload Section */}
            <div>
              <label className="mb-1 block text-sm font-bold">Profile Image</label>
              
              {/* Current Image Preview */}
              {formData.image_url && (
                <div className="mb-3 flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3">
                  <div className="h-16 w-16 overflow-hidden rounded-full border-2 border-[var(--accent)]">
                    <img 
                      src={formData.image_url} 
                      alt="Preview" 
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--text-primary)]">Current Image</p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-xs text-red-400 hover:text-red-300"
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row">
                {/* File Upload */}
                <div className="flex-1">
                  <label className="cursor-pointer block">
                    <div className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border)] bg-[var(--bg-section)] p-4 transition hover:border-[var(--accent)]">
                      <SvgIcon name="upload" size={20} color="var(--accent)" />
                      <span className="text-sm font-medium text-[var(--text-muted)]">
                        {uploading ? 'Uploading...' : 'Click to Upload Image'}
                      </span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={uploading}
                    />
                  </label>
                  {uploading && (
                    <div className="mt-2">
                      <div className="h-2 w-full rounded-full bg-[var(--bg-section)] overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="mt-1 text-xs text-[var(--text-muted)]">Uploading... {uploadProgress}%</p>
                    </div>
                  )}
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Max 10MB • JPEG, PNG, WebP, GIF, SVG
                  </p>
                </div>

                {/* OR Divider */}
                <div className="flex items-center text-sm text-[var(--text-muted)]">OR</div>

                {/* URL Input */}
                <div className="flex-1">
                  <input 
                    value={formData.image_url} 
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} 
                    placeholder="https://example.com/image.jpg" 
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
                  />
                  <p className="mt-1 text-xs text-[var(--text-muted)]">
                    Paste image URL directly
                  </p>
                </div>
              </div>
            </div>

            {/* Social Links */}
            <div className="grid gap-4 md:grid-cols-2">
              <input 
                placeholder="Twitter URL" 
                value={formData.social_twitter} 
                onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })} 
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
              />
              <input 
                placeholder="LinkedIn URL" 
                value={formData.social_linkedin} 
                onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })} 
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
              />
              <input 
                placeholder="GitHub URL" 
                value={formData.social_github} 
                onChange={(e) => setFormData({ ...formData, social_github: e.target.value })} 
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
              />
              <input 
                placeholder="Instagram URL" 
                value={formData.social_instagram} 
                onChange={(e) => setFormData({ ...formData, social_instagram: e.target.value })} 
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
              />
            </div>

            {/* Display Order & Active Status */}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-bold">Display Order</label>
                <input 
                  type="number" 
                  value={formData.display_order} 
                  onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })} 
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" 
                />
              </div>
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  checked={formData.is_active} 
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} 
                  className="h-4 w-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]" 
                />
                <label className="text-sm font-medium">Active on website</label>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={saving || uploading} 
                className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)] transition hover:bg-[var(--accent-hover)] disabled:opacity-50"
              >
                {saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}
              </button>
              <button 
                type="button" 
                onClick={resetForm} 
                className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black text-[var(--text-primary)] hover:bg-[var(--bg-section)] transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members Grid */}
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 transition hover:shadow-md">
            <div className="flex gap-4">
              {member.image_url ? (
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-[var(--accent)]/20">
                  <img 
                    src={member.image_url} 
                    alt={member.name} 
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-orange)] flex items-center justify-center">
                  <span className="text-xl font-black text-white">{member.name.charAt(0)}</span>
                </div>
              )}
              <div>
                <h3 className="font-bold text-[var(--text-primary)]">{member.name}</h3>
                <p className="text-sm text-[var(--accent)]">{member.position}</p>
                {member.bio && (
                  <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{member.bio}</p>
                )}
              </div>
            </div>

            {/* Social Links */}
            {(member.social_twitter || member.social_linkedin || member.social_github || member.social_instagram) && (
              <div className="mt-3 flex gap-2">
                {member.social_twitter && (
                  <a href={member.social_twitter} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                    <SvgIcon name="twitter" size={16} color="currentColor" />
                  </a>
                )}
                {member.social_linkedin && (
                  <a href={member.social_linkedin} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                    <SvgIcon name="linkedin" size={16} color="currentColor" />
                  </a>
                )}
                {member.social_github && (
                  <a href={member.social_github} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                    <SvgIcon name="github" size={16} color="currentColor" />
                  </a>
                )}
                {member.social_instagram && (
                  <a href={member.social_instagram} target="_blank" rel="noopener noreferrer" className="text-[var(--text-muted)] hover:text-[var(--accent)]">
                    <SvgIcon name="instagram" size={16} color="currentColor" />
                  </a>
                )}
              </div>
            )}

            <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${
                member.is_active 
                  ? 'bg-green-500/20 text-green-400' 
                  : 'bg-gray-500/20 text-gray-400'
              }`}>
                {member.is_active ? 'Active' : 'Inactive'}
              </span>
              <div className="flex gap-3">
                <button 
                  onClick={() => toggleStatus(member.id, member.is_active)} 
                  className="text-xs text-[var(--text-muted)] hover:text-[var(--accent)] transition"
                >
                  {member.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button 
                  onClick={() => handleEdit(member)} 
                  className="text-xs text-[var(--accent)] hover:underline"
                >
                  Edit
                </button>
                <button 
                  onClick={() => handleDelete(member.id)} 
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
        
        {members.length === 0 && (
          <div className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-12 text-center text-[var(--text-muted)]">
            <SvgIcon name="team" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p>No team members yet.</p>
            <p className="text-sm">Click "Add Member" to create your first team member.</p>
          </div>
        )}
      </div>
    </div>
  )
}