'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

import HeroSection from '@/components/sections/HeroSection'
import AboutSection from '@/components/sections/AboutSection'
import FAQSection from '@/components/sections/FAQSection'
import CTASection from '@/components/sections/CTASection'
import FeaturedPortfolioSection from '@/components/sections/FeaturedPortfolioSection'

import TrustedTechnologies from '@/components/home/TrustedTechnologies'
import FeaturedResults from '@/components/home/FeaturedResults'
import BeforeAfterPreview from '@/components/home/BeforeAfterPreview'
import TrustStack from '@/components/home/TrustStack'
import ReviewCarousel from '@/components/home/ReviewCarousel'

import Reveal from '@/components/Reveal'

import StatsBar from '@/components/ui/StatsBar'
import TabSwitcher from '@/components/ui/TabSwitcher'
import GridPattern from '@/components/ui/GridPattern'
import GlowOrb from '@/components/ui/GlowOrb'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean)
    }
  }

  return []
}

export default function HomePageClient() {
  const [hero, setHero] = useState<any>({})
  const [about, setAbout] = useState<any>({})
  const [faqs, setFaqs] = useState<any[]>([])
  const [cta, setCta] = useState<any>({})
  const [portfolioItems, setPortfolioItems] = useState<any[]>([])
  const [pricingPackages, setPricingPackages] = useState<any[]>([])

  useEffect(() => {
    async function fetchHomeData() {
      const [
        heroRes,
        aboutRes,
        faqsRes,
        ctaRes,
        portfolioRes,
        pricingRes,
      ] = await Promise.all([
        supabase.from('hero_section').select('*').single(),

        supabase.from('about_section').select('*').single(),

        supabase
          .from('faqs')
          .select('*')
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(8),

        supabase.from('cta_section').select('*').single(),

        supabase
          .from('portfolio_items')
          .select(
            'id,title,name,client_name,slug,category,industry,project_type,description,image_url,featured_image,metric_value,metric_label,before_image,after_image,is_before_after,is_active,display_order'
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(12),

        supabase
          .from('pricing_packages')
          .select(
            'id,name,subtitle,price,description,features,is_featured,is_active,display_order'
          )
          .eq('is_active', true)
          .order('display_order', { ascending: true })
          .limit(3),
      ])

      setHero(heroRes.data || {})
      setAbout(aboutRes.data || {})
      setFaqs(faqsRes.data || [])
      setCta(ctaRes.data || {})
      setPortfolioItems(portfolioRes.data || [])
      setPricingPackages(pricingRes.data || [])
    }

    fetchHomeData()
  }, [])

  const statsData = [
    { value: '87+', label: 'Projects Completed', icon: 'portfolio' },
    { value: '45+', label: 'Happy Clients', icon: 'growth' },
    { value: '5+', label: 'Years Experience', icon: 'strategy' },
    { value: '98%', label: 'Success Rate', icon: 'analytics' },
  ]

  const whyChooseUsItems = [
    {
      id: 'strategy',
      title: 'Strategy First',
      icon: 'strategy',
      description:
        'We structure digital systems around trust, clarity, conversion, and long-term growth.',
      points: [
        'Growth-focused planning',
        'Clear brand positioning',
        'Conversion-first user journey',
      ],
    },
    {
      id: 'execution',
      title: 'Premium Execution',
      icon: 'web-development',
      description:
        'Every layout and interaction is built to feel clean, modern, responsive, and credible.',
      points: [
        'Mobile-first interface',
        'Premium visual hierarchy',
        'Fast and clean implementation',
      ],
    },
    {
      id: 'optimization',
      title: 'Optimization',
      icon: 'growth',
      description:
        'We improve how visitors move, trust, and take action instead of only making the website look good.',
      points: [
        'Better conversion flow',
        'Improved page experience',
        'Trust-focused content structure',
      ],
    },
    {
      id: 'support',
      title: 'Long-Term Support',
      icon: 'support',
      description:
        'We help brands keep improving after launch with guidance, updates, and practical support.',
      points: [
        'Technical support',
        'Performance monitoring',
        'Scalable improvement plan',
      ],
    },
  ]

  const hasAboutContent =
    about &&
    (about.title ||
      about.subtitle ||
      about.description ||
      about.image_url ||
      about.founder_image_url ||
      about.founder_image ||
      about.founder_photo_url ||
      about.founder_photo ||
      (Array.isArray(about.stats) && about.stats.length > 0) ||
      (Array.isArray(about.values) && about.values.length > 0))

  return (
    <div className="relative overflow-hidden bg-[var(--bg-page)] text-[var(--text-primary)]">
      <Navbar />

      <main id="main-content" className="relative z-10">
        <section className="relative">
          <GridPattern />
          <GlowOrb />

          <HeroSection
            data={{
              title: hero.title,
              subtitle: hero.subtitle,
              primaryCtaText: hero.primary_cta_text || 'Get Free Audit',
              primaryCtaLink: hero.primary_cta_link || '/contact',
              secondaryCtaText:
                hero.secondary_cta_text || 'View Case Studies',
              secondaryCtaLink: hero.secondary_cta_link || '/portfolio',
              backgroundImage: hero.background_image,
              featureBullets:
                hero.feature_bullets ||
                'Shopify Optimization|Conversion Systems|Accessibility Support',
              ...(hero.video_url ? { video_url: hero.video_url } : {}),
            }}
          />
        </section>

        <TrustedTechnologies />

        <section className="relative bg-[var(--bg-section)] px-5 py-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <StatsBar stats={statsData} />
          </div>
        </section>

        <FeaturedResults items={portfolioItems} />

        <BeforeAfterPreview items={portfolioItems} />

        <FeaturedPortfolioSection items={portfolioItems} />

        <TrustStack />

        <ReviewCarousel />

        <section className="relative bg-[var(--bg-page)] px-5 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <GridPattern />

          <div className="relative z-10 mx-auto max-w-7xl">
            <TabSwitcher items={whyChooseUsItems} />
          </div>
        </section>

        {hasAboutContent && (
          <section className="relative">
            <Reveal>
              <AboutSection
                data={{
                  title: about.title,
                  subtitle: about.subtitle,
                  description: about.description,
                  imageUrl: about.image_url,
                  image_url: about.image_url,
                  founder_image_url: about.founder_image_url,
                  founder_image: about.founder_image,
                  founder_photo_url: about.founder_photo_url,
                  founder_photo: about.founder_photo,
                  founder_title: about.founder_title,
                  founder_name: about.founder_name,
                  founder_role: about.founder_role,
                  image_title: about.image_title,
                  image_subtitle: about.image_subtitle,
                  stats: about.stats || [],
                  values: about.values || [],
                }}
              />
            </Reveal>
          </section>
        )}

        {pricingPackages.length > 0 && (
          <section className="relative bg-[#07111F] px-5 py-16 text-white sm:px-6 md:px-10 lg:px-12 lg:py-24">
            <GridPattern />

            <div className="relative z-10 mx-auto max-w-7xl">
              <div className="mb-12 max-w-4xl">
                <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  <SvgIcon name="pricing" size={14} color="#39D97A" />
                  Investment Options
                </p>

                <h2 className="text-4xl font-black leading-[0.96] tracking-[-0.055em] sm:text-5xl md:text-6xl">
                  Clear packages for serious{' '}
                  <GradientHeading>digital growth.</GradientHeading>
                </h2>

                <p className="mt-6 max-w-2xl text-sm leading-8 text-white/60 sm:text-base">
                  Explore starting points designed for brands that want better
                  websites, stronger trust, improved conversion flow, and
                  scalable digital systems.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {pricingPackages.map((item: any) => {
                  const features = normalizeArray(item.features).slice(0, 4)

                  return (
                    <div
                      key={item.id}
                      className={`relative overflow-hidden rounded-[2rem] border p-6 transition hover:-translate-y-1 ${
                        item.is_featured
                          ? 'border-[#39D97A]/30 bg-[#39D97A]/10 shadow-[0_32px_100px_rgba(57,217,122,0.12)]'
                          : 'border-[#1E314A] bg-[#0E1B2D]'
                      }`}
                    >
                      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-[#39D97A]/10 blur-[70px]" />

                      {item.is_featured && (
                        <div className="relative mb-5 inline-flex rounded-full bg-[#39D97A] px-4 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#06101F]">
                          Most Popular
                        </div>
                      )}

                      <div className="relative">
                        <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                          {item.subtitle || 'Growth Package'}
                        </p>

                        <h3 className="text-3xl font-black tracking-[-0.045em] text-white">
                          {item.name}
                        </h3>

                        <p className="mt-5 text-5xl font-black tracking-[-0.06em] text-white">
                          {item.price || 'Custom'}
                        </p>

                        <p className="mt-5 text-sm leading-7 text-white/58">
                          {item.description}
                        </p>

                        <div className="mt-7 space-y-3">
                          {features.map((feature) => (
                            <div
                              key={feature}
                              className="flex items-start gap-3 rounded-2xl border border-[#1E314A] bg-[#07111F]/75 px-4 py-3"
                            >
                              <span className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                                <SvgIcon
                                  name="verified"
                                  size={12}
                                  color="#39D97A"
                                />
                              </span>

                              <span className="text-sm leading-6 text-white/68">
                                {feature}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="mt-12 text-center">
                <Link
                  href="/pricing"
                  className="inline-flex min-h-[54px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-8 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
                >
                  View Full Pricing
                  <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
                </Link>
              </div>
            </div>
          </section>
        )}

        <section className="relative">
          <Reveal delay={0.3}>
            <FAQSection data={faqs} variant="home" />
          </Reveal>
        </section>

        <section className="relative">
          <Reveal delay={0.4}>
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
      </main>

      <Footer />
    </div>
  )
}
