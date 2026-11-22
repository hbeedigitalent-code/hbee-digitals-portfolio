// src/components/admin/ProjectOverlapNotice.tsx
//
// New-proposal form: once a business with a portal account is chosen, shows the projects that client already has and what approval
// will do, so Admin does not unknowingly create a second project for work the client already requested. READ-ONLY and advisory:
// it links, recommends and warns, but never creates, links, merges, archives or deletes a project, and it does not change what
// the proposal does. See project-overlap.ts for why a project cannot be attached to a proposal in advance.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { APPROVAL_CREATES_PROJECT, ARCHIVE_ADVICE, type ProjectOverlap } from '@/lib/commerce/project-overlap'

export default function ProjectOverlapNotice({ clientId }: { clientId: string | null | undefined }) {
  const [overlap, setOverlap] = useState<ProjectOverlap | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setOverlap(null)
    setFailed(false)
    if (!clientId) return
    let live = true
    fetch(`/api/admin/clients/${encodeURIComponent(clientId)}/commerce`, { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (!live) return
        // A failed project read must never read as "no projects": say it could not be checked.
        if ((d.unavailable || []).includes('projects') || !d.projectOverlap) setFailed(true)
        else setOverlap(d.projectOverlap as ProjectOverlap)
      })
      .catch(() => live && setFailed(true))
    return () => {
      live = false
    }
  }, [clientId])

  if (!clientId) return null
  if (failed) return <p role="status" className="text-xs text-[var(--warning)]">This client&apos;s existing projects could not be checked. {APPROVAL_CREATES_PROJECT}</p>
  if (!overlap) return null

  const box = 'space-y-2 rounded-lg border p-3 text-sm text-[var(--text-secondary)] '
  if (overlap.level === 'none') {
    return (
      <div data-project-overlap="none" className={box + 'border-[var(--border)]'}>
        <p>This client has no live project yet. Approval will create the first one.</p>
      </div>
    )
  }

  return (
    <div data-project-overlap={overlap.level} className={box + 'border-[var(--warning)]'}>
      {overlap.recommended ? (
        <p>
          <strong>Possible duplicate:</strong> this client already has one project, <Link href={`/admin/projects/${overlap.recommended.id}`} className="underline">{overlap.recommended.name}</Link>
          {' '}({overlap.recommended.status}), most likely created from their request.
        </p>
      ) : (
        <p><strong>Check before you continue:</strong> this client already has {overlap.relevant.length} live {overlap.relevant.length === 1 ? 'project' : 'projects'}. Review them and make sure this proposal is not for work that already has one.</p>
      )}
      <ul className="space-y-1">
        {overlap.relevant.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-2">
            <Link href={`/admin/projects/${p.id}`} className="min-w-0 break-words underline">{p.name}</Link>
            <span className="text-xs text-[var(--text-muted)]">{p.status}</span>
          </li>
        ))}
      </ul>
      <p>{APPROVAL_CREATES_PROJECT}</p>
      <p>{overlap.recommended ? ARCHIVE_ADVICE : `${ARCHIVE_ADVICE} With more than one project here, no single one is assumed to be the match.`}</p>
    </div>
  )
}
