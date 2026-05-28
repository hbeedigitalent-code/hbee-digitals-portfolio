import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

import { supabase } from '@/lib/supabase'

interface PortfolioItem {
  id: string
  slug: string
  title?: string
  client_name?: string
  category?: string
  project_type?: string
  description?: string
  image_url?: string
  metric_label?: string
  metric_value?: string
  industry?: string
  technology?: string
  website_url?: string
  brief?: string
  results_summary?: string
  before_image?: string
  after_image?: string
  gallery_images?: string[]
  result_metrics?: {
    label: string
    value: string
  }[]
  is_before_after?: boolean
  featured?: boolean
  is_active?: boolean
}

async function getProject(slug: string) {
  const { data } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  return data as PortfolioItem | null
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const project = await getProject(params.slug)

  if (!project) {
    return {
      title: 'Case Study Not Found | Hbee Digitals',
    }
  }

  const title = project.client_name || project.title || 'Case Study'

  return {
    title: `${title} Case Study | Hbee Digitals`,
    description:
      project.description ||
      'Conversion-focused ecommerce and digital growth case study.',

    openGraph: {
      title: `${title} Case Study`,
      description:
        project.description ||
        'Conversion-focused ecommerce and digital growth case study.',
      images: project.image_url
        ? [
            {
              url: project.image_url,
            },
          ]
        : [],
    },
  }
}

export default async function PortfolioDetailPage({
  params,
}: {
  params: { slug: string }
}) {
  const project = await getProject(params.slug)

  if (!project) {
    notFound()
  }

  const title =
    project.client_name || project.title || 'Portfolio Project'

  const metrics = project.result_metrics || []

  const gallery =
    project.gallery_images?.length
      ? project.gallery_images
      : project.image_url
      ? [project.image_url]
      : []

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[140px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
        </div>

        <section className="relative px-5 pb-16 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#0E1B2D]/90 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="portfolio" size={14} color="#39D97A" />
                Case Study
              </div>

              <p className="mb-5 text-[11px] font-black uppercase tracking-[0.18em] text-white/45">
                {project.category || project.industry || 'Digital Growth'}
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
                {title}
              </h1>

              <div className="mt-5 flex flex-wrap gap-3">
                <span className="rounded-full bg-[#39D97A] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#06101F]">
                  {project.metric_value || 'Growth'}
                  {project.metric_label ? ` ${project.metric_label}` : ''}
                </span>

                {project.is_before_after && (
                  <span className="rounded-full border border-white/10 bg-[#0E1B2D] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white">
                    Before / After Transformation
                  </span>
                )}
              </div>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                {project.description ||
                  'Conversion-focused ecommerce growth system designed to improve user trust, brand positioning, and long-term scalability.'}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
                >
                  Get Free Audit
                  <SvgIcon name="arrow-diagonal" size={15} color="#06101F" />
                </Link>

                {project.website_url && (
                  <a
                    href={project.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-6 py-3 text-sm font-black text-[#39D97A]"
                  >
                    Visit Website
                    <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
                  </a>
                )}
              </div>
            </div>

            {project.image_url && (
              <div className="mt-14 overflow-hidden rounded-[2.2rem] border border-[#1E314A] bg-[#0E1B2D] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.3)]">
                <img
                  src={project.image_url}
                  alt={title}
                  className="w-full rounded-[1.7rem] object-cover"
                />
              </div>
            )}
          </div>
        </section>

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_360px]">
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                The Brief
              </p>

              <h2 className="text-4xl font-black tracking-[-0.04em]">
                Building a system designed for <GradientHeading>growth.</GradientHeading>
              </h2>

              <div className="mt-8 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
                <p className="text-base leading-8 text-white/65">
                  {project.brief ||
                    'The project focused on improving trust signals, simplifying the customer journey, enhancing the mobile experience, and positioning the brand more professionally online.'}
                </p>
              </div>
            </div>

            <aside className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
              <p className="mb-6 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Project Info
              </p>

              <div className="space-y-5">
                <InfoCard
                  label="Industry"
                  value={project.industry || 'E-Commerce'}
                />

                <InfoCard
                  label="Project"
                  value={project.project_type || 'Growth System'}
                />

                <InfoCard
                  label="Technology"
                  value={project.technology || 'Shopify'}
                />

                {project.website_url && (
                  <InfoCard
                    label="Website"
                    value={project.website_url}
                    link={project.website_url}
                  />
                )}
              </div>
            </aside>
          </div>
        </section>

        {metrics.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Results
              </p>

              <h2 className="text-4xl font-black tracking-[-0.04em]">
                Performance-focused improvements with measurable outcomes.
              </h2>

              <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                {metrics.map((metric, index) => (
                  <div
                    key={`${metric.label}-${index}`}
                    className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6"
                  >
                    <p className="text-4xl font-black tracking-[-0.05em] text-[#39D97A]">
                      {metric.value}
                    </p>

                    <p className="mt-3 text-sm font-bold uppercase tracking-[0.12em] text-white/58">
                      {metric.label}
                    </p>
                  </div>
                ))}
              </div>

              {project.results_summary && (
                <div className="mt-10 rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-6">
                  <p className="text-base leading-8 text-white/65">
                    {project.results_summary}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        {project.is_before_after &&
          project.before_image &&
          project.after_image && (
            <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
              <div className="mx-auto max-w-7xl">
                <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Before & After
                </p>

                <h2 className="text-4xl font-black tracking-[-0.04em]">
                  From outdated layouts to premium conversion-focused systems.
                </h2>

                <div className="mt-10 grid gap-6 lg:grid-cols-2">
                  <BeforeAfterCard
                    title="Before"
                    image={project.before_image}
                  />

                  <BeforeAfterCard
                    title="After"
                    image={project.after_image}
                    highlight
                  />
                </div>
              </div>
            </section>
          )}

        {gallery.length > 0 && (
          <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
            <div className="mx-auto max-w-7xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Showcase
              </p>

              <h2 className="text-4xl font-black tracking-[-0.04em]">
                Selected interface previews and live system visuals.
              </h2>

              <div className="mt-10 grid gap-5 md:grid-cols-2">
                {gallery.map((image, index) => (
                  <div
                    key={index}
                    className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3"
                  >
                    <img
                      src={image}
                      alt={`${title} showcase ${index + 1}`}
                      className="w-full rounded-[1.5rem]"
                    />
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        <section className="px-5 pb-24 pt-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[2.2rem] border border-[#39D97A]/20 bg-[#39D97A]/8 p-8 text-center shadow-[0_0_90px_rgba(57,217,122,0.08)]">
              <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                Ready For Your Transformation?
              </p>

              <h2 className="mx-auto mt-5 max-w-3xl text-4xl font-black leading-[0.96] tracking-[-0.05em] sm:text-5xl">
                Let’s create a digital experience designed to convert better and scale stronger.
              </h2>

              <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/contact"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F]"
                >
                  Get Free Audit
                </Link>

                <Link
                  href="/portfolio"
                  className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#07111F]/60 px-7 py-3 text-sm font-black text-[#39D97A]"
                >
                  View More Projects
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function InfoCard({
  label,
  value,
  link,
}: {
  label: string
  value: string
  link?: string
}) {
  return (
    <div className="rounded-2xl border border-[#1E314A] bg-[#07111F]/70 p-4">
      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/35">
        {label}
      </p>

      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 block break-all text-sm font-bold text-[#39D97A]"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-bold text-white/72">
          {value}
        </p>
      )}
    </div>
  )
}

function BeforeAfterCard({
  title,
  image,
  highlight = false,
}: {
  title: string
  image: string
  highlight?: boolean
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border p-3 ${
        highlight
          ? 'border-[#39D97A]/25 bg-[#39D97A]/8'
          : 'border-[#1E314A] bg-[#0E1B2D]'
      }`}
    >
      <div className="mb-4 flex items-center justify-between px-2 pt-2">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-white">
          {title}
        </p>

        {highlight && (
          <span className="rounded-full bg-[#39D97A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F]">
            Optimized
          </span>
        )}
      </div>

      <img
        src={image}
        alt={title}
        className="w-full rounded-[1.5rem]"
      />
    </div>
  )
}