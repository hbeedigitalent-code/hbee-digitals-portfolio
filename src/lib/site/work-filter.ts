/** Match only categories actually returned by the public loader; never infer taxonomy. */
export function workCategoryFromQuery(query: string | null, categories: { key: string; label: string }[]) {
  const normalise = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return query ? categories.find((category) => category.key === query || normalise(category.label) === normalise(query))?.key || 'all' : 'all'
}
