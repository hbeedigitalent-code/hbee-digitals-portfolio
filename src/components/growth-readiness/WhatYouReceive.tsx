// src/components/growth-readiness/WhatYouReceive.tsx

'use client'

import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

const benefits = [
  {
    icon: 'hgri-score',
    title: 'HGRI™ Score',
    description: 'Your personalized Growth Readiness Index based on our proprietary scoring system.'
  },
  {
    icon: 'growth-classification',
    title: 'Growth Classification',
    description: 'Foundation, Growth Potential, Growth Ready, or Scale Ready classification.'
  },
  {
    icon: 'growth-profile',
    title: 'Growth Profile',
    description: 'Tailored assessment summary with actionable insights for your business.'
  },
  {
    icon: 'visibility-review',
    title: 'Visibility Review',
    description: 'Analysis of your current visibility and recommendations for improvement.'
  },
  {
    icon: 'conversion-insights',
    title: 'Conversion Insights',
    description: 'Conversion optimization opportunities specific to your business model.'
  },
  {
    icon: 'growth-recommendations',
    title: 'Growth Recommendations',
    description: 'Actionable next steps to accelerate your growth trajectory.'
  },
  {
    icon: 'opportunity-review',
    title: 'Opportunity Review',
    description: 'Consideration for additional growth support and strategic partnership.'
  }
]

export function WhatYouReceive() {
  return (
    <section className="section bg-[var(--bg-section)]">
      <div className="container-custom">
        <div className="mx-auto max-w-3xl text-center">
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="section-label"
          >
            <SvgIcon name="growth-profile" size={16} />
            What You Receive
          </motion.span>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="section-heading"
          >
            Everything You Need To Understand Your Growth Readiness
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="section-description mx-auto"
          >
            Complete the assessment and receive a comprehensive growth profile
          </motion.p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 transition-all hover:border-[var(--accent-orange)] hover:shadow-lg hover:shadow-[var(--accent-orange)]/5"
            >
              <div className="mb-4">
                <div className="inline-flex rounded-xl bg-[var(--accent-orange)]/10 p-3">
                  <SvgIcon name={benefit.icon} size={28} color="var(--accent-orange)" />
                </div>
              </div>
              <h3 className="mb-2 text-lg font-semibold text-[var(--text-primary)]">{benefit.title}</h3>
              <p className="text-sm text-[var(--text-secondary)]">{benefit.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}