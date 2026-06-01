export default function LoadingPortfolioCaseStudy() {
  return (
    <main className="min-h-screen bg-[var(--bg-page)] px-5 pt-32 text-[var(--text-primary)]">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-5 w-32 rounded-full bg-[var(--bg-card)]" />
        <div className="mt-6 h-20 max-w-4xl rounded-3xl bg-[var(--bg-card)]" />
        <div className="mt-6 h-8 max-w-2xl rounded-2xl bg-[var(--bg-card)]" />
        <div className="mt-10 h-[520px] rounded-[2rem] bg-[var(--bg-card)]" />
        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-40 rounded-[2rem] bg-[var(--bg-card)]" />
          ))}
        </div>
      </div>
    </main>
  )
}