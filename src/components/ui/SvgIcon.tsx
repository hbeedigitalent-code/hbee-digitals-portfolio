import Image from 'next/image'

interface SvgIconProps {
  name: string
  size?: number
  color?: string
  className?: string
  alt?: string
}

const iconAliases: Record<string, string> = {
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  commerce: 'ecommerce',
  cart: 'ecommerce',
  shop: 'ecommerce',
  store: 'ecommerce',

  consulting: 'consulting',
  consultant: 'consulting',
  technical: 'consulting',

  portfolio: 'portfolio',
  case: 'portfolio',
  cases: 'portfolio',
  project: 'projects',
  projects: 'projects',

  web: 'web-development',
  website: 'web-development',
  'web-design': 'web-development',
  'website-design': 'web-development',
  development: 'web-development',

  brand: 'branding',
  branding: 'branding',
  identity: 'branding',

  services: 'services',
  service: 'services',
  sliders: 'services',
  settings: 'services',

  growth: 'growth',
  analytics: 'analytics',
  strategy: 'strategy',
  performance: 'performance',
  security: 'security',
  shield: 'security',

  support: 'support',
  help: 'support',

  email: 'email',
  mail: 'email',
  message: 'messages',
  messages: 'messages',

  whatsapp: 'whatsapp',
  phone: 'whatsapp',

  location: 'location',
  pin: 'location',

  faq: 'faq',
  faqs: 'faq',

  blog: 'blog',
  article: 'blog',

  about: 'about',
  company: 'about',

  rocket: 'rocket',
  home: 'home',
  menu: 'menu',
  close: 'close',

  check: 'check',
  verified: 'check',

  'arrow-diagonal': 'arrow-diagonal',
  arrow: 'arrow-diagonal',

  'chevron-left': 'chevron-left',
  'chevron-right': 'chevron-right',
  'chevron-down': 'chevron-down',
  'chevron-up': 'chevron-up',

  facebook: 'facebook',
  twitter: 'twitter',
  linkedin: 'linkedin',
  instagram: 'instagram',
  github: 'github',
}

function cleanIconName(name: string) {
  const cleaned = name
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .trim()
    .toLowerCase()

  return iconAliases[cleaned] || cleaned || 'services'
}

export default function SvgIcon({
  name,
  size = 20,
  color = '#39D97A',
  className = '',
  alt = '',
}: SvgIconProps) {
  const iconName = cleanIconName(name)
  const src = `/svgs/${iconName}.svg`

  return (
    <span
      className={`relative inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        color,
      }}
      aria-hidden={alt ? undefined : true}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        className="h-full w-full object-contain"
        style={{
          filter:
            color === '#39D97A' || color.toLowerCase() === '#39d97a'
              ? 'brightness(0) saturate(100%) invert(67%) sepia(65%) saturate(546%) hue-rotate(89deg) brightness(93%) contrast(88%)'
              : undefined,
        }}
      />
    </span>
  )
}