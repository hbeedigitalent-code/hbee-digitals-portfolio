import "./globals.css";
import { Inter, Poppins } from "next/font/google";
import Providers from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieBanner";
import { ThemeProvider } from "@/context/ThemeContext";
import { Suspense } from "react";
import CursorGlow from "@/components/ui/CursorGlow";
import PageUtilities from "@/components/ui/PageUtilities";
import FloatingWhatsApp from "@/components/ui/FloatingWhatsApp";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800"],
  subsets: ["latin"],
  variable: "--font-poppins",
});

export const metadata = {
  title: "Hbee Digitals - Digital Growth Studio",
  description:
    "Premium websites, Shopify optimization, brand systems, and conversion-focused digital experiences for ambitious businesses.",

  keywords:
    "web development, Shopify optimization, ecommerce growth, digital marketing, branding, Hbee Digitals",

  authors: [{ name: "Hbee Digitals" }],

  metadataBase: new URL("https://hbeedigitals.vercel.app"),

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

    type: "website",
    locale: "en_US",
    siteName: "Hbee Digitals",

    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Hbee Digitals",
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
};

export const viewport = {
  themeColor: "#060E1C",
  width: "device-width",
  initialScale: 1,
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
      <head>
        <meta name="format-detection" content="date=no" />
      </head>

      <body
        className="font-poppins overflow-x-hidden"
        style={{
          backgroundColor: "var(--bg-color)",
          color: "var(--text-color)",
        }}
        suppressHydrationWarning
      >
        {/* Cursor Glow */}
        <CursorGlow />

        <ThemeProvider>
          {/* Accessibility Skip Link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[9999] focus:rounded-md focus:bg-white focus:px-4 focus:py-2 focus:text-gray-900 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#39D97A]"
          >
            Skip to main content
          </a>

          <Providers>
            {/* Analytics */}
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>

            {/* Main Website */}
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </Providers>

          {/* UI Utilities */}
          <CookieConsent />
          <PageUtilities />
          <FloatingWhatsApp />
        </ThemeProvider>
      </body>
    </html>
  );
}