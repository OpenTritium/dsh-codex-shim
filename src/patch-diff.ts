import type { FileDiff } from '@deepseek-ai/dsh-tools'

export function computeHunkDiffs(path: string, before: string, after: string): FileDiff[] {
  if (before === after) return []
  return [{ path, oldText: before.length === 0 ? null : before, newText: after }]
}

export function diffsFromMeta(meta: unknown): FileDiff[] | undefined {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return undefined
  const value = (meta as Record<string, unknown>).diffs
  if (!Array.isArray(value) || value.length === 0) return undefined
  return value.every((entry): entry is FileDiff => {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return false
    const { path, oldText, newText } = entry as Record<string, unknown>
    return typeof path === 'string' && (oldText === null || typeof oldText === 'string') && typeof newText === 'string'
  })
    ? value
    : undefined
}
