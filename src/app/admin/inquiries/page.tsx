'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import SvgIcon from '@/components/ui/SvgIcon'

interface Message {
  id: string
  full_name: string
  email: string
  phone: string
  company: string
  service: string
  budget: string
  timeline: string
  website: string
  message: string
  is_read: boolean
  created_at: string
}

export default function InquiriesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    checkAuth()
    fetchMessages()
  }, [])

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) router.push('/admin/login')
  }

  const fetchMessages = async () => {
    const { data } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    setMessages(data || [])
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('contact_submissions').update({ is_read: true }).eq('id', id)
    fetchMessages()
    if (selectedMessage?.id === id) {
      setSelectedMessage({ ...selectedMessage, is_read: true })
    }
  }

  const deleteMessage = async (id: string) => {
    if (confirm('Delete this message?')) {
      await supabase.from('contact_submissions').delete().eq('id', id)
      fetchMessages()
      if (selectedMessage?.id === id) setSelectedMessage(null)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Inquiries</h2>
        <p className="text-sm text-[var(--text-secondary)]">Manage and respond to project inquiries from potential clients.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages List */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="border-b border-[var(--border)] p-4">
            <h3 className="font-black">Inbox ({messages.length} messages)</h3>
          </div>

          {messages.length === 0 ? (
            <div className="p-12 text-center">
              <SvgIcon name="email" size={48} color="var(--text-muted)" />
              <p className="mt-4 text-[var(--text-secondary)]">No messages yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`cursor-pointer p-4 transition hover:bg-[var(--bg-section)] ${!msg.is_read ? 'border-l-4 border-l-[var(--accent)] bg-[var(--accent)]/5' : ''}`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-bold text-[var(--text-primary)]">{msg.full_name || 'Anonymous'}</p>
                    <p className="text-xs text-[var(--text-muted)]">{new Date(msg.created_at).toLocaleDateString()}</p>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{msg.email}</p>
                  <p className="mt-2 line-clamp-2 text-sm text-[var(--text-muted)]">{msg.message}</p>
                  <div className="mt-2 flex gap-2">
                    {msg.service && <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-xs text-[var(--accent)]">{msg.service}</span>}
                    {!msg.is_read && <span className="rounded-full bg-[var(--accent)]/20 px-2 py-0.5 text-xs text-[var(--accent)]">New</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {selectedMessage ? (
            <>
              <div className="flex items-center justify-between border-b border-[var(--border)] p-4">
                <h3 className="font-black">Message Details</h3>
                <div className="flex gap-2">
                  {!selectedMessage.is_read && (
                    <button onClick={() => markAsRead(selectedMessage.id)} className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-sm font-bold text-[var(--accent)]">
                      Mark as Read
                    </button>
                  )}
                  <button onClick={() => deleteMessage(selectedMessage.id)} className="rounded-full bg-red-500/10 px-3 py-1 text-sm font-bold text-red-400">
                    Delete
                  </button>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">From</p>
                  <p className="font-bold text-[var(--text-primary)]">{selectedMessage.full_name || 'Anonymous'}</p>
                  <p className="text-sm text-[var(--text-secondary)]">{selectedMessage.email}</p>
                  {selectedMessage.phone && <p className="text-sm text-[var(--text-secondary)]">{selectedMessage.phone}</p>}
                </div>

                {selectedMessage.company && (
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Company</p>
                    <p className="text-sm text-[var(--text-primary)]">{selectedMessage.company}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  {selectedMessage.service && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Service</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedMessage.service}</p>
                    </div>
                  )}
                  {selectedMessage.budget && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Budget</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedMessage.budget}</p>
                    </div>
                  )}
                  {selectedMessage.timeline && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Timeline</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedMessage.timeline}</p>
                    </div>
                  )}
                  {selectedMessage.website && (
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Website</p>
                      <p className="text-sm text-[var(--text-primary)]">{selectedMessage.website}</p>
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">Message</p>
                  <p className="mt-2 rounded-lg bg-[var(--bg-section)] p-4 text-sm text-[var(--text-secondary)]">
                    {selectedMessage.message}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Response to your inquiry about ${selectedMessage.service || 'project'}`}
                    className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-black text-[var(--btn-primary-text)] transition hover:scale-[1.02]"
                  >
                    <SvgIcon name="email" size={16} color="var(--btn-primary-text)" />
                    Reply via Email
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <SvgIcon name="messages" size={48} color="var(--text-muted)" />
              <p className="mt-4 text-[var(--text-secondary)]">Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}