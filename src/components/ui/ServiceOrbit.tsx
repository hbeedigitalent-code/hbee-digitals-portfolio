'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'

interface ServiceItem {
  id: string
  title: string
  description: string
  features?: string[]
}

interface ServiceOrbitProps {
  services?: ServiceItem[]
}

const getIconPath = (title: string): string => {
  const iconMap: Record<string, string> = {
    'Web Development': '/svgs/web-development.svg',
    'E-Commerce Solutions': '/svgs/ecommerce.svg',
    'UI/UX Design': '/svgs/ui-ux.svg',
    'Digital Marketing': '/svgs/digital-marketing.svg',
    'Brand Strategy': '/svgs/branding.svg',
    'Technical Consulting': '/svgs/consulting.svg',
  }
  return iconMap[title] || '/svgs/digital-services.svg'
}

export default function ServiceOrbit({ services = [] }: ServiceOrbitProps) {
  const displayServices = services.length > 0 ? services.slice(0, 6) : []
  const [activeIndex, setActiveIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const sectionRef = useRef<HTMLDivElement>(null)
  const [isManual, setIsManual] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // FASTER SCROLL RESPONSE - Updates immediately based on scroll position
  useEffect(() => {
    const handleScroll = () => {
      if (isManual || !sectionRef.current) return
      
      const rect = sectionRef.current.getBoundingClientRect()
      const sectionTop = rect.top
      const sectionHeight = rect.height
      const windowHeight = window.innerHeight
      
      // Calculate how much of the section is visible (0 to 1)
      let visibleRatio = 0
      if (sectionTop < windowHeight && sectionTop + sectionHeight > 0) {
        const visibleTop = Math.max(0, sectionTop)
        const visibleBottom = Math.min(windowHeight, sectionTop + sectionHeight)
        const visibleHeight = visibleBottom - visibleTop
        visibleRatio = visibleHeight / windowHeight
      }
      
      // Clamp between 0 and 1
      const scrollProgress = Math.max(0, Math.min(1, visibleRatio))
      const newRotation = scrollProgress * 360
      setRotation(newRotation)
      
      // Update active service based on rotation - IMMEDIATE
      const index = Math.floor(((newRotation % 360) / 360) * displayServices.length)
      if (index !== activeIndex && index < displayServices.length && displayServices.length > 0) {
        setActiveIndex(index)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isManual, displayServices.length, activeIndex])

  const handleServiceClick = (index: number) => {
    setIsManual(true)
    setActiveIndex(index)
    const targetRotation = (index / displayServices.length) * 360
    setRotation(targetRotation)
    setTimeout(() => setIsManual(false), 2000)
  }

  if (displayServices.length === 0) return null

  // Responsive sizes - LARGER for better readability
  const orbitSize = isMobile ? 300 : 420
  const iconSize = isMobile ? 50 : 65
  const iconRadius = isMobile ? 125 : 180

  return (
    <div ref={sectionRef} className="w-full py-8 md:py-12">
      {/* Title */}
      <div className="text-center mb-8 md:mb-12">
        <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-3">Our Technical Expertise</h2>
        <p className="text-white/60 text-sm md:text-base max-w-xl mx-auto px-4">
          Scroll to explore our services. Click any icon to learn more.
        </p>
      </div>

      {/* SIDE BY SIDE LAYOUT */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 lg:gap-16">
        
        {/* LEFT: Orbit Circle */}
        <div className="flex-shrink-0">
          <div 
            className="relative mx-auto"
            style={{ width: orbitSize, height: orbitSize }}
          >
            {/* Rotating Rings - FASTER rotation transition */}
            <div
              className="absolute inset-0 rounded-full transition-transform duration-150 ease-linear"
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <div className="absolute inset-0 rounded-full border border-white/20" />
              <div className="absolute inset-4 rounded-full border border-dashed border-white/10" />
              <div className="absolute inset-8 rounded-full border border-white/5" />
            </div>

            {/* Service Icons on Orbit */}
            {displayServices.map((service, i) => {
              const angle = (i * (360 / displayServices.length) - 90) * (Math.PI / 180)
              const x = 50 + (iconRadius / (orbitSize / 100)) * Math.cos(angle)
              const y = 50 + (iconRadius / (orbitSize / 100)) * Math.sin(angle)
              const isActive = i === activeIndex

              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceClick(i)}
                  className="absolute group flex flex-col items-center cursor-pointer"
                  style={{
                    left: `${x}%`,
                    top: `${y}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div
                    className={`rounded-full flex items-center justify-center transition-all duration-300 ${
                      isActive
                        ? 'bg-blue-500 scale-110 shadow-lg shadow-blue-500/40'
                        : 'bg-white/10 hover:bg-white/20'
                    }`}
                    style={{ width: iconSize, height: iconSize }}
                  >
                    <Image
                      src={getIconPath(service.title)}
                      alt={service.title}
                      width={isMobile ? 24 : 30}
                      height={isMobile ? 24 : 30}
                      className={`object-contain transition-all ${isActive ? 'brightness-0 invert' : 'brightness-0 invert opacity-70 group-hover:opacity-100'}`}
                    />
                  </div>
                  {/* FULL SERVICE NAME - not truncated */}
                  <span className={`text-[10px] md:text-xs mt-2 text-center max-w-[80px] md:max-w-[100px] leading-tight transition-all duration-300 ${
                    isActive ? 'text-blue-400 font-medium' : 'text-white/60 group-hover:text-white/80'
                  }`}>
                    {service.title}
                  </span>
                </button>
              )
            })}

            {/* Center Logo */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-[#0A1D37] to-[#1a2a4a] border-2 border-blue-400 flex items-center justify-center z-10 shadow-xl" style={{ width: iconSize * 1.2, height: iconSize * 1.2 }}>
              <div className="relative" style={{ width: iconSize * 0.6, height: iconSize * 0.6 }}>
                <Image src="/svgs/logo.svg" alt="Hbee Digitals" fill className="object-contain brightness-0 invert" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: Service Info Panel */}
        <div className="flex-1 w-full md:max-w-md lg:max-w-lg text-center md:text-left">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                {activeIndex + 1} of {displayServices.length}
              </div>

              <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-white mb-3">
                {displayServices[activeIndex]?.title}
              </h3>

              <p className="text-white/60 text-sm md:text-base mb-5 leading-relaxed">
                {displayServices[activeIndex]?.description}
              </p>

              {displayServices[activeIndex]?.features && (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                  {displayServices[activeIndex].features!.slice(0, 4).map((feature, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white/10 rounded-full text-white/70 text-xs border border-white/10">
                      {feature}
                    </span>
                  ))}
                </div>
              )}

              <button className="px-6 py-2.5 bg-white rounded-lg font-semibold text-sm hover:shadow-lg transition-all inline-flex items-center gap-2" style={{ color: 'var(--primary-color)' }}>
                Learn More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Dot Navigation */}
          <div className="flex gap-2 justify-center md:justify-start mt-8">
            {displayServices.map((_, idx) => (
              <button
                key={idx}
                onClick={() => handleServiceClick(idx)}
                className={`transition-all duration-300 rounded-full h-1.5 md:h-2 ${
                  idx === activeIndex
                    ? 'w-8 md:w-10 bg-blue-500'
                    : 'w-2 md:w-2.5 bg-white/30 hover:bg-white/50'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}