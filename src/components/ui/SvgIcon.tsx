'use client'

interface SvgIconProps {
  name: string
  size?: number
  className?: string
  color?: string
  title?: string
}

export default function SvgIcon({
  name,
  size = 24,
  className = '',
  color = 'currentColor',
  title,
}: SvgIconProps) {
  return (
    <span
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 ${className}`}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        WebkitMask: `url(/svgs/${name}.svg) no-repeat center / contain`,
        mask: `url(/svgs/${name}.svg) no-repeat center / contain`,
      }}
    />
  )
}