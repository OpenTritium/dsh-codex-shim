import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/tool-plan.ts
/** Cordis plugin name. */
const name = "opentritium-codex-plan";
/** The prompt registry receives no row here; the codex persona owns guidance. */
const inject = ["tools"];
/** The valid {@link TodoItem} statuses, as a runtime set for input narrowing. */
const STATUSES = [
	"pending",
	"in_progress",
	"completed"
];
/**
* Validate the value constraints the schema cannot express and build the
* canonical {@link TodoItem}[]: non-empty steps and at most one
* `in_progress` item, exactly upstream's discipline.
* @param raw - the model-supplied plan, already schema-checked.
* @returns the canonical list.
*/
function toTodoList(raw) {
	const todos = [];
	let active = 0;
	for (const item of raw) {
		const step = item.step.trim();
		if (step.length === 0) throw new Error("invalid plan: `step` must be a non-empty string");
		if (item.status === "in_progress") active++;
		todos.push({
			content: step,
			status: item.status
		});
	}
	if (active > 1) throw new Error("invalid plan: at most one step can be in_progress at a time");
	return todos;
}
/**
* Present one `update_plan` call as a generic card over the plan steps.
* @param args - the validated tool arguments.
* @returns the generic call view.
*/
function presentPlanCall(args) {
	return {
		card: "generic",
		title: "Update plan",
		kind: "other",
		rawInput: args.plan
	};
}
/**
* Register the `update_plan` tool on `ctx.tools`.
* @param ctx - registrant context carrying the tool registry.
*/
function apply(ctx) {
	ctx.tools.register(defineTool({
		name: "update_plan",
		description: "Updates the task plan. Provide an optional explanation and a list of plan items, each with a step and status. At most one step can be in_progress at a time.",
		parameters: {
			explanation: {
				type: "string",
				description: "Optional explanation for this plan update."
			},
			plan: {
				type: "array",
				required: true,
				description: "The current plan steps with their statuses.",
				items: {
					type: "object",
					additionalProperties: false,
					properties: {
						step: {
							type: "string",
							required: true,
							description: "Task step text."
						},
						status: {
							type: "string",
							required: true,
							enum: [...STATUSES],
							description: "pending (not started) | in_progress (now) | completed (done)."
						}
					}
				}
			}
		},
		output: {
			schema: { type: "string" },
			render: () => [{
				type: "text",
				text: "Plan updated"
			}]
		},
		execute(args, exec) {
			const todos = toTodoList(args.plan);
			if (exec.agent === void 0) throw new Error("update_plan requires an owning agent session");
			exec.agent.session.append("todo/write", { todos });
			return Promise.resolve("Plan updated");
		},
		presentCall: presentPlanCall
	}));
}
//#endregion
export { apply, inject, name, presentPlanCall };
