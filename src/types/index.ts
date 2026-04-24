// ============ NAVIGATION ============
export interface NavLink {
  label: string
  href: string
}

// ============ HERO ============
export interface HeroData {
  title: string
  subtitle: string
  primaryCtaText: string
  primaryCtaLink: string
  secondaryCtaText?: string
  secondaryCtaLink?: string
  backgroundImage?: string
}

// ============ SERVICES ============
export interface Service {
  id: string
  title: string
  description: string
  icon: string
  features?: string[]
}

// ============ ABOUT ============
export interface Stat {
  number: string
  label: string
}

export interface Value {
  icon: string
  title: string
  description: string
}

export interface AboutData {
  title: string
  subtitle: string
  description: string
  imageUrl?: string
  stats: Stat[]
  values: Value[]
}

// ============ PORTFOLIO / PROJECTS ============
export interface Project {
  id: string
  title: string
  category: string
  description: string
  imageUrl: string
  projectUrl?: string
  technologies?: string[]
}

// ============ FAQ ============
export interface FAQ {
  id: string
  question: string
  answer: string
}

// ============ CTA ============
export interface CTAData {
  title: string
  subtitle: string
  buttonText: string
  buttonLink: string
}

// ============ FOOTER ============
export interface SocialLink {
  platform: string
  url: string
  icon?: string
}

export interface FooterLink {
  label: string
  href: string
}

export interface FooterColumn {
  title: string
  links: FooterLink[]
}

export interface FooterData {
  logoText?: string
  copyrightText: string
  columns: FooterColumn[]
  socialLinks: SocialLink[]
}

// ============ CONTACT ============
export interface ContactFormData {
  name: string
  email: string
  message: string
}

export interface ContactInfo {
  address?: string
  email: string
  phone?: string
}

// ============ SITE SETTINGS (Admin configurable) ============
export interface SiteSettings {
  id: string
  // Colors
  primary_color: string      // #0A1D37
  secondary_color: string    // #FFFFFF
  accent_color?: string      // optional accent
  text_color?: string        // default text
  // Typography
  heading_font: string
  body_font: string
  // Branding
  logo_text: string
  logo_image_url?: string
  favicon_url?: string
  // Layout
  navbar_style: 'transparent' | 'solid' | 'blur'
  footer_style: 'dark' | 'light'
  // Contact
  contact_email: string
  contact_phone?: string
  contact_address?: string
  // Social
  social_twitter?: string
  social_github?: string
  social_linkedin?: string
  // SEO
  site_title: string
  site_description: string
  // Timestamps
  updated_at: string
}

// ============ THEME CONTEXT TYPE ============
export interface ThemeContextType {
  settings: SiteSettings | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ============ COMPLETE PAGE DATA ============
export interface PageData {
  hero: HeroData
  services: Service[]
  about: AboutData
  projects: Project[]
  faqs: FAQ[]
  cta: CTAData
  footer: FooterData
  contact: ContactInfo
}