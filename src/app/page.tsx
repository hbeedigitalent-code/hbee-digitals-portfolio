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

// Fetch all data from Supabase
async function getHeroData() {
  const { data } = await supabase.from('hero_section').select('*').eq('is_active', true).single()
  return data || {}
}

async function getServices() {
  const { data } = await supabase.from('services').select('*').eq('is_active', true).order('display_order')
  return data || []
}

async function getAboutData() {
  const { data } = await supabase.from('about_section').select('*').single()
  return data || {}
}

async function getProjects() {
  const { data } = await supabase.from('projects').select('*').eq('status', 'published').order('display_order')
  return data || []
}

async function getFaqs() {
  const { data } = await supabase.from('faqs').select('*').eq('is_active', true).order('display_order')
  return data || []
}

async function getCtaData() {
  const { data } = await supabase.from('cta_section').select('*').eq('is_active', true).single()
  return data || {}
}

async function getFooterData() {
  const { data } = await supabase.from('footer_settings').select('*').single()
  return data || {}
}

export default async function HomePage() {
  const [hero, services, about, projects, faqs, cta, footer] = await Promise.all([
    getHeroData(),
    getServices(),
    getAboutData(),
    getProjects(),
    getFaqs(),
    getCtaData(),
    getFooterData()
  ])

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

      <Footer data={{
        logoText: footer.logo_text,
        copyrightText: footer.copyright_text,
        columns: footer.columns || [],
        socialLinks: footer.social_links || []
      }} />
    </>
  )
}