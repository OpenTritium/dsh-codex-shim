import { useId, useState, type ReactNode } from 'react'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { MessageImage } from '@deepseek-ai/dsh-client-ui-attachment'
import {
  DiffBlock,
  DisclosureRow,
  IconApiOutline14,
  IconChecklistOutline14,
  IconEditOutline16,
  IconGlobeOutline14,
  IconInspectOutline12,
  IconPaperclipOutline16,
  IconSparkle16,
  StateDot,
  WebBlock,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { DiffHunk, WebBlockProps, WebSourceView } from '@deepseek-ai/dsh-client-ui-primitives'
import type { ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import type { PropsLocale } from '@deepseek-ai/dsh-client-ui-slots'
import type { ConversationSnapshot, ToolCallBlock } from '@deepseek-ai/dsh-client-runtime/client'
import css from './CodexToolRow.module.css'
import {
  changedPlanItems,
  parsePlanPresentation,
  type PlanItemPresentation,
  type PlanPresentation,
  type PlanStatus,
} from './plan-presentation.ts'
import { splitTerminalOutput } from './terminal-output.ts'

type CodexToolRowProps = ToolCallViewProps & PropsLocale<'codex'>
type ImageLoader = (attachment: ImageAttachmentRef) => Promise<string>
type CodexRowState = 'running' | 'ok' | 'error' | 'stopped'

function firstLine(value: string): string {
  const newline = value.indexOf('\n')
  return newline === -1 ? value : value.slice(0, newline)
}

function argsOf(block: ToolCallBlock): string {
  return 'kind' in block ? (block.call?.argsRaw ?? '') : block.argsRaw
}

function resultText(block: ToolCallBlock): string | null {
  if (!('kind' in block)) return null
  const parts = block.content.flatMap((item) => (item.type === 'text' ? [item.text] : []))
  if (parts.length === 0 && block.error !== undefined) {
    parts.push(`${block.error.name}: ${block.error.code}`)
  }
  return parts.join('\n') || null
}

function imageAttachment(block: ToolCallBlock): ImageAttachmentRef | undefined {
  if (!('kind' in block)) return undefined
  return block.content.find((item) => item.type === 'image')?.attachment
}

function imageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const paths = [...new Set(diffs.map((diff) => diff.path))]
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
      ? (value as Record<string, unknown>)
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
    case 'write_stdin':
      return 'bash'
    case 'apply_patch':
      return 'edit'
    case 'view_image':
      return 'image'
    case 'update_plan':
      return 'checklist'
    default:
      return 'other'
  }
}

function iconFor(toolName: string): ReactNode {
  switch (toolName) {
    case 'exec_command':
    case 'write_stdin':
      return <IconApiOutline14 size={14} />
    case 'apply_patch':
      return <IconEditOutline16 size={14} />
    case 'view_image':
      return <IconPaperclipOutline16 size={14} />
    case 'update_plan':
      return <IconChecklistOutline14 size={14} />
    case 'web_run':
      return <IconGlobeOutline14 size={14} />
    default:
      return <IconSparkle16 size={14} />
  }
}

function titleKey(
  toolName: string,
): 'row.execCommand' | 'row.writeStdin' | 'row.applyPatch' | 'row.viewImage' | 'row.updatePlan' | 'row.webRun' {
  switch (toolName) {
    case 'exec_command':
      return 'row.execCommand'
    case 'write_stdin':
      return 'row.writeStdin'
    case 'apply_patch':
      return 'row.applyPatch'
    case 'view_image':
      return 'row.viewImage'
    case 'update_plan':
      return 'row.updatePlan'
    case 'web_run':
      return 'row.webRun'
    default:
      return 'row.execCommand'
  }
}

function summaryFor(toolName: string, argsRaw: string, t: CodexToolRowProps['t']): string {
  const args = objectArgs(argsRaw)
  switch (toolName) {
    case 'exec_command':
      return firstLine(stringArg(args, 'cmd') ?? t('row.command'))
    case 'write_stdin': {
      const sessionId = args?.session_id
      return typeof sessionId === 'number' ? t('row.session', { id: sessionId }) : t('row.writeStdin')
    }
    case 'apply_patch':
      return t('row.patch')
    case 'view_image':
      return firstLine(stringArg(args, 'path') ?? t('row.image'))
    case 'update_plan': {
      const plan = args?.plan
      return Array.isArray(plan) ? t('row.planSteps', { count: plan.length }) : t('row.plan')
    }
    case 'web_run': {
      const queries = args?.search_query
      if (!Array.isArray(queries)) return t('row.webSearch')
      const labels = queries.flatMap((query) => {
        if (typeof query !== 'object' || query === null || Array.isArray(query)) return []
        const value = (query as Record<string, unknown>).q
        return typeof value === 'string' && value.trim() !== '' ? [firstLine(value.trim())] : []
      })
      return labels.length === 0 ? t('row.webSearch') : labels.join(' · ')
    }
    default:
      return firstLine(argsRaw)
  }
}

type CodexWebBlockProps =
  | WebBlockProps
  | {
      kind: 'searches'
      results: Array<{
        query: string
        sources: WebSourceView[]
        answer?: string
        truncated: boolean
      }>
    }

function webSource(value: unknown): WebSourceView | undefined {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return undefined
  const source = value as Record<string, unknown>
  if (typeof source.url !== 'string') return undefined
  if (source.title !== undefined && typeof source.title !== 'string') return undefined
  if (source.snippet !== undefined && typeof source.snippet !== 'string') return undefined
  if (source.publishedAt !== undefined && typeof source.publishedAt !== 'string') return undefined
  return {
    url: source.url,
    ...(source.title === undefined ? {} : { title: source.title }),
    ...(source.snippet === undefined ? {} : { snippet: source.snippet }),
    ...(source.publishedAt === undefined ? {} : { publishedAt: source.publishedAt }),
  }
}

function webCardFromBlock(block: ToolCallBlock): CodexWebBlockProps | undefined {
  if (!('kind' in block) || block.resultView?.card !== 'web') return undefined
  const view = block.resultView as unknown as Record<string, unknown>
  if (view.kind === 'search') {
    if (!Array.isArray(view.sources) || typeof view.truncated !== 'boolean') return undefined
    const sources = view.sources.map(webSource)
    if (sources.some((source) => source === undefined)) return undefined
    if (view.answer !== undefined && typeof view.answer !== 'string') return undefined
    return {
      kind: 'search',
      sources: sources as WebSourceView[],
      truncated: view.truncated,
      ...(view.answer === undefined ? {} : { answer: view.answer }),
    }
  }
  if (view.kind === 'searches' && Array.isArray(view.results)) {
    const results = view.results.map((group) => {
      if (typeof group !== 'object' || group === null || Array.isArray(group)) return undefined
      const item = group as Record<string, unknown>
      if (
        typeof item.query !== 'string' ||
        item.query.trim() === '' ||
        typeof item.truncated !== 'boolean' ||
        !Array.isArray(item.sources)
      )
        return undefined
      const sources = item.sources.map(webSource)
      if (sources.some((source) => source === undefined)) return undefined
      if (item.answer !== undefined && typeof item.answer !== 'string') return undefined
      return {
        query: item.query,
        sources: sources as WebSourceView[],
        truncated: item.truncated,
        ...(item.answer === undefined ? {} : { answer: item.answer }),
      }
    })
    if (results.some((result) => result === undefined)) return undefined
    return {
      kind: 'searches',
      results: results as Array<{
        query: string
        sources: WebSourceView[]
        answer?: string
        truncated: boolean
      }>,
    }
  }
  return undefined
}

function stateLabel(state: CodexRowState, t: CodexToolRowProps['t']): string | null {
  switch (state) {
    case 'running':
      return t('row.running')
    case 'error':
      return t('row.failed')
    case 'stopped':
      return t('row.stopped')
    case 'ok':
      return null
  }
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

function planStatusLabel(status: PlanStatus, t: CodexToolRowProps['t']): string {
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
  const index = occurrences.findIndex((item) => item.callId === callId)
  return changedPlanItems(current.items, index > 0 ? occurrences[index - 1]?.items : undefined)
}

function leadingFor(state: CodexRowState, icon: ReactNode): ReactNode {
  switch (state) {
    case 'error':
      return <StateDot state="error" />
    case 'stopped':
      return <StateDot state="warning" />
    case 'ok':
    case 'running':
      return icon
  }
}

/**
 * Render one Codex tool call with a standard icon and a replay-stable body.
 * @param props - keyed toolview props and the Codex locale seat.
 * @returns the Codex tool row.
 */
export function CodexToolRow({
  toolName,
  block,
  inspect,
  t,
  imageLoader,
  useSession,
}: CodexToolRowProps & { imageLoader?: ImageLoader }) {
  const [expanded, setExpanded] = useState(false)
  const state = rowState(block)
  const argsRaw = argsOf(block)
  const output = resultText(block)
  const image = toolName === 'view_image' ? imageAttachment(block) : undefined
  const terminalOutput =
    toolName === 'exec_command' || toolName === 'write_stdin' ? splitTerminalOutput(output ?? '') : null
  const args = objectArgs(argsRaw)
  const command = toolName === 'exec_command' ? stringArg(args, 'cmd') : undefined
  const stdin = toolName === 'write_stdin' ? stringArg(args, 'chars') : undefined
  const workdir = toolName === 'exec_command' ? stringArg(args, 'workdir') : undefined
  const diff = toolName === 'apply_patch' ? patchDiffs(block) : null
  const plan = toolName === 'update_plan' ? parsePlanPresentation(argsRaw) : undefined
  const web = toolName === 'web_run' ? webCardFromBlock(block) : undefined
  const planItems = useSession((snapshot) =>
    plan === undefined ? [] : relevantPlanItems(snapshot, block.callId, plan),
  )
  const showRawPanels = toolName !== 'view_image' && plan === undefined && web === undefined
  const expandable =
    diff !== null ||
    image !== undefined ||
    plan !== undefined ||
    web !== undefined ||
    (showRawPanels && (argsRaw !== '' || output !== null))
  const open = expanded && expandable
  const outputSummary =
    state === 'error' && output !== null ? firstLine(terminalOutput?.stderr || terminalOutput?.stdout || output) : null
  const summary = outputSummary ?? (diff === null ? summaryFor(toolName, argsRaw, t) : patchSummary(diff))
  const status = stateLabel(state, t)
  const toggle = (): void => {
    setExpanded((value) => !value)
  }

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
        collapsedContent={
          summary !== '' ? (
            <>
              <span className={css.separator} aria-hidden />
              <span className={state === 'error' ? `${css.summary} ${css.errorSummary}` : css.summary}>{summary}</span>
            </>
          ) : undefined
        }
      >
        <div className={css.bodyWrap}>
          {diff !== null ? <DiffBlock diffs={diff} maxLines={8} /> : null}
          {diff === null && terminalOutput !== null && toolName === 'exec_command' && command !== undefined ? (
            <section className={css.ioCard} data-stream="command" aria-label={t('row.command')}>
              <span className={css.ioLabel}>{t('row.command')}</span>
              <div className={css.streamBody}>
                <pre className={css.ioText}>{command}</pre>
                {workdir !== undefined ? <span className={css.workdir}>{workdir}</span> : null}
              </div>
            </section>
          ) : null}
          {diff === null && terminalOutput !== null && toolName === 'write_stdin' ? (
            <section className={css.ioCard} data-stream="stdin" aria-label={t('row.stdin')}>
              <span className={css.ioLabel}>{t('row.stdin')}</span>
              <pre className={css.ioText}>{stdin ?? t('row.noInput')}</pre>
            </section>
          ) : null}
          {diff === null && terminalOutput === null && showRawPanels && argsRaw !== '' ? (
            <section className={css.ioCard} aria-label={t('row.input')}>
              <span className={css.ioLabel}>{t('row.input')}</span>
              <pre className={css.ioText}>{argsRaw}</pre>
            </section>
          ) : null}
          {diff === null && terminalOutput !== null && terminalOutput.stdout !== '' ? (
            <section className={css.ioCard} data-stream="stdout" aria-label={t('row.stdout')}>
              <span className={css.ioLabel}>{t('row.stdout')}</span>
              <pre className={css.ioText}>{terminalOutput.stdout}</pre>
            </section>
          ) : null}
          {diff === null && terminalOutput !== null && terminalOutput.stderr !== '' ? (
            <section className={css.ioCard} data-stream="stderr" aria-label={t('row.stderr')}>
              <span className={css.ioLabel}>{t('row.stderr')}</span>
              <pre className={css.ioText} data-error>
                {terminalOutput.stderr}
              </pre>
            </section>
          ) : null}
          {diff === null && terminalOutput === null && showRawPanels && output !== null ? (
            <section className={css.ioCard} aria-label={t('row.output')}>
              <span className={css.ioLabel}>{t('row.output')}</span>
              <pre className={css.ioText} data-error={state === 'error' || undefined}>
                {output}
              </pre>
            </section>
          ) : null}
          {diff === null && image !== undefined && imageLoader !== undefined ? (
            <section className={css.imageCard} aria-label={t('row.imagePreview')}>
              <span className={css.ioLabel}>{t('row.image')}</span>
              <div className={css.imageContent}>
                <MessageImage
                  attachment={image}
                  load={imageLoader}
                  variant="single"
                  labels={{
                    image: t('row.image'),
                    open: t('row.imageOpen'),
                    openNamed: (label: string) => t('row.imageOpenNamed', { label }),
                    loading: t('row.imageLoading'),
                    loadFailed: t('row.imageLoadFailed'),
                    lightbox: {
                      dialog: t('row.imagePreview'),
                      close: t('row.imageClose'),
                    },
                  }}
                />
                <dl className={css.imageMeta}>
                  <div>
                    <dt>{t('row.imageFile')}</dt>
                    <dd>{image.name ?? t('row.image')}</dd>
                  </div>
                  <div>
                    <dt>{t('row.imageType')}</dt>
                    <dd>{image.mediaType}</dd>
                  </div>
                  <div>
                    <dt>{t('row.imageDimensions')}</dt>
                    <dd>
                      {image.width} × {image.height}
                    </dd>
                  </div>
                  <div>
                    <dt>{t('row.imageSize')}</dt>
                    <dd>{imageSize(image.bytes)}</dd>
                  </div>
                </dl>
              </div>
            </section>
          ) : null}
          {diff === null && web !== undefined ? <WebBlock {...(web as WebBlockProps)} className={css.webBody} /> : null}
          {diff === null && plan !== undefined ? (
            <section className={css.planCard} aria-label={t('row.plan')}>
              <span className={css.ioLabel}>{t('row.plan')}</span>
              <div className={css.planContent}>
                <ol className={css.planItems}>
                  {planItems.map((item, index) => (
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
