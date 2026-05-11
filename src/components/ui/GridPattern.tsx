'use client'

export default function GridPattern() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,191,255,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(0,191,255,0.18) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
          opacity: 0.12,
          animation: 'gridMove 20s linear infinite',
        }}
      />
      <style jsx>{`
        @keyframes gridMove {
          0% { transform: translate(0, 0); }
          100% { transform: translate(60px, 60px); }
        }
        @media (prefers-reduced-motion: reduce) {
          div { animation: none; }
        }
      `}</style>
    </div>
  )
}