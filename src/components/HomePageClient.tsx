'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import HeroSection from '@/components/sections/HeroSection'
import AboutSection from '@/components/sections/AboutSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import TeamSection from '@/components/sections/TeamSection'
import FAQSection from '@/components/sections/FAQSection'
import CTASection from '@/components/sections/CTASection'
import NewsletterSection from '@/components/sections/NewsletterSection'
import ClientProofsSection from '@/components/sections/ClientProofsSection'
import Reveal from '@/components/Reveal'
import StatsBar from '@/components/ui/StatsBar'
import LogoMarquee from '@/components/ui/LogoMarquee'
import TabSwitcher from '@/components/ui/TabSwitcher'
import ServiceOrbit from '@/components/ui/ServiceOrbit'
import GridPattern from '@/components/ui/GridPattern'
import GlowOrb from '@/components/ui/GlowOrb'
import SvgIcon from '@/components/ui/SvgIcon'
import { ArrowRight, Sparkles, TrendingUp } from 'lucide-react'

interface HomePageClientProps {
  hero: any
  services: any[]
  about: any
  faqs: any[]
  cta: any
  featuredPortfolioItems: any[]
  translatedTexts?: {
    welcomeText: string
    primaryCtaText: string
    secondaryCtaText: string
    trustText: string
  }
}

export default function HomePageClient({
  hero,
  services,
  about,
  faqs,
  cta,
  featuredPortfolioItems,
  translatedTexts,
}: HomePageClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    scrollRef.current?.scrollBy({ left: -360, behavior: 'smooth' })
  }

  const scrollRight = () => {
    scrollRef.current?.scrollBy({ left: 360, behavior: 'smooth' })
  }

  const statsData = [
    { value: 87, label: 'Projects Completed', suffix: '+' },
    { value: 45, label: 'Happy Clients', suffix: '+' },
    { value: 5, label: 'Years Experience', suffix: '+' },
    { value: 98, label: 'Success Rate', suffix: '%' },
  ]

  const whyChooseUsTabs = [
    {
      id: 'approach',
      label: 'Approach',
      title: 'Human-Centered Design',
      description:
        'We put your users first. Every decision is made with your audience in mind, ensuring experiences that resonate and convert.',
      features: ['User Research', 'Empathy Mapping', 'Journey Mapping', 'Usability Testing'],
    },
    {
      id: 'process',
      label: 'Process',
      title: 'Agile Development Process',
      description:
        'Our transparent, iterative process keeps you involved at every stage. No surprises, just results.',
      features: ['Discovery & Strategy', 'Design & Prototype', 'Development', 'Testing & Launch'],
    },
    {
      id: 'results',
      label: 'Results',
      title: 'Data-Driven Results',
      description:
        'We don’t just build pretty websites — we build solutions that drive measurable business growth.',
      features: ['Increased Conversions', 'Faster Load Times', 'Higher Engagement', 'Better ROI'],
    },
    {
      id: 'promise',
      label: 'Promise',
      title: 'Your Success is Our Promise',
      description:
        'We partner with you for the long haul. Ongoing support, maintenance, and optimization included.',
      features: ['24/7 Support', 'Regular Updates', 'Performance Monitoring', 'Continuous Improvement'],
    },
  ]

  const welcomeText = translatedTexts?.welcomeText || hero.welcome_text || 'Welcome to'
  const primaryCtaText = translatedTexts?.primaryCtaText || hero.primary_cta_text || 'Get Started'
  const secondaryCtaText = translatedTexts?.secondaryCtaText || hero.secondary_cta_text || 'View Work'

  const bgGradient = 'bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C]'

  const hasAboutContent =
    about &&
    (about.title ||
      about.subtitle ||
      about.description ||
      about.image_url ||
      (Array.isArray(about.stats) && about.stats.length > 0) ||
      (Array.isArray(about.values) && about.values.length > 0))

  return (
    <div className="relative">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div
          className="absolute w-[600px] h-[600px] rounded-full blur-[140px] opacity-[0.07]"
          style={{
            background: '#39D97A',
            animation: 'orbFloat1 18s ease-in-out infinite',
            top: '-10%',
            left: '10%',
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full blur-[120px] opacity-[0.05]"
          style={{
            background: '#C6F135',
            animation: 'orbFloat2 22s ease-in-out infinite',
            bottom: '20%',
            right: '5%',
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              'radial-gradient(circle, rgba(255,255,255,0.9) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <Navbar />

      <main id="main-content" className="relative z-10">
        <section className="relative">
          <GridPattern />
          <GlowOrb />
          <HeroSection
            data={{
              title: hero.title,
              subtitle: hero.subtitle,
              welcomeText,
              primaryCtaText,
              primaryCtaLink: hero.primary_cta_link || '/contact',
              secondaryCtaText,
              secondaryCtaLink: hero.secondary_cta_link || '/projects',
              backgroundImage: hero.background_image,
              featureBullets:
                hero.feature_bullets ||
                'Shopify Optimization|Conversion Systems|Accessibility Support',
              ...(hero.video_url ? { video_url: hero.video_url } : {}),
            }}
          />
        </section>

        <section className={`${bgGradient} relative`}>
          <StatsBar stats={statsData} />
        </section>

        <section className="bg-white relative">
          <LogoMarquee />
        </section>

        <section className={`py-12 md:py-14 relative overflow-hidden ${bgGradient}`}>
          <GridPattern />
          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <ServiceOrbit services={services} intervalMs={5500} />
          </div>
        </section>

        <section className={`${bgGradient} relative`}>
          <GridPattern />
          <div className="pt-14 pb-10 w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Why Choose Us</h2>
              <p className="text-white/70 max-w-2xl mx-auto">
                Discover what makes us different and why clients trust us with their digital presence
              </p>
            </div>
            <TabSwitcher tabs={whyChooseUsTabs} defaultTab="approach" />
          </div>
        </section>

        {hasAboutContent && (
          <section className={`${bgGradient} relative py-0`}>
            <Reveal>
              <AboutSection
                data={{
                  title: about.title,
                  subtitle: about.subtitle,
                  description: about.description,
                  imageUrl: about.image_url,
                  stats: about.stats || [],
                  values: about.values || [],
                }}
              />
            </Reveal>
          </section>
        )}

        <section className={`${bgGradient} relative overflow-hidden pt-14 pb-20 text-white`}>
          <GridPattern />

          <div className="absolute left-1/2 top-0 h-[360px] w-[720px] -translate-x-1/2 rounded-full bg-[#39D97A]/8 blur-[120px]" />
          <div className="absolute bottom-0 right-0 h-[320px] w-[420px] rounded-full bg-[#C6F135]/7 blur-[110px]" />

          <div className="relative z-10 mx-auto w-full max-w-7xl px-6 md:px-12">
            <div className="mb-12 grid items-end gap-8 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-[#39D97A]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Case Study Preview
                </div>

                <h2 className="max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.055em] text-white md:text-5xl lg:text-6xl">
                  Real Stores We’ve{' '}
                  <span className="relative inline-block">
                    <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
                      Grown
                    </span>
                    <svg
                      className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75"
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
                </h2>

                <p className="mt-5 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
                  Selected projects, growth systems, and digital experiences built to improve trust,
                  conversion, and performance.
                </p>
              </div>

              <Link
                href="/portfolio"
                className="group inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-6 py-3 text-sm font-bold text-white/80 backdrop-blur-xl transition hover:border-[#39D97A]/30 hover:bg-[#39D97A]/10 hover:text-white"
              >
                View All Work
                <SvgIcon
                  name="arrow-diagonal"
                  size={18}
                  className="transition duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                />
              </Link>
            </div>

            <div className="relative group">
              {featuredPortfolioItems.length > 3 && (
                <>
                  <button
                    onClick={scrollLeft}
                    className="absolute -left-5 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#071427]/85 text-[#39D97A] shadow-[0_18px_60px_rgba(0,0,0,0.35),0_0_28px_rgba(57,217,122,0.12)] backdrop-blur-2xl transition hover:scale-105 hover:border-[#C6F135]/40 hover:bg-[#39D97A]/12 md:flex"
                    aria-label="Scroll left"
                  >
                    <SvgIcon name="arrow-diagonal" size={18} className="rotate-180" />
                  </button>

                  <button
                    onClick={scrollRight}
                    className="absolute -right-5 top-1/2 z-20 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#071427]/85 text-[#39D97A] shadow-[0_18px_60px_rgba(0,0,0,0.35),0_0_28px_rgba(57,217,122,0.12)] backdrop-blur-2xl transition hover:scale-105 hover:border-[#C6F135]/40 hover:bg-[#39D97A]/12 md:flex"
                    aria-label="Scroll right"
                  >
                    <SvgIcon name="arrow-diagonal" size={18} />
                  </button>
                </>
              )}

              <div
                ref={scrollRef}
                className="flex gap-6 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>

                {featuredPortfolioItems.length === 0 ? (
                  <div className="w-full rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-16 text-center">
                    <p className="text-white/45">No portfolio items yet.</p>
                  </div>
                ) : (
                  featuredPortfolioItems.map((item, index) => (
                    <motion.article
                      key={item.id || index}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: index * 0.08 }}
                      viewport={{ once: true }}
                      className="group/card relative w-[340px] flex-shrink-0 snap-start overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#08182D] shadow-[0_28px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl transition duration-300 hover:-translate-y-1 hover:border-[#39D97A]/30"
                    >
                      <Link href={item.url || '/portfolio'}>
                        <div className="relative h-56 overflow-hidden bg-[#0B1E38]">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name || 'Project'}
                              className="h-full w-full object-cover transition duration-700 group-hover/card:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#0B1E38] to-[#132847]">
                              <SvgIcon name="analytics" size={58} className="opacity-60" />
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-[#060E1C] via-[#060E1C]/35 to-transparent" />

                          <div className="absolute left-4 top-4 rounded-full border border-[#39D97A]/20 bg-[#39D97A]/12 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#39D97A] backdrop-blur-xl">
                            {item.tag || 'Project'}
                          </div>

                          {item.result && (
                            <div className="absolute bottom-4 left-4 right-4 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs font-semibold text-white/75 backdrop-blur-xl">
                              <TrendingUp className="h-3.5 w-3.5 text-[#C6F135]" />
                              {item.result}
                            </div>
                          )}
                        </div>

                        <div className="relative overflow-hidden p-5">
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.22),transparent_42%),linear-gradient(135deg,rgba(57,217,122,0.12),rgba(198,241,53,0.04)_38%,rgba(6,14,28,0)_75%)] opacity-90" />
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/55 to-transparent" />

                          <div className="relative">
                            <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-[#C6F135]/80">
                              <SvgIcon name="precision" size={16} />
                              Digital growth system
                            </div>

                            <h3 className="text-xl font-black leading-tight tracking-[-0.035em] text-white">
                              {item.name || 'Growth System Project'}
                            </h3>

                            <div className="mt-5 grid grid-cols-3 gap-2">
                              {['Problem', 'System', 'Result'].map((label) => (
                                <div
                                  key={label}
                                  className="rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/8 px-3 py-2 text-center text-[11px] font-bold text-white/70"
                                >
                                  {label}
                                </div>
                              ))}
                            </div>

                            <div className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[#39D97A] transition group-hover/card:text-[#C6F135]">
                              View Case Study
                              <SvgIcon
                                name="arrow-diagonal"
                                size={16}
                                className="transition duration-300 group-hover/card:translate-x-1 group-hover/card:-translate-y-1"
                              />
                            </div>
                          </div>
                        </div>
                      </Link>
                    </motion.article>
                  ))
                )}
              </div>
            </div>
          </div>
        </section>

        <ClientProofsSection />

        <section className={`${bgGradient} relative`}>
          <GlowOrb />
          <Reveal delay={0.3}>
            <TestimonialsSection />
          </Reveal>
        </section>

        <section className={`${bgGradient} relative`}>
          <Reveal delay={0.4}>
            <TeamSection />
          </Reveal>
        </section>

        <section className={`${bgGradient} relative`}>
          <Reveal delay={0.5}>
            <FAQSection data={faqs} />
          </Reveal>
        </section>

        <section className={`${bgGradient} relative`}>
          <Reveal delay={0.6}>
            <CTASection
              data={{
                title: cta.title,
                subtitle: cta.subtitle,
                buttonText: cta.button_text,
                buttonLink: cta.button_link,
              }}
            />
          </Reveal>
        </section>

        <section className={`${bgGradient} relative`}>
          <NewsletterSection />
        </section>
      </main>

      <Footer />
    </div>
  )
}