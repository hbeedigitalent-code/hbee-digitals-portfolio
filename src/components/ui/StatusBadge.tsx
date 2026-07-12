// src/components/ui/StatusBadge.tsx

'use client'

interface StatusBadgeProps {
  status: string
  variant?: 'default' | 'outline'
  size?: 'sm' | 'md'
  className?: string
}

export default function StatusBadge({ 
  status, 
  variant = 'default',
  size = 'md',
  className = '' 
}: StatusBadgeProps) {
  const getStyles = () => {
    const s = status?.toLowerCase() || ''
    
    const baseStyles = {
      default: {
        'active': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'paid': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'approved': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'growth_profile_ready': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'in progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'pending': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'in_review': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'review_in_progress': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'sent': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'assessment_submitted': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
        'overdue': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'rejected': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
        'draft': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        'archived': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        'lead': 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
        'proposal_ready': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'proposal_sent': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
        'proposal_accepted': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
        'onboarding_started': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
        'active_client': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
        'project_active': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
        'project_completed': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
        'retained': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      },
      outline: {
        'active': 'border border-green-500 text-green-700 dark:text-green-400',
        'completed': 'border border-green-500 text-green-700 dark:text-green-400',
        'paid': 'border border-green-500 text-green-700 dark:text-green-400',
        'approved': 'border border-green-500 text-green-700 dark:text-green-400',
        'growth_profile_ready': 'border border-green-500 text-green-700 dark:text-green-400',
        'in progress': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'pending': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'in_review': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'review_in_progress': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'sent': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'assessment_submitted': 'border border-yellow-500 text-yellow-700 dark:text-yellow-400',
        'overdue': 'border border-red-500 text-red-700 dark:text-red-400',
        'rejected': 'border border-red-500 text-red-700 dark:text-red-400',
        'draft': 'border border-gray-400 text-gray-600 dark:text-gray-400',
        'archived': 'border border-gray-400 text-gray-600 dark:text-gray-400',
        'lead': 'border border-gray-400 text-gray-600 dark:text-gray-400',
        'proposal_ready': 'border border-blue-500 text-blue-700 dark:text-blue-400',
        'proposal_sent': 'border border-blue-500 text-blue-700 dark:text-blue-400',
        'proposal_accepted': 'border border-purple-500 text-purple-700 dark:text-purple-400',
        'onboarding_started': 'border border-indigo-500 text-indigo-700 dark:text-indigo-400',
        'active_client': 'border border-emerald-500 text-emerald-700 dark:text-emerald-400',
        'project_active': 'border border-cyan-500 text-cyan-700 dark:text-cyan-400',
        'project_completed': 'border border-green-500 text-green-700 dark:text-green-400',
        'retained': 'border border-teal-500 text-teal-700 dark:text-teal-400',
      }
    }

    // Find matching status
    const variantStyles = variant === 'outline' ? baseStyles.outline : baseStyles.default
    let matchedStyle = variantStyles['pending'] // fallback
    
    for (const [key, value] of Object.entries(variantStyles)) {
      if (s.includes(key) || key.includes(s)) {
        matchedStyle = value
        break
      }
    }
    
    return matchedStyle
  }

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }

  const displayStatus = status?.replace(/_/g, ' ') || 'Unknown'

  return (
    <span className={`inline-flex rounded-full font-medium capitalize ${sizeStyles[size]} ${getStyles()} ${className}`}>
      {displayStatus}
    </span>
  )
}