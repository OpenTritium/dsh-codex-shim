/**
 * Model-facing `update_plan` tool: the Codex plan/checklist surface over the
 * same durable `todo/write` session events the `todos` projection folds, so a
 * deployment composing both surfaces keeps one checklist per session. The
 * schema, statuses, single-active discipline, and `Plan updated` result
 * follow upstream Codex verbatim.
 * @module @opentritium/dsh-codex-shim/tool-plan
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'
import type { TodoItem } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session'

/** Cordis plugin name. */
export const name = 'opentritium-codex-plan'

/** The prompt registry receives no row here; the codex persona owns guidance. */
export const inject = ['tools']

/** The valid {@link TodoItem} statuses, as a runtime set for input narrowing. */
const STATUSES = ['pending', 'in_progress', 'completed'] as const

interface UpdatePlanArgs {
  explanation?: string
  plan: { step: string; status: string }[]
}

/**
 * Validate the value constraints the schema cannot express and build the
 * canonical {@link TodoItem}[]: non-empty steps and at most one
 * `in_progress` item, exactly upstream's discipline.
 * @param raw - the model-supplied plan, already schema-checked.
 * @returns the canonical list.
 */
function toTodoList(raw: UpdatePlanArgs['plan']): TodoItem[] {
  const todos: TodoItem[] = []
  let active = 0
  for (const item of raw) {
    const step = item.step.trim()
    if (step.length === 0) throw new Error('invalid plan: `step` must be a non-empty string')
    if (item.status === 'in_progress') active++
    todos.push({ content: step, status: item.status as TodoItem['status'] })
  }
  if (active > 1) {
    throw new Error('invalid plan: at most one step can be in_progress at a time')
  }
  return todos
}

/**
 * Present one `update_plan` call as a generic card over the plan steps.
 * @param args - the validated tool arguments.
 * @returns the generic call view.
 */
export function presentPlanCall(args: UpdatePlanArgs): {
  card: 'generic'
  title: string
  kind: 'other'
  rawInput: UpdatePlanArgs['plan']
} {
  return {
    card: 'generic',
    title: 'Update plan',
    kind: 'other',
    rawInput: args.plan,
  }
}

/**
 * Register the `update_plan` tool on `ctx.tools`.
 * @param ctx - registrant context carrying the tool registry.
 */
export function apply(ctx: Context): void {
  ctx.tools.register(
    defineTool({
      name: 'update_plan',
      description:
        'Updates the task plan. Provide an optional explanation and a list of plan items, each with a step and status. At most one step can be in_progress at a time.',
      parameters: {
        explanation: { type: 'string', description: 'Optional explanation for this plan update.' },
        plan: {
          type: 'array',
          required: true,
          description: 'The current plan steps with their statuses.',
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              step: { type: 'string', required: true, description: 'Task step text.' },
              status: {
                type: 'string',
                required: true,
                enum: [...STATUSES],
                description: 'pending (not started) | in_progress (now) | completed (done).',
              },
            },
          },
        },
      },
      output: {
        schema: { type: 'string' },
        render: () => [{ type: 'text', text: 'Plan updated' }],
      },
      execute(args, exec) {
        const todos = toTodoList(args.plan)
        if (exec.agent === undefined) {
          // The checklist is per-agent-session state; a non-agent caller has
          // nowhere to write it. Reject rather than silently no-op.
          throw new Error('update_plan requires an owning agent session')
        }
        exec.agent.session.append('todo/write', { todos })
        return Promise.resolve('Plan updated')
      },
      presentCall: presentPlanCall,
    }),
  )
}
