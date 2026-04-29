import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function TermsOfService() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: 'var(--primary-color)' }}>
            Terms of Service
          </h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
              <p className="text-gray-600">By accessing or using our website and services, you agree to be bound by these Terms of Service.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. Services</h2>
              <p className="text-gray-600">We provide web development, e-commerce solutions, UI/UX design, digital marketing, and related services. Specific terms may apply to each service.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Payment Terms</h2>
              <p className="text-gray-600">Payment terms are specified in individual service agreements. Deposits may be required before work commences.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Intellectual Property</h2>
              <p className="text-gray-600">All content, logos, and designs on our website are our intellectual property. Upon full payment, clients receive ownership of delivered work.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
              <p className="text-gray-600">We are not liable for indirect damages arising from use of our services. Our liability is limited to the amount paid for services.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Termination</h2>
              <p className="text-gray-600">Either party may terminate agreements with written notice. Fees for work completed are non-refundable.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">7. Contact</h2>
              <p className="text-gray-600">Questions about these Terms? Contact us at hello@hbeedigitals.com.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}