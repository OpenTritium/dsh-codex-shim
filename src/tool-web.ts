/**
 * Model-facing Codex-style `web_run` search shim over `ctx.web`. It keeps the
 * familiar `search_query: [{ q }]` call form while exposing only the operation
 * that the configured dsh web capability can execute. Page references and
 * `open`/`click`/`find` operations stay absent rather than becoming no-ops.
 * @module @opentritium/dsh-codex-shim/tool-web
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type { JsonValue, ToolResult, WebSearchResultView } from '@deepseek-ai/dsh-tools'
import type { WebSearchResult, WebSearchSource } from '@deepseek-ai/dsh-web'

/** Cordis plugin name. */
export const name = 'opentritium-codex-web'

/** Services required by the Codex web-search adapter. */
export const inject = ['tools', 'web']

/** Default number of independent `search_query` entries accepted per call. */
export const DEFAULT_MAX_QUERIES = 4
/** Default cap on citeable sources returned for each search query. */
export const DEFAULT_SEARCH_MAX_RESULTS = 5
/** Default cooperative tool-call timeout budget in milliseconds. */
export const DEFAULT_SEARCH_TIMEOUT_MS = 30_000

/** Deployment configuration for the Codex web-search adapter. */
export interface Config {
  /** Maximum independent `search_query` entries accepted in one call. Defaults to 4. */
  maxQueries?: number
  /** Upper bound on citeable sources returned for each query. Defaults to 5. */
  searchMaxResults?: number
  /** Cooperative timeout budget for the complete `web_run` call in milliseconds. Defaults to 30000. */
  searchTimeoutMs?: number
}

/** Runtime schema for {@link Config}. */
export const Config: z<Config> = z.object({
  maxQueries: z.number().default(DEFAULT_MAX_QUERIES),
  searchMaxResults: z.number().default(DEFAULT_SEARCH_MAX_RESULTS),
  searchTimeoutMs: z.number().default(DEFAULT_SEARCH_TIMEOUT_MS),
})

/** Complete plugin config after schemastery applies defaults. */
type ResolvedConfig = Required<Config>

/** One Codex-style search request. */
export interface SearchQuery {
  /** Query text sent to the configured search provider. */
  q: string
}

/** Arguments accepted by `web_run`. */
export interface WebRunArgs {
  /** One or more independent web-search requests. */
  search_query: SearchQuery[]
}

type WebRunSource = {
  url: string
  title?: string
  snippet?: string
  publishedAt?: string
}

type WebRunSearchResult = {
  query: string
  content?: string
  sources: WebRunSource[]
  truncated: boolean
}

type WebRunValue = {
  results: WebRunSearchResult[]
}

/** Persisted presentation metadata for one completed `web_run` call. */
interface WebRunMeta {
  results: Array<{ query: string; sources: WebRunSource[]; answer?: string; truncated: boolean }>
}

/** Grouped web-card arm supported by the current upstream client surface. */
interface WebSearchesResultView {
  card: 'web'
  kind: 'searches'
  results: Array<{ query: string; sources: WebRunSource[]; answer?: string; truncated: boolean }>
}

/**
 * Validate a deployment-controlled numeric bound.
 * @param field - configuration field being validated.
 * @param value - resolved field value.
 */
function assertPositiveInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`tool-codex-web: ${field} must be a positive integer`)
  }
}

/**
 * Validate the operation-specific limits the JSON schema cannot express.
 * @param args - schema-validated model arguments.
 * @param maxQueries - configured maximum number of independent searches.
 * @returns trimmed search-query arguments ready for provider dispatch.
 */
export function parseWebRunArgs(args: WebRunArgs, maxQueries: number): WebRunArgs {
  if (args.search_query.length === 0) {
    throw new Error('search_query must contain at least one query')
  }
  if (args.search_query.length > maxQueries) {
    throw new Error(`search_query supports at most ${maxQueries} queries per call`)
  }
  return {
    search_query: args.search_query.map(({ q }) => {
      const query = q.trim()
      if (query.length === 0) throw new Error('search_query.q must be a non-empty string')
      return { q: query }
    }),
  }
}

/** Display label for a source: its title, else its hostname, else its raw URL. */
function sourceLabel(source: WebRunSource): string {
  if (source.title !== undefined && source.title.length > 0) return source.title
  try {
    return new URL(source.url).hostname
  } catch {
    return source.url
  }
}

/** Render one query's source list and optional provider answer. */
function formatOneResult(result: WebRunSearchResult): string {
  const lines = [`Search results for ${JSON.stringify(result.query)}:`]
  if (result.content !== undefined && result.content.length > 0) lines.push(result.content)
  if (result.sources.length > 0) {
    lines.push('Sources:')
    for (const source of result.sources) {
      const suffix = [source.snippet, source.publishedAt === undefined ? undefined : `(${source.publishedAt})`]
        .filter((part): part is string => part !== undefined && part.length > 0)
        .join(' ')
      lines.push(`- [${sourceLabel(source)}](${source.url})${suffix.length > 0 ? ` — ${suffix}` : ''}`)
    }
  } else if (result.content === undefined || result.content.length === 0) {
    lines.push('No results found.')
  }
  if (result.truncated) lines.push(`Showing the first ${result.sources.length} sources for this query.`)
  return lines.join('\n')
}

/**
 * Render all search responses into the model-visible `web_run` result text.
 * @param value - canonical execution result.
 * @returns source-linked text grouped by original query.
 */
export function formatWebRunOutput(value: WebRunValue): string {
  return [
    ...value.results.map(formatOneResult),
    'Cite the relevant source URLs as Markdown links in your response.',
  ].join('\n\n')
}

/**
 * Present a pending `web_run` call as a generic search card.
 * @param args - validated model arguments.
 * @returns the replay-safe call view.
 */
export function presentWebRunCall(args: WebRunArgs): { card: 'generic'; title: string; kind: 'search'; rawInput: SearchQuery[] } {
  return {
    card: 'generic',
    title: 'Web search',
    kind: 'search',
    rawInput: args.search_query,
  }
}

/** Copy the portable web source fields into the persisted tool result. */
function projectSource(source: WebSearchSource): WebRunSource {
  return {
    url: source.url,
    ...source.title === undefined ? {} : { title: source.title },
    ...source.snippet === undefined ? {} : { snippet: source.snippet },
    ...source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt },
  }
}

/** Bind one configured `ctx.web.search()` response to its originating query. */
function projectSearchResult(query: string, result: WebSearchResult): WebRunSearchResult {
  return {
    query,
    ...result.content === undefined ? {} : { content: result.content },
    sources: result.sources.map(projectSource),
    truncated: result.truncated,
  }
}

/**
 * Project canonical output into the grouped web-card metadata retained on
 * `tool/result`.
 * @param value - the validated canonical `web_run` output.
 * @returns the JSON-safe query groups persisted with the result event.
 */
export function webRunMetaFromValue(value: WebRunValue): JsonValue {
  return {
    results: value.results.map(result => ({
      query: result.query,
      sources: result.sources.map(projectSource),
      truncated: result.truncated,
      ...result.content === undefined ? {} : { answer: result.content },
    })),
  }
}

/** Narrow one source from opaque replay metadata. */
function isWebRunSource(value: unknown): value is WebRunSource {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const { url, title, snippet, publishedAt } = value as Record<string, unknown>
  return typeof url === 'string'
    && (title === undefined || typeof title === 'string')
    && (snippet === undefined || typeof snippet === 'string')
    && (publishedAt === undefined || typeof publishedAt === 'string')
}

/** Narrow one independently searched group from opaque replay metadata. */
function isWebSearchGroup(value: unknown): value is WebRunMeta['results'][number] {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const { query, sources, answer, truncated } = value as Record<string, unknown>
  return typeof query === 'string'
    && query.trim().length > 0
    && Array.isArray(sources)
    && sources.every(isWebRunSource)
    && (answer === undefined || typeof answer === 'string')
    && typeof truncated === 'boolean'
}

/**
 * Recover grouped search metadata from a durable result, or reject malformed
 * historical data so the generic text presentation can take over.
 * @param meta - opaque metadata from a live or replayed result event.
 * @returns the narrowed grouped metadata, or `undefined` for malformed data.
 */
export function webRunMetaFromResult(meta: unknown): WebRunMeta | undefined {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return undefined
  const { results } = meta as Record<string, unknown>
  if (!Array.isArray(results) || results.length === 0 || !results.every(isWebSearchGroup)) return undefined
  return { results }
}

/**
 * Present a settled `web_run` as the host's standard web card. Batched calls
 * use the grouped card so every source remains attributable to its query.
 * Error results and old logs without valid metadata keep the standard generic fallback.
 * @param _args - validated `web_run` arguments.
 * @param result - the durable model-facing result and projected metadata.
 * @returns the web result view, or `undefined` for generic fallback.
 */
export function presentWebRunResult(_args: WebRunArgs, result: ToolResult): WebSearchResultView | undefined {
  if (result.isError) return undefined
  const meta = webRunMetaFromResult(result.meta)
  if (meta === undefined) return undefined
  if (meta.results.length > 1) {
    return {
      card: 'web',
      kind: 'searches',
      results: meta.results.map(search => ({
        query: search.query,
        sources: search.sources,
        ...search.answer === undefined ? {} : { answer: search.answer },
        truncated: search.truncated,
      })),
    } as WebSearchesResultView as unknown as WebSearchResultView
  }
  const [search] = meta.results
  if (search === undefined) return undefined
  return {
    card: 'web',
    kind: 'search',
    title: search.query,
    sources: search.sources,
    ...search.answer === undefined ? {} : { answer: search.answer },
    truncated: search.truncated,
  }
}

/**
 * Register the Codex-compatible `web_run` search adapter.
 * @param ctx - context carrying the scoped tool registry and configured web capability.
 * @param config - deployment limits after loader validation.
 */
export function apply(ctx: Context, config: Config): void {
  const resolved = config as ResolvedConfig
  assertPositiveInteger('maxQueries', resolved.maxQueries)
  assertPositiveInteger('searchMaxResults', resolved.searchMaxResults)
  assertPositiveInteger('searchTimeoutMs', resolved.searchTimeoutMs)

  ctx.tools.register(defineTool({
    name: 'web_run',
    description: 'Search current information on the web. Pass one or more concise search_query entries with q text. This tool supports searching only; use the returned source URLs for citations.',
    parameters: {
      search_query: {
        type: 'array',
        required: true,
        description: 'One or more independent web searches.',
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            q: { type: 'string', required: true, description: 'Search query.' },
          },
        },
      },
    },
    output: {
      schema: {
        type: 'object',
        additionalProperties: false,
        properties: {
          results: {
            type: 'array',
            required: true,
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                query: { type: 'string', required: true },
                content: { type: 'string' },
                sources: {
                  type: 'array',
                  required: true,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    properties: {
                      url: { type: 'string', required: true },
                      title: { type: 'string' },
                      snippet: { type: 'string' },
                      publishedAt: { type: 'string' },
                    },
                  },
                },
                truncated: { type: 'boolean', required: true },
              },
            },
          },
        },
      },
      render: (_args, value) => [{ type: 'text', text: formatWebRunOutput(value) }],
      presentationMeta: (_args, value) => webRunMetaFromValue(value),
    },
    timeoutMs: resolved.searchTimeoutMs,
    isConcurrencySafe: () => true,
    async execute(args, exec) {
      const input = parseWebRunArgs(args, resolved.maxQueries)
      const results = await Promise.all(input.search_query.map(async ({ q }) => projectSearchResult(
        q,
        await ctx.web.search({ query: q, maxResults: resolved.searchMaxResults }, exec.signal),
      )))
      return { results }
    },
    presentCall: presentWebRunCall,
    presentResult: (args, result) => presentWebRunResult(args, result),
  }))
}
