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
  is_active?: boolean
}

const blockedSocialUrls = [
  'https://facebook.com',
  'https://twitter.com',
  'https://linkedin.com',
  'https://instagram.com',
]

function LogoMark({
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
    footerData?.logo_text ||
    siteSettings.site_name ||
    'Hbee Digitals'

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
              { label: 'Website Design', href: '/services' },
              { label: 'Ecommerce Solutions', href: '/services' },
              { label: 'Shopify Optimization', href: '/services' },
              { label: 'Technical Consulting', href: '/services' },
            ],
          },
          {
            title: 'Company',
            links: [
              { label: 'About Us', href: '/about' },
              { label: 'Portfolio', href: '/portfolio' },
              { label: 'Our Process', href: '/process' },
              { label: 'Pricing', href: '/pricing' },
              { label: 'Blog', href: '/blog' },
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
      value:
        siteSettings.contact_address ||
        'Serving ambitious brands globally',
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
          className="relative mb-12 overflow-hidden rounded-[2rem] border border-[#1E314A] bg-gradient-to-br from-[#0E1B2D] to-[#0B1625] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.16),transparent_55%)]" />

          <div className="relative z-10 grid gap-12 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <Link href="/" className="group inline-flex items-center gap-4">
                <LogoMark
                  logoUrl={logoUrl}
                  brandName={brandName}
                />

                <div>
                  <h3 className="text-2xl font-black tracking-[-0.04em]">
                    {brandName}
                  </h3>

                  <p className="mt-1 text-sm text-[#39D97A]">
                    Premium Digital Growth Systems
                  </p>
                </div>
              </Link>

              <p className="mt-6 max-w-xl text-sm leading-8 text-white/60 sm:text-base">
                We help ambitious brands improve their digital presence
                through premium websites, ecommerce optimization,
                conversion systems, and scalable growth infrastructure.
              </p>

              {socialLinks.length > 0 && (
                <div className="mt-8 flex flex-wrap gap-4">
                  {socialLinks.map((social) => (
                    <a
                      key={social.platform}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#1E314A] bg-[#07111F] transition-all duration-300 hover:border-[#39D97A]/30 hover:bg-[#13233A]"
                    >
                      <SvgIcon
                        name={social.icon}
                        size={18}
                        color="#39D97A"
                      />
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4">
              {contactItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="group flex items-start gap-4 rounded-2xl border border-[#1E314A] bg-[#07111F]/70 p-4 transition-all duration-300 hover:border-[#39D97A]/22 hover:bg-[#13233A]"
                >
                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#39D97A]/10">
                    <SvgIcon
                      name={item.icon}
                      size={18}
                      color="#39D97A"
                    />
                  </span>

                  <span>
                    <span className="block text-xs font-black uppercase tracking-[0.16em] text-[#39D97A]">
                      {item.label}
                    </span>

                    <span className="mt-1 block text-sm leading-6 text-white/68">
                      {item.value}
                    </span>
                  </span>
                </a>
              ))}
            </div>
          </div>
        </motion.div>

        <div className="grid gap-10 border-b border-[#1E314A] pb-12 md:grid-cols-3">
          {columns.map((column, index) => (
            <motion.div
              key={column.title}
              initial={reducedMotion ? false : { opacity: 0, y: 22 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.08 }}
              viewport={{ once: true }}
            >
              <h4 className="mb-5 text-sm font-black uppercase tracking-[0.16em] text-[#39D97A]">
                {column.title}
              </h4>

              <div className="space-y-4">
                {column.links.map((link) => (
                  <Link
                    key={`${column.title}-${link.label}`}
                    href={link.href}
                    className="block text-sm text-white/60 transition-all duration-300 hover:text-[#39D97A]"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col gap-6 pt-8 md:flex-row md:items-center md:justify-between">
          <p className="text-sm text-white/40">
            {footerData?.copyright_text ||
              `© ${new Date().getFullYear()} Hbee Digitals. All rights reserved.`}
          </p>

          <div className="flex flex-wrap items-center gap-5 text-sm">
            <Link
              href="/pricing"
              className="text-white/50 transition-all duration-300 hover:text-[#39D97A]"
            >
              Pricing
            </Link>

            <Link
              href="/contact"
              className="text-white/50 transition-all duration-300 hover:text-[#39D97A]"
            >
              Contact
            </Link>

            <Link
              href="/privacy"
              className="text-white/50 transition-all duration-300 hover:text-[#39D97A]"
            >
              Privacy Policy
            </Link>

            <Link
              href="/terms"
              className="text-white/50 transition-all duration-300 hover:text-[#39D97A]"
            >
              Terms of Service
            </Link>

            <Link
              href="/cookies"
              className="text-white/50 transition-all duration-300 hover:text-[#39D97A]"
            >
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}