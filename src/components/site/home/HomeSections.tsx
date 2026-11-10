import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { InsightCard, ProofQuote } from '@/lib/site/home-data'
import { ALL_INSIGHTS_HREF, CONTACT_HREF, GROWTH_REVIEW_HREF, insightHref } from '@/lib/site/routes'
import { DiagnosticSystem } from '../growth-review/DiagnosticSystem'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { TestimonialQuote } from '../proof/TestimonialQuote'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'
import { FINAL_CTA, PRINCIPLES } from './home-content'
import { HomeDiagnostic } from './HomeDiagnostic'
import styles from './home.module.css'

/* ── 09 — Self-diagnostic (server shell around the client leaf) ── */

export function HomeDiagnosticSection() {
  return (
    <SiteSection tone="night" aria-labelledby="home-diagnostic-title">
      <SiteGrid className="mb-12 gap-y-6">
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteEyebrow signal motionIndex={0}>Quick diagnostic</SiteEyebrow>
          <SiteDisplayHeading id="home-diagnostic-title" size="h2" className="mt-6" motionIndex={1} lines={['Where is growth', 'getting stuck?']} />
        </SiteReveal>
        <SiteReveal motion="soft" index={4} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>Most growth problems show up as a symptom first. Pick the one you recognize.</SiteLede>
        </SiteReveal>
      </SiteGrid>
      <SiteReveal motion="none">
        <HomeDiagnostic />
      </SiteReveal>
    </SiteSection>
  )
}

/* ── 10 — Visible, nonempty testimonials; omitted when there are none ── */

export function HomeProof({ quotes }: { quotes: ProofQuote[] }) {
  if (quotes.length === 0) return null
  return (
    <SiteSection tone="cloud" aria-labelledby="home-proof-title">
      <SiteEyebrow>Client feedback</SiteEyebrow>
      <SiteDisplayHeading id="home-proof-title" size="h2" className="mt-6 max-w-[44rem]">What clients say</SiteDisplayHeading>

      <div className={cn('mt-10 grid gap-[var(--hb-grid-gap)]', quotes.length === 1 ? 'max-w-4xl' : quotes.length === 2 ? 'lg:grid-cols-2' : 'md:grid-cols-2 xl:grid-cols-3')}>
        {quotes.map(q => <TestimonialQuote key={q.id} quote={q} />)}
      </div>
    </SiteSection>
  )
}

/* ── 11 — Why the work starts differently ── */

export function HomePrinciples() {
  return (
    <SiteSection tone="white" aria-labelledby="home-principles-title">
      <SiteGrid className="gap-y-12">
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-4">
          <SiteEyebrow motionIndex={0}>Principles</SiteEyebrow>
          <SiteDisplayHeading id="home-principles-title" size="h2" className="mt-6" motionIndex={1} lines={['Why the work', 'starts differently.']} />
        </SiteReveal>
        <ol className="col-span-4 grid gap-10 md:col-span-8 md:grid-cols-3 lg:col-span-8 lg:col-start-5">
          {PRINCIPLES.map((p, i) => (
            <SiteReveal as="li" key={p.name} motion="item" index={i + 2} className="relative pl-6">
              <span aria-hidden="true" className="absolute left-0 top-1 block h-3 w-[4px] rounded-[1px] bg-hb-structure" />
              <span aria-hidden="true" className="absolute bottom-1 left-0 top-6 block w-[4px] rounded-[1px] bg-hb-structure opacity-30" />
              <h3 className="font-hb-display text-[length:var(--hb-text-h3)] font-semibold leading-tight tracking-[-0.02em] text-hb-fg">
                {p.name}
              </h3>
              <p className="mt-3 leading-relaxed text-hb-fg-body">{p.text}</p>
            </SiteReveal>
          ))}
        </ol>
      </SiteGrid>
    </SiteSection>
  )
}

/* ── 12 — Insights (published blog_posts; omitted when there are none) ── */

const DATE = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

export function HomeInsights({ posts }: { posts: InsightCard[] }) {
  if (posts.length === 0) return null
  return (
    <SiteSection tone="cloud" aria-labelledby="home-insights-title">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <SiteReveal motion="none">
          <SiteEyebrow motionIndex={0}>Insights</SiteEyebrow>
          <SiteDisplayHeading id="home-insights-title" size="h2" className="mt-6 max-w-[40rem]" motionIndex={1} lines={['Ideas for building better', 'digital businesses.']} />
        </SiteReveal>
        <SiteLinkArrow href={ALL_INSIGHTS_HREF}>View all insights</SiteLinkArrow>
      </div>

      <ul className="mt-12 grid gap-x-[var(--hb-grid-gap)] gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <SiteReveal as="li" key={post.id} motion="card" index={i}>
            <article className={cn(styles.mediaHover, 'group relative flex h-full flex-col')}>
              <div className={cn(styles.media, 'aspect-[16/10]')}>
                {post.image && (
                  <SiteImage src={post.image.src} alt={post.image.alt} sizes="(min-width: 1024px) 30vw, (min-width: 768px) 50vw, 100vw" />
                )}
              </div>
              {post.category && (
                <p className="mt-5 text-[length:var(--hb-text-eyebrow)] font-semibold uppercase tracking-[0.14em] text-hb-link">
                  {post.category}
                </p>
              )}
              <h3 className="mt-2 font-hb-display text-[1.25rem] font-semibold leading-snug tracking-[-0.015em] text-hb-fg">
                <Link href={insightHref(post.slug)} className="after:absolute after:inset-0 after:content-[''] group-hover:underline">
                  {post.title}
                </Link>
              </h3>
              {post.excerpt && <p className="mt-2 leading-relaxed text-hb-fg-body">{post.excerpt}</p>}
              {(post.readTime || post.publishedAt) && (
                <p className="mt-4 text-[0.8125rem] text-hb-fg-muted">
                  {[post.publishedAt ? DATE.format(new Date(post.publishedAt)) : null, post.readTime].filter(Boolean).join(' · ')}
                </p>
              )}
            </article>
          </SiteReveal>
        ))}
      </ul>
    </SiteSection>
  )
}

/** Two balanced phrases for the masked headline reveal ("Find what should" / "move next."). */
function splitHeadline(headline: string) {
  const words = headline.split(' ')
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

/* ── 13 — Final Growth Review CTA: the system, now connected ── */

export function HomeFinalCta() {
  return (
    <SiteSection tone="night" aria-labelledby="home-final-title" className="overflow-hidden">
      <SiteGrid className="items-center gap-y-12">
        <SiteReveal motion="none" className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteEyebrow signal motionIndex={0}>Growth Review</SiteEyebrow>
          <SiteDisplayHeading id="home-final-title" size="h1" className="mt-6" motionIndex={1} lines={splitHeadline(FINAL_CTA.headline)} />
          <SiteLede className="mt-6" motionIndex={4}>{FINAL_CTA.copy}</SiteLede>
          <div data-motion="soft" style={{ '--hb-motion-index': 5.5 } as React.CSSProperties} className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Hbee
            </SiteButton>
          </div>
        </SiteReveal>
        {/* The Growth Review looks at five diagnostic areas, not the six business modules. Temporary: the existing CSS diagnostic system until the dedicated 3D diagnostic assets exist. */}
        {/* The visual arrives last, with a restrained depth + fade. data-gate-motion holds the diagnostic's own one-time
            assemble/connect/signal until this reveal fires, so it plays when the visitor reaches it, not on page load. */}
        <SiteReveal motion="visual" index={6} className="col-span-4 md:col-span-8 lg:col-span-5 lg:col-start-8">
          <div data-gate-motion="">
            <DiagnosticSystem idPrefix="home-final" className="mx-auto max-w-[340px] md:max-w-[440px] lg:max-w-[480px]" />
          </div>
        </SiteReveal>
      </SiteGrid>
    </SiteSection>
  )
}
