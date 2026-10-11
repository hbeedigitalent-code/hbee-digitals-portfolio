// src/lib/client-portal/files-display.ts
//
// Pure presentation helpers for the Client Portal Files page (Phase 18.5). No I/O.
// Categories are DERIVED from the stored MIME type (falling back to the file extension) —
// nothing is persisted and there are no folders: "projects" are only the existing
// project_files.project_id relation.

export type FileCategory = 'documents' | 'images' | 'other'
export type FileFilter = 'all' | FileCategory

export const FILE_FILTERS: Array<{ key: FileFilter; label: string }> = [
  { key: 'all', label: 'All files' },
  { key: 'documents', label: 'Documents' },
  { key: 'images', label: 'Images' },
  { key: 'other', label: 'Other' },
]

const DOC_EXTENSIONS = new Set(['pdf', 'doc', 'docx', 'dot', 'dotx', 'rtf', 'odt', 'txt', 'md', 'xls', 'xlsx', 'csv', 'ods', 'ppt', 'pptx', 'odp', 'key', 'pages', 'numbers'])
const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'avif', 'heic', 'bmp', 'tif', 'tiff'])

const DOC_MIME_HINTS = ['pdf', 'msword', 'wordprocessingml', 'spreadsheetml', 'presentationml', 'ms-excel', 'ms-powerpoint', 'opendocument', 'rtf']

export function fileExtension(name: string | null | undefined): string {
  const n = (name || '').trim()
  const dot = n.lastIndexOf('.')
  if (dot <= 0 || dot === n.length - 1) return ''
  return n.slice(dot + 1).toLowerCase()
}

/** documents | images | other — from MIME type first, extension as the fallback. */
export function fileCategory(mime: string | null | undefined, name?: string | null): FileCategory {
  const m = (mime || '').toLowerCase()
  if (m.startsWith('image/')) return 'images'
  if (m.startsWith('text/') || DOC_MIME_HINTS.some((h) => m.includes(h))) return 'documents'
  const ext = fileExtension(name)
  if (IMAGE_EXTENSIONS.has(ext)) return 'images'
  if (DOC_EXTENSIONS.has(ext)) return 'documents'
  return 'other'
}

/** A short human label for the file type: the extension if there is one, else the MIME subtype. */
export function fileTypeLabel(mime: string | null | undefined, name?: string | null): string {
  const ext = fileExtension(name)
  if (ext) return ext.toUpperCase()
  const sub = (mime || '').split('/').pop() || ''
  return sub ? sub.toUpperCase() : 'FILE'
}

export function formatBytes(bytes: number | string | null | undefined): string | null {
  const n = Number(bytes)
  if (bytes === null || bytes === undefined || bytes === '' || !Number.isFinite(n) || n < 0) return null
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function formatDate(value: string | null | undefined): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export interface FileLike {
  id: string
  name: string
  type: string | null
  projectId: string | null
}

export interface ProjectLike {
  id: string
  name: string
  code: string | null
}

export const GENERAL_LABEL = 'General'

export function projectLabel(projectId: string | null, projects: ProjectLike[]): string {
  if (!projectId) return GENERAL_LABEL
  const match = projects.find((p) => p.id === projectId)
  return match?.name || match?.code || 'Project'
}

/** Case-insensitive match on file name, project name/code, or MIME type. Empty query matches all. */
export function matchesSearch(file: FileLike, query: string, projects: ProjectLike[]): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const project = projects.find((p) => p.id === file.projectId)
  const hay = [file.name, project?.name, project?.code, file.projectId ? null : GENERAL_LABEL, file.type, fileTypeLabel(file.type, file.name)]
  return hay.some((h) => (h || '').toLowerCase().includes(q))
}

/** 'all' | a project id | 'general' (files with no project). */
export type ProjectFilter = string

export function matchesProject(file: FileLike, filter: ProjectFilter): boolean {
  if (filter === 'all') return true
  if (filter === 'general') return !file.projectId
  return file.projectId === filter
}

export interface FileGroup<T> {
  key: string
  label: string
  files: T[]
}

/** Group files by their existing project relation, keeping the order of first appearance. */
export function groupByProject<T extends FileLike>(files: T[], projects: ProjectLike[]): FileGroup<T>[] {
  const order: string[] = []
  const map = new Map<string, FileGroup<T>>()
  for (const f of files) {
    const key = f.projectId || 'general'
    if (!map.has(key)) {
      map.set(key, { key, label: projectLabel(f.projectId, projects), files: [] })
      order.push(key)
    }
    map.get(key)!.files.push(f)
  }
  return order.map((k) => map.get(k)!)
}
