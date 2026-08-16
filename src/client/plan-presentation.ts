/** Defensive parsing for the model-produced update_plan argument JSON. */

export type PlanStatus = 'pending' | 'in_progress' | 'completed'

export interface PlanItemPresentation {
  step: string
  status: PlanStatus
}

export interface PlanPresentation {
  explanation?: string
  items: PlanItemPresentation[]
}

/**
 * Keep only steps whose status changed since the preceding plan update.
 * When no status changed, retain the complete plan so an idempotent update
 * still has useful content in its expanded row.
 *
 * @param current - items from the current update.
 * @param previous - items from the preceding update, when available.
 * @returns the steps relevant to this update.
 */
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

function planStatus(value: unknown): PlanStatus | undefined {
  return value === 'pending' || value === 'in_progress' || value === 'completed' ? value : undefined
}

/**
 * Parse a complete `update_plan` argument object for structured presentation.
 * Invalid or incomplete model JSON returns undefined so the caller can retain
 * the generic raw representation rather than hiding model-visible content.
 *
 * @param argsRaw - raw tool arguments emitted by the model.
 * @returns display-ready plan data, or undefined when it is not trustworthy.
 */
export function parsePlanPresentation(argsRaw: string): PlanPresentation | undefined {
  try {
    const args = objectValue(JSON.parse(argsRaw))
    if (args === undefined || !Array.isArray(args.plan)) return undefined
    const items: PlanItemPresentation[] = []
    for (const candidate of args.plan) {
      const item = objectValue(candidate)
      const step = typeof item?.step === 'string' ? item.step.trim() : ''
      const status = planStatus(item?.status)
      if (step === '' || status === undefined) return undefined
      items.push({ step, status })
    }
    const explanation = typeof args.explanation === 'string' ? args.explanation.trim() : ''
    return { items, ...(explanation === '' ? {} : { explanation }) }
  } catch {
    return undefined
  }
}
