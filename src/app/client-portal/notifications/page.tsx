// src/app/client-portal/notifications/page.tsx
//
// Client-portal notification inbox. Batch N2-E; presentation refined in Phase 18.7.
//
// Authorization is NOT re-implemented here. This page sits under
// /client-portal/*, so middleware.ts already enforces an authenticated session
// before it renders, and GET /api/notifications independently re-verifies the
// session and resolves the caller's clients.id server-side, returning only that
// client's rows. This page is a plain client component that calls that API and
// nothing else — it never queries Supabase and never sends recipient_scope,
// recipient_id, user_id, user_type or client_id.
//
// Internal fields (recipient_id, user_id, user_type, idempotency_key,
// is_legacy) are not returned by the API and are never rendered.
//
// Phase 18.7: the list/unread/mark-read/mark-all-read behaviour is unchanged. The one functional
// tightening is that a notification's `link` is followed only if it is a same-origin portal path
// (safeNotificationLink); anything else is ignored, so a stored external or script link can never
// become a navigation target. Notifications are informational — none is treated as a task.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { formatDateTime, safeNotificationLink } from '@/lib/client-portal/support-display'
import styles from '@/components/client-portal/support.module.css'

interface ClientNotification {
  id: string
  type: string
  title: string
  message: string
  link: string | null
  entity_type: string | null
  entity_id: string | null
  recipient_scope: string
  created_at: string
  read_at: string | null
}

export default function ClientNotificationsPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<ClientNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadFailed, setLoadFailed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    setLoadFailed(false)
    try {
      const response = await fetch('/api/notifications', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)

      if (!response.ok || !Array.isArray(payload?.notifications)) {
        console.error(
          'Error fetching notifications:',
          payload?.error || `Request failed with status ${response.status}`
        )
        setLoadFailed(true)
        setNotifications([])
        return
      }

      setNotifications(payload.notifications as ClientNotification[])
      if (typeof payload.unreadCount === 'number') setUnreadCount(payload.unreadCount)
    } catch (err) {
      console.error('Error:', err)
      setLoadFailed(true)
      setNotifications([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function handleSelect(notification: ClientNotification) {
    const destination = safeNotificationLink(notification.link)

    if (notification.read_at) {
      if (destination) router.push(destination)
      return
    }

    setPendingId(notification.id)
    setError(null)
    setNotifications((current) =>
      current.map((n) =>
        n.id === notification.id ? { ...n, read_at: new Date().toISOString() } : n,
      ),
    )
    setUnreadCount((current) => Math.max(0, current - 1))

    let succeeded = false
    try {
      const response = await fetch(`/api/notifications/${notification.id}/read`, {
        method: 'POST',
        credentials: 'same-origin',
      })
      succeeded = response.ok
    } catch {
      succeeded = false
    }

    setPendingId(null)

    if (!succeeded) {
      setNotifications((current) =>
        current.map((n) => (n.id === notification.id ? { ...n, read_at: null } : n)),
      )
      setUnreadCount((current) => current + 1)
      setError('Could not update that notification.')
      return
    }

    if (destination) router.push(destination)
  }

  async function handleMarkAll() {
    const snapshot = notifications
    const previousCount = unreadCount

    setError(null)
    setNotifications((current) =>
      current.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })),
    )
    setUnreadCount(0)

    try {
      const response = await fetch('/api/notifications/read-all', {
        method: 'POST',
        credentials: 'same-origin',
      })
      if (!response.ok) {
        setNotifications(snapshot)
        setUnreadCount(previousCount)
        setError('Could not mark all as read.')
      }
    } catch {
      setNotifications(snapshot)
      setUnreadCount(previousCount)
      setError('Could not mark all as read.')
    }
  }

  if (loading) return <SupportLoading />
  if (loadFailed) {
    return <SupportError message="Could not load notifications. Please refresh and try again." onRetry={fetchNotifications} />
  }

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Notifications
          </p>
          <h1 className={styles.h1}>Updates from Hbee</h1>
          <p className={styles.lead}>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}</p>
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={handleMarkAll} className={`${styles.secondary} ${styles.markAll}`}>
            Mark all as read
          </button>
        )}
      </header>

      {error && (
        <p role="alert" className={styles.err}>
          {error}
        </p>
      )}

      {notifications.length === 0 ? (
        <section className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>No notifications yet</h2>
            <p>Updates about your projects, files and invoices will appear here.</p>
          </div>
        </section>
      ) : (
        <section className={styles.panel} aria-label="Notifications">
          <ul className={styles.list}>
            {notifications.map((notification) => {
              const isUnread = !notification.read_at
              const destination = safeNotificationLink(notification.link)
              const actionable = isUnread || !!destination
              const when = formatDateTime(notification.created_at)

              return (
                <li key={notification.id}>
                  <button
                    type="button"
                    disabled={!actionable || pendingId === notification.id}
                    onClick={() => handleSelect(notification)}
                    className={`${styles.notif} ${isUnread ? styles.unread : ''}`}
                  >
                    <span aria-hidden="true" className={styles.dot} />
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span className={styles.itemTitle} style={{ display: 'block' }}>
                        {notification.title}
                        <span className="sr-only">{isUnread ? ' (unread)' : ' (read)'}</span>
                      </span>
                      {notification.message && (
                        <span className={styles.itemText} style={{ display: 'block' }}>
                          {notification.message}
                        </span>
                      )}
                      {when && (
                        <span className={styles.itemMeta} style={{ display: 'flex' }}>
                          {when}
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
