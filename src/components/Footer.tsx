'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

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
}

interface ContactItem {
  name: string
  href: string
  icon: string
}

const getSvgName = (iconPath: string, fallback: string) => {
  if (!iconPath) return fallback
  return iconPath.replace('/svgs/', '').replace('.svg', '').replace('/', '')
}

function CurvedUnderlineText({ children }: { children: React.ReactNode }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#39D97A] to-[#C6F135] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/75"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
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
    const fetchData = async () => {
      const { data: footer } = await supabase.from('footer_settings').select('*').single()
      if (footer) setFooterData(footer)

      const { data: site } = await supabase.from('site_settings').select('*').single()
      if (site) setSiteSettings(site)
    }

    fetchData()
  }, [])

  const brandName = footerData?.logo_text || siteSettings.site_name || 'Hbee Digitals'
  const logoUrl = siteSettings.logo_url || '/svgs/logo.svg'
  const contactEmail = siteSettings.contact_email || 'contact.hbeedigitalsteam@gmail.com'
  const contactPhone = siteSettings.contact_phone || '+234 815 315 3827'
  const cleanPhone = contactPhone.replace(/\s/g, '').replace('+', '')

  const columns: FooterColumn[] = footerData?.columns?.length
    ? footerData.columns
    : [
        {
          title: 'Services',
          links: [
            { label: 'Website Design', href: '/services' },
            { label: 'Shopify Optimization', href: '/services' },
            { label: 'Brand Experience', href: '/services' },
            { label: 'Growth Systems', href: '/services' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About', href: '/about' },
            { label: 'Portfolio', href: '/portfolio' },
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

  const socialLinks: SocialLink[] = footerData?.social_links?.length
    ? footerData.social_links
    : [
        { platform: 'Facebook', url: 'https://facebook.com', icon: '/svgs/facebook.svg' },
        { platform: 'Twitter', url: 'https://twitter.com', icon: '/svgs/twitter.svg' },
        { platform: 'LinkedIn', url: 'https://linkedin.com', icon: '/svgs/linkedin.svg' },
        { platform: 'Instagram', url: 'https://instagram.com', icon: '/svgs/instagram.svg' },
      ]

  const contactItems: ContactItem[] = [
    {
      name: contactEmail,
      href: `mailto:${contactEmail}`,
      icon: '/svgs/email.svg',
    },
    {
      name: contactPhone,
      href: `https://wa.me/${cleanPhone}`,
      icon: '/svgs/whatsapp.svg',
    },
    {
      name: siteSettings.contact_address || 'Serving ambitious brands globally',
      href: '#',
      icon: '/svgs/location.svg',
    },
  ]

  return (
    <footer className="relative overflow-hidden bg-[#050B16] text-white">
      <div className="absolute inset-0 -z-0">
        <div className="absolute left-0 top-0 h-[460px] w-[560px] rounded-full bg-[#39D97A]/10 blur-[130px]" />
        <div className="absolute bottom-0 right-0 h-[420px] w-[520px] rounded-full bg-[#39D97A]/7 blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(57,217,122,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(57,217,122,0.035)_1px,transparent_1px)] bg-[size:76px_76px] opacity-25" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-14 sm:px-6 md:px-10 lg:px-12 lg:py-20">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="relative mb-14 overflow-hidden rounded-[2rem] border border-[#39D97A]/16 bg-[#071427]/85 p-6 shadow-[0_35px_120px_rgba(0,0,0,0.38)] backdrop-blur-2xl md:p-8 lg:p-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.18),transparent_38%)]" />
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#39D97A]/60 to-transparent" />

          <div className="relative grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="mb-4 inline-flex rounded-full border border-[#39D97A]/20 bg-[#39D97A]/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[#39D97A]">
                Digital Growth Starts Here
              </p>

              <h2 className="max-w-3xl text-3xl font-black leading-[0.98] tracking-[-0.055em] text-white sm:text-4xl md:text-5xl">
                Ready to build a digital system that feels ready to{' '}
                <CurvedUnderlineText>scale?</CurvedUnderlineText>
              </h2>

              <p className="mt-5 max-w-2xl text-sm leading-7 text-white/60 sm:text-base">
                Let’s improve your website, store experience, brand trust, and conversion structure
                with a cleaner digital foundation.
              </p>
            </div>

            <Link
              href="/contact"
              className="group inline-flex min-h-[54px] w-fit items-center justify-center gap-2 rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F] shadow-[0_0_36px_rgba(57,217,122,0.25)] transition hover:scale-[1.02] hover:bg-[#C6F135]"
            >
              Start A Project
              <SvgIcon
                name="arrow-diagonal"
                size={16}
                color="#06101F"
                className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              />
            </Link>
          </div>
        </motion.div>

        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
            viewport={{ once: true }}
          >
            <Link href="/" className="group inline-flex items-center gap-3">
              <span className="flex h-13 w-13 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/8 p-2 transition group-hover:border-[#39D97A]/35 group-hover:bg-[#39D97A]/12">
                <img src={logoUrl} alt={`${brandName} logo`} className="h-9 w-9 object-contain" />
              </span>

              <span>
                <span className="block text-lg font-black tracking-[-0.04em] text-white">
                  {brandName}
                </span>
                <span className="block text-xs font-bold uppercase tracking-[0.22em] text-[#39D97A]">
                  Digital Growth Studio
                </span>
              </span>
            </Link>

            <p className="mt-6 max-w-md text-sm leading-7 text-white/58 sm:text-base">
              Premium websites, Shopify optimization, brand systems, and conversion-focused digital
              experiences for ambitious businesses.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={`${social.platform}-${index}`}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={reducedMotion ? undefined : { y: -4, scale: 1.05 }}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] transition hover:border-[#39D97A]/35 hover:bg-[#39D97A]/12"
                  aria-label={`Follow ${brandName} on ${social.platform}`}
                >
                  <SvgIcon
                    name={getSvgName(social.icon, social.platform.toLowerCase())}
                    size={18}
                    color="#39D97A"
                  />
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55 }}
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
                    <li key={link.href + link.label}>
                      <Link
                        href={link.href}
                        className="group inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition hover:text-white"
                      >
                        {link.label}
                        <SvgIcon
                          name="arrow-diagonal"
                          size={12}
                          color="#C6F135"
                          className="opacity-0 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
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
          initial={reducedMotion ? false : { opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          viewport={{ once: true }}
          className="mt-12 grid gap-4 border-y border-white/10 py-6 md:grid-cols-3"
        >
          {contactItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              target={item.href.startsWith('http') ? '_blank' : undefined}
              rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              className="group relative flex items-center gap-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-[#39D97A]/28 hover:bg-[#39D97A]/7 hover:shadow-[0_18px_55px_rgba(57,217,122,0.08)]"
            >
              <span className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-[#39D97A]/70 to-transparent transition-transform duration-500 group-hover:scale-x-100" />

              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-[#39D97A]/15 bg-[#39D97A]/10 transition-all duration-300 group-hover:scale-105 group-hover:border-[#39D97A]/35 group-hover:bg-[#39D97A]/14">
                <SvgIcon name={getSvgName(item.icon, 'email')} size={18} color="#39D97A" />
              </span>

              <span className="min-w-0 text-sm font-semibold text-white/62 transition duration-300 group-hover:text-white">
                {item.name}
              </span>

              <SvgIcon
                name="arrow-diagonal"
                size={14}
                color="#39D97A"
                className="ml-auto opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
              />
            </Link>
          ))}
        </motion.div>

        <div className="flex flex-col gap-4 pt-6 text-sm text-white/42 md:flex-row md:items-center md:justify-between">
          <p>
            {footerData?.copyright_text ||
              `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}
          </p>

          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-white/35">
            <span className="h-2 w-2 rounded-full bg-[#39D97A] shadow-[0_0_18px_rgba(57,217,122,0.8)]" />
            Built for trust, conversion, and growth.
          </div>
        </div>
      </div>
    </footer>
  )
}