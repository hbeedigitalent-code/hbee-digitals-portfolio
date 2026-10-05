import Link from 'next/link'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/**
 * BLUE NAVIGATES. ORANGE CONVERTS. CONTROLS STAY CLEAR.
 *
 *   brand       Royal Blue fill — primary navigation actions
 *   conversion  Signal Orange fill — the one conversion action per view.
 *               Shaped as the mark's Signal Capsule (near-square left edge,
 *               full round right edge). Text is Night, not white: white on
 *               #FC5D1C is 3.1:1 and fails WCAG AA at button sizes; Night is 5.9:1.
 *   secondary   Outlined, tone-aware
 *   tertiary    Text link with a shifting arrow
 *
 * Independent of the shared components/ui/Button used by Admin/Portal.
 */
export type SiteButtonVariant = 'brand' | 'conversion' | 'secondary' | 'tertiary'
type SiteButtonSize = 'md' | 'lg'

const BASE =
  'group/btn inline-flex items-center justify-center gap-2 whitespace-nowrap font-hb-body font-semibold leading-none ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-[var(--hb-dur-fast)] ease-[var(--hb-ease)] ' +
  'active:translate-y-px disabled:pointer-events-none disabled:opacity-50'

const VARIANT: Record<SiteButtonVariant, string> = {
  brand:
    'rounded-[var(--hb-radius-md)] bg-hb-blue text-white shadow-[var(--hb-shadow-1)] hover:bg-hb-deep-blue',
  conversion:
    'rounded-l-[var(--hb-radius-xs)] rounded-r-[var(--hb-radius-pill)] bg-hb-orange text-hb-night shadow-[var(--hb-shadow-1)] hover:bg-[#ff7440]',
  secondary:
    'rounded-[var(--hb-radius-md)] border-[1.5px] border-current text-hb-link hover:bg-hb-plane',
  tertiary: 'rounded-[var(--hb-radius-xs)] px-0 text-hb-link underline-offset-[6px] hover:underline',
}

const SIZE: Record<SiteButtonSize, string> = {
  md: 'min-h-[44px] px-5 text-[0.9375rem]',
  lg: 'min-h-[52px] px-7 text-base',
}

interface CommonProps {
  variant?: SiteButtonVariant
  size?: SiteButtonSize
  /** Trailing arrow (always on for tertiary). */
  arrow?: boolean
  className?: string
  children: ReactNode
}

type LinkProps = CommonProps & { href: string; external?: boolean }
type ButtonProps = CommonProps & { href?: undefined } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'children'>

export type SiteButtonProps = LinkProps | ButtonProps

export function siteButtonClasses(variant: SiteButtonVariant = 'brand', size: SiteButtonSize = 'md', className?: string) {
  return cn(BASE, VARIANT[variant], variant === 'tertiary' ? 'min-h-[44px] text-[0.9375rem]' : SIZE[size], className)
}

function Arrow() {
  return (
    <ArrowRight
      aria-hidden="true"
      size={17}
      strokeWidth={2}
      className="shrink-0 transition-transform duration-[var(--hb-dur-base)] ease-[var(--hb-ease)] group-hover/btn:translate-x-1"
    />
  )
}

export function SiteButton(props: SiteButtonProps) {
  const { variant = 'brand', size = 'md', arrow, className, children } = props
  const classes = siteButtonClasses(variant, size, className)
  const showArrow = arrow ?? variant === 'tertiary'
  const inner = (
    <>
      <span>{children}</span>
      {showArrow && <Arrow />}
    </>
  )

  if (props.href !== undefined) {
    if (props.external) {
      return (
        <a href={props.href} className={classes} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      )
    }
    return (
      <Link href={props.href} className={classes}>
        {inner}
      </Link>
    )
  }

  const { variant: _v, size: _s, arrow: _a, className: _c, children: _ch, href: _h, ...buttonProps } = props
  return (
    <button type="button" {...buttonProps} className={classes}>
      {inner}
    </button>
  )
}

/** Inline "learn more" style link with the SHIFT arrow. */
export function SiteLinkArrow({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cn(
        'group/btn inline-flex items-center gap-1.5 font-semibold text-hb-link underline-offset-[6px] hover:underline',
        className,
      )}
    >
      <span>{children}</span>
      <Arrow />
    </Link>
  )
}
