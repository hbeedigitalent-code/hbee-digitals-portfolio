// src/app/client-portal/files/page.tsx
//
// Files & Deliverables (Phase 18.5).
//
// Reads ONE session-bound endpoint, /api/client-portal/files, which returns the client's own
// project files, projects and deliverables as an allow-list — no raw file_url, storage path or
// client id ever reaches the browser. Uploads still go through the existing signed-TUS
// FileUploader (context "client_file"); downloads and deletes still use the existing
// /api/client-portal/files/[id] routes; deliverable downloads use the new signed route.
//
// Search, type filter and project filter are presentation only, over the loaded rows. File
// types are derived from the stored MIME type; projects are only the existing project_id
// relation — there are no folders.

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Download, Search, Upload } from 'lucide-react'
import FileUploader from '@/components/uploads/FileUploader'
import {
  FILE_FILTERS,
  fileCategory,
  fileTypeLabel,
  formatBytes,
  formatDate,
  groupByProject,
  matchesProject,
  matchesSearch,
  projectLabel,
  type FileFilter,
  type ProjectLike,
} from '@/lib/client-portal/files-display'
import EmptyState from '@/components/client-portal/EmptyState'
import { PortalEyebrow, PortalPageHeader } from '@/components/client-portal/PortalPageHeader'
import { SupportAmbiguous, SupportError, SupportLoading } from '@/components/client-portal/SupportState'
import prim from '@/components/client-portal/portal-primitives.module.css'
import screens from '@/components/client-portal/portal-screens.module.css'
import styles from './files.module.css'

interface PortalFile {
  id: string
  canDelete?: boolean
  suppliedByHbee?: boolean
  name: string
  type: string | null
  size: number | null
  uploadedAt: string | null
  projectId: string | null
}

interface PortalProject extends ProjectLike {
  status: string | null
}

interface PortalDeliverable {
  id: string
  title: string | null
  description: string | null
  version: string | null
  uploadedAt: string | null
  projectId: string | null
  hasFile: boolean
}

type LoadState = 'loading' | 'ready' | 'ambiguous' | 'error'

// A project is "active" (and therefore the sensible auto-selection when the
// client has exactly one) unless it is finished or archived.
const INACTIVE_PROJECT_STATUSES = ['Completed', 'Archived']

// Sentinel <select> value meaning "not tied to a specific project".
const GENERAL_VALUE = ''

export default function ClientFilesPage() {
  const [state, setState] = useState<LoadState>('loading')
  const [files, setFiles] = useState<PortalFile[]>([])
  const [projects, setProjects] = useState<PortalProject[]>([])
  // False until Hbee links this portal account to a business; uploads then stay closed (the API refuses them too).
  const [connected, setConnected] = useState(true)
  const [deliverables, setDeliverables] = useState<PortalDeliverable[]>([])
  const [deliverablesUnavailable, setDeliverablesUnavailable] = useState(false)

  const [selectedProjectId, setSelectedProjectId] = useState<string>(GENERAL_VALUE)
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageNotice, setPageNotice] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FileFilter>('all')
  const [projectFilter, setProjectFilter] = useState<string>('all')
  const [grouped, setGrouped] = useState(false)

  const fetchData = useCallback(async (initial = false) => {
    if (initial) setState('loading')
    try {
      const response = await fetch('/api/client-portal/files', { credentials: 'same-origin' })
      if (response.status === 409) {
        setState('ambiguous')
        return
      }
      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload || !Array.isArray(payload.files)) {
        setState('error')
        return
      }
      const clientProjects = (payload.projects || []) as PortalProject[]
      setFiles(payload.files as PortalFile[])
      setProjects(clientProjects)
      setConnected(payload.connected !== false)
      setDeliverables((payload.deliverables || []) as PortalDeliverable[])
      setDeliverablesUnavailable(!!payload.deliverablesUnavailable)
      if (initial) {
        // Default the upload target to General, unless there is exactly one active project.
        const active = clientProjects.filter((p) => !INACTIVE_PROJECT_STATUSES.includes(p.status || ''))
        setSelectedProjectId(active.length === 1 ? active[0].id : GENERAL_VALUE)
      }
      setState('ready')
    } catch (err) {
      console.error('Error:', err)
      setState('error')
    }
  }, [])

  useEffect(() => {
    fetchData(true)
  }, [fetchData])

  /**
   * Deletion is SERVER-SIDE. The browser sends only the file id; the route
   * proves ownership from the session, derives the object path from the stored
   * row, and removes the object and the metadata row under the service role.
   * Nothing here touches Storage or project_files directly.
   */
  async function handleDelete(file: PortalFile) {
    if (
      !confirm(
        `Delete "${file.name}"?\n\nThis removes the file permanently and cannot be undone.`,
      )
    ) {
      return
    }

    setPageError(null)
    setPageNotice(null)
    setDeletingId(file.id)

    try {
      const response = await fetch(`/api/client-portal/files/${file.id}`, {
        method: 'DELETE',
      })
      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(result.error || 'The file could not be deleted.')
      }

      // Drop it from the list without refetching the whole page.
      setFiles((current) => current.filter((f) => f.id !== file.id))
      setPageNotice(
        result.storageMissing
          ? `"${file.name}" was removed from your list. The stored file was already gone.`
          : `"${file.name}" was deleted.`,
      )
    } catch (error) {
      console.error('Delete error:', error)
      setPageError(
        error instanceof Error ? error.message : 'The file could not be deleted.',
      )
    } finally {
      setDeletingId(null)
    }
  }

  /** Signed download for a project file or a deliverable; the tab is opened inside the click. */
  async function openSigned(id: string, url: string) {
    setPageError(null)
    setDownloadingId(id)

    // Open the tab synchronously, inside the click handler, before any
    // await — a tab opened only after an awaited fetch resolves is treated
    // as an unrequested popup by most browsers and gets blocked.
    const newTab = window.open('', '_blank')

    try {
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok || !result.url) {
        throw new Error(result.error || 'Failed to generate download link')
      }

      if (newTab) {
        newTab.location.href = result.url
      } else {
        // Popup was blocked despite the synchronous open (rare, e.g. some
        // mobile browsers) — fall back to a same-tab navigation.
        window.location.href = result.url
      }
    } catch (error) {
      console.error('Download error:', error)
      if (newTab) newTab.close()
      setPageError('Failed to prepare download. Please try again.')
    } finally {
      setDownloadingId(null)
    }
  }

  const handleDownload = (file: PortalFile) => openSigned(file.id, `/api/client-portal/files/${file.id}/signed-url`)
  const handleDeliverableDownload = (d: PortalDeliverable) =>
    openSigned(d.id, `/api/client-portal/deliverables/${d.id}/signed-url`)

  const visible = useMemo(
    () =>
      files.filter(
        (f) =>
          (filter === 'all' || fileCategory(f.type, f.name) === filter) &&
          matchesProject(f, projectFilter) &&
          matchesSearch(f, query, projects),
      ),
    [files, filter, projectFilter, query, projects],
  )
  const groups = useMemo(() => (grouped ? groupByProject(visible, projects) : []), [grouped, visible, projects])

  if (state === 'loading') return <SupportLoading />
  if (state === 'ambiguous') return <SupportAmbiguous what="files" />
  if (state === 'error') return <SupportError message="We could not load your files. Please try again in a moment." onRetry={() => fetchData(true)} />

  const hasGeneral = files.some((f) => !f.projectId)

  const renderFile = (file: PortalFile) => {
    const project = projectLabel(file.projectId, projects)
    const type = fileTypeLabel(file.type, file.name)
    const size = formatBytes(file.size)
    const date = formatDate(file.uploadedAt)
    return (
      <li key={file.id} className={styles.file}>
        <div style={{ minWidth: 0 }}>
          <p className={styles.fileName}>{file.name}</p>
          <p className={styles.metaLine}>{[project, type, size, date].filter(Boolean).join(' · ')}</p>
        </div>
        <span className={styles.desk}>{project}</span>
        <span className={styles.desk}>
          <span className={styles.badge}>{type}</span>
        </span>
        <span className={styles.desk}>{size ?? '—'}</span>
        <span className={styles.desk}>{date ?? '—'}</span>
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => handleDownload(file)}
            disabled={downloadingId === file.id || deletingId === file.id}
            className={screens.dl}
            aria-label={`Download ${file.name}`}
          >
            <Download aria-hidden="true" />
            {downloadingId === file.id ? 'Preparing…' : 'Download'}
          </button>
          {file.canDelete && (
            <button
              type="button"
              onClick={() => handleDelete(file)}
              disabled={deletingId === file.id || downloadingId === file.id}
              aria-label={`Delete ${file.name}`}
              className={styles.del}
            >
              {deletingId === file.id ? 'Deleting…' : 'Delete'}
            </button>
          )}
        </div>
      </li>
    )
  }

  const counts: Record<FileFilter, number> = {
    all: files.length,
    documents: files.filter((f) => fileCategory(f.type, f.name) === 'documents').length,
    images: files.filter((f) => fileCategory(f.type, f.name) === 'images').length,
    other: files.filter((f) => fileCategory(f.type, f.name) === 'other').length,
  }

  return (
    <div className={screens.page}>
      <PortalPageHeader
        eyebrow="Files"
        title={
          <>
            Everything shared for your work, <em>in one place.</em>
          </>
        }
        lead="Access project files, assets and deliverables shared through your work with Hbee Digitals."
        action={
          <a href="#upload" className={prim.primary}>
            <Upload aria-hidden="true" />
            Upload file
          </a>
        }
      />

      {pageError && (
        <div role="alert" className={screens.err}>
          {pageError}
        </div>
      )}
      {pageNotice && (
        <div role="status" className={screens.ok}>
          {pageNotice}
        </div>
      )}

      {/* Compact controls: no box of their own */}
      {files.length > 0 && (
        <div className={styles.controls} role="group" aria-label="Search and filter files">
          <label className={styles.search}>
            <span className="sr-only">Search files</span>
            <Search aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by file, project or type"
              className={styles.input}
            />
          </label>
          <div className={screens.filters} role="group" aria-label="File type">
            {FILE_FILTERS.map((f) => (
              <button key={f.key} type="button" className={screens.filter} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label}
                <span className={screens.count}>{counts[f.key]}</span>
              </button>
            ))}
          </div>
          {(projects.length > 0 || hasGeneral) && (
            <div className={styles.selectWrap}>
              <label className="sr-only" htmlFor="files-project-filter">
                Filter by project
              </label>
              <select id="files-project-filter" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className={styles.select}>
                <option value="all">All projects</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {hasGeneral && <option value="general">General (no project)</option>}
              </select>
              <button type="button" className={styles.toggle} aria-pressed={grouped} onClick={() => setGrouped((g) => !g)}>
                By project
              </button>
            </div>
          )}
        </div>
      )}

      {/* Project files */}
      <section className={screens.section} aria-labelledby="files-list">
        <PortalEyebrow>Project files</PortalEyebrow>
        <h2 id="files-list" className="sr-only">
          Project files
        </h2>
        {files.length === 0 ? (
          <div style={{ marginTop: '0.75rem' }}>
            <EmptyState
              title="No files yet"
              description="Files shared with you, and files you upload below, will appear here."
              action={
                <a href="#upload" className={prim.link}>
                  Upload a file
                </a>
              }
            />
          </div>
        ) : visible.length === 0 ? (
          <div style={{ marginTop: '0.75rem' }}>
            <p className={screens.quiet}>No files match your search or filters.</p>
            <button
              type="button"
              className={prim.secondary}
              style={{ marginTop: '0.75rem' }}
              onClick={() => {
                setQuery('')
                setFilter('all')
                setProjectFilter('all')
              }}
            >
              Clear search and filters
            </button>
          </div>
        ) : grouped ? (
          <div style={{ marginTop: '0.75rem' }}>
            {groups.map((g) => (
              <div key={g.key} className={styles.group}>
                <div className={styles.groupHead}>
                  <h3 className={styles.groupName}>{g.label}</h3>
                  <span className={screens.muted}>
                    {g.files.length} {g.files.length === 1 ? 'file' : 'files'}
                  </span>
                </div>
                <ul className={styles.list}>{g.files.map(renderFile)}</ul>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ marginTop: '0.875rem' }}>
            <div className={styles.listHead} aria-hidden="true">
              <span>File</span>
              <span>Project</span>
              <span>Type</span>
              <span>Size</span>
              <span>Added</span>
              <span />
            </div>
            <ul className={styles.list}>{visible.map(renderFile)}</ul>
          </div>
        )}
      </section>

      {/* Deliverables (only when real rows exist) */}
      {deliverables.length > 0 && (
        <section id="deliverables" className={screens.section} aria-labelledby="files-deliverables">
          <PortalEyebrow>Deliverables</PortalEyebrow>
          <h2 id="files-deliverables" className={screens.h2}>
            Delivered to you
          </h2>
          <ul className={styles.dels}>
            {deliverables.map((d) => {
              const project = d.projectId ? projectLabel(d.projectId, projects) : null
              const date = formatDate(d.uploadedAt)
              return (
                <li key={d.id} className={styles.del2}>
                  <div style={{ minWidth: 0 }}>
                    <p className={styles.delTitle}>{d.title || 'Deliverable'}</p>
                    {d.description && <p className={styles.delDesc}>{d.description}</p>}
                    <div className={styles.delMeta}>
                      {d.version && <span>Version {d.version}</span>}
                      {project && <span>{project}</span>}
                      {date && <span>{date}</span>}
                    </div>
                  </div>
                  {d.hasFile && (
                    <button
                      type="button"
                      className={screens.dl}
                      onClick={() => handleDeliverableDownload(d)}
                      disabled={downloadingId === d.id}
                      aria-label={`Download ${d.title || 'deliverable'}`}
                    >
                      <Download aria-hidden="true" />
                      {downloadingId === d.id ? 'Preparing…' : 'Download'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      )}
      {deliverablesUnavailable && (
        <p className={screens.quiet} role="status">
          Deliverables could not be loaded just now.
        </p>
      )}

      {/* Upload — the one action region. Uploads use the single signed-TUS transport (context "client_file"): the browser asks the
          server to authorize a batch, sends bytes to a server-selected path with a scoped token, and finalizes by upload ID. The selected
          project is re-verified against this client account server-side, so a project id belonging to another client cannot be attached. */}
      <section id="upload" className={screens.panelSoft} aria-labelledby="files-upload">
        <PortalEyebrow>Upload</PortalEyebrow>
        <h2 id="files-upload" className={screens.h2}>
          Add a file to your work
        </h2>
        {!connected ? (
          <p className={screens.lead}>Uploading becomes available once Hbee connects your business. Your account is ready in the meantime.</p>
        ) : (
          <div className={styles.uploadGrid}>
            <div className={styles.field}>
              <label htmlFor="file-project" className={styles.label}>
                Attach to project
              </label>
              <select id="file-project" value={selectedProjectId} onChange={(e) => setSelectedProjectId(e.target.value)} className={styles.select}>
                <option value={GENERAL_VALUE}>General / No specific project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <FileUploader
              context="client_file"
              projectId={selectedProjectId || null}
              label="Upload files"
              onComplete={() => {
                void fetchData()
              }}
            />
          </div>
        )}
      </section>

      <p className={screens.quiet}>
        Need something you can&rsquo;t find?{' '}
        <Link href="/client-portal/project-request" className={prim.link}>
          Submit a request
          <ArrowRight aria-hidden="true" />
        </Link>
      </p>
    </div>
  )
}
