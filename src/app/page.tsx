import { supabase } from '@/lib/supabase'

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

export const revalidate = 60

export default async function HomePage() {
  const [heroRes, servicesRes, aboutRes, faqsRes, ctaRes] =
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
    ])

  const hero = heroRes.data || {}
  const services = servicesRes.data || []
  const about = aboutRes.data || {}
  const faqs = faqsRes.data || []
  const cta = ctaRes.data || {}

  const statsData = [
    {
      value: 87,
      label: 'Projects Completed',
      suffix: '+',
      icon: 'portfolio',
    },
    {
      value: 45,
      label: 'Happy Clients',
      suffix: '+',
      icon: 'growth',
    },
    {
      value: 5,
      label: 'Years Experience',
      suffix: '+',
      icon: 'strategy',
    },
    {
      value: 98,
      label: 'Success Rate',
      suffix: '%',
      icon: 'analytics',
    },
  ]

  const whyChooseUsTabs = [
    {
      id: 'approach',
      label: 'Approach',
      title: 'Human-Centered Design',
      description:
        'We put your users first. Every decision is made with your audience in mind, ensuring experiences that resonate and convert.',
      features: [
        'User Research',
        'Empathy Mapping',
        'Journey Mapping',
        'Usability Testing',
      ],
    },
    {
      id: 'process',
      label: 'Process',
      title: 'Agile Development Process',
      description:
        'Our transparent, iterative process keeps you involved at every stage.',
      features: [
        'Discovery & Strategy',
        'Design & Prototype',
        'Development',
        'Testing & Launch',
      ],
    },
    {
      id: 'results',
      label: 'Results',
      title: 'Data-Driven Results',
      description:
        'We build solutions that drive measurable business growth.',
      features: [
        'Increased Conversions',
        'Faster Load Times',
        'Higher Engagement',
        'Better ROI',
      ],
    },
    {
      id: 'promise',
      label: 'Promise',
      title: 'Your Success is Our Promise',
      description:
        'Long-term support, optimization, and scalable digital systems.',
      features: [
        '24/7 Support',
        'Regular Updates',
        'Performance Monitoring',
        'Continuous Improvement',
      ],
    },
  ]

  const bgGradient =
    'bg-gradient-to-br from-[#060E1C] via-[#0B1E38] to-[#060E1C]'

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
      <div
        className="fixed inset-0 pointer-events-none overflow-hidden z-0"
        aria-hidden="true"
      >
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
              primaryCtaText:
                hero.primary_cta_text || 'Get Free Audit',
              primaryCtaLink:
                hero.primary_cta_link || '/contact',
              secondaryCtaText:
                hero.secondary_cta_text ||
                'View Case Studies',
              secondaryCtaLink:
                hero.secondary_cta_link || '/portfolio',
              backgroundImage: hero.background_image,
              featureBullets:
                hero.feature_bullets ||
                'Shopify Optimization|Conversion Systems|Accessibility Support',
              ...(hero.video_url
                ? { video_url: hero.video_url }
                : {}),
            }}
          />
        </section>

        <section className={`${bgGradient} relative`}>
          <StatsBar stats={statsData} />
        </section>

        <section className="bg-white relative">
          <LogoMarquee />
        </section>

        <section
          className={`py-12 md:py-14 relative overflow-hidden ${bgGradient}`}
        >
          <GridPattern />

          <div className="w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <ServiceOrbit
              services={services}
              intervalMs={5500}
            />
          </div>
        </section>

        <section className={`${bgGradient} relative`}>
          <GridPattern />

          <div className="pt-14 pb-10 w-full max-w-7xl mx-auto px-6 md:px-12 relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">
                Why Choose Us
              </h2>

              <p className="text-white/70 max-w-2xl mx-auto">
                Discover what makes us different and why
                clients trust us with their digital
                presence.
              </p>
            </div>

            <TabSwitcher
              tabs={whyChooseUsTabs}
              defaultTab="approach"
            />
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

        <ClientProofsSection />

        <section className={`${bgGradient} relative`}>
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
            <FAQSection data={faqs} variant="home" />
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