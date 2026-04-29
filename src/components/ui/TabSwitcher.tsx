'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

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
  const activeTabData = tabs.find(tab => tab.id === activeTab)

  // Reset image error when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setImageError(false)
  }

  return (
    <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
      {/* Tab Buttons */}
      <div>
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-5 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                activeTab === tab.id
                  ? 'text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={{ backgroundColor: activeTab === tab.id ? 'var(--primary-color)' : undefined }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: 'var(--primary-color)' }}>
              {activeTabData?.title}
            </h3>
            <p className="text-gray-600 mb-6 leading-relaxed">
              {activeTabData?.description}
            </p>
            {activeTabData?.features && (
              <ul className="space-y-3">
                {activeTabData.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3 text-gray-600">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--primary-color)' }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Tab Image - with error handling */}
      {activeTabData?.image && !imageError && (
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl overflow-hidden shadow-lg bg-gray-100 min-h-[300px] flex items-center justify-center"
        >
          <Image
            src={activeTabData.image}
            alt={activeTabData.title}
            width={500}
            height={400}
            className="w-full h-auto object-cover"
            onError={() => setImageError(true)}
          />
        </motion.div>
      )}

      {/* Fallback when image is missing or errors */}
      {activeTabData?.image && imageError && (
        <motion.div
          key={`${activeTab}-fallback`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br from-gray-100 to-gray-200 min-h-[300px] flex flex-col items-center justify-center p-8 text-center"
        >
          <div className="w-16 h-16 rounded-full bg-white/80 flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-1">{activeTabData?.title}</h3>
          <p className="text-sm text-gray-500">Visual representation coming soon</p>
        </motion.div>
      )}
    </div>
  )
}