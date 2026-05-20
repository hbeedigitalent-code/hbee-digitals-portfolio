'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import ServicesSection, { getServiceIcon } from '@/components/sections/ServicesSection'
import { motion, useReducedMotion } from 'framer-motion'
import Link from 'next/link'
import SvgIcon from '@/components/ui/SvgIcon'

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 text-[#39D97A]">{children}</span>
      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M4 13C50 2 142 2 216 11" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      </svg>
    </span>
  )
}

export default function ServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    async function fetchServices() {
      const { data } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order')

      setServices(data || [])
      setLoading(false)
    }

    fetchServices()
  }, [])

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="flex min-h-screen items-center justify-center bg-[#060E1C] text-white">
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-[#39D97A]" />
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#060E1C] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#123F2B]/50 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px] opacity-25" />
        </div>

        <section className="relative px-5 pb-16 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65 }}
              >
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/15 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                  <SvgIcon name="services" size={14} color="#39D97A" />
                  Services / Growth Systems
                </div>

                <h1 className="max-w-5xl text-5xl font-black leading-[0.93] tracking-[-0.04em] sm:text-6xl lg:text-7xl">
                  Strategic systems
                  <br />
                  built for
                  <br />
                  <CurvedUnderlineText>digital growth.</CurvedUnderlineText>
                </h1>

                <p className="mt-7 max-w-2xl text-base leading-8 text-white/58 md:text-lg">
                  We help brands improve conversion, customer experience, trust, design quality,
                  and digital performance through structured digital systems.
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  {['Conversion Systems', 'Brand Experience', 'Shopify Optimization'].map((item) => (
                    <div
                      key={item}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-5 py-2 text-sm font-semibold text-white/65 transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/10"
                    >
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-10 flex flex-wrap gap-4">
                  <Link
                    href="/contact"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                  >
                    Start Project
                  </Link>

                  <Link
                    href="/portfolio"
                    className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-7 py-3 text-sm font-bold text-white/75 transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/8"
                  >
                    View Portfolio
                  </Link>
                </div>
              </motion.div>

              <motion.div
                initial={reducedMotion ? false : { opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.65, delay: 0.12 }}
                className="relative"
              >
                <div className="absolute -inset-6 rounded-[2rem] bg-[#39D97A]/6 blur-3xl" />

                <div className="relative grid gap-5 sm:grid-cols-2">
                  {services.slice(0, 4).map((service, index) => {
                    const featured = index === 0
                    const icon = getServiceIcon(service)

                    return (
                      <motion.div
                        key={service.id}
                        initial={reducedMotion ? false : { opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.45, delay: 0.16 + index * 0.06 }}
                        className={`relative overflow-hidden rounded-[2rem] border p-6 shadow-[0_26px_80px_rgba(0,0,0,0.24)] transition duration-300 hover:-translate-y-2 hover:scale-[1.01] ${
                          featured
                            ? 'border-[#39D97A] bg-[#39D97A] text-[#06101F]'
                            : 'border-white/10 bg-white/[0.045] text-white hover:border-[#39D97A]/28 hover:bg-white/[0.065]'
                        }`}
                      >
                        <div
                          className={`absolute -right-12 -top-12 h-32 w-32 rounded-full blur-3xl ${
                            featured ? 'bg-[#06101F]/10' : 'bg-[#39D97A]/10'
                          }`}
                        />

                        <div className="relative">
                          <div
                            className={`mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border ${
                              featured
                                ? 'border-[#06101F]/12 bg-[#06101F]/10'
                                : 'border-[#39D97A]/18 bg-[#39D97A]/10'
                            }`}
                          >
                            <SvgIcon name={icon} size={28} color={featured ? '#06101F' : '#39D97A'} />
                          </div>

                          <h3 className="text-2xl font-black leading-tight tracking-[-0.035em]">
                            {service.title}
                          </h3>

                          <p className={`mt-4 line-clamp-4 text-sm leading-7 ${featured ? 'text-[#06101F]/72' : 'text-white/58'}`}>
                            {service.description}
                          </p>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <ServicesSection
          data={services}
          title="Growth Systems We Build"
          subtitle="Every service layer is connected to performance, credibility, conversion, and scalable digital infrastructure."
        />

        <section className="relative px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center shadow-[0_30px_100px_rgba(0,0,0,0.28)] backdrop-blur-2xl sm:p-8">
              <h2 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
                Ready to build your <CurvedUnderlineText>growth system?</CurvedUnderlineText>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Let’s create a cleaner, more scalable, and conversion-focused digital experience for your brand.
              </p>

              <Link
                href="/contact"
                className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
              >
                Start Your Project
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}