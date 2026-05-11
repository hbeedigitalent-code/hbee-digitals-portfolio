import { getRequestConfig } from 'next-intl/server'

export default getRequestConfig(async ({ requestLocale }) => {
  // Use the locale from the middleware (via the [locale] dynamic segment)
  let locale = await requestLocale

  // Fallback to 'en' if no locale was matched
  if (!locale || !['en', 'fr'].includes(locale as string)) {
    locale = 'en'
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})