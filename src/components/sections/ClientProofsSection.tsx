'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'

interface Proof {
  id: string
  title: string
  image_url: string
}

export default function ClientProofsSection() {
  const [proofs, setProofs] = useState<Proof[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('video_testimonials')
      .select('*')
      .order('display_order', { ascending: true })
      .then(({ data }) => {
        setProofs(data || [])
        setLoading(false)
      })
  }, [])

  if (loading || proofs.length === 0) return null

  return (
    <section className="py-20 bg-gradient-to-br from-[#0A1D37] to-[#0F1E38]">
      <div className="max-w-7xl mx-auto px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Real Results from Our Clients</h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Screenshots and video testimonials from live Shopify stores we've helped grow
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {proofs.map((proof, i) => (
            <motion.div
              key={proof.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              viewport={{ once: true }}
              className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm hover:border-white/20 transition-all duration-300"
            >
              <img
                src={proof.image_url}
                alt={proof.title}
                className="w-full h-56 object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="p-4">
                <p className="text-white font-medium">{proof.title}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}