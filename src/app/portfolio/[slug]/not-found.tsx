import Link from 'next/link'

export default function PortfolioNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#07111F] px-5 text-white">
      <div className="max-w-2xl text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#39D97A]">
          Case Study Not Found
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-[-0.05em]">
          This portfolio project does not exist.
        </h1>

        <p className="mt-5 text-base leading-8 text-white/58">
          The project may have been removed, unpublished, or the URL may be incorrect.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/portfolio"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[#39D97A] px-7 py-3 text-sm font-black text-[#06101F]"
          >
            Back To Portfolio
          </Link>

          <Link
            href="/contact"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[#39D97A]/25 bg-[#39D97A]/10 px-7 py-3 text-sm font-black text-[#39D97A]"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  )
}