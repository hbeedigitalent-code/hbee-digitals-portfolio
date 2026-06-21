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

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  currency: string
  status: string
  due_date: string
  payment_link: string | null
  created_at: string
  project_id: string
  project_name: string
}

const statusColors: Record<string, string> = {
  'draft': 'bg-gray-500/20 text-gray-400',
  'sent': 'bg-blue-500/20 text-blue-400',
  'paid': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'overdue': 'bg-red-500/20 text-red-400',
  'cancelled': 'bg-gray-500/20 text-gray-400',
}

export default function ClientInvoicesPage() {
  const supabase = createClientComponentClient()
  const [client, setClient] = useState<Client | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

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

        const { data: invoiceData } = await supabase
          .from('project_invoices')
          .select(`
            *,
            projects (project_name)
          `)
          .order('created_at', { ascending: false })

        setInvoices(invoiceData || [])
      }
    }

    setLoading(false)
  }

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.amount, 0)
  const paidAmount = invoices.filter(inv => inv.status === 'paid').reduce((sum, inv) => sum + inv.amount, 0)
  const overdueAmount = invoices.filter(inv => inv.status === 'overdue').reduce((sum, inv) => sum + inv.amount, 0)

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
        <h1 className="text-3xl font-bold text-white">Invoices</h1>

        {/* Stats */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Total</p>
            <p className="text-2xl font-bold text-white">
              {invoices[0]?.currency || 'USD'} {totalAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Paid</p>
            <p className="text-2xl font-bold text-[var(--accent-lime)]">
              {invoices[0]?.currency || 'USD'} {paidAmount.toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4">
            <p className="text-sm text-[var(--text-muted)]">Overdue</p>
            <p className="text-2xl font-bold text-red-400">
              {invoices[0]?.currency || 'USD'} {overdueAmount.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Invoice List */}
        {invoices.length === 0 ? (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-12 text-center">
            <SvgIcon name="pricing" size={48} color="var(--text-muted)" className="mx-auto mb-4" />
            <p className="text-[var(--text-muted)]">No invoices yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="flex flex-wrap items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-4"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <p className="font-mono font-medium text-white">{invoice.invoice_number}</p>
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[invoice.status]}`}>
                      {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)]">
                    {invoice.project_name || 'Project'} • Due {new Date(invoice.due_date).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-bold text-white">
                    {invoice.currency} {invoice.amount.toFixed(2)}
                  </p>
                  {invoice.payment_link && invoice.status !== 'paid' && (
                    <a
                      href={invoice.payment_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full bg-[var(--accent-orange)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
                    >
                      Pay Now
                    </a>
                  )}
                  {invoice.status === 'paid' && (
                    <span className="text-sm text-[var(--accent-lime)]">✓ Paid</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ClientPortalLayout>
  )
}