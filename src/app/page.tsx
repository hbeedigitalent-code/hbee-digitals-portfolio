import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

import HeroSection from '@/components/sections/HeroSection'
import AboutSection from '@/components/sections/AboutSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import FAQSection from '@/components/sections/FAQSection'
import CTASection from '@/components/sections/CTASection'
import NewsletterSection from '@/components/sections/NewsletterSection'
import ClientProofsSection from '@/components/sections/ClientProofsSection'
import FeaturedPortfolioSection from '@/components/sections/FeaturedPortfolioSection'

import Reveal from '@/components/Reveal'

import StatsBar from '@/components/ui/StatsBar'
import LogoMarquee from '@/components/ui/LogoMarquee'
import TabSwitcher from '@/components/ui/TabSwitcher'
import ServiceOrbit from '@/components/ui/ServiceOrbit'
import GridPattern from '@/components/ui/GridPattern'
import GlowOrb from '@/components/ui/GlowOrb'

export const revalidate = 60

export default async function HomePage() {
  const [heroRes, servicesRes, aboutRes, faqsRes, ctaRes, portfolioRes] =
    await Promise.all([
      supabase.from('hero_section').select('*').single(),

      supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      supabase.from('about_section').select('*').single(),

      supabase
        .from('faqs')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true }),

      supabase.from('cta_section').select('*').single(),

      supabase
        .from('portfolio_items')
        .select('*')
        .eq('featured', true)
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .limit(6),
    ])

  const hero = heroRes.data || {}
  const services = servicesRes.data || []
  const about = aboutRes.data || {}
  const faqs = faqsRes.data || []
  const cta = ctaRes.data || {}
  const portfolioItems = portfolioRes.data || []

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
        'We do not just design pages. We structure digital systems around trust, clarity, conversion, and long-term growth.',
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
        'Every layout, section, and interaction is built to feel clean, modern, responsive, and credible across devices.',
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
        'We focus on improving how visitors move, trust, and take action instead of only making the website look good.',
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
        'We help brands keep improving after launch with guidance, updates, and practical optimization support.',
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
      (Array.isArray(about.stats) && about.stats.length > 0) ||
      (Array.isArray(about.values) && about.values.length > 0))

  return (
    <div className="relative overflow-hidden bg-[#07111F] text-white">
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

        <section className="relative px-5 py-10 sm:px-6 md:px-10 lg:px-12">
          <div className="mx-auto max-w-7xl">
            <StatsBar stats={statsData} />
          </div>
        </section>

        <section className="relative bg-white">
          <LogoMarquee />
        </section>

        <section className="relative px-5 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16">
          <GridPattern />

          <div className="relative z-10 mx-auto max-w-7xl">
            <ServiceOrbit services={services} intervalMs={5500} />
          </div>
        </section>

        <FeaturedPortfolioSection items={portfolioItems} />

        <section className="relative px-5 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16">
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
                  stats: about.stats || [],
                  values: about.values || [],
                }}
              />
            </Reveal>
          </section>
        )}

        <ClientProofsSection />

        <section className="relative">
          <Reveal delay={0.2}>
            <TestimonialsSection />
          </Reveal>
        </section>

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

        <section className="relative">
          <NewsletterSection />
        </section>
      </main>

      <Footer />
    </div>
  )
}