import type { IApiClient, ModelProviderGroup } from '@deepseek-ai/dsh-client-connection/client'
import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

export const CODEX_SETTINGS_NS = 'opentritium-codex'

export interface ModelOverride { provider: string; model: string; enabled: boolean }
export interface CodexSettings { enabled?: boolean; modelPatterns?: string[]; modelOverrides?: ModelOverride[] }
export type ModelOverrideDecision = 'enabled' | 'disabled'
export interface CodexModelRow {
  provider: string
  providerName: string
  model: string
  modelName: string
  decision: ModelOverrideDecision
}
export interface CodexModelOption {
  provider: string
  providerName: string
  model: string
  modelName: string
}
export interface FieldState { text: string; overridden: boolean; invalid: boolean }
export interface CodexSettingsState {
  available: boolean
  writable: boolean
  dirty: boolean
  saving: boolean
  failed: boolean
  enabled: FieldState
  modelPatterns: FieldState
  modelOverridesOverridden: boolean
  modelsStatus: 'loading' | 'ready' | 'error'
  modelsError: string | undefined
  models: readonly CodexModelRow[]
  addableModels: readonly CodexModelOption[]
}

function validOverrides(value: unknown): value is ModelOverride[] {
  return Array.isArray(value) && value.every((item) => {
    if (typeof item !== 'object' || item === null) return false
    const row = item as Record<string, unknown>
    return typeof row.provider === 'string' && row.provider.length > 0
      && typeof row.model === 'string' && row.model.length > 0
      && typeof row.enabled === 'boolean'
  })
}

function parsePatterns(text: string): string[] | undefined {
  const values = text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
  return values.includes('*') && values.length > 1 ? undefined : values
}

function formatPatterns(value: unknown): string {
  return Array.isArray(value) ? value.join('\n') : ''
}

function modelKey(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}

function modelRows(groups: readonly ModelProviderGroup[], overrides: readonly ModelOverride[]): CodexModelRow[] {
  const known = new Map(groups.flatMap(group => group.models.map(model => [
    modelKey(group.id, model.id),
    { providerName: group.name, modelName: model.name },
  ])))
  return overrides.map(override => {
    const labels = known.get(modelKey(override.provider, override.model))
    return {
      provider: override.provider,
      providerName: labels?.providerName ?? override.provider,
      model: override.model,
      modelName: labels?.modelName ?? override.model,
      decision: override.enabled ? 'enabled' : 'disabled',
    }
  })
}

function addableModels(groups: readonly ModelProviderGroup[], overrides: readonly ModelOverride[]): CodexModelOption[] {
  const overridden = new Set(overrides.map(override => modelKey(override.provider, override.model)))
  return groups.flatMap(group => group.models
    .filter(model => !overridden.has(modelKey(group.id, model.id)))
    .map(model => ({ provider: group.id, providerName: group.name, model: model.id, modelName: model.name })))
}

function sameOverrides(left: readonly ModelOverride[], right: readonly ModelOverride[]): boolean {
  return left.length === right.length && left.every((item, index) => {
    const other = right[index]
    return other !== undefined && item.provider === other.provider && item.model === other.model && item.enabled === other.enabled
  })
}

/** Owns staged edits, model-directory loading, and persistence for the Codex settings card. */
export class CodexSettingsCardController {
  private readonly drafts = new Map<'enabled' | 'modelPatterns', string>()
  private readonly cleared = new Set<'enabled' | 'modelPatterns' | 'modelOverrides'>()
  private readonly store: SnapshotStore<CodexSettingsState>
  private readonly unsubscribe: () => void
  private disposed = false
  private saving = false
  private failed = false
  private modelsStatus: CodexSettingsState['modelsStatus'] = 'loading'
  private modelsError: string | undefined
  private groups: ModelProviderGroup[] = []
  private draftOverrides: ModelOverride[] | undefined

  constructor(
    private readonly scope: SettingsScope<CodexSettings>,
    private readonly api: Pick<IApiClient, 'llm'>,
  ) {
    this.store = createSnapshotStore(this.snapshot())
    this.unsubscribe = scope.subscribe(() => this.publish())
    void this.loadModels()
  }

  private publish(): void {
    if (!this.disposed) this.store.set(this.snapshot())
  }

  private current(): CodexSettings {
    return this.scope.getSnapshot().value ?? {}
  }

  private field(field: 'enabled' | 'modelPatterns'): FieldState {
    const current = this.current()
    const snapshot = this.scope.getSnapshot()
    const user = snapshot.user as CodexSettings | undefined
    const userHasField = user !== undefined && field in user
    const draft = this.drafts.get(field)
    const text = draft ?? (field === 'enabled'
      ? current.enabled === undefined ? '' : String(current.enabled)
      : userHasField ? formatPatterns(user.modelPatterns) : '')
    return {
      text,
      overridden: this.cleared.has(field) ? false : draft !== undefined || this.scope.getSnapshot().user !== undefined && field in (this.scope.getSnapshot().user as object),
      invalid: field === 'modelPatterns' && draft !== undefined && parsePatterns(draft) === undefined,
    }
  }

  private overrides(): ModelOverride[] {
    if (this.cleared.has('modelOverrides')) return []
    if (this.draftOverrides !== undefined) return this.draftOverrides
    return this.configuredOverrides()
  }

  private configuredOverrides(): ModelOverride[] {
    const configured = this.current().modelOverrides
    return validOverrides(configured) ? configured : []
  }

  private stageOverrides(next: ModelOverride[]): void {
    this.draftOverrides = sameOverrides(next, this.configuredOverrides()) ? undefined : next
    this.cleared.delete('modelOverrides')
    this.failed = false
    this.publish()
  }

  private snapshot(): CodexSettingsState {
    const current = this.scope.getSnapshot()
    const overrides = this.overrides()
    return {
      available: current.status === 'ready',
      writable: current.writable,
      dirty: this.drafts.size > 0 || this.draftOverrides !== undefined || this.cleared.size > 0,
      saving: this.saving,
      failed: this.failed,
      enabled: this.field('enabled'),
      modelPatterns: this.field('modelPatterns'),
      modelOverridesOverridden: !this.cleared.has('modelOverrides') && current.user !== undefined && 'modelOverrides' in (current.user as object),
      modelsStatus: this.modelsStatus,
      modelsError: this.modelsError,
      models: modelRows(this.groups, overrides),
      addableModels: addableModels(this.groups, overrides),
    }
  }

  private async loadModels(): Promise<void> {
    try {
      const response = await this.api.llm.models({})
      if (!response.result.ok) throw new Error(response.result.error.message)
      this.groups = response.result.value.groups
      this.modelsStatus = 'ready'
      this.modelsError = response.result.value.failures.length > 0
        ? response.result.value.failures.map(failure => `${failure.name}: ${failure.message}`).join('; ')
        : undefined
    } catch (error) {
      this.modelsStatus = 'error'
      this.modelsError = error instanceof Error ? error.message : String(error)
    }
    this.publish()
  }

  getStore(): SnapshotStore<CodexSettingsState> { return this.store }

  /** Dispose the settings subscription when the client plugin is unloaded. */
  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
  }

  edit(field: 'enabled' | 'modelPatterns', text: string): void {
    this.drafts.set(field, text)
    this.cleared.delete(field)
    this.failed = false
    this.publish()
  }

  setModelDecision(provider: string, model: string, decision: ModelOverrideDecision): void {
    if (this.overrides().find(item => item.provider === provider && item.model === model)?.enabled === (decision === 'enabled')) return
    const next = this.overrides().filter(item => item.provider !== provider || item.model !== model)
    next.push({ provider, model, enabled: decision === 'enabled' })
    this.stageOverrides(next)
  }

  addModelException(provider: string, model: string): void {
    if (this.overrides().some(item => item.provider === provider && item.model === model)) return
    this.stageOverrides([...this.overrides(), { provider, model, enabled: true }])
  }

  removeModelException(provider: string, model: string): void {
    const next = this.overrides().filter(item => item.provider !== provider || item.model !== model)
    if (next.length === this.overrides().length) return
    this.stageOverrides(next)
  }

  reset(field: 'enabled' | 'modelPatterns' | 'modelOverrides'): void {
    if (field !== 'modelOverrides') this.drafts.delete(field)
    if (field === 'modelOverrides') this.draftOverrides = undefined
    this.cleared.add(field)
    this.failed = false
    this.publish()
  }

  discard(): void {
    this.drafts.clear()
    this.draftOverrides = undefined
    this.cleared.clear()
    this.failed = false
    this.publish()
  }

  async save(): Promise<void> {
    if (this.saving || !this.scope.getSnapshot().writable) return
    const writes = new Set<'enabled' | 'modelPatterns' | 'modelOverrides'>([
      ...this.drafts.keys(),
      ...(this.draftOverrides !== undefined ? ['modelOverrides' as const] : []),
      ...this.cleared,
    ])
    if (writes.has('modelPatterns') && parsePatterns(this.drafts.get('modelPatterns') ?? '') === undefined) return
    this.saving = true
    this.failed = false
    this.publish()
    try {
      for (const field of writes) {
        if (this.cleared.has(field)) await this.scope.unset(field)
        else if (field === 'enabled') await this.scope.set(field, this.drafts.get(field) === 'true')
        else if (field === 'modelPatterns') await this.scope.set(field, parsePatterns(this.drafts.get(field) ?? '')!)
        else await this.scope.set(field, this.overrides())
      }
      this.drafts.clear()
      this.draftOverrides = undefined
      this.cleared.clear()
    } catch { this.failed = true }
    this.saving = false
    this.publish()
  }
}
