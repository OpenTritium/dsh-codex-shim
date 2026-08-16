import { describe, expect, it } from 'vitest'
import { Config, modelMatches } from '../src/gate.ts'

describe('modelMatches', () => {
  it('matches configured Codex route patterns', () => {
    expect(modelMatches('gpt-5-codex', ['gpt-*'])).toBe(true)
    expect(modelMatches('deepseek-chat', ['gpt-*'])).toBe(false)
    expect(modelMatches('any-route', ['*'])).toBe(true)
  })

  it('defaults to GPT-5.6 and accepts an explicit empty pattern list', () => {
    expect(Config({}).modelPatterns).toEqual(['gpt-5.6-*'])
    expect(modelMatches('gpt-5.6-luna', ['gpt-5.6-*'])).toBe(true)
    expect(modelMatches('gpt-5.5', ['gpt-5.6-*'])).toBe(false)
    expect(modelMatches('gpt-5.6-luna', [])).toBe(false)
  })
})
