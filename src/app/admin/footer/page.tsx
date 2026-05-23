'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface FooterLink {
  label: string
  href: string
}

interface FooterColumn {
  title: string
  links: FooterLink[]
}

interface SocialLink {
  platform: string
  url: string
  icon: string
  is_active?: boolean
}

interface FooterSettings {
  id?: string
  logo_text: string
  copyright_text: string
  columns: FooterColumn[]
  social_links: SocialLink[]
}

const defaultFooter: FooterSettings = {
  logo_text: 'Hbee Digitals',
  copyright_text: `© ${new Date().getFullYear()} Hbee Digitals. All rights reserved.`,
  columns: [
    {
      title: 'Services',
      links: [
        { label: 'Website Development', href: '/services' },
        { label: 'Ecommerce Solutions', href: '/services' },
        { label: 'Shopify Optimization', href: '/services' },
        { label: 'Brand Strategy', href: '/services' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Portfolio', href: '/portfolio' },
        { label: 'Process', href: '/process' },
        { label: 'FAQ', href: '/faq' },
        { label: 'Contact', href: '/contact' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy Policy', href: '/privacy' },
        { label: 'Terms of Service', href: '/terms' },
        { label: 'Cookie Policy', href: '/cookies' },
      ],
    },
  ],
  social_links: [],
}

export default function AdminFooterPage() {
  const [form, setForm] = useState<FooterSettings>(defaultFooter)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    async function fetchFooter() {
      const { data } = await supabase
        .from('footer_settings')
        .select('*')
        .limit(1)
        .maybeSingle()

      if (data) {
        setForm({
          ...defaultFooter,
          ...data,
          columns: data.columns || defaultFooter.columns,
          social_links: data.social_links || [],
        })
      }

      setLoading(false)
    }

    fetchFooter()
  }, [])

  function updateColumnTitle(index: number, title: string) {
    const columns = [...form.columns]
    columns[index].title = title
    setForm({ ...form, columns })
  }

  function updateFooterLink(
    columnIndex: number,
    linkIndex: number,
    field: keyof FooterLink,
    value: string
  ) {
    const columns = [...form.columns]
    columns[columnIndex].links[linkIndex][field] = value
    setForm({ ...form, columns })
  }

  function addFooterLink(columnIndex: number) {
    const columns = [...form.columns]
    columns[columnIndex].links.push({ label: 'New Link', href: '/' })
    setForm({ ...form, columns })
  }

  function removeFooterLink(columnIndex: number, linkIndex: number) {
    const columns = [...form.columns]
    columns[columnIndex].links = columns[columnIndex].links.filter(
      (_, index) => index !== linkIndex
    )
    setForm({ ...form, columns })
  }

  function addColumn() {
    setForm({
      ...form,
      columns: [...form.columns, { title: 'New Column', links: [] }],
    })
  }

  function removeColumn(index: number) {
    setForm({
      ...form,
      columns: form.columns.filter((_, i) => i !== index),
    })
  }

  function updateSocial(
    index: number,
    field: keyof SocialLink,
    value: string | boolean
  ) {
    const social_links = [...form.social_links]
    social_links[index] = {
      ...social_links[index],
      [field]: value,
    }
    setForm({ ...form, social_links })
  }

  function addSocial() {
    setForm({
      ...form,
      social_links: [
        ...form.social_links,
        {
          platform: 'Instagram',
          url: '',
          icon: 'instagram',
          is_active: true,
        },
      ],
    })
  }

  function removeSocial(index: number) {
    setForm({
      ...form,
      social_links: form.social_links.filter((_, i) => i !== index),
    })
  }

  async function handleSave() {
    setSaving(true)
    setMessage('')

    const payload = {
      logo_text: form.logo_text,
      copyright_text: form.copyright_text,
      columns: form.columns,
      social_links: form.social_links,
      updated_at: new Date().toISOString(),
    }

    if (form.id) {
      const { error } = await supabase
        .from('footer_settings')
        .update(payload)
        .eq('id', form.id)

      if (error) {
        setMessage(`Save failed: ${error.message}`)
      } else {
        setMessage('Footer settings updated successfully.')
      }
    } else {
      const { data, error } = await supabase
        .from('footer_settings')
        .insert(payload)
        .select()
        .single()

      if (error) {
        setMessage(`Save failed: ${error.message}`)
      } else {
        setForm({ ...form, id: data.id })
        setMessage('Footer settings created successfully.')
      }
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white">
        Loading footer settings...
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#07111F] px-5 py-10 text-white sm:px-6 md:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Admin / Footer
          </p>

          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Manage Footer Content
          </h1>

          <p className="mt-3 max-w-2xl text-sm leading-7 text-white/55">
            Control footer columns, legal links, contact links, and social icons from here.
          </p>
        </div>

        {message && (
          <div className="mb-6 rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-4 text-sm font-bold text-[#39D97A]">
            {message}
          </div>
        )}

        <div className="space-y-6">
          <AdminCard title="Brand Footer Text">
            <Input
              label="Footer Brand Text"
              value={form.logo_text}
              onChange={(value) => setForm({ ...form, logo_text: value })}
            />

            <Input
              label="Copyright Text"
              value={form.copyright_text}
              onChange={(value) => setForm({ ...form, copyright_text: value })}
            />
          </AdminCard>

          <AdminCard title="Footer Columns">
            <div className="space-y-6">
              {form.columns.map((column, columnIndex) => (
                <div
                  key={columnIndex}
                  className="rounded-2xl border border-[#1E314A] bg-[#07111F] p-4"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <Input
                      label="Column Title"
                      value={column.title}
                      onChange={(value) => updateColumnTitle(columnIndex, value)}
                    />

                    <button
                      type="button"
                      onClick={() => removeColumn(columnIndex)}
                      className="mt-7 rounded-full border border-red-500/30 px-4 py-2 text-xs font-black text-red-300"
                    >
                      Remove
                    </button>
                  </div>

                  <div className="space-y-3">
                    {column.links.map((link, linkIndex) => (
                      <div
                        key={linkIndex}
                        className="grid gap-3 rounded-xl border border-[#1E314A] bg-[#0E1B2D] p-3 md:grid-cols-[1fr_1fr_auto]"
                      >
                        <Input
                          label="Label"
                          value={link.label}
                          onChange={(value) =>
                            updateFooterLink(columnIndex, linkIndex, 'label', value)
                          }
                        />

                        <Input
                          label="Href"
                          value={link.href}
                          onChange={(value) =>
                            updateFooterLink(columnIndex, linkIndex, 'href', value)
                          }
                        />

                        <button
                          type="button"
                          onClick={() => removeFooterLink(columnIndex, linkIndex)}
                          className="mt-7 rounded-full border border-red-500/30 px-4 py-2 text-xs font-black text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => addFooterLink(columnIndex)}
                    className="mt-4 rounded-full border border-[#39D97A]/25 px-4 py-2 text-xs font-black text-[#39D97A]"
                  >
                    + Add Link
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addColumn}
              className="mt-5 rounded-full bg-[#39D97A] px-5 py-2.5 text-sm font-black text-[#06101F]"
            >
              + Add Column
            </button>
          </AdminCard>

          <AdminCard title="Social Icons">
            <p className="mb-4 text-sm leading-7 text-white/55">
              Only active social icons with real URLs will show in the footer. Leave inactive
              ones hidden until the real page is ready.
            </p>

            <div className="space-y-4">
              {form.social_links.map((social, index) => (
                <div
                  key={index}
                  className="grid gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] p-4 md:grid-cols-[1fr_1fr_1fr_auto]"
                >
                  <Input
                    label="Platform"
                    value={social.platform}
                    onChange={(value) => updateSocial(index, 'platform', value)}
                  />

                  <Input
                    label="URL"
                    value={social.url}
                    onChange={(value) => updateSocial(index, 'url', value)}
                  />

                  <Input
                    label="Icon Name"
                    value={social.icon}
                    onChange={(value) => updateSocial(index, 'icon', value)}
                  />

                  <div className="flex items-end gap-3">
                    <label className="flex items-center gap-2 rounded-xl border border-[#1E314A] px-3 py-2 text-sm font-bold text-white/70">
                      <input
                        type="checkbox"
                        checked={social.is_active !== false}
                        onChange={(e) =>
                          updateSocial(index, 'is_active', e.target.checked)
                        }
                        className="accent-[#39D97A]"
                      />
                      Active
                    </label>

                    <button
                      type="button"
                      onClick={() => removeSocial(index)}
                      className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-black text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addSocial}
              className="mt-5 rounded-full border border-[#39D97A]/25 px-5 py-2.5 text-sm font-black text-[#39D97A]"
            >
              + Add Social Icon
            </button>
          </AdminCard>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Footer Settings'}
          </button>
        </div>
      </div>
    </main>
  )
}

function AdminCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.22)] sm:p-6">
      <h2 className="mb-5 text-xl font-black tracking-[-0.035em] text-white">
        {title}
      </h2>

      <div>{children}</div>
    </section>
  )
}

function Input({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-white/70">
        {label}
      </label>

      <input
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-2xl border border-[#1E314A] bg-[#07111F] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#39D97A]/40"
      />
    </div>
  )
}