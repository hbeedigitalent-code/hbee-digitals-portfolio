'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewNewsletterPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState(0)

  const [title, setTitle] = useState('Q3 Growth Readiness Insight')
  const [subject, setSubject] = useState('Is Your Store Actually Ready For Q3 Growth?')
  const [previewText, setPreviewText] = useState(
    'Many stores focus on getting more traffic. Few prepare their store to convert it.'
  )
  const [senderName, setSenderName] = useState('Hbee Digitals')
  const [senderEmail, setSenderEmail] = useState('forms@send.hbeedigitals.com')
  const [replyToEmail, setReplyToEmail] = useState('habeeb@hbeedigitals.com')
  const [campaignType, setCampaignType] = useState('Ecommerce Growth Insight')
  const [audienceType, setAudienceType] = useState('all_subscribers')
  const [featuredImage, setFeaturedImage] = useState('')
  const [contentHtml, setContentHtml] = useState(`<p>Hi there,</p>

<p>As we move deeper into Q3, many ecommerce brands are focused on increasing traffic, launching new campaigns, and pushing for more sales.</p>

<p>But here is something we have noticed while reviewing online stores:</p>

<p><strong>Most stores do not struggle because of traffic. They struggle because their store is not fully prepared to convert the attention it is already receiving.</strong></p>

<p>Before investing more into ads, influencers, or new marketing campaigns, it is worth asking a few simple questions:</p>

<ul>
  <li>Can visitors understand what your brand offers within a few seconds?</li>
  <li>Does your website look trustworthy enough for a first-time customer?</li>
  <li>Are your product pages helping customers make buying decisions?</li>
  <li>Is your mobile experience smooth from landing page to checkout?</li>
  <li>Do you have enough customer trust signals in place?</li>
</ul>

<p>A useful exercise this week: open your store on your phone and try purchasing a product as if you have never visited the website before.</p>

<p>Pay attention to clarity, trust, speed, navigation, product presentation, and checkout experience.</p>

<p>You will often spot opportunities that analytics alone will not show you.</p>`)
  const [ctaText, setCtaText] = useState('Request A Growth Review')
  const [ctaUrl, setCtaUrl] = useState('https://www.hbeedigitals.com/contact')
  const [footerNote, setFooterNote] = useState(
    'Helping businesses build stronger digital systems for measurable growth.'
  )

  useEffect(() => {
    fetchSubscribersCount()
  }, [audienceType])

  async function fetchSubscribersCount() {
    let query = supabase
      .from('newsletter_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active')

    if (audienceType === 'all_leads') query = query.eq('segment', 'lead')
    if (audienceType === 'existing_clients') query = query.eq('segment', 'client')
    if (audienceType === 'shopify_leads') query = query.contains('tags', ['shopify'])
    if (audienceType === 'ecommerce_merchants') query = query.contains('tags', ['ecommerce'])

    const { count } = await query
    setSubscribersCount(count || 0)
  }

  const previewHtml = useMemo(() => {
    return `
      <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:24px;overflow:hidden;font-family:Arial,sans-serif;">
        <div style="background:#0A1D37;padding:32px 24px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:26px;">Hbee Digitals</h1>
          <p style="color:#39D97A;margin:6px 0 0;font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;">Digital Growth Studio</p>
        </div>

        <div style="padding:36px 28px;">
          <div style="display:inline-block;background:#39D97A;color:#07111F;border-radius:999px;padding:6px 14px;font-size:11px;font-weight:800;margin-bottom:18px;">
            ${campaignType}
          </div>

          ${featuredImage ? `<img src="${featuredImage}" style="width:100%;border-radius:18px;margin-bottom:24px;" />` : ''}

          <h2 style="color:#0A1D37;font-size:30px;line-height:1.15;margin:0 0 16px;">${subject}</h2>

          <div style="color:#3A4A62;font-size:16px;line-height:1.7;">
            ${contentHtml}
          </div>

          <div style="text-align:center;margin-top:32px;">
            <a href="${ctaUrl}" style="display:inline-block;background:#39D97A;color:#07111F;text-decoration:none;border-radius:999px;padding:14px 30px;font-weight:800;">
              ${ctaText}
            </a>
          </div>
        </div>

        <div style="background:#F5F7FA;padding:24px;text-align:center;color:#6B7A96;font-size:12px;">
          <p style="margin:0 0 8px;">${footerNote}</p>
          <p style="margin:0;">Hbee Digitals · www.hbeedigitals.com</p>
        </div>
      </div>
    `
  }, [campaignType, featuredImage, subject, contentHtml, ctaUrl, ctaText, footerNote])

  async function saveCampaign(sendNow = false) {
    if (!title.trim() || !subject.trim() || !contentHtml.trim()) {
      alert('Title, subject, and content are required.')
      return
    }

    if (sendNow && subscribersCount === 0) {
      alert('No active subscribers found for this audience.')
      return
    }

    if (
      sendNow &&
      !confirm(`You are about to send this campaign to ${subscribersCount} contacts. Continue?`)
    ) {
      return
    }

    setSaving(true)

    const { data, error } = await supabase
      .from('newsletter_campaigns')
      .insert({
        title,
        subject,
        preview_text: previewText,
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to_email: replyToEmail,
        campaign_type: campaignType,
        audience_type: audienceType,
        featured_image: featuredImage || null,
        content_html: contentHtml,
        cta_text: ctaText,
        cta_url: ctaUrl,
        footer_note: footerNote,
        status: sendNow ? 'sending' : 'draft',
      })
      .select()
      .single()

    if (error || !data) {
      setSaving(false)
      alert(error?.message || 'Could not save campaign.')
      return
    }

    if (!sendNow) {
      setSaving(false)
      router.push('/admin/newsletter')
      return
    }

    setSending(true)

    const response = await fetch('/api/send-newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId: data.id }),
    })

    const result = await response.json()

    setSending(false)
    setSaving(false)

    if (!response.ok) {
      alert(result.error || 'Campaign saved, but sending failed.')
      router.push('/admin/newsletter')
      return
    }

    alert(result.message || 'Campaign sent successfully.')
    router.push('/admin/newsletter')
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[var(--text-primary)]">
            Create Newsletter
          </h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">
            Create and send a branded Hbee Digitals email campaign.
          </p>
        </div>

        <Link href="/admin/newsletter" className="font-bold text-[var(--accent)]">
          ← Back
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_480px]">
        <div className="space-y-5">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">
              Campaign Settings
            </h2>

            <div className="grid gap-4">
              <Input label="Campaign Title" value={title} setValue={setTitle} />
              <Input label="Subject Line" value={subject} setValue={setSubject} />
              <Input label="Preview Text" value={previewText} setValue={setPreviewText} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Sender Name" value={senderName} setValue={setSenderName} />
                <Input label="Sender Email" value={senderEmail} setValue={setSenderEmail} />
              </div>

              <Input label="Reply-To Email" value={replyToEmail} setValue={setReplyToEmail} />

              <div className="grid gap-4 sm:grid-cols-2">
                <Select
                  label="Campaign Type"
                  value={campaignType}
                  setValue={setCampaignType}
                  options={[
                    'Ecommerce Growth Insight',
                    'Shopify Store Review',
                    'Brand Strategy',
                    'Conversion Optimization',
                    'Case Study',
                    'Service Promotion',
                    'Monthly Update',
                    'Lead Nurture',
                    'Announcement',
                  ]}
                />

                <Select
                  label={`Audience (${subscribersCount} contacts)`}
                  value={audienceType}
                  setValue={setAudienceType}
                  options={[
                    'all_subscribers',
                    'all_leads',
                    'ecommerce_merchants',
                    'shopify_leads',
                    'existing_clients',
                  ]}
                />
              </div>

              <Input label="Featured Image URL" value={featuredImage} setValue={setFeaturedImage} />
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">
              Email Content HTML
            </h2>

            <textarea
              value={contentHtml}
              onChange={(e) => setContentHtml(e.target.value)}
              rows={18}
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-4 font-mono text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">
              CTA & Footer
            </h2>

            <div className="grid gap-4">
              <Input label="CTA Button Text" value={ctaText} setValue={setCtaText} />
              <Input label="CTA URL" value={ctaUrl} setValue={setCtaUrl} />
              <Input label="Footer Note" value={footerNote} setValue={setFooterNote} />
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => saveCampaign(false)}
              disabled={saving || sending}
              className="rounded-full border border-[var(--border)] px-6 py-3 text-sm font-black text-[var(--text-primary)]"
            >
              {saving && !sending ? 'Saving...' : 'Save Draft'}
            </button>

            <button
              onClick={() => saveCampaign(true)}
              disabled={saving || sending}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F]"
            >
              {sending ? 'Sending...' : `Send Now to ${subscribersCount}`}
            </button>
          </div>
        </div>

        <div className="lg:sticky lg:top-6 lg:h-fit">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-4">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">
              Live Preview
            </h2>

            <div
              className="max-h-[760px] overflow-auto rounded-2xl bg-[#F5F7FA] p-4"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function Input({
  label,
  value,
  setValue,
}: {
  label: string
  value: string
  setValue: (value: string) => void
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
        {label}
      </span>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />
    </label>
  )
}

function Select({
  label,
  value,
  setValue,
  options,
}: {
  label: string
  value: string
  setValue: (value: string) => void
  options: string[]
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[var(--text-primary)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option.replaceAll('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  )
}