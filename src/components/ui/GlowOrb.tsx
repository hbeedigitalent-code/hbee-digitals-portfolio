'use client'

export default function GlowOrb() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-24 top-0 h-[280px] w-[280px] rounded-full bg-[#39D97A]/8 blur-[90px] sm:h-[420px] sm:w-[420px] sm:blur-[120px]" />
      <div className="absolute -right-24 bottom-0 h-[260px] w-[260px] rounded-full bg-[#C6F135]/6 blur-[90px] sm:h-[390px] sm:w-[390px] sm:blur-[120px]" />
    </div>
  )
}