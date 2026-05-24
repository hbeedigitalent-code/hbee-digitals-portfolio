'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function NewEmailTemplatePage() {
  const router = useRouter()

  const [form, setForm] = useState({
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
  })

  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setSaving(true)

    const { error } = await supabase
      .from('email_templates')
      .insert([form])

    setSaving(false)

    if (!error) {
      router.push('/admin/email-templates')
    }
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mb-8">
        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
          Admin / Email Templates
        </p>

        <h1 className="text-4xl font-black tracking-[-0.05em]">
          New Email Template
        </h1>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6"
      >
        <div className="grid gap-5 lg:grid-cols-2">
          <input
            placeholder="Template Name"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
            className="h-14 rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm outline-none"
          />

          <input
            placeholder="template-slug"
            value={form.slug}
            onChange={(e) =>
              setForm({ ...form, slug: e.target.value })
            }
            className="h-14 rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm outline-none"
          />
        </div>

        <input
          placeholder="Email Subject"
          value={form.subject}
          onChange={(e) =>
            setForm({ ...form, subject: e.target.value })
          }
          className="h-14 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 text-sm outline-none"
        />

        <textarea
          placeholder="Preheader"
          value={form.preheader}
          onChange={(e) =>
            setForm({ ...form, preheader: e.target.value })
          }
          className="h-28 w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 text-sm outline-none"
        />

        <textarea
          placeholder="HTML Body"
          value={form.body_html}
          onChange={(e) =>
            setForm({ ...form, body_html: e.target.value })
          }
          className="min-h-[420px] w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-5 py-4 text-sm outline-none"
        />

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F]"
        >
          {saving ? 'Saving...' : 'Create Template'}
        </button>
      </form>
    </main>
  )
}