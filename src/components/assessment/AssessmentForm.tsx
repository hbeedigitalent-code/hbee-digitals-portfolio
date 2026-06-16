'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { StepIndicator } from './StepIndicator'
import { Step1BusinessProfile } from './Step1BusinessProfile'
import { Step2BusinessStage } from './Step2BusinessStage'
import { Step3GrowthObjectives } from './Step3GrowthObjectives'
import { Step4VisibilityMarketing } from './Step4VisibilityMarketing'
import { Step5CustomerExperience } from './Step5CustomerExperience'
import { Step6GrowthChallenges } from './Step6GrowthChallenges'
import { Step7GrowthReadiness } from './Step7GrowthReadiness'
import { useAssessmentForm } from '@/hooks/useAssessmentForm'
import SvgIcon from '@/components/ui/SvgIcon'
import { motion, AnimatePresence } from 'framer-motion'

const stepComponents = {
  1: Step1BusinessProfile,
  2: Step2BusinessStage,
  3: Step3GrowthObjectives,
  4: Step4VisibilityMarketing,
  5: Step5CustomerExperience,
  6: Step6GrowthChallenges,
  7: Step7GrowthReadiness
}

export function AssessmentForm() {
  const router = useRouter()
  
  const {
    currentStep,
    formData,
    errors,
    isSubmitting,
    isSubmitted,
    updateField,
    nextStep,
    prevStep,
    submitForm,
    isCurrentStepComplete
  } = useAssessmentForm()

  // Redirect to thank you page after successful submission
  if (isSubmitted) {
    router.push('/assessment/thank-you')
    return null
  }

  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6 md:p-8">
      <StepIndicator
        currentStep={currentStep}
        totalSteps={7}
        completedSteps={Array.from({ length: currentStep - 1 }, (_, i) => (i + 1) as any)}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          <StepComponent
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        </motion.div>
      </AnimatePresence>

      {errors.submit && (
        <div className="mt-6 rounded-lg border border-red-500 bg-red-500/10 p-4 text-red-500">
          {errors.submit}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-4 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-medium text-[var(--text-primary)] transition-all hover:bg-[var(--bg-card-hover)] hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <SvgIcon name="chevron-left" size={16} />
          Previous
        </button>

        {currentStep === 7 ? (
          <button
            type="button"
            onClick={submitForm}
            disabled={isSubmitting || !isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--orange-600)] hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                Submit Assessment
                <SvgIcon name="check" size={16} />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--orange-600)] hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
            <SvgIcon name="chevron-right" size={16} />
          </button>
        )}
      </div>
    </div>
  )
}