'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'

interface Project {
  id: string
  title: string
  description: string
  image_url: string
  status: string
  category: string
  project_url: string
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchProjects() {
      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('status', 'published')
        .order('display_order')

      setProjects(data || [])
      setLoading(false)
    }
    fetchProjects()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-screen pt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />
      <main className="pt-28 pb-20 min-h-screen bg-gray-50">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-14"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium mb-4">
              Our Portfolio
            </span>
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-4">Our Work</h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              Explore our portfolio of successful projects and digital solutions
            </p>
          </motion.div>

          {projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-500 text-lg">No projects yet. Check back soon!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {projects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                  <div className="relative h-52 overflow-hidden">
                    {project.image_url ? (
                      <Image
                        src={project.image_url}
                        alt={project.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                    {project.category && (
                      <span className="absolute top-3 left-3 px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700">
                        {project.category}
                      </span>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                      {project.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                    {project.project_url ? (
                      <Link
                        href={project.project_url}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium text-sm"
                      >
                        View Project
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </Link>
                    ) : (
                      <span className="text-gray-400 text-sm">Coming soon</span>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-16 py-12 rounded-2xl bg-gradient-to-r from-gray-900 to-gray-800"
          >
            <h2 className="text-2xl font-bold text-white mb-3">Have a Project in Mind?</h2>
            <p className="text-white/70 mb-6 max-w-md mx-auto">
              Let's discuss how we can help bring your ideas to life
            </p>
            <Link
              href="/contact"
              className="px-8 py-3 bg-white rounded-xl font-semibold text-gray-900 hover:shadow-lg transition"
            >
              Start a Project
            </Link>
          </motion.div>
        </div>
      </main>
      <Footer />
    </>
  )
}