export type PlanStatus = 'pending' | 'in_progress' | 'completed'

export interface PlanItemPresentation {
  step: string
  status: PlanStatus
}

export interface PlanPresentation {
  explanation?: string
  items: PlanItemPresentation[]
}

/** Keep changed steps; retain the full plan when an update is idempotent. */
export function changedPlanItems(
  current: readonly PlanItemPresentation[],
  previous: readonly PlanItemPresentation[] | undefined,
): PlanItemPresentation[] {
  if (previous === undefined) return [...current]
  const previousStatuses = new Map(previous.map(item => [item.step, item.status]))
  const changed = current.filter(item => previousStatuses.get(item.step) !== item.status)
  return changed.length === 0 ? [...current] : changed
}

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** Parse model JSON without hiding malformed input from the generic row. */
export function parsePlanPresentation(argsRaw: string): PlanPresentation | undefined {
  try {
    const args = objectValue(JSON.parse(argsRaw))
    if (args === undefined || !Array.isArray(args.plan)) return undefined
    const items: PlanItemPresentation[] = []
    for (const candidate of args.plan) {
      const item = objectValue(candidate)
      const step = typeof item?.step === 'string' ? item.step.trim() : ''
      const status =
        item?.status === 'pending' || item?.status === 'in_progress' || item?.status === 'completed'
          ? item.status
          : undefined
      if (step === '' || status === undefined) return undefined
      items.push({ step, status })
    }
    const explanation = typeof args.explanation === 'string' ? args.explanation.trim() : ''
    return { items, ...(explanation === '' ? {} : { explanation }) }
  } catch {
    return undefined
  }
}
