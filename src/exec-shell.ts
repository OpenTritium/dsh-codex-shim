/** Platform-specific shell helpers used only for apply-patch file mutations. */

/** Quote one path for the active shell's string literal syntax. */
export function shellQuote(path: string, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? `'${path.replaceAll("'", "''")}'` : `'${path.replaceAll("'", "'\\''")}'`
}

/** Create a command that recursively creates a parent directory. */
export function createDirectoryCommand(parent: string, platform: NodeJS.Platform = process.platform): string {
  const quoted = shellQuote(parent, platform)
  return platform === 'win32'
    ? `New-Item -ItemType Directory -Force -Path ${quoted} | Out-Null`
    : `mkdir -p -- ${quoted}`
}

/** Create a command that removes one file without following a recursive path. */
export function removeFileCommand(path: string, platform: NodeJS.Platform = process.platform): string {
  const quoted = shellQuote(path, platform)
  return platform === 'win32' ? `Remove-Item -LiteralPath ${quoted} -Force` : `rm -- ${quoted}`
}
