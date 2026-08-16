/**
 * OpenAI Responses-backed search provider for the portable `ctx.web` capability.
 * It asks the upstream hosted Web Search tool for one query and projects its
 * citations into DSH's search-only result vocabulary.
 * @module @opentritium/dsh-codex-shim/openai-web-provider
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { credentialRef, type CredentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { installSettingsSection, settingsNamespace } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-session'
import { WebError, type WebSearchProvider, type WebSearchRequest, type WebSearchResult, type WebSearchSource } from '@deepseek-ai/dsh-web'

/** Cordis plugin name. */
export const name = 'opentritium-codex-openai-web'

/** The portable web capability this plugin provides. */
export const inject = ['web']

/** Stable web-provider id selected by a profile overlay. */
export const OPENAI_RESPONSES_PROVIDER_ID = 'opentritium-openai-responses'

/** Official OpenAI Responses API base URL. */
export const OPENAI_RESPONSES_DEFAULT_BASE_URL = 'https://api.openai.com/v1'
/** Credential reference used by OpenAI SDKs and the official API. */
export const OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF = 'OPENAI_API_KEY'
/** A generally available Responses model that supports hosted web search. */
export const OPENAI_RESPONSES_DEFAULT_MODEL = 'gpt-5'
/** Balanced hosted search context size. */
export const OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE = 'medium'

/** Settings namespace for this provider's endpoint and credential reference. */
export const OPENAI_RESPONSES_SETTINGS_NAMESPACE = settingsNamespace('opentritium-openai-web')

/** Search-context sizes accepted by the OpenAI Responses web-search tool. */
export type SearchContextSize = 'low' | 'medium' | 'high'

/** Provider configuration. Credentials are resolved by reference for every search. */
export interface Config {
  /** Whether this provider may serve `ctx.web.search()` requests. */
  enabled?: boolean
  /** Responses API base URL, with `/v1` when required by the selected backend. */
  baseURL?: string
  /** Credentials service reference used for the API key. */
  credentialRef?: string
  /** Model that executes the hosted Web Search tool. */
  model?: string
  /** Hosted web-search context budget. */
  searchContextSize?: SearchContextSize
}

/** Runtime schema for {@link Config}. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  baseURL: z.string().default(OPENAI_RESPONSES_DEFAULT_BASE_URL),
  credentialRef: z.string().role('credential-ref').default(OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF),
  model: z.string().default(OPENAI_RESPONSES_DEFAULT_MODEL),
  searchContextSize: z.union(['low', 'medium', 'high'] as const).default(OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE),
})

/** The exact secret-free request recorded before an auxiliary Responses call. */
export interface OpenAIResponsesSearchRequest {
  /** Fully resolved endpoint. */
  readonly endpoint: string
  /** Exact JSON body sent to the configured backend. */
  readonly body: {
    readonly model: string
    readonly input: string
    readonly tools: readonly [{ readonly type: 'web_search'; readonly search_context_size: SearchContextSize }]
    readonly tool_choice: 'required'
    readonly include: readonly ['web_search_call.action.sources']
    readonly store: false
  }
}

declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Secret-free auxiliary OpenAI Responses request recorded before dispatch. */
    'web/opentritium-openai-responses-request': OpenAIResponsesSearchRequest
  }
}

/** Fully resolved, single-operation provider inputs. */
export interface OpenAIResponsesSearchProviderOptions {
  /** Whether this provider is enabled. */
  enabled: boolean
  /** Resolve the credential for the next search without retaining its value. */
  resolveApiKey: () => Promise<string | undefined>
  /** Credential reference for missing-key diagnostics. */
  credentialRef: CredentialRef
  /** Responses API base URL. */
  baseURL: string
  /** Hosted Web Search model. */
  model: string
  /** Hosted Web Search context budget. */
  searchContextSize: SearchContextSize
  /** Persist one secret-free request before network dispatch. */
  recordRequest?: (request: OpenAIResponsesSearchRequest) => void
}

/** Build an endpoint without accepting accidental double slashes. */
export function responsesEndpoint(baseURL: string): string {
  return `${baseURL.replace(/\/+$/u, '')}/responses`
}

/** Convert one OpenAI Responses payload into portable search sources and answer text. */
export function mapOpenAIResponsesPayload(payload: unknown): WebSearchResult {
  const root = recordOf(payload)
  const output = root === undefined || !Array.isArray(root.output) ? undefined : root.output
  if (output === undefined) throw new WebError('OpenAI Responses returned no output array', 'WEB_PROVIDER_ERROR')

  const sources = new Map<string, WebSearchSource>()
  const answer: string[] = []
  let usedWebSearch = false
  for (const item of output) {
    const entry = recordOf(item)
    if (entry === undefined) continue
    if (entry.type === 'web_search_call') {
      usedWebSearch = true
      const action = recordOf(entry.action)
      if (action?.type === 'search') addActionSources(sources, action.sources)
      continue
    }
    if (entry.type === 'message') collectMessage(sources, answer, entry.content)
  }
  if (!usedWebSearch) {
    throw new WebError('OpenAI Responses did not return a web_search_call; the configured backend did not execute hosted web search', 'WEB_PROVIDER_ERROR')
  }
  return {
    ...answer.length > 0 ? { content: answer.join('\n') } : {},
    sources: [...sources.values()],
    truncated: false,
  }
}

/** The OpenAI Responses hosted Web Search provider. */
export class OpenAIResponsesSearchProvider implements WebSearchProvider {
  readonly id = OPENAI_RESPONSES_PROVIDER_ID

  /** @param resolveOptions - snapshots current settings at the start of each search. */
  constructor(private readonly resolveOptions: () => OpenAIResponsesSearchProviderOptions) {}

  available(): boolean {
    const options = this.resolveOptions()
    return options.enabled
      && URL.canParse(options.baseURL)
      && options.model.trim().length > 0
      && isSearchContextSize(options.searchContextSize)
  }

  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    const options = this.resolveOptions()
    throwIfAborted(signal)
    const apiKey = await resolveApiKey(options, signal)
    throwIfAborted(signal)
    const endpoint = responsesEndpoint(options.baseURL)
    const body: OpenAIResponsesSearchRequest['body'] = {
      model: options.model,
      input: request.query,
      tools: [{ type: 'web_search', search_context_size: options.searchContextSize }],
      tool_choice: 'required',
      include: ['web_search_call.action.sources'],
      store: false,
    }
    options.recordRequest?.({ endpoint, body })
    throwIfAborted(signal)
    let response: Response
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        redirect: 'error',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
          accept: 'application/json',
          'user-agent': 'opentritium-dsh-codex-shim/0.1.0',
        },
        body: JSON.stringify(body),
        ...signal === undefined ? {} : { signal },
      })
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error)
      throw new WebError(`OpenAI Responses request failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    if (!response.ok) throw await responseError(response, signal)
    try {
      return mapOpenAIResponsesPayload(await response.json())
    } catch (error: unknown) {
      if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error)
      if (error instanceof WebError) throw error
      throw new WebError(`OpenAI Responses returned an unprocessable response body: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
  }
}

/** Install the provider and make its settings available to WebUI when present. */
export function apply(ctx: Context, config: Config): void {
  let current: () => Config = () => config
  installSettingsSection(ctx, OPENAI_RESPONSES_SETTINGS_NAMESPACE, Config, config, {
    expose: 'client',
    setSource: source => { current = source },
    onChange: () => {},
  })
  ctx.web.registerSearchProvider(new OpenAIResponsesSearchProvider(() => resolveOptions(ctx, current())))
}

/** Resolve one current settings section to operation-local options. */
function resolveOptions(ctx: Context, config: Config): OpenAIResponsesSearchProviderOptions {
  const ref = credentialRef(config.credentialRef ?? OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF)
  return {
    enabled: config.enabled ?? true,
    credentialRef: ref,
    resolveApiKey: async () => {
      const credentials = ctx.get('credentials')
      if (credentials !== undefined) return (await credentials.resolve(ref))?.value
      return launchEnvironmentOf(ctx).get(ref)?.value
    },
    baseURL: config.baseURL ?? OPENAI_RESPONSES_DEFAULT_BASE_URL,
    model: config.model ?? OPENAI_RESPONSES_DEFAULT_MODEL,
    searchContextSize: config.searchContextSize ?? OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE,
    recordRequest: request => {
      ctx.get('agents')?.currentInitiator()?.session.append('web/opentritium-openai-responses-request', request)
    },
  }
}

function recordOf(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function addActionSources(target: Map<string, WebSearchSource>, value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    const source = recordOf(item)
    if (source?.type !== 'url' || typeof source.url !== 'string' || source.url.length === 0 || target.has(source.url)) continue
    target.set(source.url, { url: source.url })
  }
}

function collectMessage(sources: Map<string, WebSearchSource>, answer: string[], value: unknown): void {
  if (!Array.isArray(value)) return
  for (const item of value) {
    const content = recordOf(item)
    if (content?.type !== 'output_text') continue
    if (typeof content.text === 'string' && content.text.length > 0) answer.push(content.text)
    if (!Array.isArray(content.annotations)) continue
    for (const itemAnnotation of content.annotations) {
      const annotation = recordOf(itemAnnotation)
      if (annotation?.type !== 'url_citation' || typeof annotation.url !== 'string' || annotation.url.length === 0) continue
      const existing = sources.get(annotation.url)
      sources.set(annotation.url, {
        url: annotation.url,
        ...typeof annotation.title === 'string' && annotation.title.length > 0 ? { title: annotation.title } : existing?.title === undefined ? {} : { title: existing.title },
      })
    }
  }
}

async function resolveApiKey(options: OpenAIResponsesSearchProviderOptions, signal?: AbortSignal): Promise<string> {
  let apiKey: string | undefined
  try {
    apiKey = await abortable(options.resolveApiKey(), signal)
  } catch (error: unknown) {
    if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error)
    throw new WebError(`OpenAI Responses credential resolution failed: ${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
  }
  if (apiKey !== undefined && apiKey.length > 0) return apiKey
  throw new WebError(`OpenAI Responses has no API key for "${options.credentialRef}"; configure that credential reference before enabling this provider`, 'WEB_PROVIDER_CREDENTIAL_MISSING')
}

async function responseError(response: Response, signal?: AbortSignal): Promise<WebError> {
  let message = `OpenAI Responses API error (HTTP ${response.status})`
  try {
    const body = recordOf(await response.json())
    const error = recordOf(body?.error)
    const detail = typeof error?.message === 'string' ? error.message : typeof body?.message === 'string' ? body.message : undefined
    if (detail !== undefined && detail.length > 0) message = detail
  } catch (error: unknown) {
    if (signal?.aborted === true || isAbortError(error)) return aborted(signal, error)
  }
  return new WebError(message, 'WEB_PROVIDER_ERROR')
}

function isSearchContextSize(value: string): value is SearchContextSize {
  return value === 'low' || value === 'medium' || value === 'high'
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted === true) throw aborted(signal)
}

function aborted(signal?: AbortSignal, fallback?: unknown): WebError {
  return new WebError('OpenAI Responses search aborted', 'WEB_ABORTED', { cause: signal?.aborted === true ? signal.reason : fallback })
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

function abortable<T>(operation: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (signal === undefined) return operation
  if (signal.aborted) return Promise.reject(aborted(signal))
  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => { reject(aborted(signal)) }
    signal.addEventListener('abort', onAbort, { once: true })
    void operation.then(
      value => { signal.removeEventListener('abort', onAbort); resolve(value) },
      error => { signal.removeEventListener('abort', onAbort); reject(error) },
    )
  })
}
