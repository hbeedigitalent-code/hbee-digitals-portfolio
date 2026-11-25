'use client'

import Link from 'next/link'
import PlacementManager from '@/components/admin/media/PlacementManager'
import { WORK_SHOWCASE } from '@/lib/media/placements'

export default function AdminWorkShowcasePage() {
  return <div className="space-y-6">
    <div>
      <Link href="/admin/portfolio" className="text-sm text-[var(--accent)] underline">← Portfolio</Link>
      <h1 className="mt-2 text-2xl font-black text-[var(--text-primary)]">Creative Portfolio</h1>
      <p className="mt-2 max-w-2xl text-sm text-[var(--text-secondary)]">Individual pieces shown on <a href="/work" target="_blank" rel="noopener" className="text-[var(--accent)] underline">/work</a> as “Selected creative work”, below the projects. A piece does not need its own project page. Only add work Hbee actually made.</p>
    </div>
    <PlacementManager target={WORK_SHOWCASE} heading="Selected creative work" description="Appears on the Work page, below the project list." />
  </div>
}
