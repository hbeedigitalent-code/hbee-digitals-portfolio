/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image optimization
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  
  // Enable compression
  compress: true,
  
  // Minify and optimize
  swcMinify: true,
  
  // Remove console logs in production
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Security and performance headers
  async headers() {
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // DNS Prefetch Control
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          // Strict Transport Security (HSTS)
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          // XSS Protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Referrer Policy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
        ],
      },
      {
        // Static assets (Next.js build files)
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Optimized images
        source: '/images/optimized/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Regular images
        source: '/images/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, stale-while-revalidate=86400',
          },
        ],
      },
      {
        // SVG icons
        source: '/svgs/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Fonts
        source: '/fonts/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Favicon
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, immutable',
          },
        ],
      },
    ];
  },
  
  // Enable React strict mode
  reactStrictMode: true,
  
  // Disable source maps in production
  productionBrowserSourceMaps: false,
  
  // Experimental features
  experimental: {
    optimizeCss: true, // Requires critters package
    scrollRestoration: true,
  },
  
  // Increase static page generation timeout
  staticPageGenerationTimeout: 120,
  
  // Enable powered by header removal (security)
  poweredByHeader: false,
  
  // Redirects
  async redirects() {
    return [
      {
        source: '/home',
        destination: '/',
        permanent: true,
      },
      {
        source: '/index',
        destination: '/',
        permanent: true,
      },
      // ── Public route migration (Phase 19) ──────────────────────────────
      // Replaced public content: permanent. Detail redirects pass the slug through.
      { source: '/projects', destination: '/work', permanent: true },
      { source: '/portfolio', destination: '/work', permanent: true },
      { source: '/portfolio/:slug', destination: '/work/:slug', permanent: true },
      { source: '/blog', destination: '/insights', permanent: true },
      { source: '/blog/:slug', destination: '/insights/:slug', permanent: true },
      { source: '/process', destination: '/how-we-work', permanent: true },
      // Legacy Growth Readiness / assessment journey → the Growth Review journey.
      { source: '/growth-readiness', destination: '/growth-review', permanent: true },
      { source: '/assessment', destination: '/growth-review', permanent: true },
      { source: '/assessment/thank-you', destination: '/growth-review/received', permanent: true },
      // ── Legacy service-detail URLs → closest capability (Phase 19 corrections) ──
      // Slugs verified from the repo and its history (Navbar links, the Services fallback
      // list, ServiceOrbit). "website-design" and "brand-experience" appeared only in
      // ServiceOrbit during two commits on 2026-05-21 (e223fc3, b523ba3).
      { source: '/services/web-development', destination: '/services/digital-systems', permanent: true },
      { source: '/services/technical-consulting', destination: '/services/digital-systems', permanent: true },
      { source: '/services/maintenance', destination: '/services/digital-systems', permanent: true },
      { source: '/services/website-design', destination: '/services/digital-systems', permanent: true },
      { source: '/services/ecommerce', destination: '/services/commerce-experience', permanent: true },
      { source: '/services/ecommerce-solutions', destination: '/services/commerce-experience', permanent: true },
      { source: '/services/ui-ux-design', destination: '/services/commerce-experience', permanent: true },
      { source: '/services/brand-strategy', destination: '/services/brand-positioning', permanent: true },
      { source: '/services/brand-experience', destination: '/services/brand-positioning', permanent: true },
      { source: '/services/digital-marketing', destination: '/services/discovery-traffic', permanent: true },
      { source: '/services/seo', destination: '/services/discovery-traffic', permanent: true },
      { source: '/services/ppc', destination: '/services/discovery-traffic', permanent: true },
      // ── Supporting legacy pages with no place in the final route plan ──
      { source: '/reviews', destination: '/work', permanent: true },
      { source: '/before-after', destination: '/work', permanent: true },
      { source: '/pricing', destination: '/services', permanent: true },
      { source: '/faq', destination: '/contact', permanent: true },
    ];
  },
  
  // Rewrites for API caching
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;