// src/app/admin/messages/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Message {
  id: string
  name: string
  email: string
  phone: string
  budget: string
  message: string
  project_details: string
  is_read: boolean
  created_at: string
}

const budgetLabels: Record<string, string> = {
  'under-5k': 'Under $5,000',
  '5k-10k': '$5,000 - $10,000',
  '10k-25k': '$10,000 - $25,000',
  '25k-50k': '$25,000 - $50,000',
  '50k-plus': '$50,000+',
  'not-sure': 'Not sure / TBD',
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [user, setUser] = useState<any>(null)
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/admin/login')
      } else {
        setUser(user)
        fetchMessages()
      }
    }
    getUser()
  }, [])

  const fetchMessages = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Error fetching messages:', error)
    } else {
      setMessages(data || [])
    }
    setLoading(false)
  }

  const markAsRead = async (id: string) => {
    await supabase.from('messages').update({ is_read: true }).eq('id', id)
    fetchMessages()
    if (selectedMessage?.id === id) {
      setSelectedMessage({ ...selectedMessage, is_read: true })
    }
  }

  const deleteMessage = async (id: string) => {
    if (confirm('Delete this message?')) {
      await supabase.from('messages').delete().eq('id', id)
      fetchMessages()
      if (selectedMessage?.id === id) setSelectedMessage(null)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Messages</h1>
        <span className="text-sm text-[var(--text-muted)]">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Messages List */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-section)]">
            <h2 className="font-semibold text-[var(--text-primary)]">
              Inbox ({messages.length} {messages.length === 1 ? 'message' : 'messages'})
            </h2>
          </div>
          
          {messages.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-6xl mb-4">📭</div>
              <p className="text-[var(--text-muted)]">No messages yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)] max-h-[600px] overflow-y-auto">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  onClick={() => setSelectedMessage(msg)}
                  className={`p-4 cursor-pointer hover:bg-[var(--bg-section)] transition ${
                    !msg.is_read ? 'border-l-4 border-l-[var(--accent)] bg-[var(--bg-section)]' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <p className="font-semibold text-[var(--text-primary)]">{msg.name}</p>
                    <p className="text-xs text-[var(--text-muted)]">
                      {new Date(msg.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] truncate">{msg.email}</p>
                  <p className="text-sm text-[var(--text-secondary)] mt-1 line-clamp-2">{msg.message}</p>
                  <div className="flex gap-2 mt-2">
                    {msg.budget && (
                      <span className="text-xs bg-[var(--bg-section)] text-[var(--text-muted)] px-2 py-0.5 rounded">
                        {budgetLabels[msg.budget] || msg.budget}
                      </span>
                    )}
                    {!msg.is_read && (
                      <span className="text-xs bg-[var(--accent)]/20 text-[var(--accent)] px-2 py-0.5 rounded">New</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
          {selectedMessage ? (
            <div>
              <div className="p-4 border-b border-[var(--border)] bg-[var(--bg-section)] flex justify-between items-center">
                <h2 className="font-semibold text-[var(--text-primary)]">Message Details</h2>
                <div className="flex gap-2">
                  {!selectedMessage.is_read && (
                    <button
                      onClick={() => markAsRead(selectedMessage.id)}
                      className="px-3 py-1 text-sm bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={() => deleteMessage(selectedMessage.id)}
                    className="px-3 py-1 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">From</p>
                  <p className="font-semibold text-[var(--text-primary)]">{selectedMessage.name}</p>
                  <p className="text-[var(--text-secondary)]">{selectedMessage.email}</p>
                  {selectedMessage.phone && (
                    <p className="text-[var(--text-secondary)]">{selectedMessage.phone}</p>
                  )}
                </div>

                {selectedMessage.budget && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Budget Range</p>
                    <p className="text-[var(--text-primary)] font-medium">
                      {budgetLabels[selectedMessage.budget] || selectedMessage.budget}
                    </p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Project Description</p>
                  <p className="text-[var(--text-secondary)] bg-[var(--bg-section)] p-3 rounded-lg">{selectedMessage.message}</p>
                </div>

                {selectedMessage.project_details && (
                  <div>
                    <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Additional Details</p>
                    <p className="text-[var(--text-secondary)] bg-[var(--bg-section)] p-3 rounded-lg">{selectedMessage.project_details}</p>
                  </div>
                )}

                <div>
                  <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider">Received</p>
                  <p className="text-[var(--text-secondary)]">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>

                <div className="pt-4 border-t border-[var(--border)]">
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Response to your inquiry`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition"
                  >
                    <SvgIcon name="email" size={16} color="white" />
                    Reply via Email
                  </a>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-[var(--text-muted)]">
              <SvgIcon name="email" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
              <p>Select a message to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}