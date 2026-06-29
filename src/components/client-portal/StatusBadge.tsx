// src/components/client-portal/StatusBadge.tsx
'use client'

interface StatusBadgeProps {
  status: string
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const getStyles = () => {
    switch (status.toLowerCase()) {
      case 'active':
      case 'completed':
      case 'paid':
        return 'bg-green-100 text-green-700'
      case 'in progress':
      case 'pending':
      case 'sent':
        return 'bg-yellow-100 text-yellow-700'
      case 'overdue':
        return 'bg-red-100 text-red-700'
      case 'draft':
        return 'bg-gray-100 text-gray-600'
      default:
        return 'bg-blue-100 text-blue-700'
    }
  }

  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${getStyles()}`}>
      {status}
    </span>
  )
}