'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from "@/components/Navbar"
import Footer from "@/components/Footer"
import HeroSection from "@/components/sections/HeroSection"
import ServicesSection from "@/components/sections/ServicesSection"
import AboutSection from "@/components/sections/AboutSection"
import PortfolioSection from "@/components/sections/PortfolioSection"
import TestimonialsSection from "@/components/sections/TestimonialsSection"
import TeamSection from "@/components/sections/TeamSection"
import FAQSection from "@/components/sections/FAQSection"
import CTASection from "@/components/sections/CTASection"
import Reveal from "@/components/Reveal"
import NewsletterSection from '@/components/sections/NewsletterSection'

export default function HomePage() {
  const [hero, setHero] = useState<any>({})
  const [services, setServices] = useState<any[]>([])
  const [about, setAbout] = useState<any>({})
  const [projects, setProjects] = useState<any[]>([])
  const [faqs, setFaqs] = useState<any[]>([])
  const [cta, setCta] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const [
          { data: heroData },
          { data: servicesData },
          { data: aboutData },
          { data: projectsData },
          { data: faqsData },
          { data: ctaData }
        ] = await Promise.all([
          supabase.from('hero_section').select('*').eq('is_active', true).single(),
          supabase.from('services').select('*').eq('is_active', true).order('display_order'),
          supabase.from('about_section').select('*').single(),
          supabase.from('projects').select('*').eq('status', 'published').order('display_order'),
          supabase.from('faqs').select('*').eq('is_active', true).order('display_order'),
          supabase.from('cta_section').select('*').eq('is_active', true).single()
        ])

        setHero(heroData || {})
        setServices(servicesData || [])
        setAbout(aboutData || {})
        setProjects(projectsData || [])
        setFaqs(faqsData || [])
        setCta(ctaData || {})
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <>
      <Navbar />
      
      <main>
        {/* Hero Section */}
        <Reveal>
          <HeroSection data={{
            title: hero.title,
            subtitle: hero.subtitle,
            primaryCtaText: hero.primary_cta_text,
            primaryCtaLink: hero.primary_cta_link,
            secondaryCtaText: hero.secondary_cta_text,
            secondaryCtaLink: hero.secondary_cta_link,
            backgroundImage: hero.background_image
          }} />
        </Reveal>

        {/* Services Section */}
        <Reveal delay={0.2}>
          <ServicesSection data={services} />
        </Reveal>

        {/* About Section */}
        <Reveal delay={0.3}>
          <AboutSection data={{
            title: about.title,
            subtitle: about.subtitle,
            description: about.description,
            imageUrl: about.image_url,
            stats: about.stats || [],
            values: about.values || []
          }} />
        </Reveal>

        {/* Portfolio Section */}
        <Reveal delay={0.4}>
          <PortfolioSection data={projects} />
        </Reveal>

        {/* Testimonials Section */}
        <Reveal delay={0.45}>
          <TestimonialsSection />
        </Reveal>

        {/* Team Section */}
        <Reveal delay={0.5}>
          <TeamSection />
        </Reveal>

        {/* FAQ Section */}
        <Reveal delay={0.55}>
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
    </>
  )
}