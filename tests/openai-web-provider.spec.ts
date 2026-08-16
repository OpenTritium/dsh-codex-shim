import { afterEach, describe, expect, it, vi } from 'vitest'
import { OPENAI_RESPONSES_PROVIDER_ID, OpenAIResponsesSearchProvider, mapOpenAIResponsesPayload, responsesEndpoint, type OpenAIResponsesSearchProviderOptions } from '../src/openai-web-provider.ts'

const options = (): OpenAIResponsesSearchProviderOptions => ({
  enabled: true,
  resolveApiKey: async () => 'test-key',
  credentialRef: 'OPENAI_API_KEY' as OpenAIResponsesSearchProviderOptions['credentialRef'],
  baseURL: 'https://api.example.test/v1/',
  model: 'gpt-test',
  searchContextSize: 'medium',
})

afterEach(() => vi.unstubAllGlobals())

describe('OpenAI Responses search provider', () => {
  it('uses the official Responses hosted-web request and maps sources', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ output: [
      { type: 'web_search_call', status: 'completed', action: { type: 'search', sources: [{ type: 'url', url: 'https://example.test/a' }] } },
      { type: 'message', content: [{ type: 'output_text', text: 'Answer', annotations: [{ type: 'url_citation', url: 'https://example.test/a', title: 'Example' }] }] },
    ] }), { status: 200 }))
    vi.stubGlobal('fetch', fetch)
    const recordRequest = vi.fn()
    const provider = new OpenAIResponsesSearchProvider(() => ({ ...options(), recordRequest }))

    await expect(provider.search({ query: 'latest news' })).resolves.toEqual({
      content: 'Answer',
      sources: [{ url: 'https://example.test/a', title: 'Example' }],
      truncated: false,
    })
    expect(provider.id).toBe(OPENAI_RESPONSES_PROVIDER_ID)
    expect(fetch).toHaveBeenCalledWith('https://api.example.test/v1/responses', expect.objectContaining({
      body: JSON.stringify({
        model: 'gpt-test', input: 'latest news', tools: [{ type: 'web_search', search_context_size: 'medium' }],
        tool_choice: 'required', include: ['web_search_call.action.sources'], store: false,
      }),
    }))
    expect(recordRequest).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'https://api.example.test/v1/responses' }))
  })

  it('rejects a response that did not execute hosted web search', () => {
    expect(() => mapOpenAIResponsesPayload({ output: [{ type: 'message', content: [] }] })).toThrow('did not return a web_search_call')
  })

  it('reports missing credentials without dispatching', async () => {
    const fetch = vi.fn()
    vi.stubGlobal('fetch', fetch)
    const provider = new OpenAIResponsesSearchProvider(() => ({ ...options(), resolveApiKey: async () => undefined }))
    await expect(provider.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_CREDENTIAL_MISSING' })
    expect(fetch).not.toHaveBeenCalled()
  })

  it('surfaces API errors and honours cancellation', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: { message: 'invalid backend' } }), { status: 401 })))
    const provider = new OpenAIResponsesSearchProvider(options)
    await expect(provider.search({ query: 'q' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_ERROR', message: 'invalid backend' })
    const controller = new AbortController()
    controller.abort('stop')
    await expect(provider.search({ query: 'q' }, controller.signal)).rejects.toMatchObject({ code: 'WEB_ABORTED' })
  })

  it('normalizes the configured endpoint once', () => {
    expect(responsesEndpoint('https://api.example.test/v1///')).toBe('https://api.example.test/v1/responses')
  })
})
