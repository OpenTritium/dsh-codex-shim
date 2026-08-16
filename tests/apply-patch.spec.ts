import { describe, expect, it } from 'vitest'
import { applyPatch, parseInvocation, parsePatch } from '../src/apply-patch.ts'
import type { ApplyPatchIo } from '../src/apply-patch.ts'

describe('apply_patch', () => {
  const patch = '*** Begin Patch\n*** Add File: note.txt\n+hello\n*** End Patch'

  it('parses an explicit Codex heredoc invocation', () => {
    expect(parseInvocation(`apply_patch <<'PATCH'\n${patch}\nPATCH`)).toEqual({ kind: 'invocation', patch })
    expect(parsePatch(patch).ops).toEqual([{ kind: 'add', path: 'note.txt', lines: ['hello'] }])
  })

  it('deletes a binary file when no textual preimage is available', async () => {
    const removed: string[] = []
    const io: ApplyPatchIo = {
      readText: async () => {
        throw new Error('binary file')
      },
      writeText: async () => undefined,
      remove: async path => {
        removed.push(path)
      },
      moveText: async () => undefined,
    }

    await expect(
      applyPatch(parsePatch('*** Begin Patch\n*** Delete File: image.png\n*** End Patch'), '/workspace', io),
    ).resolves.toEqual({ added: [], modified: [], deleted: ['image.png'] })
    expect(removed).toEqual(['image.png'])
  })
})
