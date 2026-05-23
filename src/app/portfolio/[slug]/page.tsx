import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface PortfolioItem {
  id: string
  title?: string
  name?: string
  slug?: string
  category?: string
  tag?: string
  description?: string
  image_url?: string
  featured_image?: string
  client_name?: string
  industry?: string
  challenge?: string
  solution?: string
  process?: string[] | string
  results?: string[] | string
  technologies?: string[] | string
  testimonial?: string
  live_url?: string
  url?: string
  project_url?: string
  gallery?: string[] | string
}

interface PageProps {
  params: {
    slug: string
  }
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

function getTitle(item: PortfolioItem) {
  return item.title || item.name || 'Case Study'
}

function getImage(item: PortfolioItem) {
  return item.featured_image || item.image_url || ''
}

function getLiveUrl(item: PortfolioItem) {
  return item.live_url || item.url || item.project_url || ''
}

export default async function PortfolioCaseStudyPage({ params }: PageProps) {
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('slug', params.slug)
    .eq('is_active', true)
    .maybeSingle()

  if (!data) notFound()

  const item: PortfolioItem = data

  const title = getTitle(item)
  const heroImage = getImage(item)
  const results = normalizeArray(item.results)
  const process = normalizeArray(item.process)
  const technologies = normalizeArray(item.technologies)
  const gallery = normalizeArray(item.gallery)
  const liveUrl = getLiveUrl(item)

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="portfolio" size={14} color="#39D97A" />
                Case Study
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                <GradientHeading>{title}</GradientHeading>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                {item.description ||
                  'A focused digital project built to improve brand trust, user experience, and conversion performance.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {(item.category || item.tag) && (
                  <span className="rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                    {item.category || item.tag}
                  </span>
                )}

                {item.industry && (
                  <span className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60">
                    {item.industry}
                  </span>
                )}

                {item.client_name && (
                  <span className="rounded-full border border-[#1E314A] bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-white/60">
                    {item.client_name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {heroImage && (
          <section className="px-5 pb-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 shadow-[0_30px_100px_rgba(0,0,0,0.28)]">
              <div className="relative overflow-hidden rounded-[1.7rem] bg-[#07111F]">
                <img
                  src={heroImage}
                  alt={title}
                  className="aspect-[16/9] w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/45 via-transparent to-transparent" />
              </div>
            </div>
          </section>
        )}

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
            {[
              {
                label: 'Client',
                value: item.client_name || title,
                icon: 'about',
              },
              {
                label: 'Industry',
                value: item.industry || item.category || item.tag || 'Digital Brand',
                icon: 'portfolio',
              },
              {
                label: 'Focus',
                value: results[0] || 'Trust, UX & Growth',
                icon: 'growth',
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-5"
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                  <SvgIcon name={stat.icon} size={20} color="#39D97A" />
                </div>

                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  {stat.label}
                </p>

                <p className="mt-3 text-xl font-black text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-2">
            <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6 sm:p-8">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                The Challenge
              </p>

              <h2 className="text-3xl font-black leading-[1] tracking-[-0.045em] sm:text-4xl">
                What needed to be improved.
              </h2>

              <p className="mt-6 text-sm leading-8 text-white/62 sm:text-base">
                {item.challenge ||
                  'The brand needed a stronger digital experience that could communicate trust, improve clarity, and support better customer action across the website.'}
              </p>
            </div>

            <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6 sm:p-8">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                The Solution
              </p>

              <h2 className="text-3xl font-black leading-[1] tracking-[-0.045em] sm:text-4xl">
                How we structured the system.
              </h2>

              <p className="mt-6 text-sm leading-8 text-white/62 sm:text-base">
                {item.solution ||
                  'We focused on improving the interface structure, user journey, visual hierarchy, trust signals, and conversion flow to create a cleaner digital growth system.'}
              </p>
            </div>
          </div>
        </section>

        {process.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Process
                </p>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                  From audit to <GradientHeading>execution.</GradientHeading>
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {process.map((step, index) => (
                  <div
                    key={step}
                    className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-5"
                  >
                    <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10 text-sm font-black text-[#39D97A]">
                      {String(index + 1).padStart(2, '0')}
                    </div>

                    <p className="text-sm leading-7 text-white/62">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {results.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 sm:p-10 lg:p-14">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Results
                </p>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                  Improvements built for <GradientHeading>growth.</GradientHeading>
                </h2>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {results.map((result) => (
                  <div
                    key={result}
                    className="flex items-start gap-4 rounded-[1.5rem] border border-[#1E314A] bg-[#07111F]/80 p-5"
                  >
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                      <SvgIcon name="verified" size={14} color="#39D97A" />
                    </span>

                    <p className="text-sm leading-7 text-white/68">{result}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {gallery.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="mb-10 max-w-3xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Project Gallery
                </p>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                  Visual system and <GradientHeading>execution.</GradientHeading>
                </h2>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                {gallery.map((image) => (
                  <div
                    key={image}
                    className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3"
                  >
                    <img
                      src={image}
                      alt={`${title} gallery`}
                      className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {technologies.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6 sm:p-8">
                <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Technologies Used
                </p>

                <div className="flex flex-wrap gap-3">
                  {technologies.map((tech) => (
                    <span
                      key={tech}
                      className="rounded-full border border-[#39D97A]/16 bg-[#39D97A]/10 px-4 py-2 text-sm font-bold text-[#39D97A]"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {item.testimonial && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8 text-center sm:p-10 lg:p-14">
              <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Client Feedback
              </p>

              <blockquote className="text-xl font-medium leading-9 text-white/82 sm:text-2xl">
                “{item.testimonial}”
              </blockquote>
            </div>
          </section>
        )}

        <section className="px-5 pb-24 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-8 text-center sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Want a system like this?
            </p>

            <h2 className="mx-auto max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
              Let’s build a stronger digital growth system for your brand.
            </h2>

            <div className="mt-8 flex flex-wrap justify-center gap-4">
              <Link
                href="/contact"
                className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Start A Project
                <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
              </Link>

              {liveUrl && (
                <a
                  href={liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full border border-[#1E314A] bg-[#0E1B2D] px-8 py-3 text-sm font-black text-white transition hover:border-[#39D97A]/25 hover:bg-[#13233A]"
                >
                  Visit Live Project
                  <SvgIcon name="arrow-diagonal" size={16} color="#39D97A" />
                </a>
              )}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}