'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    const { data } = await supabase.from('email_templates').select('*').order('created_at', { ascending: false })
    setTemplates(data || [])
    setLoading(false)
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h2 className="text-2xl font-black text-[var(--text-primary)]">Email Templates</h2><p className="text-sm text-[var(--text-secondary)]">Manage email templates for notifications.</p></div>
        <Link href="/admin/email-templates/new" className="rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-black text-[var(--btn-primary-text)]">+ New Template</Link>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <table className="w-full">
          <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
            <tr><th className="p-4 text-left text-xs font-bold">Name</th><th className="p-4 text-left text-xs font-bold">Slug</th><th className="p-4 text-left text-xs font-bold">Subject</th><th className="p-4 text-center text-xs font-bold">Status</th><th className="p-4 text-center text-xs font-bold">Actions</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-[var(--bg-section)]">
                <td className="p-4 font-bold text-[var(--text-primary)]">{template.name}</td>
                <td className="p-4 text-sm text-[var(--text-muted)]">{template.slug}</td>
                <td className="p-4 text-sm text-[var(--text-secondary)]">{template.subject}</td>
                <td className="p-4 text-center"><span className={`rounded-full px-2 py-1 text-xs font-bold ${template.is_active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>{template.is_active ? 'Active' : 'Inactive'}</span></td>
                <td className="p-4 text-center"><Link href={`/admin/email-templates/${template.id}`} className="text-sm text-[var(--accent)]">Edit</Link></td>
              </tr>
            ))}
            {templates.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No email templates yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}