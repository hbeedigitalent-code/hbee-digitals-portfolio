import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const metadata = {
  title: 'Before & After Web Designs | Hbee Digitals',
  description:
    'See website and ecommerce transformations by Hbee Digitals, from outdated layouts to premium conversion-focused digital systems.',
}

export const revalidate = 60

export default async function BeforeAfterPage() {
  const { data: projects } = await supabase
    .from('portfolio_items')
    .select('*')
    .eq('is_active', true)
    .eq('is_before_after', true)
    .order('display_order', { ascending: true })

  const items = projects || []

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] pt-28 text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl text-center">
            <p className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-5 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-[#39D97A]">
              <SvgIcon name="portfolio" size={14} color="#39D97A" />
              Before & After Web Designs
            </p>

            <h1 className="mx-auto max-w-5xl text-5xl font-black uppercase leading-[0.95] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
              Transforming visions into <GradientHeading>reality.</GradientHeading>
            </h1>

            <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/62">
              See how outdated stores and websites can be transformed into modern,
              premium, conversion-focused digital experiences.
            </p>

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                href="/contact"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Get Free Audit
              </Link>

              <Link
                href="/portfolio"
                className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-7 py-3 text-sm font-black text-[#39D97A]"
              >
                View Portfolio
                <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-24 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl space-y-10">
            {items.map((item: any, index: number) => {
              const title = item.client_name || item.title || 'Project Transformation'
              const metric =
                item.metric_value && item.metric_label
                  ? `${item.metric_value} ${item.metric_label}`
                  : item.metric_value || item.result || 'Growth'

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-[2.4rem] border border-[#1E314A] bg-[#0E1B2D] p-5 shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-6"
                >
                  <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                        Transformation {String(index + 1).padStart(2, '0')}
                      </p>

                      <h2 className="mt-3 text-4xl font-black tracking-[-0.05em] sm:text-5xl">
                        {title}
                      </h2>

                      <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58">
                        {item.project_type ||
                          item.description ||
                          'A visual transformation focused on trust, usability, mobile experience, and conversion clarity.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <span className="rounded-full bg-[#39D97A] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-[#06101F]">
                        {metric}
                      </span>

                      <span className="rounded-full border border-white/10 bg-[#07111F] px-4 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-white/70">
                        Before → After
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
                    <BeforeAfterImage
                      title="Before"
                      image={item.before_image}
                      fallbackIcon="portfolio"
                    />

                    <div className="hidden h-16 w-16 items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 lg:flex">
                      <SvgIcon name="arrow-right" size={26} color="#39D97A" />
                    </div>

                    <BeforeAfterImage
                      title="After"
                      image={item.after_image}
                      highlight
                      fallbackIcon="verified"
                    />
                  </div>

                  <div className="mt-8 flex flex-col justify-between gap-4 border-t border-[#1E314A] pt-6 sm:flex-row sm:items-center">
                    <p className="max-w-2xl text-sm leading-7 text-white/52">
                      {item.results_summary ||
                        'This transformation improved the visual structure, brand perception, trust flow, and user experience of the digital system.'}
                    </p>

                    <Link
                      href={item.slug ? `/portfolio/${item.slug}` : '/portfolio'}
                      className="inline-flex min-h-[50px] items-center justify-center gap-2 rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-6 py-3 text-sm font-black text-[#39D97A]"
                    >
                      View Case Study
                      <SvgIcon name="arrow-diagonal" size={15} color="#39D97A" />
                    </Link>
                  </div>
                </article>
              )
            })}

            {items.length === 0 && (
              <div className="rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] px-6 py-16 text-center">
                <SvgIcon name="portfolio" size={54} color="#39D97A" />

                <h2 className="mt-5 text-3xl font-black tracking-[-0.04em]">
                  No before and after projects yet.
                </h2>

                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/55">
                  Add projects from the admin portfolio page and enable the Before / After option.
                </p>
              </div>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}

function BeforeAfterImage({
  title,
  image,
  highlight = false,
  fallbackIcon,
}: {
  title: string
  image?: string
  highlight?: boolean
  fallbackIcon: string
}) {
  return (
    <div
      className={`overflow-hidden rounded-[2rem] border p-3 ${
        highlight
          ? 'border-[#39D97A]/25 bg-[#39D97A]/8'
          : 'border-[#1E314A] bg-[#07111F]'
      }`}
    >
      <div className="mb-4 flex items-center justify-between px-2 pt-2">
        <p className="text-sm font-black uppercase tracking-[0.16em] text-white">
          {title}
        </p>

        {highlight && (
          <span className="rounded-full bg-[#39D97A] px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-[#06101F]">
            Optimized
          </span>
        )}
      </div>

      {image ? (
        <img
          src={image}
          alt={`${title} website view`}
          className="aspect-[4/3] w-full rounded-[1.5rem] object-cover"
        />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center rounded-[1.5rem] bg-[#0E1B2D]">
          <SvgIcon name={fallbackIcon} size={56} color="#39D97A" />
        </div>
      )}
    </div>
  )
}