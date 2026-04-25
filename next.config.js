/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.vercel.app',
      },
    ],
  },
  // This is the key fix - don't statically generate dynamic routes
  output: 'standalone',
  swcMinify: true,
  // Tell Next.js not to try to prerender dynamic pages at build time
  staticPageGenerationTimeout: 120,
}

module.exports = nextConfig
