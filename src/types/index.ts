// ============ NAVIGATION ============
export interface NavLink {
  label: string
  href: string
}

// ============ HERO ============
export interface HeroData {
  title: string
  subtitle: string
  welcomeText?: string
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
  site_name: string
  logo_url?: string
  primary_color: string
  secondary_color: string
  accent_color?: string
  text_color?: string
  heading_font: string
  body_font: string
  logo_text: string
  logo_image_url?: string
  favicon_url?: string
  navbar_style: 'transparent' | 'solid' | 'blur'
  footer_style: 'dark' | 'light'
  contact_email: string
  contact_phone?: string
  contact_address?: string
  social_twitter?: string
  social_github?: string
  social_linkedin?: string
  social_instagram?: string
  site_title: string
  site_description: string
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