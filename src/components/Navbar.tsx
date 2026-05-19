'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import SvgIcon from '@/components/ui/SvgIcon'

interface NavLink {
  label: string
  href: string
}

const fallbackMenu: NavLink[] = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Portfolio', href: '/portfolio' },
  { label: 'Services', href: '/services' },
  { label: 'FAQs', href: '/faqs' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/blog' },
]

export default function Navbar() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<NavLink[]>(fallbackMenu)
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')

  const firstFocusableRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28)
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('label, href')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (menuData?.length) setMenuItems(menuData)

      const { data: settings } = await supabase.from('site_settings').select('*').single()

      if (settings) {
        if (settings.site_name) setSiteName(settings.site_name)
        if (settings.logo_url?.trim()) setLogoUrl(settings.logo_url.trim())

        const root = document.documentElement
        if (settings.primary_color) root.style.setProperty('--accent-color', settings.primary_color)
        if (settings.background_color) root.style.setProperty('--bg-color', settings.background_color)
        if (settings.text_color) root.style.setProperty('--text-color', settings.text_color)
      }
    }

    fetchData()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsMobileMenuOpen(false)
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      setTimeout(() => firstFocusableRef.current?.focus(), 100)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-4 pt-4 md:px-6"
    >
      <nav
        aria-label="Main navigation"
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-4 py-3 transition-all duration-300 md:px-5 ${
          scrolled
            ? 'border-white/10 bg-[#060E1C]/82 shadow-[0_18px_70px_rgba(0,0,0,0.42)] backdrop-blur-2xl'
            : 'border-white/12 bg-[#060E1C]/58 backdrop-blur-xl'
        }`}
      >
        <Link href="/" className="group flex items-center gap-3" aria-label={`${siteName} homepage`}>
          <span className="relative flex h-10 w-10 items-center justify-center rounded-2xl border border-[#39D97A]/12 bg-white/[0.03] transition group-hover:border-[#39D97A]/30 group-hover:bg-[#39D97A]/8">
            <img
              src={logoUrl}
              alt={`${siteName} logo`}
              className="h-7 w-7 object-contain"
              onError={() => setLogoUrl('/svgs/logo.svg')}
            />
          </span>

          <span className="hidden text-sm font-black tracking-[-0.03em] text-white sm:block">
            {siteName}
          </span>
        </Link>

        <LayoutGroup>
          <ul className="hidden items-center gap-1 lg:flex">
            {menuItems.map((link) => {
              const isActive = pathname === link.href

              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={`relative inline-flex rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                      isActive ? 'text-white' : 'text-white/62 hover:text-white'
                    }`}
                  >
                    {link.label}

                    {isActive && (
                      <motion.span
                        layoutId="active-nav-pill"
                        className="absolute inset-0 -z-10 rounded-full border border-[#39D97A]/22 bg-[#39D97A]/10 shadow-[0_0_24px_rgba(57,217,122,0.08)]"
                        transition={{ type: 'spring', stiffness: 360, damping: 32 }}
                      />
                    )}

                    {!isActive && (
                      <span className="absolute bottom-1.5 left-1/2 h-px w-0 -translate-x-1/2 bg-gradient-to-r from-[#39D97A] to-[#C6F135] transition-all duration-300 hover:w-1/2" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </LayoutGroup>

        <div className="flex items-center gap-2">
          <ThemeToggle />

          <Link
            href="/contact"
            className="group hidden items-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-5 py-2.5 text-sm font-black text-[#06101F] shadow-[0_0_28px_rgba(57,217,122,0.22)] transition hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(57,217,122,0.32)] lg:inline-flex"
          >
            Get Free Audit
            <SvgIcon
              name="arrow-diagonal"
              size={16}
              color="#06101F"
              className="transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            />
          </Link>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:border-[#39D97A]/25 hover:bg-[#39D97A]/10 lg:hidden"
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <SvgIcon
              name={isMobileMenuOpen ? 'close' : 'menu'}
              size={20}
              color={isMobileMenuOpen ? '#C6F135' : '#F8FAFC'}
            />
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ duration: 0.25 }}
            className="mx-auto mt-3 max-w-7xl overflow-hidden rounded-[1.7rem] border border-white/10 bg-[#060E1C]/96 p-4 shadow-[0_30px_90px_rgba(0,0,0,0.45)] backdrop-blur-2xl lg:hidden"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(57,217,122,0.14),transparent_42%)]" />

            <ul className="relative space-y-1">
              {menuItems.map((link, index) => {
                const isActive = pathname === link.href

                return (
                  <li key={link.href}>
                    <Link
                      ref={index === 0 ? firstFocusableRef : undefined}
                      href={link.href}
                      onClick={closeMobileMenu}
                      aria-current={isActive ? 'page' : undefined}
                      className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold transition ${
                        isActive
                          ? 'border border-[#39D97A]/20 bg-[#39D97A]/10 text-[#39D97A]'
                          : 'text-white/72 hover:bg-white/[0.045] hover:text-white'
                      }`}
                    >
                      {link.label}
                      <SvgIcon
                        name="arrow-diagonal"
                        size={14}
                        color={isActive ? '#39D97A' : 'rgba(248,250,252,0.5)'}
                      />
                    </Link>
                  </li>
                )
              })}

              <li className="pt-3">
                <Link
                  href="/contact"
                  onClick={closeMobileMenu}
                  className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#39D97A] to-[#C6F135] px-5 py-3 text-sm font-black text-[#06101F]"
                >
                  Get Free Audit
                  <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  )
}