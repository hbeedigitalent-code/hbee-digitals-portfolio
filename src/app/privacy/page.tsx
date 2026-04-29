import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function PrivacyPolicy() {
  return (
    <>
      <Navbar />
      <main className="pt-32 pb-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-4xl">
          <h1 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: 'var(--primary-color)' }}>
            Privacy Policy
          </h1>
          <p className="text-gray-500 mb-8">Last updated: {new Date().toLocaleDateString()}</p>
          
          <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Information We Collect</h2>
              <p className="text-gray-600">We collect information you provide directly to us, such as when you contact us, subscribe to our newsletter, or request services. This may include your name, email address, phone number, and project details.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. How We Use Your Information</h2>
              <p className="text-gray-600">We use your information to respond to inquiries, provide services, send newsletters, improve our website, and comply with legal obligations.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Information Sharing</h2>
              <p className="text-gray-600">We do not sell or rent your personal information. We may share information with service providers who assist in our operations, or when required by law.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
              <p className="text-gray-600">We implement appropriate technical and organizational measures to protect your personal information against unauthorized access or disclosure.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Your Rights</h2>
              <p className="text-gray-600">You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Contact Us</h2>
              <p className="text-gray-600">If you have questions about this Privacy Policy, please contact us at hello@hbeedigitals.com.</p>
            </section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}