import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * The existing Hbee Digitals mark, used as-is.
 *
 * Source: public/svgs/logo.png — the 512×512 mark already shipped by the
 * production site (it is the Navbar/Footer fallback when site_settings has no
 * logo_url). It is not redrawn, recoloured or cropped here.
 *
 * The name beside it is live text, which is how the production Navbar renders
 * it today. No wordmark or "Digital Growth Studio" lockup file exists in the
 * repository; when the owner supplies them they replace `BRAND_MARK_SRC` /
 * the text label here and nowhere else.
 *
 * On dark tones the mark sits on a white plate — the same treatment
 * production uses (`.brand-logo` in globals.css) — because Royal Blue on Night
 * does not have enough contrast to read.
 */
const BRAND_MARK_SRC = '/svgs/logo.png'
const BRAND_NAME = 'Hbee Digitals'

interface HbeeLogoProps {
  /** Render the name next to the mark. */
  withName?: boolean
  /** Mark edge length in px. */
  size?: number
  /** Light (default) or dark background behind the logo. */
  onDark?: boolean
  /** Wrap in a link to the homepage. */
  href?: string | null
  className?: string
  priority?: boolean
}

export function HbeeLogo({
  withName = true,
  size = 36,
  onDark = false,
  href = '/',
  className,
  priority = false,
}: HbeeLogoProps) {
  const content = (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center',
          onDark && 'rounded-[var(--hb-radius-sm)] bg-hb-white p-1',
        )}
      >
        <Image
          src={BRAND_MARK_SRC}
          alt={withName ? '' : BRAND_NAME}
          width={size}
          height={size}
          priority={priority}
          className="block h-auto"
          style={{ width: size, height: size }}
        />
      </span>
      {withName && (
        <span className="font-hb-body text-[1.0625rem] font-semibold tracking-[-0.02em] text-hb-fg">
          {BRAND_NAME}
        </span>
      )}
    </span>
  )

  if (!href) return content

  return (
    <Link href={href} aria-label={`${BRAND_NAME} — home`} className="inline-flex rounded-[var(--hb-radius-xs)]">
      {content}
    </Link>
  )
}
