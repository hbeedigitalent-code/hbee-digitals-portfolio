import { SiteButton } from '../primitives/SiteButton'
import { SiteContainer } from '../primitives/SiteContainer'
import { SiteSection } from '../primitives/SiteSection'
import { SiteDisplayHeading, SiteEyebrow, SiteLede } from '../primitives/SiteTypography'

export interface LegalSection {
  title: string
  body: string
}

interface LegalDocumentProps {
  title: string
  intro: string
  sections: LegalSection[]
  closing: { title: string; body: string; href: string; cta: string }
}

/**
 * Shell for the legal pages (privacy, terms, cookies): renders the existing
 * legal copy, unchanged, inside the public site surface. Content comes from
 * the page files; this component only lays it out.
 */
export function LegalDocument({ title, intro, sections, closing }: LegalDocumentProps) {
  return (
    <SiteSection tone="cloud" aria-labelledby="legal-title">
      <SiteContainer>
        <div className="mx-auto max-w-[52rem]">
          <SiteEyebrow signal>Legal</SiteEyebrow>
          <SiteDisplayHeading as="h1" size="h1" id="legal-title" className="mt-6">
            {title}
          </SiteDisplayHeading>
          <SiteLede className="mt-6">{intro}</SiteLede>

          <div className="mt-12 space-y-5">
            {sections.map((section) => (
              <section key={section.title} className="rounded-[var(--hb-radius-md)] border border-hb-border bg-hb-white p-6">
                <h2 className="font-hb-display text-xl font-bold tracking-[-0.02em] text-hb-fg">{section.title}</h2>
                <p className="mt-3 text-base leading-7 text-hb-fg-body">{section.body}</p>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-[var(--hb-radius-md)] bg-hb-plane p-6">
            <h2 className="font-hb-display text-lg font-bold text-hb-fg">{closing.title}</h2>
            <p className="mt-3 text-base leading-7 text-hb-fg-body">{closing.body}</p>
            <SiteButton href={closing.href} variant="secondary" size="md" className="mt-5">
              {closing.cta}
            </SiteButton>
          </div>
        </div>
      </SiteContainer>
    </SiteSection>
  )
}
