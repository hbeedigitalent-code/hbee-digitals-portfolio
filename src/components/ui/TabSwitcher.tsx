'use client'

import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

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
  const cleaned = (icon || 'services')
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  if (cleaned.includes('ecommerce') || cleaned.includes('e-commerce')) return 'ecommerce'
  if (cleaned.includes('commerce')) return 'ecommerce'
  if (cleaned.includes('shopify')) return 'ecommerce'
  if (cleaned.includes('store')) return 'ecommerce'
  if (cleaned.includes('ui') || cleaned.includes('ux')) return 'ui-ux'
  if (cleaned.includes('marketing')) return 'digital-marketing'
  if (cleaned.includes('brand')) return 'branding'
  if (cleaned.includes('strategy')) return 'strategy'
  if (cleaned.includes('consult')) return 'consulting'
  if (cleaned.includes('web') || cleaned.includes('site')) return 'web-development'

  return cleaned || 'services'
}

// Animation variants for tab content
const contentVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.4, 
      ease: [0.22, 1, 0.36, 1] 
    }
  },
  exit: { 
    opacity: 0, 
    y: -15,
    transition: { 
      duration: 0.25, 
      ease: [0.22, 1, 0.36, 1] 
    }
  },
}

const pointsContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.15,
    },
  },
}

const pointVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { 
    opacity: 1, 
    x: 0,
    transition: { 
      duration: 0.35, 
      ease: [0.22, 1, 0.36, 1] 
    }
  },
}

export default function TabSwitcher({ items = fallbackItems }: TabSwitcherProps) {
  const reducedMotion = useReducedMotion()
  const [activeIndex, setActiveIndex] = useState(0)

  const safeItems = items.length ? items : fallbackItems
  const activeItem = safeItems[activeIndex] || fallbackItems[0]

  const points = useMemo(() => {
    return normalizeArray(activeItem?.points)
  }, [activeItem])

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--bg-section)] p-5 text-[var(--text-primary)] shadow-[var(--shadow-md)] sm:p-7 lg:p-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,var(--accent)/0.12,transparent_42%)]" />

      <div className="relative">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="eyebrow mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] sm:text-[11px]">
              <SvgIcon name="growth" size={13} color="var(--accent)" />
              Why Hbee Digitals
            </div>

            <h2 className="text-3xl font-black leading-[0.98] tracking-[-0.055em] text-[var(--text-primary)] sm:text-4xl md:text-5xl">
              Designed for performance and <GradientHeading>growth.</GradientHeading>
            </h2>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
              Our systems are built to improve user trust, conversion clarity,
              brand perception, and long-term scalability.
            </p>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden gap-2 lg:flex">
            {safeItems.map((item, index) => {
              const active = index === activeIndex

              return (
                <motion.button
                  key={item.id || item.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className={`rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                    active
                      ? 'border-[var(--accent)]/24 bg-[var(--accent)]/10 text-[var(--accent)] shadow-[var(--shadow-sm)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)] hover:border-[var(--accent)]/30 hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                  }`}
                >
                  {item.title}
                </motion.button>
              )
            })}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.42fr_0.58fr] lg:items-start">
          {/* Mobile Tabs - Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 lg:hidden">
            {safeItems.map((item, index) => {
              const active = index === activeIndex

              return (
                <motion.button
                  key={item.id || item.title || index}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  whileTap={{ scale: 0.97 }}
                  className={`flex-shrink-0 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] transition-all duration-200 ${
                    active
                      ? 'border-[var(--accent)]/24 bg-[var(--accent)]/10 text-[var(--accent)]'
                      : 'border-[var(--border)] bg-[var(--bg-card)] text-[var(--text-muted)]'
                  }`}
                >
                  {item.title}
                </motion.button>
              )
            })}
          </div>

          {/* Active Tab Content with refined animation */}
          <div className="rounded-[1.7rem] border border-[var(--border)] bg-[var(--bg-card)] p-5 sm:p-6 transition-all duration-300 hover:shadow-[var(--shadow-md)]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeItem.title}
                variants={contentVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
              >
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--accent)]/18 bg-[var(--accent)]/10 transition-all duration-300 group-hover:scale-105">
                  <SvgIcon
                    name={cleanIcon(activeItem.icon)}
                    size={24}
                    color="var(--accent)"
                  />
                </div>

                <h3 className="text-3xl font-black tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
                  {activeItem.title}
                </h3>

                <p className="mt-5 max-w-xl text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                  {activeItem.description}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Points List - Blue checkmarks instead of green */}
          <motion.div
            variants={pointsContainerVariants}
            initial="hidden"
            animate="visible"
            className="grid gap-4"
          >
            {(points.length
              ? points
              : ['Premium systems', 'Performance optimization', 'Long-term scalability']
            ).map((point, idx) => (
              <motion.div
                key={point}
                variants={pointVariants}
                custom={idx}
                className="flex items-start gap-4 rounded-[1.4rem] border border-[var(--border)] bg-[var(--bg-card)] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[var(--blue-500)]/30 hover:shadow-[var(--shadow-md)] sm:p-5"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[var(--blue-500)]/16 bg-[var(--blue-500)]/10 transition-all duration-300">
                  <SvgIcon name="verified" size={14} color="var(--blue-500)" />
                </div>

                <div>
                  <h4 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--blue-500)]">
                    Premium Advantage
                  </h4>

                  <p className="mt-2 text-sm leading-7 text-[var(--text-secondary)] sm:text-base">
                    {point}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  )
}