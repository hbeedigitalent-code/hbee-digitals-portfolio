'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

type Campaign = {
  id: string
  title: string
  subject: string
  campaign_type: string | null
  audience_type: string | null
  status: string | null
  total_recipients: number | null
  total_opens: number | null
  total_clicks: number | null
  created_at: string
  sent_at: string | null
}

export default function NewsletterDashboardPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [subscriberCount, setSubscriberCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)

    const [{ data: campaignsData }, { count }] = await Promise.all([
      supabase
        .from('newsletter_campaigns')
        .select('*')
        .order('created_at', { ascending: false }),

      supabase
        .from('newsletter_subscribers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
    ])

    setCampaigns(campaignsData || [])
    setSubscriberCount(count || 0)
    setLoading(false)
  }

  async function deleteCampaign(id: string) {
    if (!confirm('Delete this campaign?')) return

    const { error } = await supabase
      .from('newsletter_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      alert(error.message)
      return
    }

    setCampaigns((prev) => prev.filter((item) => item.id !== id))
  }

  const stats = useMemo(() => {
    const sent = campaigns.filter((c) => c.status === 'sent')
    const drafts = campaigns.filter((c) => c.status === 'draft')
    const totalSent = sent.reduce((sum, c) => sum + Number(c.total_recipients || 0), 0)
    const totalOpens = sent.reduce((sum, c) => sum + Number(c.total_opens || 0), 0)
    const totalClicks = sent.reduce((sum, c) => sum + Number(c.total_clicks || 0), 0)

    return {
      totalCampaigns: campaigns.length,
      drafts: drafts.length,
      sent: sent.length,
      totalSent,
      openRate: totalSent > 0 ? Math.round((totalOpens / totalSent) * 100) : 0,
      clickRate: totalSent > 0 ? Math.round((totalClicks / totalSent) * 100) : 0,
    }
  }, [campaigns])

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">
            Newsletter Campaigns
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create, manage, and send branded Hbee Digitals campaigns.
          </p>
        </div>

        <Link
          href="/admin/newsletter/new"
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F] transition hover:scale-[1.02]"
        >
          New Campaign
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {[
          ['Subscribers', subscriberCount],
          ['Campaigns', stats.totalCampaigns],
          ['Drafts', stats.drafts],
          ['Sent', stats.sent],
          ['Open Rate', `${stats.openRate}%`],
          ['Click Rate', `${stats.clickRate}%`],
        ].map(([label, value]) => (
          <div
            key={label}
            className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5"
          >
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              {label}
            </p>
            <p className="mt-3 text-3xl font-black text-[var(--text-primary)]">
              {value}
            </p>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
        <div className="border-b border-[var(--border)] p-5">
          <h2 className="text-lg font-black text-[var(--text-primary)]">
            Recent Campaigns
          </h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-[var(--text-muted)]">
            Loading campaigns...
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-[var(--text-muted)]">No campaigns yet.</p>
            <Link
              href="/admin/newsletter/new"
              className="mt-4 inline-flex rounded-full bg-[var(--accent)] px-5 py-2 text-sm font-bold text-[#07111F]"
            >
              Create First Campaign
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="bg-[var(--bg-section)] text-xs uppercase tracking-[0.14em] text-[var(--text-muted)]">
                <tr>
                  <th className="px-5 py-4">Campaign</th>
                  <th className="px-5 py-4">Type</th>
                  <th className="px-5 py-4">Audience</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Sent</th>
                  <th className="px-5 py-4">Created</th>
                  <th className="px-5 py-4">Actions</th>
                </tr>
              </thead>

              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-t border-[var(--border)]">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[var(--text-primary)]">
                        {campaign.title}
                      </p>
                      <p className="mt-1 max-w-[320px] truncate text-sm text-[var(--text-muted)]">
                        {campaign.subject}
                      </p>
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {campaign.campaign_type || 'Growth Insight'}
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {campaign.audience_type || 'All Subscribers'}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-[var(--accent)]/10 px-3 py-1 text-xs font-bold capitalize text-[var(--accent)]">
                        {campaign.status || 'draft'}
                      </span>
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {campaign.total_recipients || 0}
                    </td>

                    <td className="px-5 py-4 text-sm text-[var(--text-muted)]">
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() => deleteCampaign(campaign.id)}
                        className="text-sm font-bold text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}