import { Fragment } from 'react'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteDisplayHeading } from '../primitives/SiteTypography'
import { SiteSection } from '../primitives/SiteSection'
import { BRIDGE } from './home-content'

/**
 * 03 — Positioning bridge. Typography and space; almost no decoration.
 * The six parts sit in Muted (large text, ≥3:1), resolving into the
 * statement in Ink and Royal Blue.
 */
export function HomeBridge() {
  return (
    <SiteSection tone="white" aria-labelledby="home-bridge-title">
      <SiteReveal motion="none" className="max-w-[60rem]">
        <p className="font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.15] tracking-[-0.03em] text-hb-muted">
          {BRIDGE.parts.map((part, i) => (
            <Fragment key={part}>
              {/* Six distinct ideas, one after another; the last (Growth) is the one that resolves into blue. */}
              <span data-motion="item" style={{ '--hb-motion-index': i * 0.55 } as React.CSSProperties} className={i === BRIDGE.parts.length - 1 ? 'inline-block text-hb-blue' : 'inline-block'}>
                {part}
              </span>{' '}
            </Fragment>
          ))}
        </p>
        <SiteDisplayHeading
          id="home-bridge-title"
          size="h2"
          className="mt-8 leading-[1.1]"
          motionIndex={4.2}
          lines={[BRIDGE.lineA, <span key="b" className="text-hb-blue">{BRIDGE.lineB}</span>]}
        />
      </SiteReveal>
    </SiteSection>
  )
}
