'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

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

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" /></div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black text-[var(--text-primary)]">Email Delivery Logs</h2>
        <p className="text-sm text-[var(--text-secondary)]">Track emails sent through the system.</p>
      </div>

      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Recipient</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Template</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Subject</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Status</th>
                <th className="p-4 text-left text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-[var(--bg-section)]">
                  <td className="p-4">
                    <p className="font-bold text-[var(--text-primary)]">{log.recipient_name || 'Recipient'}</p>
                    <p className="text-sm text-[var(--text-muted)]">{log.recipient_email}</p>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{log.template_slug || 'manual'}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{log.subject}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${log.status === 'sent' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-[var(--text-muted)]">{new Date(log.created_at).toLocaleString()}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={5} className="p-8 text-center text-[var(--text-muted)]">No email logs found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}