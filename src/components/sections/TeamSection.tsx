'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Twitter, Linkedin, Github, Instagram } from 'lucide-react'
import Reveal from '@/components/Reveal'

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
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    const { data } = await supabase
      .from('team_members')
      .select('*')
      .eq('is_active', true)
      .order('display_order')
    setMembers(data || [])
    setLoading(false)
  }

  if (loading || members.length === 0) return null

  return (
    <section className="py-24 relative overflow-hidden" style={{ backgroundColor: 'var(--bg-color)' }}>
      {/* Background glow accents */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/3 left-0 w-96 h-96 bg-[#007BFF] rounded-full filter blur-3xl opacity-5 animate-pulse" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-[#00BFFF] rounded-full filter blur-3xl opacity-5 animate-pulse delay-1000" />
      </div>

      <div className="container mx-auto px-4 relative z-10 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-500/10 text-blue-400 text-sm font-medium mb-4 border border-blue-500/20">
              Our Team
            </span>
          </motion.div>

          <Reveal variant="wipe">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--secondary-color)' }}>
              Meet the Experts
            </h2>
          </Reveal>

          <p className="text-lg max-w-2xl mx-auto mb-6" style={{ color: 'var(--text-muted)' }}>
            The passionate professionals behind every successful project
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto" />
        </div>

        {/* Team Grid */}
        <div className="grid gap-8 max-w-4xl mx-auto" style={{ gridTemplateColumns: `repeat(${Math.min(members.length, 4)}, minmax(0, 1fr))` }}>
          {members.map((member, index) => (
            <motion.article
              key={member.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: [0.22, 1, 0.36, 1] }}
              viewport={{ once: true }}
              whileHover={{ y: -6 }}
              className="group relative flex flex-col items-center text-center"
            >
              {/* Circular image container with ring */}
              <div className="relative w-36 h-36 mb-6">
                {/* Animated gradient ring on hover */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-[#007BFF] to-[#00BFFF] opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-md scale-105" />

                <div className="relative w-full h-full rounded-full overflow-hidden border-2 border-white/10 group-hover:border-transparent transition-all duration-300 ring-2 ring-transparent group-hover:ring-[#007BFF]/50">
                  {member.image_url ? (
                    <Image
                      src={member.image_url}
                      alt={member.name}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-700"
                      sizes="(max-width: 768px) 100vw, 200px"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#007BFF]/20 to-[#00BFFF]/20 text-4xl font-bold" style={{ color: 'var(--secondary-color)' }}>
                      {member.name.charAt(0)}
                    </div>
                  )}
                </div>

                {/* Social icons – appear on hover */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                  {member.social_twitter && (
                    <a href={member.social_twitter} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#1DA1F2] hover:border-[#1DA1F2] transition-all duration-300 hover:scale-110"
                      aria-label={`${member.name} on Twitter`}>
                      <Twitter className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.social_linkedin && (
                    <a href={member.social_linkedin} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-[#0077B5] hover:border-[#0077B5] transition-all duration-300 hover:scale-110"
                      aria-label={`${member.name} on LinkedIn`}>
                      <Linkedin className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.social_github && (
                    <a href={member.social_github} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-gray-700 hover:border-gray-700 transition-all duration-300 hover:scale-110"
                      aria-label={`${member.name} on GitHub`}>
                      <Github className="w-3.5 h-3.5" />
                    </a>
                  )}
                  {member.social_instagram && (
                    <a href={member.social_instagram} target="_blank" rel="noopener noreferrer"
                      className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-gradient-to-br hover:from-pink-500 hover:to-purple-500 hover:border-transparent transition-all duration-300 hover:scale-110"
                      aria-label={`${member.name} on Instagram`}>
                      <Instagram className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              </div>

              {/* Name & Position */}
              <h3 className="text-xl font-bold mb-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#007BFF] group-hover:to-[#00BFFF] transition-all duration-300" style={{ color: 'var(--secondary-color)' }}>
                {member.name}
              </h3>
              <p className="text-sm font-medium mb-3" style={{ color: 'var(--accent-color)' }}>
                {member.position}
              </p>
              {member.bio && (
                <p className="text-sm leading-relaxed max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  {member.bio}
                </p>
              )}
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  )
}