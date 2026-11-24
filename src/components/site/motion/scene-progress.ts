/**
 * Pure maths for reversible scroll-progress scenes (no DOM, no React) so it can be unit-tested.
 *
 * A scene has a cached document position (docTop) and height. Progress is a pure function of the
 * scroll offset, so scrolling down assembles and scrolling back up separates by the same path:
 * nothing is latched, nothing is one-shot.
 */

export type SceneAnchor = 'top' | 'center' | 'bottom'

export interface SceneRange {
  /** Which edge of the scene is tracked. */
  anchor: SceneAnchor
  /** Viewport fraction (0 = top edge, 1 = bottom edge) where the anchor sits at progress 0. */
  from: number
  /** Viewport fraction where the anchor sits at progress 1. */
  to: number
  /** Force progress to 1 once the page can scroll no further (a short last scene must still settle). */
  settleAtEnd?: boolean
}

export interface SceneMetrics {
  /** Distance from the document top to the scene's top edge. Cached; never read per frame. */
  docTop: number
  height: number
}

export interface ScrollMetrics {
  scrollY: number
  viewportHeight: number
  /** document height; only needed when settleAtEnd is used */
  documentHeight?: number
}

/** A change smaller than this is not written (no style churn from sub-pixel scroll jitter). */
export const PROGRESS_EPSILON = 0.004
/** Within this distance of either end the value snaps to the exact settled state. */
export const PROGRESS_SNAP = 0.02

export const clamp01 = (value: number): number => (value > 1 ? 1 : value > 0 ? value : 0)

/** Raw, unsnapped progress 0..1 for a scene at the current scroll offset. */
export function rawSceneProgress(scene: SceneMetrics, scroll: ScrollMetrics, range: SceneRange): number {
  const top = scene.docTop - scroll.scrollY
  const anchorOffset = range.anchor === 'top' ? 0 : range.anchor === 'center' ? scene.height / 2 : scene.height
  const anchorY = top + anchorOffset
  const start = range.from * scroll.viewportHeight
  const end = range.to * scroll.viewportHeight
  if (start === end) return anchorY <= end ? 1 : 0
  const progress = clamp01((anchorY - start) / (end - start))
  if (range.settleAtEnd && scroll.documentHeight !== undefined && scroll.scrollY + scroll.viewportHeight >= scroll.documentHeight - 2) return 1
  return progress
}

/** Snap values within PROGRESS_SNAP of 0 or 1 so the resting states are exact. */
export function snapProgress(progress: number): number {
  const value = clamp01(progress)
  if (value <= PROGRESS_SNAP) return 0
  if (value >= 1 - PROGRESS_SNAP) return 1
  return value
}

/** Settled, snapped progress for a scene. */
export function sceneProgress(scene: SceneMetrics, scroll: ScrollMetrics, range: SceneRange): number {
  return snapProgress(rawSceneProgress(scene, scroll, range))
}

/** True when the new value is worth writing: an end state that changed, or a delta above the epsilon. */
export function shouldWriteProgress(previous: number | null, next: number): boolean {
  if (previous === null) return true
  if (next === previous) return false
  if (next === 0 || next === 1) return true
  return Math.abs(next - previous) >= PROGRESS_EPSILON
}

/** CSS custom property value: fixed precision so equal progress yields an identical string. */
export const formatProgress = (progress: number): string => (progress <= 0 ? '0' : progress >= 1 ? '1' : progress.toFixed(3))
