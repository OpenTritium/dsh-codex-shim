import { useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
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
  const field = (key: keyof CodexSettingsState) => state[key] as { text: string; invalid: boolean; overridden: boolean }
  const disabled = !state.writable || state.saving
  return <li className={css.card}>
    <button type="button" className={css.header} aria-expanded={open} aria-label={`${props.t(open ? 'settings.collapse' : 'settings.expand')}: ${props.t('settings.title')}`} onClick={() => setOpen(value => !value)}>
      <span className={css.headText}><span className={css.name}>{props.t('settings.title')}</span><span className={css.description}>{props.t('settings.description')}</span></span>
      {state.dirty ? <span className={css.pending}>{props.t('settings.unsaved')}</span> : null}
      <IconChevronDownOutline14 className={`${css.chevron} ${open ? css.chevronOpen : ''}`} />
    </button>
    {open ? <div className={css.body}>
      <div className={css.footer}>{state.failed ? <p className={css.error} role="status">{props.t('settings.failed')}</p> : null}<button type="button" className={css.button} disabled={!state.dirty || state.saving} onClick={props.discard}>{props.t('settings.discard')}</button><button type="button" className={css.button} disabled={!state.dirty || state.saving || field('modelPatterns').invalid || field('modelOverrides').invalid} onClick={props.save}>{props.t(state.saving ? 'settings.saving' : 'settings.save')}</button></div>
      <div className={`${css.field} ${css.switchField}`}>
        <div className={css.fieldHead}><span className={css.label}>{props.t('settings.enabled')}</span>{field('enabled').overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('enabled')}>{props.t('settings.reset')}</button> : null}<label className={css.switch}><input className={css.switchInput} type="checkbox" role="switch" aria-label={props.t('settings.enabled')} checked={field('enabled').text === 'true'} disabled={disabled} onChange={event => props.edit('enabled', String(event.target.checked))} /><span className={css.switchTrack} aria-hidden /></label></div>
        <p className={css.hint}>{props.t('settings.enabledHint')}</p>
      </div>
      <div className={css.field}><div className={css.fieldHead}><label className={css.label} htmlFor="codex-model-patterns">{props.t('settings.patterns')}</label>{field('modelPatterns').overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('modelPatterns')}>{props.t('settings.reset')}</button> : null}</div><textarea id="codex-model-patterns" rows={2} className={field('modelPatterns').invalid ? css.inputInvalid : css.input} value={field('modelPatterns').text} disabled={disabled} onChange={event => props.edit('modelPatterns', event.target.value)} /><p className={css.hint}>{props.t('settings.patternsHint')}</p></div>
      <div className={css.field}><div className={css.fieldHead}><label className={css.label} htmlFor="codex-model-overrides">{props.t('settings.overrides')}</label>{field('modelOverrides').overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('modelOverrides')}>{props.t('settings.reset')}</button> : null}</div><textarea id="codex-model-overrides" rows={5} spellCheck={false} className={`${field('modelOverrides').invalid ? css.inputInvalid : css.input} ${css.codeInput}`} value={field('modelOverrides').text} disabled={disabled} onChange={event => props.edit('modelOverrides', event.target.value)} /><p className={css.hint}>{props.t('settings.overridesHint')}</p></div>
    </div> : null}
  </li>
}

export function cardFace(controller: CodexSettingsCardController): CodexSettingsCardFace {
  return { hooks: { codexSettings: controller.getStore() }, edit: (field, text) => controller.edit(field, text), reset: field => controller.reset(field), save: () => { void controller.save() }, discard: () => controller.discard() }
}
