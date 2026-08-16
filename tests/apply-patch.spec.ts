import { describe, expect, it } from 'vitest'
import { parseInvocation, parsePatch } from '../src/apply-patch.ts'

describe('apply_patch', () => {
  const patch = '*** Begin Patch\n*** Add File: note.txt\n+hello\n*** End Patch'

  it('parses an explicit Codex heredoc invocation', () => {
    expect(parseInvocation(`apply_patch <<'PATCH'\n${patch}\nPATCH`)).toEqual({
      kind: 'invocation',
      patch,
    })
    expect(parsePatch(patch).ops).toEqual([{ kind: 'add', path: 'note.txt', lines: ['hello'] }])
  })
})
