interface SectionShellProps {
  children: React.ReactNode
  className?: string
  id?: string
}

export default function SectionShell({
  children,
  className = '',
  id,
}: SectionShellProps) {
  return (
    <section
      id={id}
      className={`relative px-5 py-14 sm:px-6 sm:py-16 md:px-10 lg:px-12 lg:py-20 ${className}`}
    >
      <div className="mx-auto max-w-7xl">{children}</div>
    </section>
  )
}