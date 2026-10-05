import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { cn } from '@/lib/cn'

/**
 * Hbee Digitals logo for the public site.
 *
 * CANONICAL LOCKUP — NOT YET IN THE REPOSITORY.
 * When the owner-approved full lockup (mark + "Hbee Digitals" wordmark +
 * "Digital Growth Studio") is supplied, place it in public/brand/ and set
 * BRAND_LOCKUP below. Nothing else changes: the lockup renders inside the same
 * fixed-height slot, so header height and alignment stay identical.
 *
 * TEMPORARY (until then): the existing 512 × 512 mark from
 * public/svgs/logo.png — the production fallback asset, unmodified — beside
 * the name as live text, which is how the current site renders it. The mark
 * is shown at ≤ 44 px (well under its native size), so it stays sharp on 2×
 * screens. No wordmark or descriptor artwork is imitated here.
 *
 * On dark tones the mark sits on a white plate, as production does
 * (`.brand-logo`), because Royal Blue on Night does not read.
 */

interface LockupAsset {
  src: string
  /** Intrinsic pixel size of the supplied file — used for the aspect ratio. */
  width: number
  height: number
  /** Optional separate artwork for dark backgrounds. */
  srcOnDark?: string
}

const BRAND_LOCKUP: LockupAsset | null = null

const BRAND_MARK_SRC = '/svgs/logo.png'
const BRAND_NAME = 'Hbee Digitals'

/** Slot heights in px — the lockup and the temporary logo both fill these. */
const SLOT_HEIGHT = { md: 44, lg: 52 } as const

interface HbeeLogoProps {
  /** Render the name next to the mark (temporary logo only). */
  withName?: boolean
  size?: keyof typeof SLOT_HEIGHT
  onDark?: boolean
  href?: string | null
  className?: string
  priority?: boolean
}

export function HbeeLogo({
  withName = true,
  size = 'md',
  onDark = false,
  href = '/',
  className,
  priority = false,
}: HbeeLogoProps) {
  const slot = SLOT_HEIGHT[size]
  let content: ReactNode

  if (BRAND_LOCKUP) {
    const src = onDark && BRAND_LOCKUP.srcOnDark ? BRAND_LOCKUP.srcOnDark : BRAND_LOCKUP.src
    content = (
      <span className={cn('inline-flex items-center', className)} style={{ height: slot }}>
        <Image
          src={src}
          alt={BRAND_NAME}
          width={BRAND_LOCKUP.width}
          height={BRAND_LOCKUP.height}
          priority={priority}
          className="block h-full w-auto"
        />
      </span>
    )
  } else {
    const mark = slot - (onDark ? 12 : 4)
    content = (
      <span className={cn('inline-flex items-center gap-3', className)} style={{ height: slot }}>
        <span
          className={cn(
            'inline-flex shrink-0 items-center justify-center',
            onDark && 'rounded-[var(--hb-radius-sm)] bg-hb-white p-1.5',
          )}
        >
          <Image
            src={BRAND_MARK_SRC}
            alt={withName ? '' : BRAND_NAME}
            width={mark}
            height={mark}
            priority={priority}
            className="block"
            style={{ width: mark, height: mark }}
          />
        </span>
        {withName && (
          <span
            className={cn(
              'font-hb-body font-bold leading-none tracking-[-0.03em] text-hb-fg',
              size === 'lg' ? 'text-[1.5rem]' : 'text-[1.3125rem]',
            )}
          >
            {BRAND_NAME}
          </span>
        )}
      </span>
    )
  }

  if (!href) return content

  return (
    <Link href={href} aria-label={`${BRAND_NAME} — home`} className="inline-flex rounded-[var(--hb-radius-xs)]">
      {content}
    </Link>
  )
}
