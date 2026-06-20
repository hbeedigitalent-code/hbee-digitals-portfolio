import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@/lib/supabase-client'
import { generateProjectId } from '@/lib/services/project-id-generator'
import { sendOnboardingConfirmation } from '@/lib/emails/onboarding-confirmation'
import { sendAdminOnboardingNotification } from '@/lib/emails/admin-onboarding-notification'

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { formData } = body

    // Use the service role key for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    // Create server-side client with service role
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate unique project ID
    const projectId = await generateProjectId()

    // Insert onboarding submission
    const { data: submission, error: submissionError } = await supabase
      .from('client_onboarding_submissions')
      .insert({
        project_id: projectId,
        full_name: formData.full_name,
        email: formData.email,
        whatsapp: formData.whatsapp,
        business_name: formData.business_name,
        website_url: formData.website_url,
        country: formData.country,
        industry: formData.industry,
        business_stage: formData.business_stage,
        monthly_revenue: formData.monthly_revenue,
        heard_about_us: formData.heard_about_us,
        services_required: formData.services_required,
        project_goal: formData.project_goal,
        main_challenge: formData.main_challenge,
        priority_1: formData.priority_1,
        priority_2: formData.priority_2,
        priority_3: formData.priority_3,
        target_outcome: formData.target_outcome,
        expected_deadline: formData.expected_deadline,
        budget_range: formData.budget_range,
        target_audience: formData.target_audience,
        traffic_sources: formData.traffic_sources,
        marketing_challenges: formData.marketing_challenges,
        competitors: formData.competitors,
        inspiration_websites: formData.inspiration_websites,
        email_platform: formData.email_platform,
        crm: formData.crm,
        brand_mission: formData.brand_mission,
        brand_values: formData.brand_values,
        brand_voice: formData.brand_voice,
        brand_colors: formData.brand_colors,
        brand_fonts: formData.brand_fonts,
        target_customer_profile: formData.target_customer_profile,
        existing_brand_guidelines: formData.existing_brand_guidelines,
        platform: formData.platform,
        needs_collaborator_access: formData.needs_collaborator_access,
        collaborator_request_code: formData.collaborator_request_code,
        staff_access_email: formData.staff_access_email,
        store_login_url: formData.store_login_url,
        access_instructions: formData.access_instructions,
        technical_notes: formData.technical_notes,
        decision_maker_name: formData.decision_maker_name,
        decision_maker_role: formData.decision_maker_role,
        decision_maker_email: formData.decision_maker_email,
        decision_maker_phone: formData.decision_maker_phone,
        team_members: formData.team_members,
        large_file_links: formData.large_file_links,
        additional_requests: formData.additional_requests,
        special_instructions: formData.special_instructions,
        success_metrics: formData.success_metrics,
        consent: formData.consent,
      })
      .select()
      .single()

    if (submissionError) {
      console.error('Submission error:', submissionError)
      return NextResponse.json(
        { error: 'Failed to save onboarding submission' },
        { status: 500 }
      )
    }

    // Send emails
    try {
      await sendOnboardingConfirmation(
        formData.full_name,
        formData.email,
        projectId
      )
      await sendAdminOnboardingNotification(
        formData.full_name,
        formData.business_name,
        formData.email,
        projectId
      )
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      submission_id: submission.id,
    })
  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit onboarding form. Please try again.' },
      { status: 500 }
    )
  }
}