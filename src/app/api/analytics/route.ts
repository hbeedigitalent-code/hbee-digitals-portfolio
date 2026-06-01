import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Fetch real data from Supabase tables
    
    // 1. Projects stats
    const { data: projects } = await supabase
      .from('portfolio_items')
      .select('status, is_active')
    const projectsTotal = projects?.length || 0
    const projectsPublished = projects?.filter(p => p.is_active === true)?.length || 0
    const projectsDraft = projectsTotal - projectsPublished

    // 2. Messages/Inquiries stats
    const { data: messages } = await supabase
      .from('contact_submissions')
      .select('is_read')
    const messagesTotal = messages?.length || 0
    const messagesUnread = messages?.filter(m => m.is_read === false)?.length || 0
    const messagesRead = messagesTotal - messagesUnread

    // 3. Subscribers stats
    const { data: subscribers } = await supabase
      .from('subscribers')
      .select('status')
    const subscribersTotal = subscribers?.length || 0
    const subscribersActive = subscribers?.filter(s => s.status === 'active')?.length || 0
    const subscribersUnsubscribed = subscribersTotal - subscribersActive

    // 4. Blog stats
    const { data: blogPosts } = await supabase
      .from('blog_posts')
      .select('status, is_active')
    const blogTotal = blogPosts?.length || 0
    const blogPublished = blogPosts?.filter(p => p.status === 'published' && p.is_active === true)?.length || 0
    const blogDraft = blogTotal - blogPublished

    // 5. Chart data - last 30 days (from messages and subscribers)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get daily messages for last 30 days
    const { data: dailyMessages } = await supabase
      .from('contact_submissions')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Get daily subscribers for last 30 days
    const { data: dailySubscribers } = await supabase
      .from('subscribers')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Build chart data for last 30 days
    const chartData: { date: string; messages: number; subscribers: number }[] = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      
      const messagesCount = dailyMessages?.filter(m => 
        new Date(m.created_at).toDateString() === date.toDateString()
      )?.length || 0
      
      const subscribersCount = dailySubscribers?.filter(s => 
        new Date(s.created_at).toDateString() === date.toDateString()
      )?.length || 0
      
      chartData.push({ date: dateStr, messages: messagesCount, subscribers: subscribersCount })
    }

    return NextResponse.json({
      success: true,
      chartData,
      stats: {
        projects: { total: projectsTotal, published: projectsPublished, draft: projectsDraft },
        messages: { total: messagesTotal, unread: messagesUnread, read: messagesRead },
        subscribers: { total: subscribersTotal, active: subscribersActive, unsubscribed: subscribersUnsubscribed },
        blog: { total: blogTotal, published: blogPublished, draft: blogDraft, totalViews: 0 }
      }
    })
  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
  }
}