'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

interface AboutData {
  title: string
  subtitle: string
  description: string
  image_url: string
  stats: Array<{ number: string; label: string }>
  values: Array<{ title: string; description: string; icon: string }>
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

function getIconName(icon?: string, fallback = 'growth') {
  if (!icon) return fallback
  return icon.replace('/svgs/', '').replace('.svg', '').replace('/', '')
}

export default function AboutPage() {
  const [about, setAbout] = useState<AboutData | null>(null)
  const [loading, setLoading] = useState(true)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    async function fetchAbout() {
      const { data } = await supabase.from('about_section').select('*').single()
      setAbout(data)
      setLoading(false)
    }

    fetchAbout()
  }, [])

  useEffect(() => {
    document.title = about?.title ? `${about.title} | Hbee Digitals` : 'About Us | Hbee Digitals'
  }, [about])

  const stats = about?.stats || [
    { number: '87+', label: 'Projects Completed' },
    { number: '45+', label: 'Happy Clients' },
    { number: '5+', label: 'Years Experience' },
    { number: '98%', label: 'Success Rate' },
  ]

  const values = about?.values || [
    {
      title: 'Innovation',
      description:
        'We use modern tools, strategy, and creative systems to help brands stay ahead.',
      icon: '/svgs/innovation.svg',
    },
    {
      title: 'Precision',
      description:
        'Every detail matters, from structure and design to performance and conversion flow.',
      icon: '/svgs/precision.svg',
    },
    {
      title: 'Performance',
      description:
        'We build digital experiences that are fast, scalable, responsive, and growth-focused.',
      icon: '/svgs/performance.svg',
    },
    {
      title: 'Partnership',
      description:
        'We work as a strategic partner, not just a service provider.',
      icon: '/svgs/partnership.svg',
    },
  ]

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
            <p className="text-sm font-bold text-white/45">Loading about page...</p>
          </div>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main
        id="main-content"
        className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C] text-white"
      >
        <div className="absolute inset-0 -z-0">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/10 blur-[130px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/7 blur-[120px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.026)_1px,transparent_1px)] bg-[size:72px_72px] opacity-20" />
        </div>

        <section className="relative z-10 px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
              <div>
                <motion.div
                  initial={reducedMotion ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.55 }}
                  className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]"
                >
                  <SvgIcon name="about" size={14} color="#39D97A" />
                  About Hbee Digitals
                </motion.div>

                <motion.h1
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.08 }}
                  className="max-w-5xl text-5xl font-black leading-[0.94] tracking-[-0.065em] sm:text-6xl lg:text-7xl"
                >
                  Building digital systems for brands ready to{' '}
                  <CurvedUnderlineText>grow.</CurvedUnderlineText>
                </motion.h1>

                <motion.p
                  initial={reducedMotion ? false : { opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.16 }}
                  className="mt-6 max-w-2xl text-base leading-8 text-white/62 md:text-lg"
                >
                  {about?.subtitle ||
                    'Hbee Digitals is a digital growth studio helping businesses build stronger websites, better store experiences, and scalable systems that support trust, conversion, and long-term growth.'}
                </motion.p>
              </div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.2 }}
                className="grid gap-3 sm:grid-cols-2"
              >
                {[
                  { label: 'Strategy-first', icon: 'strategy' },
                  { label: 'Premium execution', icon: 'precision' },
                  { label: 'Conversion-focused', icon: 'conversion' },
                  { label: 'Long-term support', icon: 'growth' },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur-xl"
                  >
                    <SvgIcon name={item.icon} size={20} color="#39D97A" className="mb-3" />
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/55">
                      {item.label}
                    </p>
                  </div>
                ))}
              </motion.div>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-4">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  viewport={{ once: true }}
                  className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_24px_70px_rgba(0,0,0,0.2)] backdrop-blur-xl"
                >
                  <div className="text-4xl font-black tracking-[-0.05em] text-white md:text-5xl">
                    {stat.number}
                  </div>
                  <p className="mt-2 text-xs font-bold uppercase tracking-[0.16em] text-white/45">
                    {stat.label}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative z-10 px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/85 p-6 shadow-[0_35px_110px_rgba(0,0,0,0.32)] backdrop-blur-2xl sm:p-8"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_42%)]" />

              <div className="relative">
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                  <SvgIcon name="systems" size={14} color="#39D97A" />
                  Our Story
                </div>

                <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl">
                  More than websites. We build business-facing digital{' '}
                  <CurvedUnderlineText>systems.</CurvedUnderlineText>
                </h2>

                <p className="mt-6 text-sm leading-8 text-white/62 sm:text-base">
                  {about?.description ||
                    'Hbee Digitals exists to help ambitious businesses move beyond basic online presence. We focus on the systems behind growth: brand credibility, website structure, customer journey, conversion psychology, performance, accessibility, and long-term scalability.'}
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/portfolio"
                    className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
                  >
                    View Our Work
                    <SvgIcon
                      name="arrow-diagonal"
                      size={16}
                      color="#06101F"
                      className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    />
                  </Link>

                  <Link
                    href="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/12 bg-white/[0.035] px-7 py-3 text-sm font-bold text-white/82 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
                  >
                    Start A Project
                  </Link>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={reducedMotion ? false : { opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55 }}
              viewport={{ once: true }}
              className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#08182D] shadow-[0_35px_110px_rgba(0,0,0,0.32)]"
            >
              <div className="aspect-[4/3] w-full">
                {about?.image_url ? (
                  <img
                    src={about.image_url}
                    alt="Hbee Digitals team and digital growth work"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847]">
                    <SvgIcon name="growth" size={86} color="#39D97A" />
                  </div>
                )}
              </div>

              <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-transparent to-transparent" />
            </motion.div>
          </div>
        </section>

        <section className="relative z-10 px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-12 text-center">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="precision" size={14} color="#39D97A" />
                Core Values
              </div>

              <h2 className="text-4xl font-black leading-[0.95] tracking-[-0.06em] text-white sm:text-5xl md:text-6xl">
                The principles behind
                <br />
                <CurvedUnderlineText>our work.</CurvedUnderlineText>
              </h2>

              <p className="mx-auto mt-6 max-w-2xl text-sm leading-7 text-white/62 sm:text-base">
                These values guide how we think, build, communicate, and support every brand we work
                with.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {values.map((value, index) => (
                <motion.article
                  key={index}
                  initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: index * 0.06 }}
                  viewport={{ once: true }}
                  className="group relative overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#08182D] p-6 shadow-[0_28px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-[#39D97A]/28"
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_42%)] opacity-80" />

                  <div className="relative">
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/20 bg-[#39D97A]/10">
                      <SvgIcon
                        name={getIconName(value.icon, 'growth')}
                        size={28}
                        color="#39D97A"
                      />
                    </div>

                    <h3 className="text-xl font-black tracking-[-0.035em] text-white">
                      {value.title}
                    </h3>

                    <p className="mt-4 text-sm leading-7 text-white/58">
                      {value.description}
                    </p>
                  </div>
                </motion.article>
              ))}
            </div>

            <div className="mt-16 overflow-hidden rounded-[2rem] border border-white/10 bg-[#071427]/85 p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.3)] backdrop-blur-2xl sm:p-8">
              <h2 className="text-3xl font-black tracking-[-0.045em] text-white md:text-4xl">
                Ready to build something more{' '}
                <CurvedUnderlineText>premium?</CurvedUnderlineText>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Let’s improve your website, brand experience, store performance, and digital growth
                structure.
              </p>

              <Link
                href="/contact"
                className="group mt-7 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02]"
              >
                Get In Touch
                <SvgIcon
                  name="arrow-diagonal"
                  size={16}
                  color="#06101F"
                  className="transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}