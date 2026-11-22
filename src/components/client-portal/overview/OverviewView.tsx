import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Check } from 'lucide-react'
import { cn } from '@/lib/cn'
import { HbeeModuleStandalone } from '@/components/site/module/HbeeModule'
import surfaceStyles from '@/components/site/module/hbee-surface.module.css'
import EmptyState from '@/components/client-portal/EmptyState'
import { PORTAL_NAV_ICONS } from '@/components/client-portal/portal-icons'
import { PortalStatus, PortalToneMark } from '@/components/client-portal/PortalStatus'
import { PortalSurface, portalSurfaceClass } from '@/components/client-portal/PortalSurface'
import prim from '@/components/client-portal/portal-primitives.module.css'
import {
  activityRows,
  attentionRows,
  documentChips,
  engagementOf,
  greeting,
  nextStep,
  projectTone,
  workspaceTiles,
  type DashboardData,
} from '@/lib/client-portal/overview-model'
import styles from './overview.module.css'

/**
 * The Client Portal Overview, as a pure view of the dashboard payload (no fetching here: client-portal/page.tsx loads it).
 *
 *   1 Welcome            compact: greeting and business. No decorative art.
 *   2 Current Engagement Royal Blue Hbee surface: the primary project, status, progress, what happens next, the open proposal / invoice as
 *                        document chips, and ONE primary action.
 *   3 Needs your attention  content-sized; at most three ruled rows; calm "All clear".
 *   4 Your workspace     six tiles, one distinct icon each, status words (never counts).
 *   5 Recent activity    the connection-line feed, under an open-channel rule; and the Growth snapshot on the soft surface.
 *
 * The only 3D module on the page is the first-run render when there is no project yet. Everything is derived from existing data
 * (overview-model.ts); nothing here changes behaviour.
 */

function Eyebrow({ children, onBlue = false }: { children: ReactNode; onBlue?: boolean }) {
  return (
    <p className={cn(prim.eyebrow, onBlue && prim.onBlue)}>
      <span aria-hidden="true" className={prim.node} />
      {children}
    </p>
  )
}

function ArrowLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className={prim.link}>
      {children}
      <ArrowRight aria-hidden="true" />
    </Link>
  )
}

const GROWTH_STATE_COPY: Record<string, { text: string; href: string; cta: string }> = {
  not_connected: { text: 'Your portal account is not connected to a Growth Profile yet.', href: '/client-portal/growth-profile', cta: 'View Growth Profile' },
  under_review: { text: 'Your assessment is with our team. Your Growth Profile appears here once the review is complete.', href: '/client-portal/growth-profile', cta: 'View Growth Profile' },
  no_assessment: { text: 'Complete the Growth Review and we will prepare your Growth Profile.', href: '/growth-review', cta: 'Start the Growth Review' },
}
const GROWTH_STATE_DEFAULT = { text: 'Your Growth Profile is not available to show here right now.', href: '/client-portal/growth-profile', cta: 'View Growth Profile' }

export function OverviewView({ data, now = new Date() }: { data: DashboardData; now?: Date }) {
  const unavailable = new Set(data.unavailable)
  const attentionReadable = !unavailable.has('projects') && !unavailable.has('proposals') && !unavailable.has('invoices')
  const firstName = data.client.firstName
  const business = data.client.businessName
  const engagement = engagementOf(data)
  const project = engagement.project
  const chips = documentChips(data)
  const rows = attentionRows(data.attention)
  const tiles = workspaceTiles(data)
  const activity = activityRows(data.activity, now.getTime())
  const snapshot = data.growth.snapshot
  const priority = data.priority
  const growthCopy = GROWTH_STATE_COPY[data.growth.state] ?? GROWTH_STATE_DEFAULT
  const step = project ? nextStep(project.status) : null

  return (
    <div className={styles.page}>
      {/* 1 — Welcome */}
      <header className={styles.hello}>
        <Eyebrow>Client Portal</Eyebrow>
        <h1>
          {greeting(now)}
          {firstName ? (
            <>
              , <em>{firstName}.</em>
            </>
          ) : (
            '.'
          )}
        </h1>
        <p className={styles.lead}>
          {business ? (
            <>
              <b>{business}</b> &middot;{' '}
            </>
          ) : null}
          Here&rsquo;s where your growth work currently stands.
        </p>
      </header>

      {data.unavailable.length > 0 && (
        <p className={styles.note} role="status">
          Some information could not be loaded just now, so parts of this page may be incomplete.
        </p>
      )}

      <div className={styles.top}>
        {/* 2 — Current Engagement */}
        {project ? (
          <PortalSurface as="section" variant="blue" className={styles.engagement} aria-labelledby="home-engagement">
            <Eyebrow onBlue>{engagement.history ? 'Most recent project' : 'Current engagement'}</Eyebrow>
            <h2 id="home-engagement" className={styles.engName}>
              {project.name}
            </h2>
            {project.code && <p className={styles.engRef}>{project.code}</p>}
            <div className={styles.engStatus}>
              <PortalStatus tone={projectTone(project.status)} onBlue>
                {project.status}
              </PortalStatus>
            </div>

            {project.progress === null ? (
              <p className={styles.engNote}>Progress not set</p>
            ) : (
              <div className={styles.engProgress}>
                <div className={styles.engProgressRow}>
                  <span>Progress</span>
                  <b>{project.progress}%</b>
                </div>
                <div className={cn(prim.bar, prim.barOnBlue)} aria-hidden="true">
                  <span style={{ width: `${Math.max(0, Math.min(100, project.progress))}%` }} />
                </div>
              </div>
            )}

            {step && (
              <p className={styles.engNext}>
                <span>{step.label}</span>
                {step.text}
              </p>
            )}

            {chips.length > 0 && (
              <ul className={styles.docs} aria-label="Open documents">
                {chips.map((c) => (
                  <li key={c.kind}>
                    <Link href={c.href} className={styles.doc}>
                      <span className={styles.docText}>
                        <b>{c.title}</b>
                        <span>{c.detail}</span>
                      </span>
                      <PortalStatus tone={c.tone} onBlue size="sm">
                        {c.statusLabel}
                      </PortalStatus>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            <div className={styles.engActions}>
              <Link href={`/client-portal/projects/${project.id}`} className={prim.primary}>
                Open project
              </Link>
            </div>

            {engagement.others.length > 0 && (
              <div className={styles.engAlso}>
                <span>Also in progress</span>
                <ul>
                  {engagement.others.map((o) => (
                    <li key={o.id}>
                      <Link href={`/client-portal/projects/${o.id}`}>{o.name}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {engagement.history && <p className={styles.engNote}>There is no active project at the moment. This is your most recent completed one.</p>}
          </PortalSurface>
        ) : unavailable.has('projects') ? (
          <PortalSurface as="section" variant="soft" aria-labelledby="home-engagement">
            <Eyebrow>Current engagement</Eyebrow>
            <h2 id="home-engagement" className="sr-only">
              Current engagement
            </h2>
            <EmptyState title="We could not load your projects just now" description="Please refresh in a moment. Nothing about your work has changed." />
          </PortalSurface>
        ) : (
          /* First-run: the one place a 3D module is allowed. */
          <PortalSurface as="section" variant="soft" aria-labelledby="home-engagement">
            <Eyebrow>Current engagement</Eyebrow>
            <h2 id="home-engagement" className="sr-only">
              Current engagement
            </h2>
            <EmptyState
              media={<HbeeModuleStandalone label="Project" icon={<MonitorIcon />} signal width={70} />}
              title="Your first project starts here"
              description="When Hbee starts work with you, it appears here with its progress and next step. Have something in mind? Tell us what you need."
              action={
                <Link href="/client-portal/project-request" className={prim.primary}>
                  Start a request
                </Link>
              }
            />
          </PortalSurface>
        )}

        {/* 3 — Needs your attention */}
        <PortalSurface as="section" variant="base" compact className={styles.attention} aria-labelledby="home-attention">
          <Eyebrow>Needs your attention</Eyebrow>
          <h2 id="home-attention" className="sr-only">
            Needs your attention
          </h2>
          {rows.length > 0 ? (
            <ul className={styles.rows}>
              {rows.map((r) => (
                <li key={r.key}>
                  <Link href={r.href} className={styles.row}>
                    <PortalToneMark tone={r.tone} className={styles.rowMark} />
                    <span>
                      <span className={styles.rowTitle}>{r.title}</span>
                      <span className={styles.rowContext}>{r.context}</span>
                    </span>
                    <span className={styles.rowAction}>{r.actionLabel}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : attentionReadable ? (
            <EmptyState icon={<Check aria-hidden="true" strokeWidth={2.6} />} title="All clear" description="Nothing needs your attention right now." />
          ) : (
            <p className={styles.quiet}>We could not check this just now.</p>
          )}
        </PortalSurface>
      </div>

      {/* 4 — Your workspace */}
      <section className={styles.section} aria-labelledby="home-workspace">
        <Eyebrow>Your workspace</Eyebrow>
        <h2 id="home-workspace" className="sr-only">
          Your workspace
        </h2>
        <ul className={styles.tiles}>
          {tiles.map((t) => {
            const Icon = PORTAL_NAV_ICONS[t.icon]
            return (
              <li key={t.key}>
                <Link href={t.href} className={cn(portalSurfaceClass({ variant: 'base', compact: true, interactive: true, padded: false }), styles.tile)} data-tile={t.key}>
                  <Icon aria-hidden="true" className={styles.tileIcon} />
                  <span className={styles.tileLabel}>{t.label}</span>
                  {t.tone ? (
                    <PortalStatus tone={t.tone} plain size="sm">
                      {t.line}
                    </PortalStatus>
                  ) : (
                    <span className={styles.tileLine}>{t.line}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </section>

      {/* 5 — Recent activity + Growth snapshot */}
      <div className={styles.lower}>
        <section className={cn(surfaceStyles.rule, styles.activity)} aria-labelledby="home-activity">
          <Eyebrow>Recent activity</Eyebrow>
          <h2 id="home-activity" className="sr-only">
            Recent activity
          </h2>
          {activity.length > 0 ? (
            <>
              <ul className={styles.feed}>
                {activity.map((a) => (
                  <li key={a.key}>
                    {a.href ? (
                      <Link href={a.href} className={styles.feedItem}>
                        <span className={styles.feedTitle}>{a.title}</span>
                        <span className={styles.feedMeta}>{a.meta}</span>
                      </Link>
                    ) : (
                      <div className={styles.feedItem}>
                        <span className={styles.feedTitle}>{a.title}</span>
                        <span className={styles.feedMeta}>{a.meta}</span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              <ArrowLink href="/client-portal/notifications">All notifications</ArrowLink>
            </>
          ) : (
            <p className={styles.quiet}>Updates will appear here as your work progresses.</p>
          )}
        </section>

        <PortalSurface as="section" variant="soft" compact className={styles.growth} aria-labelledby="home-growth">
          <Eyebrow>{snapshot ? 'Growth Profile snapshot' : 'Growth Profile'}</Eyebrow>
          <h2 id="home-growth" className="sr-only">
            Growth Profile
          </h2>
          {snapshot ? (
            <>
              <div>
                {snapshot.score !== null && (
                  <p className={styles.score}>
                    <b>{snapshot.score}</b>
                    <span>/ 100</span>
                  </p>
                )}
                {snapshot.classification && <p className={styles.class}>{snapshot.classification}</p>}
              </div>
              {snapshot.pillars.length > 0 && (
                <ul className={styles.pillars}>
                  {snapshot.pillars.map((p) => (
                    <li key={p.key} className={cn(styles.pillar, snapshot.lowestKey === p.key && styles.pillarLow)}>
                      <span>{p.label}</span>
                      <span className={styles.pillarBar} aria-hidden="true">
                        <span style={{ width: `${Math.max(0, Math.min(100, p.value))}%` }} />
                      </span>
                      <b>{p.value}</b>
                    </li>
                  ))}
                </ul>
              )}
              {priority && (
                <p className={styles.focus}>
                  <b>Current focus</b>
                  <strong>{priority.heading}</strong>
                  {priority.recommendation ? <> &mdash; {priority.recommendation}</> : null}
                </p>
              )}
              <ArrowLink href="/client-portal/growth-profile">View full Growth Profile</ArrowLink>
            </>
          ) : (
            <>
              <p className={styles.quiet} style={{ marginTop: 0 }}>
                {growthCopy.text}
              </p>
              <ArrowLink href={growthCopy.href}>{growthCopy.cta}</ArrowLink>
            </>
          )}
        </PortalSurface>
      </div>
    </div>
  )
}

/** The projects navigation icon, for the first-run module face. */
function MonitorIcon() {
  const Icon = PORTAL_NAV_ICONS.projects
  return <Icon strokeWidth={1.75} width="100%" height="100%" />
}

