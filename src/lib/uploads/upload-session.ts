// src/lib/uploads/upload-session.ts
//
// SERVER-ONLY. Authorization, path selection and stored-object verification for
// the single signed-TUS upload transport.
//
// The security model, in one line: the browser never chooses where a file
// lands, and never proves where it landed.
//
//   initiate  -> the server authorizes the target, CHOOSES the object path,
//                persists an upload_sessions row binding that path to the
//                verified uploader and the client/project/proposal it belongs
//                to, and issues a signed upload token scoped to that one path.
//   upload    -> the browser PATCHes bytes to Supabase's TUS endpoint using
//                that token in `x-signature`. No service-role key, no JWT, no
//                choice of destination.
//   finalize  -> the browser sends UPLOAD IDs ONLY. The server re-reads the
//                stored row, re-checks authorization, verifies the real object
//                in Storage, and commits the metadata row inside a single
//                database transaction (the finalize_upload function).
//
// A client-supplied object path, bucket, client_id, project_id, file_url or
// uploaded_by value is never read by any of this. There is nowhere to put one.

import { randomUUID } from 'crypto'
import { cookies } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ADMIN_2FA_COOKIE_NAME, verifyAdmin2FACookie } from '@/lib/admin-2fa-cookie'
import { getPrivilegedClient } from '@/lib/admin-api-auth'
import {
  UPLOAD_SPECS,
  UPLOAD_SESSION_TTL_HOURS,
  verifyStoredMetadata,
  type UploadContext,
  type ValidatedUploadMetadata,
} from '@/lib/uploads/upload-config'

if (typeof window !== 'undefined') {
  throw new Error('upload-session.ts is server-only and must not be imported by client code')
}

export const UPLOAD_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UPLOAD_UUID_RE.test(value.trim())
}

// ---------------------------------------------------------------------------
// Authorization
// ---------------------------------------------------------------------------

export type UploaderRole = 'admin' | 'client'

export interface UploadBinding {
  context: UploadContext
  bucket: string
  uploaderUserId: string
  uploaderRole: UploaderRole
  /** clients.id — always resolved server-side, never supplied. */
  clientId: string | null
  /** projects.id (UUID). NULL means a client-level file with no project. */
  projectId: string | null
  /** proposals.id */
  proposalId: string | null
  /** The directory every object for this binding must live under. */
  pathScope: string
  db: any
}

export type AuthorizeFailure = {
  ok: false
  status: 401 | 403 | 404 | 500
  error: string
}

export type AuthorizeResult = { ok: true; binding: UploadBinding } | AuthorizeFailure

export interface UploadTargetInput {
  context: UploadContext
  proposalId?: unknown
  projectId?: unknown
  /**
   * ADMIN ONLY. Names the client whose workspace an admin is uploading into.
   * Its presence selects the admin gate; its absence selects the client gate.
   */
  onBehalfOfClientId?: unknown
}

const DENY_AUTH: AuthorizeFailure = { ok: false, status: 401, error: 'Not authenticated' }
const DENY_NOT_FOUND: AuthorizeFailure = { ok: false, status: 404, error: 'Not found' }
const DENY_CONFIG: AuthorizeFailure = {
  ok: false,
  status: 500,
  error: 'Server configuration error',
}

/**
 * The admin gate, in the established order: session -> user-bound 2FA -> active
 * admin row. The 2FA check runs BEFORE any admin_users query and returns the
 * SAME generic 401 as a missing session, so a signed-in non-admin cannot tell
 * the two apart. A membership lookup ERROR denies (fail closed).
 *
 * Deliberately duplicated from admin-api-auth.requireActiveAdmin() in shape
 * only: that helper returns a NextResponse, and this module needs a status code
 * it can fold into a per-context result.
 */
async function requireAdminIdentity(): Promise<
  { ok: true; userId: string; db: any } | AuthorizeFailure
> {
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) return DENY_AUTH

  const verified = await verifyAdmin2FACookie(
    cookies().get(ADMIN_2FA_COOKIE_NAME)?.value,
    user.id,
  )
  if (!verified) return DENY_AUTH

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[uploads] privileged client unavailable')
    return DENY_CONFIG
  }

  const { data: adminRow, error } = await db
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle()

  if (error) {
    console.error(
      `[uploads] admin membership lookup failed (code=${
        (error as { code?: string }).code ?? 'n/a'
      }) — denied`,
    )
    return { ok: false, status: 403, error: 'Not authorized' }
  }
  if (!adminRow) return { ok: false, status: 403, error: 'Not authorized' }

  return { ok: true, userId: user.id, db }
}

/**
 * Resolves the caller's own client account from their session.
 *
 * AMBIGUITY IS REFUSED, NOT GUESSED — the same rule the growth-profile endpoint
 * uses. More than one clients row for a user id means the account link is not
 * trustworthy, and no upload is authorized against a guess.
 */
async function requireClientIdentity(): Promise<
  { ok: true; userId: string; clientId: string; db: any } | AuthorizeFailure
> {
  const sessionClient = createServerSupabaseClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()
  if (!user) return DENY_AUTH

  const db = getPrivilegedClient()
  if (!db) {
    console.error('[uploads] privileged client unavailable')
    return DENY_CONFIG
  }

  const { data: rows, error } = await db
    .from('clients')
    .select('id')
    .eq('user_id', user.id)
    .limit(2)

  if (error) {
    console.error(
      `[uploads] client lookup failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
    )
    return { ok: false, status: 403, error: 'Not authorized' }
  }
  if (!rows || rows.length === 0) {
    return { ok: false, status: 403, error: 'No client account is linked to this login.' }
  }
  if (rows.length > 1) {
    console.error(`[uploads] ambiguous client link for user ${user.id} — refused`)
    return { ok: false, status: 403, error: 'Your account needs attention. Please contact us.' }
  }

  return { ok: true, userId: user.id, clientId: rows[0].id, db }
}

/**
 * Authorizes an upload target and returns the binding every session in the
 * batch is pinned to. Called at initiate AND again at finalize, so authorization
 * that has since been revoked cannot be used to commit a file.
 */
export async function authorizeUploadTarget(
  input: UploadTargetInput,
): Promise<AuthorizeResult> {
  const spec = UPLOAD_SPECS[input.context]
  if (!spec) return DENY_NOT_FOUND

  if (input.context === 'proposal') {
    const admin = await requireAdminIdentity()
    if (!admin.ok) return admin

    const proposalId = typeof input.proposalId === 'string' ? input.proposalId.trim() : ''
    if (!isUuid(proposalId)) return DENY_NOT_FOUND

    // client_id is copied from the STORED proposal — never from the request.
    const { data: proposal, error } = await admin.db
      .from('proposals')
      .select('id, client_id')
      .eq('id', proposalId)
      .maybeSingle()

    if (error) {
      console.error(
        `[uploads] proposal lookup failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
      )
      return { ok: false, status: 500, error: 'Failed to authorize upload' }
    }
    if (!proposal) return DENY_NOT_FOUND

    return {
      ok: true,
      binding: {
        context: 'proposal',
        bucket: spec.bucket,
        uploaderUserId: admin.userId,
        uploaderRole: 'admin',
        clientId: proposal.client_id ?? null,
        projectId: null,
        proposalId: proposal.id,
        pathScope: `${spec.pathPrefix}${proposal.id}/`,
        db: admin.db,
      },
    }
  }

  // context === 'client_file'
  //
  // TWO CALLERS, EXPLICITLY DISTINGUISHED.
  //
  //   * A client uploading their own file supplies no `onBehalfOfClientId`, and
  //     the client account is resolved from their session.
  //   * An admin uploading INTO a client's workspace supplies it explicitly, and
  //     must pass the full admin gate. This is the admin-dashboard entry point:
  //     without it an admin has no way to put a file in front of a client.
  //
  // The discriminator is the request field, never "whichever gate happens to
  // pass", so an admin who also has a portal account can never accidentally
  // upload into their own client record while intending to act as an admin.
  const onBehalfOf =
    typeof input.onBehalfOfClientId === 'string' ? input.onBehalfOfClientId.trim() : ''

  if (onBehalfOf) {
    const admin = await requireAdminIdentity()
    if (!admin.ok) return admin

    if (!isUuid(onBehalfOf)) return DENY_NOT_FOUND

    const { data: client, error } = await admin.db
      .from('clients')
      .select('id')
      .eq('id', onBehalfOf)
      .maybeSingle()

    if (error) {
      console.error(
        `[uploads] client lookup failed (code=${(error as { code?: string }).code ?? 'n/a'})`,
      )
      return { ok: false, status: 500, error: 'Failed to authorize upload' }
    }
    if (!client) return DENY_NOT_FOUND

    let adminProjectId: string | null = null
    const requested = typeof input.projectId === 'string' ? input.projectId.trim() : ''
    if (requested) {
      if (!isUuid(requested)) return DENY_NOT_FOUND
      // Same rule as for a client: the project must belong to THIS client.
      const { data: project } = await admin.db
        .from('projects')
        .select('id')
        .eq('id', requested)
        .eq('client_id', client.id)
        .maybeSingle()
      if (!project) return DENY_NOT_FOUND
      adminProjectId = project.id
    }

    return {
      ok: true,
      binding: {
        context: 'client_file',
        bucket: spec.bucket,
        uploaderUserId: admin.userId,
        uploaderRole: 'admin',
        clientId: client.id,
        projectId: adminProjectId,
        proposalId: null,
        pathScope: `${spec.pathPrefix}${client.id}/`,
        db: admin.db,
      },
    }
  }

  const client = await requireClientIdentity()
  if (!client.ok) return client

  let projectId: string | null = null
  const requestedProject =
    typeof input.projectId === 'string' ? input.projectId.trim() : ''

  if (requestedProject) {
    if (!isUuid(requestedProject)) return DENY_NOT_FOUND

    // THE BYPASS THIS CLOSES: a client-owned client_id combined with another
    // client's project UUID. The project must belong to the SAME client account
    // that this session resolved to, checked here and again by the database
    // constraint the migration adds.
    const { data: project, error } = await client.db
      .from('projects')
      .select('id')
      .eq('id', requestedProject)
      .eq('client_id', client.clientId)
      .maybeSingle()

    if (error) {
      console.error(
        `[uploads] project ownership check failed (code=${
          (error as { code?: string }).code ?? 'n/a'
        })`,
      )
      return { ok: false, status: 500, error: 'Failed to authorize upload' }
    }
    if (!project) {
      // Same response whether the project does not exist or belongs to someone
      // else — existence of another client's project is not disclosed.
      return DENY_NOT_FOUND
    }
    projectId = project.id
  }

  return {
    ok: true,
    binding: {
      context: 'client_file',
      bucket: spec.bucket,
      uploaderUserId: client.userId,
      uploaderRole: 'client',
      clientId: client.clientId,
      projectId,
      proposalId: null,
      // Path scope stays client-level even for a project file, matching the
      // existing `client-files/{clientId}/` convention that every signed-url
      // route already validates against.
      pathScope: `${spec.pathPrefix}${client.clientId}/`,
      db: client.db,
    },
  }
}

// ---------------------------------------------------------------------------
// Path selection
// ---------------------------------------------------------------------------

/**
 * The object path is derived entirely from the binding and a server-generated
 * UUID. The uploader's file name contributes only a sanitized suffix, so two
 * uploads of the same name can never collide or overwrite.
 */
export function buildObjectPath(
  binding: UploadBinding,
  uploadId: string,
  sanitizedFileName: string,
): string {
  return `${binding.pathScope}${uploadId}-${sanitizedFileName}`
}

/**
 * Defence in depth: a stored path is re-checked against its own binding before
 * the path is handed to Storage for verification or removal. A row whose path
 * has drifted outside its scope is never acted on.
 */
export function pathIsInScope(objectPath: string, pathScope: string): boolean {
  if (typeof objectPath !== 'string' || !objectPath.startsWith(pathScope)) return false
  if (objectPath.includes('..') || objectPath.includes('\\')) return false
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1F\x7F]/.test(objectPath)) return false
  return true
}

export function sessionExpiryIso(from: Date = new Date()): string {
  return new Date(from.getTime() + UPLOAD_SESSION_TTL_HOURS * 3600 * 1000).toISOString()
}

// ---------------------------------------------------------------------------
// Stored-object verification
// ---------------------------------------------------------------------------

export interface StoredObjectInfo {
  size: number
  mimeType: string | null
}

/**
 * Reads what Storage actually recorded for one exact object path.
 *
 * Prefers info(), which addresses the path directly. Falls back to list() with
 * an exact-name match for deployments whose Storage version has no info
 * endpoint. Returns null when the object genuinely is not there.
 */
export async function readStoredObject(
  db: any,
  bucket: string,
  objectPath: string,
): Promise<StoredObjectInfo | null> {
  try {
    const { data, error } = await db.storage.from(bucket).info(objectPath)
    if (!error && data && typeof data.size === 'number') {
      return { size: data.size, mimeType: data.contentType ?? null }
    }
  } catch {
    // fall through to list()
  }

  const lastSlash = objectPath.lastIndexOf('/')
  const dir = lastSlash >= 0 ? objectPath.slice(0, lastSlash) : ''
  const base = lastSlash >= 0 ? objectPath.slice(lastSlash + 1) : objectPath

  const { data: listed, error: listError } = await db.storage
    .from(bucket)
    .list(dir, { limit: 100, search: base })

  if (listError || !Array.isArray(listed)) return null

  const match = listed.find((entry: any) => entry?.name === base)
  if (!match) return null

  const meta = match.metadata || {}
  const size = typeof meta.size === 'number' ? meta.size : NaN
  if (!Number.isFinite(size)) return null

  return { size, mimeType: meta.mimetype ?? null }
}

export type VerifyResult = { ok: true } | { ok: false; reason: string }

/**
 * Confirms the exact stored object exists and still satisfies this context's
 * size and type restrictions, using Storage's own recorded values rather than
 * anything the client asserted.
 */
export async function verifyStoredObject(
  db: any,
  context: UploadContext,
  bucket: string,
  objectPath: string,
  declared: Pick<ValidatedUploadMetadata, 'size' | 'contentType' | 'extension'>,
): Promise<VerifyResult> {
  const stored = await readStoredObject(db, bucket, objectPath)
  if (!stored) return { ok: false, reason: 'object_not_found' }
  return verifyStoredMetadata(context, stored, declared)
}

/**
 * Issues a signed upload token for ONE server-selected path.
 *
 * `upsert` stays false: the path contains a fresh UUID, so a token can only
 * ever create a new object and can never overwrite an existing one — including
 * one belonging to a different upload session.
 */
export async function createSignedUploadToken(
  db: any,
  bucket: string,
  objectPath: string,
): Promise<{ ok: true; token: string } | { ok: false; reason: string }> {
  const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(objectPath)

  if (error || !data?.token) {
    console.error(
      `[uploads] createSignedUploadUrl failed for ${bucket} (code=${
        (error as { statusCode?: string })?.statusCode ?? 'n/a'
      })`,
    )
    return { ok: false, reason: 'signed_url_failed' }
  }

  return { ok: true, token: data.token }
}

/**
 * The TUS endpoint the browser PATCHes bytes to.
 *
 * The `/sign` suffix is required. `/upload/resumable` authenticates with a user
 * JWT in `Authorization`; `/upload/resumable/sign` is the variant that accepts
 * the signed upload token from createSignedUploadUrl() in `x-signature`. The
 * browser holds no JWT here, so it must be the signed variant — the unsigned
 * path is what produced the production 403 "Invalid Compact JWS".
 */
export function resumableEndpoint(): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!base) return null
  return `${base.replace(/\/+$/, '')}/storage/v1/upload/resumable/sign`
}

export function newUploadId(): string {
  return randomUUID()
}
