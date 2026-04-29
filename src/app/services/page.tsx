'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ServiceOrbit from '@/components/ui/ServiceOrbit'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
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

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen flex items-center justify-center bg-[#0A1D37]">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-white"></div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main>
        {/* Hero with Service Orbit */}
        <section className="relative min-h-screen flex items-center overflow-hidden pt-20 lg:pt-28 pb-12" style={{ backgroundColor: 'var(--primary-color, #0A1D37)' }}>
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-20 left-10 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            <div className="absolute bottom-20 right-10 w-80 h-80 bg-cyan-500 rounded-full blur-3xl" />
          </div>
          <div className="container mx-auto px-4 relative z-10 w-full">
            <ServiceOrbit services={services} />
          </div>
        </section>

        {/* All Services Grid */}
        {services.length > 0 && (
          <section className="py-16 md:py-20 bg-white">
            <div className="container mx-auto px-4">
              <div className="text-center mb-10 md:mb-12">
                <h2 className="text-2xl md:text-3xl font-bold mb-3" style={{ color: 'var(--primary-color)' }}>
                  All Services
                </h2>
                <p className="text-gray-600 text-sm max-w-xl mx-auto">
                  Comprehensive solutions tailored to your business needs
                </p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {services.map((service, index) => (
                  <motion.div
                    key={service.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -6 }}
                    className="bg-white border border-gray-100 rounded-xl md:rounded-2xl p-5 md:p-6 hover:shadow-xl transition-all duration-300"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center mb-4">
                      <Image
                        src={getIconPath(service.title)}
                        alt={service.title}
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                      />
                    </div>

                    <h3 className="text-lg md:text-xl font-bold text-gray-900 mb-2">{service.title}</h3>
                    <p className="text-gray-600 text-sm mb-4">{service.description}</p>

                    {service.features && service.features.length > 0 && (
                      <ul className="space-y-1.5 mb-4">
                        {service.features.slice(0, 4).map((feature: string, i: number) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-gray-500">
                            <svg className="w-3 h-3 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    )}

                    <Link href="/contact" className="text-sm font-medium text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                      Learn More
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  )
}