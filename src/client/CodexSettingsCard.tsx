import { useState } from 'react'
import {
  IconChevronDownOutline14,
  IconPlusOutline16,
  IconTrashOutline16,
  Tooltip,
} from '@deepseek-ai/dsh-client-ui-primitives'
import type { InjectFace, PropsLocale, PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type {
  CodexSettingsCardController,
  CodexSettingsState,
  ModelOverrideDecision,
} from './settings-card-controller.ts'
import css from './CodexSettingsCard.module.css'
import { modelRouteKey } from '../settings.ts'

export interface CodexSettingsCardFace {
  hooks: { codexSettings: import('@deepseek-ai/dsh-client-runtime/client').SnapshotStore<CodexSettingsState> }
  edit: (field: 'enabled' | 'modelPatterns', text: string) => void
  setModelDecision: (provider: string, model: string, decision: ModelOverrideDecision) => void
  addModelException: (provider: string, model: string) => void
  removeModelException: (provider: string, model: string) => void
  reset: (field: 'enabled' | 'modelPatterns' | 'modelOverrides') => void
  save: () => void
  discard: () => void
}

type Props = PropsRuntime<'settings.plugin.item'> & PropsLocale<'codex'> & InjectFace<CodexSettingsCardFace>

/** Render the OpenTritium Codex simulation settings card. */
export function CodexSettingsCard(props: Props) {
  const [open, setOpen] = useState(false)
  const [addingModel, setAddingModel] = useState(false)
  const state = props.useCodexSettings(snapshot => snapshot)
  if (!state.available) return null
  const field = (key: 'enabled' | 'modelPatterns') => state[key]
  const disabled = !state.writable || state.saving
  const saveDisabled = !state.dirty || disabled || field('modelPatterns').invalid
  return (
    <li className={css.card}>
      <button
        type="button"
        className={css.header}
        aria-expanded={open}
        aria-label={`${props.t(open ? 'settings.collapse' : 'settings.expand')}: ${props.t('settings.title')}`}
        onClick={() => setOpen(value => !value)}
      >
        <span className={css.headText}>
          <span className={css.name}>{props.t('settings.title')}</span>
          <span className={css.description}>{props.t('settings.description')}</span>
        </span>
        {state.dirty ? <span className={css.pending}>{props.t('settings.unsaved')}</span> : null}
        <IconChevronDownOutline14 className={`${css.chevron} ${open ? css.chevronOpen : ''}`} />
      </button>
      {open ? (
        <div className={css.body}>
          <div className={`${css.field} ${css.switchField}`}>
            <div className={css.fieldHead}>
              <span className={css.label}>{props.t('settings.enabled')}</span>
              {field('enabled').overridden ? (
                <button type="button" className={css.reset} disabled={disabled} onClick={() => props.reset('enabled')}>
                  {props.t('settings.reset')}
                </button>
              ) : null}
              <label className={css.switch}>
                <input
                  className={css.switchInput}
                  type="checkbox"
                  role="switch"
                  aria-label={props.t('settings.enabled')}
                  checked={field('enabled').text === 'true'}
                  disabled={disabled}
                  onChange={event => props.edit('enabled', String(event.target.checked))}
                />
                <span className={css.switchTrack} aria-hidden />
              </label>
            </div>
            <p className={css.hint}>{props.t('settings.enabledHint')}</p>
          </div>
          <div className={css.field}>
            <div className={css.fieldHead}>
              <label className={css.label} htmlFor="codex-model-patterns">
                {props.t('settings.patterns')}
              </label>
              {field('modelPatterns').overridden ? (
                <button
                  type="button"
                  className={css.reset}
                  disabled={disabled}
                  onClick={() => props.reset('modelPatterns')}
                >
                  {props.t('settings.reset')}
                </button>
              ) : null}
            </div>
            <textarea
              id="codex-model-patterns"
              rows={2}
              placeholder={props.t('settings.patternsPlaceholder')}
              className={field('modelPatterns').invalid ? css.inputInvalid : css.input}
              value={field('modelPatterns').text}
              disabled={disabled}
              onChange={event => props.edit('modelPatterns', event.target.value)}
            />
            <p className={css.hint}>{props.t('settings.patternsHint')}</p>
          </div>
          <div className={css.field}>
            <div className={css.fieldHead}>
              <span className={css.label}>{props.t('settings.models')}</span>
              {state.modelOverridesOverridden ? (
                <button
                  type="button"
                  className={css.reset}
                  disabled={disabled}
                  onClick={() => props.reset('modelOverrides')}
                >
                  {props.t('settings.reset')}
                </button>
              ) : null}
              <button
                type="button"
                className={css.addButton}
                disabled={disabled || state.modelsStatus !== 'ready' || state.addableModels.length === 0}
                onClick={() => setAddingModel(true)}
              >
                <IconPlusOutline16 size={14} />
                {props.t('settings.modelsAdd')}
              </button>
            </div>
            <p className={css.hint}>{props.t('settings.modelsHint')}</p>
            {state.modelsStatus === 'loading' ? (
              <p className={css.status}>{props.t('settings.modelsLoading')}</p>
            ) : null}
            {state.modelsStatus === 'error' ? (
              <p className={css.error} role="status">
                {props.t('settings.modelsFailed')}: {state.modelsError}
              </p>
            ) : null}
            {addingModel && state.modelsStatus === 'ready' ? (
              <div className={css.addModel}>
                <label className={css.visuallyHidden} htmlFor="codex-model-exception">
                  {props.t('settings.modelsPick')}
                </label>
                <select
                  id="codex-model-exception"
                  className={`${css.input} ${css.selectInput}`}
                  autoFocus
                  defaultValue=""
                  disabled={disabled}
                  onChange={event => {
                    const selected = state.addableModels.find(
                      row => modelRouteKey(row.provider, row.model) === event.target.value,
                    )
                    if (selected === undefined) return
                    props.addModelException(selected.provider, selected.model)
                    setAddingModel(false)
                  }}
                >
                  <option value="" disabled>
                    {props.t('settings.modelsPick')}
                  </option>
                  {state.addableModels.map(row => (
                    <option key={modelRouteKey(row.provider, row.model)} value={modelRouteKey(row.provider, row.model)}>
                      {row.providerName} / {row.modelName}
                    </option>
                  ))}
                </select>
                <button type="button" className={css.reset} disabled={disabled} onClick={() => setAddingModel(false)}>
                  {props.t('settings.cancel')}
                </button>
              </div>
            ) : null}
            {state.models.length > 0 ? (
              <ul className={css.models}>
                {state.models.map(row => (
                  <li className={css.model} key={modelRouteKey(row.provider, row.model)}>
                    <div className={css.modelIdentity}>
                      <span className={css.modelName}>{row.modelName}</span>
                      <span className={css.providerName}>{row.providerName}</span>
                    </div>
                    <div className={css.modelActions}>
                      <div
                        className={css.decisions}
                        role="radiogroup"
                        aria-label={`${row.providerName} / ${row.modelName}`}
                      >
                        {(['enabled', 'disabled'] as const).map(decision => (
                          <button
                            type="button"
                            className={`${css.decision} ${row.decision === decision ? css.decisionSelected : ''}`}
                            aria-pressed={row.decision === decision}
                            disabled={disabled}
                            key={decision}
                            onClick={() => props.setModelDecision(row.provider, row.model, decision)}
                          >
                            {props.t(`settings.decision.${decision}`)}
                          </button>
                        ))}
                      </div>
                      <Tooltip label={props.t('settings.modelsRemove')}>
                        <button
                          type="button"
                          className={css.removeButton}
                          aria-label={`${props.t('settings.modelsRemove')}: ${row.providerName} / ${row.modelName}`}
                          disabled={disabled}
                          onClick={() => props.removeModelException(row.provider, row.model)}
                        >
                          <IconTrashOutline16 size={14} />
                        </button>
                      </Tooltip>
                    </div>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
          <div className={css.footer}>
            {state.failed ? (
              <p className={css.error} role="status">
                {props.t('settings.failed')}
              </p>
            ) : null}
            <button type="button" className={css.button} disabled={!state.dirty || disabled} onClick={props.discard}>
              {props.t('settings.discard')}
            </button>
            <button type="button" className={css.button} disabled={saveDisabled} onClick={props.save}>
              {props.t(state.saving ? 'settings.saving' : 'settings.save')}
            </button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

export function cardFace(controller: CodexSettingsCardController): CodexSettingsCardFace {
  return {
    hooks: { codexSettings: controller.getStore() },
    edit: (field, text) => controller.edit(field, text),
    setModelDecision: (provider, model, decision) => controller.setModelDecision(provider, model, decision),
    addModelException: (provider, model) => controller.addModelException(provider, model),
    removeModelException: (provider, model) => controller.removeModelException(provider, model),
    reset: field => controller.reset(field),
    save: () => {
      void controller.save()
    },
    discard: () => controller.discard(),
  }
}
