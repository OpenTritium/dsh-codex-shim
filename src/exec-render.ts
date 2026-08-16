import type { TerminalCallView, TerminalResultView, ToolResult } from '@deepseek-ai/dsh-tools'

interface ExecCallArgs {
  cmd: string
  workdir?: string
}

interface WriteStdinCallArgs {
  session_id: number
}

export function presentExecCall(args: ExecCallArgs): TerminalCallView {
  return { card: 'terminal', title: args.cmd, ...(args.workdir !== undefined ? { cwd: args.workdir } : {}) }
}

export function presentWriteStdinCall(args: WriteStdinCallArgs): TerminalCallView {
  return { card: 'terminal', title: `write_stdin → session ${args.session_id}` }
}

export function presentExecResult(_args: unknown, result: ToolResult): TerminalResultView | undefined {
  const block = result.content[0]
  return block !== undefined && block.type === 'text' ? { card: 'terminal', output: block.text } : undefined
}
