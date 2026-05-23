import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface Service {
  id: string
  title?: string
  slug?: string
  description?: string
  short_description?: string
  full_description?: string
  icon?: string
  features?: string[] | string
  benefits?: string[] | string
  deliverables?: string[] | string
  timeline?: string
  starting_price?: string
  featured_image?: string
  is_active?: boolean
}

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

function cleanIcon(service: Service) {
  const source = service.icon || service.title || 'services'

  const cleaned = source
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (cleaned.includes('ecommerce') || cleaned.includes('commerce') || cleaned.includes('shopify')) return 'ecommerce'
  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('marketing')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'
  if (cleaned.includes('consult')) return 'consulting'

  return cleaned || 'services'
}

interface PageProps {
  params: {
    slug: string
  }
}

export default async function ServiceDetailPage({ params }: PageProps) {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) {
    notFound()
  }

  const service: Service = data

  const features = normalizeArray(service.features)
  const benefits = normalizeArray(service.benefits)
  const deliverables = normalizeArray(service.deliverables)

  const icon = cleanIcon(service)

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 pb-16 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-[1.6rem] border border-[#39D97A]/18 bg-[#39D97A]/10">
                  <SvgIcon name={icon} size={30} color="#39D97A" />
                </div>

                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Premium Digital Service
                </p>

                <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                  <GradientHeading>
                    {service.title || 'Service'}
                  </GradientHeading>
                </h1>

                <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                  {service.full_description ||
                    service.short_description ||
                    service.description}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {service.timeline && (
                    <div className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                      Timeline: {service.timeline}
                    </div>
                  )}

                  {service.starting_price && (
                    <div className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60">
                      {service.starting_price}
                    </div>
                  )}
                </div>

                <div className="mt-8 flex flex-wrap gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    Start A Project
                    <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
                  </Link>

                  <Link
                    href="/services"
                    className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-8 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                  >
                    All Services
                  </Link>
                </div>
              </div>

              <div className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-6 shadow-[0_30px_90px_rgba(0,0,0,0.28)]">
                <div className="mb-6 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                    <SvgIcon name="verified" size={18} color="#39D97A" />
                  </div>

                  <div>
                    <p className="text-sm font-black text-white">
                      Included Features
                    </p>

                    <p className="text-xs text-white/45">
                      What comes with this service
                    </p>
                  </div>
                </div>

                <div className="grid gap-3">
                  {(features.length ? features : ['Strategy', 'Execution', 'Optimization']).map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F]/80 px-4 py-3"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                        <SvgIcon name="verified" size={13} color="#39D97A" />
                      </span>

                      <span className="text-sm font-bold text-white/68">
                        {item}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {benefits.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Benefits
                </p>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                  Why this service helps your <GradientHeading>brand grow.</GradientHeading>
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {benefits.map((benefit) => (
                  <div
                    key={benefit}
                    className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-5"
                  >
                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                      <SvgIcon name="growth" size={20} color="#39D97A" />
                    </div>

                    <p className="text-base font-bold leading-7 text-white/72">
                      {benefit}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {deliverables.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-10 lg:p-14">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Deliverables
                </p>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                  What’s included in the <GradientHeading>process.</GradientHeading>
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {deliverables.map((item, index) => (
                  <div
                    key={item}
                    className="flex items-start gap-4 rounded-[1.5rem] border border-[#1E314A] bg-[#07111F]/80 p-5"
                  >
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 text-sm font-black text-[#39D97A]">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <div>
                      <p className="text-base font-bold leading-7 text-white/72">
                        {item}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 pb-24 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Ready to move forward?
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Let’s build a stronger digital foundation for your business.
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Every project is approached strategically, focusing on trust,
              usability, customer experience, and sustainable growth.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Start A Project
              <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}