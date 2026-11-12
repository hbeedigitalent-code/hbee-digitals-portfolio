/**
 * Route geometry for the hero systems: rounded orthogonal paths and the share
 * of the route at which each waypoint is reached (so a stage can respond just
 * as the signal arrives). Pure functions, no dependencies.
 */

export type Pt = readonly [number, number]

const fmt = (n: number) => String(Math.round(n * 100) / 100)

/** A polyline with every interior corner rounded by `r` (quadratic, clamped to half of each adjoining segment). */
export function roundedPath(points: readonly Pt[], r = 2.2): string {
  if (points.length < 2) return ''
  let d = `M${fmt(points[0][0])} ${fmt(points[0][1])}`
  for (let i = 1; i < points.length - 1; i++) {
    const [px, py] = points[i - 1]
    const [cx, cy] = points[i]
    const [nx, ny] = points[i + 1]
    const inLen = Math.hypot(cx - px, cy - py)
    const outLen = Math.hypot(nx - cx, ny - cy)
    const k = Math.min(r, inLen / 2, outLen / 2)
    if (k <= 0) continue
    const ax = cx - ((cx - px) / inLen) * k
    const ay = cy - ((cy - py) / inLen) * k
    const bx = cx + ((nx - cx) / outLen) * k
    const by = cy + ((ny - cy) / outLen) * k
    d += `L${fmt(ax)} ${fmt(ay)}Q${fmt(cx)} ${fmt(cy)} ${fmt(bx)} ${fmt(by)}`
  }
  const last = points[points.length - 1]
  return `${d}L${fmt(last[0])} ${fmt(last[1])}`
}

/** Fraction (0–1) of the polyline's length at which each waypoint is reached. */
export function waypointShares(points: readonly Pt[]): number[] {
  const cumulative: number[] = [0]
  for (let i = 1; i < points.length; i++) {
    cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]))
  }
  const total = cumulative[cumulative.length - 1] || 1
  return cumulative.map((c) => c / total)
}
