'use client'

export default function GlowOrb() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#007BFF] rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[#00BFFF] rounded-full mix-blend-screen filter blur-[100px] opacity-15 animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  )
}