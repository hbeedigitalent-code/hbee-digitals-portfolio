import Link from 'next/link'

export default function PortfolioNotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--bg-page)] px-5 text-[var(--text-primary)]">
      <div className="max-w-2xl text-center">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--accent)]">
          Case Study Not Found
        </p>

        <h1 className="mt-5 text-5xl font-black tracking-[-0.05em] text-[var(--text-primary)]">
          This portfolio project does not exist.
        </h1>

        <p className="mt-5 text-base leading-8 text-[var(--text-secondary)]">
          The project may have been removed, unpublished, or the URL may be incorrect.
        </p>

        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/portfolio"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-[var(--accent)] px-7 py-3 text-sm font-black text-[var(--btn-primary-text)] hover:scale-[1.02]"
          >
            Back To Portfolio
          </Link>

          <Link
            href="/contact"
            className="inline-flex min-h-[52px] items-center justify-center rounded-full border border-[var(--accent)]/25 bg-[var(--accent)]/10 px-7 py-3 text-sm font-black text-[var(--accent)] hover:bg-[var(--accent)]/15"
          >
            Contact Us
          </Link>
        </div>
      </div>
    </main>
  )
}