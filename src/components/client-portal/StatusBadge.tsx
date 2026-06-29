// src/components/client-portal/StatusBadge.tsx
'use client'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStyles = () => {
    const s = status.toLowerCase()
    if (s === 'active' || s === 'completed' || s === 'paid' || s === 'approved') {
      return 'bg-green-100 text-green-700'
    }
    if (s === 'in progress' || s === 'pending' || s === 'sent' || s === 'in review') {
      return 'bg-yellow-100 text-yellow-700'
    }
    if (s === 'overdue' || s === 'rejected') {
      return 'bg-red-100 text-red-700'
    }
    if (s === 'draft') {
      return 'bg-gray-100 text-gray-600'
    }
    return 'bg-blue-100 text-blue-700'
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${getStyles()}`}>
      {status}
    </span>
  )
}