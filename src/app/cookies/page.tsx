import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export const metadata = {
  title: 'Cookie Policy | Hbee Digitals',
  description: 'How Hbee Digitals uses cookies and similar tracking technologies.',
}

export default function CookiePolicyPage() {
  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-white dark:bg-[var(--bg-color)] px-6 md:px-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-4xl font-extrabold mb-6" style={{ color: 'var(--secondary-color)' }}>
            Cookie Policy
          </h1>
          <div className="space-y-6 text-gray-600 dark:text-white/70 leading-relaxed">
            <p><strong>Effective Date:</strong> January 1, 2026</p>
            <p>
              This Cookie Policy explains how Hbee Digitals uses cookies and similar technologies to recognize you when
              you visit our website. It explains what these technologies are and why we use them, as well as your rights
              to control our use of them.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              What Are Cookies?
            </h2>
            <p>
              Cookies are small data files that are placed on your computer or mobile device when you visit a website.
              They are widely used by website owners to make their websites work, or to work more efficiently, as well as
              to provide reporting information.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              How We Use Cookies
            </h2>
            <p>We use cookies for the following purposes:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Essential cookies:</strong> Necessary for the website to function properly (e.g., session handling).</li>
              <li><strong>Performance cookies:</strong> Help us understand how visitors interact with our site (Google Analytics).</li>
              <li><strong>Preference cookies:</strong> Remember your theme preference (dark/light mode) and cookie consent choice.</li>
            </ul>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Your Choices
            </h2>
            <p>
              When you first visit our site, you will see a cookie consent banner. You can choose to accept or decline
              non‑essential cookies. You can also change your mind at any time by clearing your browser's cookies or
              changing your browser settings to block cookies. Please note that disabling cookies may affect the
              functionality of the website.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Third‑Party Cookies
            </h2>
            <p>
              We use Google Analytics, which places cookies on your device to help us analyze site usage. These cookies
              are governed by Google's privacy policy.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Changes
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect changes in the cookies we use or for other
              operational, legal, or regulatory reasons.
            </p>

            <h2 className="text-2xl font-bold mt-10 mb-4" style={{ color: 'var(--secondary-color)' }}>
              Contact
            </h2>
            <p>
              If you have questions about our use of cookies, please contact us at:
              <br />
              📧 <a href="mailto:hello.hbeedigitals@gmail.com" className="text-blue-600 underline">hbeedigitalent@gmail.com</a>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}