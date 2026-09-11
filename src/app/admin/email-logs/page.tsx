// src/app/admin/email-logs/page.tsx
//
// Reads through /api/admin/email-logs (session + user-bound 2FA + active
// admin), never directly from the table. The previous version queried
// email_logs with the browser's anon client, which worked only because the
// table's single policy granted ALL to every authenticated user.
//
// LABELLING. A row marked `sent` means the PROVIDER ACCEPTED the message. It is
// not delivery confirmation, and this page says so rather than showing a green
// "sent" badge that overstates what is known.

'use client'

import { useCallback, useEffect, useState } from 'react'
import SvgIcon from '@/components/ui/SvgIcon'

interface EmailLog {
  id: string
  template_slug: string | null
  recipient_email: string | null
  recipient_name: string | null
  subject: string | null
  status: string | null
  delivery_state: string | null
  delivery_recorded_at: string | null
  resend_id: string | null
  error_message: string | null
  created_at: string
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'failed', label: 'Failed' },
  { value: 'legacy', label: 'Legacy' },
]

const FOCUS_RING =
  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]'

/**
 * The row is described by delivery_state, which is authoritative. A NULL means
 * the row predates delivery tracking: nothing ever recorded an outcome for it,
 * so it is shown as Legacy rather than reported as a success.
 */
type Outcome = { label: string; tone: 'good' | 'bad' | 'unknown' }

function outcomeOf(log: EmailLog): Outcome {
  switch (log.delivery_state) {
    case 'accepted':
      return { label: 'Accepted', tone: 'good' }
    case 'failed':
      return { label: 'Failed', tone: 'bad' }
    case 'configuration_error':
      return { label: 'Not sent', tone: 'bad' }
    default:
      return { label: 'Legacy', tone: 'unknown' }
  }
}

const TONE_CLASS: Record<Outcome['tone'], string> = {
  good: 'bg-[var(--success)]/15 text-[var(--success)]',
  bad: 'bg-[var(--error)]/15 text-[var(--error)]',
  unknown: 'bg-[var(--bg-section)] text-[var(--text-muted)]',
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState('all')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/email-logs?status=${status}`, {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.logs)) {
        // A denied or failed read must never look like "no emails were sent".
        setError(payload?.error || 'Failed to load email logs.')
        setLogs([])
        return
      }

      setLogs(payload.logs as EmailLog[])
    } catch {
      setError('Failed to load email logs.')
      setLogs([])
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => {
    void fetchLogs()
  }, [fetchLogs])

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">Email Delivery Log</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            Every send attempt made by the application. <strong>Accepted</strong> means the
            provider took the message — it is not confirmation that it was delivered or read.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatus(filter.value)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${FOCUS_RING} ${
                status === filter.value
                  ? 'bg-[var(--accent)] text-[var(--text-on-inverse)]'
                  : 'border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
        >
          <SvgIcon name="x-circle" size={18} color="var(--error)" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--text-primary)]">{error}</p>
            <p className="text-xs text-[var(--text-muted)]">
              This is an error, not an empty log.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void fetchLogs()}
            className={`rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[var(--bg-card-hover)] ${FOCUS_RING}`}
          >
            Retry
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px]">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr className="text-left text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                <th className="p-4">Recipient</th>
                <th className="p-4">Template</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Result</th>
                <th className="p-4">When</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {loading && (
                <tr>
                  <td colSpan={5} className="p-10 text-center">
                    <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  </td>
                </tr>
              )}

              {!loading &&
                logs.map((log) => {
                  const outcome = outcomeOf(log)
                  const failed = outcome.tone === 'bad'
                  return (
                    <tr key={log.id} className="align-top hover:bg-[var(--bg-section)]">
                      <td className="p-4">
                        <p className="font-semibold text-[var(--text-primary)]">
                          {log.recipient_name || 'Recipient'}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">{log.recipient_email}</p>
                      </td>
                      <td className="p-4 text-sm text-[var(--text-secondary)]">
                        {log.template_slug || '—'}
                      </td>
                      <td className="p-4 text-sm text-[var(--text-secondary)]">
                        {log.subject || '—'}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${
                            TONE_CLASS[outcome.tone]
                          }`}
                        >
                          {outcome.label}
                        </span>
                        {outcome.tone === 'unknown' && (
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Recorded before delivery tracking existed.
                          </p>
                        )}
                        {failed && log.error_message && (
                          <p className="mt-1 max-w-xs break-words text-xs text-[var(--text-muted)]">
                            {log.error_message}
                          </p>
                        )}
                      </td>
                      <td className="p-4 text-sm text-[var(--text-muted)]">
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                    </tr>
                  )
                })}

              {!loading && !error && logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-[var(--text-muted)]">
                    No email attempts recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
