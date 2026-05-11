'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Lightbulb } from 'lucide-react'

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

export default function TabSwitcher({ tabs, defaultTab }: TabSwitcherProps) {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id)
  const [imageError, setImageError] = useState(false)

  const activeTabData = tabs.find((tab) => tab.id === activeTab)

  return (
    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      {/* LEFT: text + features */}
      <div>
        {/* Tab buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setImageError(false)
              }}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#007BFF] to-[#00BFFF] text-white shadow-lg shadow-blue-500/30'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content animation */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4 text-white">
              {activeTabData?.title}
            </h3>
            <p className="text-white/70 mb-6 leading-relaxed">
              {activeTabData?.description}
            </p>
            {activeTabData?.features && (
              <ul className="space-y-3">
                {activeTabData.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-white/70">
                    <svg
                      className="w-5 h-5 flex-shrink-0 text-[#00BFFF]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* RIGHT: image or guaranteed placeholder */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="min-h-[300px]"
        >
          {activeTabData?.image && !imageError ? (
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 h-full">
              <Image
                src={activeTabData.image}
                alt={activeTabData.title}
                width={600}
                height={400}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          ) : (
            /* always visible placeholder */
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10 bg-gradient-to-br from-[#0F2A50] to-[#1E3A60] p-10 flex flex-col items-center justify-center text-center h-full backdrop-blur-sm">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#007BFF] to-[#00BFFF] flex items-center justify-center mb-6 shadow-lg shadow-blue-500/30">
                <Lightbulb className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">
                {activeTabData?.title || 'Feature Highlight'}
              </h3>
              <p className="text-white/50 text-sm max-w-xs">
                {activeTabData?.description
                  ? activeTabData.description.slice(0, 80) + '...'
                  : 'Visual representation coming soon'}
              </p>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}