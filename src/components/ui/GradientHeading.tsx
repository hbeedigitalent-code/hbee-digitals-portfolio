export default function GradientHeading({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10 bg-gradient-to-r from-[#1AB85C] via-[#20A85A] to-[#0F7A43] bg-clip-text text-transparent dark:from-[#39D97A] dark:via-[#7CFFB2] dark:to-[#C6F135]">
        {children}
      </span>

      <svg
        className="absolute -bottom-2 left-0 h-4 w-full text-[#39D97A]/70"
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
