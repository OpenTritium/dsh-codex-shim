import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";
//#region src/gate.d.ts
/** Cordis plugin name. */
declare const name = "opentritium-codex-gate";
/** The prompt registry whose assemblies this gate rewrites. */
declare const inject: string[];
/** Settings namespace of the codex simulation, layered under `settings.yaml`. */
declare const CODEX_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** One exact provider/model decision that overrides the glob default. */
interface CodexModelOverride {
  /** Registered provider route. */
  provider: string;
  /** Provider-owned model id. */
  model: string;
  /** Whether this exact route receives the Codex surface. */
  enabled: boolean;
}
/** Gate configuration: composition base, user-overridable through settings. */
interface Config {
  /** Global switch; false disables the simulation for every route. */
  enabled: boolean;
  /**
   * Glob-style model patterns (`*` matches any character run, matched
   * anywhere in the model id). Any match activates the codex surface.
   */
  modelPatterns: string[];
  /** Exact route decisions that take precedence over {@link modelPatterns}. */
  modelOverrides: CodexModelOverride[];
}
/** Runtime schema for the gate row. */
declare const Config: z<Config>;
/**
 * Whether one model id matches the configured patterns.
 * @param model - the resolved model id.
 * @param patterns - the configured glob-style patterns.
 * @returns true when any pattern matches.
 */
declare function modelMatches(model: string, patterns: readonly string[]): boolean;
/**
 * Register the codex gate: settings section, environment-context contributor,
 * and the assembly waterfall that swaps the surface per model route.
 * @param ctx - registrant context inside the composition whose scope holds the codex rows.
 * @param config - composition entry config (schema defaults already applied); the settings layer overrides it.
 */
declare function apply(ctx: Context, config: Config): void;
/**
 * Reject a resolved section this gate could not act on: patterns must be
 * usable, checked where the value is written.
 * @param config - the resolved section, schema-valid by construction.
 */
declare function assertServiceableConfig(config: Config): void;
//#endregion
export { CODEX_SETTINGS_NAMESPACE, CodexModelOverride, Config, apply, assertServiceableConfig, inject, modelMatches, name };