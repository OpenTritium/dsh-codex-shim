/** Browser-side Codex tool presentation: keyed rows with standard icons. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import { CodexToolRow } from './CodexToolRow.tsx'
import { CodexSettingsCard, cardFace } from './CodexSettingsCard.tsx'
import { CODEX_SETTINGS_NS, CodexSettingsCardController } from './settings-card-controller.ts'
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
  // Settings is an optional browser surface. Keep its dependency out of the
  // root plugin so a WebUI without the settings transport still gets tool rows.
  ctx.inject(['settingsScope'], installSettings)
}

/** Mount the settings card once the settings transport is available. */
function installSettings(ctx: ClientContext): void {
  const settings = new CodexSettingsCardController(ctx.settingsScope.bind({ namespace: CODEX_SETTINGS_NS }))
  ctx.slots.inject('settings.plugin.item', () => ctx.slots.register({
    name: 'settings.plugin.item',
    id: 'opentritium-codex',
    order: 25,
    locale: NS,
    inject: () => cardFace(settings),
  }, CodexSettingsCard))
}
