'use client'

// src/components/admin/ClientConnectionPanel.tsx
//
// S6.2 — the Admin "Connection & access" panel on a Portal account (/admin/client-portal/[client_id]).
//
// It reuses the routes that already exist and adds only what was missing:
//   connect    POST /api/admin/clients/link-merchant            (existing; canonical link_client_to_merchant RPC)
//   create     POST /api/admin/clients/[id]/create-business     (new; a merchants row when no Growth Review exists)
//   disconnect POST /api/admin/clients/[id]/disconnect          (new; explicit, conditional on the linked business)
//   suspend /  POST /api/admin/clients/[id]/status              (new; uses the existing clients.status column)
//   reactivate
//
// Connecting never creates an Auth account or sends an invitation: it links the SAME login the person already
// uses, so their next request sees connected functionality. Invitations stay available as an optional path.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AdminButton, AdminCard, AdminFacts, AdminNotice, AdminSection, AdminStatusBadge } from '@/components/admin/ui/AdminUi'

interface ClientSummary {
  id: string
  full_name?: string | null
  business_name?: string | null
  email?: string | null
  merchant_id?: string | null
  status?: string | null
}

interface Connection {
  connected: boolean
  merchant: { id: string; business_name: string | null; email: string | null } | null
  emailVerified: boolean | null
  suspended: boolean
}

interface BusinessOption {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  linked_clients: number | null
}

type Feedback = { tone: 'success' | 'error' | 'info'; text: string } | null

async function post(url: string, body: unknown): Promise<{ ok: boolean; status: number; payload: any }> {
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => null)
  return { ok: response.ok, status: response.status, payload }
}

export function ClientConnectionPanel({
  client,
  connection,
  onChanged,
}: {
  client: ClientSummary
  connection: Connection
  onChanged: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [businesses, setBusinesses] = useState<BusinessOption[] | null>(null)
  const [businessError, setBusinessError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState('')

  const loadBusinesses = useCallback(async () => {
    setBusinessError(null)
    try {
      const response = await fetch('/api/admin/merchants?view=businesses', { credentials: 'same-origin' })
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.businesses)) {
        setBusinessError('Could not load businesses. Please refresh and try again.')
        return
      }
      setBusinesses(payload.businesses as BusinessOption[])
    } catch {
      setBusinessError('Could not load businesses. Please refresh and try again.')
    }
  }, [])

  useEffect(() => {
    if (!connection.connected && businesses === null) void loadBusinesses()
  }, [connection.connected, businesses, loadBusinesses])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = businesses || []
    if (!q) return list.slice(0, 50)
    return list
      .filter((b) => [b.business_name, b.contact_name, b.email].some((v) => (v || '').toLowerCase().includes(q)))
      .slice(0, 50)
  }, [businesses, query])

  async function run(name: string, action: () => Promise<{ ok: boolean; payload: any }>, success: string) {
    setBusy(name)
    setFeedback(null)
    try {
      const result = await action()
      if (!result.ok) {
        const candidates = Array.isArray(result.payload?.candidates) ? result.payload.candidates : []
        const hint = candidates.length
          ? ` Existing: ${candidates.map((c: { business_name?: string; email?: string }) => c.business_name || c.email).join(', ')}.`
          : ''
        setFeedback({ tone: 'error', text: (result.payload?.message || 'That did not work. Nothing was changed.') + hint })
        return
      }
      setFeedback({ tone: 'success', text: success })
      onChanged()
    } catch {
      setFeedback({ tone: 'error', text: 'That did not work. Nothing was changed.' })
    } finally {
      setBusy(null)
    }
  }

  const connect = () =>
    run(
      'connect',
      () => post('/api/admin/clients/link-merchant', { clientId: client.id, merchantId: selected, reason: 'connected by admin from the Portal account page' }),
      'Connected. The same login now has connected-client access.',
    )

  const createBusiness = () => {
    if (!window.confirm('Create a new business record from this account and connect it? Use "Connect" instead if the business already exists.')) return
    void run('create', () => post(`/api/admin/clients/${client.id}/create-business`, {}), 'Business record created and connected.')
  }

  const disconnect = () => {
    if (!connection.merchant && !client.merchant_id) return
    if (!window.confirm('Disconnect this account from its business? The login and all records stay as they are; connected-only actions switch off until it is connected again.')) return
    void run(
      'disconnect',
      () => post(`/api/admin/clients/${client.id}/disconnect`, { confirm: true, merchantId: client.merchant_id }),
      'Disconnected. The account is still active and can sign in.',
    )
  }

  const setSuspended = (suspend: boolean) => {
    const prompt = suspend
      ? 'Suspend this Portal account? They will be signed out of everything operational immediately. Nothing is deleted and you can reactivate at any time.'
      : 'Reactivate this Portal account?'
    if (!window.confirm(prompt)) return
    void run(
      suspend ? 'suspend' : 'reactivate',
      () => post(`/api/admin/clients/${client.id}/status`, { action: suspend ? 'suspend' : 'reactivate' }),
      suspend ? 'Account suspended.' : 'Account reactivated.',
    )
  }

  return (
    <AdminSection id="connection" title="Connection & access" description="Portal sign-up is open. Connecting links this login to an Hbee business so operational features switch on.">
      <AdminCard>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
          <AdminStatusBadge tone={connection.connected ? 'green' : 'amber'} dot>
            {connection.connected ? 'Connected' : 'Not connected yet'}
          </AdminStatusBadge>
          <AdminStatusBadge tone={connection.suspended ? 'red' : 'neutral'}>{connection.suspended ? 'Suspended' : 'Active'}</AdminStatusBadge>
          <AdminStatusBadge tone={connection.emailVerified ? 'green' : 'neutral'}>
            {connection.emailVerified === null ? 'Email verification unknown' : connection.emailVerified ? 'Email verified' : 'Email not verified'}
          </AdminStatusBadge>
        </div>

        <AdminFacts
          items={[
            { label: 'Portal email', value: client.email },
            { label: 'Name', value: client.full_name },
            { label: 'Business name entered at sign-up', value: client.business_name },
            {
              label: 'Connected business',
              value: connection.merchant ? connection.merchant.business_name || connection.merchant.email || connection.merchant.id : null,
              href: connection.merchant ? `/admin/merchants/${connection.merchant.id}` : undefined,
            },
          ]}
        />

        {feedback && <AdminNotice tone={feedback.tone}>{feedback.text}</AdminNotice>}

        {!connection.connected && (
          <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.75rem', maxWidth: '36rem' }}>
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Find an existing business
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by business, contact or email"
                disabled={businesses === null}
              />
            </label>
            {businessError && <AdminNotice tone="error">{businessError}</AdminNotice>}
            <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.875rem' }}>
              Business
              <select value={selected} onChange={(e) => setSelected(e.target.value)} disabled={businesses === null}>
                <option value="">{businesses === null ? 'Loading…' : filtered.length ? 'Choose a business' : 'No matching business'}</option>
                {filtered.map((b) => {
                  const taken = (b.linked_clients ?? 0) > 0
                  return (
                    <option key={b.id} value={b.id} disabled={taken}>
                      {(b.business_name || b.contact_name || 'Unnamed business') + (b.email ? ` — ${b.email}` : '') + (taken ? ' (already connected)' : '')}
                    </option>
                  )
                })}
              </select>
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <AdminButton variant="primary" disabled={!selected || busy !== null} onClick={connect}>
                {busy === 'connect' ? 'Connecting…' : 'Connect to this business'}
              </AdminButton>
              <AdminButton variant="secondary" disabled={busy !== null} onClick={createBusiness}>
                {busy === 'create' ? 'Creating…' : 'Create business from this account'}
              </AdminButton>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {connection.connected && (
            <AdminButton variant="secondary" disabled={busy !== null} onClick={disconnect}>
              {busy === 'disconnect' ? 'Disconnecting…' : 'Disconnect from business'}
            </AdminButton>
          )}
          {connection.suspended ? (
            <AdminButton variant="primary" disabled={busy !== null} onClick={() => setSuspended(false)}>
              {busy === 'reactivate' ? 'Reactivating…' : 'Reactivate account'}
            </AdminButton>
          ) : (
            <AdminButton variant="danger" disabled={busy !== null} onClick={() => setSuspended(true)}>
              {busy === 'suspend' ? 'Suspending…' : 'Suspend account'}
            </AdminButton>
          )}
        </div>
      </AdminCard>
    </AdminSection>
  )
}
