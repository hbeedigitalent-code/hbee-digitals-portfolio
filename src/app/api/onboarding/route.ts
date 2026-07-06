// src/app/api/onboarding/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
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

    // Check if this is the new 5-step format or old 9-step format
    const isNewFormat = data.project_title !== undefined

    let insertData: any = {}

    if (isNewFormat) {
      // NEW 5-STEP FORMAT
      insertData = {
        project_id: projectId,
        // Step 1: Project Details
        project_title: data.project_title,
        business_name: data.business_name,
        website_url: data.website_url || null,
        service_needed: data.service_needed,
        project_goals: data.project_goals,
        
        // Step 2: Timeline & Budget
        preferred_timeline: data.preferred_timeline,
        budget_range: data.budget_range,
        main_challenge: data.main_challenge || null,
        
        // Step 3: Brand Assets (files handled separately)
        
        // Step 4: Contact Information
        full_name: data.full_name,
        email: data.email,
        whatsapp: data.whatsapp,
        communication_method: data.communication_method,
        notes: data.notes || null,
        
        // Step 5: Review & Submit
        consent: data.consent,
        status: 'Pending Review',
        
        // Set legacy fields to null for compatibility
        country: null,
        industry: null,
        business_stage: null,
        monthly_revenue: null,
        heard_about_us: null,
        services_required: [],
        project_goal: null,
        priority_1: null,
        priority_2: null,
        priority_3: null,
        target_outcome: null,
        expected_deadline: null,
        target_audience: null,
        traffic_sources: [],
        marketing_challenges: null,
        competitors: [],
        inspiration_websites: [],
        email_platform: null,
        crm: null,
        brand_mission: null,
        brand_values: null,
        brand_voice: null,
        brand_colors: null,
        brand_fonts: null,
        target_customer_profile: null,
        existing_brand_guidelines: null,
        platform: null,
        needs_collaborator_access: null,
        collaborator_request_code: null,
        staff_access_email: null,
        store_login_url: null,
        access_instructions: null,
        technical_notes: null,
        decision_maker_name: null,
        decision_maker_role: null,
        decision_maker_email: null,
        decision_maker_phone: null,
        team_members: [],
        large_file_links: [],
        additional_requests: null,
        special_instructions: null,
        success_metrics: null,
      }
    } else {
      // OLD 9-STEP FORMAT (backward compatibility)
      insertData = {
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
        status: 'Pending Review',
      }
    }

    // Insert onboarding submission
    const { data: submission, error: submissionError } = await supabase
      .from('client_onboarding_submissions')
      .insert(insertData)
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
          const fileName = `${Date.now()}-${file.name}`
          const filePath = `${projectId}/${fileName}`

          // Upload to Supabase Storage
          const { error: uploadError } = await supabase.storage
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
        data.full_name || data.contact_name || 'Client',
        data.email,
        projectId
      )
      await sendAdminOnboardingNotification(
        data.full_name || data.contact_name || 'Client',
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