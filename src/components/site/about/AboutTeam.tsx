import type { CSSProperties } from 'react'
import { cn } from '@/lib/cn'
import type { TeamMember } from '@/lib/site/about-data'
import { CONTACT_HREF } from '@/lib/site/routes'
import { HbeeModuleGlyph } from '../module/HbeeModule'
import { SiteReveal } from '../motion/SiteReveal'
import { SiteButton } from '../primitives/SiteButton'
import { SiteGrid } from '../primitives/SiteContainer'
import { SiteImage } from '../primitives/SiteImage'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow } from '../primitives/SiteTypography'
import { TEAM_INTRO } from './about-content'
import { TeamRail } from './TeamRail'
import styles from './about.module.css'

/* ── 04 — Our people ──
   Real team_members rows only (getAboutData). The first person in the
   editor's display order receives the larger profile, shown with exactly the
   role the editor entered — no "Founder" label is added. Without a portrait
   a person shows their initials on a branded plane, never a stand-in face.
   With no team data the section says so plainly instead of inventing people. */

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function Portrait({ member, sizes, className }: { member: TeamMember; sizes: string; className?: string }) {
  return (
    <div className={cn(styles.portrait, className)}>
      {member.portrait ? (
        <SiteImage src={member.portrait.src} alt={member.portrait.alt} sizes={sizes} className={styles.portraitImg} />
      ) : (
        <span aria-hidden="true" className={styles.portraitPlane}>
          <HbeeModuleGlyph signal="none" className={styles.portraitGlyph} />
          <span className={styles.portraitInitials}>{initials(member.name)}</span>
        </span>
      )}
    </div>
  )
}

function LinkedIn({ member }: { member: TeamMember }) {
  if (!member.linkedin) return null
  return (
    <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className={styles.linkedin}>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className={styles.linkedinIcon}>
        <path
          fill="currentColor"
          d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11H3v-11Zm6.5 0h3.8v1.5h.06c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.77 2.52 4.77 5.8v5.65h-4v-5c0-1.2-.02-2.73-1.7-2.73-1.7 0-1.95 1.3-1.95 2.65v5.08h-4v-11Z"
        />
      </svg>
      <span className="sr-only">
        {member.name} on LinkedIn (opens in a new tab)
      </span>
    </a>
  )
}

function LeadProfile({ member }: { member: TeamMember }) {
  return (
    <SiteReveal motion="shift" className={styles.lead}>
      <article className={styles.leadCard} aria-labelledby="about-lead-name">
        <Portrait member={member} sizes="(min-width: 1152px) 22vw, (min-width: 640px) 40vw, 100vw" className={styles.leadPortrait} />
        <div className={styles.leadBody}>
          {member.role && <p className={styles.role}>{member.role}</p>}
          <h3 id="about-lead-name" className={styles.leadName}>
            {member.name}
          </h3>
          {member.bio && <p className={styles.leadBio}>{member.bio}</p>}
          {member.linkedin && (
            <div className="mt-auto pt-6">
              <LinkedIn member={member} />
            </div>
          )}
        </div>
      </article>
    </SiteReveal>
  )
}

function TeamCard({ member, index }: { member: TeamMember; index: number }) {
  return (
    <SiteReveal as="li" index={index % 4} className={styles.memberItem}>
      <article className={styles.member}>
        <Portrait member={member} sizes="(min-width: 1152px) 18vw, (min-width: 768px) 30vw, 75vw" />
        <div className={styles.memberBody}>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className={styles.memberName}>{member.name}</h3>
              {member.role && <p className={styles.memberRole}>{member.role}</p>}
            </div>
            <LinkedIn member={member} />
          </div>
          {member.bio && <p className={styles.memberBio}>{member.bio}</p>}
        </div>
      </article>
    </SiteReveal>
  )
}

function TeamEmptyState() {
  return (
    <SiteReveal className={styles.teamEmpty}>
      <span aria-hidden="true" className={styles.teamEmptyGlyph}>
        <HbeeModuleGlyph size={40} signal="quiet" />
      </span>
      <div>
        <p className="font-hb-display text-[1.375rem] font-bold leading-tight tracking-[-0.02em] text-hb-fg">Team profiles are on their way.</p>
        <p className="mt-2 max-w-[34rem] leading-relaxed text-hb-fg-body">
          Real team profiles will appear here when team data is available in the isolated preview environment.
        </p>
      </div>
      <SiteButton href={CONTACT_HREF} variant="secondary" arrow className="self-start">
        Talk to Our Team
      </SiteButton>
    </SiteReveal>
  )
}

export function AboutTeam({ team }: { team: TeamMember[] }) {
  const [lead, ...rest] = team
  return (
    <SiteSection id="team" tone="white" aria-labelledby="about-team-title" className={styles.anchor}>
      <SiteGrid className="items-center gap-y-10">
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-5">
          <SiteReveal>
            <SiteEyebrow signal>{TEAM_INTRO.eyebrow}</SiteEyebrow>
          </SiteReveal>
          <SiteReveal index={1}>
            <SiteDisplayHeading id="about-team-title" size="h2" className="mt-6">
              {TEAM_INTRO.headline[0]} <span className="block">{TEAM_INTRO.headline[1]}</span>
            </SiteDisplayHeading>
          </SiteReveal>
          <SiteReveal index={2}>
            <p className="mt-6 max-w-[32rem] text-[1.0625rem] leading-relaxed text-hb-fg-body">{TEAM_INTRO.copy}</p>
          </SiteReveal>
        </div>
        <div className="col-span-4 md:col-span-8 lg:col-span-12 min-[1152px]:col-span-7">
          {lead ? <LeadProfile member={lead} /> : <TeamEmptyState />}
        </div>
      </SiteGrid>

      {rest.length > 0 && (
        <div className="mt-12 md:mt-14">
          <TeamRail count={rest.length} scrollable={rest.length >= 3}>
            <ul className={styles.memberList} style={{ '--team-cols': rest.length <= 6 ? Math.max(rest.length, 4) : 4 } as CSSProperties}>
              {rest.map((m, i) => (
                <TeamCard key={m.id} member={m} index={i} />
              ))}
            </ul>
          </TeamRail>
        </div>
      )}
    </SiteSection>
  )
}
