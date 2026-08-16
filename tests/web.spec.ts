import { describe, expect, it } from 'vitest'
import { formatWebRunOutput, parseWebRunArgs, presentWebRunResult, webRunMetaFromValue } from '../src/tool-web.ts'

describe('web_run', () => {
  it('keeps the Codex surface search-only', () => {
    expect(parseWebRunArgs({ search_query: [{ q: '  DeepSeek Harness  ' }] }, 1)).toEqual({
      search_query: [{ q: 'DeepSeek Harness' }],
    })
    expect(() => parseWebRunArgs({ search_query: [] }, 4)).toThrow('must contain at least one')
    expect(() => parseWebRunArgs({ search_query: [{ q: 'one' }, { q: 'two' }] }, 1)).toThrow('at most 1')
  })

  it('renders only configured-search sources', () => {
    expect(
      formatWebRunOutput({
        results: [
          {
            query: 'harness',
            sources: [{ url: 'https://example.test/docs', title: 'Docs', snippet: 'Reference' }],
            truncated: false,
          },
        ],
      }),
    ).toContain('[Docs](https://example.test/docs)')
  })

  it('restores a single-query web card from presentation metadata', () => {
    const value = {
      results: [
        {
          query: 'harness',
          content: 'summary',
          sources: [{ url: 'https://example.test/docs', title: 'Docs' }],
          truncated: false,
        },
      ],
    }
    const meta = webRunMetaFromValue(value)
    expect(
      presentWebRunResult({ search_query: [{ q: 'harness' }] }, { content: [], isError: false, meta: meta as never }),
    ).toEqual({
      card: 'web',
      kind: 'search',
      title: 'harness',
      answer: 'summary',
      sources: [{ url: 'https://example.test/docs', title: 'Docs' }],
      truncated: false,
    })
  })

  it('keeps batched searches grouped in the web card', () => {
    const meta = webRunMetaFromValue({
      results: [
        { query: 'first', sources: [{ url: 'https://example.test/first' }], truncated: false },
        {
          query: 'second',
          content: 'summary',
          sources: [{ url: 'https://example.test/second', title: 'Second' }],
          truncated: true,
        },
      ],
    })
    expect(
      presentWebRunResult(
        { search_query: [{ q: 'first' }, { q: 'second' }] },
        {
          content: [],
          isError: false,
          meta: meta as never,
        },
      ),
    ).toEqual({
      card: 'web',
      kind: 'searches',
      results: [
        { query: 'first', sources: [{ url: 'https://example.test/first' }], truncated: false },
        {
          query: 'second',
          answer: 'summary',
          sources: [{ url: 'https://example.test/second', title: 'Second' }],
          truncated: true,
        },
      ],
    })
  })
})
