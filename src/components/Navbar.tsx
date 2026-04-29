'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { motion, AnimatePresence } from 'framer-motion'

interface NavLink {
  label: string
  href: string
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<NavLink[]>([])
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [headerColor, setHeaderColor] = useState('#0A1D37')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    fetchData()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const fetchData = async () => {
    const { data: menuData } = await supabase
      .from('menu_items')
      .select('label, href')
      .eq('is_active', true)
      .order('display_order', { ascending: true })

    setMenuItems(menuData?.length ? menuData : [
      { label: 'Home', href: '/' },
      { label: 'About', href: '/about' },
      { label: 'Services', href: '/services' },
      { label: 'Projects', href: '/projects' },
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
      { label: 'Contact', href: '/contact' },
    ])

    const { data: settings } = await supabase.from('site_settings').select('*').single()
    if (settings) {
      if (settings.site_name) setSiteName(settings.site_name)
      if (settings.logo_url && settings.logo_url.trim().length > 0) {
        setLogoUrl(settings.logo_url.trim())
      }
      if (settings.primary_color) {
        setHeaderColor(settings.primary_color)
        document.documentElement.style.setProperty('--primary-color', settings.primary_color)
      }
    }
  }

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'shadow-lg backdrop-blur-md py-2' : 'py-3 lg:py-4'}`}
      style={{ backgroundColor: isScrolled ? `${headerColor}ee` : headerColor }}
    >
      <div className="container mx-auto px-4 lg:px-8 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3">
          <img src={logoUrl} alt={siteName} className="h-8 lg:h-10 w-auto" onError={() => setLogoUrl('/svgs/logo.svg')} />
          <span className="text-lg lg:text-xl font-bold text-white">{siteName}</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((link) => (
            <Link key={link.href} href={link.href} className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition text-sm font-medium">
              {link.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <Link href="/contact" className="hidden lg:inline-flex px-5 py-2.5 bg-white text-sm font-semibold rounded-lg hover:shadow-lg transition" style={{ color: headerColor }}>
            Get Started
          </Link>
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="lg:hidden text-white p-2">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="lg:hidden" style={{ backgroundColor: `${headerColor}f5` }}>
            <div className="px-4 py-4 space-y-1">
              {menuItems.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setIsMobileMenuOpen(false)} className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg text-sm">{link.label}</Link>
              ))}
              <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="block mt-3 px-4 py-3 text-center bg-white rounded-lg font-semibold text-sm" style={{ color: headerColor }}>Get Started</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}