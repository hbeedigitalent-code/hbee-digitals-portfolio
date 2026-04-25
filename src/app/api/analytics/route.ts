import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Dynamic import to avoid build-time issues
    const { supabase } = await import('@/lib/supabase')
    
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
    messages?.forEach((msg: any) => {
      const date = new Date(msg.created_at).toLocaleDateString()
      dailyMessages.set(date, (dailyMessages.get(date) || 0) + 1)
    })

    // Calculate daily subscriber counts
    const dailySubscribers = new Map()
    subscribers?.forEach((sub: any) => {
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
    const publishedProjects = projects?.filter((p: any) => p.status === 'published').length || 0
    const draftProjects = projects?.filter((p: any) => p.status === 'draft').length || 0
    
    const activeSubscribers = subscribers?.filter((s: any) => s.status === 'active').length || 0
    const unsubscribedCount = subscribers?.filter((s: any) => s.status === 'unsubscribed').length || 0
    
    const publishedPosts = blogPosts?.filter((p: any) => p.status === 'published').length || 0
    const draftPosts = blogPosts?.filter((p: any) => p.status === 'draft').length || 0
    const totalViews = blogPosts?.reduce((sum: number, p: any) => sum + (p.views || 0), 0) || 0

    const unreadMessages = messages?.filter((m: any) => !m.is_read).length || 0
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
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch analytics',
      chartData: [],
      stats: {
        projects: { total: 0, published: 0, draft: 0 },
        messages: { total: 0, unread: 0, read: 0 },
        subscribers: { total: 0, active: 0, unsubscribed: 0 },
        blog: { total: 0, published: 0, draft: 0, totalViews: 0 }
      }
    }, { status: 500 })
  }
}
