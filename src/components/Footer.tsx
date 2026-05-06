'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

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

export default function Footer() {
  const [footerData, setFooterData] = useState<{
    logo_text: string
    copyright_text: string
    columns: FooterColumn[]
    social_links: SocialLink[]
  } | null>(null)

  const [siteSettings, setSiteSettings] = useState<any>({})

  useEffect(() => {
    const fetchData = async () => {
      // Fetch footer settings
      const { data: footer } = await supabase.from('footer_settings').select('*').single()
      if (footer) setFooterData(footer)

      // Fetch site settings for contact info
      const { data: site } = await supabase.from('site_settings').select('*').single()
      if (site) setSiteSettings(site)
    }
    fetchData()
  }, [])

  // Fallback columns if none in DB
  const columns: FooterColumn[] = footerData?.columns?.length
    ? footerData.columns
    : [
        {
          title: 'Services',
          links: [
            { label: 'Web Development', href: '/services' },
            { label: 'E-Commerce Solutions', href: '/services' },
            { label: 'UI/UX Design', href: '/services' },
            { label: 'Digital Marketing', href: '/services' },
            { label: 'Brand Strategy', href: '/services' },
            { label: 'Technical Consulting', href: '/services' },
          ],
        },
        {
          title: 'Company',
          links: [
            { label: 'About Us', href: '/about' },
            { label: 'Portfolio', href: '/projects' },
            { label: 'FAQ', href: '/faq' },
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
      name: siteSettings.contact_email || 'hbeedigital@gmail.com',
      href: `mailto:${siteSettings.contact_email || 'hello.hbeedigitals@gmail.com'}`,
      icon: '/svgs/email.svg',
    },
    {
      name: siteSettings.contact_phone || '+234 (912) 191-3997',
      href: `tel:${(siteSettings.contact_phone || '+2349121913997').replace(/\s/g, '')}`,
      icon: '/svgs/phone.svg',
    },
    {
      name: siteSettings.contact_address || 'Plot 241 Digital Street, Tech City',
      href: '#',
      icon: '/svgs/location.svg',
    },
  ]

  return (
    <footer className="relative bg-gradient-to-br from-gray-900 via-[#0A0F1C] to-[#112266] text-white overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute -left-40 -top-40 w-96 h-96 transform scale-150">
          <img src="/svgs/logo.svg" alt="Hbee Digitals" className="w-full h-full object-contain filter brightness-0 invert" />
        </div>
        <div className="absolute -right-20 -bottom-20 w-80 h-80 transform scale-125 opacity-30">
          <img src="/svgs/logo.svg" alt="Hbee Digitals" className="w-full h-full object-contain filter brightness-0 invert" />
        </div>
      </div>

      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-[#007BFF] rounded-full filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-[#00BFFF] rounded-full filter blur-3xl opacity-5 animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 md:px-12 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Brand Section */}
          <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="space-y-6">
            <Link href="/" className="inline-block">
              <motion.div className="flex items-center gap-3 group" whileHover={{ scale: 1.02 }} transition={{ duration: 0.3 }}>
                <div className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                  <img src="/svgs/logo.svg" alt="Hbee Digitals" className="w-8 h-8 object-contain" />
                </div>
                <div className="flex flex-col">
                  <span className="font-bold text-xl text-white tracking-wide">{footerData?.logo_text || 'HBEE'}</span>
                  <span className="text-sm font-semibold text-[#00BFFF] tracking-wider">DIGITALS</span>
                </div>
              </motion.div>
            </Link>

            <p className="text-gray-300 max-w-md leading-relaxed text-lg">
              Transforming businesses through innovative digital solutions. We create exceptional experiences that drive growth and success.
            </p>

            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <motion.a
                  key={social.platform}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20 hover:bg-white hover:border-white transition-all duration-300 backdrop-blur-sm group"
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.1, y: -2 }}
                  aria-label={`Follow us on ${social.platform}`}
                >
                  <img src={social.icon} alt={social.platform} className="w-5 h-5 object-contain filter brightness-0 invert group-hover:brightness-0 group-hover:invert-0 transition-all duration-300" />
                </motion.a>
              ))}
            </div>
          </motion.div>

          {/* Columns */}
          <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }} viewport={{ once: true }} className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {columns.map((column, colIndex) => (
              <div key={colIndex}>
                <h3 className="font-bold text-lg text-[#00BFFF] mb-4">{column.title}</h3>
                <ul className="space-y-3">
                  {column.links.map((link, linkIndex) => (
                    <motion.li key={linkIndex} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} transition={{ delay: linkIndex * 0.1 + colIndex * 0.2 }} viewport={{ once: true }}>
                      <Link href={link.href} className="text-gray-300 hover:text-white transition-colors duration-300 text-sm flex items-center group">
                        {link.label}
                        <svg className="w-3 h-3 ml-1 opacity-0 group-hover:opacity-100 transform group-hover:translate-x-1 transition-all duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </motion.li>
                  ))}
                </ul>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Contact Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 pb-8 border-b border-white/10">
          {contactItems.map((item, index) => (
            <motion.div key={index} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.1 }} viewport={{ once: true }}>
              <Link href={item.href} className="flex items-center gap-4 text-gray-300 hover:text-white transition-all duration-300 group">
                <div className="w-10 h-10 bg-gradient-to-br from-[#007BFF] to-[#00BFFF] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <img src={item.icon} alt="" className="w-5 h-5 object-contain filter brightness-0 invert" />
                </div>
                <span className="text-sm font-medium break-words group-hover:text-white">{item.name}</span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom Bar */}
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.6 }} viewport={{ once: true }} className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          <p className="text-gray-400 text-sm">
            {footerData?.copyright_text || `© ${new Date().getFullYear()} Hbee Digitals. All rights reserved.`}
          </p>
          <div className="flex space-x-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors duration-300">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors duration-300">Terms of Service</Link>
            <Link href="/cookies" className="text-gray-400 hover:text-white transition-colors duration-300">Cookie Policy</Link>
          </div>
        </motion.div>

        {/* Back to Top */}
        <motion.button
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-8 right-8 w-12 h-12 bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full flex items-center justify-center text-white shadow-2xl shadow-blue-500/30 hover:shadow-blue-500/50 transition-all duration-300 z-50"
          whileHover={{ scale: 1.1, y: -2 }}
          whileTap={{ scale: 0.9 }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          aria-label="Back to top"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </motion.button>
      </div>
    </footer>
  )
}