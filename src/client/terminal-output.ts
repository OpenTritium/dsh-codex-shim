/** Parsed stream sections from the unified exec response text. */
export interface TerminalOutputSections {
  /** Text before the stderr marker, excluding the response metadata. */
  stdout: string
  /** Text after the stderr marker. */
  stderr: string
}

/**
 * Split the published unified-exec response into stdout and stderr.
 *
 * The upstream shell capability emits response metadata followed by an
 * `Output:` line and marks stderr with `[stderr]`. Text before `Output:` is
 * intentionally discarded because it belongs to the status summary.
 *
 * @param text - rendered unified-exec response text.
 * @returns the two stream bodies, preserving their original line contents.
 */
export function splitTerminalOutput(text: string): TerminalOutputSections {
  const outputMarker = '\nOutput:\n'
  const outputStart = text.indexOf(outputMarker)
  const body = outputStart !== -1
    ? text.slice(outputStart + outputMarker.length)
    : text.startsWith('Output:\n')
      ? text.slice('Output:\n'.length)
      : text
  const stderrMarker = '\n[stderr]\n'
  const stderrStart = body.indexOf(stderrMarker)
  if (body.startsWith('[stderr]\n')) {
    return { stdout: '', stderr: body.slice('[stderr]\n'.length) }
  }
  if (stderrStart === -1) return { stdout: body, stderr: '' }
  return {
    stdout: body.slice(0, stderrStart),
    stderr: body.slice(stderrStart + stderrMarker.length),
  }
}
