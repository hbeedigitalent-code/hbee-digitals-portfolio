import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

const metrics = [
  { value: '87+', label: 'Projects Delivered', icon: 'portfolio' },
  { value: '35+', label: 'Stores Improved', icon: 'ecommerce' },
  { value: '98%', label: 'Client Satisfaction Focus', icon: 'verified' },
  { value: '24hr', label: 'Average Response Time', icon: 'support' },
]

const trustCards = [
  {
    title: 'Strategy First',
    description:
      'Every project starts with clarity around trust, conversion flow, customer journey, and growth opportunities.',
    icon: 'strategy',
  },
  {
    title: 'Conversion Focused',
    description:
      'We design pages and systems to help visitors understand, trust, and take action faster.',
    icon: 'analytics',
  },
  {
    title: 'Premium Execution',
    description:
      'Clean UI, strong mobile responsiveness, clear hierarchy, and polished digital presentation.',
    icon: 'verified',
  },
  {
    title: 'Long-Term Support',
    description:
      'We stay involved with guidance, updates, optimization, and improvement support after launch.',
    icon: 'support',
  },
]

export default function TrustStack() {
  return (
    <section className="relative overflow-hidden bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[360px] w-[520px] rounded-full bg-[#39D97A]/6 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[320px] w-[460px] rounded-full bg-[#39D97A]/5 blur-[120px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-12 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              <SvgIcon name="verified" size={14} color="#39D97A" />
              Trust Stack
            </p>

            <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
              Built to create confidence before clients even{' '}
              <GradientHeading>contact you.</GradientHeading>
            </h2>
          </div>

          <p className="max-w-2xl text-sm leading-8 text-white/60 sm:text-base lg:justify-self-end">
            Your website should not only look good. It should answer silent buyer
            doubts, show credibility, explain value clearly, and make the next step
            feel easy.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((item) => (
            <div
              key={item.label}
              className="rounded-[1.6rem] border border-[#1E314A] bg-[#0E1B2D] p-5 text-center transition hover:-translate-y-1 hover:border-[#39D97A]/28 hover:bg-[#13233A]"
            >
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <SvgIcon name={item.icon} size={24} color="#39D97A" />
              </div>

              <p className="text-4xl font-black tracking-[-0.05em] text-[#39D97A]">
                {item.value}
              </p>

              <p className="mt-2 text-sm font-semibold text-white/60">
                {item.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[2rem] border border-[#39D97A]/20 bg-[#39D97A]/7 p-6 shadow-[0_0_90px_rgba(57,217,122,0.08)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Buyer Confidence
            </p>

            <h3 className="mt-4 text-3xl font-black tracking-[-0.04em]">
              More than design. A complete digital credibility system.
            </h3>

            <p className="mt-5 text-sm leading-8 text-white/62">
              We help brands strengthen trust through better structure, clearer messaging,
              premium layouts, professional proof sections, optimized contact flows, and
              conversion-focused user journeys.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/reviews"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                View Reviews
              </Link>

              <Link
                href="/contact"
                className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#07111F]/60 px-6 py-3 text-sm font-black text-[#39D97A] transition hover:bg-[#39D97A]/10"
              >
                Start Growth Review
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {trustCards.map((card) => (
              <article
                key={card.title}
                className="rounded-[1.6rem] border border-[#1E314A] bg-[#0E1B2D] p-5 transition hover:-translate-y-1 hover:border-[#39D97A]/28 hover:bg-[#13233A]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                  <SvgIcon name={card.icon} size={22} color="#39D97A" />
                </div>

                <h3 className="text-lg font-black tracking-[-0.03em] text-white">
                  {card.title}
                </h3>

                <p className="mt-3 text-sm leading-7 text-white/56">
                  {card.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}