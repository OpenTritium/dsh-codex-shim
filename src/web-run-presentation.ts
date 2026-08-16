export interface WebRunSource {
  url: string
  title?: string
  snippet?: string
  publishedAt?: string
}

export interface WebRunSearchResult {
  query: string
  content?: string
  sources: WebRunSource[]
  truncated: boolean
}

export interface WebRunValue {
  results: WebRunSearchResult[]
}

export interface WebRunSearchGroup {
  query: string
  sources: WebRunSource[]
  answer?: string
  truncated: boolean
}

export interface WebRunMeta {
  results: WebRunSearchGroup[]
}

export type WebRunView =
  | { card: 'web'; kind: 'search'; title?: string; sources: WebRunSource[]; answer?: string; truncated: boolean }
  | { card: 'web'; kind: 'searches'; results: WebRunSearchGroup[] }

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

function sourceValue(value: unknown): WebRunSource | undefined {
  const source = objectValue(value)
  if (source === undefined || typeof source.url !== 'string') return undefined
  if (source.title !== undefined && typeof source.title !== 'string') return undefined
  if (source.snippet !== undefined && typeof source.snippet !== 'string') return undefined
  if (source.publishedAt !== undefined && typeof source.publishedAt !== 'string') return undefined
  return {
    url: source.url,
    ...(source.title === undefined ? {} : { title: source.title }),
    ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
    ...(source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt }),
  }
}

function sourceList(value: unknown): WebRunSource[] | undefined {
  if (!Array.isArray(value)) return undefined
  const sources = value.map(sourceValue)
  return sources.some(source => source === undefined) ? undefined : (sources as WebRunSource[])
}

function searchGroupValue(value: unknown): WebRunSearchGroup | undefined {
  const group = objectValue(value)
  if (
    group === undefined ||
    typeof group.query !== 'string' ||
    group.query.trim().length === 0 ||
    typeof group.truncated !== 'boolean'
  )
    return undefined
  const sources = sourceList(group.sources)
  if (sources === undefined || (group.answer !== undefined && typeof group.answer !== 'string')) return undefined
  return {
    query: group.query,
    sources,
    truncated: group.truncated,
    ...(group.answer === undefined ? {} : { answer: group.answer }),
  }
}

export function parseWebRunMeta(value: unknown): WebRunMeta | undefined {
  const object = objectValue(value)
  if (object === undefined || !Array.isArray(object.results) || object.results.length === 0) return undefined
  const results = object.results.map(searchGroupValue)
  return results.some(result => result === undefined) ? undefined : { results: results as WebRunSearchGroup[] }
}

export function parseWebRunView(value: unknown): WebRunView | undefined {
  const object = objectValue(value)
  if (object === undefined || object.card !== 'web' || typeof object.kind !== 'string') return undefined
  if (object.kind === 'searches') {
    const results = object.results
    if (!Array.isArray(results)) return undefined
    const groups = results.map(searchGroupValue)
    return groups.some(group => group === undefined)
      ? undefined
      : { card: 'web', kind: 'searches', results: groups as WebRunSearchGroup[] }
  }
  if (object.kind !== 'search' || (object.title !== undefined && typeof object.title !== 'string')) return undefined
  const sources = sourceList(object.sources)
  if (sources === undefined || typeof object.truncated !== 'boolean') return undefined
  if (object.answer !== undefined && typeof object.answer !== 'string') return undefined
  return {
    card: 'web',
    kind: 'search',
    sources,
    truncated: object.truncated,
    ...(object.title === undefined ? {} : { title: object.title }),
    ...(object.answer === undefined ? {} : { answer: object.answer }),
  }
}
