'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface TeamMember {
  id: string
  name: string
  position: string
  bio: string
  image_url: string
  social_twitter: string
  social_linkedin: string
  social_github: string
  social_instagram: string
  display_order: number
}

export default function TeamSection() {
  const reducedMotion = useReducedMotion()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      const { data } = await supabase
        .from('team_members')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setMembers(data || [])
      setLoading(false)
    }

    fetchMembers()
  }, [])

  if (loading || members.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[#060E1C] py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-20 h-[360px] w-[460px] rounded-full bg-[#39D97A]/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 text-center">
          <p className="mb-5 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Our Team
          </p>

          <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] sm:text-5xl md:text-6xl">
            The minds behind the digital systems.
          </h2>

          <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
            A team focused on strategy, execution, design, development, and growth support.
          </p>
        </div>

        <div
          className="grid gap-6"
          style={{
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          }}
        >
          {members.map((member, index) => (
            <motion.article
              key={member.id}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: index * 0.06 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[1.8rem] border border-white/10 bg-[#08182D] p-6 text-center shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/30 hover:bg-[#39D97A]/8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(57,217,122,0.16),transparent_42%)] opacity-70" />

              <div className="relative mx-auto mb-6 h-32 w-32">
                <div className="absolute inset-0 rounded-full bg-[#39D97A]/30 blur-xl opacity-0 transition duration-500 group-hover:opacity-100" />

                <div className="relative h-full w-full overflow-hidden rounded-full border border-[#39D97A]/20 bg-[#071427] ring-4 ring-[#39D97A]/8 transition duration-300 group-hover:ring-[#39D97A]/20">
                  {member.image_url ? (
                    <Image
                      src={member.image_url}
                      alt={member.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-110"
                      sizes="128px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl font-black text-[#39D97A]">
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative">
                <h3 className="text-xl font-black tracking-[-0.035em] text-white">
                  {member.name}
                </h3>

                <p className="mt-2 text-sm font-bold text-[#39D97A]">
                  {member.position}
                </p>

                {member.bio && (
                  <p className="mx-auto mt-4 max-w-xs text-sm leading-7 text-white/55">
                    {member.bio}
                  </p>
                )}

                <div className="mt-6 flex justify-center gap-2">
                  {[
                    { url: member.social_twitter, icon: 'twitter', label: 'Twitter' },
                    { url: member.social_linkedin, icon: 'linkedin', label: 'LinkedIn' },
                    { url: member.social_github, icon: 'github', label: 'GitHub' },
                    { url: member.social_instagram, icon: 'instagram', label: 'Instagram' },
                  ]
                    .filter((item) => item.url)
                    .map((item) => (
                      <a
                        key={item.label}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`${member.name} on ${item.label}`}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] transition hover:-translate-y-1 hover:border-[#39D97A]/30 hover:bg-[#39D97A]/12"
                      >
                        <SvgIcon name={item.icon} size={17} color="#39D97A" />
                      </a>
                    ))}
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}