import { SiteReveal } from '../motion/SiteReveal'
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
      <div className="max-w-[60rem]">
        <SiteReveal>
          <p className="font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.15] tracking-[-0.03em] text-hb-muted">
            {BRIDGE.parts.map((part, i) => (
              <span key={part} className={i === BRIDGE.parts.length - 1 ? 'text-hb-blue' : undefined}>
                {part}{' '}
              </span>
            ))}
          </p>
        </SiteReveal>
        <SiteReveal index={1}>
          <h2
            id="home-bridge-title"
            className="mt-8 font-hb-display text-[length:var(--hb-text-h2)] font-bold leading-[1.1] tracking-[-0.03em] text-hb-fg"
          >
            <span className="block">{BRIDGE.lineA}</span>{' '}
            <span className="block text-hb-blue">{BRIDGE.lineB}</span>
          </h2>
        </SiteReveal>
      </div>
    </SiteSection>
  )
}
