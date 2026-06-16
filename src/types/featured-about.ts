// src/types/featured-about.ts
export interface FeaturedAboutData {
  id?: string
  section_label: string
  heading: string
  highlighted_heading_text: string
  description: string
  cta_text: string
  cta_url: string
  image_url?: string
  logo_url?: string
  is_active: boolean
  display_order: number
}