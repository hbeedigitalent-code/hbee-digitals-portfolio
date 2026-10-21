'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function NewNewsletterPage() {
  const router = useRouter()

  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState<number | null>(null)
  const [subscribersError, setSubscribersError] = useState('')

  const [subject, setSubject] = useState('[Draft starter] Where Is Growth Getting Stuck?')
  const [previewText, setPreviewText] = useState(
    'A practical framework for reviewing clarity, trust, conversion, retention, and capacity.'
  )
  const [senderName, setSenderName] = useState('Hbee Digitals')
  const [senderEmail, setSenderEmail] = useState('forms@send.hbeedigitals.com')
  const [replyToEmail, setReplyToEmail] = useState('habeeb@hbeedigitals.com')
  const [campaignType, setCampaignType] = useState('Ecommerce Growth Insight')
  const [audienceType, setAudienceType] = useState('all_subscribers')
  const [featuredImage, setFeaturedImage] = useState('')
  const [contentHtml, setContentHtml] = useState(`<p><strong>Draft starter: tailor this message with a current Hbee insight or audience-relevant example before sending.</strong></p>

<p>Hi there,</p>

<p>When growth slows down, the constraint is not always a lack of activity. It is often a weak connection somewhere in the customer journey.</p>

<p>A useful review starts with five questions:</p>

<ul>
  <li><strong>Clarity:</strong> Can the right customer quickly understand what you offer and why it matters?</li>
  <li><strong>Trust:</strong> Does the experience give them enough confidence to take the next step?</li>
  <li><strong>Conversion:</strong> Is the path from interest to action simple on mobile and desktop?</li>
  <li><strong>Retention:</strong> Do customers have a clear reason to return after the first purchase?</li>
  <li><strong>Capacity:</strong> Can your systems support more demand without creating new friction?</li>
</ul>

<p>Choose the weakest connection and define one practical improvement you can make next. A focused change is often more useful than adding another disconnected tactic.</p>

<p>If you want an outside perspective, a Growth Review can help identify the constraint that deserves attention first.</p>`)
  const [ctaText, setCtaText] = useState('Request A Growth Review')
  const [ctaUrl, setCtaUrl] = useState('https://hbeedigitals.com/growth-review')
  const [footerNote, setFooterNote] = useState(
    'Helping businesses build stronger digital systems for measurable growth.'
  )

  useEffect(() => {
    const controller = new AbortController()
    setSubscribersCount(null)
    setSubscribersError('')
    async function fetchSubscribersCount() {
      try {
        const response = await fetch(`/api/admin/subscribers?mode=count&audience=${encodeURIComponent(audienceType)}`, { cache: 'no-store', signal: controller.signal })
        const result = await response.json()
        if (!response.ok || !Number.isInteger(result.count)) throw Error(result.error || 'Subscriber count could not be loaded. Please retry.')
        if (!controller.signal.aborted) setSubscribersCount(result.count)
      } catch (error) {
        if (!controller.signal.aborted) setSubscribersError((error as Error).message)
      }
    }
    fetchSubscribersCount()
    return () => controller.abort()
  }, [audienceType])

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
    if (!subject.trim() || !contentHtml.trim()) {
      alert('Subject and content are required.')
      return
    }

    if (sendNow && (subscribersCount === null || subscribersCount === 0)) {
      alert(subscribersCount === null ? 'Load the subscriber count successfully before sending.' : 'No active subscribers found for this audience.')
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
      // Every key below is a real column of public.newsletter_campaigns.
      //
      // `content` (NOT NULL) is the campaign body. It was previously sent as
      // `content_html`, which does not exist in the table, so PostgREST
      // rejected the whole INSERT and both Save Draft and Send Now failed.
      //
      // The subject line is the campaign's persisted identifier; the table has
      // no title column.
      .insert({
        subject,
        content: contentHtml,
        preview_text: previewText,
        sender_name: senderName,
        sender_email: senderEmail,
        reply_to_email: replyToEmail,
        campaign_type: campaignType,
        audience_type: audienceType,
        featured_image: featuredImage || null,
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
                  label={`Audience (${subscribersCount === null ? 'count unavailable' : `${subscribersCount} contacts`})`}
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

              {subscribersError && <p role="alert" className="text-sm text-red-500">{subscribersError}</p>}

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
              disabled={saving || sending || subscribersCount === null}
              className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-black text-[#07111F]"
            >
              {sending ? 'Sending...' : `Send Now to ${subscribersCount ?? '—'}`}
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
