'use client'

import { memo, useState, useEffect } from 'react'

interface SvgIconProps {
  name: string
  size?: number
  color?: string
  className?: string
}

// Map of icon names to their file paths
const getIconPath = (name: string): string => {
  const normalizedName = name.toLowerCase().trim()
  
  const iconMap: Record<string, string> = {
    // Navigation
    'arrow-right': '/svgs/arrow-right.svg',
    'arrow-diagonal': '/svgs/arrow-diagonal.svg',
    'chevron-down': '/svgs/chevron-down.svg',
    'chevron-left': '/svgs/chevron-left.svg',
    'chevron-right': '/svgs/chevron-right.svg',
    'chevron-up': '/svgs/chevron-up.svg',
    'close': '/svgs/close.svg',
    'menu': '/svgs/menu.svg',
    'search': '/svgs/search.svg',
    
    // Social
    'facebook': '/svgs/facebook.svg',
    'twitter': '/svgs/twitter.svg',
    'instagram': '/svgs/instagram.svg',
    'linkedin': '/svgs/linkedin.svg',
    'whatsapp': '/svgs/whatsapp.svg',
    'telegram': '/svgs/telegram.svg',
    'github': '/svgs/github.svg.png',
    
    // Trust/Status
    'verified': '/svgs/verified.svg',
    'star': '/svgs/star.svg',
    'security': '/svgs/security.svg',
    'shield': '/svgs/security.svg',
    'check-circle': '/svgs/verified.svg',
    
    // Communication
    'email': '/svgs/email.svg',
    'phone': '/svgs/phone.svg',
    'location': '/svgs/location.svg',
    'calendar': '/svgs/calendar.svg',
    'clock': '/svgs/clock.svg',
    'user': '/svgs/user.svg',
    'users': '/svgs/team.svg',
    'team': '/svgs/team.svg',
    'support': '/svgs/support.svg',
    'chat': '/svgs/chat.svg',
    'chat-support': '/svgs/chat-support.svg',
    'messages': '/svgs/messages.svg',
    'notification': '/svgs/notification.svg',
    
    // Admin/Settings
    'settings': '/svgs/settings.svg',
    'dashboard': '/svgs/dashboard.svg',
    'profile': '/svgs/profile.svg',
    'logout': '/svgs/logout.svg',
    
    // Content
    'portfolio': '/svgs/portfolio.svg',
    'blog': '/svgs/blog.svg',
    'faq': '/svgs/faq.svg',
    'pricing': '/svgs/pricing.svg',
    'services': '/svgs/services.svg',
    'about': '/svgs/about.svg',
    'home': '/svgs/logo.svg',
    'logo': '/svgs/logo.svg',
    
    // Performance/Growth
    'growth': '/svgs/growth.svg',
    'analytics': '/svgs/analytics.svg',
    'performance': '/svgs/performance.svg',
    'precision': '/svgs/precision.svg',
    'strategy': '/svgs/strategy.svg',
    'innovation': '/svgs/innovation.svg',
    'rocket': '/svgs/rocket.svg',
    
    // Media
    'play': '/svgs/play.svg',
    'pause': '/svgs/pause.svg',
    'video': '/svgs/video.svg',
    'image': '/svgs/image.svg',
    
    // Actions
    'link': '/svgs/link.svg',
    'external': '/svgs/external.svg',
    'download': '/svgs/download.svg',
    'upload': '/svgs/upload.svg',
    'copy': '/svgs/copy.svg',
    'edit': '/svgs/edit.svg',
    'trash': '/svgs/trash.svg',
    'plus': '/svgs/plus.svg',
    'minus': '/svgs/minus.svg',
    'check': '/svgs/check.svg',
    'x': '/svgs/x-close.svg',
    'x-close': '/svgs/x-close.svg',
    
    // Service icons
    'web-development': '/svgs/web-development.svg',
    'ecommerce': '/svgs/ecommerce.svg',
    'digital-marketing': '/svgs/digital-marketing.svg',
    'branding': '/svgs/branding.svg',
    'consulting': '/svgs/consulting.svg',
    'ui-ux': '/svgs/ui-ux.svg',
    'seo': '/svgs/seo.svg',
    'ppc': '/svgs/google-analytics.svg',
    'social': '/svgs/instagram.svg',
    'maintenance': '/svgs/support.svg',
    'migration': '/svgs/migration.svg',
    'development': '/svgs/web-development.svg',
    'design': '/svgs/design.svg',
    
    // Technology
    'shopify': '/svgs/shopify.svg',
    'google': '/svgs/google.svg.png',
    'meta': '/svgs/meta.svg',
    'klaviyo': '/svgs/klaviyo.svg',
    'stripe': '/svgs/stripe.svg',
    'vercel': '/svgs/vercel.svg',
    'nextjs': '/svgs/nextjs.svg',
    'supabase': '/svgs/supabase.svg',
    'wordpress': '/svgs/wordpress.svg',
    'woocommerce': '/svgs/Woo_Commerce.svg',
    'wix': '/svgs/Wix.svg.png',
    'magento': '/svgs/Magento.svg',
    'bigcommerce': '/svgs/Big_Commerce.svg',
    'volusion': '/svgs/Volusion.svg',
    'opencart': '/svgs/Opencart.svg.svg',
    'amazon': '/svgs/Amazon.svg',
    
    // Extra icons
    'warning': '/svgs/warning.svg',
    'quote': '/svgs/quote.svg',
    'newsletter': '/svgs/newsletter.svg',
    'comment': '/svgs/comment.svg',
  }
  
  return iconMap[normalizedName] || `/svgs/${normalizedName}.svg`
}

// Helper to apply color filter to SVG
const getColorFilter = (color: string): string => {
  if (!color || color === 'currentColor' || color === 'white' || color === '#ffffff' || color === 'var(--accent)') {
    return 'none'
  }
  
  // Handle CSS variable colors
  if (color.includes('var(--accent)')) {
    return 'brightness(0) saturate(100%) invert(53%) sepia(98%) saturate(1236%) hue-rotate(1deg) brightness(102%) contrast(101%)'
  }
  if (color === '#2563EB' || color === 'blue') {
    return 'brightness(0) saturate(100%) invert(31%) sepia(98%) saturate(1248%) hue-rotate(199deg) brightness(93%) contrast(101%)'
  }
  if (color === '#F97316' || color === 'orange') {
    return 'brightness(0) saturate(100%) invert(53%) sepia(98%) saturate(1236%) hue-rotate(1deg) brightness(102%) contrast(101%)'
  }
  
  return 'none'
}

function SvgIcon({ name, size = 20, color = 'currentColor', className = '' }: SvgIconProps) {
  const [imgError, setImgError] = useState(false)
  const [mounted, setMounted] = useState(false)
  const iconPath = getIconPath(name)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render during SSR to prevent hydration mismatch
  if (!mounted) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`inline-block ${className}`}
      />
    )
  }

  // If image fails to load, return null (no fallback circle)
  if (imgError) {
    return (
      <div 
        style={{ width: size, height: size }} 
        className={`inline-block ${className}`}
      />
    )
  }

  return (
    <img
      src={iconPath}
      alt={name}
      width={size}
      height={size}
      className={`object-contain ${className}`}
      style={{ 
        filter: getColorFilter(color)
      }}
      onError={() => setImgError(true)}
    />
  )
}

export default memo(SvgIcon)