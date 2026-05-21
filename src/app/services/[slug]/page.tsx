import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

interface Service {
  id: string
  title?: string
  slug?: string
  short_description?: string
  full_description?: string
  overview?: string
  process?: string
  benefits?: string[] | string
  deliverables?: string[] | string
  featured_image?: string
  image_url?: string
  icon?: string
  pricing?: string
  is_active?: boolean
}

export const revalidate = 60

function normalizeArray(value: any): string[] {
  if (!value) return []

  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split('|')
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

async function getService(slug: string) {
  const { data } = await supabase
    .from('services')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  return data as Service | null
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}) {
  const service = await getService(params.slug)

  if (!service) {
    return {
      title: 'Service Not Found | Hbee Digitals',
    }
  }

  return {
    title: `${service.title} | Hbee Digitals`,
    description:
      service.short_description ||
      service.full_description ||
      'Premium digital services from Hbee Digitals.',
  }
}

export default async function ServicePage({
  params,
}: {
  params: { slug: string }
}) {
  const service = await getService(params.slug)

  if (!service || service.is_active === false) {
    notFound()
  }

  const benefits = normalizeArray(service.benefits)
  const deliverables = normalizeArray(service.deliverables)

  const image =
    service.featured_image ||
    service.image_url ||
    '/images/service-placeholder.jpg'

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-0 top-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/7 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[460px] rounded-full bg-[#C6F135]/5 blur-[120px]" />
        </div>

        <section className="px-5 pb-20 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/services"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-5 py-2.5 text-sm font-bold text-white/65 transition hover:border-[#39D97A]/30 hover:text-white"
            >
              <SvgIcon name="chevron-left" size={15} color="#39D97A" />
              Back to Services
            </Link>

            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  <SvgIcon
                    name={service.icon || 'services'}
                    size={14}
                    color="#39D97A"
                  />
                  Premium Service
                </div>

                <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-6xl md:text-7xl">
                  {service.title}
                </h1>

                <p className="mt-6 max-w-2xl text-sm leading-8 text-white/62 sm:text-base md:text-lg">
                  {service.full_description ||
                    service.short_description ||
                    'Premium digital systems designed for performance and growth.'}
                </p>

                {service.pricing && (
                  <div className="mt-7">
                    <div className="inline-flex rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-5 py-3">
                      <span className="text-sm font-black uppercase tracking-[0.14em] text-[#39D97A]">
                        {service.pricing}
                      </span>
                    </div>
                  </div>
                )}

                <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    Start Project
                  </Link>

                  <Link
                    href="/portfolio"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] px-7 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                  >
                    View Case Studies
                  </Link>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-[#0E1B2D] p-4 shadow-[0_36px_100px_rgba(0,0,0,0.32)]">
                <div className="overflow-hidden rounded-[1.7rem] border border-[#1E314A] bg-[#07111F]">
                  <img
                    src={image}
                    alt={service.title}
                    className="h-full min-h-[360px] w-full object-cover sm:min-h-[470px] lg:min-h-[540px]"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8">
              <h2 className="text-3xl font-black tracking-[-0.045em]">
                What You Get
              </h2>

              <div className="mt-8 space-y-4">
                {(deliverables.length
                  ? deliverables
                  : [
                      'Premium visual design',
                      'Conversion-focused structure',
                      'Responsive optimization',
                      'Brand consistency',
                    ]
                ).map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] p-4"
                  >
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#39D97A]">
                      <SvgIcon
                        name="check"
                        size={12}
                        color="#06101F"
                      />
                    </div>

                    <p className="text-sm leading-7 text-white/65">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8">
              <h2 className="text-3xl font-black tracking-[-0.045em]">
                Why It Matters
              </h2>

              <div className="mt-8 space-y-4">
                {(benefits.length
                  ? benefits
                  : [
                      'Improves digital trust',
                      'Enhances conversion flow',
                      'Strengthens brand perception',
                      'Creates scalable systems',
                    ]
                ).map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F] p-4"
                  >
                    <div className="mt-1 flex h-6 w-6 items-center justify-center rounded-full bg-[#39D97A]">
                      <SvgIcon
                        name="growth"
                        size={12}
                        color="#06101F"
                      />
                    </div>

                    <p className="text-sm leading-7 text-white/65">
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-10 text-center">
            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Ready to build a premium digital experience?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Let’s create a cleaner, faster, and more conversion-focused digital system for your business.
            </p>

            <Link
              href="/contact"
              className="mt-8 inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Start Your Project
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}