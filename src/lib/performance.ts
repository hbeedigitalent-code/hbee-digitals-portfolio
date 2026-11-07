// Core Web Vitals monitoring.
//
// ONE reporting path: src/app/providers.tsx registers the `web-vitals` package
// handlers (CLS, LCP, TTFB, FCP, INP) and each calls reportWebVitals() below.
// Do not add PerformanceObserver-based duplicates of those metrics: they emit a
// GA event per observer entry (not per final value) and double-count LCP/CLS.
interface MetricData {
  name: string;
  value: number;
  id: string;
}

export function reportWebVitals(metric: MetricData) {
  // CLS is a unitless score (typically 0–1); rounding it directly always yields 0.
  // GA event values are integers, so CLS is sent x1000. Other metrics are milliseconds.
  const value = Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value);

  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value,
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 ${metric.name}: ${metric.name === 'CLS' ? metric.value.toFixed(3) : `${value}ms`}`);
  }
}
