'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion } from 'framer-motion'
import Link from 'next/link'

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

  if (loading || members.length === 0) {
    return null
  }

  return (
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            Meet Our Team
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            The passionate experts behind our success
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 text-center"
            >
              <div className="p-6">
                {/* Avatar */}
                <div className="relative mb-4">
                  <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100">
                    {member.image_url ? (
                      <Image
                        src={member.image_url}
                        alt={member.name}
                        width={128}
                        height={128}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl font-bold" style={{ color: 'var(--primary-color)' }}>
                          {member.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <div className="flex gap-1">
                      {member.social_twitter && (
                        <a href={member.social_twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition">
                          <span className="text-sm">🐦</span>
                        </a>
                      )}
                      {member.social_linkedin && (
                        <a href={member.social_linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-blue-100 transition">
                          <span className="text-sm">🔗</span>
                        </a>
                      )}
                      {member.social_github && (
                        <a href={member.social_github} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition">
                          <span className="text-sm">💻</span>
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Info */}
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--primary-color)' }}>
                  {member.name}
                </h3>
                <p className="text-sm text-blue-600 font-medium mb-3">{member.position}</p>
                {member.bio && (
                  <p className="text-gray-600 text-sm line-clamp-3">{member.bio}</p>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}