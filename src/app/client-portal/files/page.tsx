// src/app/client-portal/files/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@/lib/supabase-client'
import SvgIcon from '@/components/ui/SvgIcon'
import EmptyState from '@/components/client-portal/EmptyState'
import FileUploader from '@/components/uploads/FileUploader'

interface ClientFile {
  id: string
  file_name: string
  file_url: string
  file_type: string
  file_size: number
  uploaded_at: string
  project_id: string | null
}

interface ClientProject {
  id: string
  project_name: string | null
  project_id: string | null
  status: string | null
}


// A project is "active" (and therefore the sensible auto-selection when the
// client has exactly one) unless it is finished or archived.
const INACTIVE_PROJECT_STATUSES = ['Completed', 'Archived']

// Sentinel <select> value meaning "not tied to a specific project".
const GENERAL_VALUE = ''

export default function ClientFilesPage() {
  const supabase = createClientComponentClient()
  const [files, setFiles] = useState<ClientFile[]>([])
  const [projects, setProjects] = useState<ClientProject[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>(GENERAL_VALUE)
  const [loading, setLoading] = useState(true)
  const [clientId, setClientId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pageNotice, setPageNotice] = useState<string | null>(null)

  /**
   * Deletion is SERVER-SIDE. The browser sends only the file id; the route
   * proves ownership from the session, derives the object path from the stored
   * row, and removes the object and the metadata row under the service role.
   * Nothing here touches Storage or project_files directly.
   */
  async function handleDelete(file: ClientFile) {
    if (
      !confirm(
        `Delete "${file.file_name}"?\n\nThis removes the file permanently and cannot be undone.`,
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

      // Drop it from the table without refetching the whole page.
      setFiles((current) => current.filter((f) => f.id !== file.id))
      setPageNotice(
        result.storageMissing
          ? `"${file.file_name}" was removed from your list. The stored file was already gone.`
          : `"${file.file_name}" was deleted.`,
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

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (clientData) {
        setClientId(clientData.id)

        const [{ data: fileData }, { data: projectData }] = await Promise.all([
          supabase
            .from('project_files')
            .select('*')
            .eq('client_id', clientData.id)
            .order('uploaded_at', { ascending: false }),
          supabase
            .from('projects')
            .select('id, project_name, project_id, status')
            .eq('client_id', clientData.id)
            .order('created_at', { ascending: false }),
        ])

        setFiles(fileData || [])

        const clientProjects = (projectData || []) as ClientProject[]
        setProjects(clientProjects)

        // Default to General, unless there is exactly one active project.
        const activeProjects = clientProjects.filter(
          (p) => !INACTIVE_PROJECT_STATUSES.includes(p.status || ''),
        )
        setSelectedProjectId(activeProjects.length === 1 ? activeProjects[0].id : GENERAL_VALUE)
      }
    }

    setLoading(false)
  }

  function projectLabel(projectId: string | null): string {
    if (!projectId) return 'General'
    const match = projects.find((p) => p.id === projectId)
    return match?.project_name || match?.project_id || 'Project'
  }

  async function handleDownload(file: ClientFile) {
    setPageError(null)
    setDownloadingId(file.id)

    // Open the tab synchronously, inside the click handler, before any
    // await — a tab opened only after an awaited fetch resolves is treated
    // as an unrequested popup by most browsers and gets blocked.
    const newTab = window.open('', '_blank')

    try {
      const response = await fetch(`/api/client-portal/files/${file.id}/signed-url`)
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

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[var(--accent-orange)] border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Files</h1>
          <p className="text-[var(--text-muted)]">Upload and manage your project files</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="file-project" className="sr-only">Attach to project</label>
          <select
            id="file-project"
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="rounded-full border border-[var(--border)] bg-[var(--bg-card)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)]"
          >
            <option value={GENERAL_VALUE}>General / No specific project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.project_name || project.project_id || 'Untitled project'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Uploads use the single signed-TUS transport (context "client_file").
          The browser no longer writes to Storage or to project_files: it asks
          the server to authorize a batch, sends bytes to a server-selected path
          with a scoped token, and finalizes by upload ID. The selected project
          is re-verified against this client account server-side, so a project id
          belonging to another client cannot be attached. */}
      <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
        <FileUploader
          context="client_file"
          projectId={selectedProjectId || null}
          label="Upload files"
          onComplete={() => { void fetchData() }}
        />
      </div>
      {pageError && (
        <div role="alert" className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-sm font-semibold text-red-500">
          {pageError}
        </div>
      )}

      {pageNotice && (
        <div
          role="status"
          className="rounded-xl border border-[var(--success)]/30 bg-[var(--success-subtle)] p-3 text-sm font-semibold text-[var(--success)]"
        >
          {pageNotice}
        </div>
      )}

      {files.length === 0 ? (
        <EmptyState
          title="No files uploaded"
          description="Upload your project files, documents, and assets here."
          icon="file"
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-[var(--border)] bg-[var(--bg-section)]">
              <tr className="text-left text-xs font-medium uppercase tracking-wider text-[var(--text-muted)]">
                <th className="px-4 py-3">File Name</th>
                <th className="px-4 py-3 hidden sm:table-cell">Project</th>
                <th className="px-4 py-3 hidden md:table-cell">Type</th>
                <th className="px-4 py-3 hidden md:table-cell">Size</th>
                <th className="px-4 py-3 hidden lg:table-cell">Uploaded</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-[var(--bg-section)] transition">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <SvgIcon name="file" size={16} color="var(--text-muted)" />
                      <div className="min-w-0">
                        <span className="block text-sm font-medium text-[var(--text-primary)]">{file.file_name}</span>
                        <span className="block text-xs text-[var(--text-muted)] sm:hidden">{projectLabel(file.project_id)}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-sm text-[var(--text-muted)]">{projectLabel(file.project_id)}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-[var(--text-muted)]">{file.file_type?.split('/').pop() || 'Unknown'}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-sm text-[var(--text-muted)]">
                    {formatFileSize(file.file_size)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-sm text-[var(--text-muted)]">
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id || deletingId === file.id}
                        className="inline-flex items-center gap-1 text-sm text-[var(--accent-orange)] hover:underline disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
                      >
                        {downloadingId === file.id ? 'Preparing...' : 'Download'}
                        <SvgIcon name="download" size={14} color="var(--accent-orange)" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(file)}
                        disabled={deletingId === file.id || downloadingId === file.id}
                        aria-label={`Delete ${file.file_name}`}
                        className="inline-flex items-center gap-1 text-sm text-[var(--error)] hover:underline disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-page)]"
                      >
                        {deletingId === file.id ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  )
}
