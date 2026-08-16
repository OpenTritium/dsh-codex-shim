export function shellQuote(path: string, platform: NodeJS.Platform = process.platform): string {
  return platform === 'win32' ? `'${path.replaceAll("'", "''")}'` : `'${path.replaceAll("'", "'\\''")}'`
}

export function createDirectoryCommand(parent: string, platform: NodeJS.Platform = process.platform): string {
  const quoted = shellQuote(parent, platform)
  return platform === 'win32'
    ? `New-Item -ItemType Directory -Force -Path ${quoted} | Out-Null`
    : `mkdir -p -- ${quoted}`
}

export function removeFileCommand(path: string, platform: NodeJS.Platform = process.platform): string {
  const quoted = shellQuote(path, platform)
  return platform === 'win32' ? `Remove-Item -LiteralPath ${quoted} -Force` : `rm -- ${quoted}`
}
