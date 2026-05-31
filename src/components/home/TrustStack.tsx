import GradientHeading from '@/components/ui/GradientHeading'
import GridPattern from '@/components/ui/GridPattern'
import SvgIcon from '@/components/ui/SvgIcon'

const trustItems = [
  {
    icon: 'strategy',
    title: 'Clear Strategy',
    description:
      'Every build starts with positioning, conversion flow, and trust signals.',
  },
  {
    icon: 'performance',
    title: 'Performance Minded',
    description:
      'Interfaces are structured to feel fast, focused, and easy to scan.',
  },
  {
    icon: 'security',
    title: 'Reliable Systems',
    description:
      'Clean implementation patterns help keep your site stable as it grows.',
  },
]

export default function TrustStack() {
  return (
    <section className="relative overflow-hidden bg-[#0E1B2D] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <GridPattern />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div>
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
            <SvgIcon name="verified" size={14} color="#39D97A" />
            Trust Stack
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Built around clarity, speed, and{' '}
            <GradientHeading>credible growth.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-white/62 sm:text-base">
            Hbee Digitals combines strategy, premium implementation, and
            practical support so every website feels polished and purposeful.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {trustItems.map((item) => (
            <article
              key={item.title}
              className="rounded-[2rem] border border-[#1E314A] bg-[#07111F] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.18)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                <SvgIcon name={item.icon} size={20} color="#39D97A" />
              </div>

              <h3 className="text-lg font-black tracking-[-0.03em] text-white">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-white/60">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
