'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface Agreement {
  id: string
  agreement_number: string
  client_id: string
  project_id: string | null
  scope: string
  deliverables: string[]
  timeline: string
  payment_terms: string
  revision_policy: string
  confidentiality_clause: string
  ownership_terms: string
  status: string
  signature_status: string
  signed_file_url: string | null
  created_at: string
  clients?: { business_name: string; full_name: string; email: string }
}

const statusOptions = ['Draft', 'Sent', 'Signed', 'Declined', 'Expired']
const signatureOptions = ['Pending', 'Signed', 'Declined']

const statusColors: Record<string, string> = {
  'Draft': 'bg-gray-500/20 text-gray-400',
  'Sent': 'bg-blue-500/20 text-blue-400',
  'Signed': 'bg-[var(--accent-lime)]/20 text-[var(--accent-lime)]',
  'Declined': 'bg-red-500/20 text-red-400',
  'Expired': 'bg-gray-500/20 text-gray-400',
}

export default function AdminAgreementDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [agreement, setAgreement] = useState<Agreement | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState('')
  const [selectedSignature, setSelectedSignature] = useState('')

  useEffect(() => {
    fetchAgreement()
  }, [params.id])

  async function fetchAgreement() {
    setLoading(true)

    const { data, error } = await supabase
      .from('agreements')
      .select(`
        *,
        clients (business_name, full_name, email)
      `)
      .eq('id', params.id)
      .single()

    if (error || !data) {
      router.push('/admin/agreements')
      return
    }

    setAgreement(data)
    setSelectedStatus(data.status)
    setSelectedSignature(data.signature_status)
    setLoading(false)
  }

  async function updateAgreement() {
    if (!agreement) return

    setUpdating(true)

    const { error } = await supabase
      .from('agreements')
      .update({
        status: selectedStatus,
        signature_status: selectedSignature
      })
      .eq('id', agreement.id)

    if (!error) {
      setAgreement({ ...agreement, status: selectedStatus, signature_status: selectedSignature })
    }

    setUpdating(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  if (!agreement) {
    return (
      <div className="text-center py-12">
        <p className="text-[var(--text-muted)]">Agreement not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/agreements"
            className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-white transition"
          >
            <SvgIcon name="chevron-left" size={16} color="currentColor" />
            Back to Agreements
          </Link>
          <h1 className="text-2xl font-bold text-white mt-2">
            {agreement.agreement_number}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{agreement.clients?.business_name || 'N/A'}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusColors[agreement.status]}`}>
          {agreement.status}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Status Management */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Agreement Management</h3>
            
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Status</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                >
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--text-muted)]">Signature Status</label>
                <select
                  value={selectedSignature}
                  onChange={(e) => setSelectedSignature(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                >
                  {signatureOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <button
                onClick={updateAgreement}
                disabled={updating}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Agreement'}
              </button>

              {agreement.signed_file_url && (
                <a
                  href={agreement.signed_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-2 text-sm font-semibold text-white transition hover:bg-[var(--bg-navy-mid)]"
                >
                  <SvgIcon name="download" size={14} color="currentColor" />
                  Download Signed Copy
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Agreement Info */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <h3 className="text-sm font-semibold text-white mb-4">Agreement Details</h3>
            
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-xs text-[var(--text-muted)]">Agreement Number</p>
                <p className="text-sm font-mono text-[var(--accent-orange)]">{agreement.agreement_number}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Client</p>
                <p className="text-sm text-white">{agreement.clients?.full_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Business</p>
                <p className="text-sm text-white">{agreement.clients?.business_name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Email</p>
                <p className="text-sm text-white">{agreement.clients?.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Timeline</p>
                <p className="text-sm text-white">{agreement.timeline || 'N/A'}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--text-muted)]">Payment Terms</p>
                <p className="text-sm text-white">{agreement.payment_terms || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Scope</p>
                <p className="text-sm text-white">{agreement.scope || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Deliverables</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {agreement.deliverables?.map((item, idx) => (
                    <span key={idx} className="rounded-full bg-[var(--bg-navy-mid)] px-3 py-1 text-xs text-[var(--text-muted)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Revision Policy</p>
                <p className="text-sm text-white">{agreement.revision_policy || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Confidentiality</p>
                <p className="text-sm text-white">{agreement.confidentiality_clause || 'N/A'}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-[var(--text-muted)]">Ownership Terms</p>
                <p className="text-sm text-white">{agreement.ownership_terms || 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}