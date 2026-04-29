'use client'

import { motion } from 'framer-motion'

const brands = [
  'Shopify', 'WooCommerce', 'Klaviyo', 'Meta Ads', 'Google Ads',
  'TikTok', 'Mailchimp', 'Stripe', 'PayPal', 'Zapier', 'Wix'
]

export default function LogoMarquee() {
  return (
    <section className="py-16 bg-white overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <span className="text-xs font-semibold tracking-wider uppercase text-gray-400 mb-2 block">
            Trusted By
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Brands We've Worked With
          </h2>
        </motion.div>
      </div>

      <div className="relative">
        <div className="flex overflow-hidden [mask-image:_linear-gradient(to_right,transparent_0,_black_128px,_black_calc(100%-128px),transparent_100%)]">
          <div className="flex animate-marquee gap-12 py-4">
            {[...brands, ...brands].map((brand, i) => (
              <div
                key={i}
                className="flex-shrink-0 px-8 py-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-blue-200 hover:shadow-sm transition-all duration-300 cursor-default"
              >
                <span className="text-gray-500 font-semibold text-lg whitespace-nowrap">{brand}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}