'use client'

import { Service } from '@/types'
import Link from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import {
  Code, ShoppingCart, Palette, Megaphone, Lightbulb, Briefcase,
  Globe, Smartphone, Cloud, Database, Shield, Wrench,
} from 'lucide-react'
import Reveal from '@/components/Reveal'

// -------------------------------------------------------
// 3D Tilt Card Component
// -------------------------------------------------------
function TiltCard({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const reducedMotion = useReducedMotion()

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reducedMotion || !cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const rotateX = ((e.clientY - centerY) / (rect.height / 2)) * -8
    const rotateY = ((e.clientX - centerX) / (rect.width / 2)) * 8
    setTilt({ x: rotateX, y: rotateY })
  }

  function handleMouseLeave() {
    setTilt({ x: 0, y: 0 })
  }

  return (
    <motion.div
      ref={cardRef}
      className={className}
      style={{ transformStyle: 'preserve-3d', willChange: 'transform', ...style }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ rotateX: tilt.x, rotateY: tilt.y }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      {children}
    </motion.div>
  )
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------
interface ServicesSectionProps {
  data: Service[]
  title?: string
  subtitle?: string
}

const lucideIconMap: Record<string, React.ElementType> = {
  code: Code,
  'web-development': Code,
  'web development': Code,
  ecommerce: ShoppingCart,
  'e-commerce': ShoppingCart,
  'e-commerce solutions': ShoppingCart,
  design: Palette,
  'ui-ux': Palette,
  'ui/ux': Palette,
  marketing: Megaphone,
  'digital-marketing': Megaphone,
  'digital marketing': Megaphone,
  strategy: Lightbulb,
  'brand-strategy': Lightbulb,
  'brand strategy': Lightbulb,
  consulting: Briefcase,
  'technical-consulting': Briefcase,
  'technical consulting': Briefcase,
  globe: Globe,
  mobile: Smartphone,
  cloud: Cloud,
  database: Database,
  security: Shield,
  tools: Wrench,
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

export default function ServicesSection({
  data,
  title = 'Our Services',
  subtitle = 'What We Offer',
}: ServicesSectionProps) {
  if (!data || data.length === 0) return null

  return (
    <section
      className="py-24 relative"
      aria-labelledby="services-heading"
      style={{ backgroundColor: 'var(--bg-color)' }}
    >
      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: 'easeOut' }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0 }}
            whileInView={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1 rounded-full bg-blue-500/20 text-blue-400 text-sm font-medium mb-4"
          >
            What We Do
          </motion.div>

          <Reveal variant="wipe">
            <h2
              id="services-heading"
              className="text-4xl md:text-5xl font-bold mb-4"
              style={{ color: 'var(--secondary-color)' }}
            >
              {title}
            </h2>
          </Reveal>

          <p className="text-[var(--text-muted)] max-w-2xl mx-auto text-lg">{subtitle}</p>
        </motion.div>

        {/* Services Grid with Perspective */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          style={{ perspective: '1000px' }}
        >
          {data.map((service) => {
            const iconName = (service as any).icon as string | undefined
            const IconComponent = iconName ? lucideIconMap[iconName.toLowerCase()] : undefined

            return (
              <motion.div
                key={service.id}
                variants={{
                  hidden: { opacity: 0, y: 24 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -6 }}
                className="group relative"
              >
                <TiltCard
                  className="card-shimmer relative rounded-2xl shadow-lg overflow-hidden transition-all duration-500 h-full"
                  style={{
                    backgroundColor: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                    borderWidth: '1px',
                  }}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-purple-600 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left" />

                  <div className="p-6 sm:p-8">
                    <motion.div
                      whileHover={{ scale: 1.15, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                      className="mb-6"
                    >
                      <div className="w-14 h-14 rounded-2xl bg-[#007BFF]/15 flex items-center justify-center shadow-md group-hover:bg-[#007BFF]/30 transition-all duration-300">
                        {IconComponent ? (
                          <IconComponent
                            className="w-8 h-8"
                            style={{ color: 'var(--accent-color)' }}
                          />
                        ) : (
                          <Image
                            src={getIconPath(service.title)}
                            alt=""
                            width={40}
                            height={40}
                            className="w-10 h-10 object-contain"
                            style={{
                              filter: 'brightness(0) saturate(100%) invert(27%) sepia(91%) saturate(1896%) hue-rotate(202deg) brightness(92%) contrast(101%)',
                            }}
                          />
                        )}
                      </div>
                    </motion.div>

                    <h3
                      className="text-2xl font-bold mb-3 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-[#007BFF] group-hover:to-[#00BFFF] transition-all duration-300"
                      style={{ color: 'var(--secondary-color)' }}
                    >
                      {service.title}
                    </h3>
                    <p className="mb-5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                      {service.description}
                    </p>

                    {service.features && service.features.length > 0 ? (
                      <div className="mb-6">
                        <p
                          className="text-sm font-semibold mb-3 uppercase tracking-wide"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          What&apos;s included:
                        </p>
                        <ul
                          aria-label={`Features of ${service.title}`}
                          className="space-y-2.5"
                        >
                          {service.features.slice(0, 3).map((feature, i) => (
                            <li
                              key={i}
                              className="flex items-center gap-2.5 text-sm"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#00BFFF] flex-shrink-0" />
                              {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <div className="mb-6">
                        <p className="text-sm italic opacity-60">More details coming soon</p>
                      </div>
                    )}

                    <Link
                      href="/services"
                      className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                      style={{ color: 'var(--accent-color)' }}
                    >
                      Learn more
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </Link>
                  </div>
                </TiltCard>
              </motion.div>
            )
          })}
        </motion.div>

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
              className="inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold border-2 transition-all duration-300 hover:shadow-xl group"
              style={{
                borderColor: 'var(--accent-color)',
                color: 'var(--accent-color)',
              }}
            >
              <span>View All Services</span>
              <svg
                className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}