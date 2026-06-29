// src/components/client-portal/EmptyState.tsx
'use client'

import SvgIcon from '@/components/ui/SvgIcon'

interface EmptyStateProps {
  title: string
  description: string
  icon?: string
  actionText?: string
  onAction?: () => void
}

export default function EmptyState({
  title,
  description,
  icon = 'inbox',
  actionText,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-white p-12 text-center">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--bg-section)]">
        <SvgIcon name={icon} size={32} color="var(--text-muted)" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h3>
      <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
        >
          {actionText}
        </button>
      )}
    </div>
  )
}