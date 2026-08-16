import z from "@deepseek-ai/schemastery";
import { Context } from "@deepseek-ai/cordis";

//#region src/codex-settings.d.ts
interface CodexModelOverride {
  provider: string;
  model: string;
  enabled: boolean;
}
//#endregion
//#region src/gate.d.ts
declare const name = "opentritium-codex-gate";
declare const inject: string[];
declare const CODEX_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
interface Config {
  enabled: boolean;
  /** Empty disables automatic matching; the bundle defaults to `gpt-5.6-*`. */
  modelPatterns: string[];
  modelOverrides: CodexModelOverride[];
}
declare const Config: z<Config>;
declare function modelMatches(model: string, patterns: readonly string[]): boolean;
declare function apply(ctx: Context, config: Config): void;
declare function assertServiceableConfig(config: Config): void;
//#endregion
export { CODEX_SETTINGS_NAMESPACE, Config, apply, assertServiceableConfig, inject, modelMatches, name };