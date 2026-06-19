'use client'

import { FormStep } from '@/types/growth-readiness'
import { motion } from 'framer-motion'

interface StepIndicatorProps {
  currentStep: FormStep
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-8">
      {/* Progress Bar - Clean & Bold */}
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
        />
      </div>

      {/* Progress Percentage - Bold & Visible */}
      <div className="mt-3 flex justify-between items-center">
        <span className="text-sm font-bold text-[var(--text-on-dark-muted)]">
          Progress
        </span>
        <span className="text-sm font-bold text-white">
          {Math.round(progress)}%
        </span>
      </div>

      {/* Step Dots - Visual indicators only */}
      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as FormStep
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-8 bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]' 
                  : isCompleted 
                  ? 'w-2 bg-[var(--accent-lime)]' 
                  : 'w-2 bg-[var(--border)]'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}