'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface TeamMember {
  id: string; name: string; position: string; bio: string;
  image_url: string; social_twitter: string; social_linkedin: string;
  social_github: string; social_instagram: string; display_order: number;
}

export default function TeamSection() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = async () => {
    const { data } = await supabase.from('team_members').select('*').eq('is_active', true).order('display_order')
    setMembers(data || [])
    setLoading(false)
  }

  if (loading || members.length === 0) return null

  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity:0, y:30 }} whileInView={{ opacity:1, y:0 }} transition={{ duration:0.6 }} viewport={{ once:true }} className="text-center mb-12">
          <div className="text-xs tracking-widest uppercase text-[#007BFF] font-semibold mb-3">Our Team</div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Meet Our Experts</h2>
          <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
          <p className="text-white/70 max-w-2xl mx-auto">The passionate experts behind our success</p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {members.map((member, index) => (
            <motion.div key={member.id} initial={{ opacity:0, y:50 }} whileInView={{ opacity:1, y:0 }} transition={{ duration:0.5, delay: index*0.1 }} viewport={{ once:true }} whileHover={{ y:-10 }} className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur-xl" />
              <div className="relative bg-white/5 border border-white/10 backdrop-blur-sm rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300">
                <div className="h-1 w-full bg-gradient-to-r from-[#007BFF] to-[#00BFFF] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />
                <div className="p-6 text-center">
                  <motion.div animate={{ y:[0,-5,0] }} transition={{ duration:3, repeat:Infinity, ease:"easeInOut" }} className="relative mb-4">
                    <div className="w-32 h-32 mx-auto rounded-full overflow-hidden bg-gradient-to-br from-blue-500/20 to-purple-500/20 ring-4 ring-white/10 shadow-lg">
                      {member.image_url ? (
                        <Image src={member.image_url} alt={member.name} width={128} height={128} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#007BFF] to-[#00BFFF]">
                          <span className="text-4xl font-bold text-white">{member.name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                    </div>
                    <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                      {/* social icons (same as before, adjust colors if needed) */}
                      {member.social_twitter && <a href={member.social_twitter} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-[#1DA1F2] transition-all duration-300 hover:scale-110"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775..."/></svg></a>}
                      {member.social_linkedin && <a href={member.social_linkedin} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-[#0077B5] transition-all duration-300 hover:scale-110"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569..."/></svg></a>}
                      {member.social_github && <a href={member.social_github} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-gray-600 transition-all duration-300 hover:scale-110"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.477 2 2 6.477 2 12c0 4.42..."/></svg></a>}
                    </div>
                  </motion.div>
                  <motion.div initial={{ opacity:0 }} whileInView={{ opacity:1 }} transition={{ duration:0.5, delay: index*0.1+0.3 }} viewport={{ once:true }}>
                    <h3 className="text-xl font-bold mb-1 text-white group-hover:text-[#007BFF] transition-colors">{member.name}</h3>
                    <p className="text-sm text-[#007BFF] font-medium mb-3">{member.position}</p>
                    {member.bio && <p className="text-white/60 text-sm leading-relaxed">{member.bio}</p>}
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