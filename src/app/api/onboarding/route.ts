// src/app/api/onboarding/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClientComponentClient } from '@/lib/supabase-client'
import { generateProjectId } from '@/lib/services/project-id-generator'
import { sendOnboardingConfirmation } from '@/lib/emails/onboarding-confirmation'
import { sendAdminOnboardingNotification } from '@/lib/emails/admin-onboarding-notification'

export async function POST(req: Request) {
  try {
    // Parse FormData instead of JSON to handle files
    const formData = await req.formData()
    const data = JSON.parse(formData.get('data') as string)
    const uploadedFiles = formData.getAll('files') as File[]

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase credentials missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate unique project ID
    const projectId = await generateProjectId()

    // Insert onboarding submission
    const { data: submission, error: submissionError } = await supabase
      .from('client_onboarding_submissions')
      .insert({
        project_id: projectId,
        full_name: data.full_name,
        email: data.email,
        whatsapp: data.whatsapp,
        business_name: data.business_name,
        website_url: data.website_url,
        country: data.country,
        industry: data.industry,
        business_stage: data.business_stage,
        monthly_revenue: data.monthly_revenue,
        heard_about_us: data.heard_about_us,
        services_required: data.services_required,
        project_goal: data.project_goal,
        main_challenge: data.main_challenge,
        priority_1: data.priority_1,
        priority_2: data.priority_2,
        priority_3: data.priority_3,
        target_outcome: data.target_outcome,
        expected_deadline: data.expected_deadline,
        budget_range: data.budget_range,
        target_audience: data.target_audience,
        traffic_sources: data.traffic_sources,
        marketing_challenges: data.marketing_challenges,
        competitors: data.competitors,
        inspiration_websites: data.inspiration_websites,
        email_platform: data.email_platform,
        crm: data.crm,
        brand_mission: data.brand_mission,
        brand_values: data.brand_values,
        brand_voice: data.brand_voice,
        brand_colors: data.brand_colors,
        brand_fonts: data.brand_fonts,
        target_customer_profile: data.target_customer_profile,
        existing_brand_guidelines: data.existing_brand_guidelines,
        platform: data.platform,
        needs_collaborator_access: data.needs_collaborator_access,
        collaborator_request_code: data.collaborator_request_code,
        staff_access_email: data.staff_access_email,
        store_login_url: data.store_login_url,
        access_instructions: data.access_instructions,
        technical_notes: data.technical_notes,
        decision_maker_name: data.decision_maker_name,
        decision_maker_role: data.decision_maker_role,
        decision_maker_email: data.decision_maker_email,
        decision_maker_phone: data.decision_maker_phone,
        team_members: data.team_members,
        large_file_links: data.large_file_links,
        additional_requests: data.additional_requests,
        special_instructions: data.special_instructions,
        success_metrics: data.success_metrics,
        consent: data.consent,
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

    // Upload files to Supabase Storage
    const uploadedFileRecords = []
    
    if (uploadedFiles && uploadedFiles.length > 0) {
      for (const file of uploadedFiles) {
        try {
          // Create a unique file path
          const fileExtension = file.name.split('.').pop()
          const fileName = `${Date.now()}-${file.name}`
          const filePath = `${projectId}/${fileName}`

          // Upload to Supabase Storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('onboarding-files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('Upload error for file:', file.name, uploadError)
            continue
          }

          // Get public URL
          const { data: urlData } = supabase.storage
            .from('onboarding-files')
            .getPublicUrl(filePath)

          // Save file record to database
          const { data: fileRecord, error: fileError } = await supabase
            .from('client_onboarding_files')
            .insert({
              submission_id: submission.id,
              project_id: projectId,
              file_name: file.name,
              file_url: urlData.publicUrl,
              file_type: file.type || 'application/octet-stream',
              file_size: file.size,
              category: 'Onboarding Files',
            })
            .select()
            .single()

          if (!fileError && fileRecord) {
            uploadedFileRecords.push(fileRecord)
          }
        } catch (fileError) {
          console.error('Error processing file:', file.name, fileError)
        }
      }
    }

    // Send emails
    try {
      await sendOnboardingConfirmation(
        data.full_name,
        data.email,
        projectId
      )
      await sendAdminOnboardingNotification(
        data.full_name,
        data.business_name,
        data.email,
        projectId
      )
    } catch (emailError) {
      console.error('Email error:', emailError)
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      submission_id: submission.id,
      uploaded_files: uploadedFileRecords,
    })
  } catch (error) {
    console.error('Onboarding submission error:', error)
    return NextResponse.json(
      { error: 'Failed to submit onboarding form. Please try again.' },
      { status: 500 }
    )
  }
}