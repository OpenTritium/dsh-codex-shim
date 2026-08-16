import { describe, expect, it } from 'vitest'
import { approxTokenCount, truncateOutput } from '../src/exec-output.ts'

describe('truncateOutput', () => {
  it('keeps output within the same UTF-8 code point boundaries as Codex', () => {
    const output = 'a'.repeat(7) + '😀汉' + 'z'.repeat(4)
    const result = truncateOutput(output, 4)

    expect(result.originalTokenCount).toBe(approxTokenCount(output))
    expect(result.output).toBe('aaaaaaa…1 tokens truncated…汉zzzz')
    expect(result.output).not.toContain('�')
  })

  it('preserves a suffix ending with a newline', () => {
    const output = 'a'.repeat(64) + '\n'

    expect(truncateOutput(output, 4).output.endsWith('a\n')).toBe(true)
  })

  it('does not truncate output at the exact token budget', () => {
    const output = 'a'.repeat(16)

    expect(truncateOutput(output, 4)).toEqual({ output })
  })
})
