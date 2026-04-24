'use client'

import { useState } from 'react'
import { Project } from '@/types'
import Image from 'next/image'
import Link from 'next/link'

interface PortfolioSectionProps {
  data: Project[]
  title?: string
  subtitle?: string
}

export default function PortfolioSection({ data, title = "Our Portfolio", subtitle = "Recent projects" }: PortfolioSectionProps) {
  const [filter, setFilter] = useState<string>('all')
  
  const categories = ['all', ...new Set(data.map(p => p.category))]
  
  const filteredProjects = filter === 'all' 
    ? data 
    : data.filter(p => p.category === filter)

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{title}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap justify-center gap-3 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilter(cat)}
              className={`px-4 py-2 rounded-full capitalize transition ${
                filter === cat
                  ? 'bg-[#0A1D37] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <div
              key={project.id}
              className="group relative overflow-hidden rounded-lg shadow-sm hover:shadow-md transition"
            >
              {project.imageUrl && (
                <div className="relative h-64">
                  <Image
                    src={project.imageUrl}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-105 transition duration-300"
                  />
                </div>
              )}
              <div className="p-4 bg-white">
                <span className="text-sm text-[#0A1D37] font-medium">{project.category}</span>
                <h3 className="text-lg font-semibold text-gray-900 mt-1">{project.title}</h3>
                <p className="text-gray-600 text-sm mt-1 line-clamp-2">{project.description}</p>
                {project.projectUrl && (
                  <Link
                    href={project.projectUrl}
                    target="_blank"
                    className="inline-block mt-3 text-sm text-[#0A1D37] font-medium hover:underline"
                  >
                    View Project →
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}