// src/app/api/analytics/route.ts
//
// GET — internal content / inbox / subscriber counts and a 30-day series, for ACTIVE, 2FA-VERIFIED ADMINS ONLY.
//
// This used to have NO authorization and read with the anonymous client, so whether the numbers about
// contact_submissions and subscribers were public depended entirely on those tables' RLS. The shared admin gate
// now runs FIRST (session -> user-bound 2FA cookie -> active admin_users row), before any read, and the reads use
// the privileged client it returns, so the figures are accurate for admins and unreachable for everyone else.
//
// It returns aggregates only: no row, name, email or message ever leaves this route. A failed read is a 500, not a
// silent zero.

import { NextResponse } from 'next/server'
import { requireActiveAdmin, queryFailure } from '@/lib/admin-api-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = await requireActiveAdmin()
    if (!auth.ok) return auth.response
    const supabase = auth.db

    // Fetch real data from Supabase tables

    // 1. Projects stats
    const { data: projects, error: projectsError } = await supabase
      .from('portfolio_items')
      .select('status, is_active')
    const projectsTotal = projects?.length || 0
    const projectsPublished = projects?.filter((p: any) => p.is_active === true)?.length || 0
    const projectsDraft = projectsTotal - projectsPublished

    // 2. Messages/Inquiries stats
    const { data: messages, error: messagesError } = await supabase
      .from('contact_submissions')
      .select('is_read')
    const messagesTotal = messages?.length || 0
    const messagesUnread = messages?.filter((m: any) => m.is_read === false)?.length || 0
    const messagesRead = messagesTotal - messagesUnread

    // 3. Subscribers stats
    const { data: subscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .select('status')
    const subscribersTotal = subscribers?.length || 0
    const subscribersActive = subscribers?.filter((s: any) => s.status === 'active')?.length || 0
    const subscribersUnsubscribed = subscribersTotal - subscribersActive

    // 4. Blog stats
    const { data: blogPosts, error: blogError } = await supabase
      .from('blog_posts')
      .select('status, is_active')
    const blogTotal = blogPosts?.length || 0
    const blogPublished = blogPosts?.filter((p: any) => p.status === 'published' && p.is_active === true)?.length || 0
    const blogDraft = blogTotal - blogPublished

    // 5. Chart data - last 30 days (from messages and subscribers)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    // Get daily messages for last 30 days
    const { data: dailyMessages, error: dailyMessagesError } = await supabase
      .from('contact_submissions')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    // Get daily subscribers for last 30 days
    const { data: dailySubscribers, error: dailySubscribersError } = await supabase
      .from('subscribers')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: true })

    const failed = projectsError || messagesError || subscribersError || blogError || dailyMessagesError || dailySubscribersError
    if (failed) return queryFailure('admin analytics', failed)

    // Build chart data for last 30 days
    const chartData: { date: string; messages: number; subscribers: number }[] = []
    for (let i = 0; i < 30; i++) {
      const date = new Date()
      date.setDate(date.getDate() - (29 - i))
      const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      const messagesCount = dailyMessages?.filter((m: any) =>
        new Date(m.created_at).toDateString() === date.toDateString()
      )?.length || 0

      const subscribersCount = dailySubscribers?.filter((s: any) =>
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