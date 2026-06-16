'use client'

import { motion } from 'framer-motion'

const partners = [
  { name: 'Shopify', logo: '/images/partners/shopify.svg' },
  { name: 'Google', logo: '/images/partners/google.svg' },
  { name: 'BigCommerce', logo: '/images/partners/bigcommerce.svg' },
  { name: 'WooCommerce', logo: '/images/partners/woocommerce.svg' },
  { name: 'Magento', logo: '/images/partners/magento.svg' },
  { name: 'Salesforce', logo: '/images/partners/salesforce.svg' },
]

export default function PartnerMarquee() {
  return (
    <div className="overflow-hidden py-4">
      <motion.div
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
        className="flex gap-12 whitespace-nowrap"
      >
        {[...partners, ...partners].map((partner, idx) => (
          <div
            key={idx}
            className="flex-shrink-0 grayscale hover:grayscale-0 transition-all duration-300 opacity-60 hover:opacity-100"
          >
            <img
              src={partner.logo}
              alt={partner.name}
              className="h-8 md:h-10 w-auto object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          </div>
        ))}
      </motion.div>
    </div>
  )
}