import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply } from '../src/tool-exec.ts'

interface PatchValue {
  readonly summary: string
  readonly changes: readonly unknown[]
}

interface PatchTool {
  readonly name: string
  readonly output: { presentationMeta(args: unknown, value: PatchValue): unknown }
  execute(args: { input: string }, exec: unknown): Promise<PatchValue>
  presentResult(args: unknown, result: unknown): unknown
}

describe('apply_patch tool', () => {
  it('deletes a binary file without a text diff', async () => {
    const registered: PatchTool[] = []
    const files = new Set(['image.png'])
    const fs = {
      resolve: async (path: string) => ({ path }),
      readText: async () => {
        throw new Error('binary file')
      },
    }
    const rawContext = {
      on: () => undefined,
      shell: {
        sandboxMode: undefined,
        resolve: (spec: { command: string }) => spec,
        run: async (spec: { command: string }) => {
          if (spec.command !== "rm -- 'image.png'") return { exitCode: 1, stderr: { text: 'unexpected command' } }
          files.delete('image.png')
          return { exitCode: 0, stderr: { text: '' } }
        },
      },
      get: (name: string) => (name === 'fs' ? fs : undefined),
      inject: (_dependencies: unknown, callback: (injected: Context) => void) =>
        callback(rawContext as unknown as Context),
      tools: {
        register: (tool: unknown) => {
          registered.push(tool as PatchTool)
          return () => undefined
        },
      },
    }
    const context = rawContext as unknown as Context
    apply(context)

    const tool = registered.find(entry => entry.name === 'apply_patch')
    if (tool === undefined) throw new Error('apply_patch tool was not registered')
    const args = { input: '*** Begin Patch\n*** Delete File: image.png\n*** End Patch' }
    const result = await tool.execute(args, {
      agent: { session: { header: { cwd: '/workspace' } } },
      callId: 'test-call',
      signal: new AbortController().signal,
    })

    expect(files).not.toContain('image.png')
    expect(result).toEqual({ summary: 'Success. Updated the following files:\nD image.png', changes: [] })
    const meta = tool.output.presentationMeta(args, result)
    expect(meta).toEqual({ diffs: [] })
    expect(tool.presentResult(args, { content: [], isError: false, meta })).toBeUndefined()
  })
})
