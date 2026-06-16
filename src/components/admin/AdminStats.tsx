'use client'

import { motion } from 'framer-motion'

interface AdminStatsProps {
  stats: {
    total: number
    newSubmissions: number
    underReview: number
    growthReady: number
    scaleReady: number
    avgScore: number
  }
}

const statItems: Array<{
  key: keyof AdminStatsProps['stats']
  label: string
  color: string
}> = [
  { key: 'total', label: 'Total Assessments', color: 'text-white' },
  { key: 'newSubmissions', label: 'New Submissions', color: 'text-blue-400' },
  { key: 'underReview', label: 'Under Review', color: 'text-yellow-400' },
  { key: 'growthReady', label: 'Growth Ready', color: 'text-cyan-400' },
  { key: 'scaleReady', label: 'Scale Ready', color: 'text-emerald-400' },
  { key: 'avgScore', label: 'Avg HGRI Score', color: 'text-[var(--accent-orange)]' },
]

export function AdminStats({ stats }: AdminStatsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {statItems.map((item, index) => {
        const value = stats[item.key]
        return (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4"
          >
            <div className="text-2xl font-bold text-[var(--text-primary)]">{value}</div>
            <div className={`text-sm ${item.color}`}>{item.label}</div>
          </motion.div>
        )
      })}
    </div>
  )
}