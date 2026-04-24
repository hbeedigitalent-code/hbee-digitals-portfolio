'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface SEOProps {
  pageUrl: string
  customTitle?: string
  customDescription?: string
  customImage?: string
}

export default function SEO({ pageUrl, customTitle, customDescription, customImage }: SEOProps) {
  useEffect(() => {
    const fetchSEOSettings = async () => {
      const { data } = await supabase
        .from('seo_settings')
        .select('*')
        .eq('page_url', pageUrl)
        .single()

      if (data) {
        // Update meta tags
        if (data.meta_title || customTitle) {
          document.title = customTitle || data.meta_title || document.title
        }
        
        if (data.meta_description || customDescription) {
          const metaDescription = document.querySelector('meta[name="description"]')
          if (metaDescription) {
            metaDescription.setAttribute('content', customDescription || data.meta_description || '')
          }
        }
        
        if (data.meta_keywords) {
          const metaKeywords = document.querySelector('meta[name="keywords"]')
          if (metaKeywords) {
            metaKeywords.setAttribute('content', data.meta_keywords)
          }
        }
        
        // Open Graph tags
        const ogTitle = document.querySelector('meta[property="og:title"]')
        if (ogTitle) ogTitle.setAttribute('content', customTitle || data.og_title || data.meta_title || '')
        
        const ogDescription = document.querySelector('meta[property="og:description"]')
        if (ogDescription) ogDescription.setAttribute('content', customDescription || data.og_description || data.meta_description || '')
        
        const ogImage = document.querySelector('meta[property="og:image"]')
        if (ogImage && (data.og_image || customImage)) ogImage.setAttribute('content', customImage || data.og_image || '')
        
        // Robots meta
        if (data.no_index || data.no_follow) {
          const robots = document.querySelector('meta[name="robots"]')
          let content = ''
          if (data.no_index) content += 'noindex, '
          if (data.no_follow) content += 'nofollow'
          if (robots) robots.setAttribute('content', content)
        }
        
        // Canonical URL
        if (data.canonical_url) {
          const canonical = document.querySelector('link[rel="canonical"]')
          if (canonical) {
            canonical.setAttribute('href', data.canonical_url)
          }
        }
      }
    }
    
    fetchSEOSettings()
  }, [pageUrl, customTitle, customDescription, customImage])
  
  return null
}