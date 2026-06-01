'use client'

import { useEffect, useState } from 'react'
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
  const [formData, setFormData] = useState({
    name: '', position: '', bio: '', image_url: '',
    social_twitter: '', social_linkedin: '', social_github: '', social_instagram: '',
    display_order: 0, is_active: true
  })
  const router = useRouter()

  useEffect(() => { checkAuth(); fetchMembers() }, [])

  const checkAuth = async () => { const { data: { user } } = await supabase.auth.getUser(); if (!user) router.push('/admin/login') }

  const fetchMembers = async () => {
    const { data } = await supabase.from('team_members').select('*').order('display_order')
    setMembers(data || [])
    setLoading(false)
  }

  const resetForm = () => {
    setFormData({ name: '', position: '', bio: '', image_url: '', social_twitter: '', social_linkedin: '', social_github: '', social_instagram: '', display_order: 0, is_active: true })
    setEditingItem(null)
    setShowForm(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    if (editingItem) {
      await supabase.from('team_members').update(formData).eq('id', editingItem.id)
    } else {
      await supabase.from('team_members').insert([formData])
    }
    await fetchMembers()
    resetForm()
    setSaving(false)
  }

  const handleEdit = (item: TeamMember) => {
    setEditingItem(item)
    setFormData({
      name: item.name, position: item.position, bio: item.bio || '', image_url: item.image_url || '',
      social_twitter: item.social_twitter || '', social_linkedin: item.social_linkedin || '',
      social_github: item.social_github || '', social_instagram: item.social_instagram || '',
      display_order: item.display_order, is_active: item.is_active
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (confirm('Delete this team member?')) {
      await supabase.from('team_members').delete().eq('id', id)
      await fetchMembers()
    }
  }

  const toggleStatus = async (id: string, current: boolean) => {
    await supabase.from('team_members').update({ is_active: !current }).eq('id', id)
    await fetchMembers()
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Team Members</h2><p className="text-sm text-[var(--text-secondary)]">Manage your team members.</p></div>
        {!showForm && <button onClick={() => setShowForm(true)} className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)]">+ Add Member</button>}
      </div>

      {showForm && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-black">{editingItem ? 'Edit Member' : 'Add Member'}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div><label className="mb-1 block text-sm font-bold">Name *</label><input required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
              <div><label className="mb-1 block text-sm font-bold">Position *</label><input required value={formData.position} onChange={(e) => setFormData({ ...formData, position: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            </div>
            <div><label className="mb-1 block text-sm font-bold">Bio</label><textarea rows={3} value={formData.bio} onChange={(e) => setFormData({ ...formData, bio: e.target.value })} className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <div><label className="mb-1 block text-sm font-bold">Image URL</label><input value={formData.image_url} onChange={(e) => setFormData({ ...formData, image_url: e.target.value })} placeholder="https://..." className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" /></div>
            <div className="grid gap-4 md:grid-cols-2">
              <input placeholder="Twitter URL" value={formData.social_twitter} onChange={(e) => setFormData({ ...formData, social_twitter: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
              <input placeholder="LinkedIn URL" value={formData.social_linkedin} onChange={(e) => setFormData({ ...formData, social_linkedin: e.target.value })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <input placeholder="Display Order" type="number" value={formData.display_order} onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })} className="rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3" />
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.is_active} onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} /> Active on website</label>
            </div>
            <div className="flex gap-3"><button type="submit" disabled={saving} className="rounded-full bg-[var(--accent)] px-6 py-2 text-sm font-black text-[var(--btn-primary-text)]">{saving ? 'Saving...' : (editingItem ? 'Update' : 'Create')}</button><button type="button" onClick={resetForm} className="rounded-full border border-[var(--border)] px-6 py-2 text-sm font-black">Cancel</button></div>
          </form>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {members.map((member) => (
          <div key={member.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <div className="flex gap-4">
              {member.image_url ? <div className="h-14 w-14 rounded-full overflow-hidden"><Image src={member.image_url} alt={member.name} width={56} height={56} className="object-cover" /></div> : <div className="h-14 w-14 rounded-full bg-gradient-to-br from-[var(--accent)] to-[var(--accent-orange)] flex items-center justify-center"><span className="text-xl font-black text-white">{member.name.charAt(0)}</span></div>}
              <div><h3 className="font-bold">{member.name}</h3><p className="text-sm text-[var(--accent)]">{member.position}</p>{member.bio && <p className="mt-1 text-xs text-[var(--text-muted)] line-clamp-2">{member.bio}</p>}</div>
            </div>
            <div className="mt-4 flex items-center justify-between pt-3 border-t border-[var(--border)]">
              <span className={`rounded-full px-2 py-1 text-xs font-bold ${member.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{member.is_active ? 'Active' : 'Inactive'}</span>
              <div className="flex gap-2"><button onClick={() => toggleStatus(member.id, member.is_active)} className="text-xs text-[var(--text-muted)]">{member.is_active ? 'Deactivate' : 'Activate'}</button><button onClick={() => handleEdit(member)} className="text-xs text-[var(--accent)]">Edit</button><button onClick={() => handleDelete(member.id)} className="text-xs text-red-400">Delete</button></div>
            </div>
          </div>
        ))}
        {members.length === 0 && <div className="col-span-full rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-8 text-center text-[var(--text-muted)]">No team members yet.</div>}
      </div>
    </div>
  )
}