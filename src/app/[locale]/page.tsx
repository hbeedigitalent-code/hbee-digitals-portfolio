import { createServerSupabaseClient } from '@/lib/supabase-server'
import HomePageClient from '@/components/HomePageClient'
import { getTranslations } from 'next-intl/server'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = createServerSupabaseClient()

  const [
    { data: heroData },
    { data: servicesData },
    { data: aboutData },
    { data: faqsData },
    { data: ctaData },
    { data: portfolioData },
  ] = await Promise.all([
    supabase.from('hero_section').select('*').eq('is_active', true).single(),
    supabase.from('services').select('*').eq('is_active', true).order('display_order'),
    supabase.from('about_section').select('*').single(),
    supabase.from('faqs').select('*').eq('is_active', true).order('display_order'),
    supabase.from('cta_section').select('*').eq('is_active', true).single(),
    supabase.from('portfolio_items')
      .select('*')
      .eq('is_active', true)
      .eq('featured', true)
      .order('display_order')
      .limit(6),
  ])

  const t = await getTranslations('hero')
  const translatedTexts = {
    welcomeText: t('welcome'),
    primaryCtaText: t('cta'),
    secondaryCtaText: t('secondaryCta'),
    trustText: t('trust'),
  }

  return (
    <HomePageClient
      hero={heroData || {}}
      services={servicesData || []}
      about={aboutData || {}}
      faqs={faqsData || []}
      cta={ctaData || {}}
      featuredPortfolioItems={portfolioData || []}
      translatedTexts={translatedTexts}
    />
  )
}