'use client'

import { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import SvgIcon from '@/components/ui/SvgIcon'

interface Tab {
  id: string
  label: string
  title: string
  description: string
  image?: string
  features?: string[]
}

interface TabSwitcherProps {
  tabs: Tab[]
  defaultTab?: string
}

const iconMap: Record<string, string> = {
  approach: 'strategy',
  process: 'systems',
  results: 'analytics',
  promise: 'security',
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75 sm:-bottom-3 sm:h-5"
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

export default function TabSwitcher({ tabs, defaultTab }: TabSwitcherProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const reducedMotion = useReducedMotion()

  const activeTabData = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const activeIcon = iconMap[activeTabData?.id || 'approach'] || 'growth'

  if (!tabs?.length) return null

  return (
    <div className="relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.035] p-4 shadow-[0_30px_100px_rgba(0,0,0,0.25)] backdrop-blur-2xl sm:rounded-[2rem] md:p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(198,241,53,0.08),transparent_40%)]" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

      <div className="relative grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.4rem] border border-white/10 bg-[#071427]/70 p-5 md:p-6">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#39D97A] sm:text-[11px]">
            <SvgIcon name="growth" size={14} color="#39D97A" />
            Hbee Growth System
          </div>

          <h3 className="max-w-xl text-3xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-4xl">
            We don’t just design. We build systems that help brands{' '}
            <CurvedUnderlineText>scale.</CurvedUnderlineText>
          </h3>

          <p className="mt-5 max-w-xl text-sm leading-7 text-white/58 md:text-base">
            Every project is treated as a growth system — strategy, experience, performance,
            trust, and conversion working together.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {[
              { label: 'Strategy-first execution', icon: 'strategy' },
              { label: 'Conversion-focused UX', icon: 'conversion' },
              { label: 'Premium brand experience', icon: 'branding' },
              { label: 'Long-term growth support', icon: 'growth' },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-3 text-xs font-semibold text-white/65"
              >
                <SvgIcon name={item.icon} size={16} color="#39D97A" />
                {item.label}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id
              const icon = iconMap[tab.id] || 'growth'

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`group inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition ${
                    active
                      ? 'border-[#39D97A]/30 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_26px_rgba(57,217,122,0.12)]'
                      : 'border-white/10 bg-white/[0.035] text-white/50 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <SvgIcon
                    name={icon}
                    size={14}
                    color={active ? '#39D97A' : 'rgba(248,250,252,0.55)'}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={reducedMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[1.4rem] border border-white/10 bg-[#0B1E38]/80 p-5 md:p-6"
          >
            <div className="absolute -right-16 -top-16 h-52 w-52 rounded-full bg-[#39D97A]/12 blur-[70px]" />
            <div className="absolute -bottom-16 left-0 h-44 w-44 rounded-full bg-[#C6F135]/8 blur-[70px]" />

            <div className="relative">
              <div className="mb-6 flex items-start justify-between gap-5">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10 shadow-[0_0_35px_rgba(57,217,122,0.12)]">
                  <SvgIcon name={activeIcon} size={28} color="#39D97A" />
                </div>

                <div className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                  {activeTabData?.label}
                </div>
              </div>

              <h4 className="text-2xl font-black tracking-[-0.04em] text-white md:text-3xl">
                {activeTabData?.title}
              </h4>

              <p className="mt-4 max-w-2xl text-sm leading-7 text-white/58 md:text-base">
                {activeTabData?.description}
              </p>

              {activeTabData?.features && (
                <div className="mt-7 grid gap-3 sm:grid-cols-2">
                  {activeTabData.features.map((feature, index) => (
                    <motion.div
                      key={feature}
                      initial={reducedMotion ? false : { opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28, delay: index * 0.05 }}
                      className="group rounded-2xl border border-white/8 bg-white/[0.04] p-4 transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8"
                    >
                      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                        <SvgIcon name="precision" size={16} color="#39D97A" />
                      </div>
                      <p className="text-sm font-bold text-white/76">{feature}</p>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="mt-7 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                      Growth Layer
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      Built to support trust, conversion, performance, and scale.
                    </p>
                  </div>

                  <div className="hidden h-11 w-11 items-center justify-center rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] sm:flex">
                    <SvgIcon name="arrow-diagonal" size={18} color="#06101F" />
                  </div>
                </div>
              </div>

              <div className="mt-5 flex items-center gap-3 text-xs font-semibold text-white/38">
                <SvgIcon name="rocket" size={16} color="#C6F135" />
                Premium execution for brands ready to grow smarter.
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}