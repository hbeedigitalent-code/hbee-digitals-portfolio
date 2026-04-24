import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    // Get message statistics (last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('created_at, is_read')
      .gte('created_at', thirtyDaysAgo.toISOString())

    if (messagesError) throw messagesError

    // Get project statistics
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('status, created_at')

    if (projectsError) throw projectsError

    // Get subscriber statistics
    const { data: subscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .select('status, subscribed_at')
      .gte('subscribed_at', thirtyDaysAgo.toISOString())

    if (subscribersError) throw subscribersError

    // Get blog post statistics
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('status, views, published_at')

    if (blogError) throw blogError

    // Calculate daily message counts
    const dailyMessages = new Map()
    messages?.forEach(msg => {
      const date = new Date(msg.created_at).toLocaleDateString()
      dailyMessages.set(date, (dailyMessages.get(date) || 0) + 1)
    })

    // Calculate daily subscriber counts
    const dailySubscribers = new Map()
    subscribers?.forEach(sub => {
      const date = new Date(sub.subscribed_at).toLocaleDateString()
      dailySubscribers.set(date, (dailySubscribers.get(date) || 0) + 1)
    })

    // Prepare chart data
    const chartData = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toLocaleDateString()
      chartData.push({
        date: dateStr,
        messages: dailyMessages.get(dateStr) || 0,
        subscribers: dailySubscribers.get(dateStr) || 0,
      })
    }

    // Calculate status counts
    const publishedProjects = projects?.filter(p => p.status === 'published').length || 0
    const draftProjects = projects?.filter(p => p.status === 'draft').length || 0
    
    const activeSubscribers = subscribers?.filter(s => s.status === 'active').length || 0
    const unsubscribedCount = subscribers?.filter(s => s.status === 'unsubscribed').length || 0
    
    const publishedPosts = blogPosts?.filter(p => p.status === 'published').length || 0
    const draftPosts = blogPosts?.filter(p => p.status === 'draft').length || 0
    const totalViews = blogPosts?.reduce((sum, p) => sum + (p.views || 0), 0) || 0

    const unreadMessages = messages?.filter(m => !m.is_read).length || 0
    const totalMessages = messages?.length || 0

    return NextResponse.json({
      success: true,
      chartData,
      stats: {
        projects: {
          total: projects?.length || 0,
          published: publishedProjects,
          draft: draftProjects,
        },
        messages: {
          total: totalMessages,
          unread: unreadMessages,
          read: totalMessages - unreadMessages,
        },
        subscribers: {
          total: subscribers?.length || 0,
          active: activeSubscribers,
          unsubscribed: unsubscribedCount,
        },
        blog: {
          total: blogPosts?.length || 0,
          published: publishedPosts,
          draft: draftPosts,
          totalViews: totalViews,
        },
      },
    })
  } catch (error) {
    console.error('Analytics error:', error)
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 })
  }
}