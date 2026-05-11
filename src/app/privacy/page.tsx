import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Privacy Policy | Hbee Digitals',
  description: 'Learn how Hbee Digitals collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white dark:bg-[var(--bg-color)] px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-6" style={{ color: 'var(--secondary-color)' }}>
            Privacy Policy
          </h1>
          <div className="space-y-6 text-gray-600 dark:text-white/70 leading-relaxed">
            <p><strong>Effective Date:</strong> January 1, 2026</p>
            <p>
              At Hbee Digitals, we take your privacy seriously. This Privacy Policy explains how we collect, use,
              disclose, and safeguard your information when you visit our website or use our services.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Information We Collect
            </h2>
            <p>
              We may collect personal information that you voluntarily provide to us when you fill out a contact form,
              subscribe to our newsletter, or engage with our services. This includes:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number (optional)</li>
              <li>Project details (optional)</li>
              <li>IP address and browser information (automatically logged)</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              How We Use Your Information
            </h2>
            <p>
              We use the information we collect to:
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li>Respond to your inquiries and provide customer support</li>
              <li>Send you newsletters, updates, and promotional materials (only with your consent)</li>
              <li>Improve our website and services</li>
              <li>Analyze trends and track site usage via Google Analytics</li>
              <li>Comply with legal obligations</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Cookies and Tracking Technologies
            </h2>
            <p>
              We use cookies and similar tracking technologies to enhance your browsing experience, analyze site traffic,
              and understand where our visitors come from. You can manage your cookie preferences through your browser
              settings or via our cookie consent banner.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Data Sharing
            </h2>
            <p>
              We do not sell, trade, or rent your personal information to third parties. We may share data with trusted
              service providers who help us operate our website (e.g., Google Analytics, Supabase hosting), and only
              to the extent necessary.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Data Security
            </h2>
            <p>
              We implement appropriate technical and organizational measures to protect your personal data against
              unauthorized access, alteration, disclosure, or destruction.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Your Rights
            </h2>
            <p>
              Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data.
              You can also withdraw your consent at any time. To exercise these rights, please contact us at
              {' '}<a href="mailto:hello.hbeedigitals@gmail.com" className="text-blue-600 underline">hbeedigitalent@gmail.com</a>.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Changes to This Policy
            </h2>
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new
              Privacy Policy on this page.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Contact Us
            </h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at:
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