'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import HeroSection from "@/components/sections/HeroSection"
import AboutSection from "@/components/sections/AboutSection"
import TestimonialsSection from "@/components/sections/TestimonialsSection"
import TeamSection from "@/components/sections/TeamSection"
import FAQSection from "@/components/sections/FAQSection"
import CTASection from "@/components/sections/CTASection"
import Reveal from "@/components/Reveal"
import NewsletterSection from '@/components/sections/NewsletterSection'
import StatsBar from '@/components/ui/StatsBar'
import LogoMarquee from '@/components/ui/LogoMarquee'
import TabSwitcher from '@/components/ui/TabSwitcher'
import ServiceOrbit from '@/components/ui/ServiceOrbit'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'

export default function HomePage() {
  const [hero, setHero] = useState<any>({})
  const [services, setServices] = useState<any[]>([])
  const [about, setAbout] = useState<any>({})
  const [projects, setProjects] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [cta, setCta] = useState<any>({})
  const [featuredPortfolioItems, setFeaturedPortfolioItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const scrollLeft = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: -340, behavior: 'smooth' })
    }
  }

  const scrollRight = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: 340, behavior: 'smooth' })
    }
  }

  // Why Choose Us Tab Data
  const whyChooseUsTabs = [
    {
      id: 'approach',
      label: 'Approach',
      title: 'Human-Centered Design',
      description: 'We put your users first. Every decision is made with your audience in mind, ensuring experiences that resonate and convert.',
      features: ['User Research', 'Empathy Mapping', 'Journey Mapping', 'Usability Testing']
    },
    {
      id: 'process',
      label: 'Process',
      title: 'Agile Development Process',
      description: 'Our transparent, iterative process keeps you involved at every stage. No surprises, just results.',
      features: ['Discovery & Strategy', 'Design & Prototype', 'Development', 'Testing & Launch']
    },
    {
      id: 'results',
      label: 'Results',
      title: 'Data-Driven Results',
      description: 'We don\'t just build pretty websites — we build solutions that drive measurable business growth.',
      features: ['Increased Conversions', 'Faster Load Times', 'Higher Engagement', 'Better ROI']
    },
    {
      id: 'promise',
      label: 'Promise',
      title: 'Your Success is Our Promise',
      description: 'We partner with you for the long haul. Ongoing support, maintenance, and optimization included.',
      features: ['24/7 Support', 'Regular Updates', 'Performance Monitoring', 'Continuous Improvement']
    }
  ]

  // Stats Data
  const statsData = [
    { value: 50, label: 'Projects Completed', suffix: '+' },
    { value: 25, label: 'Happy Clients', suffix: '+' },
    { value: 5, label: 'Years Experience', suffix: '+' },
    { value: 98, label: 'Success Rate', suffix: '%' }
  ]

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { data: heroData },
          { data: servicesData },
          { data: aboutData },
          { data: projectsData },
          { data: faqsData },
          { data: ctaData },
          { data: portfolioData }
        ] = await Promise.all([
          supabase.from('hero_section').select('*').eq('is_active', true).single(),
          supabase.from('services').select('*').eq('is_active', true).order('display_order'),
          supabase.from('about_section').select('*').single(),
          supabase.from('projects').select('*').eq('status', 'published').order('display_order').limit(6),
          supabase.from('faqs').select('*').eq('is_active', true).order('display_order'),
          supabase.from('cta_section').select('*').eq('is_active', true).single(),
          supabase.from('portfolio_items').select('*').eq('is_active', true).eq('featured', true).order('display_order').limit(6)
        ])

        setHero(heroData || {})
        setServices(servicesData || [])
        setAbout(aboutData || {})
        setProjects(projectsData || [])
        setFaqs(faqsData || [])
        setCta(ctaData || {})
        setFeaturedPortfolioItems(portfolioData || [])
      } catch (error) {
        console.error('Error fetching homepage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-[#007BFF] mb-4 mx-auto"></div>
          <p className="text-gray-600 font-['Poppins']">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <HeroSection data={{
          title: hero.title,
          subtitle: hero.subtitle,
          welcomeText: hero.welcome_text || 'Welcome to',
          primaryCtaText: hero.primary_cta_text,
          primaryCtaLink: hero.primary_cta_link,
          secondaryCtaText: hero.secondary_cta_text,
          secondaryCtaLink: hero.secondary_cta_link,
          backgroundImage: hero.background_image,
          featureBullets: hero.feature_bullets || 'Web Development|UI/UX Design|Digital Marketing|Brand Strategy'
        }} />

        {/* Stats Bar */}
        <StatsBar stats={statsData} />

        {/* Logo Marquee */}
        <LogoMarquee />

        {/* Service Orbit */}
        <section className="py-12 md:py-16 relative overflow-hidden" style={{ backgroundColor: 'var(--primary-color, #0A1D37)' }}>
          <div className="container mx-auto px-4">
            <ServiceOrbit services={services} />
          </div>
        </section>

        {/* Why Choose Us Tabs */}
        <section className="py-20 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4 font-['Poppins']" style={{ color: 'var(--primary-color)' }}>
                Why Choose Us
              </h2>
              <p className="text-gray-600 max-w-2xl mx-auto font-['Poppins']">
                Discover what makes us different and why clients trust us with their digital presence
              </p>
            </div>
            <TabSwitcher tabs={whyChooseUsTabs} defaultTab="approach" />
          </div>
        </section>

        {/* About Section */}
        <Reveal>
          <AboutSection data={{
            title: about.title,
            subtitle: about.subtitle,
            description: about.description,
            imageUrl: about.image_url,
            stats: about.stats || [],
            values: about.values || []
          }} />
        </Reveal>

        {/* Portfolio Preview Section - With Diagonal Arrow */}
        <section className="py-20 overflow-hidden bg-gray-50">
          <div className="container mx-auto px-4">
            {/* Header */}
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="text-xs tracking-widest uppercase text-[#007BFF] font-semibold mb-3">
                Our Work
              </div>
              <h2 className="font-bold text-3xl md:text-4xl text-gray-900">
                Real Stores We've Grown
              </h2>
              <div className="w-16 h-1 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full mx-auto my-4" />
              <p className="text-gray-600 text-sm leading-relaxed">
                We've helped Shopify and e-commerce stores increase revenue, traffic, and conversions. Here's a snapshot of recent work.
              </p>
            </div>

            {/* Horizontal Scroll Container */}
            <div className="relative">
              {/* Scroll Buttons */}
              {featuredPortfolioItems.length > 3 && (
                <>
                  <button
                    onClick={scrollLeft}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hidden md:flex"
                    aria-label="Scroll left"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={scrollRight}
                    className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center transition-all duration-300 opacity-0 group-hover:opacity-100 hover:bg-gray-100 hidden md:flex"
                    aria-label="Scroll right"
                  >
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </>
              )}

              <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto pb-6 scroll-smooth snap-x snap-mandatory"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                <style jsx>{`
                  div::-webkit-scrollbar {
                    display: none;
                  }
                `}</style>
                
                {featuredPortfolioItems.length === 0 ? (
                  <div className="text-center py-16 w-full">
                    <p className="text-gray-400">No portfolio items yet. Add them in Admin → Portfolio.</p>
                  </div>
                ) : (
                  featuredPortfolioItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 30 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      viewport={{ once: true }}
                      className="flex-shrink-0 w-80 snap-start group"
                    >
                      <Link href={item.url || '/portfolio'}>
                        <div className="bg-white rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100">
                          {/* Image Container */}
                          <div className="relative h-44 w-full overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                            {item.image_url ? (
                              <img
                                src={item.image_url}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center">
                                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              </div>
                            )}
                            {/* Hover Overlay with Diagonal Arrow */}
                            <div className="absolute inset-0 bg-gradient-to-t from-[#007BFF]/80 via-[#007BFF]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-3">
                              <span className="text-white text-xs font-medium flex items-center gap-1">
                                View Project ↗
                              </span>
                            </div>
                          </div>
                          <div className="p-3">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium bg-[#007BFF]/10 text-[#007BFF] px-2 py-0.5 rounded-full">
                                {item.tag || 'Project'}
                              </span>
                              {item.result && (
                                <span className="text-xs text-[#007BFF] font-semibold">
                                  {item.result}
                                </span>
                              )}
                            </div>
                            <h3 className="font-semibold text-gray-800 text-sm">
                              {item.name}
                            </h3>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* View All Button with Diagonal Arrow ↗ */}
            <div className="text-center mt-8">
              <Link
                href="/portfolio"
                className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full text-white font-medium text-sm hover:shadow-lg hover:scale-105 transition-all duration-300"
              >
                View All Work
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7l10 10M7 7v10m10-10H7" />
                </svg>
              </Link>
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <Reveal delay={0.3}>
          <TestimonialsSection />
        </Reveal>

        {/* Team Section */}
        <Reveal delay={0.4}>
          <TeamSection />
        </Reveal>

        {/* FAQ Section */}
        <Reveal delay={0.5}>
          <FAQSection data={faqs} />
        </Reveal>

        {/* CTA Section */}
        <Reveal delay={0.6}>
          <CTASection data={{
            title: cta.title,
            subtitle: cta.subtitle,
            buttonText: cta.button_text,
            buttonLink: cta.button_link
          }} />
        </Reveal>

        {/* Newsletter Section */}
        <NewsletterSection />
      </main>

      <Footer />
    </div>
  )
}