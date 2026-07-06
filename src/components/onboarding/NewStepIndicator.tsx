// src/components/onboarding/NewStepIndicator.tsx
'use client'

import { OnboardingStep } from '@/types/new-client-onboarding'
import { motion } from 'framer-motion'

interface StepIndicatorProps {
  currentStep: OnboardingStep
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-8">
      <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6 }}
          className="h-full bg-[var(--accent)]"
        />
      </div>

      <div className="mt-3 flex justify-between items-center">
        <span className="text-sm font-bold text-[var(--text-muted)]">Progress</span>
        <span className="text-sm font-bold text-[var(--text-primary)]">{Math.round(progress)}%</span>
      </div>

      <div className="mt-4 flex justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as OnboardingStep
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <div
              key={step}
              className={`h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? 'w-8 bg-[var(--accent)]' 
                  : isCompleted 
                  ? 'w-2 bg-[var(--accent)]/60' 
                  : 'w-2 bg-[var(--border)]'
              }`}
            />
          )
        })}
      </div>
    </div>
  )
}