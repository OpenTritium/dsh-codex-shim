/**
 * Codex `apply_patch` patch-format engine: patch parser, shell-invocation
 * detector, and fuzzy-matching applier over an injected file-IO surface.
 *
 * Ported from the Apache-2.0 `codex-rs/apply-patch` crate (upstream commit
 * `636e505c`). Marker strings, chunk semantics, the four-pass line matching,
 * and error wording follow upstream so models trained on Codex recognize the
 * results. File IO stays injected: consumers bind reads/writes to the fs
 * capability and removals/moves to the shell capability, so sandbox and
 * filesystem policy apply at the consumer's boundary, not here.
 * @module @opentritium/dsh-codex-shim/apply-patch
 */

import { resolve as resolvePath } from 'node:path'

const BEGIN_PATCH_MARKER = '*** Begin Patch'
const END_PATCH_MARKER = '*** End Patch'
const ADD_FILE_MARKER = '*** Add File: '
const DELETE_FILE_MARKER = '*** Delete File: '
const UPDATE_FILE_MARKER = '*** Update File: '
const MOVE_TO_MARKER = '*** Move to: '
const EOF_MARKER = '*** End of File'
const CHANGE_CONTEXT_MARKER = '@@ '
const EMPTY_CHANGE_CONTEXT_MARKER = '@@'
const ENVIRONMENT_ID_MARKER = '*** Environment ID:'

/**
 * Parse or apply failure with the wording upstream apply-patch reports. The
 * consumer renders `apply_patch verification failed: {message}` around it.
 */
export class ApplyPatchError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ApplyPatchError'
  }
}

export const ApplyPatchFileUpdateMode = {
  NormalizeToLf: 'normalize-to-lf',
  PreserveLineEndings: 'preserve-line-endings',
} as const

export type ApplyPatchFileUpdateMode = (typeof ApplyPatchFileUpdateMode)[keyof typeof ApplyPatchFileUpdateMode]

export interface PatchUpdateChunk {
  readonly changeContext: string | undefined
  readonly oldLines: readonly string[]
  readonly newLines: readonly string[]
  readonly contextLineIndices?: readonly (readonly [number, number])[]
  readonly endOfFile: boolean
}

export interface PatchFileAdd {
  readonly kind: 'add'
  readonly path: string
  readonly lines: readonly string[]
}

export interface PatchFileDelete {
  readonly kind: 'delete'
  readonly path: string
}

export interface PatchFileUpdate {
  readonly kind: 'update'
  readonly path: string
  readonly moveTo: string | undefined
  readonly chunks: readonly PatchUpdateChunk[]
}

export type PatchFileOp = PatchFileAdd | PatchFileDelete | PatchFileUpdate

export interface ParsedPatch {
  readonly ops: readonly PatchFileOp[]
  /** Codex's selected remote environment, parsed but not routed by dsh. */
  readonly environmentId?: string
  readonly workdir?: string
}

export type ApplyPatchInvocation =
  | { readonly kind: 'invocation'; readonly patch: string; readonly workdir?: string }
  | { readonly kind: 'implicit-invocation' }
  | { readonly kind: 'malformed-invocation' }
  | { readonly kind: 'none' }

const INVOCATION_START =
  /^(?:cd[ \t]+(?:'([^']*)'|"([^"]*)"|([^\s&]+))[ \t]*&&[ \t]*)?(?:apply_patch|apply-patch|applypatch)[ \t]*(<<-?)[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\5[ \t]*$/

export function parseInvocation(script: string): ApplyPatchInvocation {
  const lines = script.split('\n')
  /* v8 ignore next */
  const first = lines[0] ?? ''
  const match = INVOCATION_START.exec(first)
  if (match === null) {
    const trimmed = script.trim()
    return trimmed.startsWith(BEGIN_PATCH_MARKER) && trimmed.endsWith(END_PATCH_MARKER)
      ? { kind: 'implicit-invocation' }
      : { kind: 'none' }
  }
  const [, singleQuotedWorkdir, doubleQuotedWorkdir, bareWorkdir, arrows, , delimiter] = match
  const workdir = singleQuotedWorkdir ?? doubleQuotedWorkdir ?? bareWorkdir
  const stripTabs = arrows === '<<-'
  const body: string[] = []
  let closed = false
  for (const line of lines.slice(1)) {
    if (!closed) {
      const candidate = stripTabs ? line.replace(/^\t+/, '') : line
      if (candidate.trim() === delimiter) {
        closed = true
        continue
      }
      body.push(line)
      continue
    }
    if (line.trim() !== '') return { kind: 'malformed-invocation' }
  }
  if (!closed) return { kind: 'malformed-invocation' }
  const patch = body.join('\n')
  return { kind: 'invocation', patch, ...(workdir !== undefined ? { workdir } : {}) }
}

interface MutableChunk {
  changeContext: string | undefined
  oldLines: string[]
  newLines: string[]
  contextLineIndices: Array<readonly [number, number]>
  endOfFile: boolean
}

type MutableOp =
  | { kind: 'add'; path: string; lines: string[] }
  | { kind: 'delete'; path: string }
  | { kind: 'update'; path: string; moveTo: string | undefined; chunks: MutableChunk[] }

export function parsePatch(text: string): Omit<ParsedPatch, 'workdir'> {
  const lines = text
    .trim()
    .split('\n')
    .map(line => line.replace(/\r$/, ''))
  const first = lines[0]?.trim()
  const last = lines.at(-1)?.trim()
  if (first !== BEGIN_PATCH_MARKER) {
    throw new ApplyPatchError(`invalid patch: The first line of the patch must be '${BEGIN_PATCH_MARKER}'`)
  }
  if (last !== END_PATCH_MARKER) {
    throw new ApplyPatchError(`invalid patch: The last line of the patch must be '${END_PATCH_MARKER}'`)
  }
  const ops: MutableOp[] = []
  type Mode =
    | { kind: 'add'; op: Extract<MutableOp, { kind: 'add' }> }
    | { kind: 'delete'; op: Extract<MutableOp, { kind: 'delete' }> }
    | { kind: 'update'; op: Extract<MutableOp, { kind: 'update' }>; chunk: MutableChunk | undefined }
    | { kind: 'idle' }
  let mode: Mode = { kind: 'idle' }
  let environmentId: string | undefined
  let canReadEnvironmentId = true
  let lineNumber = 1

  const ensureUpdateNotEmpty = (line: string): void => {
    if (mode.kind !== 'update') return
    if (mode.op.chunks.length === 0) {
      throw new ApplyPatchError(
        `invalid hunk at line ${lineNumber}, Update file hunk for path '${mode.op.path}' is empty`,
      )
    }
    const tail = mode.op.chunks.at(-1)
    if (tail !== undefined && tail.oldLines.length === 0 && tail.newLines.length === 0) {
      throw new ApplyPatchError(
        line === END_PATCH_MARKER
          ? `invalid hunk at line ${lineNumber}, Update hunk does not contain any lines`
          : `invalid hunk at line ${lineNumber}, Unexpected line found in update hunk: '${line}'. Every line should start with ' ' (context line), '+' (added line), or '-' (removed line)`,
      )
    }
  }

  for (const line of lines.slice(1, -1)) {
    lineNumber++
    const trimmed = line.trim()
    if (canReadEnvironmentId && mode.kind === 'idle' && trimmed.startsWith(ENVIRONMENT_ID_MARKER)) {
      if (environmentId !== undefined) {
        throw new ApplyPatchError('invalid patch: apply_patch environment_id cannot be specified more than once')
      }
      const value = trimmed.slice(ENVIRONMENT_ID_MARKER.length).trim()
      if (value.length === 0) {
        throw new ApplyPatchError('invalid patch: apply_patch environment_id cannot be empty')
      }
      environmentId = value
      continue
    }
    canReadEnvironmentId = false
    if (trimmed === END_PATCH_MARKER) {
      throw new ApplyPatchError(`invalid patch: The last line of the patch must be '${END_PATCH_MARKER}'`)
    }
    if (trimmed.startsWith(ADD_FILE_MARKER)) {
      ensureUpdateNotEmpty(trimmed)
      const op: Extract<MutableOp, { kind: 'add' }> = {
        kind: 'add',
        path: trimmed.slice(ADD_FILE_MARKER.length),
        lines: [],
      }
      ops.push(op)
      mode = { kind: 'add', op }
      continue
    }
    if (trimmed.startsWith(DELETE_FILE_MARKER)) {
      ensureUpdateNotEmpty(trimmed)
      const op: Extract<MutableOp, { kind: 'delete' }> = {
        kind: 'delete',
        path: trimmed.slice(DELETE_FILE_MARKER.length),
      }
      ops.push(op)
      mode = { kind: 'delete', op }
      continue
    }
    if (trimmed.startsWith(UPDATE_FILE_MARKER)) {
      ensureUpdateNotEmpty(trimmed)
      const op: Extract<MutableOp, { kind: 'update' }> = {
        kind: 'update',
        path: trimmed.slice(UPDATE_FILE_MARKER.length),
        moveTo: undefined,
        chunks: [],
      }
      ops.push(op)
      mode = { kind: 'update', op, chunk: undefined }
      continue
    }
    if (mode.kind === 'add') {
      if (!line.startsWith('+')) {
        throw new ApplyPatchError(
          `invalid hunk at line ${lineNumber}, Invalid file line in Add File hunk: '${line}'. Lines in Add File hunks must start with '+'`,
        )
      }
      mode.op.lines.push(line.slice(1))
      continue
    }
    if (mode.kind === 'delete') {
      throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected line in Delete File hunk: '${line}'`)
    }
    if (mode.kind === 'update') {
      if (trimmed.startsWith(MOVE_TO_MARKER) && mode.op.chunks.length === 0 && mode.chunk === undefined) {
        mode.op.moveTo = trimmed.slice(MOVE_TO_MARKER.length)
        continue
      }
      if (trimmed === EMPTY_CHANGE_CONTEXT_MARKER || trimmed.startsWith(CHANGE_CONTEXT_MARKER)) {
        const chunk: MutableChunk = {
          changeContext:
            trimmed === EMPTY_CHANGE_CONTEXT_MARKER ? undefined : trimmed.slice(CHANGE_CONTEXT_MARKER.length),
          oldLines: [],
          newLines: [],
          contextLineIndices: [],
          endOfFile: false,
        }
        mode.op.chunks.push(chunk)
        mode = { kind: 'update', op: mode.op, chunk }
        continue
      }
      if (trimmed === EOF_MARKER) {
        if (mode.chunk === undefined) {
          throw new ApplyPatchError(
            `invalid hunk at line ${lineNumber}, Unexpected '${EOF_MARKER}' with no change lines in update hunk for '${mode.op.path}'`,
          )
        }
        mode.chunk.endOfFile = true
        continue
      }
      const sigil = line[0]
      if (line === '' || (sigil !== undefined && (sigil === ' ' || sigil === '+' || sigil === '-'))) {
        const text = line === '' ? '' : line.slice(1)
        const chunk: MutableChunk = mode.chunk ?? {
          changeContext: undefined,
          oldLines: [],
          newLines: [],
          contextLineIndices: [],
          endOfFile: false,
        }
        if (mode.chunk === undefined) mode.op.chunks.push(chunk)
        if (line === '' || sigil === ' ') {
          chunk.contextLineIndices.push([chunk.oldLines.length, chunk.newLines.length])
        }
        if (line === '' || sigil !== '+') chunk.oldLines.push(text)
        if (line === '' || sigil !== '-') chunk.newLines.push(text)
        mode = { kind: 'update', op: mode.op, chunk }
        continue
      }
      throw new ApplyPatchError(
        `invalid hunk at line ${lineNumber}, Unexpected line found in update hunk: '${line}'. Every line should start with ' ' (context line), '+' (added line), or '-' (removed line)`,
      )
    }
    throw new ApplyPatchError(`invalid patch: Unexpected line outside any hunk: '${line}'`)
  }
  lineNumber++
  ensureUpdateNotEmpty(END_PATCH_MARKER)
  for (const op of ops) {
    if (op.kind === 'add' && op.lines.length === 0) {
      throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Add file hunk for path '${op.path}' has no lines`)
    }
  }
  return { ops, ...(environmentId !== undefined ? { environmentId } : {}) }
}

/** Parse an invocation and its patch body; throws when either is malformed. */
export function parseInvocationPatch(script: string): ParsedPatch {
  const invocation = parseInvocation(script)
  if (invocation.kind !== 'invocation') {
    throw new ApplyPatchError('apply_patch invocation expected')
  }
  return {
    ...parsePatch(invocation.patch),
    ...(invocation.workdir !== undefined ? { workdir: invocation.workdir } : {}),
  }
}

function normalizeForPass(text: string, pass: number): string {
  if (pass === 0) return text
  if (pass === 1) return text.trimEnd()
  if (pass === 2) return text.trim()
  return text
    .trim()
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '"')
    .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, ' ')
}

/** Match through the four upstream normalization passes. */
export function seekSequence(
  lines: readonly string[],
  pattern: readonly string[],
  start: number,
  eof: boolean,
  updateFileMode: ApplyPatchFileUpdateMode = ApplyPatchFileUpdateMode.NormalizeToLf,
): number | undefined {
  if (pattern.length === 0) return start
  if (pattern.length > lines.length) return undefined
  const eofStart = lines.length - pattern.length
  const searchStart = eof
    ? updateFileMode === ApplyPatchFileUpdateMode.PreserveLineEndings
      ? Math.max(eofStart, start)
      : eofStart
    : start
  for (let pass = 0; pass < 4; pass++) {
    for (let i = searchStart; i + pattern.length <= lines.length; i++) {
      let ok = true
      for (let p = 0; p < pattern.length; p++) {
        /* v8 ignore start */
        const fileLine = lines[i + p] ?? ''
        const patternLine = pattern[p] ?? ''
        /* v8 ignore stop */
        if (normalizeForPass(fileLine, pass) !== normalizeForPass(patternLine, pass)) {
          ok = false
          break
        }
      }
      if (ok) return i
    }
  }
  return undefined
}

interface Replacement {
  readonly start: number
  readonly oldLength: number
  readonly newLines: readonly string[]
}

type LineEnding = '\n' | '\r\n' | '\r'

interface SourceLine {
  readonly text: string
  readonly ending: LineEnding | undefined
}

class SourceFile {
  private constructor(
    private lines: SourceLine[],
    private readonly preferredEnding: LineEnding,
  ) {}

  static parse(contents: string): SourceFile {
    const lines: SourceLine[] = []
    let preferredEnding: LineEnding | undefined
    let lineStart = 0
    let cursor = 0
    while (cursor < contents.length) {
      const code = contents.charCodeAt(cursor)
      let ending: LineEnding | undefined
      let endingLength = 0
      if (code === 13 && contents.charCodeAt(cursor + 1) === 10) {
        ending = '\r\n'
        endingLength = 2
      } else if (code === 13) {
        ending = '\r'
        endingLength = 1
      } else if (code === 10) {
        ending = '\n'
        endingLength = 1
      }
      if (ending === undefined) {
        cursor++
        continue
      }
      preferredEnding ??= ending
      lines.push({ text: contents.slice(lineStart, cursor), ending })
      cursor += endingLength
      lineStart = cursor
    }
    if (lineStart < contents.length) {
      lines.push({ text: contents.slice(lineStart), ending: undefined })
    }
    return new SourceFile(lines, preferredEnding ?? '\n')
  }

  lineTexts(): string[] {
    return this.lines.map(line => line.text)
  }

  applyReplacements(replacements: readonly Replacement[]): void {
    const next: SourceLine[] = []
    let sourceIndex = 0
    for (const replacement of replacements) {
      next.push(...this.lines.slice(sourceIndex, replacement.start))
      next.push(...replacement.newLines.map(text => ({ text, ending: this.preferredEnding })))
      sourceIndex = replacement.start + replacement.oldLength
    }
    next.push(...this.lines.slice(sourceIndex))
    this.lines = next.map(line => ({ ...line, ending: line.ending ?? this.preferredEnding }))
  }

  intoContents(): string {
    return this.lines.map(line => `${line.text}${line.ending!}`).join('')
  }
}

function computeReplacements(
  originalLines: readonly string[],
  path: string,
  chunks: readonly PatchUpdateChunk[],
  updateFileMode: ApplyPatchFileUpdateMode,
): Replacement[] {
  const replacements: Replacement[] = []
  let lineIndex = 0
  for (const chunk of chunks) {
    if (chunk.changeContext !== undefined) {
      const index = seekSequence(originalLines, [chunk.changeContext], lineIndex, false, updateFileMode)
      if (index === undefined) {
        throw new ApplyPatchError(`Failed to find context '${chunk.changeContext}' in ${path}`)
      }
      lineIndex = index + 1
    }
    if (chunk.oldLines.length === 0) {
      const insertionIndex =
        updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf
          ? originalLines.at(-1) === ''
            ? originalLines.length - 1
            : originalLines.length
          : originalLines.length
      replacements.push({ start: insertionIndex, oldLength: 0, newLines: chunk.newLines })
      continue
    }

    let pattern = chunk.oldLines
    let newSlice = chunk.newLines
    let found = seekSequence(originalLines, pattern, lineIndex, chunk.endOfFile, updateFileMode)
    if (found === undefined && pattern.at(-1) === '') {
      pattern = pattern.slice(0, -1)
      if (newSlice.at(-1) === '') newSlice = newSlice.slice(0, -1)
      found = seekSequence(originalLines, pattern, lineIndex, chunk.endOfFile, updateFileMode)
    }
    if (found === undefined) {
      throw new ApplyPatchError(`Failed to find expected lines in ${path}:\n${chunk.oldLines.join('\n')}`)
    }

    if (updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf) {
      replacements.push({ start: found, oldLength: pattern.length, newLines: newSlice })
    } else {
      let oldStart = 0
      let newStart = 0
      for (const [oldContext, newContext] of chunk.contextLineIndices ?? []) {
        if (oldContext >= pattern.length || newContext >= newSlice.length) break
        if (oldStart !== oldContext || newStart !== newContext) {
          replacements.push({
            start: found + oldStart,
            oldLength: oldContext - oldStart,
            newLines: newSlice.slice(newStart, newContext),
          })
        }
        oldStart = oldContext + 1
        newStart = newContext + 1
      }
      if (oldStart !== pattern.length || newStart !== newSlice.length) {
        replacements.push({
          start: found + oldStart,
          oldLength: pattern.length - oldStart,
          newLines: newSlice.slice(newStart),
        })
      }
    }
    lineIndex = found + pattern.length
  }
  replacements.sort((left, right) => left.start - right.start)
  return replacements
}

function applyReplacements(lines: readonly string[], replacements: readonly Replacement[]): string[] {
  const updated = [...lines]
  for (const replacement of [...replacements].reverse()) {
    updated.splice(replacement.start, replacement.oldLength, ...replacement.newLines)
  }
  return updated
}

export function deriveUpdatedContent(
  original: string,
  path: string,
  chunks: readonly PatchUpdateChunk[],
  updateFileMode: ApplyPatchFileUpdateMode = ApplyPatchFileUpdateMode.NormalizeToLf,
): string {
  if (updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf) {
    const originalLines = original.split('\n')
    if (originalLines.at(-1) === '') originalLines.pop()
    const updated = applyReplacements(originalLines, computeReplacements(originalLines, path, chunks, updateFileMode))
    if (updated.at(-1) !== '') updated.push('')
    return updated.join('\n')
  }

  const sourceFile = SourceFile.parse(original)
  sourceFile.applyReplacements(computeReplacements(sourceFile.lineTexts(), path, chunks, updateFileMode))
  return sourceFile.intoContents()
}

export interface ApplyPatchIo {
  readText(path: string, workdir: string): Promise<string>
  writeText(path: string, workdir: string, content: string): Promise<void>
  remove(path: string, workdir: string): Promise<void>
  moveText(from: string, to: string, workdir: string, content: string): Promise<void>
}

export interface ApplyPatchAffected {
  readonly added: readonly string[]
  readonly modified: readonly string[]
  readonly deleted: readonly string[]
}

export async function applyPatch(
  patch: ParsedPatch,
  cwd: string,
  io: ApplyPatchIo,
  updateFileMode: ApplyPatchFileUpdateMode = ApplyPatchFileUpdateMode.NormalizeToLf,
): Promise<ApplyPatchAffected> {
  const effectiveCwd = patch.workdir !== undefined ? resolvePath(cwd, patch.workdir) : cwd
  const seen = new Set<string>()
  for (const op of patch.ops) {
    const identity = resolvePath(effectiveCwd, op.kind === 'update' && op.moveTo !== undefined ? op.moveTo : op.path)
    if (seen.has(identity)) {
      throw new ApplyPatchError(`invalid patch: multiple operations target ${identity}`)
    }
    seen.add(identity)
  }
  if (patch.ops.length === 0) throw new ApplyPatchError('No files were modified.')

  type VerifiedOperation =
    | { readonly kind: 'add'; readonly path: string; readonly content: string }
    | { readonly kind: 'delete'; readonly path: string }
    | { readonly kind: 'update'; readonly path: string; readonly moveTo: string | undefined; readonly content: string }

  const operations: VerifiedOperation[] = []
  const added: string[] = []
  const modified: string[] = []
  const deleted: string[] = []
  for (const op of patch.ops) {
    if (op.kind === 'add') {
      operations.push({ kind: 'add', path: op.path, content: op.lines.map(line => `${line}\n`).join('') })
      added.push(op.path)
      continue
    }
    if (op.kind === 'delete') {
      try {
        await io.readText(op.path, effectiveCwd)
      } catch (error: unknown) {
        throw new ApplyPatchError(`Failed to read ${resolvePath(effectiveCwd, op.path)}: ${String(error)}`)
      }
      operations.push({ kind: 'delete', path: op.path })
      deleted.push(op.path)
      continue
    }
    let original: string
    try {
      original = await io.readText(op.path, effectiveCwd)
    } catch (error: unknown) {
      throw new ApplyPatchError(`Failed to read file to update ${op.path}: ${String(error)}`)
    }
    operations.push({
      kind: 'update',
      path: op.path,
      moveTo: op.moveTo,
      content: deriveUpdatedContent(original, op.path, op.chunks, updateFileMode),
    })
    modified.push(op.moveTo ?? op.path)
  }

  for (const operation of operations) {
    if (operation.kind === 'add') {
      await io.writeText(operation.path, effectiveCwd, operation.content)
      continue
    }
    if (operation.kind === 'delete') {
      await io.remove(operation.path, effectiveCwd)
      continue
    }
    if (operation.moveTo !== undefined) {
      await io.moveText(operation.path, operation.moveTo, effectiveCwd, operation.content)
      continue
    }
    await io.writeText(operation.path, effectiveCwd, operation.content)
  }
  return { added, modified, deleted }
}

export function formatSummary(affected: ApplyPatchAffected): string {
  const lines = ['Success. Updated the following files:']
  for (const path of affected.added) lines.push(`A ${path}`)
  for (const path of affected.modified) lines.push(`M ${path}`)
  for (const path of affected.deleted) lines.push(`D ${path}`)
  return lines.join('\n')
}
