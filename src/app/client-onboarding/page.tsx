import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { OnboardingForm } from '@/components/onboarding/OnboardingForm'

export const metadata = {
  title: 'Client Onboarding | Hbee Digitals',
  description: 'Complete your onboarding to start your project with Hbee Digitals.',
}

export default function ClientOnboardingPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[var(--bg-navy)] py-12 md:py-20">
        <div className="container-custom">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-center">
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Client Onboarding
              </h1>
              <p className="text-[var(--text-on-dark-muted)] text-base md:text-lg">
                Tell us about your project so we can get started.
              </p>
            </div>
            <OnboardingForm />
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}