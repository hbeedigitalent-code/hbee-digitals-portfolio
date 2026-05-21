import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Inter, Poppins } from "next/font/google";
import { Suspense } from "react";

import Providers from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieBanner";
import { ThemeProvider } from "@/context/ThemeContext";
import CursorGlow from "@/components/ui/CursorGlow";
import PageUtilities from "@/components/ui/PageUtilities";
import FloatingWhatsApp from "@/components/ui/FloatingWhatsApp";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Hbee Digitals - Digital Growth Studio",
    template: "%s | Hbee Digitals",
  },

  description:
    "Premium websites, Shopify optimization, brand systems, and conversion-focused digital experiences for ambitious businesses.",

  keywords: [
    "Hbee Digitals",
    "web development",
    "Shopify optimization",
    "ecommerce growth",
    "digital marketing",
    "branding",
    "website design",
    "conversion optimization",
    "digital growth studio",
  ],

  authors: [{ name: "Hbee Digitals" }],
  creator: "Hbee Digitals",
  publisher: "Hbee Digitals",

  metadataBase: new URL("https://hbeedigitals.com"),

  alternates: {
    canonical: "/",
  },

  manifest: "/site.webmanifest",

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      {
        url: "/favicon-16x16.png",
        sizes: "16x16",
        type: "image/png",
      },
      {
        url: "/favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/apple-touch-icon.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },

  openGraph: {
    title: "Hbee Digitals - Digital Growth Studio",
    description:
      "Premium websites, Shopify optimization, brand systems, and conversion-focused digital experiences for ambitious businesses.",
    url: "https://hbeedigitals.com",
    siteName: "Hbee Digitals",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hbee Digitals - Digital Growth Studio",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "Hbee Digitals - Digital Growth Studio",
    description:
      "Premium websites, Shopify optimization, brand systems, and conversion-focused digital experiences for ambitious businesses.",
    images: ["/og-image.jpg"],
  },

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#07111F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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

            {children}
          </Providers>

          <CookieConsent />
          <PageUtilities />
          <FloatingWhatsApp />
        </ThemeProvider>
      </body>
    </html>
  );
}