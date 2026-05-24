'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface EmailTemplateForm {
  name: string
  slug: string
  subject: string
  preheader: string
  body_html: string
  body_text: string
  from_name: string
  from_email: string
  reply_to: string
  is_active: boolean
}

const defaultForm: EmailTemplateForm = {
  name: '',
  slug: '',
  subject: '',
  preheader: '',
  body_html: '',
  body_text: '',
  from_name: 'Hbee Digitals',
  from_email: 'noreply@send.hbeedigitals.com',
  reply_to: 'hello@hbeedigitals.com',
  is_active: true,
}

export default function EditEmailTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params?.id || '')

  const [form, setForm] = useState<EmailTemplateForm>(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (id) fetchTemplate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function fetchTemplate() {
    setLoading(true)
    setErrorMessage('')

    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      setErrorMessage(error.message)
      setLoading(false)
      return
    }

    if (!data) {
      router.push('/admin/email-templates')
      return
    }

    setForm({
      name: data.name || '',
      slug: data.slug || '',
      subject: data.subject || '',
      preheader: data.preheader || '',
      body_html: data.body_html || '',
      body_text: data.body_text || '',
      from_name: data.from_name || 'Hbee Digitals',
      from_email: data.from_email || 'noreply@send.hbeedigitals.com',
      reply_to: data.reply_to || 'hello@hbeedigitals.com',
      is_active: data.is_active ?? true,
    })

    setLoading(false)
  }

  function updateField<K extends keyof EmailTemplateForm>(
    key: K,
    value: EmailTemplateForm[K]
  ) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    if (!form.name.trim() || !form.slug.trim() || !form.subject.trim()) {
      setErrorMessage('Name, slug, and subject are required.')
      return
    }

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const { error } = await supabase
      .from('email_templates')
      .update({
        name: form.name.trim(),
        slug: form.slug.trim(),
        subject: form.subject.trim(),
        preheader: form.preheader,
        body_html: form.body_html,
        body_text: form.body_text,
        from_name: form.from_name.trim() || 'Hbee Digitals',
        from_email:
          form.from_email.trim() || 'noreply@send.hbeedigitals.com',
        reply_to: form.reply_to.trim() || 'hello@hbeedigitals.com',
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setMessage('Template updated successfully.')
  }

  async function deleteTemplate() {
    if (!confirm('Delete this email template?')) return

    setSaving(true)
    setMessage('')
    setErrorMessage('')

    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id)

    setSaving(false)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    router.push('/admin/email-templates')
  }

  if (loading) {
    return (
      <main className="min-h-screen text-white">
        <div className="mx-auto max-w-6xl">
          <div className="h-72 animate-pulse rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Admin / Email Templates
            </p>

            <h1 className="text-4xl font-black tracking-[-0.05em]">
              Edit Email Template
            </h1>

            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
              Update sender details, subject, template content, and status.
            </p>
          </div>

          <Link
            href="/admin/email-templates"
            className="w-fit rounded-full border border-[#1E314A] bg-[#0E1B2D] px-5 py-3 text-sm font-black text-white/70 transition hover:border-[#39D97A]/25 hover:text-white"
          >
            Back
          </Link>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 rounded-2xl border border-red-400/25 bg-red-400/10 px-5 py-4 text-sm font-bold text-red-300">
            {errorMessage}
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 sm:p-6"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <Field
              label="Template Name"
              value={form.name}
              onChange={(value) => updateField('name', value)}
              required
            />

            <Field
              label="Template Slug"
              value={form.slug}
              onChange={(value) => updateField('slug', value)}
              required
            />
          </div>

          <Field
            label="Email Subject"
            value={form.subject}
            onChange={(value) => updateField('subject', value)}
            required
          />

          <div className="grid gap-5 lg:grid-cols-3">
            <Field
              label="From Name"
              value={form.from_name}
              onChange={(value) => updateField('from_name', value)}
            />

            <Field
              label="From Email"
              value={form.from_email}
              onChange={(value) => updateField('from_email', value)}
            />

            <Field
              label="Reply-To"
              value={form.reply_to}
              onChange={(value) => updateField('reply_to', value)}
            />
          </div>

          <Textarea
            label="Preheader"
            value={form.preheader}
            onChange={(value) => updateField('preheader', value)}
            rows={3}
          />

          <Textarea
            label="HTML Body"
            value={form.body_html}
            onChange={(value) => updateField('body_html', value)}
            rows={18}
            helper="You can use HTML tags and variables like {{name}}, {{email}}, {{message}}."
          />

          <Textarea
            label="Plain Text Body"
            value={form.body_text}
            onChange={(value) => updateField('body_text', value)}
            rows={7}
          />

          <div className="rounded-2xl border border-[#1E314A] bg-[#07111F] p-5">
            <p className="mb-3 text-sm font-black text-white">
              Available Variables
            </p>

            <div className="flex flex-wrap gap-2 text-xs">
              {[
                '{{name}}',
                '{{fullName}}',
                '{{email}}',
                '{{phone}}',
                '{{company}}',
                '{{website}}',
                '{{service}}',
                '{{budget}}',
                '{{timeline}}',
                '{{message}}',
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(item).catch(() => {})
                  }
                  className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-3 py-1 text-[#39D97A] transition hover:bg-[#39D97A]/15"
                >
                  {item}
                </button>
              ))}
            </div>

            <p className="mt-3 text-xs leading-6 text-white/45">
              Click a variable to copy it, then paste it into your subject or
              email body.
            </p>
          </div>

          <label className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] p-4">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateField('is_active', e.target.checked)}
              className="h-5 w-5"
            />

            <span className="text-sm font-bold text-white/70">
              Template is active
            </span>
          </label>

          <div className="flex flex-wrap gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Update Template'}
            </button>

            <button
              type="button"
              onClick={deleteTemplate}
              disabled={saving}
              className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-red-400/25 bg-red-400/10 px-8 py-3 text-sm font-black text-red-300 transition hover:bg-red-400/15 disabled:opacity-50"
            >
              Delete Template
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}

function Field({
  label,
  value,
  onChange,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <input
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm text-white outline-none transition focus:border-[#39D97A]/30"
      />
    </div>
  )
}

function Textarea({
  label,
  value,
  onChange,
  rows,
  helper,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  rows: number
  helper?: string
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-white">
        {label}
      </label>

      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 text-sm leading-7 text-white outline-none transition focus:border-[#39D97A]/30"
      />

      {helper && (
        <p className="mt-2 text-xs leading-6 text-white/45">
          {helper}
        </p>
      )}
    </div>
  )
}