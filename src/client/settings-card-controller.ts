import type { SettingsScope, SnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'
import { createSnapshotStore } from '@deepseek-ai/dsh-client-runtime/client'

export const CODEX_SETTINGS_NS = 'opentritium-codex'

export interface ModelOverride { provider: string; model: string; enabled: boolean }
export interface CodexSettings { enabled?: boolean; modelPatterns?: string[]; modelOverrides?: ModelOverride[] }
export interface FieldState { text: string; overridden: boolean; invalid: boolean }
export interface CodexSettingsState {
  available: boolean
  writable: boolean
  dirty: boolean
  saving: boolean
  failed: boolean
  enabled: FieldState
  modelPatterns: FieldState
  modelOverrides: FieldState
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

function parseField(field: keyof CodexSettings, text: string): unknown | undefined {
  if (field === 'enabled') return text === 'true' ? true : text === 'false' ? false : undefined
  if (field === 'modelPatterns') {
    const values = text.split(/\r?\n/).map(value => value.trim()).filter(Boolean)
    return values.includes('*') && values.length > 1 ? undefined : values
  }
  try {
    const value: unknown = JSON.parse(text)
    return validOverrides(value) ? value : undefined
  } catch { return undefined }
}

function formatField(field: keyof CodexSettings, value: unknown): string {
  if (field === 'enabled') return value === true ? 'true' : value === false ? 'false' : ''
  if (field === 'modelPatterns') return Array.isArray(value) ? value.join('\n') : ''
  return JSON.stringify(validOverrides(value) ? value : [], null, 2)
}

/** Owns staged edits for the Codex settings card. */
export class CodexSettingsCardController {
  private readonly drafts = new Map<keyof CodexSettings, string>()
  private readonly cleared = new Set<keyof CodexSettings>()
  private readonly store: SnapshotStore<CodexSettingsState>
  private saving = false
  private failed = false

  constructor(private readonly scope: SettingsScope<CodexSettings>) {
    this.store = createSnapshotStore(this.snapshot())
    scope.subscribe(() => this.publish())
  }

  private publish(): void { this.store.set(this.snapshot()) }

  private field(field: keyof CodexSettings): FieldState {
    const current = this.scope.getSnapshot()
    const draft = this.drafts.get(field)
    const text = draft ?? formatField(field, current.value?.[field])
    return {
      text,
      overridden: this.cleared.has(field) ? false : draft !== undefined || current.user !== undefined && field in (current.user as object),
      invalid: draft !== undefined && parseField(field, draft) === undefined,
    }
  }

  private snapshot(): CodexSettingsState {
    const current = this.scope.getSnapshot()
    const fields = {
      enabled: this.field('enabled'),
      modelPatterns: this.field('modelPatterns'),
      modelOverrides: this.field('modelOverrides'),
    }
    return {
      available: current.status === 'ready', writable: current.writable,
      dirty: this.drafts.size > 0 || this.cleared.size > 0,
      saving: this.saving, failed: this.failed, ...fields,
    }
  }

  getStore(): SnapshotStore<CodexSettingsState> { return this.store }

  edit(field: keyof CodexSettings, text: string): void {
    this.drafts.set(field, text); this.cleared.delete(field); this.failed = false; this.publish()
  }

  reset(field: keyof CodexSettings): void {
    this.drafts.delete(field); this.cleared.add(field); this.failed = false; this.publish()
  }

  discard(): void { this.drafts.clear(); this.cleared.clear(); this.failed = false; this.publish() }

  async save(): Promise<void> {
    if (this.saving || !this.scope.getSnapshot().writable) return
    const writes = [...new Set([...this.drafts.keys(), ...this.cleared])]
    if (writes.some(field => !this.cleared.has(field) && parseField(field, this.drafts.get(field)!) === undefined)) return
    this.saving = true; this.failed = false; this.publish()
    try {
      for (const field of writes) {
        if (this.cleared.has(field)) await this.scope.unset(field)
        else await this.scope.set(field, parseField(field, this.drafts.get(field)!)!)
      }
      this.drafts.clear(); this.cleared.clear()
    } catch { this.failed = true }
    this.saving = false; this.publish()
  }
}
