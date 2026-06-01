'use client'

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Header Skeleton */}
      <div className="h-16 bg-[var(--bg-card)] animate-pulse"></div>
      
      <div className="container mx-auto p-6">
        {/* Title Skeleton */}
        <div className="mb-6 h-8 w-48 rounded bg-[var(--bg-card)] animate-pulse"></div>
        
        {/* Cards Grid Skeleton */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-xl bg-[var(--bg-card)] p-5 shadow-[var(--shadow-sm)]">
              <div className="mb-3 h-12 w-12 rounded-xl bg-[var(--bg-section)] animate-pulse"></div>
              <div className="mb-2 h-5 w-3/4 rounded bg-[var(--bg-section)] animate-pulse"></div>
              <div className="h-3 w-full rounded bg-[var(--bg-section)] animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <div className="overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
          <div className="border-b border-[var(--border)] p-4">
            <div className="h-6 w-32 rounded bg-[var(--bg-section)] animate-pulse"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4 border-b border-[var(--border)] p-4">
              <div className="h-5 flex-1 rounded bg-[var(--bg-section)] animate-pulse"></div>
              <div className="h-5 w-24 rounded bg-[var(--bg-section)] animate-pulse"></div>
              <div className="h-5 w-20 rounded bg-[var(--bg-section)] animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="rounded-xl bg-[var(--bg-card)] p-5 shadow-[var(--shadow-sm)]">
      <div className="mb-3 h-12 w-12 rounded-xl bg-[var(--bg-section)] animate-pulse"></div>
      <div className="mb-2 h-5 w-3/4 rounded bg-[var(--bg-section)] animate-pulse"></div>
      <div className="h-3 w-full rounded bg-[var(--bg-section)] animate-pulse"></div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-xl bg-[var(--bg-card)] shadow-[var(--shadow-sm)]">
      <div className="border-b border-[var(--border)] bg-[var(--bg-section)] p-4">
        <div className="h-5 w-32 rounded bg-[var(--bg-card)] animate-pulse"></div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex gap-4 border-b border-[var(--border)] p-4">
          <div className="h-5 flex-1 rounded bg-[var(--bg-section)] animate-pulse"></div>
          <div className="h-5 w-24 rounded bg-[var(--bg-section)] animate-pulse"></div>
          <div className="h-5 w-20 rounded bg-[var(--bg-section)] animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}