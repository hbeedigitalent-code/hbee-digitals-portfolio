import { supabase } from '@/lib/supabase'

import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import TeamSection from '@/components/sections/TeamSection'
import CTASection from '@/components/sections/CTASection'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

export const revalidate = 60

interface AboutPageData {
  hero_badge?: string
  hero_title?: string
  hero_description?: string
  philosophy_title?: string
  philosophy_description_one?: string
  philosophy_description_two?: string
  founder_title?: string
  founder_description?: string
  founder_image?: string
}

const fallbackAbout: AboutPageData = {
  hero_badge: 'About Hbee Digitals',
  hero_title:
    'We build digital systems designed to increase trust, conversion, and long-term growth.',
  hero_description:
    'Hbee Digitals helps ambitious brands improve how they present, position, and scale online through conversion-focused websites, ecommerce systems, strategic UX, and premium digital experiences built for long-term growth.',
  philosophy_title: 'Most brands do not struggle because of bad products.',
  philosophy_description_one:
    'They struggle because their websites, branding, and customer experience fail to communicate trust clearly enough.',
  philosophy_description_two:
    'At Hbee Digitals, we focus on building structured digital systems that improve perception, simplify customer experience, and support sustainable growth across every interaction.',
  founder_title: 'Founder-led digital growth, built with strategy first.',
  founder_description:
    'Hbee Digitals was created to help brands move beyond simply having an online presence and start building digital systems that support real business growth.',
}

function getImageUrl(value?: string) {
  if (!value) return ''

  if (value.startsWith('http')) return value

  const cleaned = value.trim().replace(/^\/+/, '')

  return supabase.storage
    .from('project-images')
    .getPublicUrl(cleaned.startsWith('about/') ? cleaned : `about/${cleaned}`).data
    .publicUrl
}

export default async function AboutPage() {
  const { data } = await supabase
    .from('about_page')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  const about = data || fallbackAbout
  const founderImage = getImageUrl(about.founder_image)

  const processSteps = [
    {
      title: 'Audit',
      description:
        'We identify trust gaps, UX friction, technical issues, and conversion blockers across your current digital system.',
      icon: 'analytics',
    },
    {
      title: 'Strategy',
      description:
        'We define the right structure, messaging, user journey, and growth direction before building.',
      icon: 'strategy',
    },
    {
      title: 'Build',
      description:
        'We design and develop clean, premium digital experiences that are responsive, fast, and conversion-focused.',
      icon: 'web-development',
    },
    {
      title: 'Optimize',
      description:
        'We refine performance, usability, trust signals, and conversion flow so the system keeps improving.',
      icon: 'growth',
    },
  ]

  const expertise = [
    'Shopify Optimization',
    'Conversion-Focused Websites',
    'Ecommerce UX Systems',
    'Brand Trust Strategy',
    'Premium Interface Design',
    'Digital Growth Infrastructure',
  ]

  return (
    <>
      <Navbar />

      <main className="relative overflow-hidden bg-[#07111F] text-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-[#39D97A]/7 blur-[140px]" />
          <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#C6F135]/5 blur-[130px]" />
          <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.018)_1px,transparent_1px)] bg-[size:82px_82px] opacity-25" />
        </div>

        <section className="px-5 pb-14 pt-32 sm:px-6 md:px-10 lg:px-12 lg:pb-20 lg:pt-36">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-5xl">
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                <SvgIcon name="about" size={14} color="#39D97A" />
                {about.hero_badge}
              </p>

              <h1 className="text-5xl font-black leading-[0.94] tracking-[-0.06em] sm:text-6xl lg:text-7xl">
                {about.hero_title}
              </h1>

              <p className="mt-7 max-w-3xl text-base leading-8 text-white/62 md:text-lg">
                {about.hero_description}
              </p>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div className="overflow-hidden rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-3">
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.6rem] bg-[#07111F]">
                {founderImage ? (
                  <img
                    src={founderImage}
                    alt="Hbee Digitals Founder"
                    className="h-full w-full object-cover object-top"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#07111F] via-[#0E1B2D] to-[#13233A]">
                    <div className="flex h-28 w-28 items-center justify-center rounded-[2rem] border border-[#39D97A]/20 bg-[#39D97A]/10 text-5xl font-black text-[#39D97A]">
                      H
                    </div>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#07111F]/80 via-transparent to-transparent" />

                <div className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/10 bg-[#07111F]/80 p-4 backdrop-blur-xl">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                    Founder-led Studio
                  </p>
                  <p className="mt-2 text-sm leading-6 text-white/65">
                    Built around strategy, ecommerce thinking, and digital growth systems.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Founder Story
              </p>

              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                <GradientHeading>{about.founder_title}</GradientHeading>
              </h2>

              <p className="mt-7 text-base leading-8 text-white/62 md:text-lg">
                {about.founder_description}
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {expertise.map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-2xl border border-[#1E314A] bg-[#0E1B2D] px-4 py-3"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                      <SvgIcon name="verified" size={13} color="#39D97A" />
                    </span>
                    <span className="text-sm font-bold text-white/70">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-5xl rounded-[2rem] border border-[#1E314A] bg-[#0E1B2D] p-8 shadow-[0_28px_90px_rgba(0,0,0,0.24)] sm:p-10 lg:p-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
              Our Philosophy
            </p>

            <h2 className="max-w-4xl text-3xl font-black leading-[1] tracking-[-0.04em] text-white sm:text-4xl md:text-5xl">
              {about.philosophy_title}
            </h2>

            <p className="mt-6 text-base leading-8 text-white/62 md:text-lg">
              {about.philosophy_description_one}
            </p>

            <p className="mt-6 text-base leading-8 text-white/62 md:text-lg">
              {about.philosophy_description_two}
            </p>
          </div>
        </section>

        <section className="px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
          <div className="mx-auto max-w-7xl">
            <div className="mb-10 max-w-3xl">
              <p className="mb-4 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                How We Work
              </p>

              <h2 className="text-4xl font-black leading-[0.98] tracking-[-0.055em] sm:text-5xl">
                A structured process for <GradientHeading>growth.</GradientHeading>
              </h2>
            </div>

            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {processSteps.map((step, index) => (
                <div
                  key={step.title}
                  className="rounded-[1.7rem] border border-[#1E314A] bg-[#0E1B2D] p-5"
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                    <SvgIcon name={step.icon} size={21} color="#39D97A" />
                  </div>

                  <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                    0{index + 1}
                  </p>

                  <h3 className="text-xl font-black text-white">{step.title}</h3>

                  <p className="mt-4 text-sm leading-7 text-white/56">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <TeamSection />

        <section className="relative">
          <CTASection
            data={{
              title: 'Let’s build a digital system that feels ready to scale.',
              subtitle:
                'If your brand needs a stronger website, better user experience, or a more conversion-focused digital foundation, Hbee Digitals can help.',
              buttonText: 'Start A Project',
              buttonLink: '/contact',
            }}
          />
        </section>
      </main>

      <Footer />
    </>
  )
}