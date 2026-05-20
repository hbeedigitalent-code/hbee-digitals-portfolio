'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import ThemeToggle from '@/components/ThemeToggle'
import SvgIcon from '@/components/ui/SvgIcon'

interface NavLink {
  label: string
  href: string
  icon?: string
  description?: string
}

interface NavGroup extends NavLink {
  children?: NavLink[]
}

const fallbackMenu: NavGroup[] = [
  { label: 'Home', href: '/', icon: 'home' },
  {
    label: 'Services',
    href: '/services',
    icon: 'services',
    children: [
      {
        label: 'Website Design',
        href: '/services',
        icon: 'web',
        description: 'Premium websites built for trust and conversion.',
      },
      {
        label: 'Ecommerce Solutions',
        href: '/services',
        icon: 'ecommerce',
        description: 'Shopify and ecommerce systems that support growth.',
      },
      {
        label: 'Brand Experience',
        href: '/services',
        icon: 'design',
        description: 'Clean brand visuals, structure, and digital presence.',
      },
      {
        label: 'Technical Consulting',
        href: '/services',
        icon: 'consulting',
        description: 'Practical guidance for fixing and scaling digital systems.',
      },
    ],
  },
  {
    label: 'Portfolio',
    href: '/portfolio',
    icon: 'portfolio',
    children: [
      {
        label: 'All Case Studies',
        href: '/portfolio',
        icon: 'portfolio',
        description: 'Browse selected stores, websites, and growth systems.',
      },
      {
        label: 'Projects',
        href: '/projects',
        icon: 'projects',
        description: 'Explore project work and implementation examples.',
      },
    ],
  },
  {
    label: 'Company',
    href: '/about',
    icon: 'services',
    children: [
      {
        label: 'About Us',
        href: '/about',
        icon: 'services',
        description: 'Learn about Hbee Digitals and how we work.',
      },
      {
        label: 'Our Process',
        href: '/process',
        icon: 'rocket',
        description: 'See how we move from audit to launch.',
      },
      {
        label: 'FAQ',
        href: '/faq',
        icon: 'messages',
        description: 'Answers to common project and service questions.',
      },
    ],
  },
  {
    label: 'Resources',
    href: '/blog',
    icon: 'blog',
    children: [
      {
        label: 'Blog',
        href: '/blog',
        icon: 'blog',
        description: 'Insights on Shopify, websites, branding, and growth.',
      },
      {
        label: 'Privacy Policy',
        href: '/privacy',
        icon: 'security',
        description: 'How we handle information and privacy.',
      },
      {
        label: 'Cookie Policy',
        href: '/cookies',
        icon: 'security',
        description: 'How cookies are used on the website.',
      },
    ],
  },
  { label: 'Contact', href: '/contact', icon: 'messages' },
]

function isActiveRoute(pathname: string, href: string) {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function isGroupActive(pathname: string, group: NavGroup) {
  if (isActiveRoute(pathname, group.href)) return true
  return group.children?.some((child) => isActiveRoute(pathname, child.href)) || false
}

function cleanHref(href: string) {
  if (href === '/faqs') return '/faq'
  return href
}

export default function Navbar() {
  const pathname = usePathname()
  const reducedMotion = useReducedMotion()

  const [scrolled, setScrolled] = useState(false)
  const [showNavbar, setShowNavbar] = useState(true)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [menuItems, setMenuItems] = useState<NavGroup[]>(fallbackMenu)
  const [siteName, setSiteName] = useState('Hbee Digitals')
  const [logoUrl, setLogoUrl] = useState('/svgs/logo.svg')

  const lastScrollY = useRef(0)
  const firstFocusableRef = useRef<HTMLAnchorElement>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const desktopMenu = useMemo(() => {
    const coreLabels = ['Home', 'Services', 'Portfolio', 'Company', 'Resources', 'Contact']

    const enhanced = fallbackMenu.map((fallback) => {
      const matched = menuItems.find(
        (item) =>
          item.label.toLowerCase() === fallback.label.toLowerCase() ||
          item.href === fallback.href
      )

      return {
        ...fallback,
        href: matched?.href ? cleanHref(matched.href) : fallback.href,
      }
    })

    const extraItems = menuItems.filter(
      (item) =>
        !coreLabels.includes(item.label) &&
        !enhanced.some((nav) => nav.href === cleanHref(item.href))
    )

    return [...enhanced, ...extraItems]
  }, [menuItems])

  const handleDropdownEnter = (label: string) => {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
    setOpenDropdown(label)
    setShowNavbar(true)
  }

  const handleDropdownLeave = () => {
    closeTimerRef.current = setTimeout(() => setOpenDropdown(null), 120)
  }

  useEffect(() => {
    let ticking = false

    const onScroll = () => {
      if (ticking) return

      window.requestAnimationFrame(() => {
        const currentY = window.scrollY
        const scrollingDown = currentY > lastScrollY.current
        const scrollingUp = currentY < lastScrollY.current

        setScrolled(currentY > 24)

        if (!isMobileMenuOpen && !openDropdown) {
          if (currentY < 90) {
            setShowNavbar(true)
          } else if (scrollingDown && currentY > 180) {
            setShowNavbar(false)
          } else if (scrollingUp) {
            setShowNavbar(true)
          }
        }

        lastScrollY.current = currentY
        ticking = false
      })

      ticking = true
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [isMobileMenuOpen, openDropdown])

  useEffect(() => {
    const fetchData = async () => {
      const { data: menuData } = await supabase
        .from('menu_items')
        .select('label, href')
        .eq('is_active', true)
        .order('display_order', { ascending: true })

      if (menuData?.length) {
        const cleanedMenu: NavGroup[] = menuData.map((item) => ({
          label: item.label,
          href: cleanHref(item.href),
        }))

        setMenuItems(cleanedMenu)
      }

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
    setIsMobileMenuOpen(false)
    setOpenDropdown(null)
    setShowNavbar(true)
  }, [pathname])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false)
        setOpenDropdown(null)
        setShowNavbar(true)
      }
    }

    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
      setShowNavbar(true)
      window.setTimeout(() => firstFocusableRef.current?.focus(), 90)
    } else {
      document.body.style.overflow = ''
    }

    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  return (
    <>
      <motion.header
        initial={reducedMotion ? false : { y: -72, opacity: 0 }}
        animate={{
          y: showNavbar ? 0 : -95,
          opacity: showNavbar ? 1 : 0,
        }}
        transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4"
        onMouseEnter={() => setShowNavbar(true)}
      >
        <nav
          aria-label="Main navigation"
          className={`mx-auto flex max-w-7xl items-center justify-between rounded-full border px-3 py-2.5 transition-all duration-300 sm:px-4 md:px-5 ${
            scrolled
              ? 'border-[#1E314A] bg-[#07111F] shadow-[0_18px_70px_rgba(0,0,0,0.38)]'
              : 'border-[#1E314A]/70 bg-[#0B1728] shadow-[0_12px_45px_rgba(0,0,0,0.25)]'
          }`}
        >
          <Link
            href="/"
            className="group flex min-w-0 items-center gap-3"
            aria-label={`${siteName} homepage`}
          >
            <span className="relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/16 bg-[#0E1B2D] transition duration-300 group-hover:border-[#39D97A]/35 group-hover:bg-[#13233A]">
              <img
                src={logoUrl}
                alt={`${siteName} logo`}
                className="h-7 w-7 object-contain"
                onError={() => setLogoUrl('/svgs/logo.svg')}
              />
            </span>

            <span className="hidden min-w-0 text-sm font-black tracking-[-0.03em] text-white sm:block">
              {siteName}
            </span>
          </Link>

          <LayoutGroup>
            <ul className="hidden items-center gap-1 lg:flex">
              {desktopMenu.map((link) => {
                const active = isGroupActive(pathname, link)
                const hasChildren = Boolean(link.children?.length)
                const opened = openDropdown === link.label

                return (
                  <li
                    key={`${link.label}-${link.href}`}
                    className="relative"
                    onMouseEnter={() => hasChildren && handleDropdownEnter(link.label)}
                    onMouseLeave={() => hasChildren && handleDropdownLeave()}
                  >
                    <Link
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      onFocus={() => hasChildren && setOpenDropdown(link.label)}
                      className={`relative inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                        active ? 'text-white' : 'text-white/64 hover:text-white'
                      }`}
                    >
                      <span className="relative z-10">{link.label}</span>

                      {hasChildren && (
                        <SvgIcon
                          name="chevron-down"
                          size={12}
                          color={active ? '#39D97A' : 'rgba(255,255,255,0.55)'}
                          className={`relative z-10 transition duration-300 ${
                            opened ? 'rotate-180' : ''
                          }`}
                        />
                      )}

                      {active && (
                        <motion.span
                          layoutId="active-nav-pill"
                          className="absolute inset-0 rounded-full border border-[#39D97A]/24 bg-[#39D97A]/10"
                          transition={{ type: 'spring', stiffness: 360, damping: 34 }}
                        />
                      )}
                    </Link>

                    <AnimatePresence>
                      {hasChildren && opened && (
                        <motion.div
                          initial={reducedMotion ? false : { opacity: 0, y: 12, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={reducedMotion ? undefined : { opacity: 0, y: 8, scale: 0.98 }}
                          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                          className="absolute left-1/2 top-[calc(100%+14px)] w-[410px] -translate-x-1/2 overflow-hidden rounded-[1.5rem] border border-[#1E314A] bg-[#0B1728] p-3 shadow-[0_30px_90px_rgba(0,0,0,0.46)]"
                        >
                          <div className="relative space-y-1">
                            {link.children?.map((child) => {
                              const childActive = isActiveRoute(pathname, child.href)

                              return (
                                <Link
                                  key={`${child.label}-${child.href}`}
                                  href={child.href}
                                  className={`group flex gap-4 rounded-[1.15rem] border p-4 transition-all duration-300 ${
                                    childActive
                                      ? 'border-[#39D97A]/25 bg-[#13233A]'
                                      : 'border-transparent bg-[#0E1B2D] hover:border-[#39D97A]/20 hover:bg-[#13233A]'
                                  }`}
                                >
                                  <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl border border-[#39D97A]/18 bg-[#39D97A]/10">
                                    <SvgIcon
                                      name={child.icon || 'services'}
                                      size={20}
                                      color="#39D97A"
                                    />
                                  </span>

                                  <span>
                                    <span className="block text-sm font-black text-white">
                                      {child.label}
                                    </span>

                                    {child.description && (
                                      <span className="mt-1 block text-xs leading-5 text-white/56">
                                        {child.description}
                                      </span>
                                    )}
                                  </span>

                                  <SvgIcon
                                    name="arrow-diagonal"
                                    size={13}
                                    color="#39D97A"
                                    className="ml-auto mt-1 opacity-0 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:opacity-100"
                                  />
                                </Link>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </li>
                )
              })}
            </ul>
          </LayoutGroup>

          <div className="flex items-center gap-2">
            <ThemeToggle />

            <Link
              href="/contact"
              className="group hidden items-center gap-2 rounded-full bg-[#39D97A] px-5 py-2.5 text-sm font-black text-[#06101F] shadow-[0_0_28px_rgba(57,217,122,0.2)] transition hover:scale-[1.02] hover:bg-[#C6F135] lg:inline-flex"
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
              className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#1E314A] bg-[#0E1B2D] transition hover:border-[#39D97A]/28 hover:bg-[#13233A] lg:hidden"
              aria-expanded={isMobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            >
              <span className="relative h-4 w-5">
                <span
                  className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-white transition duration-300 ${
                    isMobileMenuOpen ? 'translate-y-[7px] rotate-45 bg-[#39D97A]' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-white transition duration-300 ${
                    isMobileMenuOpen ? 'opacity-0' : ''
                  }`}
                />
                <span
                  className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-white transition duration-300 ${
                    isMobileMenuOpen ? '-translate-y-[7px] -rotate-45 bg-[#39D97A]' : ''
                  }`}
                />
              </span>
            </button>
          </div>
        </nav>
      </motion.header>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Close menu overlay"
              onClick={() => setIsMobileMenuOpen(false)}
              initial={reducedMotion ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0 }}
              className="fixed inset-0 z-40 bg-[#02070F]/72 lg:hidden"
            />

            <motion.div
              id="mobile-menu"
              initial={reducedMotion ? false : { opacity: 0, y: -18, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -18, scale: 0.97 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="fixed left-3 right-3 top-[74px] z-50 max-h-[calc(100vh-92px)] overflow-y-auto rounded-[1.7rem] border border-[#1E314A] bg-[#0B1728] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.5)] sm:left-5 sm:right-5 lg:hidden"
            >
              <ul className="space-y-2">
                {desktopMenu.map((link, index) => {
                  const active = isGroupActive(pathname, link)
                  const hasChildren = Boolean(link.children?.length)

                  return (
                    <motion.li
                      key={`${link.label}-${link.href}`}
                      initial={reducedMotion ? false : { opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.22, delay: index * 0.035 }}
                    >
                      <Link
                        ref={index === 0 ? firstFocusableRef : undefined}
                        href={link.href}
                        aria-current={active ? 'page' : undefined}
                        className={`group flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition ${
                          active
                            ? 'border-[#39D97A]/20 bg-[#13233A] text-[#39D97A]'
                            : 'border-transparent bg-[#0E1B2D] text-white/72 hover:border-[#1E314A] hover:bg-[#13233A] hover:text-white'
                        }`}
                      >
                        <span className="inline-flex items-center gap-3">
                          <SvgIcon
                            name={link.icon || 'services'}
                            size={16}
                            color={active ? '#39D97A' : 'rgba(255,255,255,0.65)'}
                          />
                          {link.label}
                        </span>

                        <SvgIcon
                          name="arrow-diagonal"
                          size={14}
                          color={active ? '#39D97A' : 'rgba(248,250,252,0.5)'}
                        />
                      </Link>

                      {hasChildren && (
                        <div className="ml-4 mt-2 space-y-1 border-l border-[#1E314A] pl-3">
                          {link.children?.map((child) => {
                            const childActive = isActiveRoute(pathname, child.href)

                            return (
                              <Link
                                key={`${child.label}-${child.href}`}
                                href={child.href}
                                className={`flex items-start gap-3 rounded-2xl px-3 py-3 text-sm transition ${
                                  childActive
                                    ? 'bg-[#13233A] text-[#39D97A]'
                                    : 'bg-[#0E1B2D] text-white/62 hover:bg-[#13233A] hover:text-white'
                                }`}
                              >
                                <SvgIcon
                                  name={child.icon || 'services'}
                                  size={15}
                                  color={childActive ? '#39D97A' : 'rgba(255,255,255,0.58)'}
                                  className="mt-0.5"
                                />

                                <span>
                                  <span className="block font-bold">{child.label}</span>
                                  {child.description && (
                                    <span className="mt-1 block text-xs leading-5 text-white/42">
                                      {child.description}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            )
                          })}
                        </div>
                      )}
                    </motion.li>
                  )
                })}

                <li className="pt-3">
                  <Link
                    href="/contact"
                    className="flex min-h-[50px] items-center justify-center gap-2 rounded-full bg-[#39D97A] px-5 py-3 text-sm font-black text-[#06101F] transition hover:bg-[#C6F135]"
                  >
                    Get Free Audit
                    <SvgIcon name="arrow-diagonal" size={16} color="#06101F" />
                  </Link>
                </li>
              </ul>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}