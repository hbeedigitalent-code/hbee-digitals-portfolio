// src/app/client-portal/projects/[id]/page.tsx
//
// Project workspace (Phase 18.6). Reads ONE session-bound endpoint,
// /api/client-portal/projects/[id], which proves the project belongs to the caller and returns
// an allow-list of the project plus its real milestones, recent files, deliverables and
// requests (it replaces the browser-side projects/project_milestones reads under RLS).
//
// Nothing is invented: there is no delivery-stage field, so no stage tracker, current stage,
// next milestone or "latest update" exists here; milestones render only if real rows exist;
// "needs from you" comes only from the two statuses that mean it. Downloads use the existing
// signed routes — this page never sees a stored URL or storage path.

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRight, Check, Download } from 'lucide-react'
import { fileTypeLabel, formatBytes, formatDate } from '@/lib/client-portal/files-display'
import {
  parseProgress,
  formatProjectDate,
  needsFromYou,
  statusExplanation,
  statusLabel,
  statusTone,
} from '@/lib/client-portal/projects-display'
import styles from '../projects.module.css'

interface ProjectDetail {
  id: string
  reference: string | null
  name: string
  status: string | null
  progress: number | string | null
  description: string | null
  startDate: string | null
  expectedCompletion: string | null
}

interface Milestone {
  id: string
  title: string
  description: string | null
  status: string | null
  dueDate: string | null
}

interface ProjectFile {
  id: string
  name: string
  type: string | null
  size: number | null
  uploadedAt: string | null
}

interface Deliverable {
  id: string
  title: string | null
  description: string | null
  version: string | null
  status: string | null
  uploadedAt: string | null
  hasFile: boolean
}

interface ProjectRequest {
  id: string
  title: string
  status: string | null
  createdAt: string | null
}

type LoadState = 'loading' | 'ready' | 'notfound' | 'error'

export default function ClientProjectDetailPage() {
  const params = useParams()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''

  const [state, setState] = useState<LoadState>('loading')
  const [project, setProject] = useState<ProjectDetail | null>(null)
  const [milestones, setMilestones] = useState<Milestone[]>([])
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [deliverables, setDeliverables] = useState<Deliverable[]>([])
  const [requests, setRequests] = useState<ProjectRequest[]>([])
  const [unavailable, setUnavailable] = useState<string[]>([])
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setState('loading')
    try {
      const response = await fetch(`/api/client-portal/projects/${id}`, { credentials: 'same-origin' })
      if (response.status === 404) {
        setState('notfound')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.project) {
        setState('error')
        return
      }
      setProject(payload.project as ProjectDetail)
      setMilestones((payload.milestones || []) as Milestone[])
      setFiles((payload.files || []) as ProjectFile[])
      setDeliverables((payload.deliverables || []) as Deliverable[])
      setRequests((payload.requests || []) as ProjectRequest[])
      setUnavailable((payload.unavailable || []) as string[])
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  /** Signed download; the tab is opened inside the click so it is not treated as an unrequested popup. */
  async function openSigned(key: string, url: string) {
    setDownloadError(null)
    setDownloadingId(key)
    const newTab = window.open('', '_blank')
    try {
      const response = await fetch(url)
      const result = await response.json()
      if (!response.ok || !result.url) throw new Error(result.error || 'Failed to generate download link')
      if (newTab) newTab.location.href = result.url
      else window.location.href = result.url
    } catch (error) {
      console.error('Download error:', error)
      if (newTab) newTab.close()
      setDownloadError('Failed to prepare download. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  if (state === 'loading') {
    return (
      <div className={styles.center}>
        <div className={styles.spinner} />
      </div>
    )
  }

  if (state === 'notfound' || (state === 'ready' && !project)) {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <h2>Project not found</h2>
          <p>The project you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/client-portal/projects" className={styles.secondary}>
            Back to projects
          </Link>
        </div>
      </div>
    )
  }

  if (state === 'error' || !project) {
    return (
      <div className={styles.center}>
        <div className={styles.centerBody}>
          <p>We could not load this project. Please try again in a moment.</p>
          <button type="button" onClick={load} className={styles.secondary}>
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const tone = statusTone(project.status)
  const progress = parseProgress(project.progress)
  const explanation = statusExplanation(project.status)
  const needs = needsFromYou(project.status)
  const start = formatProjectDate(project.startDate)
  const due = formatProjectDate(project.expectedCompletion)
  const hasObjective = !!(project.description && project.description.trim())
  const hasTiming = !!(start || due)
  const chipClass = `${styles.chip} ${tone === 'needs' ? styles.chipNeeds : tone === 'done' ? styles.chipDone : tone === 'muted' ? styles.chipMuted : ''}`

  return (
    <div className={styles.page}>
      <Link href="/client-portal/projects" className={styles.back}>
        <ArrowLeft aria-hidden="true" />
        All projects
      </Link>

      {unavailable.length > 0 && (
        <p className={styles.note} role="status">
          Some details of this project could not be loaded just now, so parts of this page may be incomplete.
        </p>
      )}
      {downloadError && (
        <p role="alert" className={styles.err}>
          {downloadError}
        </p>
      )}

      {/* Header: project, reference, real status, real progress */}
      <header className={styles.panel}>
        <div className={styles.headTop}>
          <div style={{ minWidth: 0 }}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              Project
            </p>
            <h1 className={styles.h1}>{project.name}</h1>
            <p className={styles.meta}>{project.reference && <span>{project.reference}</span>}</p>
          </div>
          <span className={chipClass}>{statusLabel(project.status)}</span>
        </div>
        <div className={styles.bigProgress}>
          {progress === null ? (
            <p className={styles.quiet}>Progress not set</p>
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
        </div>
      </header>

      {/* Current status + what is needed from the client */}
      <section className={`${styles.panel} ${styles.twoCol}`} aria-labelledby="proj-status">
        <div className={styles.statusBlock}>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Current status
          </p>
          <h2 id="proj-status" className={styles.h2} style={{ marginTop: 0 }}>
            {statusLabel(project.status)}
          </h2>
          {explanation && <p className={styles.statusLine}>{explanation}</p>}
        </div>
        <div>
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Needs from you
          </p>
          {needs ? (
            <div className={styles.needs} style={{ marginTop: '0.75rem' }}>
              <p className={styles.needsTitle}>{needs.title}</p>
              <p className={styles.needsText}>{needs.text}</p>
              <div className={styles.needsActions}>
                {needs.actions.map((a) => (
                  <Link key={a.href} href={a.href} className={styles.secondary}>
                    {a.label}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.nothing} style={{ marginTop: '0.875rem' }}>
              <span className={styles.tick} aria-hidden="true">
                <Check strokeWidth={3} />
              </span>
              Nothing needed from you right now.
            </p>
          )}
        </div>
      </section>

      {/* Objective + timing: only what the project actually has */}
      {(hasObjective || hasTiming) && (
        <div className={hasObjective && hasTiming ? styles.twoCol : undefined}>
          {hasObjective && (
            <section className={styles.panel} aria-labelledby="proj-objective">
              <p className={styles.eyebrow}>
                <span aria-hidden="true" className={styles.node} />
                Project objective
              </p>
              <h2 id="proj-objective" className="sr-only">
                Project objective
              </h2>
              <p className={styles.objective}>{project.description}</p>
            </section>
          )}
          {hasTiming && (
            <section className={styles.panel} aria-labelledby="proj-timing">
              <p className={styles.eyebrow}>
                <span aria-hidden="true" className={styles.node} />
                Timing
              </p>
              <h2 id="proj-timing" className="sr-only">
                Project timing
              </h2>
              <dl className={styles.dates}>
                {start && (
                  <div>
                    <dt>Started</dt>
                    <dd>{start}</dd>
                  </div>
                )}
                {due && (
                  <div>
                    <dt>Expected completion</dt>
                    <dd>{due}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>
      )}

      {/* Milestones: real rows only, quiet */}
      {milestones.length > 0 && (
        <section className={styles.panel} aria-labelledby="proj-milestones">
          <p className={styles.eyebrow}>
            <span aria-hidden="true" className={styles.node} />
            Milestones
          </p>
          <h2 id="proj-milestones" className="sr-only">
            Milestones
          </h2>
          <ul className={styles.rows}>
            {milestones.map((m) => {
              const date = formatProjectDate(m.dueDate)
              return (
                <li key={m.id} className={styles.item}>
                  <div className={styles.itemMain}>
                    <p className={styles.itemTitle}>{m.title}</p>
                    {m.description && <p className={styles.itemSub}>{m.description}</p>}
                    {date && <p className={styles.itemSub}>Due {date}</p>}
                  </div>
                  {m.status && <span className={styles.inlineStatus}>{statusLabel(m.status)}</span>}
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Files + deliverables belonging to this project */}
      {(files.length > 0 || deliverables.length > 0) && (
        <div className={files.length > 0 && deliverables.length > 0 ? styles.grid2 : undefined}>
          {files.length > 0 && (
            <section className={styles.panel} aria-labelledby="proj-files">
              <div className={styles.panelHead}>
                <p className={styles.eyebrow}>
                  <span aria-hidden="true" className={styles.node} />
                  Recent files
                </p>
                <Link href="/client-portal/files" className={styles.link}>
                  View all files
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <h2 id="proj-files" className="sr-only">
                Recent files
              </h2>
              <ul className={styles.rows}>
                {files.map((f) => (
                  <li key={f.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <p className={styles.itemTitle}>{f.name}</p>
                      <p className={styles.itemSub}>
                        {[fileTypeLabel(f.type, f.name), formatBytes(f.size), formatDate(f.uploadedAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <button
                      type="button"
                      className={styles.dl}
                      onClick={() => openSigned(f.id, `/api/client-portal/files/${f.id}/signed-url`)}
                      disabled={downloadingId === f.id}
                      aria-label={`Download ${f.name}`}
                    >
                      <Download aria-hidden="true" />
                      {downloadingId === f.id ? 'Preparing…' : 'Download'}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {deliverables.length > 0 && (
            <section className={styles.panel} aria-labelledby="proj-deliverables">
              <p className={styles.eyebrow}>
                <span aria-hidden="true" className={styles.node} />
                Deliverables
              </p>
              <h2 id="proj-deliverables" className="sr-only">
                Deliverables
              </h2>
              <ul className={styles.rows}>
                {deliverables.map((d) => (
                  <li key={d.id} className={styles.item}>
                    <div className={styles.itemMain}>
                      <p className={styles.itemTitle}>{d.title || 'Deliverable'}</p>
                      {d.description && <p className={styles.itemSub}>{d.description}</p>}
                      <p className={styles.itemSub}>
                        {[d.status && statusLabel(d.status), d.version && `Version ${d.version}`, formatDate(d.uploadedAt)].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {d.hasFile && (
                      <button
                        type="button"
                        className={styles.dl}
                        onClick={() => openSigned(d.id, `/api/client-portal/deliverables/${d.id}/signed-url`)}
                        disabled={downloadingId === d.id}
                        aria-label={`Download ${d.title || 'deliverable'}`}
                      >
                        <Download aria-hidden="true" />
                        {downloadingId === d.id ? 'Preparing…' : 'Download'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Requests made for this project — they are waiting on Hbee, not on the client */}
      {requests.length > 0 && (
        <section className={styles.panel} aria-labelledby="proj-requests">
          <div className={styles.panelHead}>
            <p className={styles.eyebrow}>
              <span aria-hidden="true" className={styles.node} />
              Requests
            </p>
            <Link href="/client-portal/requests" className={styles.link}>
              All requests
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <h2 id="proj-requests" className="sr-only">
            Requests for this project
          </h2>
          <ul className={styles.rows}>
            {requests.map((r) => (
              <li key={r.id} className={styles.item}>
                <div className={styles.itemMain}>
                  <p className={styles.itemTitle}>{r.title}</p>
                  {formatDate(r.createdAt) && <p className={styles.itemSub}>Sent {formatDate(r.createdAt)}</p>}
                </div>
                {r.status && <span className={styles.inlineStatus}>{statusLabel(r.status)}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.quiet}>
        Have a question about this project?{' '}
        <Link href="/client-portal/project-request" className={styles.link} style={{ display: 'inline-flex' }}>
          Submit a request
          <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
