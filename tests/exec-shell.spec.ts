import { describe, expect, it } from 'vitest'
import { createDirectoryCommand, removeFileCommand, shellQuote } from '../src/exec-shell.ts'

describe('apply-patch shell helpers', () => {
  it('uses POSIX commands and quoting outside Windows', () => {
    expect(shellQuote("dir/it's", 'linux')).toBe("'dir/it'\\''s'")
    expect(createDirectoryCommand('nested dir', 'darwin')).toBe("mkdir -p -- 'nested dir'")
    expect(removeFileCommand('old file', 'linux')).toBe("rm -- 'old file'")
  })

  it('uses PowerShell commands and quoting on Windows', () => {
    expect(shellQuote("C:\\O'Brien", 'win32')).toBe("'C:\\O''Brien'")
    expect(createDirectoryCommand('C:\\nested dir', 'win32')).toBe(
      "New-Item -ItemType Directory -Force -Path 'C:\\nested dir' | Out-Null",
    )
    expect(removeFileCommand('C:\\old file', 'win32')).toBe("Remove-Item -LiteralPath 'C:\\old file' -Force")
  })
})
