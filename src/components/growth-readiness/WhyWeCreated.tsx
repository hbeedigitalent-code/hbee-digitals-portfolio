// src/components/growth-readiness/WhyWeCreated.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

export function WhyWeCreated() {
  return (
    <section className="section bg-[var(--bg-section)]">
      <div className="container-custom">
        <div className="mx-auto max-w-4xl">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="about" size={16} />
            Why We Created This Initiative
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Empowering Ecommerce Brands To Grow Smarter
          </motion.h2>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="space-y-4 text-lg text-[var(--text-secondary)]"
          >
            <p>
              After working with hundreds of ecommerce brands, we noticed a pattern. 
              Most business owners know they want to grow, but they don't know where 
              to start or what's holding them back.
            </p>
            <p>
              The <span className="font-semibold text-[var(--text-primary)]">Hbee Growth Readiness Assessment™</span> was 
              created to solve this problem. It provides a clear, data-driven view of 
              your business's growth potential across five critical dimensions.
            </p>
            <p>
              Whether you're a founder looking to scale, a marketing leader planning 
              your next campaign, or a business owner ready for the next stage of growth, 
              this assessment will give you the clarity and direction you need.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-[var(--shadow-md)]"
          >
            <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--text-secondary)]">
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-lime)]/20 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-lime)" />
                </div>
                Data-driven insights
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/20 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                5 growth pillars
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-lime)]/20 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-lime)" />
                </div>
                Actionable recommendations
              </span>
              <span className="flex items-center gap-2">
                <div className="rounded-full bg-[var(--accent-orange)]/20 p-1">
                  <SvgIcon name="check" size={14} color="var(--accent-orange)" />
                </div>
                100-point scoring system
              </span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}