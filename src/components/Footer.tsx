'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import SvgIcon from '@/components/ui/SvgIcon'

interface FooterLink {
  label: string
  href: string
  icon?: string
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

interface SiteSettings {
  site_name?: string
  logo_url?: string
  contact_email?: string
  contact_phone?: string
  contact_address?: string
  footer_description?: string
}

function LogoMark({ logoUrl, brandName }: { logoUrl: string; brandName: string }) {
  return (
    <span className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[var(--accent)]/25 bg-[var(--bg-card)] p-2 transition group-hover:border-[var(--accent)]/40">
      <img
        src={logoUrl}
        alt={`${brandName} logo`}
        className="h-8 w-8 object-contain"
      />
    </span>
  )
}

function getSocialIcon(platform: string): string {
  const platformLower = platform.toLowerCase()
  if (platformLower.includes('facebook')) return 'facebook'
  if (platformLower.includes('whatsapp')) return 'whatsapp'
  if (platformLower.includes('instagram')) return 'instagram'
  if (platformLower.includes('telegram')) return 'telegram'
  if (platformLower.includes('youtube')) return 'video'
  if (platformLower.includes('tiktok')) return 'video'
  return 'verified'
}

// Collapsible section component for mobile
function CollapsibleSection({ title, links, defaultOpen = false }: { title: string; links: FooterLink[]; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className="border-b border-[var(--border)] md:border-none">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between py-3 text-left md:cursor-default md:py-0"
        aria-expanded={isOpen}
      >
        <h4 className="text-sm font-black uppercase tracking-[0.16em] text-[var(--accent)]">
          {title}
        </h4>
        <span className="md:hidden">
          <SvgIcon name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="var(--accent)" />
        </span>
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? 'max-h-96' : 'max-h-0 md:max-h-full'} md:!max-h-full`}>
        <ul className="pb-4 space-y-3 md:pb-0">
          {links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] transition hover:text-[var(--accent)] hover:translate-x-1"
              >
                {link.icon && <SvgIcon name={link.icon} size={14} color="var(--accent)" />}
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default function Footer() {
  const reducedMotion = useReducedMotion()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribeSuccess, setSubscribeSuccess] = useState(false)
  const [subscribeError, setSubscribeError] = useState(false)

  const [footerData, setFooterData] = useState<any>(null)
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({})

  useEffect(() => {
    async function fetchData() {
      const { data: footer } = await supabase.from('footer_settings').select('*').single()
      const { data: site } = await supabase.from('site_settings').select('*').single()
      if (footer) setFooterData(footer)
      if (site) setSiteSettings(site)
    }
    fetchData()
  }, [])

  const brandName = footerData?.logo_text || siteSettings.site_name || 'Hbee Digitals'
  const logoUrl = siteSettings.logo_url || '/svgs/logo.svg'
  const contactEmail = siteSettings.contact_email || 'hello@hbeedigitals.com'
  const contactPhone = siteSettings.contact_phone || '+234 815 315 3827'
  const contactAddress = siteSettings.contact_address || 'Abuja, Nigeria - Serving Brands Internationally'
  const footerDescription = siteSettings.footer_description || 'Premium websites, ecommerce systems, Shopify optimization, and conversion-focused digital experiences.'

  const columns: FooterColumn[] = footerData?.columns?.length ? footerData.columns : [
    {
      title: 'Services',
      links: [
        { label: 'Web Development', href: '/services', icon: 'web-development' },
        { label: 'E-Commerce Solutions', href: '/services', icon: 'ecommerce' },
        { label: 'UI/UX Design', href: '/services', icon: 'ui-ux' },
        { label: 'Digital Marketing', href: '/services', icon: 'digital-marketing' },
        { label: 'Brand Strategy', href: '/services', icon: 'branding' },
        { label: 'Technical Consulting', href: '/services', icon: 'consulting' },
      ],
    },
    {
      title: 'Company',
      links: [
        { label: 'About Us', href: '/about' },
        { label: 'Portfolio', href: '/portfolio' },
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
    ? footerData.social_links.filter((social: SocialLink) => social.is_active !== false && social.url?.trim())
    : []

  async function handleSubscribe(e: React.FormEvent) {
  e.preventDefault();
  if (!email) return;
  
  setSubscribing(true);
  setSubscribeError(false);
  setSubscribeSuccess(false);
  
  try {
    console.log('Subscribing:', { email, name });
    
    const response = await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, name, source: 'footer' }),
    });

    const data = await response.json();
    console.log('Response:', data);

    if (response.ok) {
      setSubscribeSuccess(true);
      setEmail('');
      setName('');
      // Auto-hide success message after 3 seconds
      setTimeout(() => setSubscribeSuccess(false), 3000);
    } else {
      console.error('Subscription failed:', data.error);
      setSubscribeError(true);
      setTimeout(() => setSubscribeError(false), 3000);
    }
  } catch (error) {
    console.error('Network error:', error);
    setSubscribeError(true);
    setTimeout(() => setSubscribeError(false), 3000);
  } finally {
    setSubscribing(false);
  }
}

  return (
    <footer className="relative overflow-hidden bg-[var(--bg-navy)] text-[var(--text-inverse)]">
      {/* Gradient top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[var(--accent)] via-[var(--accent-orange)] to-[var(--accent-lime)]" />
      
      <div className="absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute left-0 top-0 h-[340px] w-[420px] rounded-full bg-[var(--accent)]/6 blur-[110px]" />
        <div className="absolute bottom-0 right-0 h-[300px] w-[380px] rounded-full bg-[var(--accent-orange)]/8 blur-[110px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-5 py-10 sm:px-6 md:px-10 lg:px-12">
        {/* Top Section - Brand + Rating + Partner Badges */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border)] pb-6">
          <Link href="/" className="group inline-flex items-center gap-3">
            <LogoMark logoUrl={logoUrl} brandName={brandName} />
            <div>
              <h2 className="text-lg font-black tracking-[-0.04em] text-[var(--text-inverse)]">
                {brandName}
              </h2>
              <p className="text-[10px] text-[var(--accent)]">Digital Growth Studio</p>
            </div>
          </Link>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex text-[var(--accent)]">
                <span>★★★★★</span>
              </div>
              <span className="text-sm font-black text-[var(--text-inverse)]">4.8</span>
              <span className="text-xs text-[var(--text-muted)]">Excellent • Verified</span>
            </div>
            <div className="flex gap-2">
              <span className="rounded-full border border-[var(--accent)]/20 bg-[var(--accent)]/10 px-3 py-1 text-[9px] font-black uppercase text-[var(--accent)]">
                Shopify Partner
              </span>
              <span className="rounded-full border border-[var(--accent-orange)]/20 bg-[var(--accent-orange)]/10 px-3 py-1 text-[9px] font-black uppercase text-[var(--accent-orange)]">
                Google Partner
              </span>
            </div>
          </div>
        </div>

        {/* Main Footer Grid */}
        <div className="grid gap-6 md:grid-cols-4">
          {/* Brand Description Column */}
          <div className="space-y-3">
            <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
              {footerDescription}
            </p>
            {socialLinks.length > 0 && (
              <div className="flex gap-2 pt-2">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={social.platform}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--bg-section)] transition hover:border-[var(--accent)]/25 hover:bg-[var(--accent)]/10 hover:scale-105"
                  >
                    <SvgIcon name={getSocialIcon(social.icon || social.platform)} size={14} color="var(--accent)" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {columns.map((column) => (
            <CollapsibleSection key={column.title} title={column.title} links={column.links} defaultOpen />
          ))}
        </div>

        {/* Newsletter Section */}
        <div className="mt-8 rounded-xl border border-[var(--border)] bg-gradient-to-r from-[var(--bg-card)] to-[var(--bg-section)] p-5">
          <div className="grid gap-4 md:grid-cols-2 md:items-center">
            <div>
              <h3 className="text-base font-black text-[var(--text-inverse)]">Stay up to date</h3>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">
                Get notified about new updates, products, tips and tutorials. No spam. You can always unsubscribe.
              </p>
            </div>
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2 sm:flex-row">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your Email"
                required
                className="flex-1 rounded-full border border-[var(--border)] bg-[var(--bg-section)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--accent)]/50"
              />
              <button
                type="submit"
                disabled={subscribing}
                className="inline-flex min-h-[40px] items-center justify-center rounded-full bg-gradient-orange-green px-5 py-2 text-sm font-black text-white transition hover:scale-[1.02] disabled:opacity-60"
              >
                {subscribing ? 'Subscribing...' : subscribeSuccess ? '✓ Subscribed!' : subscribeError ? '✗ Failed' : 'Subscribe'}
              </button>
            </form>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex flex-wrap gap-4 text-xs text-[var(--text-secondary)]">
            <a href={`mailto:${contactEmail}`} className="flex items-center gap-1.5 hover:text-[var(--accent)]">
              <SvgIcon name="email" size={14} color="var(--accent)" />
              {contactEmail}
            </a>
            <a href={`tel:${contactPhone.replace(/\s/g, '')}`} className="flex items-center gap-1.5 hover:text-[var(--accent)]">
              <SvgIcon name="phone" size={14} color="var(--accent)" />
              {contactPhone}
            </a>
            <div className="flex items-center gap-1.5">
              <SvgIcon name="location" size={14} color="var(--accent)" />
              {contactAddress}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-4 flex flex-col gap-3 text-center text-xs text-[var(--text-muted)] md:flex-row md:items-center md:justify-between md:text-left">
          <p>{footerData?.copyright_text || `© ${new Date().getFullYear()} ${brandName}. All rights reserved.`}</p>

          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/portfolio" className="hover:text-[var(--accent)]">Portfolio</Link>
            <Link href="/before-after" className="hover:text-[var(--accent)]">Before & After</Link>
            <Link href="/reviews" className="hover:text-[var(--accent)]">Reviews</Link>
            <Link href="/pricing" className="hover:text-[var(--accent)]">Pricing</Link>
            <Link href="/faq" className="hover:text-[var(--accent)]">FAQ</Link>
            <Link href="/contact" className="hover:text-[var(--accent)]">Contact</Link>
            <Link href="/privacy" className="hover:text-[var(--accent)]">Privacy</Link>
            <Link href="/terms" className="hover:text-[var(--accent)]">Terms</Link>
            <Link href="/cookies" className="hover:text-[var(--accent)]">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}