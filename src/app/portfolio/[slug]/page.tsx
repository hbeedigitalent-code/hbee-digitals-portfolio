import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'

interface PortfolioItem {
  id: string
  name?: string
  title?: string
  slug?: string
  tag?: string
  category?: string
  description?: string
  overview?: string
  challenge?: string
  solution?: string
  result?: string
  results?: string
  image_url?: string
  featured_image?: string
  client_name?: string
  project_url?: string
  website_url?: string
  services?: string[] | string
  metrics?: any
  gallery?: any
  is_active?: boolean
}

export const revalidate = 60

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') return value.split('|').map((item) => item.trim()).filter(Boolean)
  return []
}

function normalizeMetrics(value: any) {
  if (!value) {
    return [
      { label: 'Conversion Readiness', value: 'Improved' },
      { label: 'User Experience', value: 'Optimized' },
      { label: 'Brand Trust', value: 'Strengthened' },
    ]
  }

  if (Array.isArray(value)) return value

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value
    return Array.isArray(parsed) ? parsed : Object.entries(parsed).map(([label, val]) => ({ label, value: String(val) }))
  } catch {
    return []
  }
}

function normalizeGallery(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value.split('|').map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

async function getPortfolioItem(slug: string) {
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()

  return data as PortfolioItem | null
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const item = await getPortfolioItem(params.slug)

  if (!item) {
    return {
      title: 'Case Study Not Found | Hbee Digitals',
    }
  }

  const title = item.title || item.name || 'Case Study'
  const description =
    item.description ||
    item.overview ||
    'Explore this Hbee Digitals case study and how we helped improve digital growth, trust, and performance.'

  return {
    title: `${title} | Hbee Digitals Case Study`,
    description,
    openGraph: {
      title: `${title} | Hbee Digitals`,
      description,
      images: [
        {
          url: item.featured_image || item.image_url || '/og-image.jpg',
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
  }
}

export default async function PortfolioDetailPage({ params }: { params: { slug: string } }) {
  const item = await getPortfolioItem(params.slug)

  if (!item || item.is_active === false) notFound()

  const title = item.title || item.name || 'Case Study'
  const image = item.featured_image || item.image_url
  const services = normalizeArray(item.services)
  const metrics = normalizeMetrics(item.metrics)
  const gallery = normalizeGallery(item.gallery)
  const websiteUrl = item.project_url || item.website_url

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-0 top-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/7 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[360px] w-[460px] rounded-full bg-[#C6F135]/5 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <Link
              href="/portfolio"
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-5 py-2.5 text-sm font-bold text-white/65 transition hover:border-[#39D97A]/30 hover:text-white"
            >
              <SvgIcon name="chevron-left" size={15} color="#39D97A" />
              Back to Portfolio
            </Link>

            <div className="grid gap-12 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  <SvgIcon name="portfolio" size={14} color="#39D97A" />
                  Case Study
                </div>

                <h1 className="max-w-4xl text-5xl font-black leading-[0.92] tracking-[-0.065em] sm:text-6xl md:text-7xl">
                  {title}
                </h1>

                <p className="mt-6 max-w-2xl text-sm leading-8 text-white/62 sm:text-base md:text-lg">
                  {item.description || item.overview || 'A premium digital growth project built to improve trust, performance, and conversion structure.'}
                </p>

                <div className="mt-7 flex flex-wrap gap-3">
                  {(services.length ? services : [item.category || item.tag || 'Digital Growth']).map((service) => (
                    <span
                      key={service}
                      className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#39D97A]"
                    >
                      {service}
                    </span>
                  ))}
                </div>

                <div className="mt-9 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[54px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    Start Similar Project
                  </Link>

                  {websiteUrl && (
                    <a
                      href={websiteUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-7 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                    >
                      Visit Project
                      <SvgIcon name="arrow-diagonal" size={16} color="#39D97A" />
                    </a>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-[#0E1B2D] p-4 shadow-[0_36px_100px_rgba(0,0,0,0.32)]">
                <div className="overflow-hidden rounded-[1.7rem] border border-[#1E314A] bg-[#07111F]">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      className="h-full min-h-[360px] w-full object-cover sm:min-h-[470px] lg:min-h-[540px]"
                    />
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center bg-gradient-to-br from-[#07111F] to-[#13233A] sm:min-h-[470px] lg:min-h-[540px]">
                      <SvgIcon name="portfolio" size={70} color="#39D97A" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-3">
            {metrics.map((metric: any, index: number) => (
              <div
                key={`${metric.label}-${index}`}
                className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-6"
              >
                <p className="text-3xl font-black tracking-[-0.05em] text-white">
                  <span className="bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                    {metric.value}
                  </span>
                </p>
                <p className="mt-2 text-sm font-bold uppercase tracking-[0.14em] text-white/45">
                  {metric.label}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            <CaseBlock
              icon="analytics"
              title="The Challenge"
              text={item.challenge || 'The project needed a stronger digital foundation, clearer user experience, and a more conversion-focused structure.'}
            />

            <CaseBlock
              icon="strategy"
              title="The Solution"
              text={item.solution || 'We improved the visual hierarchy, user journey, trust elements, and technical structure to create a cleaner growth system.'}
            />

            <CaseBlock
              icon="growth"
              title="The Result"
              text={item.result || item.results || 'The final system improved brand confidence, navigation clarity, digital trust, and readiness for growth.'}
            />
          </div>
        </section>

        {gallery.length > 0 && (
          <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Project Gallery
                </p>

                <h2 className="text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                  Visual details from the project.
                </h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {gallery.map((src) => (
                  <div
                    key={src}
                    className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3"
                  >
                    <img
                      src={src}
                      alt={`${title} gallery`}
                      className="h-full min-h-[320px] w-full rounded-[1.5rem] object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 pb-20 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Build With Hbee Digitals
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Ready to create a project like this?
            </h2>

            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
              Let’s build a premium digital system that improves your website, store, brand trust, and growth foundation.
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

function CaseBlock({
  icon,
  title,
  text,
}: {
  icon: string
  title: string
  text: string
}) {
  return (
    <div className="rounded-[1.8rem] border border-[#1E314A] bg-[#0E1B2D] p-6 transition hover:-translate-y-1 hover:border-[#39D97A]/25 hover:bg-[#13233A]">
      <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
        <SvgIcon name={icon} size={22} color="#39D97A" />
      </div>

      <h3 className="text-2xl font-black tracking-[-0.035em] text-white">
        {title}
      </h3>

      <p className="mt-4 text-sm leading-7 text-white/58">
        {text}
      </p>
    </div>
  )
}