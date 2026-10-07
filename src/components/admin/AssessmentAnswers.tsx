// src/components/admin/AssessmentAnswers.tsx
//
// The merchant's submitted assessment answers, for the admin review screen.
// Purely presentational: it renders the allow-listed, already-coerced sections
// built server-side by src/lib/admin/assessment-answers.ts and never sees the
// stored JSON. Missing answers are not rendered at all, so there is no
// "N/A" noise. Emphasis is a fixed visual hint, not a judgement.

import type { AssessmentAnswerItem, AssessmentAnswerSection } from '@/lib/admin/assessment-answers'

function Value({ item }: { item: AssessmentAnswerItem }) {
  if (item.kind === 'list' && Array.isArray(item.value)) {
    return (
      <ul className="mt-1.5 flex flex-wrap gap-1.5">
        {item.value.map((v) => (
          <li
            key={v}
            className={`rounded-md border px-2 py-0.5 text-xs font-medium ${
              // Plain variables, no opacity modifier: Tailwind cannot apply `/40`
              // to an arbitrary CSS-variable colour and would emit nothing.
              item.emphasis
                ? 'border-[var(--accent)] bg-[var(--bg-section)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[var(--bg-section)] text-[var(--text-secondary)]'
            }`}
          >
            {v}
          </li>
        ))}
      </ul>
    )
  }

  const text = Array.isArray(item.value) ? item.value.join(', ') : item.value

  if (item.kind === 'long') {
    return (
      <p
        className={`mt-1 whitespace-pre-line break-words leading-relaxed text-[var(--text-primary)] ${
          item.emphasis ? 'text-[0.9375rem]' : 'text-sm'
        }`}
      >
        {text}
      </p>
    )
  }

  if (item.kind === 'url') {
    return (
      <a
        href={text}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 block break-all text-sm font-medium text-[var(--accent)] hover:underline"
      >
        {text}
        <span className="sr-only"> (opens in a new tab)</span>
      </a>
    )
  }

  return (
    <p
      className={`mt-0.5 break-words text-[var(--text-primary)] ${
        item.kind === 'email' ? 'break-all' : ''
      } ${item.emphasis ? 'text-[0.9375rem] font-semibold' : 'text-sm font-medium'}`}
    >
      {text}
    </p>
  )
}

export default function AssessmentAnswers({
  sections,
  submittedAt,
}: {
  sections: AssessmentAnswerSection[]
  submittedAt?: string | null
}) {
  const submitted = submittedAt ? new Date(submittedAt) : null

  return (
    <section
      aria-labelledby="assessment-answers-title"
      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="assessment-answers-title" className="text-sm font-semibold text-[var(--text-primary)]">
          Assessment answers
        </h2>
        {submitted && !Number.isNaN(submitted.getTime()) && (
          <p className="text-xs text-[var(--text-muted)]">Submitted {submitted.toLocaleDateString()}</p>
        )}
      </div>
      <p className="mt-1 text-xs text-[var(--text-muted)]">As the merchant submitted them. Unanswered questions are not shown.</p>

      {sections.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--text-secondary)]">
          No stored answers are available for this assessment.
        </p>
      ) : (
        <div className="mt-5 space-y-6">
          {sections.map((section) => (
            <div key={section.id}>
              <h3 className="border-b border-[var(--border)] pb-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {section.title}
              </h3>
              <dl className="mt-3 space-y-3.5">
                {section.items.map((item) => (
                  <div
                    key={item.key}
                    className={item.emphasis ? 'border-l-2 border-[var(--accent)] pl-3' : 'pl-3.5'}
                  >
                    <dt className="text-xs text-[var(--text-muted)]">
                      {item.label}
                      {item.emphasis && <span className="sr-only"> (key answer)</span>}
                    </dt>
                    <dd className="min-w-0">
                      <Value item={item} />
                      {item.note && (
                        <p className="mt-1 text-xs font-medium text-[var(--warning,#b45309)]">{item.note}</p>
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
