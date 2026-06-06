import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Suspense } from 'react'
import { GoogleAnalytics as NextGoogleAnalytics } from '@next/third-parties/google'

import Providers from './providers'
import GoogleAnalytics from '@/components/GoogleAnalytics'
import CookieConsent from '@/components/CookieBanner'
import StructuredData from '@/components/StructuredData'
import { ThemeProvider } from '@/context/ThemeContext'
import CursorGlow from '@/components/ui/CursorGlow'
import PageUtilities from '@/components/ui/PageUtilities'
import FloatingWhatsApp from '@/components/ui/FloatingWhatsApp'
import SubscribePopup from '@/components/SubscribePopup'

// Optimize font loading
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800', '900'],
  variable: '--font-inter',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
})

const siteUrl = 'https://hbeedigitals.com'
const siteName = 'Hbee Digitals'
const siteTitle = 'Hbee Digitals — Digital Growth Studio'
const siteDescription =
  'Premium websites, Shopify optimization, digital infrastructure, and conversion-focused growth systems for ambitious brands.'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  keywords: [
    'Hbee Digitals', 'Shopify expert', 'website design', 'Shopify optimization',
    'conversion optimization', 'digital growth studio', 'ecommerce growth',
    'branding', 'UI UX design', 'web development', 'digital agency',
  ],
  authors: [{ name: siteName, url: siteUrl }],
  creator: siteName,
  publisher: siteName,
  alternates: { canonical: siteUrl },
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName,
    images: [{ url: `${siteUrl}/og-image.jpg`, width: 1200, height: 630, alt: 'Hbee Digitals — Digital Growth Studio' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteTitle,
    description: siteDescription,
    creator: '@hbeedigitals',
    images: [`${siteUrl}/twitter-image.jpg`],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { 
      index: true, 
      follow: true, 
      'max-video-preview': -1, 
      'max-image-preview': 'large', 
      'max-snippet': -1 
    },
  },
  category: 'technology',
}

export const viewport: Viewport = {
  themeColor: '#07111F',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="en" className={`${inter.variable}`} suppressHydrationWarning>
      <head>
        {/* Preconnect to critical origins */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for external resources */}
        <link rel="dns-prefetch" href="https://your-supabase-url.supabase.co" />
        
        {/* Preload critical assets */}
        <link rel="preload" as="style" href="/critical.css" />
        <link rel="preload" as="font" href="/fonts/Inter-var.woff2" type="font/woff2" crossOrigin="anonymous" />
        
        {/* Critical CSS inlined */}
        <style dangerouslySetInnerHTML={{
          __html: `
            /* Critical CSS - Above the fold styles */
            *{margin:0;padding:0;box-sizing:border-box}
            nav{position:fixed;top:0;left:0;right:0;z-index:50;background:var(--bg-page);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
            .hero-section{min-height:100vh;background:linear-gradient(135deg,#0A1D37 0%,#0F3460 30%,#1B4F8A 60%,#39D97A 100%);padding-top:80px}
            .hero-title{font-size:clamp(2.5rem,5vw,4rem);font-weight:900;line-height:1.1;color:#fff}
            .btn-primary{display:inline-flex;align-items:center;gap:8px;border-radius:9999px;background:linear-gradient(135deg,#FF6B35 0%,#39D97A 100%);padding:12px 28px;font-weight:900;color:#fff;transition:transform .2s}
            .btn-primary:hover{transform:scale(1.02)}
            .hero-image{aspect-ratio:1/1;width:100%;max-width:480px;object-fit:cover;border-radius:16px}
            .sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}
          `
        }} />
      </head>
      <body
        className="antialiased"
        style={{ fontFamily: "var(--font-inter), 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" }}
        suppressHydrationWarning
      >
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]">
          Skip to main content
        </a>

        <ThemeProvider>
          <Suspense fallback={null}>
            <CursorGlow />
          </Suspense>

          <Providers>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            
            <StructuredData />
            
            {children}
          </Providers>

          <SubscribePopup />
          <CookieConsent />
          <PageUtilities />
          <FloatingWhatsApp />
        </ThemeProvider>

        {/* Load analytics after page load */}
        {gaId && <NextGoogleAnalytics gaId={gaId} />}
        
        {/* Service Worker for caching */}
        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator && window.location.hostname !== 'localhost') {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js').catch(console.error);
              });
            }
          `
        }} />
      </body>
    </html>
  )
}