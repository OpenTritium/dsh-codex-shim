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

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
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
    return { items, ...explanation === '' ? {} : { explanation } }
  } catch {
    return undefined
  }
}
