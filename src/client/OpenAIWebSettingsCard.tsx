import { useState } from 'react'
import { IconChevronDownOutline14 } from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { OpenAIWebField, OpenAIWebSettingsCardController, OpenAIWebSettingsState } from './openai-web-settings-card-controller.ts'
import css from './CodexSettingsCard.module.css'

export interface OpenAIWebSettingsCardFace {
  hooks: { openAIWebSettings: import('@deepseek-ai/dsh-client-runtime/client').SnapshotStore<OpenAIWebSettingsState> }
  edit: (field: OpenAIWebField, text: string) => void
  reset: (field: OpenAIWebField) => void
  save: () => void
  discard: () => void
}

type Props = PropsRuntime<'settings.plugin.item'> & PropsLocale<'codex'> & InjectFace<OpenAIWebSettingsCardFace>

/** Render the OpenAI Responses hosted Web Search provider settings card. */
export function OpenAIWebSettingsCard(props: Props) {
  const [open, setOpen] = useState(false)
  const state = props.useOpenAIWebSettings(snapshot => snapshot)
  if (!state.available) return null
  const disabled = !state.writable || state.saving
  const saveDisabled = !state.dirty || disabled || Object.values({
    baseURL: state.baseURL, credentialRef: state.credentialRef, model: state.model, searchContextSize: state.searchContextSize,
  }).some(field => field.invalid)
  return <li className={css.card}>
    <button type="button" className={css.header} aria-expanded={open} aria-label={`${props.t(open ? 'web.collapse' : 'web.expand')}: ${props.t('web.title')}`} onClick={() => setOpen(value => !value)}>
      <span className={css.headText}><span className={css.name}>{props.t('web.title')}</span><span className={css.description}>{props.t('web.description')}</span></span>
      {state.dirty ? <span className={css.pending}>{props.t('web.unsaved')}</span> : null}
      <IconChevronDownOutline14 className={`${css.chevron} ${open ? css.chevronOpen : ''}`} />
    </button>
    {open ? <div className={css.body}>
      <div className={`${css.field} ${css.switchField}`}><div className={css.fieldHead}><span className={css.label}>{props.t('web.enabled')}</span>{state.enabled.overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('enabled')}>{props.t('web.reset')}</button> : null}<label className={css.switch}><input className={css.switchInput} type="checkbox" role="switch" aria-label={props.t('web.enabled')} checked={state.enabled.text === 'true'} disabled={disabled} onChange={event => props.edit('enabled', String(event.target.checked))} /><span className={css.switchTrack} aria-hidden /></label></div><p className={css.hint}>{props.t('web.enabledHint')}</p></div>
      <TextField id="openai-web-base-url" label={props.t('web.baseURL')} hint={props.t('web.baseURLHint')} field="baseURL" state={state.baseURL} disabled={disabled} props={props} />
      <TextField id="openai-web-credential-ref" label={props.t('web.credentialRef')} hint={props.t('web.credentialRefHint')} field="credentialRef" state={state.credentialRef} disabled={disabled} props={props} />
      <TextField id="openai-web-model" label={props.t('web.model')} hint={props.t('web.modelHint')} field="model" state={state.model} disabled={disabled} props={props} />
      <div className={css.field}><div className={css.fieldHead}><label className={css.label} htmlFor="openai-web-context-size">{props.t('web.contextSize')}</label>{state.searchContextSize.overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('searchContextSize')}>{props.t('web.reset')}</button> : null}</div><select id="openai-web-context-size" className={state.searchContextSize.invalid ? css.inputInvalid : `${css.input} ${css.selectInput}`} value={state.searchContextSize.text} disabled={disabled} onChange={event => props.edit('searchContextSize', event.target.value)}><option value="low">{props.t('web.context.low')}</option><option value="medium">{props.t('web.context.medium')}</option><option value="high">{props.t('web.context.high')}</option></select><p className={css.hint}>{props.t('web.contextSizeHint')}</p></div>
      <div className={css.footer}>{state.failed ? <p className={css.error} role="status">{props.t('web.failed')}</p> : null}<button type="button" className={css.button} disabled={!state.dirty || disabled} onClick={props.discard}>{props.t('web.discard')}</button><button type="button" className={css.button} disabled={saveDisabled} onClick={props.save}>{props.t(state.saving ? 'web.saving' : 'web.save')}</button></div>
    </div> : null}
  </li>
}

function TextField({ id, label, hint, field, state, disabled, props }: {
  id: string
  label: string
  hint: string
  field: Exclude<OpenAIWebField, 'enabled' | 'searchContextSize'>
  state: OpenAIWebSettingsState['baseURL']
  disabled: boolean
  props: Props
}) {
  return <div className={css.field}><div className={css.fieldHead}><label className={css.label} htmlFor={id}>{label}</label>{state.overridden ? <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset(field)}>{props.t('web.reset')}</button> : null}</div><input id={id} className={state.invalid ? css.inputInvalid : css.input} value={state.text} disabled={disabled} onChange={event => props.edit(field, event.target.value)} /><p className={css.hint}>{hint}</p></div>
}

export function openAIWebCardFace(controller: OpenAIWebSettingsCardController): OpenAIWebSettingsCardFace {
  return {
    hooks: { openAIWebSettings: controller.getStore() },
    edit: (field, text) => controller.edit(field, text),
    reset: field => controller.reset(field),
    save: () => { void controller.save() },
    discard: () => controller.discard(),
  }
}
