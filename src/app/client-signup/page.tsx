'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

const industries = [
  'Fashion & Apparel', 'Beauty & Cosmetics', 'Health & Wellness',
  'Home & Living', 'Electronics', 'Jewelry', 'Pet Products',
  'Food & Beverage', 'Automotive', 'Digital Products', 'Other'
]

const countries = [
  'United States', 'United Kingdom', 'Canada', 'Australia',
  'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
  'New Zealand', 'Other'
]

export default function ClientSignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [formData, setFormData] = useState({
    business_name: '',
    contact_name: '',
    email: '',
    password: '',
    confirm_password: '',
    whatsapp: '',
    website_url: '',
    country: '',
    industry: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // Validate
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      setLoading(false)
      return
    }

    try {
      // Dynamic import to avoid build-time resolution issues
      const { createMerchantAccount } = await import('@/lib/services/merchant-auth-service')
      
      const result = await createMerchantAccount({
        business_name: formData.business_name,
        contact_name: formData.contact_name,
        email: formData.email,
        password: formData.password,
        whatsapp: formData.whatsapp,
        website_url: formData.website_url,
        country: formData.country,
        industry: formData.industry,
      })

      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/client-login')
        }, 3000)
      } else {
        setError(result.error || 'Failed to create account')
      }
    } catch (err) {
      console.error('Signup error:', err)
      setError('Service unavailable. Please try again later.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-20">
          <div className="w-full max-w-md text-center">
            <div className="rounded-full bg-[var(--accent-lime)]/10 p-4 mx-auto w-20 h-20 flex items-center justify-center mb-6">
              <SvgIcon name="check" size={40} color="var(--accent-lime)" />
            </div>
            <h1 className="text-2xl font-bold text-white">Account Created!</h1>
            <p className="mt-2 text-[var(--text-muted)]">
              Your merchant account has been created. You'll be redirected to login.
            </p>
            <Link
              href="/client-login"
              className="mt-6 inline-block rounded-full bg-[var(--accent-orange)] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)]"
            >
              Go to Login
            </Link>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-[var(--bg-navy)] px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Create Merchant Account</h1>
            <p className="mt-2 text-[var(--text-muted)]">Join Hbee Digitals as a merchant</p>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card-dark)] p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Business Name *</label>
                <input
                  type="text"
                  name="business_name"
                  value={formData.business_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="Your business name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Contact Name *</label>
                <input
                  type="text"
                  name="contact_name"
                  value={formData.contact_name}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="Your full name"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Email Address *</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="you@email.com"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Password *</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Confirm Password *</label>
                <input
                  type="password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  required
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="Confirm your password"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">WhatsApp (Optional)</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-white">Website URL</label>
                <input
                  type="url"
                  name="website_url"
                  value={formData.website_url}
                  onChange={handleChange}
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  placeholder="https://yourstore.com"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Country</label>
                  <select
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  >
                    <option value="">Select country</option>
                    {countries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-white">Industry</label>
                  <select
                    name="industry"
                    value={formData.industry}
                    onChange={handleChange}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-navy-mid)] px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[var(--accent-orange)]"
                  >
                    <option value="">Select industry</option>
                    {industries.map((i) => (
                      <option key={i} value={i}>{i}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-[var(--accent-orange)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--orange-600)] disabled:opacity-50"
              >
                {loading ? 'Creating Account...' : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-[var(--text-muted)]">
                Already have an account?{' '}
                <Link href="/client-login" className="text-[var(--accent-orange)] hover:underline">
                  Login
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}