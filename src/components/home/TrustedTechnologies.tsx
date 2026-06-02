'use client'

import { motion, useReducedMotion } from 'framer-motion'

const technologies = [
  { name: 'Shopify', logo: '/svgs/shopify.svg', forceWhite: false },
  { name: 'Google', logo: '/svgs/google.svg.png', forceWhite: false },
  { name: 'Meta', logo: '/svgs/meta.svg', forceWhite: false },
  { name: 'Wordpress', logo: '/svgs/wordpress.svg', forceWhite: false },
  { name: 'Klaviyo', logo: '/svgs/klaviyo.svg', forceWhite: true },  // Only white
  { name: 'GitHub', logo: '/svgs/github.svg.png', forceWhite: false },
  { name: 'Wix', logo: '/svgs/Wix.svg.png', forceWhite: true },
  { name: 'WooCommerce', logo: '/svgs/Woo_Commerce.svg', forceWhite: false },
  { name: 'Shopify Partners', logo: '/svgs/shopifypartners.svg', forceWhite: false },
  { name: 'Next.js', logo: '/svgs/nextjs.svg', forceWhite: true },    // Only white
  { name: 'Supabase', logo: '/svgs/supabase.svg', forceWhite: false },
  { name: 'Vercel', logo: '/svgs/vercel.svg', forceWhite: true },     // Only white
  { name: 'Stripe', logo: '/svgs/stripe.svg', forceWhite: false },
]

export default function TrustedTechnologies() {
  const reducedMotion = useReducedMotion()
  const loopItems = [...technologies, ...technologies]

  return (
    <section className="relative overflow-hidden py-6 sm:py-8">
      {/* Dark background for this section only */}
      <div className="absolute inset-0 bg-[#0A1D37]" />
      
      <div className="relative overflow-hidden">
        <motion.div
          animate={reducedMotion ? undefined : { x: ['0%', '-50%'] }}
          transition={
            reducedMotion
              ? undefined
              : {
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }
          }
          className="flex w-max gap-6 px-5 sm:gap-8"
        >
          {loopItems.map((tech, index) => (
            <div
              key={`${tech.name}-${index}`}
              className="flex items-center justify-center transition-all duration-300 hover:scale-110"
            >
              <img
                src={tech.logo}
                alt={`${tech.name}`}
                className={`h-6 w-auto object-contain sm:h-8 ${
                  tech.forceWhite ? 'brightness-0 invert' : ''
                }`}
                loading="lazy"
              />
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}