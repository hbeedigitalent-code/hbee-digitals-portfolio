/**
 * SEASONAL copy: the Black Friday / Cyber Monday context block on /growth-review.
 *
 * TO RETIRE AFTER THE CAMPAIGN: set BFCM_CONTEXT_ACTIVE to false (or delete the
 * <GrowthReviewBfcm /> line in growth-review/page.tsx). Nothing else depends on
 * it — the Growth Review offer itself is not Black-Friday-only.
 */

export const BFCM_CONTEXT_ACTIVE = true

export const GR_BFCM = {
  eyebrow: 'Black Friday and Cyber Monday',
  title: 'Black Friday traffic can expose problems that normal traffic hides.',
  copy: 'More visitors only help when the store is ready for them. Extra traffic is most useful when:',
  points: [
    'mobile shopping is clear;',
    'customers understand products quickly;',
    'trust and delivery information are visible;',
    'checkout has minimal friction;',
    'tracking is working.',
  ],
  closing: 'A Growth Review shows which of these deserves attention first.',
} as const
