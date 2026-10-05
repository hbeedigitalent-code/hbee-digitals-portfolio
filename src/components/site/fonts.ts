import { Manrope } from 'next/font/google'

/**
 * Manrope — display / editorial headings for the public rebuild only.
 *
 * Registered here rather than in src/app/layout.tsx so that Admin and the
 * Client Portal never download it. The class is applied to the
 * [data-surface="site"] wrapper in src/app/(site)/layout.tsx, which defines
 * --font-manrope for everything inside it. Inter (body/UI) is already
 * provided globally by the root layout as --font-inter.
 */
export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
  fallback: ['Inter', 'system-ui', 'sans-serif'],
})
