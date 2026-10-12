// src/lib/client-portal/project-request.ts
//
// The project-request contract shared by the form (client-side validation) and the server route
// that performs the writes (authoritative validation). Pure; no I/O.
//
// Only what the flow actually persists is accepted: project title, service and description.

export const REQUEST_SERVICES = [
  'Website Development',
  'Ecommerce Development',
  'Shopify Optimization',
  'UI/UX Design',
  'Digital Marketing',
  'SEO Services',
  'Brand Identity',
  'Content Strategy',
  'Maintenance & Support',
  'Other',
] as const

export const REQUEST_LIMITS = { title: 200, description: 5000 } as const

export interface ProjectRequestInput {
  title: string
  service: string
  description: string
}

/** The same messages the form has always shown; the server enforces them too. */
export function validateProjectRequest(
  body: unknown,
): { ok: true; value: ProjectRequestInput } | { ok: false; error: string } {
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const title = typeof b.title === 'string' ? b.title.trim() : ''
  const service = typeof b.service === 'string' ? b.service : ''
  const description = typeof b.description === 'string' ? b.description.trim() : ''

  if (!title) return { ok: false, error: 'Project title is required' }
  if (!service || !(REQUEST_SERVICES as readonly string[]).includes(service)) return { ok: false, error: 'Please select a service' }
  if (!description) return { ok: false, error: 'Please describe your project' }
  if (title.length > REQUEST_LIMITS.title) return { ok: false, error: 'Please shorten the project title' }
  if (description.length > REQUEST_LIMITS.description) return { ok: false, error: 'Please shorten the project description' }
  return { ok: true, value: { title, service, description } }
}
