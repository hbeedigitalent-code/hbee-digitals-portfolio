'use client'

import { useLocale } from 'next-intl'
import { useRouter } from 'next/navigation'

export default function LanguageSwitcher() {
  const locale = useLocale()
  const router = useRouter()

  const toggleLanguage = () => {
    const nextLocale = locale === 'en' ? 'fr' : 'en'
    // Navigate to the same page with the new locale
    const currentPath = window.location.pathname.replace(/^\/(en|fr)/, '')
    router.push(`/${nextLocale}${currentPath}`)
  }

  return (
    <button
      onClick={toggleLanguage}
      className="px-3 py-1 rounded-md text-sm font-medium transition"
      style={{ color: 'var(--secondary-color)', border: '1px solid var(--card-border)' }}
      aria-label={`Switch language to ${locale === 'en' ? 'French' : 'English'}`}
    >
      {locale === 'en' ? 'FR' : 'EN'}
    </button>
  )
}