'use client';

import { useState } from 'react';
import Image from 'next/image';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  priority?: boolean;
  className?: string;
  sizes?: string;
  aspectRatio?: string;
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  priority = false,
  className = '',
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  aspectRatio = 'auto',
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);

  // Determine if this is the hero image (should be priority)
  const isHero = priority;
  
  return (
    <div 
      className={`relative overflow-hidden ${className}`}
      style={{ aspectRatio: aspectRatio !== 'auto' ? aspectRatio : undefined }}
    >
      {!isLoaded && !error && (
        <div className="absolute inset-0 bg-[var(--bg-section)] animate-pulse" />
      )}
      
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={isHero}
        loading={isHero ? 'eager' : 'lazy'}
        fetchPriority={isHero ? 'high' : 'auto'}
        sizes={sizes}
        quality={85}
        onLoad={() => setIsLoaded(true)}
        onError={() => setError(true)}
        className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} object-cover w-full h-full`}
      />
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-section)]">
          <span className="text-[var(--text-muted)] text-sm">Failed to load image</span>
        </div>
      )}
    </div>
  );
}