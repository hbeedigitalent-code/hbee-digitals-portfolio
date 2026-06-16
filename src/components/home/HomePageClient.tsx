'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

import HeroSection from '@/components/sections/HeroSection'
import AboutSection from '@/components/sections/AboutSection'
import CTASection from '@/components/sections/CTASection'
import FeaturedPortfolioSection from '@/components/sections/FeaturedPortfolioSection'

import TrustedTechnologies from '@/components/home/TrustedTechnologies'
import BeforeAfterPreview from '@/components/home/BeforeAfterPreview'
import ReviewCarousel from '@/components/home/ReviewCarousel'
import TrustStack from '@/components/home/TrustStack'

import PartnerMarquee from '@/components/home/PartnerMarquee'
import ServicesSection from '@/components/sections/ServicesSection'
import TestimonialsSection from '@/components/sections/TestimonialsSection'
import FAQSection from '@/components/sections/FAQSection'

import Reveal from '@/components/Reveal'
import StatsBar from '@/components/ui/StatsBar'
import TabSwitcher from '@/components/ui/TabSwitcher'
import GridPattern from '@/components/ui/GridPattern'
import SvgIcon from '@/components/ui/SvgIcon'
import Button from '@/components/ui/Button'

function normalizeArray(value: any): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      if (Array.isArray(parsed)) return parsed
    } catch {
      return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean)
    }
  }
  return []
}

export default function HomePageClient() {
  const [mounted, setMounted] = useState(false)
  const [hero, setHero] = useState<any>({})
  const [about, setAbout] = useState<any>({})
  const [faqs, setFaqs] = useState<any[]>([])
  const [cta, setCta] = useState<any>({})
  const [portfolioItems, setPortfolioItems] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [testimonials, setTestimonials] = useState<any[]>([])

  useEffect(() => {
    setMounted(true)
    fetchHomeData()
  }, [])

  async function fetchHomeData() {
    const [
      heroRes,
      aboutRes,
      faqsRes,
      ctaRes,
      portfolioRes,
      servicesRes,
      testimonialsRes,
    ] = await Promise.all([
      supabase.from('hero_section').select('*').single(),
      supabase.from('about_section').select('*').single(),
      supabase.from('faqs').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(8),
      supabase.from('cta_section').select('*').single(),
      fetchPortfolioItems(),
      supabase.from('services').select('*').eq('is_active', true).order('display_order', { ascending: true }).limit(6),
      supabase.from('testimonials').select('*').eq('is_active', true).eq('is_featured', true).order('display_order', { ascending: true }).limit(3),
    ])

    setHero(heroRes.data || {})
    setAbout(aboutRes.data || {})
    setFaqs(faqsRes.data || [])
    setCta(ctaRes.data || {})
    setPortfolioItems(portfolioRes || [])
    setServices(servicesRes.data || [])
    setTestimonials(testimonialsRes.data || [])
  }

  async function fetchPortfolioItems() {
    let { data: allItems } = await supabase
      .from('portfolio_items')
      .select('id,title,name,client_name,slug,category,industry,project_type,description,image_url,featured_image,metric_value,metric_label,before_image,after_image,is_before_after,is_active,display_order,featured')
      .eq('is_active', true)
      .order('display_order', { ascending: true })
      .limit(30)
    return allItems || []
  }

  const statsData = [
    { value: '87', label: 'Projects Completed', icon: 'portfolio', description: 'Successful digital systems delivered.' },
    { value: '45', label: 'Happy Clients', icon: 'star', description: 'Trusted partners across ecommerce.' },
    { value: '5', label: 'Years Experience', icon: 'growth', description: 'Years of expertise in digital growth.' },
    { value: '98', label: 'Client Satisfaction', icon: 'analytics', description: 'Focused on measurable client success.' },
  ]

  const whyChooseUsItems = [
    {
      id: 'strategy',
      title: 'Strategy First',
      icon: 'strategy',
      description: 'We structure digital systems around trust, clarity, conversion, and long-term growth.',
      points: ['Growth-focused planning', 'Clear brand positioning', 'Conversion-first user journey'],
    },
    {
      id: 'execution',
      title: 'Premium Execution',
      icon: 'web-development',
      description: 'Every layout and interaction is built to feel clean, modern, responsive, and credible.',
      points: ['Mobile-first interface', 'Premium visual hierarchy', 'Fast and clean implementation'],
    },
    {
      id: 'optimization',
      title: 'Optimization',
      icon: 'growth',
      description: 'We improve how visitors move, trust, and take action instead of only making the website look good.',
      points: ['Better conversion flow', 'Improved page experience', 'Trust-focused content structure'],
    },
    {
      id: 'support',
      title: 'Long-Term Support',
      icon: 'support',
      description: 'We help brands keep improving after launch with guidance, updates, and practical support.',
      points: ['Technical support', 'Performance monitoring', 'Scalable improvement plan'],
    },
  ]

  const hasAboutContent = about && (about.title || about.subtitle || about.description || about.image_url)

  if (!mounted) {
    return (
      <div className="relative overflow-hidden bg-white text-navy-900">
        <Navbar />
        <main className="relative z-10">
          <div className="min-h-[80vh] bg-gradient-to-r from-navy-900 to-navy-800" />
          <div className="bg-gray-50 px-5 py-8">
            <div className="mx-auto max-w-7xl">
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="rounded-xl bg-white p-5 animate-pulse">
                    <div className="h-8 w-16 bg-gray-100 rounded-lg mb-2" />
                    <div className="h-4 w-24 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden bg-white text-navy-900">
      <Navbar />

      <main className="relative z-10">
        {/* 1. Hero */}
        <HeroSection
          data={{
            title: hero.title,
            subtitle: hero.subtitle,
            primaryCtaText: hero.primary_cta_text || 'Get Free Consultation',
            primaryCtaLink: hero.primary_cta_link || '/contact',
            secondaryCtaText: hero.secondary_cta_text || 'View Case Studies',
            secondaryCtaLink: hero.secondary_cta_link || '/portfolio',
            backgroundImage: hero.background_image,
            featureBullets: hero.feature_bullets || 'Shopify Optimization|Conversion Systems|Accessibility Support',
            ...(hero.video_url ? { video_url: hero.video_url } : {}),
          }}
        />

        {/* 2. Stats */}
        <section className="relative bg-[var(--bg-section)] px-5 py-8">
          <div className="mx-auto max-w-7xl">
            <StatsBar stats={statsData} />
          </div>
        </section>

        {/* 3. Partner Logos */}
        <section className="relative bg-[var(--bg-page)] px-5 py-8">
          <div className="mx-auto max-w-7xl">
            <PartnerMarquee />
          </div>
        </section>

        {/* 4. Services */}
        <ServicesSection services={services} />

        {/* 5. Trusted Technologies */}
        <TrustedTechnologies />

        {/* 6. Before & After */}
        <BeforeAfterPreview items={portfolioItems} />

        {/* 7. Featured Portfolio */}
        <FeaturedPortfolioSection items={portfolioItems} />

        {/* 8. Trust Stack */}
        <TrustStack />

        {/* 9. Testimonials */}
        <TestimonialsSection />

        {/* 10. Review Carousel */}
        <ReviewCarousel />

        {/* 11. Why Choose Us */}
        <section className="relative bg-[var(--bg-page)] px-5 py-16">
          <GridPattern />
          <div className="relative z-10 mx-auto max-w-7xl">
            <TabSwitcher items={whyChooseUsItems} />
          </div>
        </section>

        {/* 12. About */}
        {hasAboutContent && (
          <section className="relative bg-[var(--bg-section)]">
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

        {/* 13. Pricing - REMOVED */}

        {/* 14. FAQ */}
        <FAQSection 
          faqs={faqs} 
          variant="home"
          title="Everything You Need to Know"
          subtitle="Clear answers about our ecommerce, branding, website, content, and growth support services."
          limit={6}
        />

        {/* 15. CTA Section */}
        <section className="relative bg-[var(--bg-navy)] px-5 py-16">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full bg-[var(--accent)]/8 blur-[100px]" />
            <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[var(--accent)]/8 blur-[100px]" />
          </div>

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)]/10 px-3 py-1 mb-3">
              <span className="text-xs font-semibold text-[var(--accent)] uppercase tracking-wider">
                Ready to Scale?
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3">
              Ready to Grow Your Brand?
            </h2>
            <p className="text-sm text-[var(--text-on-dark-muted)] mb-6 max-w-2xl mx-auto">
              Let's build a website that drives results. Get a free consultation today.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact"
                className="btn-cta inline-flex items-center gap-2 px-6 py-2.5 text-sm font-black"
              >
                Get Free Consultation
                <SvgIcon name="arrow-right" size={14} color="white" />
              </Link>
              <Link
                href="/portfolio"
                className="btn-outline-dark inline-flex items-center gap-2 px-6 py-2.5 text-sm font-black"
              >
                View Our Work
                <SvgIcon name="arrow-diagonal" size={14} color="white" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}