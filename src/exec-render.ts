/**
 * Pure card presenters for the Codex unified-exec tools: terminal cards on
 * both the pending call and the completed result. Replay-safe: projections
 * derive only from the call arguments and the rendered result content.
 * @module @opentritium/dsh-codex-shim/exec-render
 */

import type { TerminalCallView, TerminalResultView, ToolResult } from '@deepseek-ai/dsh-tools'

/** Arguments the `exec_command` presenter projects. */
interface ExecCallArgs {
  cmd: string
  workdir?: string
}

/** Arguments the `write_stdin` presenter projects. */
interface WriteStdinCallArgs {
  session_id: number
}

/**
 * Present one `exec_command` call as a terminal card titled by the command.
 * @param args - the validated tool arguments.
 * @returns the terminal call view.
 */
export function presentExecCall(args: ExecCallArgs): TerminalCallView {
  return { card: 'terminal', title: args.cmd, ...(args.workdir !== undefined ? { cwd: args.workdir } : {}) }
}

/**
 * Present one `write_stdin` call as a terminal card on the target session.
 * @param args - the validated tool arguments.
 * @returns the terminal call view.
 */
export function presentWriteStdinCall(args: WriteStdinCallArgs): TerminalCallView {
  return { card: 'terminal', title: `write_stdin → session ${args.session_id}` }
}

/**
 * Present one completed exec result as a terminal card carrying the raw
 * response text; errors keep the generic fenced fallback.
 * @param _args - the validated tool arguments (unused; the text suffices).
 * @param result - the normalized tool result.
 * @returns the terminal result view, or undefined for a non-text result.
 */
export function presentExecResult(_args: unknown, result: ToolResult): TerminalResultView | undefined {
  const block = result.content[0]
  return block !== undefined && block.type === 'text' ? { card: 'terminal', output: block.text } : undefined
}
