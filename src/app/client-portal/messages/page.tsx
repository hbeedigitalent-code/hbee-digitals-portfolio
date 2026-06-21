'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { ClientPortalLayout } from '@/components/client-portal/ClientPortalLayout'
import SvgIcon from '@/components/ui/SvgIcon'

interface Client {
  id: string
  full_name: string
  business_name: string
}

interface Message {
  id: string
  project_id: string
  sender_id: string
  sender_role: string
  message: string
  attachment_url: string | null
  created_at: string
  project_name: string
}

export default function ClientMessagesPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [projects, setProjects] = useState<{ id: string; project_name: string }[]>([])
  const [sending, setSending] = useState(false)

  useEffect(() => {
    fetchClientData()
  }, [])

  async function fetchClientData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (clientData) {
        setClient(clientData)

        // Get projects
        const { data: projectData } = await supabase
          .from('projects')
          .select('id, project_name')
          .eq('client_id', clientData.id)

        setProjects(projectData || [])
        if (projectData && projectData.length > 0) {
          setSelectedProject(projectData[0].id)
        }

        // Get messages
        const { data: messageData } = await supabase
          .from('project_messages')
          .select(`
            *,
            projects (project_name)
          `)
          .eq('client_id', clientData.id)
          .order('created_at', { ascending: false })

        setMessages(messageData || [])
      }
    }

    setLoading(false)
  }

  async function sendMessage() {
    if (!newMessage.trim() || !selectedProject || !client) return

    setSending(true)

    try {
      const { error } = await supabase
        .from('project_messages')
        .insert({
          project_id: selectedProject,
          client_id: client.id,
          sender_id: client.id,
          sender_role: 'client',
          message: newMessage.trim(),
        })

      if (!error) {
        setNewMessage('')
        await fetchClientData()
      }
    } catch (error) {
      console.error('Send message error:', error)
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--bg-navy)]">
        <p className="text-[var(--text-muted)]">No client profile found</p>
      </div>
    )
  }

  return (
    <ClientPortalLayout clientName={client.full_name} businessName={client.business_name}>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-white">Messages</h1>

        {/* Message List */}
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
              <SvgIcon name="messages" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
              <p className="text-[var(--text-muted)]">No messages yet.</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4 ${
                  message.sender_role === 'admin' ? 'border-l-4 border-l-[var(--accent-orange)]' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-full p-2 ${
                      message.sender_role === 'admin' ? 'bg-[var(--accent-orange)]/20' : 'bg-[var(--bg-navy-mid)]'
                    }`}>
                      <SvgIcon 
                        name={message.sender_role === 'admin' ? 'user' : 'user'} 
                        size={16} 
                        color={message.sender_role === 'admin' ? 'var(--accent-orange)' : 'var(--text-muted)'}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-white">
                        {message.sender_role === 'admin' ? 'Hbee Team' : client.full_name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {message.project_name || 'Project'} • {new Date(message.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                  {message.message}
                </p>
                {message.attachment_url && (
                  <a
                    href={message.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline"
                  >
                    <SvgIcon name="file" size={14} color="var(--accent-orange)" />
                    View Attachment
                  </a>
                )}
              </div>
            ))
          )}
        </div>

        {/* Send Message */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-5">
          <h3 className="mb-3 text-sm font-semibold text-white">Send a Message</h3>
          
          <div className="flex flex-col gap-3 sm:flex-row">
            {projects.length > 0 && (
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)] sm:w-48"
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.project_name}
                  </option>
                ))}
              </select>
            )}

            <textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
              rows={2}
            />

            <button
              onClick={sendMessage}
              disabled={sending || !newMessage.trim() || !selectedProject}
              className="rounded-full bg-[var(--accent-orange)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50 sm:self-end"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </ClientPortalLayout>
  )
}