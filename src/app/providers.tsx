'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/performance';

export default function Providers({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    // The single Web Vitals reporting path (see src/lib/performance.ts).
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