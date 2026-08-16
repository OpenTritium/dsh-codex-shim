export const CODEX_SETTINGS_NS = 'codex-shim'

export interface CodexModelOverride {
  provider: string
  model: string
  enabled: boolean
}

export interface CodexSettings {
  enabled?: boolean
  modelPatterns?: string[]
  modelOverrides?: CodexModelOverride[]
}

export function modelRouteKey(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}
