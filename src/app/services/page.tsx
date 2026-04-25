'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface Service {
  id: string
  title: string
  description: string
  icon: string
  features: string[]
  display_order: number
  is_active: boolean
}

const getIconPath = (title: string): string => {
  const iconMap: Record<string, string> = {
    'Web Development': '/svgs/web-development.svg',
    'E-Commerce Solutions': '/svgs/ecommerce.svg',
    'UI/UX Design': '/svgs/ui-ux.svg',
    'Digital Marketing': '/svgs/digital-marketing.svg',
    'Brand Strategy': '/svgs/branding.svg',
    'Technical Consulting': '/svgs/consulting.svg',
  }
  return iconMap[title] || '/svgs/digital-services.svg'
}
export const dynamic = 'force-dynamic'
export const revalidate = 0

// then your existing code follows...
export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchServices = async () => {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order')
      
      setServices(data || [])
      setLoading(false)
    }
    fetchServices()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen pt-32 pb-20 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="mt-2 text-gray-600">Loading services...</p>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      
      <main className="pt-32 pb-20 bg-gradient-to-br from-gray-50 via-white to-gray-100 min-h-screen">
        <div className="container mx-auto px-4">
          {/* Header with animation */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
              Our Services
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              What We Offer
            </p>
          </motion.div>

          {/* Services Grid with animations */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className="group bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300"
              >
                {/* Icon Section with gradient background */}
                <div className="relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="relative p-8 pb-4">
                    <motion.div
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 300 }}
                      className="w-16 h-16 mb-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center"
                    >
                      <Image
                        src={getIconPath(service.title)}
                        alt={service.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                      />
                    </motion.div>
                    
                    <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary-color)' }}>
                      {service.title}
                    </h2>
                    <p className="text-gray-600">
                      {service.description}
                    </p>
                  </div>
                </div>

                {/* Features List with Circle Bullets */}
                <div className="px-8 pb-6">
                  {service.features && service.features.length > 0 && (
                    <div className="border-t pt-4 mb-6">
                      <p className="text-sm font-semibold text-gray-500 mb-3">What's included:</p>
                      <ul className="space-y-2.5">
                        {service.features.map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 }}
                            className="flex items-center gap-3 text-gray-600 text-sm"
                          >
                            {/* Circle bullet */}
                            <span 
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            ></span>
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Button-style Learn More */}
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href="/contact"
                      className="inline-flex items-center justify-center gap-2 w-full px-5 py-3 rounded-lg font-medium transition-all duration-300 group/btn"
                      style={{ 
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--secondary-color)'
                      }}
                    >
                      <span>Learn More</span>
                      <svg 
                        className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Contact CTA */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="text-center mt-16 p-8 rounded-2xl bg-gradient-to-r from-blue-50 to-purple-50"
          >
            <h3 className="text-2xl font-bold mb-3" style={{ color: 'var(--primary-color)' }}>
              Need a Custom Solution?
            </h3>
            <p className="text-gray-600 mb-6">
              Let's discuss how we can help bring your ideas to life
            </p>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                href="/contact"
                className="inline-block px-8 py-3 text-white rounded-xl font-semibold transition-all duration-300 hover:shadow-lg"
                style={{ backgroundColor: 'var(--primary-color)' }}
              >
                Get in Touch
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </>
  )
}