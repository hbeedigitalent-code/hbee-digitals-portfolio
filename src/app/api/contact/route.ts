// app/api/contact/route.ts

import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { Resend } from 'resend'

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

function escapeHtml(value: unknown) {
  return String(value || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      fullName,
      email,
      company,
      phone,
      service,
      budget,
      message,
    } = body

    if (!fullName || !email || !message) {
      return NextResponse.json(
        { error: 'Name, email, and message are required.' },
        { status: 400 }
      )
    }

    const { error: supabaseError } = await supabaseAdmin
      .from('contact_inquiries')
      .insert([
        {
          full_name: fullName,
          email,
          company: company || null,
          phone: phone || null,
          service: service || null,
          budget: budget || null,
          message,
          status: 'new',
        },
      ])

    if (supabaseError) {
      console.error('SUPABASE INSERT ERROR:', supabaseError)

      return NextResponse.json(
        {
          error: 'Could not save inquiry.',
          details: supabaseError.message,
        },
        { status: 500 }
      )
    }

    if (resend && process.env.CONTACT_RECEIVER_EMAIL) {
      try {
        await resend.emails.send({
          from: 'Hbee Digitals <onboarding@resend.dev>',
          to: process.env.CONTACT_RECEIVER_EMAIL,
          replyTo: email,
          subject: `New Project Inquiry from ${fullName}`,
          html: `
            <div style="font-family: Arial, sans-serif; padding: 24px; color: #111827;">
              <h2 style="margin-bottom: 16px;">New Project Inquiry</h2>

              <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
              <p><strong>Email:</strong> ${escapeHtml(email)}</p>
              <p><strong>Company:</strong> ${escapeHtml(company || 'N/A')}</p>
              <p><strong>Phone:</strong> ${escapeHtml(phone || 'N/A')}</p>
              <p><strong>Service:</strong> ${escapeHtml(service || 'N/A')}</p>
              <p><strong>Budget:</strong> ${escapeHtml(budget || 'N/A')}</p>

              <hr style="margin: 20px 0;" />

              <p><strong>Message:</strong></p>
              <div style="background: #f3f4f6; padding: 16px; border-radius: 12px;">
                ${escapeHtml(message)}
              </div>
            </div>
          `,
        })
      } catch (emailError) {
        console.error('RESEND EMAIL ERROR:', emailError)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Inquiry submitted successfully.',
    })
  } catch (error) {
    console.error('CONTACT API ERROR:', error)

    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}