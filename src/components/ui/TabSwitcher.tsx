'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface TabItem {
  id?: string
  title: string
  description: string
  icon?: string
  points?: string[] | string
}

interface TabSwitcherProps {
  items?: TabItem[]
}

const fallbackItems: TabItem[] = [
  {
    title: 'Strategy First',
    icon: 'strategy',
    description:
      'Every system starts with structure, positioning, and conversion thinking before visuals.',
    points: ['Growth-focused planning', 'Clear digital positioning', 'Conversion structure'],
  },
  {
    title: 'Premium Execution',
    icon: 'web-development',
    description:
      'We build modern interfaces and systems that feel clean, scalable, and trustworthy.',
    points: ['Responsive systems', 'Performance optimization', 'Premium UI experience'],
  },
  {
    title: 'Optimization',
    icon: 'growth',
    description:
      'The focus is not just launching but improving performance and usability continuously.',
    points: ['User experience improvements', 'Trust optimization', 'Conversion refinement'],
  },
  {
    title: 'Long-Term Support',
    icon: 'support',
    description:
      'We help brands evolve their digital systems beyond the initial launch phase.',
    points: ['Technical guidance', 'Scaling support', 'System maintenance'],
  },
]

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

function cleanIcon(icon?: string) {
  if (!icon) return 'services'

  const cleaned = icon
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (cleaned.includes('commerce') || cleaned.includes('store')) return 'ecommerce'
  if (cleaned.includes('consult')) return 'consulting'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'

  return cleaned || 'services'
}

function HighlightText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] via-[#6EEB73] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}

export default function TabSwitcher({ items = fallbackItems }: TabSwitcherProps) {
  const reducedMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  const activeItem = items[activeIndex] || fallbackItems[0]

  const points = useMemo(() => {
    return normalizeArray(activeItem?.points)
  }, [activeItem])

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#07111F] p-5 text-white shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-7 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_42%)]" />

      <div className="relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#39D97A] sm:text-[11px]">
              <SvgIcon name="growth" size={13} color="#39D97A" />
              Why Hbee Digitals
            </div>

            <h2 className="text-3xl font-black leading-[0.98] tracking-[-0.055em] sm:text-4xl md:text-5xl">
              Designed for performance and <HighlightText>growth.</HighlightText>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-white/58 sm:text-base">
              Our systems are built to improve user trust, conversion clarity,
              brand perception, and long-term scalability.
            </p>
          </div>

          <div className="hidden gap-2 lg:flex">
            {items.map((item, index) => {
              const active = index === activeIndex

              return (
                <button
                  key={item.id || item.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    active
                      ? 'border-[#39D97A]/24 bg-[#39D97A]/10 text-[#39D97A]'
                      : 'border-[#1E314A] bg-[#07111F] text-white/45 hover:bg-[#13233A]'
                  }`}
                >
                  {item.title}
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {items.map((item, index) => {
              const active = index === activeIndex

              return (
                <button
                  key={item.id || item.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                    active
                      ? 'border-[#39D97A]/24 bg-[#39D97A]/10 text-[#39D97A]'
                      : 'border-[#1E314A] bg-[#07111F] text-white/45'
                  }`}
                >
                  {item.title}
                </button>
              )
            })}
          </div>

          <div className="rounded-[1.7rem] border border-[#1E314A] bg-[#0B1728]/90 p-5 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.title}
                initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
                transition={{ duration: 0.28 }}
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                  <SvgIcon
                    name={cleanIcon(activeItem.icon)}
                    size={24}
                    color="#39D97A"
                  />
                </div>

                <h3 className="text-3xl font-black tracking-[-0.05em] text-white sm:text-4xl">
                  {activeItem.title}
                </h3>

                <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 sm:text-base">
                  {activeItem.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="grid gap-4">
            {(points.length
              ? points
              : ['Premium systems', 'Performance optimization', 'Long-term scalability']
            ).map((point) => (
              <div
                key={point}
                className="flex items-start gap-4 rounded-[1.4rem] border border-[#1E314A] bg-[#0B1728]/90 p-4 sm:p-5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                  <SvgIcon name="check" size={14} color="#39D97A" />
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.12em] text-[#39D97A]">
                    Premium Advantage
                  </h4>

                  <p className="mt-2 text-sm leading-7 text-white/58 sm:text-base">
                    {point}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}