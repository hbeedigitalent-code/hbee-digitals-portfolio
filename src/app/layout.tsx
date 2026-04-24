// app/layout.tsx
import "./globals.css";
import { Inter, Poppins } from 'next/font/google';
import Providers from "./providers";

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
});

const poppins = Poppins({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['latin'],
  variable: '--font-poppins',
});

export const metadata = {
  title: "Hbee Digitals - Digital Solutions & Web Development",
  description: "Hbee Digitals provides cutting-edge digital solutions including web development, e-commerce, mobile apps, and digital marketing services.",
  keywords: "web development, e-commerce, digital marketing, mobile apps, Toronto, Canada",
  authors: [{ name: "Hbee Digitals" }],
  metadataBase: new URL('https://hbeedigital.com'),
  
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      },
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
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
    title: "Hbee Digitals - Digital Solutions",
    description: "Transform your digital presence with our expert development and marketing services.",
    type: "website",
    locale: "en_CA",
    siteName: "Hbee Digitals",
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
    card: "summary_large_image",
    title: "Hbee Digitals - Digital Solutions",
    description: "Transform your digital presence with our expert development and marketing services.",
    images: ['/og-image.jpg'],
  },
};

export const viewport = {
  themeColor: "#0A1D37",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`} suppressHydrationWarning>
      <head>
        <meta name="format-detection" content="telephone=no, date=no, email=no, address=no" />
      </head>
      <body className="font-poppins bg-brand-white text-brand-dark overflow-x-hidden" suppressHydrationWarning>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}