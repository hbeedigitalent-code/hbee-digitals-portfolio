'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Filter,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import Reveal from '@/components/Reveal'
import { Project } from '@/types'

interface PortfolioSectionProps {
  data: Project[]
  title?: string
  subtitle?: string
}

type SafeProject = Project & {
  image_url?: string
  image?: string
  url?: string
  project_url?: string
  name?: string
  tag?: string
  result?: string
  status?: string
}

const getProjectImage = (project: SafeProject) => {
  return project.imageUrl || project.image_url || project.image || ''
}

const getProjectUrl = (project: SafeProject) => {
  return project.projectUrl || project.project_url || project.url || '/projects'
}

const getProjectTitle = (project: SafeProject) => {
  return project.title || project.name || 'Growth System Project'
}

const getProjectCategory = (project: SafeProject) => {
  return project.category || project.tag || 'Project'
}

const getProjectResult = (project: SafeProject) => {
  return project.result || project.status || 'Growth-focused build'
}

export default function PortfolioSection({
  data,
  title = 'Real Stores We’ve Grown',
  subtitle = 'A closer look at selected projects, growth systems, and digital experiences built to improve trust, conversion, and performance.',
}: PortfolioSectionProps) {
  const [filter, setFilter] = useState<string>('all')
  const reducedMotion = useReducedMotion()

  const projects = (data || []) as SafeProject[]

  const categories = useMemo(() => {
    const uniqueCategories = projects
      .map((project) => getProjectCategory(project))
      .filter(Boolean)

    return ['all', ...Array.from(new Set(uniqueCategories))]
  }, [projects])

  const filteredProjects = useMemo(() => {
    if (filter === 'all') return projects
    return projects.filter((project) => getProjectCategory(project) === filter)
  }, [filter, projects])

  if (!projects.length) return null

  return (
    <section
      id="portfolio"
      aria-labelledby="portfolio-heading"
      className="relative overflow-hidden bg-[#060E1C] py-24 text-white"
    >
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[420px] w-[760px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[460px] rounded-full bg-[#C6F135]/7 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#060E1C]/60 to-[#060E1C]" />
      </div>

      <div className="mx-auto max-w-7xl px-6 md:px-10">
        <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              viewport={{ once: true }}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#39D97A]"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Case Study Preview
            </motion.div>

            <Reveal variant="wipe">
              <h2
                id="portfolio-heading"
                className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl lg:text-6xl"
              >
                {title}
              </h2>
            </Reveal>

            <p className="mt-5 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
              {subtitle}
            </p>
          </div>

          <Link
            href="/projects"
            className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/80 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
          >
            View All Work
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </Link>
        </div>

        {categories.length > 2 && (
          <div className="mb-10 flex flex-wrap items-center gap-3">
            <div className="mr-1 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-white/38">
              <Filter className="h-4 w-4" />
              Filter
            </div>

            {categories.map((cat) => {
              const active = filter === cat

              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setFilter(cat)}
                  className={`rounded-full border px-4 py-2 text-xs font-bold capitalize transition ${
                    active
                      ? 'border-[#39D97A]/35 bg-[#39D97A]/12 text-[#39D97A] shadow-[0_0_26px_rgba(57,217,122,0.12)]'
                      : 'border-white/10 bg-white/[0.035] text-white/55 hover:border-white/20 hover:text-white'
                  }`}
                >
                  {cat === 'all' ? 'All Work' : cat}
                </button>
              )
            })}
          </div>
        )}

        <AnimatePresence mode="wait">
          <motion.div
            key={filter}
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
            className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredProjects.map((project, index) => {
              const image = getProjectImage(project)
              const projectUrl = getProjectUrl(project)
              const projectTitle = getProjectTitle(project)
              const category = getProjectCategory(project)
              const result = getProjectResult(project)

              return (
                <motion.article
                  key={project.id || `${projectTitle}-${index}`}
                  initial={reducedMotion ? false : { opacity: 0, y: 26 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55, delay: index * 0.07 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-white/[0.045] shadow-[0_28px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/25 hover:bg-white/[0.065]"
                >
                  <div className="relative h-56 overflow-hidden bg-[#0B1E38]">
                    {image ? (
                      <Image
                        src={image}
                        alt={projectTitle}
                        fill
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        className="object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847]">
                        <BarChart3 className="h-14 w-14 text-[#39D97A]/50" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-[#060E1C]/35 to-transparent" />

                    <div className="absolute left-4 top-4 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
                      {category}
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-xl">
                        <TrendingUp className="h-3.5 w-3.5 text-[#C6F135]" />
                        {result}
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-white/45">
                      <CheckCircle2 className="h-4 w-4 text-[#39D97A]" />
                      Digital growth system
                    </div>

                    <h3 className="text-xl font-black leading-tight tracking-[-0.035em] text-white">
                      {projectTitle}
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/55">
                      {project.description ||
                        'A refined digital experience focused on stronger trust, cleaner user journeys, better conversion structure, and scalable brand presentation.'}
                    </p>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                      {['Problem', 'System', 'Result'].map((item) => (
                        <div
                          key={item}
                          className="rounded-2xl border border-white/8 bg-white/[0.035] px-3 py-2 text-center text-[11px] font-bold text-white/50"
                        >
                          {item}
                        </div>
                      ))}
                    </div>

                    <Link
                      href={projectUrl}
                      target={projectUrl.startsWith('http') ? '_blank' : undefined}
                      rel={projectUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
                      className="mt-5 inline-flex items-center gap-2 text-sm font-bold text-[#39D97A] transition hover:text-[#C6F135]"
                    >
                      View Case Study
                      {projectUrl.startsWith('http') ? (
                        <ExternalLink className="h-4 w-4" />
                      ) : (
                        <ArrowRight className="h-4 w-4" />
                      )}
                    </Link>
                  </div>
                </motion.article>
              )
            })}
          </motion.div>
        </AnimatePresence>

        {filteredProjects.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-14 text-center">
            <p className="text-white/55">No projects found in this category yet.</p>
          </div>
        )}
      </div>
    </section>
  )
}