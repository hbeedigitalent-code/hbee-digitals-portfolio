// src/lib/client-portal/deliverable-link.ts
//
// Decides what a project_deliverables.file_url may be turned into for a client. There is no
// writer for that column in the repo, so its content is untrusted: it may be a project-files
// storage URL, a bare object path, or an arbitrary external link. The old page rendered it
// raw as <a href>. This resolver classifies it so a SERVER route can answer with either a
// short-lived signed URL (our storage) or, for a plain external https link, that link — and
// never anything else. Every return is a validated shape or null (fail closed).
//
//   storage   an object in THIS project's `project-files` bucket (public URL for this
//             Supabase project, or a bare path) -> the caller signs it.
//   external  an https URL that is not on our storage host. We cannot secure it; it is only
//             handed to the deliverable's own client, and never executable (no javascript:,
//             data:, http:, no embedded credentials).
//   null      anything else: other buckets/hosts of our own Supabase project, traversal,
//             malformed encoding, or another client's `client-files/` area.

const PROJECT_FILES_BUCKET = 'project-files'
const CLIENT_PREFIX = 'client-files/'

export type DeliverableLink =
  | { kind: 'storage'; path: string }
  | { kind: 'external'; url: string }

function decodeSafely(value: string): string | null {
  try {
    return decodeURIComponent(value)
  } catch {
    return null
  }
}

function safeObjectPath(path: string, clientId: string): string | null {
  if (!path) return null
  if (path.startsWith('/') || path.includes('..') || path.includes('\\')) return null
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(path)) return null
  // Another client's uploads are never reachable through a deliverable row.
  if (path.startsWith(CLIENT_PREFIX) && !path.startsWith(`${CLIENT_PREFIX}${clientId}/`)) return null
  return path
}

export function resolveDeliverableLink(
  fileUrl: unknown,
  clientId: string,
  supabaseUrl: string | undefined,
): DeliverableLink | null {
  if (typeof fileUrl !== 'string') return null
  const raw = fileUrl.trim()
  if (!raw) return null

  if (/^[a-z][a-z0-9+.-]*:/i.test(raw) && !/^https?:\/\//i.test(raw)) return null // javascript:, data:, file: …

  if (/^https?:\/\//i.test(raw)) {
    let u: URL
    try {
      u = new URL(raw)
    } catch {
      return null
    }
    if (supabaseUrl) {
      const base = supabaseUrl.replace(/\/+$/, '')
      const publicMarker = `${base}/storage/v1/object/public/${PROJECT_FILES_BUCKET}/`
      if (raw.startsWith(publicMarker)) {
        const decoded = decodeSafely(raw.slice(publicMarker.length).split('?')[0])
        const path = decoded === null ? null : safeObjectPath(decoded, clientId)
        return path ? { kind: 'storage', path } : null
      }
      // Any other URL on our own storage host (other bucket, signed/private form) is not passed through.
      if (u.host === new URL(base).host && u.pathname.startsWith('/storage/')) return null
    }
    if (u.protocol !== 'https:' || u.username || u.password) return null
    return { kind: 'external', url: u.toString() }
  }

  const decoded = decodeSafely(raw)
  const path = decoded === null ? null : safeObjectPath(decoded, clientId)
  return path ? { kind: 'storage', path } : null
}
