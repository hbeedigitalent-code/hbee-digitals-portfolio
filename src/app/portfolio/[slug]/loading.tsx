export default function LoadingPortfolioCaseStudy() {
  return (
    <main className="min-h-screen bg-[#07111F] px-5 pt-32 text-white">
      <div className="mx-auto max-w-7xl animate-pulse">
        <div className="h-5 w-32 rounded-full bg-white/10" />

        <div className="mt-6 h-20 max-w-4xl rounded-3xl bg-white/10" />

        <div className="mt-6 h-8 max-w-2xl rounded-2xl bg-white/10" />

        <div className="mt-10 h-[520px] rounded-[2rem] bg-white/10" />

        <div className="mt-12 grid gap-5 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-40 rounded-[2rem] bg-white/10"
            />
          ))}
        </div>
      </div>
    </main>
  )
}