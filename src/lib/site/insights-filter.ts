import { isInsightCapabilitySlug } from './insight-capabilities'

/**
 * Hub filter state, read from the URL. The capability key is the six approved
 * capability slugs (?capability=brand-positioning). Anything else — unknown
 * values, or legacy ?topic= / ?category= / ?tag= values that are not a
 * capability slug — falls back to "all" rather than filtering to nothing.
 * Legacy params that DO equal a capability slug (e.g. the old mega-menu's
 * ?topic=brand-positioning) are honoured.
 */
export function insightFilterState(params: URLSearchParams) {
  const requested = params.get('capability') ?? params.get('topic') ?? params.get('category') ?? params.get('tag')
  const capability = isInsightCapabilitySlug(requested) ? requested : 'all'
  return { capability, query: params.get('q') || '' }
}

export function insightFilterUrl(href: string, capability: string, query: string) {
  const url = new URL(href)
  for (const key of ['category', 'tag', 'topic']) url.searchParams.delete(key)
  if (capability === 'all') url.searchParams.delete('capability')
  else url.searchParams.set('capability', capability)
  if (query) url.searchParams.set('q', query)
  else url.searchParams.delete('q')
  return url
}

/** `data-capabilities="primary|secondary"` membership — primary OR secondary counts. */
export function matchesCapability(capabilities: string | undefined, capability: string) {
  return capability === 'all' || (capabilities ?? '').split('|').includes(capability)
}
