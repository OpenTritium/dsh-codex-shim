/** Codex `update_plan` over the durable `todo/write` session events. */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis'
import { defineTool } from '@deepseek-ai/dsh-tools'
import type {} from '@deepseek-ai/dsh-tools'
import type { TodoItem } from '@deepseek-ai/dsh-session'
import type {} from '@deepseek-ai/dsh-session'

export const name = 'opentritium-codex-plan'

export const inject = ['tools']

const STATUSES = ['pending', 'in_progress', 'completed'] as const

interface UpdatePlanArgs {
  explanation?: string
  plan: { step: string; status: string }[]
}

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

export function presentPlanCall(args: UpdatePlanArgs): {
  card: 'generic'
  title: string
  kind: 'other'
  rawInput: UpdatePlanArgs['plan']
} {
  return { card: 'generic', title: 'Update plan', kind: 'other', rawInput: args.plan }
}

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
      output: { schema: { type: 'string' }, render: () => [{ type: 'text', text: 'Plan updated' }] },
      execute(args, exec) {
        const todos = toTodoList(args.plan)
        if (exec.agent === undefined) {
          // A checklist without an owning agent session cannot be persisted.
          throw new Error('update_plan requires an owning agent session')
        }
        exec.agent.session.append('todo/write', { todos })
        return Promise.resolve('Plan updated')
      },
      presentCall: presentPlanCall,
    }),
  )
}
