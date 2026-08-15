import { Context } from "@deepseek-ai/cordis";
//#region src/tool-exec.d.ts
/** Cordis plugin name. */
declare const name = "opentritium-codex-exec";
/** Required prompt, tool, and shell services; fs, sandbox, and approval resolve optionally. */
declare const inject: string[];
/**
 * Register the Codex unified-exec tools on `ctx.tools`.
 * @param ctx - registrant context carrying the prompt, tool, and shell services.
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };