'use client'

import { Service } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface ServicesSectionProps {
  data: Service[]
  title?: string
  subtitle?: string
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

export default function ServicesSection({ data, title = "Our Services", subtitle = "What We Offer" }: ServicesSectionProps) {
  if (!data || data.length === 0) {
    return null
  }

  const displayServices = data.slice(0, 3)

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 via-white to-gray-100 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-20 blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-100 rounded-full opacity-20 blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header with enhanced animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 rounded-full bg-blue-50 text-sm font-medium mb-4"
            style={{ color: 'var(--primary-color)' }}
          >
            What We Do
          </motion.div>
          <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            {title}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto text-lg">
            {subtitle}
          </p>
        </motion.div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.15, ease: "easeOut" }}
              viewport={{ once: true }}
              whileHover={{ y: -12 }}
              className="group relative"
            >
              {/* Glow effect on hover */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-0 group-hover:opacity-20 transition duration-500 blur-xl"></div>
              
              <div className="relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-500 h-full">
                {/* Top gradient bar */}
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
                
                <div className="p-8">
                  {/* Icon with enhanced animation */}
                  <motion.div
                    whileHover={{ scale: 1.15, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    className="mb-6"
                  >
                    <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center shadow-md group-hover:shadow-lg transition-all duration-300">
                      <Image
                        src={getIconPath(service.title)}
                        alt={service.title}
                        width={40}
                        height={40}
                        className="w-10 h-10 object-contain"
                        style={{ filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)' }}
                      />
                    </div>
                  </motion.div>
                  
                  <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-600 transition-colors duration-300" style={{ color: 'var(--primary-color)' }}>
                    {service.title}
                  </h3>
                  <p className="text-gray-600 mb-5 leading-relaxed">
                    {service.description}
                  </p>
                  
                  {/* Features with circle bullets */}
                  {service.features && service.features.length > 0 && (
                    <div className="mb-6">
                      <p className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">What's included:</p>
                      <ul className="space-y-2">
                        {service.features.slice(0, 3).map((feature, i) => (
                          <motion.li
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 + i * 0.05 }}
                            viewport={{ once: true }}
                            className="flex items-center gap-2.5 text-sm text-gray-600"
                          >
                            <span 
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: 'var(--primary-color)' }}
                            ></span>
                            {feature}
                          </motion.li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {/* Button-style Learn More with enhanced animation */}
                  <motion.div
                    whileHover={{ x: 5 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Link
                      href="/services"
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold transition-all duration-300 group/btn w-full"
                      style={{ 
                        backgroundColor: 'var(--primary-color)',
                        color: 'var(--secondary-color)'
                      }}
                    >
                      <span>Learn More</span>
                      <svg 
                        className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform duration-300" 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* View All Services Button with enhanced animation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            <Link
              href="/services"
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold transition-all duration-300 hover:shadow-xl group"
              style={{ 
                backgroundColor: 'transparent',
                color: 'var(--primary-color)',
                border: `2px solid var(--primary-color)`
              }}
            >
              <span>View All Services</span>
              <svg 
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}