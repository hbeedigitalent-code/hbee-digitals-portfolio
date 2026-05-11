'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'
import ThemeToggle from '@/components/ThemeToggle'
import LanguageSwitcher from '@/components/LanguageSwitcher'
import { useTranslations } from 'next-intl'

interface NavLink {
  label: string
  href: string
}

export default function Navbar() {
  const t = useTranslations('nav')

  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<NavLink[]>([])
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [headerColor, setHeaderColor] = useState('#0A1D37')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')

  const pathname = usePathname()
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const firstFocusableRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 60)
    window.addEventListener('scroll', handleScroll, { passive: true })
    fetchData()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) setIsMobileMenuOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (isMobileMenuOpen) setTimeout(() => firstFocusableRef.current?.focus(), 100)
  }, [isMobileMenuOpen])

  useEffect(() => {
    if (!isMobileMenuOpen) return
    const menu = mobileMenuRef.current
    if (!menu) return
    const focusable = menu.querySelectorAll<HTMLElement>('a, button, input, textarea, select')
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const handleTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    menu.addEventListener('keydown', handleTab)
    return () => menu.removeEventListener('keydown', handleTab)
  }, [isMobileMenuOpen])

  const fetchData = async () => {
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('label, href')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    setMenuItems(
      menuData?.length
        ? menuData
        : [
            { label: t('home'), href: '/' },
            { label: t('about'), href: '/about' },
            { label: t('services'), href: '/services' },
            { label: t('projects'), href: '/projects' },
            { label: t('blog'), href: '/blog' },
            { label: t('faq'), href: '/faq' },
            { label: t('contact'), href: '/contact' },
          ]
    )

    const { data: settings } = await supabase.from('site_settings').select('*').single()
    if (settings) {
      if (settings.site_name) setSiteName(settings.site_name)
      if (settings.logo_url?.trim()) setLogoUrl(settings.logo_url.trim())
      if (settings.primary_color) {
        setHeaderColor(settings.primary_color)
        document.documentElement.style.setProperty('--primary-color', settings.primary_color)
      }
    }
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'backdrop-blur-xl bg-[var(--primary-color)]/90 border-b border-[var(--card-border)] shadow-lg' : 'bg-transparent'
      }`}
      aria-label="Main navigation"
      role="navigation"
    >
      <div className="container mx-auto px-4 lg:px-8 flex justify-between items-center py-3">
        <Link href="/" className="flex items-center gap-3" aria-label="Hbee Digitals — go to homepage">
          <img src={logoUrl} alt={`${siteName} logo`} className="h-8 lg:h-10 w-auto" onError={() => setLogoUrl('/svgs/logo.svg')} />
          <span className="text-lg lg:text-xl font-bold" style={{ color: 'var(--secondary-color)' }}>{siteName}</span>
        </Link>

        <ul className="hidden lg:flex items-center gap-1" role="list">
          {menuItems.map((link) => {
            const isActive = pathname === link.href
            return (
              <li key={link.href} className="relative">
                <Link
                  href={link.href}
                  className={`relative px-4 py-2 text-sm font-medium transition-all duration-300 rounded-lg ${
                    isActive ? 'bg-[var(--accent-color)]/10' : 'hover:bg-white/10'
                  }`}
                  style={{ color: 'var(--secondary-color)' }}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {link.label}
                  <span className={`absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] bg-gradient-to-r from-[#007BFF] to-[#00BFFF] transition-all duration-300 ${
                    isActive ? 'w-[70%]' : 'w-0 group-hover:w-[70%]'
                  }`}></span>
                </Link>
              </li>
            )
          })}
        </ul>

        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          <Link href="/contact"
            className="hidden lg:inline-flex relative group items-center justify-center px-5 py-2.5 overflow-hidden rounded-full text-sm font-semibold transition-all"
            style={{ minHeight: '48px' }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#007BFF] via-[#00BFFF] to-[#007BFF] bg-[length:200%_100%] animate-shimmer group-hover:animate-shimmer-fast" />
            <span className="relative z-10 text-white">{t('getStarted')}</span>
          </Link>

          <button
            ref={hamburgerRef}
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-md hover:bg-white/10 transition"
            style={{ color: 'var(--secondary-color)' }}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {isMobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            ref={mobileMenuRef}
            id="mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden backdrop-blur-xl bg-[var(--primary-color)]/95"
            role="dialog"
            aria-label="Mobile navigation"
          >
            <ul className="px-4 py-4 space-y-1" role="list">
              {menuItems.map((link, index) => {
                const isActive = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link href={link.href} onClick={closeMobileMenu} ref={index === 0 ? firstFocusableRef : undefined}
                      className={`block px-4 py-3 rounded-lg text-sm transition-all duration-300 ${
                        isActive ? 'bg-[var(--accent-color)]/10 font-medium' : 'hover:bg-white/10'
                      }`}
                      style={{ color: 'var(--secondary-color)' }}
                      aria-current={isActive ? 'page' : undefined}
                    >
                      {link.label}
                    </Link>
                  </li>
                )
              })}
              <li>
                <Link href="/contact" onClick={closeMobileMenu}
                  className="block mt-3 px-4 py-3 text-center bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full font-semibold text-white text-sm">
                  {t('getStarted')}
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}