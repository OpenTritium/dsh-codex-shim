import { randomBytes } from 'node:crypto'
import type { ContentBlock } from '@deepseek-ai/dsh-llm'

export interface CodexExecValue {
  chunkId?: string
  wallTimeSeconds: number
  exitCode?: number
  sessionId?: number
  originalTokenCount?: number
  output: string
}

const APPROX_BYTES_PER_TOKEN = 4

export const DEFAULT_MAX_OUTPUT_TOKENS = 10_000

export const MAX_OUTPUT_TOKENS = (1024 * 1024) / APPROX_BYTES_PER_TOKEN

export function approxTokenCount(text: string): number {
  return Math.ceil(Buffer.byteLength(text) / APPROX_BYTES_PER_TOKEN)
}

export function newChunkId(): string {
  return randomBytes(3).toString('hex')
}

export function resolveMaxOutputTokens(requested: number | undefined): number {
  if (requested === undefined) return DEFAULT_MAX_OUTPUT_TOKENS
  if (!Number.isSafeInteger(requested) || requested < 0) {
    throw new Error('invalid max_output_tokens: expected a non-negative integer')
  }
  return Math.min(requested, MAX_OUTPUT_TOKENS)
}

function prefixWithinBytes(text: string, budget: number): string {
  let end = 0
  let bytes = 0
  while (end < text.length) {
    const codePoint = text.codePointAt(end)
    if (codePoint === undefined) break
    const width = utf8Width(codePoint)
    if (bytes + width > budget) break
    end += codePoint > 0xffff ? 2 : 1
    bytes += width
  }
  return text.slice(0, end)
}

function suffixWithinBytes(text: string, budget: number): string {
  let bytes = 0
  let start = text.length
  while (start > 0) {
    const codeUnit = text.charCodeAt(start - 1)
    const isSurrogatePair = codeUnit >= 0xdc00 && codeUnit <= 0xdfff && start > 1
    const pairStart =
      isSurrogatePair && text.charCodeAt(start - 2) >= 0xd800 && text.charCodeAt(start - 2) <= 0xdbff
        ? start - 2
        : start - 1
    const codePoint = text.codePointAt(pairStart)
    if (codePoint === undefined) break
    const width = utf8Width(codePoint)
    if (bytes + width > budget) break
    start = pairStart
    bytes += width
  }
  return text.slice(start)
}

function utf8Width(codePoint: number): number {
  if (codePoint <= 0x7f) return 1
  if (codePoint <= 0x7ff) return 2
  if (codePoint <= 0xffff) return 3
  return 4
}

export function truncateOutput(output: string, maxTokens: number): { output: string; originalTokenCount?: number } {
  const budget = resolveMaxOutputTokens(maxTokens)
  const outputBytes = Buffer.byteLength(output)
  const originalTokenCount = Math.ceil(outputBytes / APPROX_BYTES_PER_TOKEN)
  if (originalTokenCount <= budget) return { output }
  const maxBytes = budget * APPROX_BYTES_PER_TOKEN
  const leftBytes = Math.floor(maxBytes / 2)
  const rightBytes = maxBytes - leftBytes
  const omittedTokens = Math.ceil((outputBytes - maxBytes) / APPROX_BYTES_PER_TOKEN)
  return {
    output: `${prefixWithinBytes(output, leftBytes)}…${omittedTokens} tokens truncated…${suffixWithinBytes(output, rightBytes)}`,
    originalTokenCount,
  }
}

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
