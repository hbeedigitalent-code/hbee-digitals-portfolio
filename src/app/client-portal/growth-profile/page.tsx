// src/app/client-portal/growth-profile/page.tsx
//
// The client's Growth Profile.
//
// This page no longer touches Supabase. It previously resolved the merchant in
// the browser by trying, in order: merchants.email = user.email,
// merchant_accounts.email = user.email, clients.merchant_id, and finally
// `user.user_metadata.merchant_id` — a field the user can write themselves.
// All four are gone. The page now reads only
// /api/client-portal/growth-profile, which derives clients.id from the verified
// session, follows the stored merchant link, and returns an allow-listed,
// merchant-safe payload.
//
// The route decides visibility; this page only renders the state it is given,
// so no access rule lives in the browser.
//
// Phase 18.2 changed presentation and information hierarchy only. Everything
// shown is a real field from that payload, or is derived from those fields
// (the lowest pillar). Nothing is invented.

'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { BarChart3, Check, Download, Search, ShoppingCart } from 'lucide-react'
import SvgIcon from '@/components/ui/SvgIcon'
import { HbeeModuleStandalone } from '@/components/site/module/HbeeModule'
import styles from './growth-profile.module.css'

type ProfileState =
  | 'loading'
  | 'ready'
  | 'not_connected'
  | 'no_assessment'
  | 'under_review'
  | 'not_available'
  | 'ambiguous'
  | 'inconsistent'
  | 'error'

interface ClientGrowthProfile {
  id: string
  title: string | null
  summary: string | null
  hgri_score: number | null
  growth_classification: string | null
  pillars: Record<string, number> | null
  recommendations: string[]
  strengths: string[]
  opportunities: string[]
  created_at: string
  pdf_url: string | null
}

/** Canonical order — the API only ever returns these five keys. */
const PILLAR_ORDER = ['visibility', 'conversion', 'retention', 'authority', 'scalability'] as const
const PILLAR_LABELS: Record<string, string> = {
  visibility: 'Visibility',
  conversion: 'Conversion',
  retention: 'Retention',
  authority: 'Authority',
  scalability: 'Scalability',
}

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%' } as const

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, n))
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className={styles.eyebrow}>
      <span aria-hidden="true" className={styles.node} />
      {children}
    </p>
  )
}

/** Shared shell for every non-ready state. Copy and actions are unchanged from before. */
function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: string
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className={`${styles.panel} ${styles.state}`}>
      <span className={styles.stateIcon}>
        <SvgIcon name={icon} size={28} color="var(--hb-blue)" />
      </span>
      <h2 className={styles.stateTitle}>{title}</h2>
      <div className={styles.stateBody}>{children}</div>
      {action && <div className={styles.stateActions}>{action}</div>}
    </div>
  )
}

export default function GrowthProfilePage() {
  const [state, setState] = useState<ProfileState>('loading')
  const [profile, setProfile] = useState<ClientGrowthProfile | null>(null)

  const fetchProfile = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/growth-profile', {
        credentials: 'same-origin',
      })
      const payload = await response.json().catch(() => null)

      if (response.status === 409) {
        // Ambiguous ownership or inconsistent records. Both withhold content.
        setState(payload?.state === 'inconsistent' ? 'inconsistent' : 'ambiguous')
        return
      }

      if (!response.ok) {
        setState('error')
        return
      }

      if (payload?.state === 'ready' && payload?.profile) {
        setProfile(payload.profile as ClientGrowthProfile)
        setState('ready')
        return
      }

      const known: ProfileState[] = [
        'not_connected',
        'no_assessment',
        'under_review',
        'not_available',
      ]
      setState(known.includes(payload?.state) ? payload.state : 'error')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  if (state === 'loading') {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner} />
      </div>
    )
  }

  // The account exists but carries no merchant link. Deliberately offers a
  // contact route and nothing else: no candidate merchants are shown, and there
  // is no self-service "link me by email" action.
  if (state === 'not_connected') {
    return (
      <EmptyState
        icon="growth-profile"
        title="Your Growth Profile is not connected yet"
        action={
          <>
            <Link href="/contact" className={styles.primary}>
              Contact Hbee Digitals
            </Link>
            <Link href="/client-portal" className={styles.secondary}>
              Back to Dashboard
            </Link>
          </>
        }
      >
        <p>
          This portal account is not yet connected to your business record, so we
          cannot show a Growth Profile here.
        </p>
        <p>
          Get in touch and we will connect it for you. If you have completed the
          Growth Readiness Assessment, mention the email address you used.
        </p>
      </EmptyState>
    )
  }

  if (state === 'ambiguous') {
    return (
      <EmptyState
        icon="warning"
        title="We need to check your account"
        action={
          <Link href="/contact" className={styles.primary}>
            Contact Hbee Digitals
          </Link>
        }
      >
        <p>
          Your sign-in is linked to more than one business record, so we have not
          shown a profile rather than risk showing the wrong one. Please contact us
          and we will sort it out.
        </p>
      </EmptyState>
    )
  }

  // Records disagree with each other (profile not bound to the approving
  // assessment, wrong merchant, or more than one active profile). A genuine
  // error state, deliberately not an empty "nothing here" page.
  if (state === 'inconsistent') {
    return (
      <EmptyState
        icon="warning"
        title="We need to check your Growth Profile"
        action={
          <Link href="/contact" className={styles.primary}>
            Contact Hbee Digitals
          </Link>
        }
      >
        <p>
          Your records need a quick check before we can show your profile, so we
          have not displayed anything rather than risk showing the wrong
          information. Please contact us and we will resolve it.
        </p>
      </EmptyState>
    )
  }

  if (state === 'no_assessment') {
    return (
      <EmptyState
        icon="growth-readiness"
        title="Complete your assessment"
        action={
          <Link href="/growth-readiness" className={styles.primary}>
            Start Assessment
          </Link>
        }
      >
        <p>
          Complete the Hbee Growth Readiness Assessment and we will review your
          business, identify your priorities, and prepare your Growth Profile.
        </p>
      </EmptyState>
    )
  }

  if (state === 'under_review') {
    return (
      <EmptyState
        icon="clock"
        title="Your assessment is with our team"
        action={
          <Link href="/client-portal" className={styles.secondary}>
            Back to Dashboard
          </Link>
        }
      >
        <p>
          We have your assessment and are reviewing your business. Your Growth
          Profile appears here once the review is complete and your place in the
          initiative is confirmed. We will email you either way.
        </p>
      </EmptyState>
    )
  }

  if (state === 'not_available') {
    return (
      <EmptyState
        icon="growth-profile"
        title="No Growth Profile available"
        action={
          <Link href="/contact" className={styles.secondary}>
            Contact Hbee Digitals
          </Link>
        }
      >
        <p>
          There is no Growth Profile available for this account at the moment. If
          you think that is wrong, please get in touch.
        </p>
      </EmptyState>
    )
  }

  if (state === 'error' || !profile) {
    return (
      <EmptyState
        icon="warning"
        title="Something went wrong"
        action={
          <>
            <button type="button" onClick={fetchProfile} className={styles.primary}>
              Try Again
            </button>
            <Link href="/client-portal" className={styles.secondary}>
              Back to Dashboard
            </Link>
          </>
        }
      >
        <p>We could not load your Growth Profile. Please try again in a moment.</p>
      </EmptyState>
    )
  }

  // ── Ready ───────────────────────────────────────────────────────
  const classification = profile.growth_classification
  const score = profile.hgri_score

  const pillars = PILLAR_ORDER.filter((k) => typeof profile.pillars?.[k] === 'number').map((k) => ({
    key: k,
    label: PILLAR_LABELS[k],
    value: profile.pillars![k] as number,
  }))

  // The constraint is the lowest of the real pillar scores — nothing more. It needs at
  // least two pillars to compare, and it is not named when every pillar is equal.
  let lowest: (typeof pillars)[number] | null = null
  if (pillars.length >= 2) {
    const min = Math.min(...pillars.map((p) => p.value))
    const max = Math.max(...pillars.map((p) => p.value))
    if (min < max) lowest = pillars.find((p) => p.value === min) ?? null
  }

  // "What should move next": recommendations when present, otherwise opportunities as the
  // fallback. The API ties neither to a pillar, so nothing here is shown as pillar-specific.
  const nextItems = profile.recommendations.length > 0 ? profile.recommendations : profile.opportunities

  const columns =
    (profile.strengths.length > 0 ? 1 : 0) + (lowest ? 1 : 0) + (nextItems.length > 0 ? 1 : 0)

  const prepared = new Date(profile.created_at)
  const preparedLabel = Number.isNaN(prepared.getTime())
    ? null
    : prepared.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })

  return (
    <div className={styles.page}>
      {/* 1 — Context / hero */}
      <header className={styles.hero}>
        <div>
          <Eyebrow>Growth Profile</Eyebrow>
          <h1 className={styles.heroTitle}>
            A clear view of where your business <em>can grow.</em>
          </h1>
          <p className={styles.heroLead}>
            Here&rsquo;s Hbee&rsquo;s reviewed understanding of your business, where growth is
            constrained, and what should move next.
          </p>
          {(preparedLabel || profile.pdf_url) && (
            <div className={styles.heroMeta}>
              {preparedLabel && <span>Prepared {preparedLabel}</span>}
              {profile.pdf_url && (
                <a href={profile.pdf_url} target="_blank" rel="noopener noreferrer" className={styles.pdf}>
                  <Download aria-hidden="true" width={16} height={16} />
                  Download PDF
                </a>
              )}
            </div>
          )}
        </div>

        <div className={styles.cluster} aria-hidden="true">
          <div className={`${styles.clusterItem} ${styles.clusterA}`}>
            <HbeeModuleStandalone label="Visibility" icon={<Search {...ICON} />} sweep="br" width={64} />
          </div>
          <div className={`${styles.clusterItem} ${styles.clusterB}`}>
            <HbeeModuleStandalone label="Conversion" icon={<ShoppingCart {...ICON} />} sweep="tr" width={64} />
          </div>
          <div className={`${styles.clusterItem} ${styles.clusterC}`}>
            <HbeeModuleStandalone label="Scalability" icon={<BarChart3 {...ICON} />} sweep="br" width={64} />
          </div>
        </div>
      </header>

      {/* 2 — Overall readiness */}
      <section className={`${styles.panel} ${styles.panelPad} ${styles.readiness}`} aria-labelledby="gp-readiness">
        <div>
          <Eyebrow>Overall assessment</Eyebrow>
          <h2 id="gp-readiness" className={styles.classification}>
            {classification || profile.title || 'Your Growth Profile'}
          </h2>
          {profile.summary && <p className={styles.summary}>{profile.summary}</p>}
        </div>
        <div className={styles.scoreBlock}>
          <p className={styles.scoreLabel}>Overall score (HGRI&trade;)</p>
          <p className={styles.score}>
            <span className={styles.scoreValue}>{score ?? '—'}</span>
            {score !== null && <span className={styles.scoreMax}>/ 100</span>}
          </p>
          {score !== null && (
            <div className={styles.scoreBar} aria-hidden="true">
              <span style={{ width: `${clampPct(score)}%` }} />
            </div>
          )}
        </div>
      </section>

      {/* 3 — Five diagnostic pillars */}
      {pillars.length > 0 && (
        <section aria-labelledby="gp-pillars">
          <Eyebrow>Diagnostic pillars</Eyebrow>
          <h2 id="gp-pillars" className="sr-only">
            Diagnostic pillars
          </h2>
          <ul className={styles.pillars} style={{ listStyle: 'none', padding: 0, marginBottom: 0 }}>
            {pillars.map((p) => {
              const isLow = lowest?.key === p.key
              return (
                <li key={p.key} className={`${styles.pillar} ${isLow ? styles.pillarLow : ''}`}>
                  <div className={styles.pillarTop}>
                    <span className={styles.pillarName}>{p.label}</span>
                    <span className={styles.pillarScore}>
                      {p.value}
                      <small>/100</small>
                    </span>
                  </div>
                  <div className={styles.bar} aria-hidden="true">
                    <span style={{ width: `${clampPct(p.value)}%` }} />
                  </div>
                  {isLow && <p className={styles.pillarTag}>Lowest pillar</p>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* 4–6 — What we see · Main constraint · What should move next */}
      {columns > 0 && (
        <div className={`${styles.panel} ${styles.columns} ${columns === 2 ? styles.two : ''}`}>
          {profile.strengths.length > 0 && (
            <section className={styles.col} aria-labelledby="gp-see">
              <Eyebrow>Key insights</Eyebrow>
              <h2 id="gp-see" className={styles.sectionTitle}>
                What we see
              </h2>
              <ul className={styles.checks}>
                {profile.strengths.map((item, i) => (
                  <li key={i}>
                    <span className={styles.tick} aria-hidden="true">
                      <Check strokeWidth={3} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {lowest && (
            <section className={styles.col} aria-labelledby="gp-constraint">
              <Eyebrow>Main constraint</Eyebrow>
              <h2 id="gp-constraint" className={styles.constraintTitle}>
                {lowest.label} constraint
              </h2>
              <p className={styles.constraintLabel}>
                {lowest.label} · {lowest.value}/100
              </p>
              <p className={styles.constraintText}>
                {lowest.label} is the lowest of your pillar scores in this review.
              </p>
            </section>
          )}

          {nextItems.length > 0 && (
            <section className={styles.col} aria-labelledby="gp-next-priorities">
              <Eyebrow>Top priorities</Eyebrow>
              <h2 id="gp-next-priorities" className={styles.sectionTitle}>
                What should move next
              </h2>
              <ol className={styles.steps}>
                {nextItems.map((item, i) => (
                  <li key={i} className={i >= 3 ? styles.later : undefined}>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}
        </div>
      )}

      {/* 7 — Next step */}
      <section className={`${styles.panel} ${styles.panelPad} ${styles.next}`} aria-labelledby="gp-next">
        <div>
          <Eyebrow>Next step</Eyebrow>
          <h2 id="gp-next" className={styles.sectionTitle}>
            Where attention is needed most
          </h2>
          <p className={styles.nextText}>
            Your Growth Profile shows where attention is needed most. If you want Hbee to help
            implement one of these priorities, you can start a conversation about the appropriate
            scope.
          </p>
        </div>
        <div className={styles.actions}>
          <Link href="/contact" className={styles.primary}>
            Contact Hbee
          </Link>
          <Link href="/client-portal/proposals" className={styles.secondary}>
            View proposals
          </Link>
        </div>
      </section>
    </div>
  )
}
