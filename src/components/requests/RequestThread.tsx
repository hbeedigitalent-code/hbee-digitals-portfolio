// src/components/requests/RequestThread.tsx
//
// The conversation on one request — shared by the Portal and the Admin so the two cannot drift. It renders
// what it is GIVEN; it never decides who may see what (the routes do, in their database queries) and it never
// sends a role: onSend receives only { body, internal } and each side's route supplies the author role.
//
// Retry safety: one idempotency key per composed message, reused if the send fails and the user presses Send
// again, replaced only after a success — so a flaky connection cannot post the same message twice.

'use client'

import { useRef, useState } from 'react'
import styles from './thread.module.css'

export interface ThreadMessage {
  id: string
  /** 'you' | 'hbee' on the Portal; 'client' | 'hbee' in Admin. */
  from: string
  mine?: boolean
  body: string
  createdAt: string
  internal?: boolean
  unread?: boolean
  attachmentName?: string | null
}

interface Props {
  viewer: 'client' | 'admin'
  messages: ThreadMessage[]
  canReply: boolean
  closedNote?: string
  /** Admin only: show the "internal note" switch. */
  allowInternal?: boolean
  onSend: (input: { body: string; internal: boolean; clientKey: string }) => Promise<string | null>
}

const MAX = 5000

function newKey(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return `k${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
  }
}

function when(value: string): string {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function label(m: ThreadMessage, viewer: Props['viewer']): string {
  if (m.internal) return 'Internal note'
  if (viewer === 'client') return m.from === 'you' ? 'You' : 'Hbee Digitals'
  return m.from === 'client' ? 'Client' : m.mine ? 'You (Hbee)' : 'Hbee'
}

export default function RequestThread({ viewer, messages, canReply, closedNote, allowInternal, onSend }: Props) {
  const [body, setBody] = useState('')
  const [internal, setInternal] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const key = useRef<string>(newKey())

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const text = body.trim()
    if (!text || busy) return
    setBusy(true)
    setError(null)
    const failure = await onSend({ body: text, internal: allowInternal ? internal : false, clientKey: key.current })
    setBusy(false)
    if (failure) {
      setError(failure)
      return
    }
    setBody('')
    setInternal(false)
    key.current = newKey()
  }

  return (
    <section className={styles.thread} aria-label="Conversation">
      {messages.length === 0 ? (
        <p className={styles.empty}>No replies yet. {viewer === 'client' ? 'Hbee will respond here.' : 'Reply below to answer the client.'}</p>
      ) : (
        <ol className={styles.list}>
          {messages.map((m) => {
            const own = viewer === 'client' ? m.from === 'you' : m.from === 'hbee'
            return (
              <li key={m.id} className={`${styles.msg} ${own ? styles.own : ''} ${m.internal ? styles.internal : ''}`}>
                <div className={styles.meta}>
                  <strong>{label(m, viewer)}</strong>
                  <time dateTime={m.createdAt}>{when(m.createdAt)}</time>
                  {m.unread && <span className={styles.new}>New</span>}
                </div>
                <p className={styles.body}>{m.body}</p>
                {m.attachmentName && <p className={styles.attach}>Attachment: {m.attachmentName}</p>}
              </li>
            )
          })}
        </ol>
      )}

      {canReply ? (
        <form onSubmit={submit} className={styles.compose}>
          <label htmlFor="thread-body" className={styles.srOnly}>
            Your message
          </label>
          <textarea
            id="thread-body"
            value={body}
            onChange={(e) => setBody(e.target.value.slice(0, MAX))}
            rows={4}
            maxLength={MAX}
            placeholder={internal ? 'Internal note — the client will not see this' : 'Write a reply…'}
            className={`${styles.textarea} ${internal ? styles.textareaInternal : ''}`}
          />
          <div className={styles.row}>
            {allowInternal ? (
              <label className={styles.check}>
                <input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} />
                Internal note (hidden from the client)
              </label>
            ) : (
              <span className={styles.count}>
                {body.length}/{MAX}
              </span>
            )}
            <button type="submit" disabled={busy || body.trim().length === 0} className={styles.send}>
              {busy ? 'Sending…' : internal ? 'Save note' : 'Send reply'}
            </button>
          </div>
          {error && (
            <p role="alert" className={styles.error}>
              {error}
            </p>
          )}
        </form>
      ) : (
        <p className={styles.closed}>{closedNote || 'This conversation is closed.'}</p>
      )}
    </section>
  )
}
