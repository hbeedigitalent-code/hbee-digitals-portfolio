// src/lib/requests/thread-validation.ts
//
// Pure validation for the body of a thread POST. The caller's ROLE is never read from here — a client route
// passes 'client', an admin route passes 'admin', and nothing in a request body can change that. Anything in
// the body other than the fields below (author_role, client_id, user_id, is_internal on the client route …)
// is ignored by construction: only these fields are ever copied out.

export const MAX_MESSAGE_LENGTH = 5000
const KEY_RE = /^[A-Za-z0-9_-]{8,80}$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export interface ParsedMessage {
  body: string
  clientKey: string | null
  attachmentFileId: string | null
  /** Only meaningful on the ADMIN route. The client route never reads it. */
  internal: boolean
}

export function parseMessageBody(raw: unknown, opts: { allowInternal: boolean }): { ok: true; value: ParsedMessage } | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, error: 'Invalid request.' }
  const b = raw as Record<string, unknown>

  const body = typeof b.body === 'string' ? b.body.replace(/\r\n/g, '\n').trim() : ''
  if (!body) return { ok: false, error: 'Write a message first.' }
  if (body.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Messages are limited to ${MAX_MESSAGE_LENGTH} characters.` }
  }
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(body)) return { ok: false, error: 'The message contains characters that are not allowed.' }

  let clientKey: string | null = null
  if (b.clientKey !== undefined && b.clientKey !== null) {
    if (typeof b.clientKey !== 'string' || !KEY_RE.test(b.clientKey)) return { ok: false, error: 'Invalid request.' }
    clientKey = b.clientKey
  }

  let attachmentFileId: string | null = null
  if (b.attachmentFileId !== undefined && b.attachmentFileId !== null) {
    if (typeof b.attachmentFileId !== 'string' || !UUID_RE.test(b.attachmentFileId)) return { ok: false, error: 'Invalid request.' }
    attachmentFileId = b.attachmentFileId
  }

  return { ok: true, value: { body, clientKey, attachmentFileId, internal: opts.allowInternal && b.internal === true } }
}
