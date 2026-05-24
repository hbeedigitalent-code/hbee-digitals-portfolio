'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLogs()
  }, [])

  async function fetchLogs() {
    const { data } = await supabase
      .from('email_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    setLogs(data || [])
    setLoading(false)
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
          Admin / Email Logs
        </p>

        <h1 className="text-4xl font-black tracking-[-0.05em]">
          Email Delivery Logs
        </h1>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
          Track emails sent through Resend from the website and admin dashboard.
        </p>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead>
              <tr className="border-b border-[#1E314A]">
                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Recipient
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Template
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Subject
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Status
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Date
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-[#1E314A]/60">
                    <td className="px-6 py-5">
                      <p className="font-black text-white">
                        {log.recipient_name || 'Recipient'}
                      </p>
                      <p className="mt-1 text-sm text-white/45">
                        {log.recipient_email}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-sm text-white/55">
                      {log.template_slug || 'manual'}
                    </td>

                    <td className="px-6 py-5 text-sm text-white/65">
                      {log.subject}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          log.status === 'sent'
                            ? 'bg-[#39D97A]/12 text-[#39D97A]'
                            : 'bg-red-500/12 text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-sm text-white/45">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}