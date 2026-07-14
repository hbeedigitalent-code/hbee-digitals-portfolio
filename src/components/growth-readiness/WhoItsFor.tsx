// src/components/growth-readiness/WhoItsFor.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

const audiences = [
  {
    icon: 'ecommerce',
    title: 'Ecommerce Brands',
    description: 'Online retailers looking to scale their operations'
  },
  {
    icon: 'shopify',
    title: 'Shopify Store Owners',
    description: 'Merchants using Shopify as their ecommerce platform'
  },
  {
    icon: 'woocommerce',
    title: 'WooCommerce Stores',
    description: 'Businesses using WordPress and WooCommerce'
  },
  {
    icon: 'digital-marketing',
    title: 'Digital Product Businesses',
    description: 'Companies offering digital products and services'
  },
  {
    icon: 'growth',
    title: 'Growth-Focused Founders',
    description: 'Entrepreneurs ready to take their business to the next level'
  }
]

export function WhoItsFor() {
  return (
    <section className="section bg-[var(--bg-page)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="users" size={16} />
            Who It Is For
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Designed For Growth-Minded Businesses
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            Whether you're just starting or scaling, this assessment is for you
          </motion.p>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {audiences.map((audience, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--accent-orange)]"
            >
              <div className="flex-shrink-0">
                <div className="rounded-xl bg-[var(--accent-orange)]/10 p-2.5">
                  <SvgIcon name={audience.icon} size={24} color="var(--accent-orange)" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-[var(--text-primary)]">{audience.title}</h3>
                <p className="text-sm text-[var(--text-secondary)]">{audience.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}