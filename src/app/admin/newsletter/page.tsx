'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import SvgIcon from '@/components/ui/SvgIcon'
import ImageUpload from '@/components/ImageUpload'

const ReactQuill = dynamic(() => import('react-quill'), {
  ssr: false,
  loading: () => <div className="h-[300px] rounded-lg border border-[var(--border)] bg-[var(--bg-section)] animate-pulse" />
})

import 'react-quill/dist/quill.snow.css'

export default function NewNewsletterPage() {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [subscribersCount, setSubscribersCount] = useState(0)

  // Campaign fields
  const [title, setTitle] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [senderName, setSenderName] = useState('Hbee Digitals')
  const [senderEmail, setSenderEmail] = useState('forms@send.hbeedigitals.com')
  const [replyToEmail, setReplyToEmail] = useState('hello@hbeedigitals.com')
  const [campaignType, setCampaignType] = useState('Growth Insight')
  const [audienceType, setAudienceType] = useState('all_subscribers')
  const [featuredImage, setFeaturedImage] = useState('')
  const [content, setContent] = useState('')
  const [ctaText, setCtaText] = useState('Read More')
  const [ctaUrl, setCtaUrl] = useState('https://www.hbeedigitals.com/blog')
  const [footerNote, setFooterNote] = useState('')
  const [status, setStatus] = useState('draft')

  const campaignTypes = [
    'Ecommerce Growth Insight', 'Shopify Store Review', 'Brand Strategy',
    'Conversion Optimization', 'Case Study', 'Service Promotion',
    'Monthly Update', 'Lead Nurture', 'Announcement'
  ]

  const audienceOptions = [
    { value: 'all_subscribers', label: 'All Subscribers' },
    { value: 'all_leads', label: 'All Leads' },
    { value: 'ecommerce_merchants', label: 'Ecommerce Merchants' },
    { value: 'shopify_leads', label: 'Shopify Leads' },
    { value: 'warm_leads', label: 'Warm Leads' },
    { value: 'cold_leads', label: 'Cold Leads' },
    { value: 'existing_clients', label: 'Existing Clients' },
  ]

  useEffect(() => {
    fetchSubscribersCount()
  }, [audienceType])

  async function fetchSubscribersCount() {
    try {
      let query = supabase.from('newsletter_subscribers').select('*', { count: 'exact', head: true })
      
      if (audienceType === 'ecommerce_merchants') {
        query = query.contains('tags', ['ecommerce'])
      } else if (audienceType === 'shopify_leads') {
        query = query.contains('tags', ['shopify'])
      } else if (audienceType === 'existing_clients') {
        query = query.eq('segment', 'client')
      } else if (audienceType === 'warm_leads') {
        query = query.contains('tags', ['warm'])
      } else if (audienceType === 'cold_leads') {
        query = query.contains('tags', ['cold'])
      }
      
      const { count } = await query
      setSubscribersCount(count || 0)
    } catch (err) {
      console.error('Error fetching subscribers count:', err)
      setSubscribersCount(0)
    }
  }

  async function saveCampaign(sendNow: boolean = false) {
    if (sendNow && subscribersCount === 0) {
      alert('No subscribers to send to. Please add subscribers first.')
      return
    }

    if (sendNow && !window.confirm(`Send this campaign to ${subscribersCount} contacts? This action cannot be undone.`)) {
      return
    }

    setSaving(true)
    
    const campaignData = {
      title,
      subject,
      preview_text: previewText,
      sender_name: senderName,
      sender_email: senderEmail,
      reply_to_email: replyToEmail,
      campaign_type: campaignType,
      audience_type: audienceType,
      featured_image: featuredImage,
      content_html: content,
      cta_text: ctaText,
      cta_url: ctaUrl,
      footer_note: footerNote,
      status: sendNow ? 'sent' : status,
      sent_at: sendNow ? new Date().toISOString() : null,
      total_recipients: sendNow ? subscribersCount : 0,
    }

    try {
      const { data, error } = await supabase
        .from('newsletter_campaigns')
        .insert([campaignData])
        .select()
        .single()

      if (error) {
        alert(error.message)
        setSaving(false)
        return
      }

      if (sendNow) {
        setSending(true)
        // Send emails via API
        const response = await fetch('/api/send-newsletter', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: data.id }),
        })
        
        if (response.ok) {
          router.push('/admin/newsletter')
        } else {
          const result = await response.json()
          alert(result.error || 'Failed to send emails. Campaign saved as draft.')
          router.push('/admin/newsletter')
        }
        setSending(false)
      } else {
        router.push('/admin/newsletter')
      }
    } catch (err) {
      console.error('Error saving campaign:', err)
      alert('An error occurred. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const quillModules = {
    toolbar: [
      [{ header: [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'blockquote', 'code-block'],
      ['clean'],
    ],
  }

  // Email preview HTML
  const emailPreview = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <!-- Header -->
      <div style="background: #0A1D37; padding: 30px 20px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Hbee Digitals</h1>
        <p style="color: #39D97A; margin: 5px 0 0; font-size: 12px;">Digital Growth Studio</p>
      </div>
      
      <!-- Content -->
      <div style="padding: 30px 20px; background: white;">
        ${featuredImage ? `<img src="${featuredImage}" style="width: 100%; border-radius: 12px; margin-bottom: 24px;" />` : ''}
        <span style="display: inline-block; background: #39D97A; color: #0A1D37; font-size: 10px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;">${campaignType}</span>
        <h2 style="color: #0A1D37; margin: 0 0 16px; font-size: 28px;">${subject}</h2>
        <div style="color: #3A4A62; line-height: 1.6;">${content}</div>
        
        <!-- CTA Button -->
        <div style="text-align: center; margin: 32px 0;">
          <a href="${ctaUrl}" style="display: inline-block; background: linear-gradient(135deg, #FF6B35 0%, #39D97A 100%); color: white; text-decoration: none; padding: 12px 32px; border-radius: 50px; font-weight: bold;">
            ${ctaText}
          </a>
        </div>
      </div>
      
      <!-- Footer -->
      <div style="background: #F5F7FA; padding: 20px; text-align: center; font-size: 12px; color: #6B7A96;">
        <p>© 2026 Hbee Digitals. All rights reserved.</p>
        <p>${footerNote || 'Practical insights for better websites, stores, and growth.'}</p>
        <p style="margin-top: 16px;">
          <a href="{{unsubscribe_url}}" style="color: #39D97A; text-decoration: none;">Unsubscribe</a> | 
          <a href="https://www.hbeedigitals.com/privacy" style="color: #39D97A; text-decoration: none;">Privacy Policy</a>
        </p>
      </div>
    </div>
  `

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] sm:text-3xl">Create Newsletter Campaign</h1>
          <p className="text-sm text-[var(--text-muted)]">Design and send branded growth emails to your audience</p>
        </div>
        <Link href="/admin/newsletter" className="text-[var(--accent)] hover:underline">
          ← Back to Campaigns
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">Campaign Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Campaign Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Q3 Growth Newsletter"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Email Subject Line *</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                  placeholder="What your subscribers see in their inbox"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3 text-[var(--text-primary)]"
                />
                <p className="mt-1 text-xs text-[var(--text-muted)]">{subject.length} / 60 recommended</p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-[var(--text-primary)]">Preview Text</label>
                <input
                  type="text"
                  value={previewText}
                  onChange={(e) => setPreviewText(e.target.value)}
                  placeholder="Shown next to subject line in some email clients"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">Campaign Type</label>
                  <select
                    value={campaignType}
                    onChange={(e) => setCampaignType(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  >
                    {campaignTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-bold">Audience</label>
                  <select
                    value={audienceType}
                    onChange={(e) => setAudienceType(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  >
                    {audienceOptions.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-[var(--text-muted)]">{subscribersCount} contacts will receive this</p>
                </div>
              </div>
            </div>
          </div>

          {/* Sender Info */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">Sender Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-bold">Sender Name</label>
                <input
                  type="text"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-bold">Sender Email</label>
                <input
                  type="email"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-bold">Reply-to Email</label>
                <input
                  type="email"
                  value={replyToEmail}
                  onChange={(e) => setReplyToEmail(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
            <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">Email Content</h2>
            
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-bold">Featured Image</label>
                <ImageUpload
                  onUpload={setFeaturedImage}
                  currentImage={featuredImage}
                  folder="newsletters"
                  label="Upload image"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Email Body *</label>
                <ReactQuill
                  theme="snow"
                  value={content}
                  onChange={setContent}
                  modules={quillModules}
                  className="bg-white rounded-lg"
                  style={{ minHeight: 300 }}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-bold">CTA Button Text</label>
                  <input
                    type="text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-bold">CTA Button URL</label>
                  <input
                    type="url"
                    value={ctaUrl}
                    onChange={(e) => setCtaUrl(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Footer Note</label>
                <textarea
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-section)] p-3"
                  placeholder="Additional footer text..."
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => saveCampaign(false)}
              disabled={saving}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-6 py-2.5 text-sm font-black text-[var(--text-primary)] hover:border-[var(--accent)]/25 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="rounded-full border border-[var(--border)] px-6 py-2.5 text-sm font-black text-[var(--text-primary)] hover:border-[var(--accent)]/25"
            >
              Preview
            </button>
            <button
              type="button"
              onClick={() => saveCampaign(true)}
              disabled={sending || subscribersCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-gradient-orange-green px-6 py-2.5 text-sm font-black text-white transition hover:scale-105 disabled:opacity-50"
            >
              <SvgIcon name="send" size={14} color="white" />
              {sending ? 'Sending...' : `Send to ${subscribersCount} contacts`}
            </button>
          </div>
        </div>

        {/* Right Column - Live Preview */}
        <div className="sticky top-6 rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-4 text-lg font-black text-[var(--text-primary)]">Email Preview</h2>
          <div className="rounded-lg border border-[var(--border)] bg-white p-4 max-h-[600px] overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: emailPreview }} />
          </div>
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm font-bold hover:bg-[var(--bg-section)]"
            >
              Desktop Preview
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="flex-1 rounded-lg border border-[var(--border)] py-2 text-sm font-bold hover:bg-[var(--bg-section)]"
            >
              Mobile Preview
            </button>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <>
          <div className="fixed inset-0 z-50 bg-black/75" onClick={() => setShowPreview(false)} />
          <div className="fixed left-1/2 top-1/2 z-50 h-[80vh] w-[90vw] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-[var(--border)] bg-white">
            <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border)] bg-white p-4">
              <h2 className="text-lg font-black">Email Preview</h2>
              <button onClick={() => setShowPreview(false)} className="text-2xl hover:text-[var(--accent)]">×</button>
            </div>
            <div className="p-6">
              <div dangerouslySetInnerHTML={{ __html: emailPreview }} />
            </div>
          </div>
        </>
      )}
    </div>
  )
}