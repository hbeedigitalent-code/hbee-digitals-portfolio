'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface PricingPackage {
  id: string
  name: string
  subtitle?: string
  price: string
  description?: string
  features: string[] | string
  is_featured: boolean
  is_active: boolean
  display_order: number
}

interface PricingSectionProps {
  packages: PricingPackage[]
  title?: string
  subtitle?: string
}

// Helper to normalize features (handles both array and JSON string)
function normalizeFeatures(features: string[] | string): string[] {
  if (!features) return []
  if (Array.isArray(features)) return features.slice(0, 5)
  
  if (typeof features === 'string') {
    try {
      const parsed = JSON.parse(features)
      if (Array.isArray(parsed)) return parsed.slice(0, 5)
    } catch {
      return features
        .split(/\n|,/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, 5)
    }
  }
  
  return []
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function PricingSection({ 
  packages, 
  title = "Clear Packages for Serious Digital Growth",
  subtitle = "Explore starting points for better websites, stronger trust, improved conversion, and scalable digital systems."
}: PricingSectionProps) {
  
  // Filter active packages and sort by display_order
  const activePackages = packages
    .filter(pkg => pkg.is_active)
    .sort((a, b) => a.display_order - b.display_order)
    .slice(0, 3)

  // Default packages if none provided
  const displayPackages = activePackages.length > 0 ? activePackages : [
    {
      id: '1',
      name: 'Essential',
      subtitle: 'Startup Growth',
      price: '$2,500',
      description: 'Perfect for businesses ready to establish a professional digital presence.',
      features: ['Custom Website Design', 'Mobile Responsive', 'SEO Foundation', 'Contact Forms', 'Analytics Setup'],
      is_featured: false,
      is_active: true,
      display_order: 1,
    },
    {
      id: '2',
      name: 'Professional',
      subtitle: 'Business Growth',
      price: '$5,000',
      description: 'Ideal for growing businesses needing advanced features and optimization.',
      features: ['Everything in Essential', 'E-commerce Integration', 'Advanced SEO', 'Performance Optimization', 'Priority Support'],
      is_featured: true,
      is_active: true,
      display_order: 2,
    },
    {
      id: '3',
      name: 'Enterprise',
      subtitle: 'Scale & Dominate',
      price: 'Custom',
      description: 'For established brands requiring custom solutions and dedicated support.',
      features: ['Everything in Professional', 'Custom Development', 'Dedicated Account Manager', '24/7 Support', 'SLA Agreement'],
      is_featured: false,
      is_active: true,
      display_order: 3,
    },
  ]

  return (
    <section className="relative bg-[var(--bg-navy)] w-full overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[var(--accent)]/8 blur-[130px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full bg-[var(--accent-orange)]/8 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[var(--accent)]/5 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 sm:px-6 md:px-8 lg:px-10 py-20 md:py-28 lg:py-32">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12 md:mb-16"
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-4">
            <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
              INVESTMENT OPTIONS
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 max-w-4xl mx-auto">
            {title}
          </h2>
          <p className="text-base md:text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
            {subtitle}
          </p>
        </motion.div>

        {/* Pricing Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8"
        >
          {displayPackages.map((pkg, index) => {
            const features = normalizeFeatures(pkg.features)
            const isPopular = pkg.is_featured || index === 1
            const isCustom = pkg.price === 'Custom' || pkg.price?.toLowerCase() === 'custom'

            return (
              <motion.div
                key={pkg.id}
                variants={itemVariants}
                className={`relative rounded-2xl transition-all duration-300 hover:-translate-y-2 ${
                  isPopular 
                    ? 'border-2 border-[var(--accent)] shadow-xl' 
                    : 'border border-[var(--border)] shadow-md'
                }`}
              >
                {/* Most Popular Badge - Orange */}
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <span className="inline-flex rounded-full bg-[var(--accent)] px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white shadow-lg">
                      MOST POPULAR
                    </span>
                  </div>
                )}

                <div className={`rounded-2xl p-6 lg:p-8 bg-[var(--bg-navy-mid)] ${
                  isPopular ? 'ring-1 ring-[var(--accent)]/20' : ''
                }`}>
                  {/* Subtitle */}
                  <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
                    {pkg.subtitle || (isPopular ? 'BEST VALUE' : 'GROWTH PACKAGE')}
                  </p>

                  {/* Package Name */}
                  <h3 className="text-2xl lg:text-3xl font-black tracking-[-0.045em] text-white">
                    {pkg.name}
                  </h3>

                  {/* Price */}
                  <div className="mt-4 mb-6">
                    {isCustom ? (
                      <span className="text-3xl lg:text-4xl font-black tracking-[-0.06em] text-white">
                        Custom
                      </span>
                    ) : (
                      <>
                        <span className="text-4xl lg:text-5xl font-black tracking-[-0.06em] text-white">
                          {pkg.price}
                        </span>
                        <span className="text-sm text-[var(--text-muted)] ml-1">/ project</span>
                      </>
                    )}
                  </div>

                  {/* Description */}
                  <p className="text-sm leading-6 text-[var(--text-secondary)] border-b border-[var(--border)] pb-4">
                    {pkg.description || 'A strategic package for growth-focused brands.'}
                  </p>

                  {/* Features List */}
                  <div className="mt-6 space-y-3">
                    {features.map((feature: string) => (
                      <div key={feature} className="flex items-start gap-3">
                        <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)]/10">
                          <SvgIcon name="verified" size={10} color="var(--accent)" />
                        </span>
                        <span className="text-sm leading-6 text-[var(--text-secondary)]">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* CTA Button - Using btn-primary or btn-cta */}
                  <div className="mt-8">
                    <Link
                      href="/contact"
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-black transition-all duration-200 ${
                        isPopular 
                          ? 'btn-cta hover:scale-[1.02]' 
                          : 'border-2 border-[var(--border)] bg-transparent text-white hover:border-[var(--accent)] hover:bg-[var(--accent)]/10'
                      }`}
                    >
                      Get Started
                      <SvgIcon name="arrow-right" size={14} color={isPopular ? 'white' : 'var(--accent)'} />
                    </Link>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </motion.div>

        {/* View All Plans Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="text-center mt-12"
        >
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full border border-[var(--border)] text-[var(--text-secondary)] font-semibold text-sm transition-all duration-300 hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent)]/10"
          >
            View All Plans
            <SvgIcon name="arrow-diagonal" size={14} color="var(--accent)" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}