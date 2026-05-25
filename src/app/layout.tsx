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

export const metadata: Metadata = {
  metadataBase: new URL('https://hbeedigitals.com'),

  title: {
    default: 'Hbee Digitals — Digital Growth Studio',
    template: '%s | Hbee Digitals',
  },

  description:
    'Premium websites, Shopify optimization, digital infrastructure, and conversion-focused growth systems for ambitious brands.',

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
  ],

  authors: [
    {
      name: 'Hbee Digitals',
      url: 'https://hbeedigitals.com',
    },
  ],

  creator: 'Hbee Digitals',
  publisher: 'Hbee Digitals',

  alternates: {
    canonical: 'https://hbeedigitals.com',
  },

  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://hbeedigitals.com',
    title: 'Hbee Digitals — Digital Growth Studio',
    description:
      'Premium websites, Shopify optimization, digital infrastructure, and conversion-focused growth systems for ambitious brands.',
    siteName: 'Hbee Digitals',

    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Hbee Digitals',
      },
    ],
  },

  twitter: {
    card: 'summary_large_image',
    title: 'Hbee Digitals — Digital Growth Studio',
    description:
      'Premium websites, Shopify optimization, digital infrastructure, and conversion-focused growth systems for ambitious brands.',
    creator: '@hbeedigitals',
    images: ['/twitter-image.jpg'],
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