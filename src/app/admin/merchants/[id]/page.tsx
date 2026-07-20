// src/app/admin/merchants/[id]/page.tsx

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@/lib/supabase-client'
import StatusBadge from '@/components/ui/StatusBadge'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

interface PageProps {
  params: {
    id: string
  }
}

export default function AdminMerchantDetailPage({ params }: PageProps) {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [merchant, setMerchant] = useState<any>(null)
  const [assessments, setAssessments] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [status, setStatus] = useState<any>(null)

  useEffect(() => {
    fetchMerchantData()
  }, [params.id])

  async function fetchMerchantData() {
    setLoading(true)
    try {
      // Fetch merchant
      const { data: merchantData, error: merchantError } = await supabase
        .from('merchants')
        .select('*')
        .eq('id', params.id)
        .single()

      if (merchantError) {
        console.error('Error fetching merchant:', merchantError)
        return
      }

      setMerchant(merchantData)

      // Fetch merchant status
      const { data: statusData } = await supabase
        .from('merchant_status')
        .select('*')
        .eq('merchant_id', params.id)
        .single()

      if (statusData) {
        setStatus(statusData)
      }

      // Fetch assessments
      const { data: assessmentData } = await supabase
        .from('growth_assessments')
        .select('*')
        .eq('merchant_id', params.id)
        .order('created_at', { ascending: false })

      if (assessmentData) {
        setAssessments(assessmentData)
      }

      // Fetch growth profiles
      const { data: profileData } = await supabase
        .from('growth_profiles')
        .select('*')
        .eq('merchant_id', params.id)
        .order('created_at', { ascending: false })

      if (profileData) {
        setProfiles(profileData)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (!merchant) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Merchant Not Found</h2>
        <p className="mt-2 text-[var(--text-secondary)]">The merchant you're looking for doesn't exist.</p>
        <Link href="/admin/merchants">
          <Button className="mt-6">Back to Merchants</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/admin/merchants" className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <SvgIcon name="chevron-left" size={20} />
            </Link>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {merchant.business_name || 'Merchant'}
            </h1>
            {status && <StatusBadge status={status.status} />}
          </div>
          <p className="text-[var(--text-secondary)]">{merchant.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/growth-profiles?merchant=${merchant.id}`}>
            <Button variant="secondary">
              <SvgIcon name="growth-profile" size={16} />
              View Profiles
            </Button>
          </Link>
          <Link href={`/admin/growth-assessments?merchant=${merchant.id}`}>
            <Button variant="secondary">
              <SvgIcon name="growth-readiness" size={16} />
              View Assessments
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Merchant Details */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Merchant Details</h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-[var(--text-muted)]">Business Name</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.business_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Contact Name</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.contact_name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Email</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Website</dt>
                <dd className="font-medium text-[var(--text-primary)]">
                  {merchant.website ? (
                    <a href={merchant.website} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] hover:underline">
                      {merchant.website}
                    </a>
                  ) : 'N/A'}
                </dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Industry</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.industry || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Country</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.country || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Business Stage</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.business_stage || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Store Age</dt>
                <dd className="font-medium text-[var(--text-primary)]">{merchant.store_age || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Joined</dt>
                <dd className="font-medium text-[var(--text-primary)]">{new Date(merchant.created_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-[var(--text-muted)]">Status</dt>
                <dd><StatusBadge status={status?.status || 'lead'} /></dd>
              </div>
            </dl>
          </div>

          {/* Assessments */}
          {assessments.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Assessments ({assessments.length})</h3>
              <div className="space-y-3">
                {assessments.map((assessment) => (
                  <div key={assessment.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        HGRI: {assessment.hgri_score || 'N/A'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <StatusBadge status={assessment.review_status || assessment.status || 'pending'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Growth Profiles */}
          {profiles.length > 0 && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Growth Profiles ({profiles.length})</h3>
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <div key={profile.id} className="flex items-center justify-between border-b border-[var(--border)] pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-[var(--text-primary)]">
                        {profile.title || 'Growth Profile'}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {profile.growth_classification} • {profile.hgri_score} points
                      </p>
                    </div>
                    <Link href={`/admin/growth-profiles/${profile.id}`}>
                      <Button size="sm">
                        <SvgIcon name="eye" size={14} color="white" />
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <Link href={`/admin/growth-assessments/new?merchant=${merchant.id}`}>
                <Button className="w-full">
                  <SvgIcon name="growth-readiness" size={16} color="white" />
                  New Assessment
                </Button>
              </Link>
              <Link href={`/admin/proposals/new?merchant=${merchant.id}`}>
                <Button variant="secondary" className="w-full">
                  <SvgIcon name="pricing" size={16} />
                  Create Proposal
                </Button>
              </Link>
              <Link href={`/admin/client-portal/${merchant.id}`}>
                <Button variant="secondary" className="w-full">
                  <SvgIcon name="portfolio" size={16} />
                  View Client Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}