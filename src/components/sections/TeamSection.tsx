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
  bio?: string
  image_url?: string
  social_twitter?: string
  social_linkedin?: string
  social_github?: string
  social_instagram?: string
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
    <section className="relative overflow-hidden bg-[#07111F] py-16 text-white sm:py-20 lg:py-24">
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute left-0 top-20 h-[320px] w-[420px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-12 max-w-4xl">
          <p className="mb-5 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            Our Team
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            The people behind the digital systems.
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
            Strategy, design, development, and support working together to help brands grow online.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, index) => (
            <motion.article
              key={member.id}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.42, delay: index * 0.05 }}
              viewport={{ once: true }}
              className="group relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-2 hover:border-[#39D97A]/28 hover:bg-[#13233A]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.11),transparent_42%)]" />

              <div className="relative">
                <div className="relative mb-6 h-72 overflow-hidden rounded-[2rem] rounded-br-[4rem] border border-[#1E314A] bg-[#07111F] transition duration-500 group-hover:border-[#39D97A]/24 sm:h-80">
                  {member.image_url ? (
                    <Image
                      src={member.image_url}
                      alt={member.name}
                      fill
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#07111F] via-[#0E1B2D] to-[#13233A]">
                      <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] rounded-br-[4rem] border border-[#39D97A]/20 bg-[#39D97A]/10 text-5xl font-black text-[#39D97A] shadow-[0_0_45px_rgba(57,217,122,0.12)]">
                        {member.name?.charAt(0) || 'H'}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/76 via-[#07111F]/6 to-transparent" />

                  <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-[#07111F]/74 p-4 backdrop-blur-xl">
                    <h3 className="text-xl font-black tracking-[-0.035em] text-white">
                      {member.name}
                    </h3>

                    <p className="mt-1 text-sm font-bold text-[#39D97A]">
                      {member.position}
                    </p>
                  </div>
                </div>

                {member.bio && (
                  <p className="line-clamp-2 text-sm leading-7 text-white/56">
                    {member.bio}
                  </p>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
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
                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#0E1B2D] transition hover:-translate-y-1 hover:border-[#39D97A]/30 hover:bg-[#13233A]"
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