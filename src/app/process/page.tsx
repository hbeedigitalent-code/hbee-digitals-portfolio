'use client'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'

export default function ProcessPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 py-20">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="text-xs tracking-widest uppercase text-blue-400 font-semibold mb-3">
              Our Process
            </div>
            <h1 className="font-bold text-4xl md:text-5xl text-white mb-4">
              How We Bring Ideas to Life
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full mx-auto my-4" />
            <p className="text-gray-300 max-w-2xl mx-auto text-sm">
              A transparent, step-by-step approach to building your successful online store.
            </p>
          </div>

          {/* Process Icons Row */}
          <div className="flex flex-wrap justify-center items-center gap-8 md:gap-12 max-w-5xl mx-auto">
            {/* Step 1 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">01</span>
              </div>
              <div className="text-xs font-bold text-blue-400 uppercase">STRATEGY</div>
              <div className="text-xs text-gray-400">Development</div>
            </div>

            {/* Step 2 */}
            <div className="text-center mt-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">02</span>
              </div>
              <div className="text-xs font-bold text-cyan-400 uppercase">DESIGN</div>
              <div className="text-xs text-gray-400">Branding</div>
            </div>

            {/* Step 3 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">03</span>
              </div>
              <div className="text-xs font-bold text-blue-400 uppercase">DEVELOPMENT</div>
              <div className="text-xs text-gray-400">Shopify Store</div>
            </div>

            {/* Step 4 */}
            <div className="text-center mt-8">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-2xl shadow-lg flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">04</span>
              </div>
              <div className="text-xs font-bold text-cyan-400 uppercase">TESTING</div>
              <div className="text-xs text-gray-400">Quality & QA</div>
            </div>

            {/* Step 5 */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg flex items-center justify-center mb-3">
                <span className="text-2xl font-bold text-white">05</span>
              </div>
              <div className="text-xs font-bold text-blue-400 uppercase">SEO</div>
              <div className="text-xs text-gray-400">Optimization</div>
            </div>
          </div>

          {/* Connecting lines (optional - simple visual) */}
          <div className="flex justify-center items-center gap-2 max-w-4xl mx-auto mt-4">
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 max-w-[60px]" />
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 max-w-[60px]" />
            <div className="h-px flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 max-w-[60px]" />
            <div className="h-px flex-1 bg-gradient-to-r from-cyan-400 to-blue-500 max-w-[60px]" />
          </div>

          {/* CTA */}
          <div className="text-center mt-16">
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
            >
              Start Your Project
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}