import createMiddleware from 'next-intl/middleware'

export default createMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en',
  localePrefix: 'as-needed', // hides 'en' prefix, shows 'fr'
})

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}