// src/components/onboarding/OnboardingForm.tsx
'use client'

import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { useOnboardingForm } from '@/hooks/useOnboardingForm'
import { StepIndicator } from './StepIndicator'
import { Step1ClientInfo } from './Step1ClientInfo'
import { Step2ProjectDetails } from './Step2ProjectDetails'
import { Step3BusinessMarketing } from './Step3BusinessMarketing'
import { Step4BrandInfo } from './Step4BrandInfo'
import { Step5StoreAccess } from './Step5StoreAccess'
import { Step6TeamApprovals } from './Step6TeamApprovals'
import { Step7AssetCenter } from './Step7AssetCenter'
import { Step8AdditionalRequests } from './Step8AdditionalRequests'
import { Step9ReviewSubmit } from './Step9ReviewSubmit'
import SvgIcon from '@/components/ui/SvgIcon'

const stepComponents = {
  1: Step1ClientInfo,
  2: Step2ProjectDetails,
  3: Step3BusinessMarketing,
  4: Step4BrandInfo,
  5: Step5StoreAccess,
  6: Step6TeamApprovals,
  7: Step7AssetCenter,
  8: Step8AdditionalRequests,
  9: Step9ReviewSubmit
}

const stepTitles = {
  1: 'Client Information',
  2: 'Project Details',
  3: 'Business & Marketing',
  4: 'Brand Information',
  5: 'Store Access',
  6: 'Team & Approvals',
  7: 'Asset Center',
  8: 'Additional Requests',
  9: 'Review & Submit'
}

const stepSubtext = {
  1: 'Tell us about yourself and your business',
  2: 'What are you looking to achieve?',
  3: 'Help us understand your business and marketing',
  4: 'Tell us about your brand',
  5: 'How should we access your store?',
  6: 'Who is involved in this project?',
  7: 'Upload your brand assets and files',
  8: 'Any additional information?',
  9: 'Review your answers before submitting'
}

export function OnboardingForm() {
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
  } = useOnboardingForm()

  // Redirect to thank you page after successful submission
  if (isSubmitted) {
    router.push('/client-onboarding/thank-you')
    return null
  }

  const StepComponent = stepComponents[currentStep as keyof typeof stepComponents]
  const currentTitle = stepTitles[currentStep as keyof typeof stepTitles]
  const currentSubtext = stepSubtext[currentStep as keyof typeof stepSubtext]

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6 md:p-8">
      <StepIndicator currentStep={currentStep} totalSteps={9} />

      <motion.div
        key={`title-${currentStep}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-8"
      >
        <h2 className="text-2xl md:text-3xl font-bold text-white">
          {currentTitle}
        </h2>
        <p className="mt-1 text-[var(--text-on-dark-muted)]">
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
        <div className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-red-400">
          {errors.submit}
        </div>
      )}

      <div className="mt-8 flex justify-between gap-4 border-t border-[var(--border)] pt-6">
        <button
          type="button"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--border)] bg-transparent px-6 py-3 text-sm font-semibold text-[var(--text-on-dark)] transition-all hover:bg-[var(--bg-card-hover)] disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <SvgIcon name="chevron-left" size={16} color="currentColor" />
          Previous
        </button>

        {currentStep === 9 ? (
          <button
            type="button"
            onClick={submitForm}
            disabled={isSubmitting || !isCurrentStepComplete()}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent-orange)]/20"
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
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[var(--accent-orange)] to-[var(--accent-lime)] px-8 py-3 text-sm font-bold text-white transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[var(--accent-orange)]/20"
          >
            Continue
            <SvgIcon name="chevron-right" size={16} color="white" />
          </button>
        )}
      </div>
    </div>
  )
}