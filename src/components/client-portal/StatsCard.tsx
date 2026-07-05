// src/components/client-portal/StatsCard.tsx
'use client'

import SvgIcon from '@/components/ui/SvgIcon'

interface StatsCardProps {
  title: string
  value: number | string
  icon: string
  color?: string
  bgColor?: string
}

export default function StatsCard({
  title,
  value,
  icon,
  color = 'var(--accent)',
  bgColor = 'var(--accent)/10',
}: StatsCardProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div
          className="flex h-12 w-12 items-center justify-center rounded-xl"
          style={{ background: bgColor }}
        >
          <SvgIcon name={icon} size={22} color={color} />
        </div>
        <div>
          <p className="text-2xl font-black text-[var(--text-primary)]">{value}</p>
          <p className="text-sm text-[var(--text-muted)]">{title}</p>
        </div>
      </div>
    </div>
  )
}