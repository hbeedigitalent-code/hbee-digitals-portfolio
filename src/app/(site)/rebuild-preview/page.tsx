import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import { notFound } from 'next/navigation'

import { HbeeLogo } from '@/components/site/brand/HbeeLogo'
import { HbeeModuleGlyph, HbeeModuleStandalone } from '@/components/site/module/HbeeModule'
import { HbeeModuleGroup } from '@/components/site/module/HbeeModuleGroup'
import { SiteReveal } from '@/components/site/motion/SiteReveal'
import { SiteButton, SiteLinkArrow } from '@/components/site/primitives/SiteButton'
import { SiteCard, SiteTag } from '@/components/site/primitives/SiteCard'
import { SiteGrid } from '@/components/site/primitives/SiteContainer'
import { SiteSection } from '@/components/site/primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '@/components/site/primitives/SiteTypography'
import { CAPABILITIES } from '@/components/site/navigation'
import { BarChart3, Tag } from 'lucide-react'

/**
 * /rebuild-preview — LOCAL DESIGN-SYSTEM SHOWCASE (rebuild Phase 1).
 *
 * Temporary. Not linked, not in the sitemap, noindex, and it 404s on any
 * Vercel production build. Delete before launch.
 */
export const metadata: Metadata = {
  title: 'Rebuild preview',
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
}

const PALETTE: { name: string; token: string; hex: string; role: string }[] = [
  { name: 'Royal Blue', token: '--hb-blue', hex: '#0642B3', role: 'Structure' },
  { name: 'Signal Orange', token: '--hb-orange', hex: '#FC5D1C', role: 'Action' },
  { name: 'Deep Blue', token: '--hb-deep-blue', hex: '#07338F', role: 'Structure, pressed' },
  { name: 'Electric Blue', token: '--hb-electric', hex: '#1D6EFF', role: 'Energy, focus' },
  { name: 'Ice Blue', token: '--hb-ice', hex: '#CFE0FF', role: 'Quiet structure' },
  { name: 'Mist', token: '--hb-mist', hex: '#EAF2FF', role: 'Content plane' },
  { name: 'Night', token: '--hb-night', hex: '#061426', role: 'Immersive depth' },
  { name: 'Deep Navy', token: '--hb-deep-navy', hex: '#071A32', role: 'Dark surface' },
  { name: 'Midnight Surface', token: '--hb-midnight', hex: '#0D2340', role: 'Raised on dark' },
  { name: 'Cloud', token: '--hb-cloud', hex: '#F7F9FC', role: 'Primary environment' },
  { name: 'White', token: '--hb-white', hex: '#FFFFFF', role: 'Surface' },
  { name: 'Ink', token: '--hb-ink', hex: '#111827', role: 'Headings' },
  { name: 'Slate', token: '--hb-slate', hex: '#475569', role: 'Body text' },
  { name: 'Muted', token: '--hb-muted', hex: '#718096', role: 'Large / secondary only' },
  { name: 'Soft Border', token: '--hb-border-soft', hex: '#DDE6F2', role: 'Dividers, outlines' },
]

const TYPE_SCALE: { label: string; size: 'display' | 'h1' | 'h2' | 'h3' | 'h4'; sample: string }[] = [
  { label: 'Display · Manrope 700', size: 'display', sample: 'Growth works better when everything connects.' },
  { label: 'H1 · Manrope 700', size: 'h1', sample: 'Growth rarely breaks in just one place.' },
  { label: 'H2 · Manrope 700', size: 'h2', sample: 'Where is growth getting stuck?' },
  { label: 'H3 · Manrope 600', size: 'h3', sample: 'Commerce experience' },
  { label: 'H4 · Manrope 600', size: 'h4', sample: 'Assess, prioritize, build' },
]

function PreviewLabel({ children }: { children: ReactNode }) {
  return <SiteEyebrow className="mb-8">{children}</SiteEyebrow>
}

const ANATOMY = [
  ['Structural Shell', 'The Royal Blue face. Substantial, never white.'],
  ['Depth Plane', 'Stacked Deep Blue → Navy layers give shallow, real depth.'],
  ['Sweep', 'One large-radius corner — the controlled sweep of the mark’s D.'],
  ['Open Channel', 'A recessed slot broken by a Connection Gap, after the mark’s separated stem.'],
  ['Edge Energy', 'A restrained Electric Blue rim, strongest where light enters.'],
  ['Glass Plane', 'Thin translucent support behind selected modules only.'],
  ['Signal Insert', 'A raised orange capsule. Activation — one or two per composition.'],
]

const ICON = { strokeWidth: 1.75, width: '100%', height: '100%' } as const

export default function RebuildPreviewPage() {
  if (process.env.VERCEL_ENV === 'production') notFound()

  return (
    <>
      {/* ── Intro / type-led composition ─────────────────────── */}
      <SiteSection tone="cloud" className="overflow-hidden" aria-labelledby="preview-title">
        <SiteGrid className="items-center gap-y-14">
          <div className="col-span-4 md:col-span-8 lg:col-span-6">
            <SiteReveal>
              <SiteEyebrow signal>Rebuild preview · Phase 1.1</SiteEyebrow>
            </SiteReveal>
            <SiteReveal index={1}>
              <SiteDisplayHeading as="h1" size="display" id="preview-title" className="mt-6">
                Growth works better when everything connects.
              </SiteDisplayHeading>
            </SiteReveal>
            <SiteReveal index={2}>
              <SiteLede className="mt-7">
                A design-system specimen for the new Hbee public site — tokens, type, controls, cards and the
                static Hbee Module. Not the homepage.
              </SiteLede>
            </SiteReveal>
            <SiteReveal index={3} className="mt-10 flex flex-wrap items-center gap-3">
              <SiteButton href="/growth-review" variant="conversion" size="lg" arrow>
                Start Growth Review
              </SiteButton>
              <SiteButton href="/work" variant="secondary" size="lg">
                See the work
              </SiteButton>
            </SiteReveal>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-6">
            <HbeeModuleGroup idPrefix="light" label="Six connected capabilities: Brand, Experience, Technology, Creative, Discovery, Growth" />
          </div>
        </SiteGrid>
      </SiteSection>

      {/* ── Brand assets ─────────────────────────────────────── */}
      <SiteSection tone="white" spacing="compact" aria-labelledby="brand-title">
        <PreviewLabel>01 · Brand</PreviewLabel>
        <SiteDisplayHeading id="brand-title" size="h2">The existing mark, used as supplied</SiteDisplayHeading>
        <SiteGrid className="mt-10 gap-y-6">
          <SiteCard className="col-span-4 md:col-span-4 lg:col-span-6 flex min-h-[200px] items-center justify-center">
            <HbeeLogo href={null} size="lg" />
          </SiteCard>
          <div data-tone="night" className="col-span-4 flex min-h-[200px] items-center justify-center rounded-[var(--hb-radius-md)] md:col-span-4 lg:col-span-6">
            <HbeeLogo href={null} size="lg" onDark />
          </div>
        </SiteGrid>
        <p className="mt-6 max-w-[46rem] text-[length:var(--hb-text-small)] text-hb-fg-body">
          Source: <code>public/svgs/logo.png</code> (512 × 512, the production fallback mark). The name is live text,
          as on the current site. No vector master, wordmark file or “Digital Growth Studio” lockup exists in the
          repository yet — they drop into <code>HbeeLogo</code> when supplied.
        </p>
      </SiteSection>

      {/* ── Palette ──────────────────────────────────────────── */}
      <SiteSection tone="cloud" spacing="compact" aria-labelledby="palette-title">
        <PreviewLabel>02 · Colour</PreviewLabel>
        <SiteDisplayHeading id="palette-title" size="h2">Blue creates structure. Orange signals action.</SiteDisplayHeading>
        <ul className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {PALETTE.map((c) => (
            <li key={c.token} className="overflow-hidden rounded-[var(--hb-radius-md)] border border-hb-border bg-hb-surface">
              <div className="h-20" style={{ background: `var(${c.token})` }} />
              <div className="p-4">
                <p className="font-semibold text-hb-fg">{c.name}</p>
                <p className="mt-1 font-mono text-[0.75rem] text-hb-fg-body">{c.hex}</p>
                <p className="mt-2 text-[0.8125rem] text-hb-fg-body">{c.role}</p>
              </div>
            </li>
          ))}
        </ul>
      </SiteSection>

      {/* ── Typography ───────────────────────────────────────── */}
      <SiteSection tone="white" spacing="compact" aria-labelledby="type-title">
        <PreviewLabel>03 · Typography</PreviewLabel>
        <h2 id="type-title" className="sr-only">Typography</h2>
        <div className="flex flex-col divide-y divide-[color:var(--hb-border)]">
          {TYPE_SCALE.map((t) => (
            <div key={t.size} className="grid gap-3 py-8 lg:grid-cols-[200px_1fr] lg:gap-10">
              <p className="pt-2 text-[0.8125rem] font-medium text-hb-fg-body">{t.label}</p>
              <SiteDisplayHeading as="p" size={t.size}>
                {t.sample}
              </SiteDisplayHeading>
            </div>
          ))}
          <div className="grid gap-3 py-8 lg:grid-cols-[200px_1fr] lg:gap-10">
            <p className="pt-1 text-[0.8125rem] font-medium text-hb-fg-body">Lede · Inter 400</p>
            <SiteLede>
              Hbee connects brand, experience, technology and growth so improvements compound instead of competing.
            </SiteLede>
          </div>
          <div className="grid gap-3 py-8 lg:grid-cols-[200px_1fr] lg:gap-10">
            <p className="pt-1 text-[0.8125rem] font-medium text-hb-fg-body">Body · Inter 400</p>
            <p className="max-w-[40rem]">
              Body copy sits at 16px with generous leading. Headings and buttons are written in sentence case; the
              eyebrow is the only uppercase text in the system.
            </p>
          </div>
          <div className="grid gap-3 py-8 lg:grid-cols-[200px_1fr] lg:gap-10">
            <p className="pt-1 text-[0.8125rem] font-medium text-hb-fg-body">Eyebrow · Inter 600</p>
            <div className="flex flex-wrap gap-6">
              <SiteEyebrow>Capabilities</SiteEyebrow>
              <SiteEyebrow signal>Growth review</SiteEyebrow>
            </div>
          </div>
        </div>
      </SiteSection>

      {/* ── Grid ─────────────────────────────────────────────── */}
      <SiteSection tone="cloud" spacing="compact" aria-labelledby="grid-title">
        <PreviewLabel>04 · Grid</PreviewLabel>
        <SiteDisplayHeading id="grid-title" size="h3">
          1320px · 12 columns desktop · 8 tablet · 4 mobile
        </SiteDisplayHeading>
        <div aria-hidden="true">
        <SiteGrid className="mt-8">
          {Array.from({ length: 12 }, (_, i) => (
            <div
              key={i}
              className={`h-24 rounded-[var(--hb-radius-xs)] bg-hb-plane ${i >= 8 ? 'hidden lg:block' : i >= 4 ? 'hidden md:block' : ''}`}
            />
          ))}
        </SiteGrid>
        </div>
      </SiteSection>

      {/* ── Controls ─────────────────────────────────────────── */}
      <SiteSection tone="white" spacing="compact" aria-labelledby="controls-title">
        <PreviewLabel>05 · Controls</PreviewLabel>
        <SiteDisplayHeading id="controls-title" size="h2">Blue navigates. Orange converts.</SiteDisplayHeading>
        <SiteGrid className="mt-10 gap-y-6">
          <SiteCard className="col-span-4 md:col-span-8 lg:col-span-6">
            <p className="mb-6 text-[0.8125rem] font-medium">On light</p>
            <div className="flex flex-wrap items-center gap-3">
              <SiteButton href="/services">Explore services</SiteButton>
              <SiteButton href="/growth-review" variant="conversion" arrow>
                Start Growth Review
              </SiteButton>
              <SiteButton href="/work" variant="secondary">
                See the work
              </SiteButton>
              <SiteButton href="/how-we-work" variant="tertiary">
                How we work
              </SiteButton>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <SiteButton disabled>Disabled</SiteButton>
              <SiteButton size="lg" variant="conversion">
                Large conversion
              </SiteButton>
            </div>
          </SiteCard>
          <div data-tone="night" className="col-span-4 rounded-[var(--hb-radius-md)] p-6 md:col-span-8 md:p-8 lg:col-span-6">
            <p className="mb-6 text-[0.8125rem] font-medium">On Night</p>
            <div className="flex flex-wrap items-center gap-3">
              <SiteButton href="/services">Explore services</SiteButton>
              <SiteButton href="/growth-review" variant="conversion" arrow>
                Start Growth Review
              </SiteButton>
              <SiteButton href="/work" variant="secondary">
                See the work
              </SiteButton>
              <SiteButton href="/how-we-work" variant="tertiary">
                How we work
              </SiteButton>
            </div>
          </div>
        </SiteGrid>
      </SiteSection>

      {/* ── Cards ────────────────────────────────────────────── */}
      <SiteSection tone="cloud" spacing="compact" aria-labelledby="cards-title">
        <PreviewLabel>06 · Cards</PreviewLabel>
        <SiteDisplayHeading id="cards-title" size="h2">Quiet by default, branded with intent</SiteDisplayHeading>
        <SiteGrid className="mt-10 gap-y-6">
          <SiteCard className="col-span-4 lg:col-span-4" interactive>
            <SiteTag>Utility</SiteTag>
            <SiteDisplayHeading as="h3" size="h3" className="mt-5">
              Commerce experience
            </SiteDisplayHeading>
            <p className="mt-3">The default container for lists and grids. Flat surface, soft border.</p>
            <SiteLinkArrow href="/services" className="mt-6">
              Explore capability
            </SiteLinkArrow>
          </SiteCard>
          <SiteCard variant="plane" className="col-span-4 lg:col-span-4">
            <SiteTag tone="structure">Plane</SiteTag>
            <SiteDisplayHeading as="h3" size="h3" className="mt-5">
              Digital systems
            </SiteDisplayHeading>
            <p className="mt-3">Grouping without chrome — a tinted content plane.</p>
          </SiteCard>
          <SiteCard variant="branded" accent="signal" className="col-span-4 md:col-span-8 lg:col-span-4">
            <SiteTag tone="signal">Branded · Level 2</SiteTag>
            <SiteDisplayHeading as="h3" size="h3" className="mt-5">
              Growth review
            </SiteDisplayHeading>
            <p className="mt-3">A structural stem broken by a Connection Gap, one Sweep corner and a single signal. Use sparingly.</p>
          </SiteCard>
        </SiteGrid>
        <div className="mt-8 flex flex-wrap gap-2">
          {CAPABILITIES.map((c) => (
            <SiteTag key={c}>{c}</SiteTag>
          ))}
        </div>
      </SiteSection>

      {/* ── Module anatomy ───────────────────────────────────── */}
      <SiteSection tone="white" spacing="compact" aria-labelledby="module-title">
        <PreviewLabel>07 · Hbee Module</PreviewLabel>
        <SiteDisplayHeading id="module-title" size="h2">Structure is blue. Action is orange. Space is intentional.</SiteDisplayHeading>
        <SiteGrid className="mt-10 items-center gap-y-10">
          <div className="col-span-4 md:col-span-8 lg:col-span-7">
            <HbeeModuleStandalone label="Growth" icon={<BarChart3 {...ICON} />} signal glass width={62} />
          </div>
          <ol className="col-span-4 flex flex-col gap-4 md:col-span-8 lg:col-span-5">
            {ANATOMY.map(([name, text], i) => (
              <li key={name} className="grid grid-cols-[28px_1fr] gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-hb-night text-[0.75rem] font-bold text-white">
                  {i + 1}
                </span>
                <span>
                  <span className="font-semibold text-hb-fg">{name}.</span> {text}
                </span>
              </li>
            ))}
          </ol>
        </SiteGrid>

        <SiteGrid className="mt-14 gap-y-6">
          <SiteCard variant="plane" className="col-span-2 md:col-span-4 lg:col-span-4 !p-3">
            <HbeeModuleStandalone label="Brand" icon={<Tag {...ICON} />} sweep="tr" width={60} />
            <p className="px-3 pb-2 text-[length:var(--hb-text-small)]">Default — shell, depth, sweep, channel, edge.</p>
          </SiteCard>
          <SiteCard variant="plane" className="col-span-2 md:col-span-4 lg:col-span-4 !p-3">
            <HbeeModuleStandalone label="Glass" glass sweep="bl" width={60} />
            <p className="px-3 pb-2 text-[length:var(--hb-text-small)]">With a rear glass plane — selected modules only.</p>
          </SiteCard>
          <div data-tone="night" className="col-span-4 rounded-[var(--hb-radius-md)] p-3 md:col-span-8 lg:col-span-4">
            <HbeeModuleStandalone label="Growth" icon={<BarChart3 {...ICON} />} signal width={60} />
            <p className="px-3 pb-2 text-[length:var(--hb-text-small)]">Same module on Night — slightly deeper, more edge energy.</p>
          </div>
        </SiteGrid>

        <div className="mt-12 flex items-center gap-6 border-t border-hb-border pt-8">
          <HbeeModuleGlyph size={40} />
          <p className="max-w-[40rem] text-[length:var(--hb-text-small)]">
            Flat glyph of the same geometry, for small and decorative uses (footer accent, icons). The dimensional
            module is the branded default.
          </p>
        </div>
      </SiteSection>

      {/* ── Immersive dark section ───────────────────────────── */}
      <SiteSection tone="night" aria-labelledby="night-title" className="overflow-hidden">
        <SiteGrid className="items-center gap-y-14">
          <div className="col-span-4 md:col-span-8 lg:col-span-5">
            <SiteReveal>
              <SiteEyebrow signal>08 · Dark environment</SiteEyebrow>
            </SiteReveal>
            <SiteReveal index={1}>
              <SiteDisplayHeading id="night-title" size="h1" className="mt-6">
                Navy creates depth. Electric blue creates energy.
              </SiteDisplayHeading>
            </SiteReveal>
            <SiteReveal index={2}>
              <SiteLede className="mt-6">
                Dark sections are deliberate moments, set with data-tone=&quot;night&quot; — never inherited from the
                global theme.
              </SiteLede>
            </SiteReveal>
            <SiteReveal index={3} className="mt-9 flex flex-wrap gap-3">
              <SiteButton href="/growth-review" variant="conversion" arrow>
                Start Growth Review
              </SiteButton>
              <SiteButton href="/how-we-work" variant="secondary">
                How we work
              </SiteButton>
            </SiteReveal>
          </div>
          <div className="col-span-4 md:col-span-8 lg:col-span-6 lg:col-start-7">
            <HbeeModuleGroup idPrefix="night" />
          </div>
        </SiteGrid>
      </SiteSection>

      {/* ── Motion ───────────────────────────────────────────── */}
      <SiteSection tone="mist" spacing="compact" aria-labelledby="motion-title">
        <PreviewLabel>09 · Motion grammar</PreviewLabel>
        <SiteDisplayHeading id="motion-title" size="h2">Assemble · connect · reveal · shift · focus</SiteDisplayHeading>
        <SiteLede className="mt-4">
          Transform and opacity only. With reduced motion enabled, everything below is simply present.
        </SiteLede>
        <SiteGrid className="mt-10 gap-y-6">
          {(['reveal', 'shift', 'focus', 'assemble'] as const).map((m, i) => (
            <SiteReveal key={m} motion={m} index={i} className="col-span-2 md:col-span-2 lg:col-span-3">
              <SiteCard className="h-full">
                <p className="font-hb-display text-[1.25rem] font-semibold capitalize text-hb-fg">{m}</p>
                <p className="mt-2 text-[length:var(--hb-text-small)]">data-motion=&quot;{m}&quot;</p>
              </SiteCard>
            </SiteReveal>
          ))}
        </SiteGrid>
      </SiteSection>
    </>
  )
}
