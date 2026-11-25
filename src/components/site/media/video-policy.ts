/** Whether a decorative background video may load and autoplay. Pure, so the rules are testable. */
export interface BackgroundVideoConditions {
  reducedMotion: boolean
  /** Viewport below 768px. */
  narrow: boolean
  /** The browser's "reduce data usage" preference, where exposed. */
  saveData: boolean
  /** Opt in per placement: only for small, short clips. */
  allowMobile?: boolean
}

export function backgroundVideoAllowed({ reducedMotion, narrow, saveData, allowMobile = false }: BackgroundVideoConditions): boolean {
  if (reducedMotion || saveData) return false
  return allowMobile || !narrow
}
