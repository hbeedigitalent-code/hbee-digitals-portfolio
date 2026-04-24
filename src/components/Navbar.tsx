'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

interface NavLink {
  label: string
  href: string
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [menuItems, setMenuItems] = useState<NavLink[]>([])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10)
    }
    window.addEventListener('scroll', handleScroll)
    
    // Fetch menu items from database
    const fetchMenuItems = async () => {
      const { data } = await supabase
        .from('menu_items')
        .select('label, href')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
      
      if (data && data.length > 0) {
        setMenuItems(data)
      } else {
        // Fallback menu if nothing in database
        setMenuItems([
          { label: 'Home', href: '/' },
          { label: 'About', href: '/about' },
          { label: 'Projects', href: '/projects' },
          { label: 'Contact', href: '/contact' },
        ])
      }
    }
    
    fetchMenuItems()
    
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <nav 
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled ? 'backdrop-blur-md py-3' : 'py-5'
      }`}
      style={{ backgroundColor: 'var(--primary-color)' }}
    >
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-white">
          Hbee Digitals
        </Link>

        <div className="hidden md:flex space-x-8">
          {menuItems.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-white transition hover:opacity-80"
            >
              {link.label}
            </Link>
          ))}
        </div>

        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden text-white focus:outline-none"
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

      {isMobileMenuOpen && (
        <div className="md:hidden py-4 px-4" style={{ backgroundColor: 'var(--primary-color)' }}>
          {menuItems.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              className="block py-2 text-white transition hover:opacity-80"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  )
}