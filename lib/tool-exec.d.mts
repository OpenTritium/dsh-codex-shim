import { Context } from "@deepseek-ai/cordis";

//#region src/tool-exec.d.ts
declare const name = "opentritium-codex-exec";
declare const inject: string[];
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name };