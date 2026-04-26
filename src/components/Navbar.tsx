'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
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
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [headerColor, setHeaderColor] = useState('#0A1D37')

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)

    const fetchData = async () => {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('label, href')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (menuData && menuData.length > 0) {
        setMenuItems(menuData)
      } else {
        setMenuItems([
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: 'Services', href: '/services' },
          { label: 'Projects', href: '/projects' },
          { label: 'Blog', href: '/blog' },
          { label: 'Contact', href: '/contact' },
        ])
      }

      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('*')
        .single()

      if (settingsData) {
        if (settingsData.site_name) setSiteName(settingsData.site_name)
        if (settingsData.logo_url) setLogoUrl(settingsData.logo_url)
        if (settingsData.primary_color) setHeaderColor(settingsData.primary_color)
      }
    }

    fetchData()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'shadow-lg backdrop-blur-md py-2'
          : 'py-3 lg:py-4'
      }`}
      style={{ backgroundColor: isScrolled ? `${headerColor}ee` : headerColor }}
    >
      <div className="container mx-auto px-4 lg:px-8 flex justify-between items-center">
        {/* Logo / Site Name */}
        <Link href="/" className="flex items-center gap-3 group">
          {logoUrl ? (
            <div className="relative h-9 lg:h-10 w-28 lg:w-32">
              <Image
                src={logoUrl}
                alt={siteName}
                fill
                className="object-contain"
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <motion.div
                whileHover={{ rotate: 10 }}
                className="w-9 h-9 lg:w-10 lg:h-10 bg-white/10 rounded-lg flex items-center justify-center group-hover:bg-white/20 transition"
              >
                <span className="text-white font-bold text-base lg:text-lg">
                  {siteName.charAt(0)}
                </span>
              </motion.div>
              <span className="text-lg lg:text-xl font-bold text-white hidden sm:block">
                {siteName}
              </span>
            </div>
          )}
        </Link>

        {/* Desktop Menu */}
        <div className="hidden lg:flex items-center gap-1">
          {menuItems.map((link, index) => (
            <motion.div
              key={link.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.05 }}
            >
              <Link
                href={link.href}
                className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200 text-sm font-medium"
              >
                {link.label}
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Get Started + Mobile Toggle */}
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8 }}
          >
            <Link
              href="/contact"
              className="hidden lg:inline-flex px-5 py-2.5 bg-white text-sm font-semibold rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200"
              style={{ color: headerColor }}
            >
              Get Started
            </Link>
          </motion.div>

          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden text-white p-2 hover:bg-white/10 rounded-lg transition"
            aria-label="Toggle menu"
          >
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

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden overflow-hidden"
            style={{ backgroundColor: `${headerColor}f5` }}
          >
            <div className="px-4 py-4 space-y-1">
              {menuItems.map((link, index) => (
                <motion.div
                  key={link.href}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Link
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-4 py-3 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition text-sm"
                  >
                    {link.label}
                  </Link>
                </motion.div>
              ))}
              <Link
                href="/contact"
                onClick={() => setIsMobileMenuOpen(false)}
                className="block mt-3 px-4 py-3 text-center bg-white rounded-lg font-semibold text-sm hover:shadow-lg transition"
                style={{ color: headerColor }}
              >
                Get Started
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}