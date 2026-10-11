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
import {
  PROJECT_FILTERS,
  parseProgress,
  formatProjectDate,
  matchesProjectFilter,
  statusLabel,
  statusTone,
  type ProjectFilter,
} from '@/lib/client-portal/projects-display'
import styles from './projects.module.css'

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
          <p>Your sign-in is linked to more than one business record, so we have not shown your projects. Please contact us and we will sort it out.</p>
          <Link href="/contact" className={styles.secondary}>
            Contact Hbee Digitals
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>We could not load your projects. Please try again in a moment.</p>
          <button type="button" onClick={load} className={styles.secondary}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const shown = projects.filter((p) => matchesProjectFilter(p.status, filter))

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Projects
          </p>
          <h1 className={styles.h1}>
            Your work with Hbee, <em>in progress.</em>
          </h1>
          <p className={styles.lead}>Every project, its current status and how far along it is.</p>
        </div>
        <div className={styles.heroActions}>
          <Link href="/client-portal/project-request" className={styles.primary}>
            <Plus aria-hidden="true" />
            Request new project
          </Link>
          <Link href="/client-onboarding" className={styles.secondary}>
            Full onboarding
          </Link>
        </div>
      </header>

      {projects.length === 0 ? (
        <div className={`${styles.panel} ${styles.center}`}>
          <div className={styles.centerBody}>
            <h2>No projects yet</h2>
            <p>Start by requesting a new project. Our team will review it and get back to you.</p>
          </div>
        </div>
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
            <ul className={styles.list}>
              {shown.map((p) => {
                const tone = statusTone(p.status)
                const progress = parseProgress(p.progress)
                const due = formatProjectDate(p.expectedCompletion)
                return (
                  <li key={p.id}>
                    <Link href={`/client-portal/projects/${p.id}`} className={styles.row}>
                      <div style={{ minWidth: 0 }}>
                        <p className={styles.rowTitle}>{p.name}</p>
                        {p.reference && <p className={styles.rowRef}>{p.reference}</p>}
                        {p.description && <p className={styles.rowDesc}>{p.description}</p>}
                      </div>
                      <div className={styles.rowMeta}>
                        {progress === null ? (
                          <p className={styles.due}>Progress not set</p>
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
                        {due && <p className={styles.due}>Expected completion {due}</p>}
                      </div>
                      <div className={styles.rowEnd}>
                        <span
                          className={`${styles.chip} ${tone === 'needs' ? styles.chipNeeds : tone === 'done' ? styles.chipDone : tone === 'muted' ? styles.chipMuted : ''}`}
                        >
                          {statusLabel(p.status)}
                        </span>
                        <span className={styles.link} aria-hidden="true">
                          Open project
                          <ArrowRight />
                        </span>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
