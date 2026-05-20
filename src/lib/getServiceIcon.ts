export function getServiceIcon(rawValue: string = '') {
  const raw = rawValue
    .toLowerCase()
    .trim()
    .replace('/public/svgs/', '')
    .replace('public/svgs/', '')
    .replace('/svgs/', '')
    .replace('svgs/', '')
    .replace('.svg', '')
    .replace(/^\/+/, '')
    .replace(/\s+/g, '-')

  const map: Record<string, string> = {
    web: 'web',
    website: 'web',
    'web-development': 'web',

    ecommerce: 'ecommerce',
    'e-commerce': 'ecommerce',
    shopify: 'ecommerce',

    design: 'design',
    branding: 'design',
    'ui-ux': 'design',

    marketing: 'marketing',
    'digital-marketing': 'marketing',

    services: 'services',
    consulting: 'consulting',

    analytics: 'analytics',
    performance: 'performance',
    security: 'security',
  }

  return map[raw] || 'services'
}