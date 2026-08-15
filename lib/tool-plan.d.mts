import { Context } from "@deepseek-ai/cordis";
//#region src/tool-plan.d.ts
/** Cordis plugin name. */
declare const name = "opentritium-codex-plan";
/** The prompt registry receives no row here; the codex persona owns guidance. */
declare const inject: string[];
interface UpdatePlanArgs {
  explanation?: string;
  plan: {
    step: string;
    status: string;
  }[];
}
/**
 * Present one `update_plan` call as a generic card over the plan steps.
 * @param args - the validated tool arguments.
 * @returns the generic call view.
 */
declare function presentPlanCall(args: UpdatePlanArgs): {
  card: 'generic';
  title: string;
  kind: 'other';
  rawInput: UpdatePlanArgs['plan'];
};
/**
 * Register the `update_plan` tool on `ctx.tools`.
 * @param ctx - registrant context carrying the tool registry.
 */
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name, presentPlanCall };