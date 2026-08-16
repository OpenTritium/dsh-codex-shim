/** Codex unified-exec consumers over DSH shell, filesystem, and attachments. */

import type { Context } from '@deepseek-ai/cordis'
import { isAbsolute, dirname, resolve as resolvePath } from 'node:path'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type { FileSystem } from '@deepseek-ai/dsh-fs'
import type { SandboxExecutionPolicy, SandboxMode } from '@deepseek-ai/dsh-sandbox'
import {
  ESCALATION_TARGETS,
  approveEscalation,
  canonicalPath,
  escalationHintMarker,
  sandboxDenialMarker,
  validateEscalationArgs,
} from '@deepseek-ai/dsh-sandbox'
import type { SandboxPolicyService } from '@deepseek-ai/dsh-sandbox-policy'
import type { ShellProcess, ShellProcessRead } from '@deepseek-ai/dsh-shell'
import type {} from '@deepseek-ai/dsh-system-prompt'
import { ApplyPatchError, applyPatch, formatSummary, parseInvocation, parsePatch } from './apply-patch.ts'
import type { ApplyPatchIo, ApplyPatchInvocation } from './apply-patch.ts'
import { computeHunkDiffs, diffsFromMeta } from './patch-diff.ts'
import { imageReadContent, readImage } from './image-reader.ts'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {
  DiffCallView,
  DiffResultView,
  FileDiff,
  GenericCallView,
  ToolExecution,
  ToolResult,
} from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-user-approval'
import { newChunkId, renderExecOutput, resolveMaxOutputTokens, truncateOutput } from './exec-output.ts'
import type { CodexExecValue } from './exec-output.ts'
import { presentExecCall, presentExecResult, presentWriteStdinCall } from './exec-render.ts'
import { ExecSessionRegistry } from './exec-sessions.ts'
import { createDirectoryCommand, removeFileCommand } from './exec-shell.ts'

export const name = 'opentritium-codex-exec'
export const inject = ['systemPrompt', 'tools', 'shell']

const APPLY_PATCH_ALIASES: ReadonlySet<string> = new Set(['apply-patch', 'applypatch'])

const YIELD_MIN_MS = 250
const YIELD_MAX_MS = 30_000
const POLL_MAX_MS = 300_000
const POLL_TICK_MS = 25
const HELPER_TIMEOUT_MS = 10_000

interface ExecCommandArgs {
  cmd: string
  workdir?: string
  yield_time_ms?: number
  max_output_tokens?: number
  sandbox_permissions?: string
  justification?: string
}

interface WriteStdinArgs {
  session_id: number
  chars?: string
  yield_time_ms?: number
  max_output_tokens?: number
}

interface ApplyPatchArgs {
  input: string
}

interface PatchFileChange {
  path: string
  before?: string
  after: string
}

interface ApplyPatchValue {
  summary: string
  changes: PatchFileChange[]
}

interface ViewImageArgs {
  path: string
}

const UNIFIED_EXEC_ENV: Readonly<Record<string, string>> = {
  NO_COLOR: '1',
  TERM: 'dumb',
  LANG: 'C.UTF-8',
  LC_CTYPE: 'C.UTF-8',
  LC_ALL: 'C.UTF-8',
  COLORTERM: '',
  PAGER: 'cat',
  GIT_PAGER: 'cat',
  GH_PAGER: 'cat',
  CODEX_CI: '1',
}

function clampYield(requested: number | undefined, fallback: number, max: number): number {
  if (requested === undefined) return fallback
  if (!Number.isSafeInteger(requested) || requested < 0) {
    throw new Error('invalid yield_time_ms: expected a non-negative integer')
  }
  return Math.min(Math.max(requested, YIELD_MIN_MS), max)
}

function resolveWorkdir(
  modelWorkdir: string | undefined,
  exec: { agent?: Agent },
  policyWorkspaceRoot?: string,
): string | undefined {
  const headerCwd = exec.agent?.session.header.cwd
  const sessionCwd = policyWorkspaceRoot ?? (headerCwd === undefined ? undefined : canonicalPath(headerCwd))
  if (modelWorkdir === undefined) return sessionCwd
  if (sessionCwd !== undefined && !isAbsolute(modelWorkdir)) {
    return resolvePath(sessionCwd, modelWorkdir)
  }
  return modelWorkdir
}

function rethrowUpstream(error: unknown): never {
  if (error instanceof ApplyPatchError) {
    throw new Error(`apply_patch verification failed: ${error.message}`, { cause: error })
  }
  throw error
}

// Keep an unsettled process available for a later write_stdin call.
async function drainWindow(
  proc: ShellProcess,
  yieldMs: number,
  signal: AbortSignal,
): Promise<{ output: string; settled: boolean; lossy: boolean; spillPaths: string[] }> {
  const started = Date.now()
  const state = { settled: false }
  const done = proc.done.then(() => {
    state.settled = true
  })
  let output = ''
  let lossy = false
  const spillPaths = new Set<string>()
  const consume = (read: ShellProcessRead): void => {
    output += read.delta
    lossy ||= read.lossy
    if (read.stdoutSpillPath !== undefined) spillPaths.add(read.stdoutSpillPath)
    if (read.stderrSpillPath !== undefined) spillPaths.add(read.stderrSpillPath)
  }
  while (!state.settled && !signal.aborted && Date.now() - started < yieldMs) {
    await Promise.race([done, new Promise(resolve => setTimeout(resolve, POLL_TICK_MS))])
    consume(proc.readOutput())
  }
  consume(proc.readOutput())
  return { output, settled: state.settled, lossy, spillPaths: [...spillPaths] }
}

function outputWithNotices(
  drain: Awaited<ReturnType<typeof drainWindow>>,
  proc: ShellProcess,
  escalationAvailable: boolean,
): string {
  const notices: string[] = []
  if (drain.lossy) {
    notices.push(
      `[some output was dropped from memory; full output: ${drain.spillPaths.length > 0 ? drain.spillPaths.join(', ') : '(unavailable)'}]`,
    )
  }
  if (proc.sandbox?.runnerFailed) {
    notices.push(
      `[sandbox: the sandbox runner itself failed under ${proc.sandbox.mode} mode — the command did not run; this is a sandbox problem, not a command failure]`,
    )
  } else if (proc.sandbox?.denied) {
    notices.push(sandboxDenialMarker(proc.sandbox.mode))
    if (escalationAvailable) notices.push(escalationHintMarker('command'))
  }
  if (notices.length === 0) return drain.output
  return `${drain.output}${drain.output.length > 0 && !drain.output.endsWith('\n') ? '\n' : ''}${notices.join('\n')}`
}

function toValue(
  drain: Awaited<ReturnType<typeof drainWindow>>,
  proc: ShellProcess,
  startedAt: number,
  maxTokens: number,
  sessionId: number | undefined,
  escalationAvailable: boolean,
): CodexExecValue {
  const wallTimeSeconds = (Date.now() - startedAt) / 1000
  const truncated = truncateOutput(outputWithNotices(drain, proc, escalationAvailable), maxTokens)
  return {
    chunkId: newChunkId(),
    wallTimeSeconds,
    ...(drain.settled ? { exitCode: proc.exitCode ?? 1 } : {}),
    ...(sessionId !== undefined ? { sessionId } : {}),
    ...(truncated.originalTokenCount !== undefined ? { originalTokenCount: truncated.originalTokenCount } : {}),
    output: truncated.output,
  }
}

interface ExecRuntime {
  ctx: Context
  sessions: ExecSessionRegistry
}

function makePatchIo(
  runtime: ExecRuntime,
  fs: FileSystem,
  policy: SandboxExecutionPolicy | undefined,
  signal: AbortSignal,
): ApplyPatchIo {
  const helper = async (command: string, workdir: string): Promise<void> => {
    const result = await runtime.ctx.shell.run(
      runtime.ctx.shell.resolve({
        command,
        workdir,
        timeoutMs: HELPER_TIMEOUT_MS,
        signal,
        ...(policy !== undefined ? { sandboxPolicy: policy } : {}),
      }),
    )
    if (result.exitCode !== 0) {
      throw new ApplyPatchError(result.stderr.text.trim() || `helper command failed with exit code ${result.exitCode}`)
    }
  }
  const ensureParent = async (path: string, workdir: string): Promise<void> => {
    const parent = dirname(path)
    if (parent !== '.' && parent !== '') await helper(createDirectoryCommand(parent), workdir)
  }
  return {
    async readText(path, workdir) {
      const target = await fs.resolve(path, { cwd: workdir, signal })
      return fs.readText(target, signal)
    },
    async writeText(path, workdir, content) {
      await ensureParent(path, workdir)
      const target = await fs.resolve(path, { cwd: workdir, signal })
      await fs.writeText(target, content, undefined, signal, policy)
    },
    async remove(path, workdir) {
      await helper(removeFileCommand(path), workdir)
    },
    async moveText(from, to, workdir, content) {
      await ensureParent(to, workdir)
      const target = await fs.resolve(to, { cwd: workdir, signal })
      await fs.writeText(target, content, undefined, signal, policy)
      await helper(removeFileCommand(from), workdir)
    },
  }
}

function recordingPatchIo(io: ApplyPatchIo): { io: ApplyPatchIo; changes: () => PatchFileChange[] } {
  interface Preimage {
    path: string
    before: string | undefined
  }
  const preimages = new Map<string, Preimage>()
  const applied = new Map<string, PatchFileChange>()
  const keyOf = (path: string, workdir: string): string => resolvePath(workdir, path)
  const optionalPreimage = (path: string, workdir: string): Promise<string | undefined> =>
    io.readText(path, workdir).then(
      value => value,
      () => undefined,
    )
  const recordBefore = (path: string, workdir: string, before: string | undefined): Preimage => {
    const key = keyOf(path, workdir)
    const created: Preimage = { path, before }
    preimages.set(key, created)
    return created
  }
  return {
    io: {
      async readText(path, workdir) {
        const value = await io.readText(path, workdir)
        recordBefore(path, workdir, value)
        return value
      },
      async writeText(path, workdir, content) {
        const key = keyOf(path, workdir)
        const existing = preimages.get(key)
        const change = existing ?? recordBefore(path, workdir, await optionalPreimage(path, workdir))
        await io.writeText(path, workdir, content)
        applied.set(key, { path, ...(change.before === undefined ? {} : { before: change.before }), after: content })
      },
      async remove(path, workdir) {
        const key = keyOf(path, workdir)
        const existing = preimages.get(key)
        await io.remove(path, workdir)
        if (existing !== undefined) applied.set(key, { path, before: existing.before, after: '' })
      },
      async moveText(from, to, workdir, content) {
        const sourceKey = keyOf(from, workdir)
        const source = preimages.get(sourceKey) ?? recordBefore(from, workdir, await optionalPreimage(from, workdir))
        await io.moveText(from, to, workdir, content)
        preimages.delete(sourceKey)
        const targetKey = keyOf(to, workdir)
        preimages.set(targetKey, { path: to, before: source.before })
        applied.set(targetKey, {
          path: to,
          ...(source.before === undefined ? {} : { before: source.before }),
          after: content,
        })
      },
    },
    changes: () => [...applied.values()],
  }
}

function patchDiffs(changes: readonly PatchFileChange[]): FileDiff[] {
  return changes.flatMap(change =>
    change.before === undefined
      ? [{ path: change.path, oldText: null, newText: change.after }]
      : computeHunkDiffs(change.path, change.before, change.after),
  )
}

async function runIntercepted(
  runtime: ExecRuntime,
  invocation: Exclude<ApplyPatchInvocation, { kind: 'none' }>,
  baseCwd: string,
  policy: SandboxExecutionPolicy | undefined,
  signal: AbortSignal,
): Promise<CodexExecValue> {
  if (invocation.kind === 'implicit-invocation') {
    throw new Error('patch detected without explicit call to apply_patch. Rerun as ["apply_patch", "<patch>"]')
  }
  if (invocation.kind === 'malformed-invocation') {
    throw new Error('apply_patch handler received invalid patch input')
  }
  const fs = runtime.ctx.get('fs')
  if (fs === undefined) {
    throw new Error('apply_patch requires the filesystem capability; no fs service is mounted in this composition')
  }
  const startedAt = Date.now()
  try {
    const output = await applyPatchInput(runtime, fs, invocation.patch, baseCwd, policy, signal, invocation.workdir)
    return { chunkId: newChunkId(), wallTimeSeconds: (Date.now() - startedAt) / 1000, output: output.summary }
  } catch (error: unknown) {
    rethrowUpstream(error)
  }
}

async function applyPatchInput(
  runtime: ExecRuntime,
  fs: FileSystem,
  input: string,
  baseCwd: string,
  policy: SandboxExecutionPolicy | undefined,
  signal: AbortSignal,
  workdir?: string,
): Promise<ApplyPatchValue> {
  const parsed = parsePatch(input)
  const recording = recordingPatchIo(makePatchIo(runtime, fs, policy, signal))
  const affected = await applyPatch({ ...parsed, ...(workdir !== undefined ? { workdir } : {}) }, baseCwd, recording.io)
  return { summary: formatSummary(affected), changes: recording.changes() }
}

function presentApplyPatchCall(args: ApplyPatchArgs): DiffCallView | GenericCallView {
  try {
    const parsed = parsePatch(args.input)
    const locations = [
      ...new Set(parsed.ops.map(op => (op.kind === 'update' && op.moveTo !== undefined ? op.moveTo : op.path))),
    ].map(path => ({ path }))
    const diffs = parsed.ops.flatMap<FileDiff>(op => {
      if (op.kind === 'add') {
        return [{ path: op.path, oldText: null, newText: op.lines.map(line => `${line}\n`).join('') }]
      }
      if (op.kind === 'delete') return []
      const path = op.moveTo ?? op.path
      return op.chunks.map(chunk => ({ path, oldText: chunk.oldLines.join('\n'), newText: chunk.newLines.join('\n') }))
    })
    if (diffs.length === 0) {
      return { card: 'generic', title: 'Apply patch', kind: 'edit', rawInput: args.input, locations }
    }
    return { card: 'diff', title: 'Apply patch', diffs, locations }
  } catch {
    return { card: 'generic', title: 'Apply patch', kind: 'edit', rawInput: args.input }
  }
}

function presentApplyPatchResult(_args: ApplyPatchArgs, result: ToolResult): DiffResultView | undefined {
  if (result.isError) return undefined
  const diffs = diffsFromMeta(result.meta)
  return diffs === undefined ? undefined : { card: 'diff', title: 'Apply patch', diffs }
}

function presentViewImageCall(args: ViewImageArgs): GenericCallView {
  return { card: 'generic', title: `View image ${args.path}`, kind: 'read', locations: [{ path: args.path }] }
}

export function apply(ctx: Context): void {
  const runtime: ExecRuntime = { ctx, sessions: new ExecSessionRegistry() }
  ctx.on('system-prompt/assemble', async (_assembly, _context, next) => {
    const assembled = await next()
    return { ...assembled, tools: assembled.tools.filter(tool => !APPLY_PATCH_ALIASES.has(tool.name)) }
  })
  const defaultMode = ctx.shell.sandboxMode
  const escalationModes: readonly SandboxMode[] = defaultMode === undefined ? [] : ESCALATION_TARGETS
  const sandboxPolicy: SandboxPolicyService | undefined =
    defaultMode === undefined ? undefined : ctx.get('sandboxPolicy')
  if (defaultMode !== undefined && sandboxPolicy === undefined) {
    throw new Error('tool-codex-exec: the mounted shell executor confines but ctx.sandboxPolicy is missing')
  }
  const resolveSandboxPolicy = (exec: ToolExecution): SandboxExecutionPolicy | undefined =>
    sandboxPolicy?.resolve(exec.agent === undefined ? {} : { session: exec.agent.session })

  const canAskForEscalation = (exec: ToolExecution): boolean => {
    const approval = ctx.get('approval')
    return (
      exec.agent !== undefined &&
      approval !== undefined &&
      (approval.overrideOf(exec.agent.session) ?? approval.config.policy) === 'ask'
    )
  }

  const approveExecEscalation = (
    mode: string,
    justification: string,
    exec: ToolExecution,
    standingPolicy: SandboxExecutionPolicy | undefined,
  ): Promise<SandboxMode> => {
    if (escalationModes.length === 0) {
      throw new Error('sandbox_permissions is not available in this composition (no sandboxing executor to escalate)')
    }
    return approveEscalation(
      {
        requestedMode: mode,
        justification,
        effectiveMode: (standingPolicy as SandboxExecutionPolicy).mode,
        subject: 'command',
      },
      {
        approver: ctx.get('approval'),
        agent: exec.agent,
        callId: exec.callId,
        toolName: 'exec_command',
        signal: exec.signal,
      },
    )
  }

  for (const toolName of ['apply_patch', 'apply-patch', 'applypatch'] as const) {
    ctx.tools.register(
      defineTool({
        name: toolName,
        description:
          toolName === 'apply_patch'
            ? 'Apply a patch to one or more files. The input must be a raw patch document beginning with *** Begin Patch and ending with *** End Patch.'
            : 'Compatibility alias for apply_patch. Apply a raw patch document through the input field.',
        parameters: {
          input: {
            type: 'string',
            required: true,
            description: 'Raw patch document. Do not wrap it in a shell command or heredoc.',
          },
        },
        output: {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              summary: { type: 'string', required: true },
              changes: {
                type: 'array',
                required: true,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  properties: {
                    path: { type: 'string', required: true },
                    before: { type: 'string' },
                    after: { type: 'string', required: true },
                  },
                },
              },
            },
          },
          render: (_args, value) => [{ type: 'text', text: value.summary }],
          presentationMeta: (_args, value) => ({
            diffs: patchDiffs(value.changes).map(({ path, oldText, newText }) => ({ path, oldText, newText })),
          }),
        },
        async execute(args: ApplyPatchArgs, exec) {
          if (args.input.trim().length === 0) throw new Error(`${toolName} input must be a non-empty patch document`)
          const fs = ctx.get('fs')
          if (fs === undefined) {
            throw new Error(
              `${toolName} requires the filesystem capability; no fs service is mounted in this composition`,
            )
          }
          const standingPolicy = resolveSandboxPolicy(exec)
          const cwd = standingPolicy?.workspaceRoot ?? exec.agent?.session.header.cwd
          if (cwd === undefined) {
            throw new Error(`${toolName} requires an owning agent unless the sandbox policy supplies a workspace root`)
          }
          const baseCwd = canonicalPath(cwd)
          try {
            return await applyPatchInput(runtime, fs, args.input, baseCwd, standingPolicy, exec.signal)
          } catch (error: unknown) {
            rethrowUpstream(error)
          }
        },
        presentCall: presentApplyPatchCall,
        presentResult: presentApplyPatchResult,
      }),
    )
  }

  ctx.inject(['attachments', 'fs'], imageCtx => {
    imageCtx.tools.register(
      defineTool({
        name: 'view_image',
        description: 'View an image from the local filesystem. The image is added to the model context.',
        parameters: { path: { type: 'string', required: true, description: 'Path to the image file.' } },
        output: {
          schema: {
            type: 'object',
            additionalProperties: false,
            properties: {
              path: { type: 'string', required: true },
              image: {
                type: 'object',
                additionalProperties: false,
                required: true,
                properties: {
                  attachmentId: { type: 'string', required: true },
                  mediaType: {
                    type: 'string',
                    enum: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
                    required: true,
                  },
                  bytes: { type: 'integer', required: true },
                  width: { type: 'integer', required: true },
                  height: { type: 'integer', required: true },
                  name: { type: 'string' },
                },
              },
            },
          },
          render: (_args, value) => imageReadContent(value),
        },
        execute: (args: ViewImageArgs, exec) => readImage(imageCtx, exec, args.path),
        presentCall: presentViewImageCall,
      }),
    )
  })

  ctx.tools.register(
    defineTool({
      name: 'exec_command',
      description: 'Runs a shell command over pipes, returning output or a session ID for ongoing interaction.',
      parameters: {
        cmd: { type: 'string', required: true, description: 'Shell command to execute.' },
        workdir: { type: 'string', description: 'Working directory for the command. Defaults to the turn cwd.' },
        yield_time_ms: {
          type: 'number',
          description: 'Wait before yielding output. Defaults to 10000 ms; effective range is 250-30000 ms.',
        },
        max_output_tokens: {
          type: 'number',
          description: 'Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy.',
        },
        ...(escalationModes.length > 0
          ? {
              sandbox_permissions: {
                type: 'string' as const,
                enum: [...escalationModes],
                description:
                  'The wider sandbox mode this command needs. Only valid as a one-shot retry of a command the sandbox just denied; requires justification and user approval.',
              },
              justification: {
                type: 'string' as const,
                description:
                  'Required with sandbox_permissions: one sentence for the user explaining why this exact command needs the wider access.',
              },
            }
          : {}),
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            chunkId: { type: 'string' },
            wallTimeSeconds: { type: 'number', required: true },
            exitCode: { type: 'integer' },
            sessionId: { type: 'integer' },
            originalTokenCount: { type: 'integer' },
            output: { type: 'string', required: true },
          },
        },
        render: (_args, value) => renderExecOutput(value),
      },
      timeoutMs: POLL_MAX_MS + 20_000,
      async execute(args: ExecCommandArgs, exec) {
        if (args.cmd.trim().length === 0) throw new Error('invalid cmd: expected a non-empty string')
        const standingPolicy = resolveSandboxPolicy(exec)
        validateEscalationArgs(args.sandbox_permissions, args.justification)
        const approvedMode =
          args.sandbox_permissions !== undefined && args.justification !== undefined
            ? await approveExecEscalation(args.sandbox_permissions, args.justification, exec, standingPolicy)
            : undefined
        const policy =
          approvedMode === undefined
            ? standingPolicy
            : { ...(standingPolicy as SandboxExecutionPolicy), mode: approvedMode }
        const workdir = resolveWorkdir(args.workdir, exec, standingPolicy?.workspaceRoot)

        const invocation = parseInvocation(args.cmd)
        if (invocation.kind !== 'none') {
          const baseCwd = workdir ?? canonicalPath(exec.agent?.session.header.cwd ?? process.cwd())
          return runIntercepted(runtime, invocation, baseCwd, policy, exec.signal)
        }

        const proc = ctx.shell.start(
          ctx.shell.resolve({
            command: args.cmd,
            ...(workdir !== undefined ? { workdir } : {}),
            env: UNIFIED_EXEC_ENV,
            ...(policy !== undefined ? { sandboxPolicy: policy } : {}),
          }),
        )
        const startedAt = Date.now()
        const yieldMs = clampYield(args.yield_time_ms, 10_000, YIELD_MAX_MS)
        const maxTokens = resolveMaxOutputTokens(args.max_output_tokens)
        const drain = await drainWindow(proc, yieldMs, exec.signal)
        if (!drain.settled) {
          const agent = exec.agent
          if (agent === undefined) {
            // Without an owning agent, no caller can poll this process.
            proc.kill()
            throw new Error('exec_command: a non-agent caller cannot hold a running session')
          }
          const session = await runtime.sessions.register(agent, proc)
          return toValue(drain, proc, startedAt, maxTokens, session.id, canAskForEscalation(exec))
        }
        return toValue(drain, proc, startedAt, maxTokens, undefined, canAskForEscalation(exec))
      },
      presentCall: presentExecCall,
      presentResult: presentExecResult,
    }),
  )

  ctx.tools.register(
    defineTool({
      name: 'write_stdin',
      description:
        'Polls a running unified exec session and returns recent output. The pinned upstream shell capability does not yet expose interactive stdin writes.',
      parameters: {
        session_id: { type: 'integer', required: true, description: 'Identifier of the running unified exec session.' },
        chars: {
          type: 'string',
          description: 'Bytes to write to stdin. Defaults to empty, which polls without writing.',
        },
        yield_time_ms: {
          type: 'number',
          description:
            'Wait before yielding output. Non-empty writes default to 250 ms and cap at 30000 ms; empty polls wait 5000-300000 ms by default.',
        },
        max_output_tokens: {
          type: 'number',
          description: 'Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy.',
        },
      },
      output: {
        schema: {
          type: 'object',
          additionalProperties: false,
          properties: {
            chunkId: { type: 'string' },
            wallTimeSeconds: { type: 'number', required: true },
            exitCode: { type: 'integer' },
            sessionId: { type: 'integer' },
            originalTokenCount: { type: 'integer' },
            output: { type: 'string', required: true },
          },
        },
        render: (_args, value) => renderExecOutput(value),
      },
      timeoutMs: POLL_MAX_MS + 20_000,
      async execute(args: WriteStdinArgs, exec) {
        const agent = exec.agent
        if (agent === undefined) throw new Error('write_stdin requires an owning agent session')
        const session = runtime.sessions.get(agent, args.session_id)
        if (session === undefined) {
          throw new Error(`write_stdin: no exec session with id ${args.session_id}`)
        }
        const write = args.chars ?? ''
        const yieldMs = clampYield(
          args.yield_time_ms,
          write.length > 0 ? 250 : 5_000,
          write.length > 0 ? YIELD_MAX_MS : POLL_MAX_MS,
        )
        if (write.length > 0) {
          throw new Error(
            'write_stdin cannot send input: upstream DeepSeek Harness does not expose interactive stdin on ShellProcess',
          )
        }
        const startedAt = Date.now()
        const maxTokens = resolveMaxOutputTokens(args.max_output_tokens)
        const drain = await drainWindow(session.proc, yieldMs, exec.signal)
        if (drain.settled) {
          runtime.sessions.release(agent, args.session_id)
          return toValue(drain, session.proc, startedAt, maxTokens, undefined, canAskForEscalation(exec))
        }
        return toValue(drain, session.proc, startedAt, maxTokens, args.session_id, canAskForEscalation(exec))
      },
      presentCall: presentWriteStdinCall,
      presentResult: presentExecResult,
    }),
  )
}
