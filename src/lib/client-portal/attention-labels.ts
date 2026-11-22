// src/lib/client-portal/attention-labels.ts
//
// Tiny and dependency-free on purpose: shared by the server-side attention builder (dashboard.ts) and the browser-side Overview model
// (overview-model.ts) without pulling either's imports into the other.

/** The word an overdue invoice's context line starts with. The Overview reads it to give that row the alert tone. */
export const INVOICE_OVERDUE_LABEL = 'Overdue'
