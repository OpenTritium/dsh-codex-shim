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
