import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { InsightCard, ProofQuote } from '@/lib/site/home-data'
import { ALL_INSIGHTS_HREF, CONTACT_HREF, GROWTH_REVIEW_HREF, insightHref } from '@/lib/site/routes'
import { HbeeModuleGroup } from '../module/HbeeModuleGroup'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
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
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteReveal>
            <SiteEyebrow signal>Quick diagnostic</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-diagnostic-title" size="h2" className="mt-6">
              Where is growth getting stuck?
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <SiteReveal index={2} className="col-span-4 self-end md:col-span-8 lg:col-span-5 lg:col-start-8">
          <SiteLede>Most growth problems show up as a symptom first. Pick the one you recognize.</SiteLede>
        </SiteReveal>
      </SiteGrid>
      <HomeDiagnostic />
    </SiteSection>
  )
}

/* ── 10 — Proof (real testimonials only; omitted when there are none) ── */

export function HomeProof({ quotes }: { quotes: ProofQuote[] }) {
  if (quotes.length === 0) return null
  return (
    <SiteSection tone="cloud" aria-labelledby="home-proof-title">
      <SiteReveal>
        <SiteEyebrow>Proof</SiteEyebrow>
      </SiteReveal>
      <SiteReveal index={1}>
        <SiteDisplayHeading id="home-proof-title" size="h2" className="mt-6 max-w-[44rem]">
          Different businesses. <span className="block text-hb-blue">Same principle: solve the right constraint first.</span>
        </SiteDisplayHeading>
      </SiteReveal>

      <div className={cn('mt-14 grid gap-[var(--hb-grid-gap)]', quotes.length > 1 && 'lg:grid-cols-2')}>
        {quotes.map((q, i) => (
          <SiteReveal key={q.id} index={i}>
            <figure className="flex h-full flex-col rounded-[var(--hb-radius-xs)] rounded-br-[var(--hb-radius-sweep)] border border-hb-border bg-hb-white p-8 md:p-10">
              <svg aria-hidden="true" viewBox="0 0 44 32" className={styles.quoteMark} focusable="false">
                <path d="M0 32V19Q0 5 13 0l3 5Q8 9 8 17h8v15Zm24 0V19q0-14 13-19l3 5q-8 4-8 12h8v15Z" fill="currentColor" />
              </svg>
              <blockquote
                className={cn(
                  'mt-6 flex-1 font-hb-display font-medium leading-[1.45] tracking-[-0.01em] text-hb-fg',
                  quotes.length > 1 ? 'text-[1.25rem]' : 'text-[1.5rem] lg:text-[1.75rem]',
                )}
              >
                <p>{q.quote}</p>
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-4 border-t border-hb-border pt-6">
                {q.avatar && (
                  <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-hb-mist">
                    <SiteImage src={q.avatar} alt="" sizes="48px" />
                  </span>
                )}
                <span>
                  <span className="block font-semibold text-hb-fg">{q.name}</span>
                  {(q.role || q.company) && (
                    <span className="block text-[0.875rem] text-hb-fg-body">{[q.role, q.company].filter(Boolean).join(', ')}</span>
                  )}
                </span>
              </figcaption>
            </figure>
          </SiteReveal>
        ))}
      </div>
    </SiteSection>
  )
}

/* ── 11 — Why the work starts differently ── */

export function HomePrinciples() {
  return (
    <SiteSection tone="white" aria-labelledby="home-principles-title">
      <SiteGrid className="gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-4">
          <SiteReveal>
            <SiteEyebrow>Principles</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-principles-title" size="h2" className="mt-6">
              Why the work starts differently.
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <ol className="col-span-4 grid gap-10 md:col-span-8 md:grid-cols-3 lg:col-span-8 lg:col-start-5">
          {PRINCIPLES.map((p, i) => (
            <SiteReveal as="li" key={p.name} index={i} className="relative pl-6">
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
        <div>
          <SiteReveal>
            <SiteEyebrow>Insights</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-insights-title" size="h2" className="mt-6 max-w-[40rem]">
              Ideas for building better digital businesses.
            </SiteDisplayHeading>
          </SiteReveal>
        </div>
        <SiteLinkArrow href={ALL_INSIGHTS_HREF}>View all insights</SiteLinkArrow>
      </div>

      <ul className="mt-12 grid gap-x-[var(--hb-grid-gap)] gap-y-12 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post, i) => (
          <SiteReveal as="li" key={post.id} index={i}>
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

/* ── 13 — Final Growth Review CTA: the system, now connected ── */

export function HomeFinalCta() {
  return (
    <SiteSection tone="night" aria-labelledby="home-final-title" className="overflow-hidden">
      <SiteGrid className="items-center gap-y-12">
        <div className="col-span-4 md:col-span-8 lg:col-span-6">
          <SiteReveal>
            <SiteEyebrow signal>Growth Review</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="home-final-title" size="h1" className="mt-6">
              {FINAL_CTA.headline}
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <SiteLede className="mt-6">{FINAL_CTA.copy}</SiteLede>
          </SiteReveal>
          <SiteReveal index={3} className="mt-9 flex flex-wrap items-center gap-3">
            <SiteButton href={GROWTH_REVIEW_HREF} variant="conversion" size="lg" arrow>
              Start Growth Review
            </SiteButton>
            <SiteButton href={CONTACT_HREF} variant="secondary" size="lg">
              Talk to Hbee
            </SiteButton>
          </SiteReveal>
        </div>
        <div className="col-span-4 hidden md:col-span-8 md:block lg:col-span-5 lg:col-start-8">
          <HbeeModuleGroup idPrefix="final" label="The six parts, connected." className="mx-auto max-w-[480px]" />
        </div>
      </SiteGrid>
    </SiteSection>
  )
}
