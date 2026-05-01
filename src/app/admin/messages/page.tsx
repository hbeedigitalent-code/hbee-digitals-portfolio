'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

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
    const { data } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
    setMessages(data || [])
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

  if (!user) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <Link href="/admin/dashboard" className="text-white hover:opacity-80">
            ← Back to Dashboard
          </Link>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Messages List */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">
                Inbox ({messages.length} {messages.length === 1 ? 'message' : 'messages'})
              </h2>
            </div>
            
            {messages.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📭</div>
                <p className="text-gray-500">No messages yet.</p>
              </div>
            ) : (
              <div className="divide-y max-h-[600px] overflow-y-auto">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                      !msg.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-semibold text-gray-800">{msg.name}</p>
                      <p className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <p className="text-sm text-gray-500 truncate">{msg.email}</p>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.message}</p>
                    <div className="flex gap-2 mt-2">
                      {msg.budget && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                          {budgetLabels[msg.budget] || msg.budget}
                        </span>
                      )}
                      {!msg.is_read && (
                        <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">New</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Message Detail */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            {selectedMessage ? (
              <div>
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                  <h2 className="font-semibold text-gray-800">Message Details</h2>
                  <div className="flex gap-2">
                    {!selectedMessage.is_read && (
                      <button
                        onClick={() => markAsRead(selectedMessage.id)}
                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                      >
                        Mark as Read
                      </button>
                    )}
                    <button
                      onClick={() => deleteMessage(selectedMessage.id)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="p-6 space-y-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">From</p>
                    <p className="font-semibold text-gray-800">{selectedMessage.name}</p>
                    <p className="text-gray-600">{selectedMessage.email}</p>
                    {selectedMessage.phone && (
                      <p className="text-gray-600">{selectedMessage.phone}</p>
                    )}
                  </div>

                  {selectedMessage.budget && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Budget Range</p>
                      <p className="text-gray-800 font-medium">
                        {budgetLabels[selectedMessage.budget] || selectedMessage.budget}
                      </p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Project Description</p>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedMessage.message}</p>
                  </div>

                  {selectedMessage.project_details && (
                    <div>
                      <p className="text-xs text-gray-400 uppercase tracking-wider">Additional Details</p>
                      <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{selectedMessage.project_details}</p>
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider">Received</p>
                    <p className="text-gray-600">
                      {new Date(selectedMessage.created_at).toLocaleString()}
                    </p>
                  </div>

                  <div className="pt-4 border-t">
                    <a
                      href={`mailto:${selectedMessage.email}?subject=Response to your inquiry about ${selectedMessage.project_details?.substring(0, 50) || 'your project'}`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-[#007BFF] text-white rounded-lg hover:bg-[#0056b3] transition"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      Reply via Email
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-gray-400">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p>Select a message to view details</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}