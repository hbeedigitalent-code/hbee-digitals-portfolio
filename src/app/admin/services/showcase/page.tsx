'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import PlacementManager from '@/components/admin/media/PlacementManager'
import { CAPABILITY_SLUGS, SERVICE_NAMES, serviceShowcase } from '@/lib/media/placements'
import { isCapabilitySlug, type CapabilitySlug } from '@/lib/portfolio-creative'

/**
 * Selected work for each of the six public capability pages. Those pages are code-owned, so this screen is separate from
 * the database "services" records managed on the Services list.
 */
export default function AdminCapabilityShowcasePage() {
  const [slug, setSlug] = useState<CapabilitySlug>('creative-ugc')

  // Deep link from the Media Library's "Used in" list: ?capability=<slug>.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get('capability')
    if (isCapabilitySlug(wanted)) setSlug(wanted)
  }, [])

  return <div className="space-y-6">
    <div>
      <Link href="/admin/services" className="text-sm text-[var(--accent)] underline">← Services</Link>
      <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Capability showcases</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Choose which Media Library pieces appear on each capability page. A section appears only when at least one piece is switched on. Only add work Hbee actually made: a logo used under Trusted Brands is not, by itself, Hbee design work.</p>
    </div>
    <div role="group" aria-label="Capability" className="flex flex-wrap gap-2">
      {CAPABILITY_SLUGS.map((value) => <button key={value} type="button" aria-pressed={value === slug} onClick={() => setSlug(value)}
        className={`rounded-lg border px-3 py-2 text-xs font-semibold ${value === slug ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--border)] text-[var(--text-primary)]'}`}>{SERVICE_NAMES[value]}</button>)}
    </div>
    <p className="text-sm text-[var(--text-muted)]">Public page: <a href={`/services/${slug}`} target="_blank" rel="noopener" className="text-[var(--accent)] underline">/services/{slug}</a></p>
    <PlacementManager key={slug} target={serviceShowcase(slug)} heading={`${SERVICE_NAMES[slug]}: selected work`} description={`Appears on /services/${slug}.`} />
  </div>
}
