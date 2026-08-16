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
import {
  parseWebRunMeta,
  type WebRunMeta,
  type WebRunSearchResult,
  type WebRunSource,
  type WebRunValue,
  type WebRunView,
} from './web-run-presentation.ts'

export const name = 'opentritium-codex-web'

export const inject = ['tools', 'web']

export const DEFAULT_MAX_QUERIES = 4
export const DEFAULT_SEARCH_MAX_RESULTS = 5
export const DEFAULT_SEARCH_TIMEOUT_MS = 30_000

/** Configuration for the Codex web-search adapter. */
export interface Config {
  maxQueries?: number
  searchMaxResults?: number
  searchTimeoutMs?: number
}

export const Config: z<Config> = z.object({
  maxQueries: z.number().default(DEFAULT_MAX_QUERIES),
  searchMaxResults: z.number().default(DEFAULT_SEARCH_MAX_RESULTS),
  searchTimeoutMs: z.number().default(DEFAULT_SEARCH_TIMEOUT_MS),
})

type ResolvedConfig = Required<Config>

export interface SearchQuery {
  q: string
}

export interface WebRunArgs {
  search_query: SearchQuery[]
}

function assertPositiveInteger(field: string, value: number): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`tool-codex-web: ${field} must be a positive integer`)
  }
}

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

function sourceLabel(source: WebRunSource): string {
  if (source.title !== undefined && source.title.length > 0) return source.title
  try {
    return new URL(source.url).hostname
  } catch {
    return source.url
  }
}

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

export function formatWebRunOutput(value: WebRunValue): string {
  return [
    ...value.results.map(formatOneResult),
    'Cite the relevant source URLs as Markdown links in your response.',
  ].join('\n\n')
}

export function presentWebRunCall(args: WebRunArgs): {
  card: 'generic'
  title: string
  kind: 'search'
  rawInput: SearchQuery[]
} {
  return { card: 'generic', title: 'Web search', kind: 'search', rawInput: args.search_query }
}

function projectSource(source: WebSearchSource): WebRunSource {
  return {
    url: source.url,
    ...(source.title === undefined ? {} : { title: source.title }),
    ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
    ...(source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt }),
  }
}

function projectSearchResult(query: string, result: WebSearchResult): WebRunSearchResult {
  return {
    query,
    ...(result.content === undefined ? {} : { content: result.content }),
    sources: result.sources.map(projectSource),
    truncated: result.truncated,
  }
}

export function webRunMetaFromValue(value: WebRunValue): JsonValue {
  return {
    results: value.results.map(result => ({
      query: result.query,
      sources: result.sources.map(source => ({
        url: source.url,
        ...(source.title === undefined ? {} : { title: source.title }),
        ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
        ...(source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt }),
      })),
      truncated: result.truncated,
      ...(result.content === undefined ? {} : { answer: result.content }),
    })),
  }
}

export function webRunMetaFromResult(meta: unknown): WebRunMeta | undefined {
  return parseWebRunMeta(meta)
}

export function presentWebRunResult(_args: WebRunArgs, result: ToolResult): WebSearchResultView | undefined {
  if (result.isError) return undefined
  const meta = webRunMetaFromResult(result.meta)
  if (meta === undefined) return undefined
  if (meta.results.length > 1) {
    const view: WebRunView = {
      card: 'web',
      kind: 'searches',
      results: meta.results.map(search => ({
        query: search.query,
        sources: search.sources,
        ...(search.answer === undefined ? {} : { answer: search.answer }),
        truncated: search.truncated,
      })),
    }
    return view as unknown as WebSearchResultView
  }
  const [search] = meta.results
  if (search === undefined) return undefined
  return {
    card: 'web',
    kind: 'search',
    title: search.query,
    sources: search.sources,
    ...(search.answer === undefined ? {} : { answer: search.answer }),
    truncated: search.truncated,
  }
}

export function apply(ctx: Context, config: Config): void {
  const resolved = config as ResolvedConfig
  assertPositiveInteger('maxQueries', resolved.maxQueries)
  assertPositiveInteger('searchMaxResults', resolved.searchMaxResults)
  assertPositiveInteger('searchTimeoutMs', resolved.searchTimeoutMs)

  ctx.tools.register(
    defineTool({
      name: 'web_run',
      description:
        'Search current information on the web. Pass one or more concise search_query entries with q text. This tool supports searching only; use the returned source URLs for citations.',
      parameters: {
        search_query: {
          type: 'array',
          required: true,
          description: 'One or more independent web searches.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: { q: { type: 'string', required: true, description: 'Search query.' } },
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
        const results = await Promise.all(
          input.search_query.map(async ({ q }) =>
            projectSearchResult(
              q,
              await ctx.web.search({ query: q, maxResults: resolved.searchMaxResults }, exec.signal),
            ),
          ),
        )
        return { results }
      },
      presentCall: presentWebRunCall,
      presentResult: (args, result) => presentWebRunResult(args, result),
    }),
  )
}
