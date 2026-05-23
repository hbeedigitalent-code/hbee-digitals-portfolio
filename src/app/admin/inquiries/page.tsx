'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

interface Inquiry {
  id: string
  full_name: string
  email: string
  company?: string
  phone?: string
  website?: string
  service?: string
  budget?: string
  timeline?: string
  message: string
  status: 'new' | 'contacted' | 'qualified' | 'closed'
  is_read: boolean
  source?: string
  created_at: string
}

const statusOptions = ['new', 'contacted', 'qualified', 'closed'] as const

function formatDate(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function AdminInquiriesPage() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null)
  const [filter, setFilter] = useState<'all' | 'unread' | 'new' | 'contacted' | 'qualified' | 'closed'>('all')
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetchInquiries()
  }, [])

  async function fetchInquiries() {
    const { data, error } = await supabase
      .from('contact_submissions')
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) setInquiries(data || [])
    setLoading(false)
  }

  const filteredInquiries = useMemo(() => {
    if (filter === 'all') return inquiries
    if (filter === 'unread') return inquiries.filter((item) => !item.is_read)
    return inquiries.filter((item) => item.status === filter)
  }, [filter, inquiries])

  const unreadCount = inquiries.filter((item) => !item.is_read).length
  const newCount = inquiries.filter((item) => item.status === 'new').length

  async function openInquiry(item: Inquiry) {
    setActiveInquiry(item)

    if (!item.is_read) {
      await supabase
        .from('contact_submissions')
        .update({
          is_read: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id)

      await fetchInquiries()
    }
  }

  async function updateStatus(id: string, status: Inquiry['status']) {
    const { error } = await supabase
      .from('contact_submissions')
      .update({
        status,
        is_read: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    setMessage('Inquiry status updated successfully.')
    await fetchInquiries()

    setActiveInquiry((prev) =>
      prev ? { ...prev, status, is_read: true } : prev
    )
  }

  async function deleteInquiry(id: string) {
    if (!confirm('Delete this inquiry?')) return

    const { error } = await supabase
      .from('contact_submissions')
      .delete()
      .eq('id', id)

    if (error) {
      setMessage(`Error: ${error.message}`)
      return
    }

    setMessage('Inquiry deleted successfully.')
    setActiveInquiry(null)
    await fetchInquiries()
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white">
        <div className="mx-auto max-w-7xl">
          <p className="text-white/60">Loading inquiries...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Admin / Inquiries
            </p>

            <h1 className="text-4xl font-black tracking-[-0.05em]">
              Project Inquiry Inbox
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              View, track, and manage contact form submissions from your website.
            </p>
          </div>

          <Link
            href="/admin/dashboard"
            className="w-fit rounded-full border border-[#1E314A] bg-[#0E1B2D] px-5 py-2.5 text-sm font-bold text-white/70 transition hover:border-[#39D97A]/25 hover:text-white"
          >
            Back to Dashboard
          </Link>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-4">
          <StatCard label="Total Inquiries" value={String(inquiries.length)} />
          <StatCard label="Unread" value={String(unreadCount)} highlight />
          <StatCard label="New Leads" value={String(newCount)} />
          <StatCard
            label="Qualified"
            value={String(inquiries.filter((item) => item.status === 'qualified').length)}
          />
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {(['all', 'unread', ...statusOptions] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                filter === item
                  ? 'border-[#39D97A]/30 bg-[#39D97A]/10 text-[#39D97A]'
                  : 'border-[#1E314A] bg-[#0E1B2D] text-white/45 hover:text-white'
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            {filteredInquiries.length === 0 ? (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8 text-center">
                <p className="text-white/55">No inquiries found.</p>
              </div>
            ) : (
              filteredInquiries.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openInquiry(item)}
                  className={`w-full rounded-[1.6rem] border p-5 text-left transition hover:-translate-y-1 hover:border-[#39D97A]/25 ${
                    activeInquiry?.id === item.id
                      ? 'border-[#39D97A]/30 bg-[#13233A]'
                      : 'border-[#1E314A] bg-[#0E1B2D]'
                  }`}
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-white">
                        {item.full_name}
                      </h3>

                      <p className="mt-1 text-sm text-white/45">
                        {item.email}
                      </p>
                    </div>

                    {!item.is_read && (
                      <span className="rounded-full bg-[#39D97A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F]">
                        New
                      </span>
                    )}
                  </div>

                  <p className="line-clamp-2 text-sm leading-7 text-white/55">
                    {item.message}
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge>{item.status}</Badge>
                    {item.service && <Badge>{item.service}</Badge>}
                    {item.budget && <Badge>{item.budget}</Badge>}
                  </div>

                  <p className="mt-4 text-xs text-white/35">
                    {formatDate(item.created_at)}
                  </p>
                </button>
              ))
            )}
          </div>

          <div className="lg:sticky lg:top-8 lg:self-start">
            {activeInquiry ? (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)]">
                <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                      Inquiry Details
                    </p>

                    <h2 className="text-3xl font-black tracking-[-0.04em]">
                      {activeInquiry.full_name}
                    </h2>

                    <p className="mt-2 text-sm text-white/45">
                      {formatDate(activeInquiry.created_at)}
                    </p>
                  </div>

                  <select
                    value={activeInquiry.status}
                    onChange={(e) =>
                      updateStatus(activeInquiry.id, e.target.value as Inquiry['status'])
                    }
                    className="rounded-full border border-[#1E314A] bg-[#07111F] px-4 py-2 text-sm font-bold text-white outline-none"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Info label="Email" value={activeInquiry.email} />
                  <Info label="Phone" value={activeInquiry.phone || 'Not provided'} />
                  <Info label="Company" value={activeInquiry.company || 'Not provided'} />
                  <Info label="Website" value={activeInquiry.website || 'Not provided'} />
                  <Info label="Service" value={activeInquiry.service || 'Not selected'} />
                  <Info label="Budget" value={activeInquiry.budget || 'Not selected'} />
                  <Info label="Timeline" value={activeInquiry.timeline || 'Not selected'} />
                  <Info label="Source" value={activeInquiry.source || 'Website form'} />
                </div>

                <div className="mt-5 rounded-[1.5rem] border border-[#1E314A] bg-[#07111F] p-5">
                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                    Message
                  </p>

                  <p className="whitespace-pre-wrap text-sm leading-8 text-white/68">
                    {activeInquiry.message}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <a
                    href={`mailto:${activeInquiry.email}`}
                    className="rounded-full bg-[#39D97A] px-5 py-2.5 text-sm font-black text-[#06101F]"
                  >
                    Reply by Email
                  </a>

                  {activeInquiry.phone && (
                    <a
                      href={`https://wa.me/${activeInquiry.phone.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-5 py-2.5 text-sm font-black text-[#39D97A]"
                    >
                      Open WhatsApp
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteInquiry(activeInquiry.id)}
                    className="rounded-full border border-red-400/25 bg-red-400/10 px-5 py-2.5 text-sm font-black text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8 text-center">
                <p className="text-white/55">
                  Select an inquiry to view full details.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

function StatCard({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-[1.6rem] border p-5 ${
        highlight
          ? 'border-[#39D97A]/25 bg-[#39D97A]/10'
          : 'border-[#1E314A] bg-[#0E1B2D]'
      }`}
    >
      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-white/42">
        {label}
      </p>
      <p className="mt-3 text-4xl font-black text-white">{value}</p>
    </div>
  )
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-[#39D97A]">
      {children}
    </span>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.2rem] border border-[#1E314A] bg-[#07111F] p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm text-white/68">{value}</p>
    </div>
  )
}