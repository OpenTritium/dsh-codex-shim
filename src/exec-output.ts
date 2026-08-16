/**
 * Codex unified-exec output vocabulary: the canonical value one exec call
 * returns, the approximate token accounting, and the `response_text` layout
 * upstream `ExecCommandToolOutput` renders.
 * @module @opentritium/dsh-codex-shim/exec-output
 */

import { randomBytes } from 'node:crypto'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

/**
 * Canonical outcome of one `exec_command`/`write_stdin` call, mirroring
 * upstream's declared output schema (`chunk_id`, `wall_time_seconds`,
 * `exit_code`, `session_id`, `original_token_count`, `output`).
 */
export interface CodexExecValue {
  /** Chunk identifier for this response; upstream emits one per poll result. */
  chunkId?: string
  /** Elapsed wall time spent waiting for output, in seconds. */
  wallTimeSeconds: number
  /** Process exit code when the command finished during this call. */
  exitCode?: number
  /** Numeric session id to pass back through `write_stdin` while running. */
  sessionId?: number
  /** Approximate token count before output truncation. */
  originalTokenCount?: number
  /** Command output text, possibly truncated in the middle. */
  output: string
}

/** Characters per token in upstream's approximate accounting. */
const APPROX_BYTES_PER_TOKEN = 4

/** Default output token budget, matching upstream's 10000-token default. */
export const DEFAULT_MAX_OUTPUT_TOKENS = 10_000

/** Upstream's 1 MiB unified-exec collection ceiling at four bytes per token. */
export const MAX_OUTPUT_TOKENS = (1024 * 1024) / APPROX_BYTES_PER_TOKEN

/**
 * Approximate the token count of one output text the way upstream's
 * `approx_token_count` does — length over four, rounded up.
 * @param text - the output text.
 * @returns the approximate token count.
 */
export function approxTokenCount(text: string): number {
  return Math.ceil(Buffer.byteLength(text) / APPROX_BYTES_PER_TOKEN)
}

/**
 * Mint a chunk identifier, opaque to the model.
 * @returns a short random hex identifier.
 */
export function newChunkId(): string {
  return randomBytes(3).toString('hex')
}

/**
 * Validate and cap a model-supplied output budget.
 * @param requested - the optional `max_output_tokens` argument.
 * @returns the defaulted budget, capped at the unified-exec collection limit.
 */
export function resolveMaxOutputTokens(requested: number | undefined): number {
  if (requested === undefined) return DEFAULT_MAX_OUTPUT_TOKENS
  if (!Number.isSafeInteger(requested) || requested < 0) {
    throw new Error('invalid max_output_tokens: expected a non-negative integer')
  }
  return Math.min(requested, MAX_OUTPUT_TOKENS)
}

/** Return the longest prefix whose UTF-8 encoding fits one byte budget. */
function prefixWithinBytes(text: string, budget: number): string {
  let bytes = 0
  let prefix = ''
  for (const character of text) {
    const width = Buffer.byteLength(character)
    if (bytes + width > budget) break
    prefix += character
    bytes += width
  }
  return prefix
}

/** Return the longest suffix whose UTF-8 encoding fits one byte budget. */
function suffixWithinBytes(text: string, budget: number): string {
  let bytes = 0
  const suffix: string[] = []
  const characters = Array.from(text)
  for (let index = characters.length - 1; index >= 0; index -= 1) {
    const character = characters[index]
    if (character === undefined) continue
    const width = Buffer.byteLength(character)
    if (bytes + width > budget) break
    suffix.push(character)
    bytes += width
  }
  return suffix.reverse().join('')
}

/**
 * Bound one output to its token budget, preserving its UTF-8 prefix and suffix
 * around upstream's omission marker.
 * @param output - the full captured output.
 * @param maxTokens - the caller's output token budget.
 * @returns the bounded output and the pre-truncation token count when
 *   truncation happened.
 */
export function truncateOutput(output: string, maxTokens: number): { output: string; originalTokenCount?: number } {
  const budget = resolveMaxOutputTokens(maxTokens)
  const originalTokenCount = approxTokenCount(output)
  if (originalTokenCount <= budget) return { output }
  const maxBytes = budget * APPROX_BYTES_PER_TOKEN
  const leftBytes = Math.floor(maxBytes / 2)
  const rightBytes = maxBytes - leftBytes
  const omittedTokens = Math.ceil((Buffer.byteLength(output) - maxBytes) / APPROX_BYTES_PER_TOKEN)
  return {
    output: `${prefixWithinBytes(output, leftBytes)}…${omittedTokens} tokens truncated…${suffixWithinBytes(output, rightBytes)}`,
    originalTokenCount,
  }
}

/**
 * Render one canonical value as the model-facing text, section-joined exactly
 * like upstream's `response_text`.
 * @param value - the canonical exec outcome.
 * @returns the response text block list.
 */
export function renderExecOutput(value: CodexExecValue): ContentBlock[] {
  const sections: string[] = []
  if (value.chunkId !== undefined) sections.push(`Chunk ID: ${value.chunkId}`)
  sections.push(`Wall time: ${value.wallTimeSeconds.toFixed(4)} seconds`)
  if (value.exitCode !== undefined) sections.push(`Process exited with code ${value.exitCode}`)
  if (value.sessionId !== undefined) sections.push(`Process running with session ID ${value.sessionId}`)
  if (value.originalTokenCount !== undefined) sections.push(`Original token count: ${value.originalTokenCount}`)
  sections.push('Output:')
  sections.push(value.output)
  return [{ type: 'text', text: sections.join('\n') }]
}
