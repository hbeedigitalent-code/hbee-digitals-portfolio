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
import { formatDay } from '@/lib/client-portal/support-display'
import { formatMoney } from '@/lib/commerce/money'
import {
  parseProgress,
  formatProjectDate,
  needsFromYou,
  statusExplanation,
  statusLabel,
  statusTone,
} from '@/lib/client-portal/projects-display'
import { cn } from '@/lib/cn'
import { PortalEyebrow } from '@/components/client-portal/PortalPageHeader'
import { PortalStatus } from '@/components/client-portal/PortalStatus'
import { PortalSurface, portalSurfaceClass } from '@/components/client-portal/PortalSurface'
import { SupportError, SupportLoading, SupportNotFound } from '@/components/client-portal/SupportState'
import { toneForInvoice, toneForProposal, toneForRequest, toneFromProjectTone } from '@/lib/client-portal/portal-status'
import prim from '@/components/client-portal/portal-primitives.module.css'
import screens from '@/components/client-portal/portal-screens.module.css'
import styles from './project-detail.module.css'

/** Read-only Proposal & billing summary for this project (server allow-list). */
interface Commerce {
  proposal: { id: string; number: string | null; title: string; status: string; statusLabel: string; currency: string | null; total: string | null; approvedVersion: number | null } | null
  invoice: { id: string; number: string | null; status: string; statusLabel: string; currency: string; total: string; paid: string; balance: string; dueDate: string | null } | null
  otherInvoices: number
}

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
  const [commerce, setCommerce] = useState<Commerce | null>(null)
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
      setCommerce((payload.commerce || null) as Commerce | null)
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

  if (state === 'loading') return <SupportLoading />

  if (state === 'notfound' || (state === 'ready' && !project)) {
    return (
      <SupportNotFound
        title="Project not found"
        text="The project you're looking for doesn't exist or you don't have access."
        links={[{ href: '/client-portal/projects', label: 'Back to projects' }]}
      />
    )
  }

  if (state === 'error' || !project) return <SupportError message="We could not load this project. Please try again in a moment." onRetry={load} />

  const progress = parseProgress(project.progress)
  const explanation = statusExplanation(project.status)
  const needs = needsFromYou(project.status)
  const start = formatProjectDate(project.startDate)
  const due = formatProjectDate(project.expectedCompletion)
  const hasObjective = !!(project.description && project.description.trim())
  const projectTone = toneFromProjectTone(statusTone(project.status))

  return (
    <div className={screens.page}>
      <Link href="/client-portal/projects" className={prim.link}>
        <ArrowLeft aria-hidden="true" />
        All projects
      </Link>

      {unavailable.length > 0 && (
        <p className={screens.note} role="status">
          Some details of this project could not be loaded just now, so parts of this page may be incomplete.
        </p>
      )}
      {downloadError && (
        <p role="alert" className={screens.err}>
          {downloadError}
        </p>
      )}

      {/* The engagement: project, real status, real progress, what the project needs next, timing. The one Royal Blue module here. */}
      <PortalSurface as="header" variant="blue" className={styles.engagement}>
        <p className={cn(prim.eyebrow, prim.onBlue)}>
          <span aria-hidden="true" className={prim.node} />
          Project
        </p>
        <h1 className={styles.engName}>{project.name}</h1>
        {project.reference && <p className={styles.engRef}>{project.reference}</p>}
        <div className={styles.engStatus}>
          <PortalStatus tone={projectTone} onBlue>
            {statusLabel(project.status)}
          </PortalStatus>
        </div>

        {progress === null ? (
          <p className={styles.engNote}>Progress not set</p>
        ) : (
          <div className={styles.engProgress}>
            <div className={styles.engProgressRow}>
              <span>Progress</span>
              <b>{progress}%</b>
            </div>
            <div className={cn(prim.bar, prim.barOnBlue)} aria-hidden="true">
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {needs ? (
          <div className={cn(styles.engNext, styles.engNeeds)}>
            <span>Needs from you</span>
            <b>{needs.title}</b>
            <p>{needs.text}</p>
          </div>
        ) : explanation ? (
          <p className={styles.engNext}>
            <span>Current status</span>
            {explanation}
          </p>
        ) : null}

        {needs ? (
          <div className={styles.engActions}>
            {needs.actions.map((a, i) => (
              <Link key={a.href} href={a.href} className={i === 0 ? prim.primary : prim.secondary}>
                {a.label}
              </Link>
            ))}
          </div>
        ) : (
          <p className={styles.clear}>
            <Check aria-hidden="true" strokeWidth={3} />
            Nothing needed from you right now.
          </p>
        )}

        {(start || due) && (
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
        )}
      </PortalSurface>

      {/* Objective: only what the project actually has */}
      {hasObjective && (
        <section className={screens.section} aria-labelledby="proj-objective">
          <PortalEyebrow>Project objective</PortalEyebrow>
          <h2 id="proj-objective" className="sr-only">
            Project objective
          </h2>
          <p className={screens.prose}>{project.description}</p>
        </section>
      )}

      {/* Proposal & billing: the documents of THIS engagement (the server's project-linked summary), read-only */}
      {commerce && (commerce.proposal || commerce.invoice) && (
        <section className={screens.section} aria-labelledby="proj-billing">
          <PortalEyebrow>Proposal &amp; billing</PortalEyebrow>
          <h2 id="proj-billing" className="sr-only">
            Proposal and billing
          </h2>
          <ul className={styles.docs}>
            {commerce.proposal && (
              <li>
                <Link href={`/client-portal/proposals/${commerce.proposal.id}`} className={cn(portalSurfaceClass({ compact: true, interactive: true }), styles.docTile)}>
                  <p className={styles.docKind}>Proposal</p>
                  <p className={styles.docTitle}>
                    {commerce.proposal.number ? `${commerce.proposal.number} · ` : ''}
                    {commerce.proposal.title}
                  </p>
                  <p className={styles.docMeta}>
                    {commerce.proposal.total && commerce.proposal.currency && <span>{formatMoney(commerce.proposal.total, commerce.proposal.currency)}</span>}
                    {commerce.proposal.approvedVersion && <span>Version {commerce.proposal.approvedVersion} approved</span>}
                  </p>
                  <div>
                    <PortalStatus tone={toneForProposal(commerce.proposal.status)}>{commerce.proposal.statusLabel}</PortalStatus>
                  </div>
                  <span className={styles.docGo}>
                    View proposal
                    <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )}
            {commerce.invoice && (
              <li>
                <Link href={`/client-portal/invoices/${commerce.invoice.id}`} className={cn(portalSurfaceClass({ compact: true, interactive: true }), styles.docTile)}>
                  <p className={styles.docKind}>Invoice</p>
                  <p className={styles.docTitle}>Invoice {commerce.invoice.number || ''}</p>
                  <dl className={screens.ledger}>
                    <div>
                      <dt>Total</dt>
                      <dd>{formatMoney(commerce.invoice.total, commerce.invoice.currency)}</dd>
                    </div>
                    {commerce.invoice.status !== 'paid' && (
                      <div className={screens.ledgerStrong}>
                        <dt>Balance</dt>
                        <dd>{formatMoney(commerce.invoice.balance, commerce.invoice.currency)}</dd>
                      </div>
                    )}
                  </dl>
                  {commerce.invoice.dueDate && commerce.invoice.status !== 'paid' && <p className={styles.docMeta}>Due {formatDay(commerce.invoice.dueDate)}</p>}
                  <div>
                    <PortalStatus tone={toneForInvoice(commerce.invoice.status)}>{commerce.invoice.statusLabel}</PortalStatus>
                  </div>
                  <span className={styles.docGo}>
                    View invoice
                    <ArrowRight aria-hidden="true" />
                  </span>
                </Link>
              </li>
            )}
          </ul>
          {commerce.otherInvoices > 0 && (
            <Link href="/client-portal/invoices" className={prim.link}>
              {commerce.otherInvoices} more {commerce.otherInvoices === 1 ? 'invoice' : 'invoices'} · All invoices
              <ArrowRight aria-hidden="true" />
            </Link>
          )}
        </section>
      )}

      {/* Milestones: real rows only, as the connection-line timeline */}
      {milestones.length > 0 && (
        <section className={screens.section} aria-labelledby="proj-milestones">
          <PortalEyebrow>Milestones</PortalEyebrow>
          <h2 id="proj-milestones" className="sr-only">
            Milestones
          </h2>
          <ul className={screens.feed}>
            {milestones.map((m) => {
              const date = formatProjectDate(m.dueDate)
              return (
                <li key={m.id}>
                  <div className={screens.feedItem}>
                    <span className={screens.feedTitle}>{m.title}</span>
                    {m.description && <span className={screens.feedText}>{m.description}</span>}
                    {date && <span className={screens.feedMeta}>Due {date}</span>}
                    {m.status && (
                      <span className={screens.feedMeta}>
                        <PortalStatus tone={toneFromProjectTone(statusTone(m.status))} size="sm">
                          {statusLabel(m.status)}
                        </PortalStatus>
                      </span>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* Files + deliverables belonging to this project */}
      {(files.length > 0 || deliverables.length > 0) && (
        <div className={files.length > 0 && deliverables.length > 0 ? styles.two : undefined}>
          {files.length > 0 && (
            <section className={screens.section} aria-labelledby="proj-files">
              <div className={screens.sectionHead}>
                <PortalEyebrow>Recent files</PortalEyebrow>
                <Link href="/client-portal/files" className={prim.link}>
                  View all files
                  <ArrowRight aria-hidden="true" />
                </Link>
              </div>
              <h2 id="proj-files" className="sr-only">
                Recent files
              </h2>
              <ul className={cn(screens.rows, screens.rowsTight)}>
                {files.map((f) => (
                  <li key={f.id}>
                    <div className={styles.fileRow}>
                      <div className={styles.fileMain}>
                        <p className={styles.fileName}>{f.name}</p>
                        <p className={styles.fileSub}>{[fileTypeLabel(f.type, f.name), formatBytes(f.size), formatDate(f.uploadedAt)].filter(Boolean).join(' · ')}</p>
                      </div>
                      <button
                        type="button"
                        className={screens.dl}
                        onClick={() => openSigned(f.id, `/api/client-portal/files/${f.id}/signed-url`)}
                        disabled={downloadingId === f.id}
                        aria-label={`Download ${f.name}`}
                      >
                        <Download aria-hidden="true" />
                        {downloadingId === f.id ? 'Preparing…' : 'Download'}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {deliverables.length > 0 && (
            <section className={screens.section} aria-labelledby="proj-deliverables">
              <PortalEyebrow>Deliverables</PortalEyebrow>
              <h2 id="proj-deliverables" className="sr-only">
                Deliverables
              </h2>
              <ul className={cn(screens.rows, screens.rowsTight)}>
                {deliverables.map((d) => (
                  <li key={d.id}>
                    <div className={styles.fileRow}>
                      <div className={styles.fileMain}>
                        <p className={styles.fileName}>{d.title || 'Deliverable'}</p>
                        {d.description && <p className={styles.fileSub}>{d.description}</p>}
                        <p className={styles.fileSub}>{[d.version && `Version ${d.version}`, formatDate(d.uploadedAt)].filter(Boolean).join(' · ')}</p>
                      </div>
                      {d.hasFile && (
                        <button
                          type="button"
                          className={screens.dl}
                          onClick={() => openSigned(d.id, `/api/client-portal/deliverables/${d.id}/signed-url`)}
                          disabled={downloadingId === d.id}
                          aria-label={`Download ${d.title || 'deliverable'}`}
                        >
                          <Download aria-hidden="true" />
                          {downloadingId === d.id ? 'Preparing…' : 'Download'}
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* Requests made for this project — they are waiting on Hbee, not on the client */}
      {requests.length > 0 && (
        <section className={screens.section} aria-labelledby="proj-requests">
          <div className={screens.sectionHead}>
            <PortalEyebrow>Requests</PortalEyebrow>
            <Link href="/client-portal/requests" className={prim.link}>
              All requests
              <ArrowRight aria-hidden="true" />
            </Link>
          </div>
          <h2 id="proj-requests" className="sr-only">
            Requests for this project
          </h2>
          <ul className={cn(screens.rows, screens.rowsTight)}>
            {requests.map((r) => (
              <li key={r.id}>
                <div className={styles.fileRow}>
                  <div className={styles.fileMain}>
                    <p className={styles.fileName}>
                      <Link href={`/client-portal/requests/${r.id}`}>{r.title}</Link>
                    </p>
                    {formatDate(r.createdAt) && <p className={styles.fileSub}>Sent {formatDate(r.createdAt)}</p>}
                  </div>
                  {r.status && (
                    <PortalStatus tone={toneForRequest(r.status)} size="sm">
                      {statusLabel(r.status)}
                    </PortalStatus>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className={styles.foot}>
        Have a question about this project?{' '}
        <Link href="/client-portal/project-request" className={prim.link}>
          Submit a request
          <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
