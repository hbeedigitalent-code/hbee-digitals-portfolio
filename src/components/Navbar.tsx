'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion'
import ThemeToggle from '@/components/ThemeToggle'

interface NavLink {
  label: string
  href: string
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<NavLink[]>([])
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')

  const pathname = usePathname()
  const mobileMenuRef = useRef<HTMLDivElement>(null)
  const hamburgerRef = useRef<HTMLButtonElement>(null)
  const firstFocusableRef = useRef<HTMLAnchorElement>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
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
              { label: 'Home', href: '/' },
              { label: 'About', href: '/about' },
              { label: 'Services', href: '/services' },
              { label: 'Projects', href: '/projects' },
              { label: 'Blog', href: '/blog' },
              { label: 'FAQ', href: '/faq' },
              { label: 'Contact', href: '/contact' },
            ]
      )

      const { data: settings } = await supabase.from('site_settings').select('*').single()
      if (settings) {
        if (settings.site_name) setSiteName(settings.site_name)
        if (settings.logo_url?.trim()) setLogoUrl(settings.logo_url.trim())
        if (settings.primary_color) {
          document.documentElement.style.setProperty('--primary-color', settings.primary_color)
        }
      }
    }
    fetchData()
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && isMobileMenuOpen) setIsMobileMenuOpen(false) }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
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
    const trap = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus() }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus() }
        }
      }
    }
    menu.addEventListener('keydown', trap)
    return () => menu.removeEventListener('keydown', trap)
  }, [isMobileMenuOpen])

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'backdrop-blur-xl bg-[#0A1D37]/80 border-b border-white/8 shadow-lg'
          : 'bg-transparent'
      }`}
      aria-label="Main navigation"
      role="navigation"
    >
      {/* Footer‑style spacing */}
      <div className="w-full max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center py-3">
        {/* Logo with glow on hover */}
        <Link
          href="/"
          className="flex items-center gap-3 hover:drop-shadow-[0_0_8px_rgba(0,191,255,0.6)] transition-all duration-300"
          aria-label="Hbee Digitals — go to homepage"
        >
          <img
            src={logoUrl}
            alt={`${siteName} logo`}
            className="h-8 lg:h-10 w-auto"
            onError={() => setLogoUrl('/svgs/logo.svg')}
          />
          <span className="text-lg lg:text-xl font-bold" style={{ color: 'var(--secondary-color)' }}>
            {siteName}
          </span>
        </Link>

        {/* Desktop nav links */}
        <LayoutGroup>
          <ul className="hidden lg:flex items-center gap-1" role="list">
            {menuItems.map((link) => {
              const isActive = pathname === link.href
              return (
                <li key={link.href} className="relative">
                  <Link
                    href={link.href}
                    className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                      isActive ? 'text-white' : 'text-white/80 hover:text-white'
                    }`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {link.label}
                    {isActive && (
                      <motion.div
                        layoutId="nav-underline"
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ background: 'linear-gradient(90deg, #007BFF, #00BFFF)' }}
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </LayoutGroup>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <Link
            href="/contact"
            className="hidden lg:inline-flex relative group items-center justify-center px-5 py-2.5 overflow-hidden rounded-full text-sm font-semibold transition-all"
            style={{ minHeight: '48px' }}
          >
            <span className="absolute inset-0 bg-gradient-to-r from-[#007BFF] via-[#00BFFF] to-[#007BFF] bg-[length:200%_100%] animate-shimmer group-hover:animate-shimmer-fast" />
            <span className="relative z-10 text-white">Get Started</span>
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
            className="lg:hidden backdrop-blur-xl bg-[#0A1D37]/95"
            role="dialog"
            aria-label="Mobile navigation"
          >
            <ul className="px-4 py-4 space-y-1" role="list">
              {menuItems.map((link, index) => {
                const isActive = pathname === link.href
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      onClick={closeMobileMenu}
                      ref={index === 0 ? firstFocusableRef : undefined}
                      className={`block px-4 py-3 rounded-lg text-sm transition ${
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
                <Link
                  href="/contact"
                  onClick={closeMobileMenu}
                  className="block mt-3 px-4 py-3 text-center bg-gradient-to-r from-[#007BFF] to-[#00BFFF] rounded-full font-semibold text-white text-sm"
                >
                  Get Started
                </Link>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}