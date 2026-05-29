import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

const metrics = [
  { label: 'Conversion Lift', value: '+38%' },
  { label: 'Store Health', value: '94%' },
  { label: 'Speed Score', value: '91' },
  { label: 'Accessibility', value: 'AA' },
]

export default function HeroShowcasePanel() {
  return (
    <section className="relative bg-[#07111F] px-5 pb-16 text-white sm:px-6 md:px-10 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-[2.4rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#07111F] p-4 shadow-[0_35px_120px_rgba(0,0,0,0.35)]">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-[#1E314A] bg-[#07111F] p-6">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                    Store Health Overview
                  </p>
                  <h2 className="mt-3 text-3xl font-black tracking-[-0.05em]">
                    Built for better trust, speed, and conversion.
                  </h2>
                </div>

                <span className="flex h-3 w-3 rounded-full bg-[#39D97A] shadow-[0_0_25px_rgba(57,217,122,0.8)]" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {metrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-[#1E314A] bg-[#0E1B2D] p-5"
                  >
                    <p className="text-3xl font-black text-[#39D97A]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-xs font-bold uppercase tracking-[0.14em] text-white/45">
                      {item.label}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-6 space-y-3">
                {['Homepage trust flow', 'Product page clarity', 'Mobile conversion path'].map(
                  (item, index) => (
                    <div key={item} className="rounded-2xl border border-[#1E314A] bg-[#0E1B2D] p-4">
                      <div className="mb-2 flex justify-between text-xs font-bold text-white/55">
                        <span>{item}</span>
                        <span>{82 + index * 5}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#07111F]">
                        <div
                          className="h-full rounded-full bg-[#39D97A]"
                          style={{ width: `${82 + index * 5}%` }}
                        />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[2rem] border border-[#39D97A]/20 bg-[#39D97A]/8 p-6">
              <div className="absolute right-0 top-0 h-52 w-52 rounded-full bg-[#39D97A]/15 blur-[90px]" />

              <div className="relative">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  Growth System Preview
                </p>

                <h3 className="mt-4 max-w-xl text-4xl font-black leading-[0.96] tracking-[-0.055em]">
                  A digital presence that makes buyers feel confident.
                </h3>

                <p className="mt-5 max-w-xl text-sm leading-8 text-white/62">
                  We combine premium design, Shopify strategy, conversion structure,
                  and trust-building sections so your website does more than look good.
                </p>

                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {[
                    ['Audit Fixes', 'Trust gaps, speed, mobile UX'],
                    ['Growth Focus', 'Conversion flow and credibility'],
                    ['Brand Layer', 'Visual consistency and authority'],
                    ['Support', 'Guidance after launch'],
                  ].map(([title, text]) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-[#1E314A] bg-[#07111F]/80 p-5"
                    >
                      <SvgIcon name="verified" size={20} color="#39D97A" />
                      <h4 className="mt-4 text-sm font-black text-white">
                        {title}
                      </h4>
                      <p className="mt-2 text-xs leading-6 text-white/50">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F]"
                  >
                    Get Free Audit
                  </Link>

                  <Link
                    href="/portfolio"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#07111F]/60 px-6 py-3 text-sm font-black text-[#39D97A]"
                  >
                    View Case Studies
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}