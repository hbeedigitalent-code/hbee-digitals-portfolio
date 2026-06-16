// src/app/api/growth-assessment/[id]/route.ts
// No 'use client' needed - API route

import { NextRequest, NextResponse } from 'next/server'

// Lazy initialize Supabase client
let supabaseAdmin: any = null

function getSupabaseAdmin() {
  if (supabaseAdmin) return supabaseAdmin
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn('Supabase environment variables are not set')
    return null
  }
  
  // Dynamic import to avoid build-time issues
  const { createClient } = require('@supabase/supabase-js')
  supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  return supabaseAdmin
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = getSupabaseAdmin()
  
  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase not configured - missing environment variables')
    return NextResponse.json(
      { error: 'Server configuration error. Please check environment variables.' },
      { status: 500 }
    )
  }

  try {
    const { id } = params
    const body = await request.json()
    const { status } = body

    if (!status) {
      return NextResponse.json(
        { error: 'Status is required' },
        { status: 400 }
      )
    }

    // Validate status is in allowed list
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

    // Update the assessment status
    const { data, error } = await supabase
      .from('growth_assessments')
      .update({ 
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating assessment status:', error)
      return NextResponse.json(
        { error: 'Failed to update assessment status' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        status: data.status,
        updated_at: data.updated_at
      }
    })

  } catch (error) {
    console.error('Assessment status update error:', error)
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
  const supabase = getSupabaseAdmin()
  
  // Check if Supabase is configured
  if (!supabase) {
    console.error('Supabase not configured - missing environment variables')
    return NextResponse.json(
      { error: 'Server configuration error. Please check environment variables.' },
      { status: 500 }
    )
  }

  try {
    const { id } = params

    const { data, error } = await supabase
      .from('growth_assessments')
      .select(`
        *,
        merchant:merchants(*)
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