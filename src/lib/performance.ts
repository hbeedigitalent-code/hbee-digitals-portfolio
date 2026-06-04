// Core Web Vitals monitoring
interface MetricData {
  name: string;
  value: number;
  id: string;
}

export function reportWebVitals(metric: MetricData) {
  // Send to analytics
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', metric.name, {
      value: Math.round(metric.value),
      event_category: 'Web Vitals',
      event_label: metric.id,
      non_interaction: true,
    });
  }
  
  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`📊 ${metric.name}: ${Math.round(metric.value)}ms`);
  }
}

// Measure LCP
export function measureLCP() {
  if (typeof window !== 'undefined') {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === 'largest-contentful-paint') {
          const lcp = (entry as LargestContentfulPaint).renderTime || (entry as LargestContentfulPaint).loadTime;
          reportWebVitals({ name: 'LCP', value: lcp, id: 'lcp' });
        }
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  }
}

// Measure CLS
export function measureCLS() {
  if (typeof window !== 'undefined') {
    let clsValue = 0;
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
          reportWebVitals({ name: 'CLS', value: clsValue, id: 'cls' });
        }
      }
    }).observe({ type: 'layout-shift', buffered: true });
  }
}

// Measure FID
export function measureFID() {
  if (typeof window !== 'undefined') {
    new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        const fid = (entry as PerformanceEventTiming).processingStart - (entry as PerformanceEventTiming).startTime;
        reportWebVitals({ name: 'FID', value: fid, id: 'fid' });
      }
    }).observe({ type: 'first-input', buffered: true });
  }
}

// Initialize all measurements
export function initPerformanceMonitoring() {
  if (typeof window !== 'undefined') {
    measureLCP();
    measureCLS();
    measureFID();
  }
}