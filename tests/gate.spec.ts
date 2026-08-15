import { describe, expect, it } from 'vitest'
import { modelMatches } from '../src/gate.ts'

describe('modelMatches', () => {
  it('matches configured Codex route patterns', () => {
    expect(modelMatches('gpt-5-codex', ['gpt-*'])).toBe(true)
    expect(modelMatches('deepseek-chat', ['gpt-*'])).toBe(false)
    expect(modelMatches('any-route', ['*'])).toBe(true)
  })
})
