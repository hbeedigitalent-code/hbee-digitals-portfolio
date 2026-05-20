'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import AboutSection from '@/components/sections/AboutSection'
import TeamSection from '@/components/sections/TeamSection'
import CTASection from '@/components/sections/CTASection'
import SvgIcon from '@/components/ui/SvgIcon'
import { supabase } from '@/lib/supabase'

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
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

export default function AboutPage() {
  const reducedMotion = useReducedMotion()
  const [about, setAbout] = useState<any>(null)
  const [cta, setCta] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const { data: aboutData } = await supabase.from('about_section').select('*').single()
      const { data: ctaData } = await supabase.from('cta_section').select('*').single()

      setAbout(aboutData)
      setCta(ctaData)
      setLoading(false)
    }

    fetchData()
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
        <section className="relative px-5 pb-10 pt-32 sm:px-6 md:px-10 lg:px-12">
          <div className="absolute inset-0 -z-0">
            <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[140px]" />
            <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.025)_1px,transparent_1px)] bg-[size:80px_80px] opacity-20" />
          </div>

          <div className="relative z-10 mx-auto max-w-7xl">
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55 }}
              className="max-w-5xl"
            >
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-white/[0.04] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="services" size={14} color="#39D97A" />
                About Hbee Digitals
              </div>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
                A digital growth studio helping brands move from presence to{' '}
                <CurvedUnderlineText>performance.</CurvedUnderlineText>
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                We build digital experiences that combine strategy, design, ecommerce thinking,
                development, conversion structure, and long-term brand support.
              </p>
            </motion.div>
          </div>
        </section>

        {about && (
          <AboutSection
            compact
            data={{
              title: about.title || 'We build with strategy, not guesswork.',
              subtitle:
                about.subtitle ||
                'Every decision is shaped by customer experience, performance, trust, and long-term scalability.',
              description: about.description,
              imageUrl: about.image_url,
              stats: about.stats || [],
              values: about.values || [],
            }}
          />
        )}

        <section className="relative px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  title: 'Full-service thinking',
                  text: 'We connect design, development, ecommerce, content structure, and conversion into one system.',
                  icon: 'services',
                },
                {
                  title: 'Clear communication',
                  text: 'You get a smoother process, clearer updates, and a more organized project experience.',
                  icon: 'messages',
                },
                {
                  title: 'Ecommerce expertise',
                  text: 'We understand store structure, customer journey, product trust, checkout flow, and optimization.',
                  icon: 'ecommerce',
                },
                {
                  title: 'Growth support',
                  text: 'We build with the long-term in mind so your website can keep improving after launch.',
                  icon: 'analytics',
                },
              ].map((item, index) => (
                <motion.div
                  key={item.title}
                  initial={reducedMotion ? false : { opacity: 0, y: 22 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.42, delay: index * 0.05 }}
                  viewport={{ once: true }}
                  className="rounded-[1.7rem] border border-white/10 bg-white/[0.045] p-6 transition hover:-translate-y-2 hover:border-[#39D97A]/25 hover:bg-white/[0.065]"
                >
                  <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                    <SvgIcon name={item.icon} size={26} color="#39D97A" />
                  </div>

                  <h3 className="text-xl font-black tracking-[-0.03em]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-white/58">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative px-5 py-16 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.2em] text-[#39D97A]">
                Our Approach
              </p>

              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.04em] md:text-5xl">
                Built around clarity, conversion, and scalable execution.
              </h2>
            </div>

            <div className="space-y-4">
              {[
                'We start by understanding the business, the audience, and the current digital gaps.',
                'We shape the design and structure around trust, usability, and customer decision-making.',
                'We build with clean systems so the brand can grow without looking patched together.',
              ].map((text, index) => (
                <div
                  key={text}
                  className="rounded-2xl border border-white/10 bg-white/[0.045] p-5"
                >
                  <p className="text-sm font-semibold leading-7 text-white/65">
                    <span className="mr-3 text-[#39D97A]">0{index + 1}</span>
                    {text}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TeamSection />

        {cta && (
          <CTASection
            data={{
              title: cta.title,
              subtitle: cta.subtitle,
              buttonText: cta.button_text,
              buttonLink: cta.button_link,
            }}
          />
        )}

        <section className="px-5 pb-20 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl rounded-[2rem] border border-white/10 bg-white/[0.045] p-6 text-center sm:p-8">
            <h2 className="text-3xl font-black tracking-[-0.04em] md:text-4xl">
              Ready to build a stronger digital foundation?
            </h2>

            <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-white/60">
              Let’s talk about your website, store, brand, or growth system.
            </p>

            <Link
              href="/contact"
              className="mt-7 inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Start A Project
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </>
  )
}