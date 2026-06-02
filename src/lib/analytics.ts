// src/lib/analytics.ts
declare global {
  interface Window {
    gtag: (...args: any[]) => void
  }
}

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID || ''

export const pageview = (url: string) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('config', GA_MEASUREMENT_ID, {
      page_path: url,
    })
  }
}

export const event = ({
  action,
  category,
  label,
  value,
}: {
  action: string
  category: string
  label?: string
  value?: number
}) => {
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    })
  }
}

// Track contact form submissions
export const trackContactForm = () => {
  event({ action: 'submit_form', category: 'Contact' })
}

// Track portfolio views
export const trackPortfolioView = (title: string) => {
  event({ action: 'view_portfolio', category: 'Portfolio', label: title })
}

// Track service page views
export const trackServiceView = (service: string) => {
  event({ action: 'view_service', category: 'Services', label: service })
}