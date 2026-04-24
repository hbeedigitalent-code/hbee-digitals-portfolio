'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function MessagesPage() {
  const [messages, setMessages] = useState<any[]>([])
  const [user, setUser] = useState<any>(null)
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
  }

  if (!user) return <div className="p-8">Loading...</div>

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="p-4" style={{ backgroundColor: 'var(--primary-color)' }}>
        <div className="container mx-auto flex justify-between items-center">
          <h1 className="text-xl font-bold text-white">Messages</h1>
          <button onClick={() => router.push('/admin/dashboard')} className="text-white">
            ← Back to Dashboard
          </button>
        </div>
      </nav>

      <div className="container mx-auto p-6">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {messages.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No messages yet.</div>
          ) : (
            <div className="divide-y">
              {messages.map((msg) => (
                <div key={msg.id} className={`p-4 ${!msg.is_read ? 'bg-blue-50' : ''}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">{msg.name}</p>
                      <p className="text-sm text-gray-500">{msg.email}</p>
                      <p className="text-sm text-gray-400">{new Date(msg.created_at).toLocaleString()}</p>
                      <p className="mt-2">{msg.message}</p>
                    </div>
                    {!msg.is_read && (
                      <button
                        onClick={() => markAsRead(msg.id)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
                      >
                        Mark as Read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}