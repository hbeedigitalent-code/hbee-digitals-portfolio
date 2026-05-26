import './globals.css'
import type { Metadata, Viewport } from 'next'
import { Inter, Poppins } from 'next/font/google'
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

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
  display: 'swap',
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
    'Hbee Digitals',
    'Shopify expert',
    'website design',
    'Shopify optimization',
    'conversion optimization',
    'digital growth studio',
    'ecommerce growth',
    'branding',
    'UI UX design',
    'web development',
    'digital agency',
    'website redesign',
    'business website',
    'Shopify store optimization',
  ],

  authors: [
    {
      name: siteName,
      url: siteUrl,
    },
  ],

  creator: siteName,
  publisher: siteName,

  alternates: {
    canonical: siteUrl,
  },

  manifest: '/site.webmanifest',

  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      {
        url: '/favicon-16x16.png',
        sizes: '16x16',
        type: 'image/png',
      },
      {
        url: '/favicon-32x32.png',
        sizes: '32x32',
        type: 'image/png',
      },
    ],
    apple: [
      {
        url: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  },

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteUrl,
    title: siteTitle,
    description: siteDescription,
    siteName,

    images: [
      {
        url: `${siteUrl}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Hbee Digitals — Digital Growth Studio',
      },
    ],
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
      'max-snippet': -1,
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable}`}
      suppressHydrationWarning
    >
      <body
        className="font-poppins overflow-x-hidden bg-[#07111F] text-white antialiased"
        suppressHydrationWarning
      >
        <ThemeProvider>
          <CursorGlow />

          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#39D97A]"
          >
            Skip to main content
          </a>

          <Providers>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>

            <StructuredData />

            {children}
          </Providers>

          <CookieConsent />
          <PageUtilities />
          <FloatingWhatsApp />
        </ThemeProvider>

        {gaId && <NextGoogleAnalytics gaId={gaId} />}
      </body>
    </html>
  )
}