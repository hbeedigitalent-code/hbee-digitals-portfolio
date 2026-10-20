import type { ProofQuote } from '@/lib/testimonials'
import { TestimonialImage } from './TestimonialImage'

/** Plain React text, never HTML. Shared by the homepage and admin preview. */
export function TestimonialQuote({ quote }: { quote: ProofQuote }) {
  return <figure className="flex h-full min-w-0 flex-col rounded-[var(--hb-radius-xs)] rounded-br-[var(--hb-radius-sweep)] border border-hb-border bg-hb-white p-7 md:p-9">
    <span aria-hidden="true" className="block h-12 font-hb-display text-7xl font-bold leading-none text-hb-blue">“</span>
    <blockquote className="mt-4 min-w-0 flex-1 whitespace-pre-wrap break-words font-hb-display text-[clamp(1.125rem,1rem+0.4vw,1.375rem)] font-medium leading-relaxed text-hb-fg [overflow-wrap:anywhere]">
      <p>{quote.quote}</p>
    </blockquote>
    <figcaption className="mt-7 flex items-center gap-4 border-t border-hb-border pt-5">
      <TestimonialImage src={quote.avatar} />
      <span className="min-w-0 break-words [overflow-wrap:anywhere]">
        <span className="block font-semibold text-hb-fg">{quote.name}</span>
        {(quote.role || quote.company) && <span className="block text-sm text-hb-fg-body">{[quote.role, quote.company].filter(Boolean).join(', ')}</span>}
      </span>
    </figcaption>
  </figure>
}
