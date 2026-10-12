import type { MetadataRoute } from 'next'

const baseUrl = 'https://hbeedigitals.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/admin',
          '/admin-2fa-challenge',
          '/client-portal',
          '/api',
          '/_next',
        ],
      },
    ],

    sitemap: `${baseUrl}/sitemap.xml`,

    host: baseUrl,
  }
}