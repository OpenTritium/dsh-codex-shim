import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

export const OPENAI_WEB_SETTINGS_NS = 'opentritium-openai-web'

export type OpenAIWebField = 'enabled' | 'baseURL' | 'credentialRef' | 'model' | 'searchContextSize'
export type SearchContextSize = 'low' | 'medium' | 'high'

export interface OpenAIWebSettings {
  enabled?: boolean
  baseURL?: string
  credentialRef?: string
  model?: string
  searchContextSize?: SearchContextSize
}

export interface FieldState {
  text: string
  overridden: boolean
  invalid: boolean
}

export interface OpenAIWebSettingsState {
  available: boolean
  writable: boolean
  dirty: boolean
  saving: boolean
  failed: boolean
  enabled: FieldState
  baseURL: FieldState
  credentialRef: FieldState
  model: FieldState
  searchContextSize: FieldState
}

const FIELDS: readonly OpenAIWebField[] = ['enabled', 'baseURL', 'credentialRef', 'model', 'searchContextSize']

/** Stages the hosted-Web provider configuration over its durable settings scope. */
export class OpenAIWebSettingsCardController {
  private readonly drafts = new Map<OpenAIWebField, string>()
  private readonly cleared = new Set<OpenAIWebField>()
  private readonly store: SnapshotStore<OpenAIWebSettingsState>
  private readonly unsubscribe: () => void
  private disposed = false
  private saving = false
  private failed = false

  constructor(private readonly scope: SettingsScope<OpenAIWebSettings>) {
    this.store = createSnapshotStore(this.snapshot())
    this.unsubscribe = scope.subscribe(() => this.publish())
  }

  getStore(): SnapshotStore<OpenAIWebSettingsState> { return this.store }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.unsubscribe()
  }

  edit(field: OpenAIWebField, text: string): void {
    this.drafts.set(field, text)
    this.cleared.delete(field)
    this.failed = false
    this.publish()
  }

  reset(field: OpenAIWebField): void {
    this.drafts.delete(field)
    this.cleared.add(field)
    this.failed = false
    this.publish()
  }

  discard(): void {
    if (this.drafts.size === 0 && this.cleared.size === 0 && !this.failed) return
    this.drafts.clear()
    this.cleared.clear()
    this.failed = false
    this.publish()
  }

  async save(): Promise<void> {
    if (this.saving || !this.scope.getSnapshot().writable) return
    const writes = FIELDS.filter(field => this.drafts.has(field) || this.cleared.has(field))
    if (writes.length === 0 || writes.some(field => this.field(field).invalid)) return
    this.saving = true
    this.failed = false
    this.publish()
    try {
      for (const field of writes) {
        if (this.cleared.has(field) || shouldClear(field, this.drafts.get(field) ?? '')) await this.scope.unset(field)
        else await this.scope.set(field, valueFor(field, this.drafts.get(field) ?? ''))
      }
      this.drafts.clear()
      this.cleared.clear()
    } catch {
      this.failed = true
    } finally {
      this.saving = false
      this.publish()
    }
  }

  private current(): OpenAIWebSettings {
    return this.scope.getSnapshot().value ?? {}
  }

  private field(field: OpenAIWebField): FieldState {
    const snapshot = this.scope.getSnapshot()
    const user = snapshot.user as OpenAIWebSettings | undefined
    const draft = this.drafts.get(field)
    const text = draft ?? formatValue(field, this.current()[field])
    return {
      text,
      overridden: !this.cleared.has(field) && (draft !== undefined || user !== undefined && field in user),
      invalid: draft !== undefined && !validValue(field, draft),
    }
  }

  private snapshot(): OpenAIWebSettingsState {
    const current = this.scope.getSnapshot()
    return {
      available: current.status === 'ready',
      writable: current.writable,
      dirty: this.drafts.size > 0 || this.cleared.size > 0,
      saving: this.saving,
      failed: this.failed,
      enabled: this.field('enabled'),
      baseURL: this.field('baseURL'),
      credentialRef: this.field('credentialRef'),
      model: this.field('model'),
      searchContextSize: this.field('searchContextSize'),
    }
  }

  private publish(): void {
    if (!this.disposed) this.store.set(this.snapshot())
  }
}

function formatValue(field: OpenAIWebField, value: unknown): string {
  if (field === 'enabled') return value === false ? 'false' : 'true'
  return typeof value === 'string' ? value : ''
}

function shouldClear(field: OpenAIWebField, value: string): boolean {
  return field !== 'enabled' && value.trim() === ''
}

function valueFor(field: OpenAIWebField, value: string): boolean | string {
  return field === 'enabled' ? value === 'true' : value.trim()
}

function validValue(field: OpenAIWebField, value: string): boolean {
  if (shouldClear(field, value)) return true
  if (field === 'enabled') return value === 'true' || value === 'false'
  if (field === 'baseURL') return URL.canParse(value.trim())
  if (field === 'searchContextSize') return value === 'low' || value === 'medium' || value === 'high'
  return value.trim().length > 0
}
