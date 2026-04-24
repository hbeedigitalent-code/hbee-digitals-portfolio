'use client'

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="h-16 bg-gray-200 animate-pulse"></div>
      
      <div className="container mx-auto p-6">
        {/* Title Skeleton */}
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
        
        {/* Cards Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-8">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm p-5">
              <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse mb-3"></div>
              <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
            </div>
          ))}
        </div>
        
        {/* Table Skeleton */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 border-b flex gap-4">
              <div className="h-5 bg-gray-200 rounded flex-1 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse mb-3"></div>
      <div className="h-5 bg-gray-200 rounded w-3/4 animate-pulse mb-2"></div>
      <div className="h-3 bg-gray-200 rounded w-full animate-pulse"></div>
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b bg-gray-50">
        <div className="h-5 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="p-4 border-b flex gap-4">
          <div className="h-5 bg-gray-200 rounded flex-1 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-24 animate-pulse"></div>
          <div className="h-5 bg-gray-200 rounded w-20 animate-pulse"></div>
        </div>
      ))}
    </div>
  )
}