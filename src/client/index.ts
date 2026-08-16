/** Browser-side Codex tool presentation: keyed rows with standard icons. */

import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client'
import type { ISessions, SessionId } from '@deepseek-ai/dsh-client-runtime/client'
import type { ImageAttachmentRef } from '@deepseek-ai/dsh-attachment'
import { createElement } from 'react'
import type { ConnectionHandle } from '@deepseek-ai/dsh-client-connection/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'
import type {} from '@deepseek-ai/dsh-client-ui-tool/client'
import type {} from '@deepseek-ai/dsh-client-ui-slots'
import type {} from '@deepseek-ai/dsh-client-ui-settings/client'
import type {} from '@deepseek-ai/dsh-client-ui-settings-plugins/client'
import type {} from '@deepseek-ai/dsh-client-connection/client'
import { CodexToolRow } from './CodexToolRow.tsx'
import { CodexSettingsCard, cardFace } from './CodexSettingsCard.tsx'
import { mount as mountSettingsCss, dispose as disposeSettingsCss } from './CodexSettingsCard.module.css'
import { mount as mountToolRowCss, dispose as disposeToolRowCss } from './CodexToolRow.module.css'
import { CODEX_SETTINGS_NS, CodexSettingsCardController } from './settings-card-controller.ts'
import { en, NS, zh, type CodexKey } from './locales.ts'

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** The Codex tool-row copy. */
    codex: CodexKey
  }
}

/** Browser services required by the keyed Codex tool rows. */
export const inject = ['slots', 'locale', 'sessions']

const CODEX_TOOL_NAMES = ['exec_command', 'write_stdin', 'apply_patch', 'view_image', 'update_plan', 'web_run'] as const

/**
 * Register Codex's keyed tool rows and their locale dictionaries.
 * @param ctx - browser root context carrying the slot and locale services.
 */
export function apply(ctx: ClientContext): void {
  ctx.effect(() => {
    mountToolRowCss()
    mountSettingsCss()
    return () => {
      disposeSettingsCss()
      disposeToolRowCss()
    }
  }, 'ui-codex: styles')
  ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'ui-codex: dictionaries')
  const imageResolver = createImageResolver(ctx.get('sessions') as unknown as ISessions)
  ctx.effect(() => () => imageResolver.dispose(), 'ui-codex: image previews')
  const ViewImageRow = (props: Parameters<typeof CodexToolRow>[0]) =>
    createElement(CodexToolRow, {
      ...props,
      imageLoader: (attachment) => imageResolver.load(props.sessionId, attachment),
    })
  ctx.slots.inject('tool.call.toolview', function* () {
    for (const key of CODEX_TOOL_NAMES) {
      yield ctx.slots.register(
        {
          name: 'tool.call.toolview',
          key,
          locale: NS,
          ...(key === 'web_run' ? { priority: -1 } : {}),
        },
        key === 'view_image' ? ViewImageRow : CodexToolRow,
      )
    }
  })
  // Settings is an optional browser surface. Keep its dependency out of the
  // root plugin so a WebUI without the settings transport still gets tool rows.
  ctx.inject(['settingsScope', 'connection', 'remote'], installSettings)
}

interface ImageResolver {
  load(sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string>
  dispose(): void
}

/** Resolve and cache session-authorized image URLs for tool-result previews. */
function createImageResolver(sessions: ISessions): ImageResolver {
  const pending = new Map<string, Promise<string>>()
  const urls = new Set<string>()
  const load = (sessionId: SessionId, attachment: ImageAttachmentRef): Promise<string> => {
    const key = `${sessionId}:${String(attachment.attachmentId)}`
    const cached = pending.get(key)
    if (cached !== undefined) return cached
    const session = sessions.binding(sessionId)?.session
    if (session === undefined) return Promise.reject(new Error(`unknown session "${sessionId}"`))
    const request = session
      .readAttachment(attachment.attachmentId)
      .then((result) => {
        if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`)
        if (typeof URL.createObjectURL !== 'function') {
          return `data:${result.value.attachment.mediaType};base64,${bytesToBase64(result.value.data)}`
        }
        const url = URL.createObjectURL(
          new Blob([result.value.data.buffer], { type: result.value.attachment.mediaType }),
        )
        urls.add(url)
        return url
      })
      .catch((error) => {
        if (pending.get(key) === request) pending.delete(key)
        throw error
      })
    pending.set(key, request)
    return request
  }
  return {
    load,
    dispose: () => {
      for (const url of urls) URL.revokeObjectURL(url)
      urls.clear()
      pending.clear()
    },
  }
}

function bytesToBase64(data: Uint8Array): string {
  let binary = ''
  const chunk = 0x8000
  for (let offset = 0; offset < data.length; offset += chunk) {
    binary += String.fromCharCode(...data.subarray(offset, offset + chunk))
  }
  return btoa(binary)
}

/** Mount the settings card once the settings transport is available. */
function installSettings(ctx: ClientContext): void {
  const connection = ctx.get('connection') as ConnectionHandle
  const settings = new CodexSettingsCardController(
    ctx.settingsScope.bind({ namespace: CODEX_SETTINGS_NS }),
    connection.api,
  )
  ctx.effect(() => () => settings.dispose(), 'ui-codex: settings controller')
  ctx.slots.inject('settings.plugin.item', () =>
    ctx.slots.register(
      {
        name: 'settings.plugin.item',
        id: 'opentritium-codex',
        order: 25,
        locale: NS,
        inject: () => cardFace(settings),
      },
      CodexSettingsCard,
    ),
  )
}
