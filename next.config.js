/** @type {import('next').NextConfig} */

// Import the next-intl plugin
const createNextIntlPlugin = require('next-intl/plugin')
const withNextIntl = createNextIntlPlugin()

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
    unoptimized: false,
  },
}

module.exports = withNextIntl(nextConfig)