import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

export default function NotFound() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white">
        <div className="text-center px-4">
          <div className="text-8xl md:text-9xl font-bold text-gray-200 mb-4">404</div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
            Page Not Found
          </h1>
          <p className="text-gray-600 mb-8 max-w-md mx-auto">
            Oops! The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/" className="px-6 py-3 bg-white rounded-lg font-semibold shadow-md hover:shadow-lg transition" style={{ color: 'var(--primary-color)', border: `2px solid var(--primary-color)` }}>
              Go Home
            </Link>
            <Link href="/contact" className="px-6 py-3 rounded-lg font-semibold transition hover:opacity-90" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }}>
              Contact Support
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}