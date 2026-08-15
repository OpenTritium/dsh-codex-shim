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

/** Patch marker starting the patch body. */
const BEGIN_PATCH_MARKER = '*** Begin Patch'
/** Patch marker ending the patch body. */
const END_PATCH_MARKER = '*** End Patch'
/** Marker prefix introducing an added file. */
const ADD_FILE_MARKER = '*** Add File: '
/** Marker prefix introducing a deleted file. */
const DELETE_FILE_MARKER = '*** Delete File: '
/** Marker prefix introducing an updated file. */
const UPDATE_FILE_MARKER = '*** Update File: '
/** Marker prefix introducing the rename target inside an update hunk. */
const MOVE_TO_MARKER = '*** Move to: '
/** Marker anchoring one update chunk at end of file. */
const EOF_MARKER = '*** End of File'
/** Marker prefix carrying one chunk's single context locator line. */
const CHANGE_CONTEXT_MARKER = '@@ '
/** The same marker without a locator text. */
const EMPTY_CHANGE_CONTEXT_MARKER = '@@'
/** Marker selecting one Codex remote environment. */
const ENVIRONMENT_ID_MARKER = '*** Environment ID:'

/**
 * Parse or apply failure with the wording upstream apply-patch reports. The
 * consumer renders `apply_patch verification failed: {message}` around it.
 */
export class ApplyPatchError extends Error {
  /**
   * @param message - upstream-worded failure detail.
   */
  constructor(message: string) {
    super(message)
    this.name = 'ApplyPatchError'
  }
}

/** File-update mode supported by the upstream apply-patch engine. */
export const ApplyPatchFileUpdateMode = {
  NormalizeToLf: 'normalize-to-lf',
  PreserveLineEndings: 'preserve-line-endings',
} as const

/** One file-update mode supported by the upstream apply-patch engine. */
export type ApplyPatchFileUpdateMode = typeof ApplyPatchFileUpdateMode[keyof typeof ApplyPatchFileUpdateMode]

/** One replacement block inside an update hunk. */
export interface PatchUpdateChunk {
  /** Single locator line from `@@ text`, absent for a bare `@@` or no header. */
  readonly changeContext: string | undefined
  /** Old-side lines: removed lines plus context lines, in order. */
  readonly oldLines: readonly string[]
  /** New-side lines: added lines plus context lines, in order. */
  readonly newLines: readonly string[]
  /** Paired old/new indices that came from explicit context lines. */
  readonly contextLineIndices?: readonly (readonly [number, number])[]
  /** Whether `*** End of File` anchored this chunk at the file tail. */
  readonly endOfFile: boolean
}

/** Hunk creating a file with the given content lines. */
export interface PatchFileAdd {
  readonly kind: 'add'
  /** Path as written in the patch, relative to the patch's working directory. */
  readonly path: string
  /** Content lines, each a full line of the new file. */
  readonly lines: readonly string[]
}

/** Hunk deleting a file. */
export interface PatchFileDelete {
  readonly kind: 'delete'
  /** Path as written in the patch. */
  readonly path: string
}

/** Hunk updating and optionally renaming a file. */
export interface PatchFileUpdate {
  readonly kind: 'update'
  /** Source path as written in the patch. */
  readonly path: string
  /** Rename destination from `*** Move to:`, when present. */
  readonly moveTo: string | undefined
  /** Ordered replacement chunks. */
  readonly chunks: readonly PatchUpdateChunk[]
}

/** One parsed hunk. */
export type PatchFileOp = PatchFileAdd | PatchFileDelete | PatchFileUpdate

/** A fully parsed patch body. */
export interface ParsedPatch {
  /** Hunks in patch order. */
  readonly ops: readonly PatchFileOp[]
  /** Codex's selected remote environment, parsed but not routed by dsh. */
  readonly environmentId?: string
  /** Working directory from a `cd <dir> &&` invocation prefix, when present. */
  readonly workdir?: string
}

/**
 * Classify a shell script against the apply_patch invocation forms. Accepted
 * forms accept the upstream `apply_patch` and `applypatch` spellings plus the
 * common `apply-patch` executable spelling. The whole script is one command
 * with a heredoc, optionally behind one `cd <dir> &&`. A patch
 * body embedded in a larger script is NOT an invocation — upstream runs it in
 * the shell, which is exactly the `apply_patch: command not found` failure
 * this engine exists to intercept in its strict forms only.
 */
export type ApplyPatchInvocation =
  | { readonly kind: 'invocation'; readonly patch: string; readonly workdir?: string }
  | { readonly kind: 'implicit-invocation' }
  | { readonly kind: 'malformed-invocation' }
  | { readonly kind: 'none' }

/** Strict heredoc invocation: optional one-argument `cd <dir> &&`, then the command. */
const INVOCATION_START
  = /^(?:cd[ \t]+(?:'([^']*)'|"([^"]*)"|([^\s&]+))[ \t]*&&[ \t]*)?(?:apply_patch|apply-patch|applypatch)[ \t]*(<<-?)[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\5[ \t]*$/

/**
 * Detect an apply-patch heredoc invocation in a shell script. A script
 * that is itself a bare patch body reports {@link ApplyPatchInvocation} kind
 * `implicit-invocation` (upstream rejects it with a rerun instruction); a
 * script starting with `apply_patch` whose heredoc does not parse reports
 * `malformed-invocation`; everything else reports `none`.
 * @param script - the whole shell command text.
 * @returns the invocation classification.
 */
export function parseInvocation(script: string): ApplyPatchInvocation {
  const lines = script.split('\n')
  // split('\n') always yields at least one element; the fallback only satisfies the indexer.
  /* v8 ignore next */
  const first = lines[0] ?? ''
  const match = INVOCATION_START.exec(first)
  if (match === null) {
    // A bare patch body typed as the command is the known misuse upstream
    // answers with the explicit rerun instruction.
    return looksLikePatchBody(script) ? { kind: 'implicit-invocation' } : { kind: 'none' }
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
    // After the closing delimiter only trailing whitespace may remain.
    if (line.trim() !== '') return { kind: 'malformed-invocation' }
  }
  if (!closed) return { kind: 'malformed-invocation' }
  const patch = body.join('\n')
  return {
    kind: 'invocation',
    patch,
    ...workdir !== undefined ? { workdir } : {},
  }
}

/**
 * Whether a text starts and ends with the patch boundary markers.
 * @param text - candidate patch body.
 * @returns true when the boundary markers are present.
 */
function looksLikePatchBody(text: string): boolean {
  const trimmed = text.trim()
  return trimmed.startsWith(BEGIN_PATCH_MARKER) && trimmed.endsWith(END_PATCH_MARKER)
}

/** Builder-side mutable chunk shape; frozen on return. */
interface MutableChunk {
  changeContext: string | undefined
  oldLines: string[]
  newLines: string[]
  contextLineIndices: Array<readonly [number, number]>
  endOfFile: boolean
}

/** Builder-side mutable hunk shapes; frozen on return. */
type MutableOp =
  | { kind: 'add'; path: string; lines: string[] }
  | { kind: 'delete'; path: string }
  | { kind: 'update'; path: string; moveTo: string | undefined; chunks: MutableChunk[] }

/**
 * Parse a patch body between its boundary markers into hunks.
 * @param text - the patch body (`*** Begin Patch` … `*** End Patch`).
 * @returns the parsed hunks without a working directory.
 * @throws ApplyPatchError with upstream wording on malformed patches.
 */
export function parsePatch(text: string): Omit<ParsedPatch, 'workdir'> {
  const lines = text.trim().split('\n').map(line => line.replace(/\r$/, ''))
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
  /** Current body line's 1-based position in the whole patch text. */
  let lineNumber = 1

  /**
   * Reject an update hunk whose last chunk carries no lines, mirroring
   * upstream's two empty-hunk diagnostics.
   * @param line - the line about to be handled.
   */
  const ensureUpdateNotEmpty = (line: string): void => {
    if (mode.kind !== 'update') return
    if (mode.op.chunks.length === 0) {
      throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Update file hunk for path '${mode.op.path}' is empty`)
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
      const op: Extract<MutableOp, { kind: 'add' }> = { kind: 'add', path: trimmed.slice(ADD_FILE_MARKER.length), lines: [] }
      ops.push(op)
      mode = { kind: 'add', op }
      continue
    }
    if (trimmed.startsWith(DELETE_FILE_MARKER)) {
      ensureUpdateNotEmpty(trimmed)
      const op: Extract<MutableOp, { kind: 'delete' }> = { kind: 'delete', path: trimmed.slice(DELETE_FILE_MARKER.length) }
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
        throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Invalid file line in Add File hunk: '${line}'. Lines in Add File hunks must start with '+'`)
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
          changeContext: trimmed === EMPTY_CHANGE_CONTEXT_MARKER
            ? undefined
            : trimmed.slice(CHANGE_CONTEXT_MARKER.length),
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
          throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected '${EOF_MARKER}' with no change lines in update hunk for '${mode.op.path}'`)
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
      throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected line found in update hunk: '${line}'. Every line should start with ' ' (context line), '+' (added line), or '-' (removed line)`)
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
  return {
    ops,
    ...environmentId !== undefined ? { environmentId } : {},
  }
}

/**
 * Parse an invocation and its patch body in one step.
 * @param script - the whole shell command text.
 * @returns the parsed patch for an `invocation` result.
 * @throws ApplyPatchError when the invocation's patch body does not parse.
 */
export function parseInvocationPatch(script: string): ParsedPatch {
  const invocation = parseInvocation(script)
  if (invocation.kind !== 'invocation') {
    throw new ApplyPatchError('apply_patch invocation expected')
  }
  return { ...parsePatch(invocation.patch), ...invocation.workdir !== undefined ? { workdir: invocation.workdir } : {} }
}

/**
 * Normalize one line for a matching pass.
 * @param text - the raw line.
 * @param pass - matching strictness; 0 exact, 1 trim-end, 2 trim-both, 3 punctuation-normalized.
 * @returns the normalized comparison text.
 */
function normalizeForPass(text: string, pass: number): string {
  if (pass === 0) return text
  if (pass === 1) return text.trimEnd()
  if (pass === 2) return text.trim()
  return text.trim().replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/[\u2018-\u201B]/g, "'")
    .replace(/[\u201C-\u201F]/g, '"')
    .replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, ' ')
}

/**
 * Find `pattern` inside `lines` at or after `start`, four passes of decreasing
 * strictness (exact, trailing-whitespace, full trim, Unicode punctuation), the
 * upstream seek_sequence port. An end-of-file pattern first tries the file
 * tail.
 * @param lines - the file's lines.
 * @param pattern - the lines to locate.
 * @param start - first candidate index.
 * @param eof - whether the pattern anchors at end of file.
 * @returns the match start index, or undefined when no pass matches.
 */
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
        // Both indices are bounds-checked by the surrounding loops; the fallbacks only satisfy the indexer.
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
    this.lines = next.map(line => ({
      ...line,
      ending: line.ending ?? this.preferredEnding,
    }))
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
      const insertionIndex = updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf
        ? originalLines.at(-1) === '' ? originalLines.length - 1 : originalLines.length
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

/**
 * Derive a file's post-patch content from its original content.
 * @param original - the file's current full text.
 * @param path - display path for error wording.
 * @param chunks - the hunk's ordered chunks.
 * @param updateFileMode - whether to normalize or retain source line endings.
 * @returns the new full text in the selected upstream mode.
 * @throws ApplyPatchError with upstream wording when a chunk does not match.
 */
export function deriveUpdatedContent(
  original: string,
  path: string,
  chunks: readonly PatchUpdateChunk[],
  updateFileMode: ApplyPatchFileUpdateMode = ApplyPatchFileUpdateMode.NormalizeToLf,
): string {
  if (updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf) {
    const originalLines = original.split('\n')
    if (originalLines.at(-1) === '') originalLines.pop()
    const updated = applyReplacements(
      originalLines,
      computeReplacements(originalLines, path, chunks, updateFileMode),
    )
    if (updated.at(-1) !== '') updated.push('')
    return updated.join('\n')
  }

  const sourceFile = SourceFile.parse(original)
  sourceFile.applyReplacements(
    computeReplacements(sourceFile.lineTexts(), path, chunks, updateFileMode),
  )
  return sourceFile.intoContents()
}

/** File operations the applier needs; consumers bind them to their capabilities. */
export interface ApplyPatchIo {
  /**
   * Read one file's full text.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   * @returns the file's current content.
   */
  readText(path: string, workdir: string): Promise<string>
  /**
   * Create or replace one file's full text.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   * @param content - the complete new content.
   */
  writeText(path: string, workdir: string, content: string): Promise<void>
  /**
   * Delete one file.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   */
  remove(path: string, workdir: string): Promise<void>
  /**
   * Write a renamed file and remove its source in that order.
   * @param from - source path as written in the patch.
   * @param to - destination path from `*** Move to:`.
   * @param workdir - working directory for relative paths.
   * @param content - the complete replacement content written to `to`.
   */
  moveText(from: string, to: string, workdir: string, content: string): Promise<void>
}

/** Paths touched by one applied patch, in patch order per category. */
export interface ApplyPatchAffected {
  /** Created files. */
  readonly added: readonly string[]
  /** Modified (and optionally renamed) files. */
  readonly modified: readonly string[]
  /** Deleted files. */
  readonly deleted: readonly string[]
}

/**
 * Apply one parsed patch through the injected IO.
 * @param patch - the parsed patch.
 * @param cwd - the session working directory the patch resolves against.
 * @param io - consumer-bound file operations.
 * @returns the affected paths, as written in the patch.
 * @throws ApplyPatchError with upstream wording on unresolvable hunks.
 */
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

/**
 * Format the git-style success summary upstream prints after applying.
 * @param affected - the affected paths.
 * @returns the `Success. Updated the following files:` summary text.
 */
export function formatSummary(affected: ApplyPatchAffected): string {
  const lines = ['Success. Updated the following files:']
  for (const path of affected.added) lines.push(`A ${path}`)
  for (const path of affected.modified) lines.push(`M ${path}`)
  for (const path of affected.deleted) lines.push(`D ${path}`)
  return lines.join('\n')
}
