'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface TeamMember {
  id: string
  name: string
  position?: string
  role?: string
  bio?: string
  image_url?: string
  photo?: string
  avatar?: string
  photo_url?: string
  avatar_url?: string
  profile_image?: string
  image_path?: string
  image?: string
  social_twitter?: string
  social_linkedin?: string
  social_github?: string
  social_instagram?: string
  display_order?: number
  is_active?: boolean
}

const TEAM_BUCKET = 'team-images'

function isFullUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
}

function getPublicImageUrl(value?: string) {
  if (!value) return ''

  const cleaned = value.trim().replace(/^\/+/, '')

  if (isFullUrl(cleaned)) return cleaned

  if (cleaned.includes('/storage/v1/object/public/')) return cleaned

  if (cleaned.startsWith(`${TEAM_BUCKET}/`)) {
    return supabase.storage
      .from(TEAM_BUCKET)
      .getPublicUrl(cleaned.replace(`${TEAM_BUCKET}/`, '')).data.publicUrl
  }

  return supabase.storage.from(TEAM_BUCKET).getPublicUrl(cleaned).data.publicUrl
}

function getTeamImage(member: TeamMember) {
  return getPublicImageUrl(
    member.image_url ||
      member.photo_url ||
      member.avatar_url ||
      member.profile_image ||
      member.image_path ||
      member.photo ||
      member.avatar ||
      member.image ||
      ''
  )
}

export default function TeamSection() {
  const reducedMotion = useReducedMotion()
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMembers() {
      const { data, error } = await supabase
        .from('team_members')
        .select('*')
        .order('display_order', { ascending: true })

      if (!error) {
        setMembers((data || []).filter((item) => item.is_active !== false))
      }

      setLoading(false)
    }

    fetchMembers()
  }, [])

  const sortedMembers = useMemo(() => {
    return [...members].sort(
      (a, b) => (a.display_order || 0) - (b.display_order || 0)
    )
  }, [members])

  if (loading || sortedMembers.length === 0) return null

  return (
    <section className="relative overflow-hidden bg-[#07111F] py-14 text-white sm:py-18 lg:py-20">
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-20 h-[280px] w-[280px] rounded-full bg-[#39D97A]/7 blur-[100px]" />
        <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[#C6F135]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-10 lg:px-12">
        <div className="mb-10 max-w-4xl">
          <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#39D97A] sm:text-[11px]">
            Our Team
          </p>

          <h2 className="text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
            The people behind the <GradientHeading>digital systems.</GradientHeading>
          </h2>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sortedMembers.map((member, index) => {
            const imageSrc = getTeamImage(member)
            const position = member.position || member.role || 'Team Member'

            return (
              <motion.article
                key={member.id || member.name}
                initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.38, delay: index * 0.04 }}
                viewport={{ once: true }}
                className="group relative overflow-hidden rounded-[1.8rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-4 shadow-[0_24px_70px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/28"
              >
                <div className="relative">
                  <div className="relative mb-5 aspect-[4/4.5] overflow-hidden rounded-[1.6rem] border border-[#1E314A] bg-[#07111F]">
                    {imageSrc ? (
                      <img
                        src={imageSrc}
                        alt={member.name}
                        className="h-full w-full object-cover object-top transition duration-700 group-hover:scale-[1.04]"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = '/images/team-placeholder.jpg'
                        }}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#07111F] via-[#0E1B2D] to-[#13233A]">
                        <div className="flex h-24 w-24 items-center justify-center rounded-[2rem] border border-[#39D97A]/20 bg-[#39D97A]/10 text-4xl font-black text-[#39D97A]">
                          {member.name?.charAt(0) || 'H'}
                        </div>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/82 via-[#07111F]/8 to-transparent" />

                    <div className="absolute bottom-4 left-4 right-4 rounded-2xl border border-white/10 bg-[#07111F]/78 p-4 backdrop-blur-xl">
                      <h3 className="text-lg font-black tracking-[-0.035em] text-white">
                        {member.name}
                      </h3>

                      <p className="mt-1 text-sm font-bold text-[#39D97A]">
                        {position}
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
            )
          })}
        </div>
      </div>
    </section>
  )
}