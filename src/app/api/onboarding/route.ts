// src/app/api/onboarding/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  console.log('📝 Onboarding API called')

  try {
    // Parse FormData
    const formData = await req.formData()
    const dataRaw = formData.get('data') as string
    
    if (!dataRaw) {
      console.error('❌ No data field found')
      return NextResponse.json(
        { error: 'Missing form data' },
        { status: 400 }
      )
    }

    const data = JSON.parse(dataRaw)
    const uploadedFiles = formData.getAll('files') as File[]

    console.log('📦 Data received:', {
      project_title: data.project_title,
      business_name: data.business_name,
      full_name: data.full_name,
      email: data.email,
      files: uploadedFiles.length
    })

    // Get Supabase client with service role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Supabase credentials missing')
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Generate project ID
    const projectId = `ONB-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    console.log('📋 Project ID:', projectId)

    // Prepare insert data - using columns that exist in your table
    const insertData = {
      project_id: projectId,
      status: 'New Submission',
      // Step 1: Project Details
      project_title: data.project_title || null,
      business_name: data.business_name || null,
      website_url: data.website_url || null,
      service_needed: data.service_needed || null,
      project_goals: data.project_goals || null,
      // Step 2: Timeline & Budget
      preferred_timeline: data.preferred_timeline || null,
      budget_range: data.budget_range || null,
      main_challenge: data.main_challenge || null,
      // Step 3: Brand Assets (files handled separately)
      // Step 4: Contact Information
      full_name: data.full_name || null,
      email: data.email || null,
      whatsapp: data.whatsapp || null,
      communication_method: data.communication_method || null,
      notes: data.notes || null,
      // Step 5: Review & Submit
      consent: data.consent || false,
    }

    console.log('📝 Inserting data:', JSON.stringify(insertData, null, 2))

    // Insert into database
    const { data: submission, error: submissionError } = await supabase
      .from('client_onboarding_submissions')
      .insert(insertData)
      .select()
      .single()

    if (submissionError) {
      console.error('❌ Database error:', submissionError)
      return NextResponse.json(
        { error: `Database error: ${submissionError.message}` },
        { status: 500 }
      )
    }

    console.log('✅ Submission saved:', submission.id)

    // Upload files
    const uploadedFileRecords = []
    
    if (uploadedFiles && uploadedFiles.length > 0) {
      console.log(`📎 Uploading ${uploadedFiles.length} files...`)
      
      for (const file of uploadedFiles) {
        try {
          const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const fileName = `${Date.now()}-${safeFileName}`
          const filePath = `${projectId}/${fileName}`

          console.log(`📎 Uploading: ${file.name} (${file.size} bytes)`)

          const { error: uploadError } = await supabase.storage
            .from('onboarding-files')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            })

          if (uploadError) {
            console.error('❌ Upload error for file:', file.name, uploadError)
            continue
          }

          const { data: urlData } = supabase.storage
            .from('onboarding-files')
            .getPublicUrl(filePath)

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
            console.log('✅ File uploaded:', file.name)
          }
        } catch (fileError) {
          console.error('❌ Error processing file:', file.name, fileError)
        }
      }
    }

    // Return success
    return NextResponse.json({
      success: true,
      project_id: projectId,
      submission_id: submission.id,
      uploaded_files: uploadedFileRecords,
    })

  } catch (error) {
    console.error('❌ Onboarding submission error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit onboarding' },
      { status: 500 }
    )
  }
}