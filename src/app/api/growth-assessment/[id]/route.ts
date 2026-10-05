// src/app/api/growth-assessment/[id]/route.ts
//
// GET   — one growth assessment with its merchant and review.
// PATCH — set an assessment's `status` and/or `review_status`.
//
// ADMIN ONLY. Both handlers previously ran with no authentication on a
// service-role client, so anyone holding an assessment id — which the public
// POST /api/growth-assessment returns to every submitter — could read the
// joined merchant and internal review, and change workflow status.
//
// Both now go through requireActiveAdmin() before anything else: session, then
// the signed 2FA cookie, then active admin membership. The request body and the
// id are not even looked at until that passes, and the service-role client used
// for the assessment operation is the one the gate hands back.

import { NextRequest, NextResponse } from 'next/server'
import { requireActiveAdmin, ADMIN_UUID_RE } from '@/lib/admin-api-auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const supabase = auth.db

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!ADMIN_UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    let body: any
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }
    const { status, review_status } = body

    if (!status && !review_status) {
      return NextResponse.json(
        { error: 'Status or review_status is required' },
        { status: 400 }
      )
    }

    // Build update object
    const updates: any = {
      updated_at: new Date().toISOString()
    }
    
    if (status) {
      const allowedStatuses = [
        'New Submission',
        'Under Review',
        'Growth Profile Issued',
        'Opportunity Review Candidate',
        'Opportunity Review Sent',
        'Growth Support Eligible',
        'Growth Partner',
        'Client',
        'Archived'
      ]

      if (!allowedStatuses.includes(status)) {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        )
      }
      updates.status = status
    }

    if (review_status) {
      const allowedReviewStatuses = ['pending', 'in_review', 'reviewed', 'approved', 'rejected']
      if (!allowedReviewStatuses.includes(review_status)) {
        return NextResponse.json(
          { error: 'Invalid review_status value' },
          { status: 400 }
        )
      }
      updates.review_status = review_status
      
      // If approved, update merchant status
      if (review_status === 'approved') {
        updates.reviewed_at = new Date().toISOString()
        
        // Get merchant_id to update status
        const { data: assessment } = await supabase
          .from('growth_assessments')
          .select('merchant_id')
          .eq('id', id)
          .single()
        
        if (assessment) {
          await supabase
            .from('merchant_status')
            .upsert({
              merchant_id: assessment.merchant_id,
              status: 'review_in_progress',
              last_activity: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }, { onConflict: 'merchant_id' })
        }
      }
    }

    const { data, error } = await supabase
      .from('growth_assessments')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assessment:', error)
      return NextResponse.json(
        { error: 'Failed to update assessment' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        status: data.status,
        review_status: data.review_status,
        updated_at: data.updated_at
      }
    })

  } catch (error) {
    console.error('Assessment update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const supabase = auth.db

    const id = typeof params?.id === 'string' ? params.id.trim() : ''
    if (!ADMIN_UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 })
    }

    const { data, error } = await supabase
      .from('growth_assessments')
      .select(`
        *,
        merchant:merchants(*),
        review:growth_reviews(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching assessment:', error)
      return NextResponse.json(
        { error: 'Assessment not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data
    })

  } catch (error) {
    console.error('Assessment fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}