'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .order('created_at', { ascending: false })

    setTemplates(data || [])
    setLoading(false)
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Admin / Email Templates
          </p>

          <h1 className="text-4xl font-black tracking-[-0.05em]">
            Email Templates
          </h1>
        </div>

        <Link
          href="/admin/email-templates/new"
          className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F]"
        >
          New Template
        </Link>
      </div>

      <div className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b border-[#1E314A]">
                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Template
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Slug
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Subject
                </th>

                <th className="px-6 py-5 text-left text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Status
                </th>

                <th className="px-6 py-5 text-right text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {!loading &&
                templates.map((template) => (
                  <tr
                    key={template.id}
                    className="border-b border-[#1E314A]/60"
                  >
                    <td className="px-6 py-5">
                      <p className="font-black text-white">
                        {template.name}
                      </p>
                    </td>

                    <td className="px-6 py-5 text-sm text-white/55">
                      {template.slug}
                    </td>

                    <td className="px-6 py-5 text-sm text-white/65">
                      {template.subject}
                    </td>

                    <td className="px-6 py-5">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] ${
                          template.is_active
                            ? 'bg-[#39D97A]/12 text-[#39D97A]'
                            : 'bg-red-500/12 text-red-400'
                        }`}
                      >
                        {template.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </td>

                    <td className="px-6 py-5 text-right">
                      <Link
                        href={`/admin/email-templates/${template.id}`}
                        className="text-sm font-bold text-[#39D97A]"
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}