import "./globals.css";
import { Inter, Poppins } from "next/font/google";
import Providers from "./providers";
import GoogleAnalytics from "@/components/GoogleAnalytics";
import CookieConsent from "@/components/CookieConsent";
import { ThemeProvider } from "@/context/ThemeContext";
import { Suspense } from "react";
import CursorGlow from "@/components/ui/CursorGlow";

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
  title: "Hbee Digitals - Digital Solutions & Web Development",
  description:
    "Hbee Digitals provides cutting-edge digital solutions including web development, e-commerce, mobile apps, and digital marketing services.",
  keywords:
    "web development, e-commerce, digital marketing, mobile apps, Toronto, Canada",
  authors: [{ name: "Hbee Digitals" }],
  metadataBase: new URL("https://hbeedigitals.vercel.app"),

  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },

  openGraph: {
    title: "Hbee Digitals - Digital Solutions",
    description:
      "Transform your digital presence with our expert development and marketing services.",
    type: "website",
    locale: "en_CA",
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
    title: "Hbee Digitals - Digital Solutions",
    description:
      "Transform your digital presence with our expert development and marketing services.",
    images: ["/og-image.jpg"],
  },
};

export const viewport = {
  themeColor: "#0A1D37",
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
        {/* Magnetic cursor glow effect */}
        <CursorGlow />

        <ThemeProvider>
          {/* Skip navigation link */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:text-gray-900 focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-[--primary-color]"
          >
            Skip to main content
          </a>

          <Providers>
            <Suspense fallback={null}>
              <GoogleAnalytics />
            </Suspense>
            <main id="main-content" tabIndex={-1}>
              {children}
            </main>
          </Providers>

          <CookieConsent />
        </ThemeProvider>
      </body>
    </html>
  );
}