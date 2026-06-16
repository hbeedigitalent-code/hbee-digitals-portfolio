'use client'

import { FormStep } from '@/types/growth-readiness'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion } from 'framer-motion'

interface StepIndicatorProps {
  currentStep: FormStep
  totalSteps: number
  completedSteps: FormStep[]
}

const stepLabels: Record<FormStep, string> = {
  1: 'Business Profile',
  2: 'Business Stage',
  3: 'Growth Objectives',
  4: 'Visibility & Marketing',
  5: 'Customer Experience',
  6: 'Growth Challenges',
  7: 'Growth Readiness'
}

const stepIcons: Record<FormStep, string> = {
  1: 'user',
  2: 'growth',
  3: 'target',
  4: 'visibility-review',
  5: 'users',
  6: 'warning',
  7: 'check'
}

export function StepIndicator({ currentStep, totalSteps, completedSteps }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-12">
      {/* Progress Bar */}
      <div className="relative mb-8 h-1 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
        />
      </div>

      {/* Steps */}
      <div className="flex justify-between">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as FormStep
          const isActive = step === currentStep
          const isCompleted = completedSteps.includes(step)
          const isClickable = isCompleted || isActive

          return (
            <div
              key={step}
              className="flex flex-col items-center gap-2"
            >
              <div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all
                  ${isActive ? 'bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] text-white shadow-lg shadow-[var(--accent-orange)]/20' : ''}
                  ${isCompleted ? 'bg-[var(--accent-lime)] text-white' : ''}
                  ${!isActive && !isCompleted ? 'border border-[var(--border)] bg-[var(--bg-card-dark)] text-[var(--text-muted)]' : ''}
                  ${isClickable ? 'cursor-pointer' : 'cursor-default'}
                `}
                onClick={() => {
                  if (isClickable) {
                    // Parent component will handle navigation
                  }
                }}
              >
                {isCompleted ? (
                  <SvgIcon name="check" size={16} color="white" />
                ) : (
                  <SvgIcon name={stepIcons[step]} size={16} color={isActive ? 'white' : 'var(--text-muted)'} />
                )}
              </div>
              <span className={`
                hidden text-xs font-medium sm:block
                ${isActive ? 'text-white' : 'text-[var(--text-muted)]'}
              `}>
                {stepLabels[step]}
              </span>
            </div>
          )
        })}
      </div>

      {/* Mobile Step Label */}
      <div className="mt-4 text-center sm:hidden">
        <span className="text-sm font-medium text-white">
          Step {currentStep} of {totalSteps}: {stepLabels[currentStep]}
        </span>
      </div>
    </div>
  )
}