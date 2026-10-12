// src/app/client-portal/page.tsx
//
// Client Portal Home (Phase 18.3).
//
// This page no longer queries Supabase from the browser. It reads one session-bound
// endpoint, /api/client-portal/dashboard, which resolves the client on the server and
// returns an allow-listed payload. The page only renders what it is given:
//   Greeting → Current priority → Needs your attention → Active work → Recent activity
//   → Growth Profile snapshot → Supporting information (files, deliverables, proposal).
//
// Nothing here is invented. There is no project stage tracker, milestone, "latest update"
// or messages feed because the backend has no such data.

'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, BarChart3, Check, Search, ShieldCheck, ShoppingCart, Repeat } from 'lucide-react'
import { HbeeModuleStandalone } from '@/components/site/module/HbeeModule'
import type { ActiveProject, ActivityItem, AttentionItem, CurrentPriority, GrowthSnapshot, PillarKey, ProposalCard } from '@/lib/client-portal/dashboard'
import styles from './dashboard.module.css'

interface DashboardData {
  client: { firstName: string | null; businessName: string | null }
  priority: CurrentPriority | null
  growth: { state: string; snapshot: GrowthSnapshot | null }
  attention: AttentionItem[]
  activeWork: { history: boolean; projects: ActiveProject[] }
  activity: ActivityItem[]
  files: Array<{ id: string; name: string | null; type: string | null; size: number | null; uploadedAt: string | null }>
  deliverables: Array<{ id: string; title: string | null; status: string | null; version: string | null; uploadedAt: string | null }>
  proposal: ProposalCard | null
  unavailable: string[]
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

const MODULE_ICON = { strokeWidth: 1.75, width: '100%', height: '100%' } as const
const PILLAR_ICONS: Record<PillarKey, ReactNode> = {
  visibility: <Search {...MODULE_ICON} />,
  conversion: <ShoppingCart {...MODULE_ICON} />,
  retention: <Repeat {...MODULE_ICON} />,
  authority: <ShieldCheck {...MODULE_ICON} />,
  scalability: <BarChart3 {...MODULE_ICON} />,
}

function greeting(date: Date): string {
  const h = date.getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

function fmtDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ago(value: string | null | undefined): string {
  if (!value) return ''
  const t = new Date(value).getTime()
  if (Number.isNaN(t)) return ''
  const mins = Math.round((Date.now() - t) / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.round(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return fmtDate(value) || ''
}

function money(total: number | null, currency: string | null): string | null {
  if (total === null) return null
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: currency || 'USD' }).format(total)
  } catch {
    return `${currency || 'USD'} ${total.toLocaleString()}`
  }
}

function size(bytes: number | null): string | null {
  if (bytes === null || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className={styles.eyebrow}>
      <span aria-hidden="true" className={styles.node} />
      {children}
    </p>
  )
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={styles.link}>
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  )
}

const GROWTH_STATE_COPY: Record<string, { text: string; href: string; cta: string }> = {
  under_review: {
    text: 'Your assessment is with our team. Your Growth Profile appears here once the review is complete.',
    href: '/client-portal/growth-profile',
    cta: 'View Growth Profile',
  },
  no_assessment: {
    text: 'Complete the Growth Readiness Assessment and we will prepare your Growth Profile.',
    href: '/growth-readiness',
    cta: 'Start assessment',
  },
}
const GROWTH_STATE_DEFAULT = {
  text: 'Your Growth Profile is not available to show here right now.',
  href: '/client-portal/growth-profile',
  cta: 'View Growth Profile',
}

export default function ClientPortalHome() {
  const [state, setState] = useState<LoadState>('loading')
  const [data, setData] = useState<DashboardData | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const res = await fetch('/api/client-portal/dashboard', { credentials: 'same-origin' })
      if (res.status === 409) {
        setState('ambiguous')
        return
      }
      if (!res.ok) {
        setState('error')
        return
      }
      setData((await res.json()) as DashboardData)
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (state === 'ambiguous') {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>Your sign-in is linked to more than one business record, so we have not shown your dashboard. Please contact us and we will sort it out.</p>
          <Link href="/contact" className={styles.secondary}>Contact Hbee Digitals</Link>
        </div>
      </div>
    )
  }

  if (state === 'error' || !data) {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>We could not load your dashboard. Please try again in a moment.</p>
          <button type="button" onClick={load} className={styles.secondary}>Try Again</button>
        </div>
      </div>
    )
  }

  const unavailable = new Set(data.unavailable)
  const attentionReadable = !unavailable.has('projects') && !unavailable.has('proposals')
  const snapshot = data.growth.snapshot
  const priority = data.priority
  const firstName = data.client.firstName
  const filesShown = data.files.length > 0
  const deliverablesShown = data.deliverables.length > 0
  const proposalShown = !!data.proposal
  const supportCols = [filesShown, deliverablesShown, proposalShown].filter(Boolean).length
  const growthCopy = GROWTH_STATE_COPY[data.growth.state] ?? GROWTH_STATE_DEFAULT

  return (
    <div className={styles.page}>
      {/* 1 — Client context */}
      <header className={styles.hello}>
        <Eyebrow>Client Portal</Eyebrow>
        <h1>
          {greeting(new Date())}
          {firstName ? (
            <>
              , <em>{firstName}.</em>
            </>
          ) : (
            '.'
          )}
        </h1>
        <p className={styles.lead}>Here&rsquo;s where your growth work currently stands.</p>
      </header>

      {data.unavailable.length > 0 && (
        <p className={styles.note} role="status">
          Some information could not be loaded just now, so parts of this page may be incomplete.
        </p>
      )}

      {/* 2 — Current priority (only from a released Growth Profile) */}
      {priority && (
        <section className={`${styles.panel} ${styles.priority}`} aria-labelledby="home-priority">
          <div>
            <Eyebrow>Current priority</Eyebrow>
            <h2 id="home-priority" className={styles.priorityHeading}>
              {priority.heading}
            </h2>
            <p className={styles.priorityBase}>Based on your latest Growth Profile.</p>
            <ArrowLink href="/client-portal/growth-profile">View Growth Profile</ArrowLink>
          </div>
          {priority.recommendation ? (
            <div className={styles.guidance}>
              <strong>From your recommendations</strong>
              {priority.recommendation}
            </div>
          ) : (
            <div />
          )}
          <div className={styles.priorityModule} aria-hidden="true">
            <HbeeModuleStandalone label={priority.label} icon={PILLAR_ICONS[priority.pillar]} signal width={70} />
          </div>
        </section>
      )}

      {/* 3–5 — Attention · Active work · Recent activity */}
      <div className={styles.grid}>
        <section className={`${styles.panel} ${styles.areaAttention}`} aria-labelledby="home-attention">
          <Eyebrow>Needs your attention</Eyebrow>
          <h2 id="home-attention" className="sr-only">
            Needs your attention
          </h2>
          {data.attention.length > 0 ? (
            <ul className={styles.attList}>
              {data.attention.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className={styles.att}>
                    <span className={styles.attTitle}>{a.title}</span>
                    <span className={styles.attContext}>{a.context}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : attentionReadable ? (
            <p className={styles.attOk}>
              <span aria-hidden="true">
                <Check strokeWidth={3} />
              </span>
              Nothing needs your attention right now.
            </p>
          ) : (
            <p className={styles.quiet}>We could not check this just now.</p>
          )}
        </section>

        <section className={`${styles.panel} ${styles.areaActive}`} aria-labelledby="home-active">
          <div className={styles.panelHead}>
            <Eyebrow>{data.activeWork.history && data.activeWork.projects.length > 0 ? 'Recent project' : 'Active work'}</Eyebrow>
            <ArrowLink href="/client-portal/projects">All projects</ArrowLink>
          </div>
          <h2 id="home-active" className="sr-only">
            Active work
          </h2>
          {data.activeWork.projects.length > 0 ? (
            <div className={styles.work}>
              {data.activeWork.projects.map((p) => (
                <article key={p.id} className={styles.project}>
                  <div className={styles.projectTop}>
                    <div>
                      <h3 className={styles.projectName}>{p.name}</h3>
                      {p.code && <p className={styles.projectCode}>{p.code}</p>}
                    </div>
                    <span className={styles.status}>{p.status}</span>
                  </div>
                  {p.progress === null ? (
                    <p className={styles.muted} style={{ marginTop: '0.875rem' }}>
                      Progress not set
                    </p>
                  ) : (
                    <div className={styles.progress}>
                      <div className={styles.progressRow}>
                        <span>Progress</span>
                        <b>{p.progress}%</b>
                      </div>
                      <div className={styles.bar} aria-hidden="true">
                        <span style={{ width: `${p.progress}%` }} />
                      </div>
                    </div>
                  )}
                  {p.description && <p className={styles.desc}>{p.description}</p>}
                  {(fmtDate(p.startDate) || fmtDate(p.expectedCompletion)) && (
                    <dl className={styles.dates}>
                      {fmtDate(p.startDate) && (
                        <div>
                          <dt>Started</dt>
                          <dd>{fmtDate(p.startDate)}</dd>
                        </div>
                      )}
                      {fmtDate(p.expectedCompletion) && (
                        <div>
                          <dt>Expected completion</dt>
                          <dd>{fmtDate(p.expectedCompletion)}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <ArrowLink href={`/client-portal/projects/${p.id}`}>Open project</ArrowLink>
                </article>
              ))}
            </div>
          ) : unavailable.has('projects') ? (
            <p className={styles.quiet}>We could not load your projects just now.</p>
          ) : (
            <p className={styles.quiet}>No active projects right now. When Hbee starts work with you, it will appear here.</p>
          )}
          {data.activeWork.history && data.activeWork.projects.length > 0 && (
            <p className={styles.histNote}>There is no active project at the moment — this is your most recent completed one.</p>
          )}
        </section>

        <section className={`${styles.panel} ${styles.areaActivity}`} aria-labelledby="home-activity">
          <Eyebrow>Recent activity</Eyebrow>
          <h2 id="home-activity" className="sr-only">
            Recent activity
          </h2>
          {data.activity.length > 0 ? (
            <ul className={styles.feed}>
              {data.activity.map((a, i) => {
                const inner = (
                  <>
                    <span className={styles.feedTitle}>{a.title}</span>
                    <span className={styles.feedMeta}>{[a.context, ago(a.at)].filter(Boolean).join(' · ')}</span>
                  </>
                )
                return (
                  <li key={i}>
                    {a.href ? (
                      <Link href={a.href} className={styles.feedItem}>
                        {inner}
                      </Link>
                    ) : (
                      <div className={styles.feedItem}>{inner}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          ) : (
            <p className={styles.quiet}>Updates will appear here as your work progresses.</p>
          )}
        </section>
      </div>

      {/* 6 — Growth Profile snapshot */}
      <section className={`${styles.panel} ${styles.snap}`} aria-labelledby="home-growth">
        {snapshot ? (
          <>
            <div>
              <Eyebrow>Growth Profile snapshot</Eyebrow>
              <h2 id="home-growth" className="sr-only">
                Growth Profile snapshot
              </h2>
              {snapshot.score !== null && (
                <p className={styles.snapScore} style={{ marginTop: '0.75rem' }}>
                  <b>{snapshot.score}</b>
                  <span>/ 100</span>
                </p>
              )}
              {snapshot.classification && <p className={styles.snapClass}>{snapshot.classification}</p>}
            </div>
            {snapshot.pillars.length > 0 ? (
              <ul className={styles.miniPillars}>
                {snapshot.pillars.map((p) => (
                  <li key={p.key} className={`${styles.mini} ${snapshot.lowestKey === p.key ? styles.miniLow : ''}`}>
                    <div className={styles.miniTop}>
                      <span>{p.label}</span>
                      <b>{p.value}</b>
                    </div>
                    <div className={styles.bar} aria-hidden="true">
                      <span style={{ width: `${Math.max(0, Math.min(100, p.value))}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div />
            )}
            <ArrowLink href="/client-portal/growth-profile">View full Growth Profile</ArrowLink>
          </>
        ) : (
          <>
            <div>
              <Eyebrow>Growth Profile</Eyebrow>
              <h2 id="home-growth" className="sr-only">
                Growth Profile
              </h2>
              <p className={styles.quiet} style={{ marginTop: '0.75rem' }}>
                {growthCopy.text}
              </p>
            </div>
            <div />
            <ArrowLink href={growthCopy.href}>{growthCopy.cta}</ArrowLink>
          </>
        )}
      </section>

      {/* 7 — Supporting information: latest files · deliverables · open proposal */}
      {supportCols > 0 && (
        <div className={styles.support} style={{ ['--cols' as string]: Math.min(supportCols, 3) }}>
          {filesShown && (
            <section className={styles.panel} aria-labelledby="home-files">
              <div className={styles.panelHead}>
                <Eyebrow>Latest files</Eyebrow>
                <ArrowLink href="/client-portal/files">View all</ArrowLink>
              </div>
              <h2 id="home-files" className="sr-only">
                Latest files
              </h2>
              <ul className={styles.rows}>
                {data.files.map((f) => (
                  <li key={f.id} className={styles.row}>
                    <span className={styles.rowMain}>
                      {f.name || 'Untitled file'}
                      {(f.type || size(f.size)) && <span className={styles.rowSub}>{[f.type, size(f.size)].filter(Boolean).join(' · ')}</span>}
                    </span>
                    <span className={styles.rowEnd}>{ago(f.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {deliverablesShown && (
            <section className={styles.panel} aria-labelledby="home-deliverables">
              <div className={styles.panelHead}>
                <Eyebrow>Deliverables</Eyebrow>
                <ArrowLink href="/client-portal/files">View all</ArrowLink>
              </div>
              <h2 id="home-deliverables" className="sr-only">
                Deliverables
              </h2>
              <ul className={styles.rows}>
                {data.deliverables.map((d) => (
                  <li key={d.id} className={styles.row}>
                    <span className={styles.rowMain}>
                      {d.title || 'Deliverable'}
                      {(d.status || d.version) && <span className={styles.rowSub}>{[d.status, d.version && `Version ${d.version}`].filter(Boolean).join(' · ')}</span>}
                    </span>
                    <span className={styles.rowEnd}>{ago(d.uploadedAt)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {data.proposal && (
            <section className={styles.panel} aria-labelledby="home-proposal">
              <Eyebrow>Open proposal</Eyebrow>
              <h2 id="home-proposal" className={styles.title}>
                {data.proposal.title}
              </h2>
              {money(data.proposal.total, data.proposal.currency) && <p className={styles.price}>{money(data.proposal.total, data.proposal.currency)}</p>}
              <p className={styles.quiet} style={{ marginTop: '0.5rem' }}>
                {[fmtDate(data.proposal.sentAt) && `Sent ${fmtDate(data.proposal.sentAt)}`, fmtDate(data.proposal.expiresAt) && `Valid until ${fmtDate(data.proposal.expiresAt)}`]
                  .filter(Boolean)
                  .join(' · ') || 'Awaiting your response'}
              </p>
              <Link href={`/client-portal/proposals/${data.proposal.id}`} className={styles.primary}>
                Review proposal
              </Link>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
