// src/components/assessment/StepIndicator.tsx
'use client'

import { FormStep } from '@/types/growth-readiness'
import { motion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface StepIndicatorProps {
  currentStep: FormStep
  totalSteps: number
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

const stepLabels: Record<FormStep, string> = {
  1: 'Profile',
  2: 'Stage',
  3: 'Goals',
  4: 'Visibility',
  5: 'Experience',
  6: 'Challenges',
  7: 'Readiness'
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="mb-8">
      {/* Progress Bar - Animated */}
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--bg-section)]">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}
          className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
        />
        {/* Glow effect */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute top-0 right-0 h-full w-20 bg-gradient-to-l from-[var(--accent-lime)] to-transparent opacity-20"
          style={{ left: `${progress - 5}%` }}
        />
      </div>

      {/* Progress Percentage */}
      <div className="mt-3 flex justify-between items-center">
        <span className="text-sm font-medium text-[var(--text-muted)]">
          Progress
        </span>
        <motion.span 
          key={progress}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-sm font-bold text-[var(--text-primary)]"
        >
          {Math.round(progress)}%
        </motion.span>
      </div>

      {/* Step Dots with Icons - Desktop */}
      <div className="mt-6 hidden sm:flex justify-between items-center relative">
        {/* Connector line behind dots */}
        <div className="absolute left-0 right-0 top-1/2 h-0.5 -translate-y-1/2 bg-[var(--bg-section)]">
          <motion.div
            className="h-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>

        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as FormStep
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <motion.div
              key={step}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="relative z-10 flex flex-col items-center gap-1"
            >
              <motion.div
                className={`
                  flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-300
                  ${isActive 
                    ? 'border-[var(--accent-orange)] bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] text-white shadow-lg shadow-[var(--accent-orange)]/25' 
                    : isCompleted 
                    ? 'border-[var(--accent-lime)] bg-[var(--accent-lime)] text-white' 
                    : 'border-[var(--border)] bg-[var(--bg-page)] text-[var(--text-muted)]'
                  }
                `}
                whileHover={{ scale: isActive || isCompleted ? 1.1 : 1 }}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? (
                  <SvgIcon name="check" size={16} color="white" />
                ) : (
                  <SvgIcon 
                    name={stepIcons[step]} 
                    size={16} 
                    color={isActive ? 'white' : 'var(--text-muted)'} 
                  />
                )}
              </motion.div>
              <span className={`
                text-xs font-medium transition-colors duration-300
                ${isActive ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-muted)]'}
              `}>
                {stepLabels[step]}
              </span>
            </motion.div>
          )
        })}
      </div>

      {/* Mobile: Simple dots */}
      <div className="mt-4 flex sm:hidden justify-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => {
          const step = (i + 1) as FormStep
          const isActive = step === currentStep
          const isCompleted = step < currentStep

          return (
            <motion.div
              key={step}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className={`
                h-2.5 rounded-full transition-all duration-300
                ${isActive 
                  ? 'w-8 bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)]' 
                  : isCompleted 
                  ? 'w-2.5 bg-[var(--accent-lime)]' 
                  : 'w-2.5 bg-[var(--border)]'
                }
              `}
            />
          )
        })}
      </div>
    </div>
  )
}