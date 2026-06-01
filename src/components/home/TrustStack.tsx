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
    <section className="relative overflow-hidden bg-[var(--bg-section)] px-5 py-16 text-[var(--text-primary)] sm:px-6 md:px-10 lg:px-12 lg:py-24">
      <GridPattern />

      <div className="relative z-10 mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.88fr_1.12fr] lg:items-center">
        <div>
          <p className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em]">
            <SvgIcon name="verified" size={14} color="var(--accent)" />
            Trust Stack
          </p>

          <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
            Built around clarity, speed, and{' '}
            <GradientHeading>credible growth.</GradientHeading>
          </h2>

          <p className="mt-6 max-w-2xl text-sm leading-8 text-[var(--text-secondary)] sm:text-base">
            Hbee Digitals combines strategy, premium implementation, and
            practical support so every website feels polished and purposeful.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
          {trustItems.map((item) => (
            <article
              key={item.title}
              className="rounded-[2rem] border border-[var(--border)] bg-[var(--bg-page)] p-5 shadow-[var(--shadow-md)] transition hover:-translate-y-1 hover:shadow-[var(--shadow-lg)]"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition group-hover:scale-105">
                <SvgIcon name={item.icon} size={20} color="var(--accent)" />
              </div>

              <h3 className="text-lg font-black tracking-[-0.03em] text-[var(--text-primary)]">
                {item.title}
              </h3>

              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {item.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}