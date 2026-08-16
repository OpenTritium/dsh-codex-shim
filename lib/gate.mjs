import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region \0codex-shim-persona:./codex-persona.md
var codex_persona_default = "You are a coding agent in a terminal-based Codex-style environment. Be precise, safe, and useful.\n\n## Working style\n\n- Read the request and inspect the relevant repository context before changing files.\n- Keep the user informed with concise, actionable updates when work takes more than one step.\n- Work until the request is resolved; state assumptions and blockers instead of guessing.\n- Prefer the smallest change that fully solves the problem. Preserve existing behavior outside the requested scope.\n\n## Repository instructions\n\n- Repositories may contain `AGENTS.md` files. Read the files that apply to the paths you touch.\n- A more specific `AGENTS.md` overrides a parent file. User and system instructions override repository instructions.\n- Preserve existing user changes. Do not reset, clean, overwrite, or discard work you did not create.\n\n## Tool use\n\n- Use `exec_command` for shell commands. Inspect command output and report failures accurately.\n- Use `write_stdin` to poll an existing command session. This environment may not support interactive stdin writes.\n- Use `apply_patch` for manual edits. A patch is a raw document delimited by `*** Begin Patch` and `*** End Patch`.\n- Use `view_image` when an image must be inspected rather than inferred from its filename.\n- Use `update_plan` for multi-step work and keep its steps current without duplicating the full plan in every update.\n- Use `web_run` for current public information. It supports search only; do not request `open`, `click`, `find`, screenshots, or arbitrary page fetches. Cite returned source URLs when relevant.\n\n## Safety and validation\n\n- Avoid destructive commands. Never reset or remove repository data unless the user explicitly requests it and the target is unambiguous.\n- Do not expose credentials or place secrets in files, logs, prompts, or command arguments.\n- Run focused tests or checks for changed behavior. Do not claim a check passed unless it was run.\n- Keep unrelated failures separate from the requested change and explain any remaining risk.\n\n## Response\n\n- Be concise, direct, and friendly. Lead with the result, then include relevant assumptions, validation, and next steps.\n- Do not narrate routine tool calls or repeat information already visible in the conversation.\n";
//#endregion
//#region src/codex-instructions.ts
/**
* Codex-style persona text adapted from upstream's default instructions
* (Apache-2.0, `codex-rs/protocol/src/prompts/base_instructions/default.md`
* at commit `636e505c`) for the DSH tool surface.
* @module @opentritium/dsh-codex-shim/codex-instructions
*/
const CODEX_PERSONA = "You are a coding agent in a terminal-based Codex-style environment. Be precise, safe, and useful.\n\n## Working style\n\n- Read the request and inspect the relevant repository context before changing files.\n- Keep the user informed with concise, actionable updates when work takes more than one step.\n- Work until the request is resolved; state assumptions and blockers instead of guessing.\n- Prefer the smallest change that fully solves the problem. Preserve existing behavior outside the requested scope.\n\n## Repository instructions\n\n- Repositories may contain `AGENTS.md` files. Read the files that apply to the paths you touch.\n- A more specific `AGENTS.md` overrides a parent file. User and system instructions override repository instructions.\n- Preserve existing user changes. Do not reset, clean, overwrite, or discard work you did not create.\n\n## Tool use\n\n- Use `exec_command` for shell commands. Inspect command output and report failures accurately.\n- Use `write_stdin` to poll an existing command session. This environment may not support interactive stdin writes.\n- Use `apply_patch` for manual edits. A patch is a raw document delimited by `*** Begin Patch` and `*** End Patch`.\n- Use `view_image` when an image must be inspected rather than inferred from its filename.\n- Use `update_plan` for multi-step work and keep its steps current without duplicating the full plan in every update.\n- Use `web_run` for current public information. It supports search only; do not request `open`, `click`, `find`, screenshots, or arbitrary page fetches. Cite returned source URLs when relevant.\n\n## Safety and validation\n\n- Avoid destructive commands. Never reset or remove repository data unless the user explicitly requests it and the target is unambiguous.\n- Do not expose credentials or place secrets in files, logs, prompts, or command arguments.\n- Run focused tests or checks for changed behavior. Do not claim a check passed unless it was run.\n- Keep unrelated failures separate from the requested change and explain any remaining risk.\n\n## Response\n\n- Be concise, direct, and friendly. Lead with the result, then include relevant assumptions, validation, and next steps.\n- Do not narrate routine tool calls or repeat information already visible in the conversation.\n".endsWith("\n") ? codex_persona_default.slice(0, -1) : codex_persona_default;
//#endregion
//#region src/codex-settings.ts
const CODEX_SETTINGS_NS = "codex-shim";
//#endregion
//#region src/gate.ts
const name = "opentritium-codex-gate";
const inject = ["systemPrompt", "tools"];
const CODEX_SETTINGS_NAMESPACE = settingsNamespace(CODEX_SETTINGS_NS);
const Config = z.object({
	enabled: z.boolean().default(true),
	modelPatterns: z.array(z.string()).default(["gpt-5.6-*"]),
	modelOverrides: z.array(z.object({
		provider: z.string(),
		model: z.string(),
		enabled: z.boolean()
	})).default([])
});
const CODEX_TOOL_NAMES = /* @__PURE__ */ new Set([
	"exec_command",
	"write_stdin",
	"apply_patch",
	"apply-patch",
	"applypatch",
	"update_plan",
	"view_image",
	"web_run"
]);
const CODEX_ADVERTISED_TOOL_NAMES = /* @__PURE__ */ new Set([
	"exec_command",
	"write_stdin",
	"apply_patch",
	"update_plan",
	"view_image",
	"web_run"
]);
const CODEX_SHIM_REPLACEMENTS = [
	{
		requires: ["exec_command"],
		masks: [
			"bash",
			"pwsh",
			"read",
			"glob",
			"grep"
		]
	},
	{
		requires: ["exec_command", "write_stdin"],
		masks: [
			"terminal_close",
			"terminal_list",
			"terminal_open",
			"terminal_read",
			"terminal_send",
			"terminal_signal"
		]
	},
	{
		requires: ["apply_patch"],
		masks: [
			"edit",
			"str_replace_editor",
			"write"
		]
	},
	{
		requires: ["view_image"],
		masks: ["read_image"]
	},
	{
		requires: ["update_plan"],
		masks: ["todo_write"]
	},
	{
		requires: ["web_run"],
		masks: ["web_search"]
	}
];
const CODEX_PERSONA_SECTION = "codex:persona";
const CODEX_WEB_RUN_GUIDANCE = [
	"## Web search",
	"Use `web_run` when current public information is needed. Pass one or more concise `search_query` entries such as `{ \"q\": \"...\" }`.",
	"This tool searches only. Do not request `open`, `click`, or `find` operations; cite returned source URLs as Markdown links."
].join("\n");
const CODEX_ENVIRONMENT_CONTEXT = "codex:environment";
const SANDBOX_POLICY_CONTEXT = "sandbox:policy";
const APPROVAL_POLICY_CONTEXT = "approval:policy";
function compilePattern(pattern) {
	if (pattern.length === 0 || pattern === "*") return void 0;
	const source = pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*");
	const regex = new RegExp(source);
	return (model) => regex.test(model);
}
function modelMatches(model, patterns) {
	return patterns.some((pattern) => compilePattern(pattern)?.(model) ?? true);
}
function resolveRoute(assembled, context) {
	const agent = context.agent;
	const header = agent?.session.requestHeader()?.config;
	return {
		provider: assembled.provider ?? header?.provider ?? agent?.options.provider,
		model: assembled.model ?? header?.model ?? agent?.options.model
	};
}
function modelOverrideFor(config, provider, model) {
	if (provider === void 0) return void 0;
	return config.modelOverrides.find((override) => override.provider === provider && override.model === model)?.enabled;
}
function hasCodexTool(ctx, scope) {
	return [...CODEX_TOOL_NAMES].some((toolName) => ctx.tools.get(toolName, scope) !== void 0);
}
function maskedHostToolNames(tools) {
	const names = new Set(tools.map((tool) => tool.name));
	const masked = /* @__PURE__ */ new Set();
	for (const replacement of CODEX_SHIM_REPLACEMENTS) if (replacement.requires.every((name) => names.has(name))) for (const name of replacement.masks) masked.add(name);
	return masked;
}
function personaFor(tools) {
	return tools.some((tool) => tool.name === "web_run") ? `${CODEX_PERSONA}\n\n${CODEX_WEB_RUN_GUIDANCE}` : CODEX_PERSONA;
}
function activationFor(ctx, config, route, scope) {
	if (!config.enabled) return {
		active: false,
		reason: "the global switch is off"
	};
	if (route.model === void 0) return {
		active: false,
		reason: "the model route is unavailable"
	};
	if (!hasCodexTool(ctx, scope)) return {
		active: false,
		reason: "the scope has no Codex tools"
	};
	const override = modelOverrideFor(config, route.provider, route.model);
	if (override !== void 0) return {
		active: override,
		reason: "an exact model override"
	};
	const active = modelMatches(route.model, config.modelPatterns);
	return {
		active,
		reason: active ? "a model pattern match" : "no model pattern match"
	};
}
function renderEnvironmentContext(context) {
	const cwd = context.agent?.session.header.cwd ?? process.cwd();
	const now = /* @__PURE__ */ new Date();
	return [
		"<environment_context>",
		`<cwd>${escapeXml(cwd)}</cwd>`,
		`<current_date>${now.toISOString().slice(0, 10)}</current_date>`,
		`<timezone>${escapeXml(Intl.DateTimeFormat().resolvedOptions().timeZone)}</timezone>`,
		"<shell>bash</shell>",
		"</environment_context>"
	].join("\n");
}
function resolvePermissions(ctx, context) {
	const agent = context.agent;
	const sandboxPolicy = ctx.get("sandboxPolicy");
	const approval = ctx.get("approval");
	return {
		sandbox: agent === void 0 || sandboxPolicy === void 0 ? void 0 : sandboxPolicy.resolve({ session: agent.session }),
		approval: agent === void 0 || approval === void 0 ? void 0 : approval.overrideOf(agent.session) ?? approval.config.policy
	};
}
function widerModes(mode) {
	switch (mode) {
		case "read-only": return ["workspace-write", "danger-full-access"];
		case "workspace-write": return ["danger-full-access"];
		case "danger-full-access": return [];
		/* v8 ignore next 4 -- SandboxMode is a closed typed same-process union. */
		default: throw new Error(`unreachable sandbox mode: ${String(mode)}`);
	}
}
function renderSandboxPolicy(policy) {
	switch (policy.mode) {
		case "read-only": return "Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `read-only`: commands may read files but cannot modify them in the standing mode.";
		case "workspace-write": return `Filesystem sandboxing defines which files can be read or written. \`sandbox_mode\` is \`workspace-write\`: commands may read files and modify files under the session workspace ${JSON.stringify(policy.workspaceRoot)}. Editing files elsewhere requires approval.`;
		case "danger-full-access": return "Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: the DSH file sandbox does not restrict file modifications.";
		/* v8 ignore next 4 -- SandboxMode is a closed typed same-process union. */
		default: {
			const unreachable = policy.mode;
			throw new Error(`unreachable sandbox mode: ${String(unreachable)}`);
		}
	}
}
function renderApprovalPolicy(policy) {
	return policy === "never" ? "Approval policy is currently never. Do not provide `sandbox_permissions` for any reason; commands that request escalation are rejected." : "Approval policy is currently ask. After a command fails because of sandboxing, retry that exact command once with `sandbox_permissions` set to the narrowest advertised wider mode and include a one-sentence `justification`. The request fails closed when no approval channel is available.";
}
function adaptToolSchema(tool, permissions) {
	if (tool.name !== "exec_command") return tool;
	const parameters = tool.parameters;
	const properties = parameters.properties;
	const nextProperties = { ...properties };
	delete nextProperties.prefix_rule;
	const modes = permissions.approval === "ask" && permissions.sandbox !== void 0 ? widerModes(permissions.sandbox.mode) : [];
	const sandboxPermissions = properties.sandbox_permissions;
	if (modes.length === 0 || sandboxPermissions === void 0) {
		delete nextProperties.sandbox_permissions;
		delete nextProperties.justification;
	} else nextProperties.sandbox_permissions = {
		...sandboxPermissions,
		enum: [...modes]
	};
	return {
		...tool,
		parameters: {
			...parameters,
			properties: nextProperties
		}
	};
}
function adaptContexts(contexts, permissions) {
	return contexts.map((context) => {
		if (context.name === SANDBOX_POLICY_CONTEXT && permissions.sandbox !== void 0) return {
			...context,
			text: renderSandboxPolicy(permissions.sandbox)
		};
		if (context.name === APPROVAL_POLICY_CONTEXT && permissions.approval !== void 0) return {
			...context,
			text: renderApprovalPolicy(permissions.approval)
		};
		return context;
	});
}
function escapeXml(text) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function apply(ctx, config) {
	let source = () => config;
	const logger = ctx.logger("codex-gate");
	installSettingsSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, config, {
		expose: "client",
		validate: assertServiceableConfig,
		setSource: (current) => {
			source = current;
		},
		onChange: () => {
			const current = source();
			logger.info("codex-gate: applying route policy (enabled=%s, modelPatterns=%d, modelOverrides=%d)", current.enabled, current.modelPatterns.length, current.modelOverrides.length);
		}
	});
	ctx.on("system-prompt/assemble", async (_assembly, context, next) => {
		const assembled = await next();
		const configNow = source();
		const route = resolveRoute(assembled.variables, context);
		const activation = activationFor(ctx, configNow, route, context.scope);
		logger.debug("codex-gate: route %s/%s uses the %s advertisement (%s)", route.provider ?? "<unknown>", route.model ?? "<unknown>", activation.active ? "Codex" : "host", activation.reason);
		if (!activation.active) return {
			...assembled,
			tools: assembled.tools.filter((tool) => !CODEX_TOOL_NAMES.has(tool.name))
		};
		const permissions = resolvePermissions(ctx, context);
		const maskedHostTools = maskedHostToolNames(assembled.tools);
		return {
			...assembled,
			sections: [{
				name: CODEX_PERSONA_SECTION,
				text: personaFor(assembled.tools)
			}],
			contexts: [{
				name: CODEX_ENVIRONMENT_CONTEXT,
				text: renderEnvironmentContext(context)
			}, ...adaptContexts(assembled.contexts.filter((entry) => entry.name !== CODEX_ENVIRONMENT_CONTEXT), permissions)],
			tools: assembled.tools.filter((tool) => {
				if (CODEX_TOOL_NAMES.has(tool.name)) return CODEX_ADVERTISED_TOOL_NAMES.has(tool.name);
				return !maskedHostTools.has(tool.name);
			}).map((tool) => adaptToolSchema(tool, permissions))
		};
	});
}
function assertServiceableConfig(config) {
	if (config.modelPatterns.some((pattern) => pattern.trim().length === 0 && pattern.length > 0)) throw new Error("codex-gate: model patterns must not be whitespace-only");
	if (config.modelPatterns.includes("") && config.modelPatterns.length > 1) throw new Error("codex-gate: an empty pattern (match-all) cannot combine with other patterns");
	const modelsByProvider = /* @__PURE__ */ new Map();
	for (const override of config.modelOverrides) {
		if (override.provider.trim().length === 0 || override.model.trim().length === 0) throw new Error("codex-gate: model overrides require non-blank provider and model ids");
		const models = modelsByProvider.get(override.provider) ?? /* @__PURE__ */ new Set();
		if (models.has(override.model)) throw new Error(`codex-gate: model override for ${override.provider}/${override.model} is duplicated`);
		models.add(override.model);
		modelsByProvider.set(override.provider, models);
	}
}
//#endregion
export { CODEX_SETTINGS_NAMESPACE, Config, apply, assertServiceableConfig, inject, modelMatches, name };
