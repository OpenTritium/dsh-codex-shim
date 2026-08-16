import { describe, expect, it } from 'vitest'
import { splitTerminalOutput } from '../src/client/terminal-output.ts'

describe('splitTerminalOutput', () => {
  it('removes exec metadata and separates stderr', () => {
    expect(splitTerminalOutput('Chunk ID: abc\nOutput:\nhello\n[stderr]\nwarning')).toEqual({
      stdout: 'hello',
      stderr: 'warning',
    })
  })

  it('keeps stdout when stderr is absent', () => {
    expect(splitTerminalOutput('Output:\nhello\n')).toEqual({ stdout: 'hello\n', stderr: '' })
  })

  it('handles stderr-only output immediately after the output marker', () => {
    expect(splitTerminalOutput('Output:\n[stderr]\nwarning\n')).toEqual({
      stdout: '',
      stderr: 'warning\n',
    })
  })

  it('keeps an unwrapped program line that happens to contain Output:', () => {
    expect(splitTerminalOutput('hello\nOutput:\nworld\n')).toEqual({
      stdout: 'hello\nOutput:\nworld\n',
      stderr: '',
    })
  })

  it('does not infer stderr from an unwrapped program marker', () => {
    expect(splitTerminalOutput('hello\n[stderr]\nworld\n')).toEqual({
      stdout: 'hello\n[stderr]\nworld\n',
      stderr: '',
    })
  })
})
