'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface TeamMember {
  id: string
  name: string
  position?: string
  role?: string
  bio?: string
  image_url?: string
  image?: string
  photo_url?: string
  avatar_url?: string
  profile_image?: string
  image_path?: string
  social_twitter?: string
  social_linkedin?: string
  social_github?: string
  social_instagram?: string
  display_order?: number
  is_active?: boolean
}

const TEAM_BUCKETS = ['team-images', 'team', 'team-members', 'uploads']

function isFullUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
}

function cleanStoragePath(value: string) {
  return value
    .replace(/^\/+/, '')
    .replace(/^storage\/v1\/object\/public\//, '')
    .trim()
}

function getPublicImageUrl(path: string) {
  if (!path) return ''

  if (isFullUrl(path)) return path

  const cleaned = cleanStoragePath(path)

  if (cleaned.startsWith('team-images/')) {
    const filePath = cleaned.replace('team-images/', '')
    return supabase.storage.from('team-images').getPublicUrl(filePath).data.publicUrl
  }

  if (cleaned.startsWith('team/')) {
    const filePath = cleaned.replace('team/', '')
    return supabase.storage.from('team').getPublicUrl(filePath).data.publicUrl
  }

  if (cleaned.startsWith('team-members/')) {
    const filePath = cleaned.replace('team-members/', '')
    return supabase.storage.from('team-members').getPublicUrl(filePath).data.publicUrl
  }

  if (cleaned.startsWith('uploads/')) {
    const filePath = cleaned.replace('uploads/', '')
    return supabase.storage.from('uploads').getPublicUrl(filePath).data.publicUrl
  }

  return supabase.storage.from('team-images').getPublicUrl(cleaned).data.publicUrl
}

function getTeamImage(member: TeamMember) {
  const raw =
    member.image_url ||
    member.photo_url ||
    member.avatar_url ||
    member.profile_image ||
    member.image_path ||
    member.image ||
    ''

  return getPublicImageUrl(raw)
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
            The people behind the{' '}
            <span className="bg-gradient-to-r from-[#39D97A] via-[#6EEB73] to-[#C6F135] bg-clip-text text-transparent">
              digital systems.
            </span>
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
                        className="h-full w-full object-cover object-center transition duration-700 group-hover:scale-[1.04]"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
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