import { Context } from "@deepseek-ai/cordis";

//#region src/tool-plan.d.ts
declare const name = "opentritium-codex-plan";
declare const inject: string[];
interface UpdatePlanArgs {
  explanation?: string;
  plan: {
    step: string;
    status: string;
  }[];
}
declare function presentPlanCall(args: UpdatePlanArgs): {
  card: 'generic';
  title: string;
  kind: 'other';
  rawInput: UpdatePlanArgs['plan'];
};
declare function apply(ctx: Context): void;
//#endregion
export { apply, inject, name, presentPlanCall };