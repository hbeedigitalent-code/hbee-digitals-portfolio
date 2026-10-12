// src/app/api/client-portal/project-requests/route.ts
//
// POST — submit a new project request for the CALLER's own client account.
//
// This moves the three writes the request form used to make from the BROWSER (under RLS, with a
// client_id the browser supplied) to the server, where the client is derived from the verified
// session and from nothing else. The body carries only { title, service, description }; a client_id,
// merchant id, status, progress or any other field in it is ignored.
//
// The business outcome is exactly the old flow, in the same order, with the same truthfulness:
//   1. insert the project_requests row (status 'open')
//   2. insert the projects row (status 'Pending Review', progress 0, same columns as before)
//   3. link the request to the project (project_requests.project_id)
// There is NO transaction — there never was. If step 1 fails nothing exists. If step 2 fails the
// request row is kept and the response says so (code 'project_failed'); no success is reported. If
// step 3 fails the project exists and is usable, so the response is a success with linkWarning:true.
// No schema change, no RPC.

import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { validateProjectRequest } from '@/lib/client-portal/project-request'

export const dynamic = 'force-dynamic'

let serviceRoleClient: any = null

function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) return null

  const { createClient } = require('@supabase/supabase-js')
  serviceRoleClient = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  return serviceRoleClient
}

export async function POST(request: Request) {
  try {
    const sessionClient = createServerSupabaseClient()
    const {
      data: { user },
    } = await sessionClient.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminClient = getServiceRoleClient()
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const body = await request.json().catch(() => null)
    const v = validateProjectRequest(body)
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })

    // The client comes from the session only. Two rows for one user is refused, not guessed.
    const { data: clientRows, error: clientError } = await adminClient
      .from('clients')
      .select('id')
      .eq('user_id', user.id)
      .limit(2)

    if (clientError) {
      console.error('[client-portal/project-requests] client lookup failed')
      return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
    }
    if (!clientRows || clientRows.length === 0) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    if (clientRows.length > 1) {
      console.error(`[client-portal/project-requests] ambiguous client ownership for user ${user.id}`)
      return NextResponse.json({ state: 'ambiguous', error: 'Your account needs a quick check before you can submit.' }, { status: 409 })
    }
    const clientId: string = clientRows[0].id

    // 1. The request row. Only columns that exist on project_requests.
    const { data: requestRow, error: requestError } = await adminClient
      .from('project_requests')
      .insert({
        client_id: clientId,
        title: v.value.title,
        description: v.value.description,
        status: 'open',
      })
      .select('id')
      .single()

    if (requestError || !requestRow) {
      console.error('❌ [client-portal/project-requests] request insert failed')
      return NextResponse.json({ error: 'Failed to submit request. Please try again.', code: 'request_failed' }, { status: 500 })
    }

    // 2. The project record. `projects` is shared with the portfolio side, whose `title` is NOT NULL,
    // while the portal reads `project_name`: both get the same value, exactly as the form did.
    const projectCode = `PROJ-${Date.now().toString().slice(-6)}`
    const { data: projectRow, error: projectError } = await adminClient
      .from('projects')
      .insert({
        client_id: clientId,
        project_id: projectCode,
        title: v.value.title,
        project_name: v.value.title,
        status: 'Pending Review',
        progress: 0,
        description: v.value.description,
        service_selected: v.value.service,
        start_date: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (projectError || !projectRow) {
      console.error('❌ [client-portal/project-requests] project insert failed')
      // The request row was saved, but the project — the thing the client actually needs — was not.
      // Report that truthfully; never a clean success.
      return NextResponse.json(
        {
          error:
            'Your request was saved, but we could not create the project record. Please contact support so we can finish setting it up.',
          code: 'project_failed',
        },
        { status: 500 },
      )
    }

    // 3. Back-reference from the request to its project (best effort, as before).
    const { error: linkError } = await adminClient
      .from('project_requests')
      .update({ project_id: projectRow.id })
      .eq('id', requestRow.id)
      .eq('client_id', clientId)

    if (linkError) {
      console.error('⚠️ [client-portal/project-requests] request->project link failed')
    }

    return NextResponse.json({ ok: true, linkWarning: !!linkError })
  } catch (error) {
    console.error('❌ Client project request error:', error)
    return NextResponse.json({ error: 'Failed to submit request. Please try again.' }, { status: 500 })
  }
}
