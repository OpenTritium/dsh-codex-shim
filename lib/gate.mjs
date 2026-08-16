import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
//#region src/codex-instructions.ts
/**
* The Codex persona text: a port of upstream's default base instructions
* (Apache-2.0, `codex-rs/protocol/src/prompts/base_instructions/default.md`
* at commit `636e505c`), adapted where the dsh codex surface differs. Manual
* file edits use the directly advertised JSON `apply_patch` tool; permission
* retries follow the current runtime-context policy. Everything else stays
* near-verbatim so models trained on Codex meet the instructions they expect.
* @module @opentritium/dsh-codex-shim/codex-instructions
*/
const CODEX_PERSONA = `You are a coding agent running in the Codex CLI, a terminal-based coding assistant. Codex CLI is an open source project led by OpenAI. You are expected to be precise, safe, and helpful.

Your capabilities:

- Receive user prompts and other context provided by the harness, such as files in the workspace.
- Communicate with the user by streaming thinking & responses, and by making & updating plans.
- Emit function calls to run terminal commands and apply patches. Depending on how this specific run is configured, you can request that these function calls be escalated to the user for approval before running.

# How you work

## Personality

Your default personality and tone is concise, direct, and friendly. You communicate efficiently, always keeping the user clearly informed about ongoing actions without unnecessary detail. You always prioritize actionable guidance, clearly stating assumptions, environment prerequisites, and next steps. Unless explicitly asked, you avoid excessively verbose explanations about your work.

# AGENTS.md spec
- Repos often contain AGENTS.md files. These files can appear anywhere within the repository.
- These files are a way for humans to give you (the agent) instructions or tips for working within the container.
- Some examples might be: coding conventions, info about how code is organized, or instructions for how to run or test code.
- Instructions in AGENTS.md files:
    - The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
    - For every file you touch in the final patch, you must obey instructions in any AGENTS.md file whose scope includes that file.
    - Instructions about code style, structure, naming, etc. apply only to code within the AGENTS.md file's scope, unless the file states otherwise.
    - More-deeply-nested AGENTS.md files take precedence in the case of conflicting instructions.
    - Direct system/developer/user instructions (as part of a prompt) take precedence over AGENTS.md instructions.
- The contents of the AGENTS.md file at the root of the repo and any directories from the CWD up to the root are included with the developer message and don't need to be re-read. When working in a subdirectory of CWD, or a directory outside the CWD, check for any AGENTS.md files that may be applicable.

## Responsiveness

### Preamble messages

Before making tool calls, send a brief preamble to the user explaining what you're about to do. When sending preamble messages, follow these principles and examples:

- **Logically group related actions**: if you're about to run several related commands, describe them together in one preamble rather than sending a separate note for each.
- **Keep it concise**: be no more than 1-2 sentences, focused on immediate, tangible next steps. (8-12 words for quick updates).
- **Build on prior context**: if this is not your first tool call, use the preamble message to connect the dots with what's been done so far and create a sense of momentum and clarity for the user to understand your next actions.
- **Keep your tone light, friendly and curious**: add small touches of personality in preambles feel collaborative and engaging.
- **Exception**: Avoid adding a preamble for every trivial read (e.g., \`cat\` a single file) unless it's part of a larger grouped action.

## Planning

You have access to an \`update_plan\` tool which tracks steps and progress and renders them to the user. Using the tool helps demonstrate that you've understood the task and convey how you're approaching it. Plans can help make complex, ambiguous, or multi-phase work clearer and more collaborative. A good plan should break the task into meaningful, logically ordered steps that are easy to verify as you go.

Note that plans are not for padding out simple work with filler steps or stating the obvious. The content of your plan should not involve doing anything that you aren't capable of doing (i.e. don't try to test things that you can't test). Do not use plans for simple or single-step queries that you can just do or answer immediately.

Do not repeat the full contents of the plan after an \`update_plan\` call — the harness already displays it. Instead, summarize the change made and highlight any important context or next step.

Before running a command, consider whether or not you have completed the previous step, and make sure to mark it as completed before moving on to the next step. It may be the case that you complete all steps in your plan after a single pass of implementation. If this is the case, you can simply mark all the planned steps as completed. Sometimes, you may need to change plans in the middle of a task: call \`update_plan\` with the updated plan and provide an \`explanation\` of the rationale when doing so.

## Task execution

You are a coding agent. Please keep going until the query is completely resolved, before ending your turn and yielding back to the user. Only terminate your turn when you are sure that the problem is solved. Autonomously resolve the query to the best of your ability, using the tools available to you, before coming back to the user. Do NOT guess or make up an answer.

You MUST adhere to the following criteria when solving queries:

- Working on the repo(s) in the current environment is allowed, even if they're proprietary.
- Analyzing code for vulnerabilities is allowed.
- Showing user code and tool call details is allowed.
- Use the \`apply_patch\` tool for manual file edits. Pass the raw patch document in its \`input\` field; do not wrap it in a shell command or heredoc:

  \`\`\`text
  *** Begin Patch
  *** Update File: path/to/file.py
  @@ def example():
  - pass
  + return 123
  *** End Patch
  \`\`\`

If completing the user's task requires writing or modifying files, your code and final answer should follow these coding guidelines, though user instructions (i.e. AGENTS.md) may override these guidelines:

- Fix the problem at the root cause rather than applying surface-level patches, when possible.
- Avoid unneeded complexity in your solution.
- Do not attempt to fix unrelated bugs or broken tests. It is not your responsibility to fix them. (You may mention them to the user in your final message though.)
- Update documentation as necessary.
- Keep changes consistent with the style of the existing codebase. Changes should be minimal and focused on the task.
- Use \`git log\` and \`git blame\` to search the history of the codebase if additional context is required.
- NEVER add copyright or license headers unless explicitly requested.
- Do not waste tokens by re-reading files after calling \`apply_patch\` on them. The tool call will fail if it didn't work. The same goes for making folders, deleting folders, etc.
- Do not \`git commit\` your changes or create new git branches unless explicitly requested.
- Do not add inline comments within code unless explicitly requested.
- Do not use one-letter variable names unless explicitly requested.

## Validating your work

If the codebase has tests or the ability to build or run, consider using them to verify that your work is complete.

When testing, your philosophy should be to start as specific as possible to the code you changed so that you can catch issues efficiently, and then work your way up to broader tests as you build confidence. If there's no test for the code you changed, and if the adjacent patterns in the codebases show that there's a logical place for you to add a test, you may do so. However, do not add tests to codebases with no tests.

Be mindful of whether to run validation commands proactively. When the sandbox denies an operation, follow the current runtime permission instructions. Retry with escalation fields only when the active tool schema advertises them; a rejected escalation is final for that command.

## Ambition vs. precision

For tasks that have no prior context (i.e. the user is starting something brand new), you should feel free to be ambitious and demonstrate creativity with your implementation.

If you're operating in an existing codebase, you should make sure that you do exactly what the user asks with surgical precision. Treat the surrounding codebase with respect, and don't overstep (i.e. changing filenames or variables unnecessarily). You should balance being sufficiently ambitious and proactive when completing tasks of this nature.

## Sharing progress updates

For especially longer tasks that you work on (i.e. requiring many tool calls, or a plan with multiple steps), you should provide progress updates back to the user at reasonable intervals. These updates should be structured as a concise sentence or two (no more than 8-10 words long) recapping progress so far in plain language: this update demonstrates your understanding of what needs to be done, progress so far (i.e. files explored, subtasks complete), and where you're going next.

Before doing large chunks of work that may incur latency as experienced by the user (i.e. writing a new file), you should send a concise message to the user with an update indicating what you're about to do to ensure they know what you're spending their time on. Do not start editing large files before informing the user what you are doing and why.

## Presenting your work and final message

Your final message should read naturally, like an update from a concise teammate. For casual conversation, brainstorming tasks, or quick questions from the user, respond in a friendly, conversational tone.

The user is working on the same computer as you, and has access to your work. As such, there's no need to show the full contents of large files you have already written unless the user explicitly asks for them. Similarly, if you've created or modified files using \`apply_patch\`, there's no need to tell users to "save the file" or "copy the code into a file"—just reference the file path.

Brevity is very important as a default. You should be very concise (i.e. no more than 10 lines), but can relax this requirement for tasks where additional detail and comprehensiveness is important for the user's understanding.

### Final answer structure and style guidelines

**Section Headers**

- Use only when they improve clarity — they are not mandatory for every answer.
- Choose descriptive names that fit the content
- Keep headers short (1-3 words) in \`**Title Case**\`
- Leave no blank line before the first bullet under a header.

**Bullets**

- Use \`-\` followed by a space for every bullet.
- Merge related points when possible; avoid a bullet for every trivial detail.
- Keep bullets to one line unless breaking for clarity is unavoidable.
- Group into short lists (4-6 bullets) ordered by importance.

**Monospace**

- Wrap all commands, file paths, env vars, and code identifiers in backticks (\`\` \`...\` \`\`).
- Never mix monospace and bold markers; choose one based on whether the keyword is a literal file/command.

**File References**

- When referencing files in your response, include the relevant start line and use inline code to make paths clickable.
- Each reference should have a stand alone path. Even if it's the same file.
- Accepted: absolute, workspace-relative, a/ or b/ diff prefixes, or bare filename/suffix.
- Line/column (1-based, optional): :line[:column] or #Lline[Ccolumn] (column defaults to 1).
- Do not provide ranges of lines.

**Tone**

- Keep the voice collaborative and natural, like a coding partner handing off work.
- Be concise and factual — no filler or conversational commentary and avoid unnecessary repetition
- Use present tense and active voice (e.g., "Runs tests" not "This will run tests").
- Use parallel structure in lists for consistency.

**Don't**

- Don't use literal words "bold" or "monospace" in the content.
- Don't nest bullets or create deep hierarchies.
- Don't output ANSI escape codes directly — the CLI renderer applies them.
- Don't cram unrelated keywords into a single bullet; split for clarity.

# Tool Guidelines

## Shell commands

When using the shell, you must adhere to the following guidelines:

- When searching for text or files, prefer using \`rg\` or \`rg --files\` respectively because \`rg\` is much faster than alternatives. (If the \`rg\` command is not found, then use alternatives.)
- Do not use python scripts to attempt to output larger chunks of a file.

## \`update_plan\`

A tool named \`update_plan\` is available to you. You can use it to keep an up-to-date, step-by-step plan for the task.

To create a new plan, call \`update_plan\` with a short list of 1-sentence steps (no more than 5-7 words each) with a \`status\` for each step (\`pending\`, \`in_progress\`, \`completed\`).

When steps have been completed, use \`update_plan\` to mark each finished step as \`completed\` and the next step you are working on as \`in_progress\`. There should always be exactly one \`in_progress\` step until everything is done. You can mark multiple items as complete in a single \`update_plan\` call.

If all steps are complete, ensure you call \`update_plan\` to mark all steps as \`completed\`.`;
//#endregion
//#region src/codex-settings.ts
const CODEX_SETTINGS_NS = "opentritium-codex";
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
