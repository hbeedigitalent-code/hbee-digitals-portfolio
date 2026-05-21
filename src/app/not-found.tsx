import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#07111F] px-6 text-center text-white">
      <p className="mb-4 text-sm font-bold uppercase tracking-[0.2em] text-[#39D97A]">
        404 Error
      </p>

      <h1 className="text-5xl font-black tracking-[-0.06em] md:text-7xl">
        Page Not Found
      </h1>

      <p className="mt-6 max-w-xl text-base leading-7 text-white/60">
        The page you are looking for does not exist or may have been moved.
      </p>

      <Link
        href="/"
        className="mt-10 inline-flex items-center rounded-full bg-[#39D97A] px-6 py-3 text-sm font-black text-[#06101F] transition hover:scale-[1.02] hover:bg-[#C6F135]"
      >
        Return Home
      </Link>
    </main>
  );
}