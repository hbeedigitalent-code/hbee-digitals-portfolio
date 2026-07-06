// src/components/onboarding/NewOnboardingForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useNewOnboardingForm } from '@/hooks/useNewOnboardingForm'
import { StepIndicator } from './NewStepIndicator'
import { Step1ProjectDetails } from './NewStep1ProjectDetails'
import { Step2TimelineBudget } from './NewStep2TimelineBudget'
import { Step3BrandAssets } from './NewStep3BrandAssets'
import { Step4Contact } from './NewStep4Contact'
import { Step5ReviewSubmit } from './NewStep5ReviewSubmit'
import SvgIcon from '@/components/ui/SvgIcon'

const stepComponents = {
  1: Step1ProjectDetails,
  2: Step2TimelineBudget,
  3: Step3BrandAssets,
  4: Step4Contact,
  5: Step5ReviewSubmit
}

const stepTitles = {
  1: 'Project Details',
  2: 'Timeline & Budget',
  3: 'Brand Assets',
  4: 'Contact Information',
  5: 'Review & Submit'
}

const stepSubtext = {
  1: 'Tell us about your project',
  2: 'When do you need it and what\'s your budget?',
  3: 'Upload your brand assets and files',
  4: 'How should we reach you?',
  5: 'Review your answers before submitting'
}

export function NewOnboardingForm() {
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
    isCurrentStepComplete,
    submitForm
  } = useNewOnboardingForm()

  if (isSubmitted) {
    router.push('/client-onboarding/thank-you')
    return null
  }

  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents]
  const currentTitle = stepTitles[currentStep as keyof typeof stepTitles]
  const currentSubtext = stepSubtext[currentStep as keyof typeof stepSubtext]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6 md:p-8">
      <StepIndicator currentStep={currentStep} totalSteps={5} />

      <motion.div
        key={`title-${currentStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-[var(--text-primary)]">
          {currentTitle}
        </h2>
        <p className="mt-1 text-[var(--text-muted)]">
          {currentSubtext}
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          <StepComponent
            formData={formData}
            updateField={updateField}
            errors={errors}
          />
        </motion.div>
      </AnimatePresence>

      {errors.submit && (
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-500">
          {errors.submit}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-4 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition-all hover:bg-[var(--bg-section)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SvgIcon name="chevron-left" size={16} color="var(--text-primary)" />
          Previous
        </button>

        {currentStep === 5 ? (
          <button
            type="button"
            onClick={submitForm}
            disabled={isSubmitting || !isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Submitting...
              </>
            ) : (
              <>
                Submit Onboarding
                <SvgIcon name="check" size={18} color="white" />
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={nextStep}
            disabled={!isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-8 py-3 text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <SvgIcon name="chevron-right" size={16} color="white" />
          </button>
        )}
      </div>
    </div>
  )
}