import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/tool-plan.ts
const name = "opentritium-codex-plan";
const inject = ["tools"];
const STATUSES = [
	"pending",
	"in_progress",
	"completed"
];
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
function presentPlanCall(args) {
	return {
		card: "generic",
		title: "Update plan",
		kind: "other",
		rawInput: args.plan
	};
}
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
