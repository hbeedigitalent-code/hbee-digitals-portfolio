import styles from './site-footer.module.css'

/**
 * The Hbee crest: the surface that carries the page into the footer.
 *
 * Built from the same stepped, chamfered geometry as the Hbee module (45° steps, near-square corners), NOT a sine wave.
 * Two layered surfaces: a Royal/Electric Blue plane behind, and the footer's own navy in front with a thin electric edge.
 * Both repeat on an 800-unit period so a slow horizontal drift loops with no seam. The shape is filled, so it reads over
 * any preceding section (white, cloud, night or deep) without that section needing to be dark. It overhangs the section
 * above by a small, fixed height, so it only ever covers that section's bottom padding.
 *
 * Inline SVG, transform-only motion, no script. Decorative (aria-hidden). Static under reduced motion and on utility pages.
 */
const PERIOD = 800
const PERIODS = 5 // covers x = -800 … 3200, so a one-period drift never reveals an end
const BOTTOM = 130 // extends below the 120-unit viewBox so the shape always meets the footer edge

/** One period of each profile, as [x, y] (y measured from the top; larger y = lower). Start and end heights match. */
const NAVY: ReadonlyArray<readonly [number, number]> = [[0, 84], [120, 84], [152, 52], [330, 52], [362, 84], [520, 84], [544, 70], [640, 70], [664, 84], [800, 84]]
const BLUE: ReadonlyArray<readonly [number, number]> = [[0, 66], [200, 66], [240, 32], [430, 32], [470, 66], [640, 66], [664, 50], [744, 50], [768, 66], [800, 66]]

function surface(profile: ReadonlyArray<readonly [number, number]>): string {
  const points: string[] = []
  for (let k = 0; k < PERIODS; k += 1) {
    const offset = (k - 1) * PERIOD
    profile.forEach(([x, y], i) => {
      if (k > 0 && i === 0) return // shared with the previous period's last point
      points.push(`${x + offset} ${y}`)
    })
  }
  return `M${points.join('L')}V${BOTTOM}H${-PERIOD}Z`
}

const NAVY_PATH = surface(NAVY)
const BLUE_PATH = surface(BLUE)

export function FooterCrest() {
  return (
    <div className={styles.crestHolder} aria-hidden="true">
      <svg className={styles.crest} data-layer="" style={{ '--s': 0, '--e': 0.35 } as React.CSSProperties} viewBox="0 0 2400 120" preserveAspectRatio="xMidYMax slice" focusable="false">
        <g className={`${styles.crestLayer} ${styles.crestBack}`}>
          <path d={BLUE_PATH} className={styles.crestBlue} />
        </g>
        <g className={`${styles.crestLayer} ${styles.crestFront}`}>
          <path d={NAVY_PATH} className={styles.crestNavy} vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
    </div>
  )
}
