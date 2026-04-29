'use client'

export default function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header Skeleton */}
      <div className="h-16 bg-gray-200 animate-pulse"></div>
      
      {/* Hero Skeleton */}
      <div className="bg-[#0A1D37] py-20">
        <div className="container mx-auto px-4">
          <div className="h-12 bg-white/10 rounded-lg animate-pulse w-3/4 mx-auto mb-4"></div>
          <div className="h-6 bg-white/10 rounded-lg animate-pulse w-1/2 mx-auto"></div>
        </div>
      </div>
      
      {/* Services Grid Skeleton */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="w-16 h-16 bg-gray-200 rounded-xl animate-pulse mb-4"></div>
              <div className="h-6 bg-gray-200 rounded animate-pulse w-3/4 mb-3"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}