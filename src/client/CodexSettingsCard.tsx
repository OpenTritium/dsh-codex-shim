import { useState } from 'react'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { CodexSettingsCardController, CodexSettingsState } from './settings-card-controller.ts'
import css from './CodexSettingsCard.module.css'

export interface CodexSettingsCardFace {
  hooks: { codexSettings: import('@deepseek-ai/dsh-client-runtime/client').SnapshotStore<CodexSettingsState> }
  edit: (field: 'enabled' | 'modelPatterns' | 'modelOverrides', text: string) => void
  reset: (field: 'enabled' | 'modelPatterns' | 'modelOverrides') => void
  save: () => void
  discard: () => void
}

type Props = PropsRuntime<'settings.plugin.item'> & PropsLocale<'codex'> & InjectFace<CodexSettingsCardFace>

/** Render the OpenTritium Codex configuration card inside the upstream slot. */
export function CodexSettingsCard(props: Props) {
  const [open, setOpen] = useState(false)
  const state = props.useCodexSettings(snapshot => snapshot)
  if (!state.available) return null
  const field = (key: keyof CodexSettingsState) => state[key] as { text: string; invalid: boolean }
  const disabled = !state.writable || state.saving
  return <li className={css.card}>
    <button type="button" className={css.header} aria-expanded={open} onClick={() => setOpen(value => !value)}>
      <span className={css.headText}><span className={css.name}>{props.t('settings.title')}</span><span className={css.description}>{props.t('settings.description')}</span></span>
      {state.dirty ? <span className={css.pending}>{props.t('settings.unsaved')}</span> : null}
      <span aria-hidden>{open ? '▴' : '▾'}</span>
    </button>
    {open ? <div className={css.body}>
      <label className={css.field}><span className={css.label}>{props.t('settings.enabled')}</span><input type="checkbox" checked={field('enabled').text === 'true'} disabled={disabled} onChange={event => props.edit('enabled', String(event.target.checked))} /><span className={css.hint}>{props.t('settings.enabledHint')}</span></label>
      <label className={css.field}><span className={css.label}>{props.t('settings.patterns')}</span><textarea className={field('modelPatterns').invalid ? css.inputInvalid : css.input} value={field('modelPatterns').text} disabled={disabled} onChange={event => props.edit('modelPatterns', event.target.value)} /><span className={css.hint}>{props.t('settings.patternsHint')}</span></label>
      <label className={css.field}><span className={css.label}>{props.t('settings.overrides')}</span><textarea className={field('modelOverrides').invalid ? css.inputInvalid : css.input} value={field('modelOverrides').text} disabled={disabled} onChange={event => props.edit('modelOverrides', event.target.value)} /><span className={css.hint}>{props.t('settings.overridesHint')}</span></label>
      {state.failed ? <p className={css.error} role="status">{props.t('settings.failed')}</p> : null}
      <div className={css.footer}><button type="button" className={css.button} disabled={!state.dirty || state.saving} onClick={props.discard}>{props.t('settings.discard')}</button><button type="button" className={css.button} disabled={!state.dirty || state.saving || field('modelPatterns').invalid || field('modelOverrides').invalid} onClick={props.save}>{props.t(state.saving ? 'settings.saving' : 'settings.save')}</button></div>
    </div> : null}
  </li>
}

export function cardFace(controller: CodexSettingsCardController): CodexSettingsCardFace {
  return { hooks: { codexSettings: controller.getStore() }, edit: (field, text) => controller.edit(field, text), reset: field => controller.reset(field), save: () => { void controller.save() }, discard: () => controller.discard() }
}
