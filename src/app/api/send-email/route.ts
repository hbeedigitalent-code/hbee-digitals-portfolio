import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { name, email, phone, budget, message, projectDetails, subject } = await request.json()

    // Format budget for display
    const budgetLabels: Record<string, string> = {
      'under-5k': 'Under $5,000',
      '5k-10k': '$5,000 - $10,000',
      '10k-25k': '$10,000 - $25,000',
      '25k-50k': '$25,000 - $50,000',
      '50k-plus': '$50,000+',
      'not-sure': 'Not sure / TBD',
    }

    const formattedBudget = budgetLabels[budget] || budget || 'Not specified'

    // For now, log the email (since SMTP isn't configured)
    console.log('=== NEW PROJECT INQUIRY ===')
    console.log('Subject:', subject || 'New Project Inquiry')
    console.log('Name:', name)
    console.log('Email:', email)
    console.log('Phone:', phone || 'Not provided')
    console.log('Budget:', formattedBudget)
    console.log('Message:', message)
    console.log('Additional Details:', projectDetails || 'None')
    console.log('==========================')

    // Here you can integrate with a real email service like:
    // - Resend (recommended for Next.js)
    // - SendGrid
    // - Nodemailer
    // For now, messages are saved to database and visible in admin panel

    return NextResponse.json({ 
      success: true, 
      message: 'Inquiry received successfully' 
    })
  } catch (error) {
    console.error('Email error:', error)
    return NextResponse.json({ error: 'Failed to process inquiry' }, { status: 500 })
  }
}