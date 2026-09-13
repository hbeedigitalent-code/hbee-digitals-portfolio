// src/app/api/onboarding/route.ts
//
// PUBLIC, UNAUTHENTICATED endpoint for the client onboarding form, writing with
// the SERVICE-ROLE key (bypasses RLS) and uploading to Supabase Storage.
//
// Before this revision it checked only that a `data` field was present, then
// JSON.parse'd it unguarded, spread `data.<field> || null` into the insert, and
// accepted ANY number of files of ANY size and ANY type into storage. It was
// the least guarded write path in the application.
//
// Order of checks matches /api/contact, cheapest rejection first: rate limit,
// then Turnstile, then payload validation, then file validation — all before a
// project ID is generated, a row is written, or a byte is uploaded.
//
// The two emails already rendered through src/lib/emails/layout.ts and carry no
// submitted free text, so they were not part of the injection finding and are
// unchanged here.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { generateProjectId } from '@/lib/services/project-id-generator'
import { sendOnboardingConfirmation } from '@/lib/emails/onboarding-confirmation'
import { sendAdminOnboardingNotification } from '@/lib/emails/admin-onboarding-notification'
import { buildOnboardingObjectPath } from '@/lib/onboarding-storage-path'
import { verifyTurnstileToken, turnstileFailureMessage } from '@/lib/turnstile'
import {
  validateOnboardingPayload,
  validateOnboardingFiles,
} from '@/lib/validators/onboarding-payload'
import { checkRateLimit, getClientIp, rateLimitMessage } from '@/lib/rate-limit'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseKey) {
      console.error('[onboarding] Supabase credentials missing')
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 })
    }

    const formData = await req.formData().catch(() => null)
    if (!formData) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    // ------------------------------------------------------------------
    // 1. Rate limit
    // ------------------------------------------------------------------
    const clientIp = getClientIp(req)
    const limit = await checkRateLimit('onboarding', clientIp)
    if (!limit.ok) {
      return NextResponse.json(
        { error: rateLimitMessage(limit.retryAfterSeconds) },
        {
          status: 429,
          headers: limit.retryAfterSeconds
            ? { 'Retry-After': String(limit.retryAfterSeconds) }
            : undefined,
        },
      )
    }

    // ------------------------------------------------------------------
    // 2. Turnstile — before any parse, write or upload.
    // ------------------------------------------------------------------
    const turnstileToken = formData.get('turnstile_token')
    const turnstile = await verifyTurnstileToken(
      typeof turnstileToken === 'string' ? turnstileToken : undefined,
      clientIp,
    )
    if (!turnstile.ok) {
      return NextResponse.json(
        {
          error: turnstileFailureMessage(turnstile.reason),
          retryable: turnstile.reason === 'expired' || turnstile.reason === 'unreachable',
        },
        { status: turnstile.reason === 'not-configured' ? 500 : 400 },
      )
    }

    // ------------------------------------------------------------------
    // 3. Payload validation. Handles the JSON.parse failure itself, so a
    //    malformed body is a 400 rather than a 500 from the catch-all.
    // ------------------------------------------------------------------
    const dataRaw = formData.get('data')
    const validation = validateOnboardingPayload(
      typeof dataRaw === 'string' ? dataRaw : '',
    )
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }
    const data = validation.value

    // ------------------------------------------------------------------
    // 4. File validation — count, per-file size, total size, and an extension
    //    allow-list. Rejected BEFORE the submission row is created, so a bad
    //    attachment does not leave a half-finished submission behind.
    // ------------------------------------------------------------------
    const rawFiles = formData.getAll('files').filter((f): f is File => f instanceof File)
    const fileValidation = validateOnboardingFiles(rawFiles)
    if (!fileValidation.ok) {
      return NextResponse.json({ error: fileValidation.error }, { status: 400 })
    }
    const files = fileValidation.value

    // ------------------------------------------------------------------
    // 5. Persist
    // ------------------------------------------------------------------
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const projectId = await generateProjectId()

    const { data: submission, error: submissionError } = await supabase
      .from('client_onboarding_submissions')
      .insert({
        project_id: projectId,
        status: 'New Submission',
        project_title: data.project_title,
        business_name: data.business_name,
        website_url: data.website_url,
        service_needed: data.service_needed,
        project_goals: data.project_goals,
        preferred_timeline: data.preferred_timeline,
        budget_range: data.budget_range,
        main_challenge: data.main_challenge,
        full_name: data.full_name,
        email: data.email,
        whatsapp: data.whatsapp,
        communication_method: data.communication_method,
        notes: data.notes,
        consent: data.consent,
      })
      .select()
      .single()

    if (submissionError) {
      // The provider message is logged, not returned: the previous version
      // echoed it to the caller, exposing column names and constraint detail.
      console.error('[onboarding] database error:', submissionError.message)
      return NextResponse.json(
        { error: 'Unable to save your submission. Please try again.' },
        { status: 500 },
      )
    }

    // ------------------------------------------------------------------
    // 6. Upload. Individual failures are logged and skipped, as before — a
    //    failed attachment must not discard an otherwise complete submission.
    // ------------------------------------------------------------------
    const uploadedFileRecords = []

    for (const { file, safeName, contentType } of files) {
      try {
        // Same key shape as before. The path builder does its own sanitizing,
        // so the raw name is still what it receives.
        const filePath = buildOnboardingObjectPath(projectId, Date.now(), file.name)

        const { error: uploadError } = await supabase.storage
          .from('onboarding-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            // Derived from the extension allow-list, NOT from the browser's
            // declared type, which is caller-controlled.
            contentType,
          })

        if (uploadError) {
          console.error(`[onboarding] upload failed for an attachment: ${uploadError.message}`)
          continue
        }

        // The CANONICAL reference is the bucket-relative object path, not a
        // URL. onboarding-files is private (M10), so a public URL would
        // resolve to nothing, and a signed URL expires — storing either as a
        // permanent reference produces a broken link. Downloads are minted
        // per request by /api/admin/onboarding-files/[fileId]/signed-url.
        const { data: fileRecord, error: fileError } = await supabase
          .from('client_onboarding_files')
          .insert({
            submission_id: submission.id,
            project_id: projectId,
            // The sanitized name is stored, so the admin UI never renders a
            // filename the submitter chose the characters of.
            file_name: safeName,
            file_url: filePath,
            file_type: contentType,
            file_size: file.size,
            category: 'Onboarding Files',
          })
          .select()
          .single()

        if (!fileError && fileRecord) {
          uploadedFileRecords.push(fileRecord)
        }
      } catch (fileError) {
        console.error(
          '[onboarding] error processing an attachment:',
          fileError instanceof Error ? fileError.message : 'unknown error',
        )
      }
    }

    // ------------------------------------------------------------------
    // 7. Email. Best-effort, exactly as before.
    // ------------------------------------------------------------------
    try {
      await sendOnboardingConfirmation(data.full_name, data.email, projectId)
    } catch (emailError) {
      console.error('[onboarding] confirmation email error:', emailError)
    }

    try {
      await sendAdminOnboardingNotification(
        data.full_name,
        data.business_name,
        data.email,
        projectId,
      )
    } catch (emailError) {
      console.error('[onboarding] admin notification error:', emailError)
    }

    return NextResponse.json({
      success: true,
      project_id: projectId,
      submission_id: submission.id,
      uploaded_files: uploadedFileRecords,
    })
  } catch (error) {
    console.error(
      '[onboarding] unexpected error:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return NextResponse.json(
      { error: 'Failed to submit onboarding. Please try again.' },
      { status: 500 },
    )
  }
}
