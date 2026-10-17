export function insightFilterState(params: URLSearchParams, topics: { key: string; label: string }[]) {
  const requested = params.get('topic') ?? params.get('category') ?? params.get('tag')
  const normalise = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const topic = requested ? topics.find((item) => item.key === requested || normalise(item.label) === normalise(requested))?.key || 'all' : 'all'
  return { topic, query: params.get('q') || '' }
}

export function insightFilterUrl(href: string, topic: string, query: string) {
  const url = new URL(href)
  for (const key of ['category','tag']) url.searchParams.delete(key)
  if (topic === 'all') url.searchParams.delete('topic')
  else url.searchParams.set('topic', topic)
  if (query) url.searchParams.set('q', query)
  else url.searchParams.delete('q')
  return url
}
