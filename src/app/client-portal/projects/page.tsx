// src/app/client-portal/projects/page.tsx
//
// Projects list (Phase 18.6). Reads ONE session-bound endpoint, /api/client-portal/projects,
// which returns the caller's own projects as an allow-list (it replaces the browser-side
// projects.select('*') under RLS). Filters and grouping are presentation over the real stored
// status; no status is invented.

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Plus } from 'lucide-react'
import EmptyState from '@/components/client-portal/EmptyState'
import { PortalPageHeader } from '@/components/client-portal/PortalPageHeader'
import { PortalStatus } from '@/components/client-portal/PortalStatus'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import { toneFromProjectTone } from '@/lib/client-portal/portal-status'
import {
  PROJECT_FILTERS,
  parseProgress,
  formatProjectDate,
  matchesProjectFilter,
  statusLabel,
  statusTone,
  type ProjectFilter,
} from '@/lib/client-portal/projects-display'
import prim from '@/components/client-portal/portal-primitives.module.css'
import styles from '@/components/client-portal/portal-screens.module.css'

interface PortalProject {
  id: string
  reference: string | null
  name: string
  status: string | null
  progress: number | string | null
  description: string | null
  startDate: string | null
  expectedCompletion: string | null
  createdAt: string | null
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

export default function ClientProjectsPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [projects, setProjects] = useState<PortalProject[]>([])
  const [filter, setFilter] = useState<ProjectFilter>('all')

  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch('/api/client-portal/projects', { credentials: 'same-origin' })
      if (response.status === 409) {
        setState('ambiguous')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !Array.isArray(payload?.projects)) {
        setState('error')
        return
      }
      const list = payload.projects as PortalProject[]
      setProjects(list)
      // Open on Active when there is anything active; otherwise show everything.
      setFilter(list.some((p) => matchesProjectFilter(p.status, 'active')) ? 'active' : 'all')
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="projects" />
  if (state === 'error') return <SupportError message="We could not load your projects. Please try again in a moment." onRetry={load} />

  const shown = projects.filter((p) => matchesProjectFilter(p.status, filter))

  return (
    <div className={styles.page}>
      <PortalPageHeader
        eyebrow="Projects"
        title={
          <>
            Your work with Hbee, <em>in progress.</em>
          </>
        }
        lead="Every project, its current status and how far along it is."
        action={
          <Link href="/client-portal/project-request" className={prim.primary}>
            <Plus aria-hidden="true" />
            Request new project
          </Link>
        }
      />

      {projects.length === 0 ? (
        <section className={styles.panel}>
          <EmptyState
            title="No projects yet"
            description="Start by requesting a new project. Our team will review it and get back to you."
            action={
              <Link href="/client-portal/project-request" className={prim.link}>
                Request new project
              </Link>
            }
          />
        </section>
      ) : (
        <>
          <div className={styles.filters} role="group" aria-label="Filter projects">
            {PROJECT_FILTERS.map((f) => {
              const count = projects.filter((p) => matchesProjectFilter(p.status, f.key)).length
              // Groups with nothing in them are not offered (All is always there).
              if (f.key !== 'all' && count === 0) return null
              return (
                <button key={f.key} type="button" className={styles.filter} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                  {f.label}
                  <span className={styles.count}>{count}</span>
                </button>
              )
            })}
          </div>

          {shown.length === 0 ? (
            <p className={styles.quiet}>No projects in this view.</p>
          ) : (
            <section className={styles.section} aria-label="Projects">
              <ul className={styles.rows}>
                {shown.map((p) => {
                  const progress = parseProgress(p.progress)
                  const due = formatProjectDate(p.expectedCompletion)
                  return (
                    <li key={p.id}>
                      <Link href={`/client-portal/projects/${p.id}`} className={`${styles.row} ${styles.rowFig}`}>
                        <div className={styles.rowMain}>
                          <p className={styles.rowTitle}>{p.name}</p>
                          {p.reference && <p className={styles.rowMeta}>{p.reference}</p>}
                          {p.description && <p className={`${styles.rowText} ${styles.rowClamp}`}>{p.description}</p>}
                        </div>
                        <div className={styles.progressCol}>
                          {progress === null ? (
                            <p className={styles.rowMeta}>Progress not set</p>
                          ) : (
                            <>
                              <div className={styles.progressRow}>
                                <span>Progress</span>
                                <b>{progress}%</b>
                              </div>
                              <div className={styles.bar} aria-hidden="true">
                                <span style={{ width: `${progress}%` }} />
                              </div>
                            </>
                          )}
                          {due && <p className={styles.rowMeta}>Expected completion {due}</p>}
                        </div>
                        <div className={styles.rowEnd}>
                          <PortalStatus tone={toneFromProjectTone(statusTone(p.status))}>{statusLabel(p.status)}</PortalStatus>
                          <span className={prim.link} aria-hidden="true">
                            Open
                            <ArrowRight />
                          </span>
                        </div>
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
