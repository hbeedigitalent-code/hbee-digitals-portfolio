'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'
import GradientHeading from '@/components/ui/GradientHeading'

interface FooterLink {
  label: string
  href: string
}

interface FooterColumn {
  title: string
  links: FooterLink[]
}

interface SocialLink {
  platform: string
  url: string
  icon: string
  is_active?: boolean
}

const blockedSocialUrls = [
  'https://facebook.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://instagram.com',
]

function cleanSvgName(value?: string, fallback = 'services') {
  if (!value) return fallback

  return value
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase() || fallback
}

function FooterLogo({
  logoUrl,
  brandName,
}: {
  logoUrl: string
  brandName: string
}) {
  return (
    <span className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-[#39D97A]/25 bg-gradient-to-br from-[#0E1B2D] to-[#13233A] p-2 shadow-[0_0_34px_rgba(57,217,122,0.14)] ring-1 ring-white/5 transition group-hover:border-[#39D97A]/40 group-hover:shadow-[0_0_42px_rgba(57,217,122,0.2)]">
      <img
        src={logoUrl}
        alt={`${brandName} logo`}
        className="h-10 w-10 object-contain drop-shadow-[0_0_16px_rgba(57,217,122,0.38)]"
      />
    </span>
  )
}

export default function Footer() {
  const reducedMotion = useReducedMotion()

  const [footerData, setFooterData] = useState<{
    logo_text?: string
    copyright_text?: string
    columns?: FooterColumn[]
    social_links?: SocialLink[]
  } | null>(null)

  const [siteSettings, setSiteSettings] = useState<any>({})

  useEffect(() => {
    async function fetchData() {
      const { data: footer } = await supabase
        .from('footer_settings')
        .select('*')
        .single()

      const { data: site } = await supabase
        .from('site_settings')
        .select('*')
        .single()

      if (footer) setFooterData(footer)
      if (site) setSiteSettings(site)
    }

    fetchData()
  }, [])

  const brandName =
    footerData?.logo_text || siteSettings.site_name || 'Hbee Digitals'

  const logoUrl = siteSettings.logo_url || '/svgs/logo.svg'

  const contactEmail =
    siteSettings.contact_email || 'contact@hbeedigitals.com'

  const contactPhone =
    siteSettings.contact_phone || '+234 815 315 3827'

  const cleanPhone = contactPhone.replace(/\s/g, '').replace('+', '')

  const columns: FooterColumn[] =
    footerData?.columns?.length
      ? footerData.columns
      : [
          {
            title: 'Services',
            links: [
              { label: 'Website Development', href: '/services' },
              { label: 'Ecommerce Solutions', href: '/services' },
              { label: 'Shopify Optimization', href: '/services' },
              { label: 'Brand Strategy', href: '/services' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About Us', href: '/about' },
              { label: 'Portfolio', href: '/portfolio' },
              { label: 'Process', href: '/process' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Contact', href: '/contact' },
            ],
          },
          {
            title: 'Legal',
            links: [
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Terms of Service', href: '/terms' },
              { label: 'Cookie Policy', href: '/cookies' },
            ],
          },
        ]

  const socialLinks: SocialLink[] =
    footerData?.social_links
      ?.filter((social) => social.is_active !== false)
      .filter((social) => social.url?.trim())
      .filter(
        (social) =>
          !blockedSocialUrls.includes(social.url.trim().toLowerCase())
      ) || []

  const contactItems = [
    {
      label: 'Email',
      value: contactEmail,
      href: `mailto:${contactEmail}`,
      icon: 'email',
    },
    {
      label: 'WhatsApp',
      value: contactPhone,
      href: `https://wa.me/${cleanPhone}`,
      icon: 'whatsapp',
    },
    {
      label: 'Location',
      value: siteSettings.contact_address || 'Serving ambitious brands globally',
      href: '#',
      icon: 'location',
    },
  ]

  return (
    <footer className="relative overflow-hidden border-t border-[#1E314A] bg-[#07111F] text-white">
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[340px] w-[420px] rounded-full bg-[#39D97A]/6 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[#C6F135]/5 blur-[110px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.022)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.022)_1px,transparent_1px)] bg-[size:82px_82px] opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-12 sm:px-6 md:px-10 lg:px-12 lg:py-16">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          viewport={{ once: true }}
          className="relative mb-12 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.12),transparent_40%)]" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/18 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
                Digital Growth Starts Here
              </p>

              <h2 className="max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.04em] sm:text-4xl md:text-5xl">
                Ready to build a digital system that feels ready to{' '}
                <GradientHeading>scale?</GradientHeading>
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Let’s improve your website, store experience, brand trust, and
                conversion structure with a cleaner digital foundation.
              </p>
            </div>

            <Link
              href="/contact"
              className="group inline-flex min-h-[52px] w-fit items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Start A Project
              <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -18 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="group inline-flex items-center gap-3">
              <FooterLogo logoUrl={logoUrl} brandName={brandName} />

              <span>
                <span className="block text-lg font-black tracking-[-0.035em] text-white">
                  {brandName}
                </span>
                <span className="block text-xs font-black uppercase tracking-[0.2em] text-[#39D97A]">
                  Digital Growth Studio
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/58 sm:text-base">
              Premium websites, Shopify optimization, brand systems, and
              conversion-focused digital experiences for ambitious businesses.
            </p>

            {socialLinks.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-3">
                {socialLinks.map((social, index) => (
                  <motion.a
                    key={`${social.platform}-${index}`}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    whileHover={reducedMotion ? undefined : { y: -4, scale: 1.04 }}
                    whileTap={reducedMotion ? undefined : { scale: 0.96 }}
                    className="group flex h-11 w-11 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/30 hover:bg-[#13233A]"
                    aria-label={`Follow ${brandName} on ${social.platform}`}
                  >
                    <SvgIcon
                      name={cleanSvgName(social.icon, social.platform.toLowerCase())}
                      size={18}
                      color="#39D97A"
                    />
                  </motion.a>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 18 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42 }}
            viewport={{ once: true }}
            className="grid gap-8 sm:grid-cols-3"
          >
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 text-sm font-black uppercase tracking-[0.18em] text-[#39D97A]">
                  {column.title}
                </h3>

                <ul className="space-y-3">
                  {column.links.map((link) => (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-white/56 transition hover:text-white"
                      >
                        {link.label}
                        <SvgIcon
                          name="arrow-diagonal"
                          size={12}
                          color="#39D97A"
                          className="opacity-0 transition group-hover:opacity-100"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.42 }}
          viewport={{ once: true }}
          className="mt-12 grid gap-4 border-y border-[#1E314A] py-6 md:grid-cols-3"
        >
          {contactItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group flex items-start gap-4 rounded-[1.4rem] border border-[#1E314A] bg-[#0E1B2D] p-4 transition hover:-translate-y-1 hover:border-[#39D97A]/25 hover:bg-[#13233A]"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                <SvgIcon name={item.icon} size={18} color="#39D97A" />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
                  {item.label}
                </span>
                <span className="mt-1 block break-words text-sm leading-6 text-white/65 transition group-hover:text-white">
                  {item.value}
                </span>
              </span>
            </Link>
          ))}
        </motion.div>

        <div className="mt-10 flex flex-col gap-4 text-sm text-white/42 md:flex-row md:items-center md:justify-between">
          <div>
            <p>
              {footerData?.copyright_text ||
                `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
            </p>
            <p className="mt-1 text-xs text-white/30">
              Built for trust, conversion, and growth.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#39D97A]/16 bg-[#39D97A]/8 px-4 py-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#39D97A]">
              <SvgIcon name="security" size={13} color="#39D97A" />
              Premium Digital Partner
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}