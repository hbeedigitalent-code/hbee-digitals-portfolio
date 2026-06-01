export default function GradientHeading({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[var(--accent)] to-[var(--accent-lime)] bg-clip-text text-transparent">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[var(--accent)]/70"
        viewBox="0 0 220 18"
        fill="none"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d="M4 13C50 2 142 2 216 11"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </svg>
    </span>
  )
}