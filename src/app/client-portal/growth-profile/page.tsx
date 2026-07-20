// src/app/client-portal/growth-profile/page.tsx

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@/lib/supabase-client'
import { GrowthProfileService } from '@/lib/services/growth-profile-service'
import { MerchantLifecycleService } from '@/lib/services/merchant-lifecycle'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

export default function GrowthProfilePage() {
  const router = useRouter()
  const supabase = createClientComponentClient()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [merchantId, setMerchantId] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasAssessment, setHasAssessment] = useState(false)

  useEffect(() => {
    async function fetchData() {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/client-login')
          return
        }

        // ============================================================
        // FIX: Robust client profile lookup with fallback
        // ============================================================
        let merchantId = null
        let clientId = null

        // First try to get client by user_id
        const { data: client, error: clientError } = await supabase
          .from('clients')
          .select('merchant_id, id')
          .eq('user_id', user.id)
          .single()

        if (clientError && clientError.code !== 'PGRST116') {
          console.error('Error fetching client:', clientError)
          setError('Could not find your client profile. Please contact support.')
          setLoading(false)
          return
        }

        if (client) {
          merchantId = client.merchant_id
          clientId = client.id
          console.log('✅ Client found:', client)
        } else {
          // If no client found, try to find merchant by email
          console.log('⚠️ No client found, looking up merchant by email...')
          
          const { data: merchant, error: merchantError } = await supabase
            .from('merchants')
            .select('id, business_name')
            .eq('email', user.email)
            .single()

          if (merchantError && merchantError.code !== 'PGRST116') {
            console.error('Error fetching merchant:', merchantError)
          }

          if (merchant) {
            merchantId = merchant.id
            console.log('✅ Merchant found by email:', merchant)

            // Create client record if it doesn't exist
            const { data: newClient, error: createError } = await supabase
              .from('clients')
              .insert({
                user_id: user.id,
                merchant_id: merchant.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Client',
                email: user.email,
                business_name: merchant.business_name || 'My Business',
                status: 'active'
              })
              .select()
              .single()

            if (createError) {
              console.error('Error creating client:', createError)
            } else {
              clientId = newClient.id
              console.log('✅ Client created:', newClient)
            }
          } else {
            // No merchant found by email either - try checking merchant_accounts
            console.log('⚠️ No merchant found by email, checking merchant_accounts...')
            
            const { data: merchantAccount } = await supabase
              .from('merchant_accounts')
              .select('id')
              .eq('email', user.email)
              .single()

            if (merchantAccount) {
              merchantId = merchantAccount.id
              console.log('✅ Merchant found in merchant_accounts:', merchantAccount)
            }
          }
        }

        if (!merchantId) {
          console.error('❌ Could not find merchant_id for user:', user.email)
          setError('Could not find your merchant profile. Please contact support.')
          setLoading(false)
          return
        }

        setMerchantId(merchantId)

        // Check if merchant has an assessment
        const { data: assessment, error: assessmentError } = await supabase
          .from('growth_assessments')
          .select('id, status')
          .eq('merchant_id', merchantId)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (assessmentError && assessmentError.code !== 'PGRST116') {
          console.error('Error checking assessment:', assessmentError)
        }

        if (assessment) {
          setHasAssessment(true)
        }

        // Get growth profile
        const profileData = await GrowthProfileService.getProfileByMerchant(merchantId)

        if (profileData) {
          setProfile(profileData)
          // Get PDF URL if exists
          const pdf = await GrowthProfileService.getProfilePDFUrl(profileData.id)
          if (pdf) setPdfUrl(pdf)
        }

        setLoading(false)
      } catch (err) {
        console.error('Error fetching growth profile:', err)
        setError('An error occurred while loading your profile.')
        setLoading(false)
      }
    }

    fetchData()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="warning" size={48} color="var(--text-muted)" />
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">Something went wrong</h2>
        <p className="mt-2 text-[var(--text-secondary)]">{error}</p>
        <Link href="/client-portal">
          <Button className="mt-6">Return to Dashboard</Button>
        </Link>
      </div>
    )
  }

  // No assessment found
  if (!hasAssessment) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <SvgIcon name="growth-readiness" size={64} color="var(--text-muted)" />
        <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Complete Your Assessment</h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">
          Take our Growth Readiness Assessment to get your personalized Growth Profile with your HGRI™ score and actionable recommendations.
        </p>
        <Link href="/growth-readiness">
          <Button className="mt-6">
            <SvgIcon name="arrow-right" size={16} color="white" />
            Start Assessment
          </Button>
        </Link>
      </div>
    )
  }

  // Assessment submitted but no profile yet
  if (!profile) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="relative">
          <div className="h-16 w-16 animate-pulse rounded-full bg-[var(--accent)]/20 flex items-center justify-center">
            <SvgIcon name="growth-readiness" size={32} color="var(--accent)" />
          </div>
          <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-yellow-400 flex items-center justify-center">
            <span className="text-xs">⏳</span>
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold text-[var(--text-primary)]">Your Profile is Being Reviewed</h2>
        <p className="mt-2 max-w-md text-[var(--text-secondary)]">
          Thank you for completing the Growth Readiness Assessment. Our team is reviewing your responses and will prepare your personalized Growth Profile within 48 hours.
        </p>
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
          <SvgIcon name="clock" size={16} color="var(--text-muted)" />
          <span>Estimated wait time: 24-48 hours</span>
        </div>
        <Link href="/client-portal">
          <Button variant="secondary" className="mt-6">
            Return to Dashboard
          </Button>
        </Link>
      </div>
    )
  }

  // Profile exists - display it
  const classificationEmojis: Record<string, string> = {
    'Foundation': '🏗️',
    'Foundation Stage': '🏗️',
    'Growth Potential': '🌱',
    'Growth Ready': '🚀',
    'Scale Ready': '🌍'
  }

  const classificationColors: Record<string, string> = {
    'Foundation': 'border-blue-500/30 bg-blue-500/10',
    'Foundation Stage': 'border-blue-500/30 bg-blue-500/10',
    'Growth Potential': 'border-yellow-500/30 bg-yellow-500/10',
    'Growth Ready': 'border-green-500/30 bg-green-500/10',
    'Scale Ready': 'border-purple-500/30 bg-purple-500/10'
  }

  const classificationTextColors: Record<string, string> = {
    'Foundation': 'text-blue-500',
    'Foundation Stage': 'text-blue-500',
    'Growth Potential': 'text-yellow-500',
    'Growth Ready': 'text-green-500',
    'Scale Ready': 'text-purple-500'
  }

  const classification = profile.growth_classification || 'Foundation Stage'
  const emoji = classificationEmojis[classification] || '📈'
  const colorClass = classificationColors[classification] || 'border-gray-500/30 bg-gray-500/10'
  const textColor = classificationTextColors[classification] || 'text-gray-500'

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Your Growth Profile</h1>
          <p className="text-[var(--text-secondary)]">
            View your Growth Readiness Index and personalized insights
          </p>
        </div>
        {pdfUrl && (
          <a
            href={pdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--bg-section)] hover:scale-[1.02]"
          >
            <SvgIcon name="download" size={16} color="var(--accent)" />
            Download PDF
          </a>
        )}
      </div>

      {/* HGRI Score Card */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          {/* Score */}
          <div className="flex flex-shrink-0 flex-col items-center">
            <div className="text-5xl font-bold text-[var(--text-primary)]">
              {profile.hgri_score || 0}
            </div>
            <div className="mt-1 text-sm text-[var(--text-muted)]">HGRI™ Score</div>
          </div>

          {/* Divider */}
          <div className="hidden h-16 w-px bg-[var(--border)] md:block" />

          {/* Classification */}
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{emoji}</span>
              <div>
                <span className={`inline-flex rounded-full border px-3 py-1 text-sm font-semibold ${colorClass} ${textColor}`}>
                  {classification}
                </span>
              </div>
            </div>
            <p className="mt-2 text-[var(--text-secondary)]">{profile.summary}</p>
          </div>
        </div>
      </div>

      {/* Pillar Scores */}
      {profile.profile_data?.scores?.pillars && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h3 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Growth Pillars</h3>
          <div className="space-y-4">
            {Object.entries(profile.profile_data.scores.pillars).map(([pillar, score]: [string, any]) => {
              const pillarLabels: Record<string, string> = {
                visibility: 'Visibility',
                conversion: 'Conversion',
                retention: 'Retention',
                authority: 'Authority',
                scalability: 'Scalability'
              }
              const label = pillarLabels[pillar] || pillar.charAt(0).toUpperCase() + pillar.slice(1)
              const scoreValue = typeof score === 'number' ? score : score?.score || 0

              return (
                <div key={pillar}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-[var(--text-secondary)]">{label}</span>
                    <span className="text-sm font-semibold text-[var(--text-primary)]">{scoreValue}/100</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
                    <div
                      className="h-full rounded-full bg-[var(--accent)] transition-all duration-500"
                      style={{ width: `${Math.min(scoreValue, 100)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Strengths & Opportunities */}
      <div className="grid gap-6 md:grid-cols-2">
        {profile.strengths && profile.strengths.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2">
              <SvgIcon name="check" size={20} color="#22C55E" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Strengths</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {profile.strengths.map((strength: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1 text-green-500">•</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {profile.opportunities && profile.opportunities.length > 0 && (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <div className="flex items-center gap-2">
              <SvgIcon name="growth" size={20} color="#F97316" />
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Opportunities</h3>
            </div>
            <ul className="mt-3 space-y-2">
              {profile.opportunities.map((opportunity: string, index: number) => (
                <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-secondary)]">
                  <span className="mt-1 text-[var(--accent)]">•</span>
                  {opportunity}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Recommendations */}
      {profile.profile_data?.recommendations && profile.profile_data.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center gap-2">
            <SvgIcon name="strategy" size={20} color="#3B82F6" />
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">Growth Recommendations</h3>
          </div>
          <ul className="mt-3 space-y-3">
            {profile.profile_data.recommendations.map((rec: string, index: number) => (
              <li key={index} className="flex items-start gap-3 text-sm text-[var(--text-secondary)]">
                <span className="mt-1 flex-shrink-0 text-[var(--accent)]">{index + 1}.</span>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Steps */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Next Steps</h3>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Ready to take your business to the next level? Here's what you can do next:
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/client-portal/project-request">
            <Button>
              <SvgIcon name="proposals" size={16} color="white" />
              Request Proposal
            </Button>
          </Link>
          <Link href="/contact">
            <Button variant="secondary">
              <SvgIcon name="chat" size={16} />
              Schedule Consultation
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}