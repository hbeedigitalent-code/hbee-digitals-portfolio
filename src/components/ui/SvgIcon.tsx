interface SvgIconProps {
  name: string
  size?: number
  color?: string
  className?: string
  alt?: string
}

const aliases: Record<string, string> = {
  ecommerce: 'ecommerce',
  'e-commerce': 'ecommerce',
  shopify: 'ecommerce',
  store: 'ecommerce',
  cart: 'ecommerce',

  uiux: 'ui-ux',
  'ui-ux': 'ui-ux',
  ux: 'ui-ux',
  ui: 'ui-ux',
  design: 'ui-ux',

  marketing: 'digital-marketing',
  'digital-marketing': 'digital-marketing',

  brand: 'branding',
  branding: 'branding',
  'brand-strategy': 'branding',

  strategy: 'strategy',

  consulting: 'consulting',
  technical: 'consulting',

  web: 'web-development',
  website: 'web-development',
  'web-design': 'web-development',
  'website-design': 'web-development',
  development: 'web-development',

  portfolio: 'portfolio',
  case: 'portfolio',
  projects: 'projects',
  project: 'projects',

  services: 'services',
  service: 'services',

  growth: 'growth',
  analytics: 'analytics',
  performance: 'performance',
  security: 'security',
  support: 'support',

  email: 'email',
  mail: 'email',
  message: 'messages',
  messages: 'messages',

  whatsapp: 'whatsapp',
  phone: 'phone',
  location: 'location',

  check: 'verified',
  verified: 'verified',

  menu: 'menu',
  close: 'close',
  home: 'home',
  faq: 'faq',
  blog: 'blog',
  about: 'about',

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

  return aliases[cleaned] || cleaned || 'services'
}

export default function SvgIcon({
  name,
  size = 20,
  color = '#39D97A',
  className = '',
  alt = '',
}: SvgIconProps) {
  const iconName = cleanIconName(name)

  return (
    <span
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
      className={`inline-flex flex-shrink-0 items-center justify-center ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMaskImage: `url(/svgs/${iconName}.svg)`,
        maskImage: `url(/svgs/${iconName}.svg)`,
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
      }}
    />
  )
}