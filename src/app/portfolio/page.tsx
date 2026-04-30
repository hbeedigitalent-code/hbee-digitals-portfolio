'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { categories, type Category } from '@/lib/projects'

interface PortfolioItem {
  id: string
  name: string
  category: string
  result: string
  image_url: string
  tag: string
  featured: boolean
  url: string
  description: string
}

export default function PortfolioPage() {
  const [items, setItems] = useState<PortfolioItem[]>([])
  const [activeCategory, setActiveCategory] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchItems()
  }, [])

  const fetchItems = async () => {
    const { data } = await supabase
      .from('portfolio_items')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
    
    setItems(data || [])
    setLoading(false)
  }

  const filteredItems = activeCategory === 'all'
    ? items
    : items.filter(item => item.category === activeCategory)

  const allCategories = categories.filter(c => c.id !== 'all')

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#007BFF]"></div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-16 md:py-20">
          {/* Hero Section */}
          <div className="text-center mb-12 md:mb-16">
            <div className="text-xs tracking-widest uppercase text-[#007BFF] font-semibold mb-3">
              Our Work
            </div>
            <h1 className="font-extrabold text-4xl md:text-5xl lg:text-6xl mb-4 text-gray-900">
              Real Stores. Real Results.
            </h1>
            <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
            <p className="text-gray-600 max-w-xl mx-auto text-sm md:text-base">
              Browse our portfolio of Shopify and e-commerce stores we've grown, redesigned, and managed.
            </p>
          </div>

          {/* Category Row */}
          <div className="max-w-5xl mx-auto mb-12">
            <div className="flex flex-wrap justify-center gap-3">
              {allCategories.map((category, idx) => {
                const isMiddle = idx === 5
                return (
                  <CategoryTile
                    key={category.id}
                    category={category}
                    isActive={activeCategory === category.id}
                    isMiddle={isMiddle}
                    onClick={() => setActiveCategory(category.id)}
                  />
                )
              })}
            </div>
          </div>

          {/* Result Count */}
          <div className="text-center mb-6">
            <p className="text-xs text-gray-500">
              Showing <span className="text-[#007BFF] font-semibold">{filteredItems.length}</span> projects
            </p>
          </div>

          {/* Projects Grid - Better Image Display */}
          <div className="max-w-6xl mx-auto">
            {filteredItems.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredItems.map((item, index) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ y: -6 }}
                    className="group bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-100"
                  >
                    <Link href={item.url || '#'} className="block">
                      {/* Improved Image Container */}
                      <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <span className="text-xs text-gray-400">No image</span>
                          </div>
                        )}
                        {/* Gradient Overlay on Hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#007BFF]/80 via-[#007BFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                          <span className="text-white font-medium text-sm flex items-center gap-2">
                            {item.url ? 'View Project →' : 'Learn More →'}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium bg-[#007BFF]/10 text-[#007BFF] px-3 py-1 rounded-full">
                            {item.tag || 'Project'}
                          </span>
                          {item.result && (
                            <span className="text-xs text-[#007BFF] font-semibold">
                              {item.result}
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-gray-800 text-base mb-1">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p className="text-gray-500 text-xs line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-2xl">
                <div className="text-6xl mb-4">✨</div>
                <h3 className="text-lg font-semibold text-gray-500">No projects yet</h3>
                <p className="text-sm text-gray-400 mt-2">
                  Check back soon for new portfolio items.
                </p>
              </div>
            )}
          </div>

          {/* CTA Banner */}
          <div className="max-w-4xl mx-auto mt-16">
            <div className="bg-gradient-to-r from-[#007BFF]/10 to-[#00BFFF]/5 rounded-2xl border border-[#007BFF]/20 p-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Want results like these?</h2>
              <p className="text-gray-600 text-sm mb-6 max-w-md mx-auto">
                Every store in this portfolio started with a conversation. Let's talk about your project.
              </p>
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full text-white font-semibold text-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                Start Your Project
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  )
}

function CategoryTile({ category, isActive, isMiddle, onClick }: { category: Category; isActive: boolean; isMiddle: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`flex flex-col items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl transition-all duration-300 cursor-pointer group
        ${isActive
          ? 'bg-gradient-to-br from-[#007BFF] to-[#0056b3] border border-[#00BFFF]/50 shadow-lg shadow-blue-500/20'
          : 'bg-white border border-gray-200 hover:border-[#007BFF]/50 hover:bg-[#007BFF]/5'
        }
        ${isMiddle ? 'scale-110 shadow-md' : ''}
      `}
    >
      <div className="w-7 h-7">
        <img
          src={category.icon}
          alt={category.label}
          className={`w-full h-full object-contain transition-all ${isActive ? 'brightness-0 invert' : 'opacity-70 group-hover:opacity-100'}`}
        />
      </div>
      <span className={`text-[10px] font-medium text-center whitespace-nowrap ${isActive ? 'text-white' : 'text-gray-600'}`}>
        {category.label}
      </span>
    </motion.button>
  )
}