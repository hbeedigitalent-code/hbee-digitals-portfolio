'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface AboutData {
  title: string
  subtitle: string
  description: string
  image_url: string
  stats: Array<{ number: string; label: string }>
  values: Array<{ title: string; description: string; icon: string }>
}

export default function AboutPage() {
  const [about, setAbout] = useState<AboutData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchAbout() {
      const { data } = await supabase.from('about_section').select('*').single()
      setAbout(data)
      setLoading(false)
    }
    fetchAbout()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <Footer />
      </>
    )
  }

  const stats = about?.stats || [
    { number: '50+', label: 'Projects Completed' },
    { number: '25+', label: 'Happy Clients' },
    { number: '3+', label: 'Years Experience' },
    { number: '15+', label: 'Team Members' }
  ]

  const values = about?.values || [
    { title: 'Innovation', description: 'We stay ahead of trends and leverage cutting-edge technologies to deliver future-proof solutions.', icon: '/svgs/innovation.svg' },
    { title: 'Precision', description: 'Every detail matters in creating exceptional digital experiences that exceed expectations.', icon: '/svgs/precision.svg' },
    { title: 'Performance', description: 'We build fast, scalable solutions optimized for speed, reliability, and business growth.', icon: '/svgs/performance.svg' },
    { title: 'Partnership', description: 'We work collaboratively with clients as strategic partners to achieve their digital goals.', icon: '/svgs/partnership.svg' }
  ]

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white">
        <div className="container mx-auto px-4">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              About Our Company
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              {about?.title || 'Crafting Digital Excellence'}
            </h1>
            <p className="text-gray-600 max-w-3xl mx-auto text-lg leading-relaxed">
              {about?.subtitle || 'Hbee Digitals is a forward-thinking digital agency dedicated to transforming businesses through innovative web solutions, cutting-edge design, and strategic digital marketing that drives measurable results.'}
            </p>
          </motion.div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20"
          >
            {stats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-8 bg-gray-50 rounded-2xl hover:shadow-lg transition"
              >
                <div className="text-4xl lg:text-5xl font-bold text-[#0A1D37] mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-600 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>

          {/* Values */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-gray-600 text-center mb-12 max-w-2xl mx-auto">
              The principles that guide everything we do and define who we are as a company
            </p>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.15 }}
                  className="p-6 border border-gray-100 rounded-xl hover:shadow-lg transition group"
                >
                  {value.icon && (
                    <div className="w-12 h-12 mb-4">
                      <Image src={value.icon} alt={value.title} width={48} height={48} className="w-full h-full" />
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                    {value.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center py-12 rounded-2xl bg-gradient-to-r from-[#0A1D37] to-[#1a2a4a]"
          >
            <h2 className="text-2xl font-bold text-white mb-3">Learn More About Us</h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto">Ready to work with a team that cares about your success?</p>
            <a
              href="/contact"
              className="px-8 py-3 bg-white rounded-xl font-semibold text-[#0A1D37] hover:shadow-lg transition inline-block"
            >
              Get in Touch
            </a>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}