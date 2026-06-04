'use client';

import { useEffect } from 'react';
import { reportWebVitals, initPerformanceMonitoring } from '@/lib/performance';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // Initialize performance monitoring
    initPerformanceMonitoring();
    
    // Report Web Vitals (using correct v4 exports)
    if (typeof window !== 'undefined') {
      import('web-vitals').then((webVitals) => {
        webVitals.onCLS(reportWebVitals);
        webVitals.onLCP(reportWebVitals);
        webVitals.onTTFB(reportWebVitals);
        webVitals.onFCP(reportWebVitals);
        webVitals.onINP(reportWebVitals);
      });
    }
  }, []);

  return <>{children}</>;
}