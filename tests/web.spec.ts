import { describe, expect, it } from 'vitest'
import { formatWebRunOutput, parseWebRunArgs } from '../src/tool-web.ts'

describe('web_run', () => {
  it('keeps the Codex surface search-only', () => {
    expect(parseWebRunArgs({ search_query: [{ q: '  DeepSeek Harness  ' }] }, 1)).toEqual({
      search_query: [{ q: 'DeepSeek Harness' }],
    })
    expect(() => parseWebRunArgs({ search_query: [] }, 4)).toThrow('must contain at least one')
    expect(() => parseWebRunArgs({ search_query: [{ q: 'one' }, { q: 'two' }] }, 1)).toThrow('at most 1')
  })

  it('renders only configured-search sources', () => {
    expect(formatWebRunOutput({ results: [{
      query: 'harness',
      sources: [{ url: 'https://example.test/docs', title: 'Docs', snippet: 'Reference' }],
      truncated: false,
    }] })).toContain('[Docs](https://example.test/docs)')
  })
})
