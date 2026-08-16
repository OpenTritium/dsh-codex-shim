export interface TerminalOutputSections {
  stdout: string
  stderr: string
}

/** Strip the DSH status envelope and split the remaining output streams. */
export function splitTerminalOutput(text: string): TerminalOutputSections {
  const outputMarker = '\nOutput:\n'
  const outputStart = text.indexOf(outputMarker)
  const prefix = outputStart === -1 ? text.slice(0, 'Output:\n'.length) : text.slice(0, outputStart)
  const hasEnvelope =
    text.startsWith('Output:\n') ||
    /(?:^|\n)(?:Chunk ID: |Wall time: |Process (?:exited|running)|Original token count: )/.test(prefix)
  const body =
    hasEnvelope && outputStart !== -1
      ? text.slice(outputStart + outputMarker.length)
      : hasEnvelope && text.startsWith('Output:\n')
        ? text.slice('Output:\n'.length)
        : text
  if (!hasEnvelope) return { stdout: body, stderr: '' }
  const stderrMarker = '\n[stderr]\n'
  const stderrStart = body.indexOf(stderrMarker)
  if (body.startsWith('[stderr]\n')) {
    return { stdout: '', stderr: body.slice('[stderr]\n'.length) }
  }
  if (stderrStart === -1) return { stdout: body, stderr: '' }
  return { stdout: body.slice(0, stderrStart), stderr: body.slice(stderrStart + stderrMarker.length) }
}
