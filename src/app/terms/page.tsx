import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Terms of Service | Hbee Digitals',
  description: 'Terms and conditions for using Hbee Digitals services.',
}

export default function TermsPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white dark:bg-[var(--bg-color)] px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-6" style={{ color: 'var(--secondary-color)' }}>
            Terms of Service
          </h1>
          <div className="space-y-6 text-gray-600 dark:text-white/70 leading-relaxed">
            <p><strong>Effective Date:</strong> January 1, 2026</p>
            <p>
              Welcome to Hbee Digitals. By accessing or using our website and services, you agree to be bound by these
              Terms of Service. If you do not agree, please do not use our services.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Services
            </h2>
            <p>
              Hbee Digitals provides web development, e‑commerce solutions, UI/UX design, digital marketing, and
              related consulting services. All services are subject to availability and may be modified at any time.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              User Responsibilities
            </h2>
            <p>You agree to:</p>
            <ul className="list-disc list-inside space-y-2">
              <li>Provide accurate and complete information when contacting us or creating an account</li>
              <li>Use our website and services only for lawful purposes</li>
              <li>Not engage in any activity that disrupts or interferes with our services</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Intellectual Property
            </h2>
            <p>
              All content on this website, including text, graphics, logos, and code, is the property of Hbee Digitals
              and is protected by copyright and intellectual property laws. You may not reproduce, distribute, or create
              derivative works without our express written permission.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Limitation of Liability
            </h2>
            <p>
              Hbee Digitals shall not be liable for any indirect, incidental, or consequential damages arising from your
              use of our website or services. Our total liability is limited to the amount paid by you for the specific
              service in question.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Governing Law
            </h2>
            <p>
              These terms shall be governed by the laws of the Federal Republic of Nigeria. Any disputes shall be resolved
              in the courts of Abuja, Nigeria.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Changes to Terms
            </h2>
            <p>
              We reserve the right to update these Terms of Service at any time. Continued use of the site after changes
              constitutes acceptance of the new terms.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Contact
            </h2>
            <p>
              For questions about these terms, please contact us at:
              <br />
              📧 <a href="mailto:hello.hbeedigitals@gmail.com" className="text-blue-600 underline">hbeedigitalent@gmail.com</a>
              <br />
              📞 +234 (815) 315-3827
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}