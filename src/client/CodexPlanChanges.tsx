import { useId, type ReactNode } from 'react'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import {
  changedPlanItems,
  parsePlanPresentation,
  type PlanItemPresentation,
  type PlanPresentation,
  type PlanStatus,
} from './plan-presentation.ts'
import css from './CodexToolRow.module.css'

interface Props {
  block: ToolCallBlock
  plan: PlanPresentation
  t: PropsLocale<'codex'>['t']
  useSession: ToolCallViewProps['useSession']
}

function CompletedGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.planCompletedIcon}>
      <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" />
      <path
        d="M10.9631 5.71411L7.70154 8.97571C7.48011 9.19714 7.27736 9.40099 7.09229 9.54993C6.89742 9.70669 6.66314 9.85279 6.3634 9.90027C6.2049 9.92534 6.04339 9.92534 5.88489 9.90027C5.58515 9.85279 5.35087 9.70669 5.15601 9.54993C4.97093 9.40099 4.76818 9.19714 4.54675 8.97571L3.03516 7.46411L3.96313 6.53613L5.47473 8.04773C5.7169 8.28989 5.86196 8.43389 5.97888 8.52795C6.08597 8.61409 6.10875 8.60701 6.08997 8.604C6.11259 8.60758 6.13571 8.60758 6.15833 8.604C6.13954 8.60701 6.16232 8.61409 6.26941 8.52795C6.38633 8.43389 6.53139 8.28989 6.77356 8.04773L10.0352 4.78613L10.9631 5.71411Z"
        fill="currentColor"
      />
    </svg>
  )
}

function ProgressGlyph() {
  const gradientId = useId()
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.planLoadingIcon}>
      <defs>
        <linearGradient id={gradientId} x1="2.5" y1="12" x2="10.5" y2="3.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="currentColor" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="7" cy="7" r="6.4" stroke={`url(#${gradientId})`} strokeWidth="1.2" />
    </svg>
  )
}

function PendingGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true" className={css.planPendingIcon}>
      <circle cx="7" cy="7" r="6.4" stroke="currentColor" strokeWidth="1.2" strokeDasharray="2.4 2.4" />
    </svg>
  )
}

function planStatusIcon(status: PlanStatus): ReactNode {
  switch (status) {
    case 'completed':
      return <CompletedGlyph />
    case 'in_progress':
      return <ProgressGlyph />
    case 'pending':
      return <PendingGlyph />
  }
}

function planStatusLabel(status: PlanStatus, t: Props['t']): string {
  switch (status) {
    case 'completed':
      return t('row.planCompleted')
    case 'in_progress':
      return t('row.planInProgress')
    case 'pending':
      return t('row.planPending')
  }
}

interface PlanOccurrence {
  callId: string
  items: PlanItemPresentation[]
}

function collectPlanOccurrences(snapshot: ConversationSnapshot): PlanOccurrence[] {
  const occurrences: PlanOccurrence[] = []
  const seen = new Set<string>()
  const visit = (candidate: ToolCallBlock): void => {
    if (seen.has(candidate.callId)) return
    seen.add(candidate.callId)
    const name = 'kind' in candidate ? candidate.call?.name : candidate.name
    const argsRaw = 'kind' in candidate ? (candidate.call?.argsRaw ?? '') : candidate.argsRaw
    if (name === 'update_plan') {
      const plan = parsePlanPresentation(argsRaw)
      if (plan !== undefined) occurrences.push({ callId: candidate.callId, items: plan.items })
    }
    for (const child of candidate.subCalls) visit(child)
  }
  for (const node of snapshot.nodes) {
    if (node.kind === 'tool-result') visit(node)
  }
  for (const call of snapshot.runningCalls) visit(call)
  return occurrences
}

function relevantPlanItems(
  snapshot: ConversationSnapshot,
  callId: string,
  current: PlanPresentation,
): PlanItemPresentation[] {
  const occurrences = collectPlanOccurrences(snapshot)
  const index = occurrences.findIndex(item => item.callId === callId)
  return changedPlanItems(current.items, index > 0 ? occurrences[index - 1]?.items : undefined)
}

export function CodexPlanChanges({ block, plan, t, useSession }: Props) {
  const items = useSession(snapshot => relevantPlanItems(snapshot, block.callId, plan))
  return (
    <section className={css.planCard} aria-label={t('row.plan')}>
      <span className={css.ioLabel}>{t('row.plan')}</span>
      <div className={css.planContent}>
        <ol className={css.planItems}>
          {items.map((item, index) => (
            <li className={css.planItem} data-status={item.status} key={`${item.step}:${index}`}>
              <span className={css.planStatusIcon} aria-label={planStatusLabel(item.status, t)}>
                {planStatusIcon(item.status)}
              </span>
              <span className={css.planStep}>{item.step}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
