'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion } from 'framer-motion'

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
    <section className="py-20 bg-gradient-to-br from-gray-50 to-white overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <div className="text-xs tracking-widest uppercase text-[#007BFF] font-semibold mb-3">
            Our Team
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            Meet Our Experts
          </h2>
          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
          <p className="text-gray-600 max-w-2xl mx-auto">
            The passionate experts behind our success
          </p>
        </motion.div>

        {/* Team Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              whileHover={{ y: -10 }}
              className="group relative"
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur-xl" />
              
              {/* Card */}
              <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                {/* Top gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-[#007BFF] to-[#00BFFF] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                
                <div className="p-6 text-center">
                  {/* Avatar with floating animation */}
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="relative mb-4"
                  >
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-100 to-purple-100 ring-4 ring-white shadow-lg">
                      {member.image_url ? (
                        <Image
                          src={member.image_url}
                          alt={member.name}
                          width={128}
                          height={128}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#007BFF] to-[#00BFFF]">
                          <span className="text-4xl font-bold text-white">
                            {member.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Social icons - appear on hover */}
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      {member.social_twitter && (
                        <a 
                          href={member.social_twitter} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-[#1DA1F2] transition-all duration-300 hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.937 4.937 0 004.604 3.417 9.868 9.868 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0021.605-11.582c0-.214-.005-.428-.015-.642A9.936 9.936 0 0024 4.59z"/>
                          </svg>
                        </a>
                      )}
                      {member.social_linkedin && (
                        <a 
                          href={member.social_linkedin} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-[#0077B5] transition-all duration-300 hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452z"/>
                          </svg>
                        </a>
                      )}
                      {member.social_github && (
                        <a 
                          href={member.social_github} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="w-8 h-8 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-600 transition-all duration-300 hover:scale-110"
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.253-.447-1.27.098-2.646 0 0 .84-.269 2.75 1.025.8-.223 1.65-.334 2.5-.334.85 0 1.7.111 2.5.334 1.91-1.294 2.75-1.025 2.75-1.025.545 1.376.201 2.393.099 2.646.64.698 1.03 1.591 1.03 2.682 0 3.841-2.337 4.687-4.565 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                          </svg>
                        </a>
                      )}
                    </div>
                  </motion.div>

                  {/* Info */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: index * 0.1 + 0.3 }}
                    viewport={{ once: true }}
                  >
                    <h3 className="text-xl font-bold mb-1 group-hover:text-[#007BFF] transition-colors" style={{ color: 'var(--primary-color)' }}>
                      {member.name}
                    </h3>
                    <p className="text-sm text-[#007BFF] font-medium mb-3">{member.position}</p>
                    {member.bio && (
                      <p className="text-gray-600 text-sm leading-relaxed">{member.bio}</p>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}