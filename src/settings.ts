/** Shared Codex simulation settings vocabulary for the host gate and browser client. */

/** Settings namespace persisted by the DSH settings service. */
export const CODEX_SETTINGS_NS = 'opentritium-codex'

/** One exact provider/model decision that overrides the model-pattern default. */
export interface CodexModelOverride {
  /** Registered provider route. */
  provider: string
  /** Provider-owned model id. */
  model: string
  /** Whether this exact route receives the Codex surface. */
  enabled: boolean
}

/** User-editable subset of the Codex environment-simulation settings. */
export interface CodexSettings {
  /** Global simulation switch, when explicitly overridden. */
  enabled?: boolean
  /** Model patterns that enable the simulation, when explicitly overridden. */
  modelPatterns?: string[]
  /** Explicit per-model decisions, when explicitly overridden. */
  modelOverrides?: CodexModelOverride[]
}

/**
 * Build a stable identity for one provider/model route in browser-only collections.
 * @param provider - Registered provider id.
 * @param model - Provider-owned model id.
 * @returns A JSON-safe route key.
 */
export function modelRouteKey(provider: string, model: string): string {
  return JSON.stringify([provider, model])
}
