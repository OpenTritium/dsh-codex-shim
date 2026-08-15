/** Browser-side Codex tool presentation: keyed rows with standard icons. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import { CodexToolRow } from './CodexToolRow.tsx'
import { en, NS, zh, type CodexKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Codex tool-row copy. */
    codex: CodexKey
  }
}

/** Browser services required by the keyed Codex tool rows. */
export const inject = ['slots', 'locale']

const CODEX_TOOL_NAMES = [
  'exec_command',
  'write_stdin',
  'apply_patch',
  'view_image',
  'update_plan',
] as const

/**
 * Register Codex's keyed tool rows and their locale dictionaries.
 * @param ctx - browser root context carrying the slot and locale services.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-codex: dictionaries')
  ctx.slots.inject('tool.call.toolview', function* () {
    for (const key of CODEX_TOOL_NAMES) {
      yield ctx.slots.register({ name: 'tool.call.toolview', key, locale: NS }, CodexToolRow)
    }
  })
}
