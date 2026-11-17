// src/lib/activity/activity.ts
//
// SERVER-ONLY. The one writer for activity_events from application code (the request RPCs write their own
// events inside their transactions). Append-only by design: this module can only INSERT, and the table
// refuses UPDATE / DELETE / TRUNCATE at the database as well.
//
// Never throws, never blocks the action it records: a failed event is logged (SQLSTATE only) and reported as
// null. Idempotent when a dedupeKey is given — a retry of the same logical event collapses onto one row.
//
// METADATA IS NOT A PLACE FOR SECRETS. It accepts only small scalar values; anything else is dropped, and
// string values are length-capped. Callers pass ids and status words, never message bodies, tokens or emails.

if (typeof window !== 'undefined') {
  throw new Error('activity.ts is server-only and must not be imported by client code')
}

export type ActivityVisibility = 'client' | 'internal'

export interface ActivityInput {
  clientId?: string | null
  projectId?: string | null
  requestId?: string | null
  actorUserId?: string | null
  actorRole: 'client' | 'admin' | 'system'
  entityType: string
  entityId?: string | null
  action: string
  summary: string
  metadata?: Record<string, unknown>
  visibility: ActivityVisibility
  dedupeKey?: string | null
}

export function sanitizeMetadata(input: Record<string, unknown> | undefined): Record<string, string | number | boolean | null> {
  const out: Record<string, string | number | boolean | null> = {}
  if (!input) return out
  for (const [k, v] of Object.entries(input).slice(0, 12)) {
    if (!/^[a-z_]{1,30}$/.test(k)) continue
    if (v === null || typeof v === 'boolean' || (typeof v === 'number' && Number.isFinite(v))) out[k] = v as never
    else if (typeof v === 'string') out[k] = v.slice(0, 120)
  }
  return out
}

export async function recordActivity(db: any, e: ActivityInput): Promise<string | null> {
  try {
    const { data, error } = await db
      .from('activity_events')
      .insert({
        client_id: e.clientId ?? null,
        project_id: e.projectId ?? null,
        request_id: e.requestId ?? null,
        actor_user_id: e.actorUserId ?? null,
        actor_role: e.actorRole,
        entity_type: e.entityType,
        entity_id: e.entityId ?? null,
        action: e.action,
        summary: e.summary.slice(0, 300),
        metadata: sanitizeMetadata(e.metadata),
        visibility: e.visibility,
        dedupe_key: e.dedupeKey ?? null,
      })
      .select('id')
      .single()

    if (error) {
      if ((error as { code?: string }).code === '23505' && e.dedupeKey) {
        const { data: existing } = await db.from('activity_events').select('id').eq('dedupe_key', e.dedupeKey).maybeSingle()
        return (existing?.id as string | undefined) ?? null
      }
      console.error(`[activity] insert failed (code=${(error as { code?: string }).code ?? 'n/a'})`)
      return null
    }
    return (data?.id as string | undefined) ?? null
  } catch {
    console.error('[activity] unexpected error')
    return null
  }
}
