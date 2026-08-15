import { useState, type ReactNode } from 'react'
import {
  DiffBlock,
  DisclosureRow,
  IconApiOutline14,
  IconBrowseOutline16,
  IconChecklistOutline14,
  IconEditOutline16,
  IconInspectOutline12,
  IconSparkle16,
  StateDot,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { DiffHunk } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import css from './CodexToolRow.module.css'

type CodexToolRowProps = ToolCallViewProps & PropsLocale<'codex'>
type CodexRowState = 'running' | 'ok' | 'error' | 'stopped'

function firstLine(value: string): string {
  const newline = value.indexOf('\n')
  return newline === -1 ? value : value.slice(0, newline)
}

function argsOf(block: ToolCallBlock): string {
  return 'kind' in block ? block.call?.argsRaw ?? '' : block.argsRaw
}

function resultText(block: ToolCallBlock): string | null {
  if (!('kind' in block)) return null
  const parts = block.content.map(item => item.type === 'text' ? item.text : JSON.stringify(item, null, 2))
  if (parts.length === 0 && block.error !== undefined) {
    parts.push(`${block.error.name}: ${block.error.code}`)
  }
  return parts.join('\n') || null
}

function patchDiffs(block: ToolCallBlock): DiffHunk[] | null {
  if (!('kind' in block)) {
    return block.callView?.card === 'diff' ? block.callView.diffs : null
  }
  return block.resultView?.card === 'diff' ? block.resultView.diffs : null
}

function contentLineCount(text: string | null): number {
  if (text === null || text === '') return 0
  const body = text.endsWith('\n') ? text.slice(0, -1) : text
  return body.split('\n').length
}

function patchSummary(diffs: readonly DiffHunk[]): string {
  const paths = [...new Set(diffs.map(diff => diff.path))]
  const scope = paths.length <= 2 ? paths.join(', ') : `${paths.slice(0, 2).join(', ')} +${paths.length - 2}`
  const added = diffs.reduce((total, diff) => total + contentLineCount(diff.newText), 0)
  const removed = diffs.reduce((total, diff) => total + contentLineCount(diff.oldText), 0)
  return `${scope} · +${added} -${removed}`
}

function rowState(block: ToolCallBlock): CodexRowState {
  if (!('kind' in block)) return 'running'
  if (block.error?.code === 'interrupted') return 'stopped'
  return block.isError ? 'error' : 'ok'
}

function objectArgs(argsRaw: string): Record<string, unknown> | undefined {
  try {
    const value: unknown = JSON.parse(argsRaw)
    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? value as Record<string, unknown>
      : undefined
  } catch {
    return undefined
  }
}

function stringArg(args: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = args?.[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

function iconName(toolName: string): string {
  switch (toolName) {
    case 'exec_command':
    case 'write_stdin': return 'bash'
    case 'apply_patch': return 'edit'
    case 'view_image': return 'read'
    case 'update_plan': return 'checklist'
    default: return 'other'
  }
}

function iconFor(toolName: string): ReactNode {
  switch (toolName) {
    case 'exec_command':
    case 'write_stdin': return <IconApiOutline14 size={14} />
    case 'apply_patch': return <IconEditOutline16 size={14} />
    case 'view_image': return <IconBrowseOutline16 size={14} />
    case 'update_plan': return <IconChecklistOutline14 size={14} />
    default: return <IconSparkle16 size={14} />
  }
}

function titleKey(toolName: string): 'row.execCommand' | 'row.writeStdin' | 'row.applyPatch' | 'row.viewImage' | 'row.updatePlan' {
  switch (toolName) {
    case 'exec_command': return 'row.execCommand'
    case 'write_stdin': return 'row.writeStdin'
    case 'apply_patch': return 'row.applyPatch'
    case 'view_image': return 'row.viewImage'
    case 'update_plan': return 'row.updatePlan'
    default: return 'row.execCommand'
  }
}

function summaryFor(toolName: string, argsRaw: string, t: CodexToolRowProps['t']): string {
  const args = objectArgs(argsRaw)
  switch (toolName) {
    case 'exec_command': return firstLine(stringArg(args, 'cmd') ?? t('row.command'))
    case 'write_stdin': {
      const sessionId = args?.session_id
      return typeof sessionId === 'number' ? t('row.session', { id: sessionId }) : t('row.writeStdin')
    }
    case 'apply_patch': return t('row.patch')
    case 'view_image': return firstLine(stringArg(args, 'path') ?? t('row.image'))
    case 'update_plan': {
      const plan = args?.plan
      return Array.isArray(plan) ? t('row.planSteps', { count: plan.length }) : t('row.plan')
    }
    default: return firstLine(argsRaw)
  }
}

function stateLabel(state: CodexRowState, t: CodexToolRowProps['t']): string | null {
  switch (state) {
    case 'running': return t('row.running')
    case 'error': return t('row.failed')
    case 'stopped': return t('row.stopped')
    default: return null
  }
}

function leadingFor(state: CodexRowState, icon: ReactNode): ReactNode {
  switch (state) {
    case 'error': return <StateDot state="error" />
    case 'stopped': return <StateDot state="warning" />
    default: return icon
  }
}

/**
 * Render one Codex tool call with a standard icon and a replay-stable body.
 * @param props - keyed toolview props and the Codex locale seat.
 * @returns the Codex tool row.
 */
export function CodexToolRow({ toolName, block, inspect, t }: CodexToolRowProps) {
  const [expanded, setExpanded] = useState(false)
  const state = rowState(block)
  const argsRaw = argsOf(block)
  const output = resultText(block)
  const diff = toolName === 'apply_patch' ? patchDiffs(block) : null
  const expandable = diff !== null || argsRaw !== '' || output !== null
  const open = expanded && expandable
  const outputSummary = state === 'error' && output !== null ? firstLine(output) : null
  const summary = outputSummary ?? (diff === null ? summaryFor(toolName, argsRaw, t) : patchSummary(diff))
  const status = stateLabel(state, t)
  const toggle = (): void => { setExpanded(value => !value) }

  return (
    <div className={css.root} data-tool={toolName} data-icon={iconName(toolName)} data-state={state}>
      {status !== null ? <span className={css.visuallyHidden}>{status}</span> : null}
      <DisclosureRow
        rowClassName={css.row}
        leadingClassName={css.leading}
        titleClassName={css.title}
        chevronClassName={css.chevron}
        icon={leadingFor(state, iconFor(toolName))}
        title={t(titleKey(toolName))}
        open={open}
        expandable={expandable}
        expandOnRowClick
        keepContentWhenOpen
        onToggle={toggle}
        collapsedContent={summary !== '' ? (
          <>
            <span className={css.separator} aria-hidden />
            <span className={state === 'error' ? `${css.summary} ${css.errorSummary}` : css.summary}>{summary}</span>
          </>
        ) : undefined}
      >
        <div className={css.bodyWrap}>
          {diff !== null ? <DiffBlock diffs={diff} maxLines={8} /> : null}
          {diff === null && argsRaw !== '' ? (
            <section className={css.ioCard} aria-label={t('row.input')}>
              <span className={css.ioLabel}>{t('row.input')}</span>
              <pre className={css.ioText}>{argsRaw}</pre>
            </section>
          ) : null}
          {diff === null && output !== null ? (
            <section className={css.ioCard} aria-label={t('row.output')}>
              <span className={css.ioLabel}>{t('row.output')}</span>
              <pre className={css.ioText} data-error={state === 'error' || undefined}>{output}</pre>
            </section>
          ) : null}
          {inspect !== undefined ? (
            <button type="button" className={css.inspectButton} onClick={inspect}>
              <IconInspectOutline12 />
              {t('row.inspect')}
            </button>
          ) : null}
        </div>
      </DisclosureRow>
    </div>
  )
}
