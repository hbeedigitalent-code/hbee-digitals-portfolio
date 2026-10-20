import { NextResponse } from 'next/server'
import { ADMIN_UUID_RE, queryFailure, requireActiveAdmin } from '@/lib/admin-api-auth'
import { normalizedEmail } from '@/lib/footer-settings'

export const dynamic = 'force-dynamic'
const TABLE = 'newsletter_subscribers'
const COLUMNS = 'id,name,email,phone,source,tags,segment,status,last_opened_at,last_clicked_at,created_at,consent_given_at,consent_source,consent_version'
const AUDIENCES = ['all_subscribers', 'all_leads', 'existing_clients', 'shopify_leads', 'ecommerce_merchants']
const PAGE_SIZE = 500
const MAX_BODY = 262_144

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status })
}

async function mutationBody(request: Request): Promise<Record<string, unknown> | null> {
  if (request.headers.get('origin') !== new URL(request.url).origin || request.headers.get('sec-fetch-site') === 'cross-site') return null
  if (!request.headers.get('content-type')?.includes('application/json') || Number(request.headers.get('content-length') || 0) > MAX_BODY) return null
  const text = await request.text()
  if (text.length > MAX_BODY) return null
  try {
    const value = JSON.parse(text)
    return value && typeof value === 'object' && !Array.isArray(value) ? value : null
  } catch { return null }
}

function optionalText(value: unknown, max: number): string | null {
  if (value == null || value === '') return null
  if (typeof value !== 'string' || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw Error('Invalid subscriber text.')
  return value.trim() || null
}

function subscriberPayload(raw: unknown, source: 'manual' | 'csv_import') {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error('Invalid subscriber.')
  const row = raw as Record<string, unknown>
  const email = normalizedEmail(row.email, true)
  if (!email) throw Error('Enter a valid email address.')
  const tags = row.tags ?? []
  if (!Array.isArray(tags) || tags.length > 25 || tags.some(tag => typeof tag !== 'string' || !tag.trim() || tag.length > 80 || /[\u0000-\u001f\u007f]/.test(tag))) throw Error('Use up to 25 plain tags of 80 characters each.')
  const segment = row.segment ?? 'lead'
  if (typeof segment !== 'string' || !['lead', 'client', 'partner'].includes(segment)) throw Error('Invalid subscriber segment.')
  // These records have no evidence of public opt-in. Never invent consent.
  return { email, name: optionalText(row.name, 200), phone: optionalText(row.phone, 80), tags: [...new Set(tags.map(tag => tag.trim()))], segment, source, status: 'active' }
}

/** Small CSV dialect used by the existing editor: email,name,tags; quoted cells supported. */
function parseCsv(csv: unknown) {
  if (typeof csv !== 'string' || !csv.trim() || csv.length > 240_000) throw Error('Paste up to 500 subscriber rows.')
  const rows: string[][] = []
  let cells: string[] = [], cell = '', quoted = false, closed = false
  const pushCell = () => { cells.push(cell); cell = ''; closed = false }
  const pushRow = () => {
    pushCell()
    if (cells.some(value => value.trim())) rows.push(cells)
    cells = []
    if (rows.length > 500) throw Error('Import at most 500 rows at a time.')
  }
  for (let i = 0; i < csv.length; i++) {
    const char = csv[i]
    if (quoted) {
      if (char === '"' && csv[i + 1] === '"') { cell += '"'; i++ }
      else if (char === '"') { quoted = false; closed = true }
      else cell += char
    } else if (char === '"' && !cell.trim() && !closed) { cell = ''; quoted = true }
    else if (char === ',') pushCell()
    else if (char === '\n' || char === '\r') { if (char === '\r' && csv[i + 1] === '\n') i++; pushRow() }
    else if (closed && char !== ' ') throw Error('Invalid CSV quoting.')
    else cell += char
  }
  if (quoted) throw Error('Close the quoted CSV field.')
  pushRow()
  if (!rows.length) throw Error('Paste at least one subscriber row.')
  return rows.map((cells, index) => {
    if (cells.length > 3) throw Error(`Row ${index + 1}: use email, name, tags.`)
    const [email, name, rawTags] = cells
    try { return subscriberPayload({ email, name, tags: rawTags ? rawTags.split(';').map(tag => tag.trim()).filter(Boolean) : [] }, 'csv_import') }
    catch (error) { throw Error(`Row ${index + 1}: ${(error as Error).message}`) }
  })
}

export async function GET(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const params = new URL(request.url).searchParams
    const mode = params.get('mode') || 'list', audience = params.get('audience') || 'all_subscribers'
    if (!['list', 'count'].includes(mode) || !AUDIENCES.includes(audience)) return bad('Unsupported subscriber filter.')
    if (mode === 'count') {
      let query = auth.db.from(TABLE).select('id', { count: 'exact', head: true }).eq('status', 'active')
      if (audience === 'all_leads') query = query.eq('segment', 'lead')
      if (audience === 'existing_clients') query = query.eq('segment', 'client')
      if (audience === 'shopify_leads') query = query.contains('tags', ['shopify'])
      if (audience === 'ecommerce_merchants') query = query.contains('tags', ['ecommerce'])
      const { count, error } = await query
      if (error) return queryFailure('subscriber count', error)
      if (!Number.isInteger(count) || count < 0) return bad('Subscriber count is unavailable.', 500)
      return NextResponse.json({ count }, { headers: { 'Cache-Control': 'no-store' } })
    }
    const pageText = params.get('page') || '0'
    if (!/^\d{1,6}$/.test(pageText)) return bad('Invalid subscriber page.')
    const page = Number(pageText)
    const { data, error } = await auth.db.from(TABLE).select(COLUMNS).order('created_at', { ascending: false, nullsFirst: false }).order('id', { ascending: true }).range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
    if (error) return queryFailure('subscriber list', error)
    return NextResponse.json({ subscribers: data || [], has_more: (data || []).length === PAGE_SIZE }, { headers: { 'Cache-Control': 'no-store' } })
  } catch { return bad('Subscriber data could not be loaded.', 500) }
}

export async function POST(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const body = await mutationBody(request)
    if (!body) return bad('Use a same-origin JSON subscriber request.', 403)
    let rows: ReturnType<typeof subscriberPayload>[]
    try {
      if (body.action === 'manual') rows = [subscriberPayload(body.subscriber, 'manual')]
      else if (body.action === 'import') rows = parseCsv(body.csv)
      else return bad('Unsupported subscriber action.')
    } catch (error) { return bad((error as Error).message) }
    let inserted = 0, skipped = 0
    for (const row of rows) {
      // Normalized lookup catches historical capitalization/ASCII edge spaces.
      const existing = await auth.db.rpc('newsletter_subscriber_identity', { p_email: row.email }).maybeSingle()
      if (existing.error) return bad(`Import stopped. Added ${inserted}; skipped ${skipped}. Please retry.`, 503)
      if (existing.data?.id) { skipped++; continue }
      const result = await auth.db.from(TABLE).insert(row).select('id').single()
      if (result.error?.code === '23505') {
        // A concurrent subscription is skipped only if its identity is confirmed.
        const raced = await auth.db.rpc('newsletter_subscriber_identity', { p_email: row.email }).maybeSingle()
        if (!raced.error && raced.data?.id) { skipped++; continue }
      }
      if (result.error || !result.data?.id) return bad(`Save stopped. Added ${inserted}; skipped ${skipped}. Please retry.`, 503)
      inserted++
    }
    if (body.action === 'manual' && skipped) return bad('This email already exists; its stored status and consent were not changed.', 409)
    return NextResponse.json({ inserted, skipped })
  } catch { return bad('Subscriber save failed. Please retry.', 500) }
}

export async function PATCH(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const body = await mutationBody(request)
    if (!body) return bad('Use a same-origin JSON subscriber request.', 403)
    if (typeof body.id !== 'string' || !ADMIN_UUID_RE.test(body.id) || typeof body.status !== 'string' || !['active', 'unsubscribed', 'bounced'].includes(body.status)) return bad('Choose a valid subscriber and status.')
    // The preexisting explicit admin status control is retained, never public.
    const { data, error } = await auth.db.from(TABLE).update({ status: body.status }).eq('id', body.id).select('id').maybeSingle()
    if (error) return bad('Subscriber status could not be saved.', 500)
    return data?.id ? NextResponse.json({ success: true }) : bad('Subscriber not found.', 404)
  } catch { return bad('Subscriber status could not be saved.', 500) }
}

export async function DELETE(request: Request) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const body = await mutationBody(request)
    if (!body) return bad('Use a same-origin JSON subscriber request.', 403)
    if (typeof body.id !== 'string' || !ADMIN_UUID_RE.test(body.id)) return bad('Choose a valid subscriber.')
    const { data, error } = await auth.db.from(TABLE).delete().eq('id', body.id).select('id').maybeSingle()
    if (error) return bad('Subscriber could not be deleted.', 500)
    return data?.id ? NextResponse.json({ success: true }) : bad('Subscriber not found.', 404)
  } catch { return bad('Subscriber could not be deleted.', 500) }
}
