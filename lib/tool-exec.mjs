import { ApplyPatchError, applyPatch, formatSummary, parseInvocation, parsePatch } from "./apply-patch.mjs";
import { basename, dirname, extname, isAbsolute, resolve } from "node:path";
import { ESCALATION_TARGETS, approveEscalation, canonicalPath, escalationHintMarker, sandboxDenialMarker, validateEscalationArgs } from "@deepseek-ai/dsh-sandbox";
import { AttachmentError, AttachmentId } from "@deepseek-ai/dsh-attachment";
import { FsError } from "@deepseek-ai/dsh-fs";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { randomBytes } from "node:crypto";
//#region src/diff.ts
/** Present the complete before/after content when the host exposes no public hunk helper. */
function computeHunkDiffs(path, before, after) {
	if (before === after) return [];
	return [{
		path,
		oldText: before.length === 0 ? null : before,
		newText: after
	}];
}
/** Recover valid non-empty diff metadata from a durable result. */
function diffsFromMeta(meta) {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return void 0;
	const value = meta.diffs;
	if (!Array.isArray(value) || value.length === 0) return void 0;
	return value.every((entry) => {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) return false;
		const { path, oldText, newText } = entry;
		return typeof path === "string" && (oldText === null || typeof oldText === "string") && typeof newText === "string";
	}) ? value : void 0;
}
//#endregion
//#region src/image.ts
/** Image-reading helpers built only on public filesystem and attachment services. */
const IMAGE_TYPES = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".gif": "image/gif"
};
/** Render a stored image into model-visible text and image blocks. */
function imageReadContent(value) {
	const image = {
		attachmentId: AttachmentId(value.image.attachmentId),
		mediaType: value.image.mediaType,
		bytes: value.image.bytes,
		width: value.image.width,
		height: value.image.height,
		...value.image.name === void 0 ? {} : { name: value.image.name }
	};
	return [{
		type: "text",
		text: `<path>${value.path}</path>\n<type>image</type>\n<content>\n${image.mediaType} image, ${image.width}x${image.height} px, ${image.bytes} bytes\n</content>`
	}, {
		type: "image",
		attachment: image
	}];
}
/** Read, validate, and persist a local image through public DSH capabilities. */
async function readImage(ctx, exec, path) {
	if (path.trim().length === 0) throw new Error("path must be a non-empty string");
	const mediaType = IMAGE_TYPES[extname(path).toLowerCase()];
	if (mediaType === void 0) throw new Error(`cannot read "${path}": view_image only accepts PNG/JPEG/WebP/GIF paths`);
	const attachments = ctx.get("attachments");
	if (attachments === void 0) throw new Error(`cannot read "${path}" as an image: no attachment service is mounted`);
	if (!attachments.imageLimits.mediaTypes.includes(mediaType)) throw new Error(`cannot read "${path}": ${mediaType} images are not accepted by this deployment`);
	const target = await ctx.fs.resolve(path, {
		cwd: exec.agent?.session.header.cwd,
		signal: exec.signal
	});
	const info = await ctx.fs.stat(target, exec.signal);
	if (info === void 0) {
		ctx.emit("fs/observed", target, { kind: "absent" }, exec);
		throw new FsError(`cannot read "${target.displayPath}": not found`, "FS_NOT_FOUND");
	}
	if (info.type !== "file") throw new FsError(`cannot read "${target.displayPath}": not a regular file`, "FS_NOT_REGULAR_FILE");
	const data = await ctx.fs.readBytes(target, exec.signal, Math.min(attachments.imageLimits.maxImageBytes, attachments.imageLimits.maxMessageImageBytes));
	let ref;
	try {
		ref = await attachments.saveImage({
			data,
			mediaType,
			name: basename(target.displayPath)
		});
	} catch (error) {
		if (!(error instanceof AttachmentError) || error.code !== "IMAGE_TYPE_MISMATCH") throw error;
		throw new Error(`cannot read "${target.displayPath}": the extension does not match the image bytes`, { cause: error });
	}
	ctx.emit("fs/observed", target, {
		kind: "present",
		version: info.version
	}, exec);
	return {
		path: target.displayPath,
		image: {
			attachmentId: ref.attachmentId,
			mediaType: ref.mediaType,
			bytes: ref.bytes,
			width: ref.width,
			height: ref.height,
			...ref.name === void 0 ? {} : { name: ref.name }
		}
	};
}
//#endregion
//#region src/exec-output.ts
/**
* Codex unified-exec output vocabulary: the canonical value one exec call
* returns, the approximate token accounting, and the `response_text` layout
* upstream `ExecCommandToolOutput` renders.
* @module @opentritium/dsh-codex-shim/exec-output
*/
/** Characters per token in upstream's approximate accounting. */
const APPROX_BYTES_PER_TOKEN = 4;
/** Default output token budget, matching upstream's 10000-token default. */
const DEFAULT_MAX_OUTPUT_TOKENS = 1e4;
/** Upstream's 1 MiB unified-exec collection ceiling at four bytes per token. */
const MAX_OUTPUT_TOKENS = 1024 * 1024 / APPROX_BYTES_PER_TOKEN;
/**
* Approximate the token count of one output text the way upstream's
* `approx_token_count` does — length over four, rounded up.
* @param text - the output text.
* @returns the approximate token count.
*/
function approxTokenCount(text) {
	return Math.ceil(Buffer.byteLength(text) / APPROX_BYTES_PER_TOKEN);
}
/**
* Mint a chunk identifier, opaque to the model.
* @returns a short random hex identifier.
*/
function newChunkId() {
	return randomBytes(3).toString("hex");
}
/**
* Validate and cap a model-supplied output budget.
* @param requested - the optional `max_output_tokens` argument.
* @returns the defaulted budget, capped at the unified-exec collection limit.
*/
function resolveMaxOutputTokens(requested) {
	if (requested === void 0) return DEFAULT_MAX_OUTPUT_TOKENS;
	if (!Number.isSafeInteger(requested) || requested < 0) throw new Error("invalid max_output_tokens: expected a non-negative integer");
	return Math.min(requested, MAX_OUTPUT_TOKENS);
}
/** Return the longest prefix whose UTF-8 encoding fits one byte budget. */
function prefixWithinBytes(text, budget) {
	let bytes = 0;
	let prefix = "";
	for (const character of text) {
		const width = Buffer.byteLength(character);
		if (bytes + width > budget) break;
		prefix += character;
		bytes += width;
	}
	return prefix;
}
/** Return the longest suffix whose UTF-8 encoding fits one byte budget. */
function suffixWithinBytes(text, budget) {
	let bytes = 0;
	const suffix = [];
	const characters = Array.from(text);
	for (let index = characters.length - 1; index >= 0; index -= 1) {
		const character = characters[index];
		if (character === void 0) continue;
		const width = Buffer.byteLength(character);
		if (bytes + width > budget) break;
		suffix.push(character);
		bytes += width;
	}
	return suffix.reverse().join("");
}
/**
* Bound one output to its token budget, preserving its UTF-8 prefix and suffix
* around upstream's omission marker.
* @param output - the full captured output.
* @param maxTokens - the caller's output token budget.
* @returns the bounded output and the pre-truncation token count when
*   truncation happened.
*/
function truncateOutput(output, maxTokens) {
	const budget = resolveMaxOutputTokens(maxTokens);
	const originalTokenCount = approxTokenCount(output);
	if (originalTokenCount <= budget) return { output };
	const maxBytes = budget * APPROX_BYTES_PER_TOKEN;
	const leftBytes = Math.floor(maxBytes / 2);
	const rightBytes = maxBytes - leftBytes;
	const omittedTokens = Math.ceil((Buffer.byteLength(output) - maxBytes) / APPROX_BYTES_PER_TOKEN);
	return {
		output: `${prefixWithinBytes(output, leftBytes)}…${omittedTokens} tokens truncated…${suffixWithinBytes(output, rightBytes)}`,
		originalTokenCount
	};
}
/**
* Render one canonical value as the model-facing text, section-joined exactly
* like upstream's `response_text`.
* @param value - the canonical exec outcome.
* @returns the response text block list.
*/
function renderExecOutput(value) {
	const sections = [];
	if (value.chunkId !== void 0) sections.push(`Chunk ID: ${value.chunkId}`);
	sections.push(`Wall time: ${value.wallTimeSeconds.toFixed(4)} seconds`);
	if (value.exitCode !== void 0) sections.push(`Process exited with code ${value.exitCode}`);
	if (value.sessionId !== void 0) sections.push(`Process running with session ID ${value.sessionId}`);
	if (value.originalTokenCount !== void 0) sections.push(`Original token count: ${value.originalTokenCount}`);
	sections.push("Output:");
	sections.push(value.output);
	return [{
		type: "text",
		text: sections.join("\n")
	}];
}
//#endregion
//#region src/exec-render.ts
/**
* Present one `exec_command` call as a terminal card titled by the command.
* @param args - the validated tool arguments.
* @returns the terminal call view.
*/
function presentExecCall(args) {
	return {
		card: "terminal",
		title: args.cmd,
		...args.workdir !== void 0 ? { cwd: args.workdir } : {}
	};
}
/**
* Present one `write_stdin` call as a terminal card on the target session.
* @param args - the validated tool arguments.
* @returns the terminal call view.
*/
function presentWriteStdinCall(args) {
	return {
		card: "terminal",
		title: `write_stdin → session ${args.session_id}`
	};
}
/**
* Present one completed exec result as a terminal card carrying the raw
* response text; errors keep the generic fenced fallback.
* @param _args - the validated tool arguments (unused; the text suffices).
* @param result - the normalized tool result.
* @returns the terminal result view, or undefined for a non-text result.
*/
function presentExecResult(_args, result) {
	const block = result.content[0];
	return block !== void 0 && block.type === "text" ? {
		card: "terminal",
		output: block.text
	} : void 0;
}
/**
* Registry of live exec sessions keyed by owning agent and numeric id. The
* first session for an agent attaches a disposal effect on that agent's own
* context, so abandoned sessions die with their owner.
*/
var ExecSessionRegistry = class {
	byAgent = /* @__PURE__ */ new Map();
	nextId = /* @__PURE__ */ new Map();
	cleanedUp = /* @__PURE__ */ new WeakSet();
	accessSequence = 0;
	/**
	* Publish one live process as the agent's next numbered session.
	* @param agent - the exact owning agent.
	* @param proc - the live process handle.
	* At the upstream cap, the least-recently-used completed process is removed;
	* when every retained process is live, the least-recently-used process is
	* killed and awaited before this call settles.
	* @returns the published session after any evicted process reaches quiescence.
	*/
	async register(agent, proc) {
		this.ensureOwnerCleanup(agent);
		const id = (this.nextId.get(agent) ?? 0) + 1;
		this.nextId.set(agent, id);
		const session = {
			id,
			proc,
			lastUsed: ++this.accessSequence
		};
		const owned = this.byAgent.get(agent) ?? /* @__PURE__ */ new Map();
		const evicted = owned.size < 64 ? void 0 : this.evictionCandidate(owned);
		if (evicted !== void 0) owned.delete(evicted.id);
		owned.set(id, session);
		this.byAgent.set(agent, owned);
		if (evicted !== void 0) {
			evicted.proc.kill();
			await evicted.proc.done;
			if (this.byAgent.get(agent) !== owned) throw new Error("exec session owner was disposed while registering a process");
		}
		return session;
	}
	/**
	* Look up one of the agent's sessions.
	* @param agent - the exact owning agent.
	* @param id - the numeric session id.
	* @returns the session, or undefined when it already finished or never existed.
	*/
	get(agent, id) {
		const session = this.byAgent.get(agent)?.get(id);
		if (session !== void 0) session.lastUsed = ++this.accessSequence;
		return session;
	}
	/**
	* Drop one finished session from the registry.
	* @param agent - the exact owning agent.
	* @param id - the numeric session id.
	*/
	release(agent, id) {
		this.byAgent.get(agent)?.delete(id);
	}
	/** Select the oldest completed session, otherwise the oldest live session. */
	evictionCandidate(owned) {
		const sessions = [...owned.values()].sort((left, right) => left.lastUsed - right.lastUsed);
		const candidate = sessions.find((session) => session.proc.status !== "running") ?? sessions[0];
		if (candidate === void 0) throw new Error("cannot evict from an empty exec session registry");
		return candidate;
	}
	/**
	* Attach the one-per-agent disposal effect that kills every live session.
	* @param agent - the exact owning agent.
	*/
	ensureOwnerCleanup(agent) {
		if (this.cleanedUp.has(agent)) return;
		this.cleanedUp.add(agent);
		agent.ctx.effect(() => async () => {
			const owned = this.byAgent.get(agent);
			/* v8 ignore start */
			if (owned === void 0) return;
			/* v8 ignore stop */
			const processes = [...owned.values()].map((session) => session.proc);
			owned.clear();
			this.byAgent.delete(agent);
			this.nextId.delete(agent);
			for (const process of processes) process.kill();
			await Promise.all(processes.map((process) => process.done));
		}, "codex-exec.ownerCleanup()");
	}
};
//#endregion
//#region src/exec-shell.ts
/** Platform-specific shell helpers used only for apply-patch file mutations. */
/** Quote one path for the active shell's string literal syntax. */
function shellQuote(path, platform = process.platform) {
	return platform === "win32" ? `'${path.replaceAll("'", "''")}'` : `'${path.replaceAll("'", "'\\''")}'`;
}
/** Create a command that recursively creates a parent directory. */
function createDirectoryCommand(parent, platform = process.platform) {
	const quoted = shellQuote(parent, platform);
	return platform === "win32" ? `New-Item -ItemType Directory -Force -Path ${quoted} | Out-Null` : `mkdir -p -- ${quoted}`;
}
/** Create a command that removes one file without following a recursive path. */
function removeFileCommand(path, platform = process.platform) {
	const quoted = shellQuote(path, platform);
	return platform === "win32" ? `Remove-Item -LiteralPath ${quoted} -Force` : `rm -- ${quoted}`;
}
//#endregion
//#region src/tool-exec.ts
/** Cordis plugin name. */
const name = "opentritium-codex-exec";
/** Required prompt, tool, and shell services; fs, sandbox, and approval resolve optionally. */
const inject = [
	"systemPrompt",
	"tools",
	"shell"
];
const APPLY_PATCH_ALIASES = /* @__PURE__ */ new Set(["apply-patch", "applypatch"]);
/** Yield-window floor and ceiling shared by both tools, upstream's range. */
const YIELD_MIN_MS = 250;
const YIELD_MAX_MS = 3e4;
/** write_stdin's empty-poll window: longer, per upstream. */
const POLL_MAX_MS = 3e5;
/** Poll cadence while waiting for output or exit. */
const POLL_TICK_MS = 25;
/** Budget for the engine's rm/mv/mkdir helper commands. */
const HELPER_TIMEOUT_MS = 1e4;
/** Stable non-interactive environment used by upstream unified exec. */
const UNIFIED_EXEC_ENV = {
	NO_COLOR: "1",
	TERM: "dumb",
	LANG: "C.UTF-8",
	LC_CTYPE: "C.UTF-8",
	LC_ALL: "C.UTF-8",
	COLORTERM: "",
	PAGER: "cat",
	GIT_PAGER: "cat",
	GH_PAGER: "cat",
	CODEX_CI: "1"
};
/**
* Clamp a yield window into its effective range.
* @param requested - the model's `yield_time_ms`, when given.
* @param fallback - the default window for this call shape.
* @param max - the ceiling for this call shape.
* @returns the bounded wait in milliseconds.
*/
function clampYield(requested, fallback, max) {
	if (requested === void 0) return fallback;
	if (!Number.isSafeInteger(requested) || requested < 0) throw new Error("invalid yield_time_ms: expected a non-negative integer");
	return Math.min(Math.max(requested, YIELD_MIN_MS), max);
}
/**
* Resolve an explicit workdir against the session cwd, mirroring the bash
* tool's rules: a resolved sandbox root wins, a relative path joins the
* session cwd, and an absolute path passes through.
* @param modelWorkdir - the model's `workdir` argument.
* @param exec - the tool execution carrying the owning agent.
* @param policyWorkspaceRoot - the standing policy's workspace root.
* @returns the resolved absolute workdir, or undefined to let the executor default.
*/
function resolveWorkdir(modelWorkdir, exec, policyWorkspaceRoot) {
	const headerCwd = exec.agent?.session.header.cwd;
	const sessionCwd = policyWorkspaceRoot ?? (headerCwd === void 0 ? void 0 : canonicalPath(headerCwd));
	if (modelWorkdir === void 0) return sessionCwd;
	if (sessionCwd !== void 0 && !isAbsolute(modelWorkdir)) return resolve(sessionCwd, modelWorkdir);
	return modelWorkdir;
}
/**
* Resolve one unresolved execution error into a thrown error with upstream
* wording, so an `apply_patch` failure reads like Codex's.
* @param error - the engine's failure.
*/
function rethrowUpstream(error) {
	if (error instanceof ApplyPatchError) throw new Error(`apply_patch verification failed: ${error.message}`, { cause: error });
	throw error;
}
/**
* Wait for process output or exit inside one yield window, draining deltas.
* The process is never wired to the tool-call signal: a still-running command
* survives the call (and a turn abort) as a background session, matching
* upstream's unified-exec lifetime.
* @param proc - the live process handle.
* @param yieldMs - the bounded wait.
* @param signal - the tool-call signal; it only cuts the wait short.
* @returns the captured output and whether the process settled.
*/
async function drainWindow(proc, yieldMs, signal) {
	const started = Date.now();
	const state = { settled: false };
	const done = proc.done.then(() => {
		state.settled = true;
	});
	let output = "";
	let lossy = false;
	const spillPaths = /* @__PURE__ */ new Set();
	const consume = (read) => {
		output += read.delta;
		lossy ||= read.lossy;
		if (read.stdoutSpillPath !== void 0) spillPaths.add(read.stdoutSpillPath);
		if (read.stderrSpillPath !== void 0) spillPaths.add(read.stderrSpillPath);
	};
	while (!state.settled && !signal.aborted && Date.now() - started < yieldMs) {
		await Promise.race([done, new Promise((resolve) => setTimeout(resolve, POLL_TICK_MS))]);
		consume(proc.readOutput());
	}
	consume(proc.readOutput());
	return {
		output,
		settled: state.settled,
		lossy,
		spillPaths: [...spillPaths]
	};
}
/**
* Append collection and sandbox notices to one process delta before token truncation.
* @param drain - captured output and collection metadata.
* @param proc - process carrying settled sandbox facts.
* @param escalationAvailable - whether this session can ask for a wider retry.
* @returns output with every independent notice represented.
*/
function outputWithNotices(drain, proc, escalationAvailable) {
	const notices = [];
	if (drain.lossy) notices.push(`[some output was dropped from memory; full output: ${drain.spillPaths.length > 0 ? drain.spillPaths.join(", ") : "(unavailable)"}]`);
	if (proc.sandbox?.runnerFailed) notices.push(`[sandbox: the sandbox runner itself failed under ${proc.sandbox.mode} mode — the command did not run; this is a sandbox problem, not a command failure]`);
	else if (proc.sandbox?.denied) {
		notices.push(sandboxDenialMarker(proc.sandbox.mode));
		if (escalationAvailable) notices.push(escalationHintMarker("command"));
	}
	if (notices.length === 0) return drain.output;
	return `${drain.output}${drain.output.length > 0 && !drain.output.endsWith("\n") ? "\n" : ""}${notices.join("\n")}`;
}
/**
* Build the canonical value for one finished or still-running drain.
* @param drain - the drain result.
* @param proc - the live process handle.
* @param startedAt - the call's start time.
* @param maxTokens - the output token budget.
* @param sessionId - the numeric session id, when the process still runs.
* @returns the canonical exec value.
*/
function toValue(drain, proc, startedAt, maxTokens, sessionId, escalationAvailable) {
	const wallTimeSeconds = (Date.now() - startedAt) / 1e3;
	const truncated = truncateOutput(outputWithNotices(drain, proc, escalationAvailable), maxTokens);
	return {
		chunkId: newChunkId(),
		wallTimeSeconds,
		...drain.settled ? { exitCode: proc.exitCode ?? 1 } : {},
		...sessionId !== void 0 ? { sessionId } : {},
		...truncated.originalTokenCount !== void 0 ? { originalTokenCount: truncated.originalTokenCount } : {},
		output: truncated.output
	};
}
/**
* Build the apply-patch IO adapter binding reads/writes to the fs capability
* (policy-fenced) and removals/moves/parent-dir creation to one-shot helper
* shell commands under the same sandbox policy.
* @param runtime - the plugin's composition state.
* @param fs - the mounted filesystem service.
* @param baseCwd - the effective base directory for relative patch paths.
* @param policy - the resolved per-call sandbox policy.
* @param signal - the tool-call signal.
* @returns the engine's IO surface.
*/
function makePatchIo(runtime, fs, policy, signal) {
	const helper = async (command, workdir) => {
		const result = await runtime.ctx.shell.run(runtime.ctx.shell.resolve({
			command,
			workdir,
			timeoutMs: HELPER_TIMEOUT_MS,
			signal,
			...policy !== void 0 ? { sandboxPolicy: policy } : {}
		}));
		if (result.exitCode !== 0) throw new ApplyPatchError(result.stderr.text.trim() || `helper command failed with exit code ${result.exitCode}`);
	};
	const ensureParent = async (path, workdir) => {
		const parent = dirname(path);
		if (parent !== "." && parent !== "") await helper(createDirectoryCommand(parent), workdir);
	};
	return {
		async readText(path, workdir) {
			const target = await fs.resolve(path, {
				cwd: workdir,
				signal
			});
			return fs.readText(target, signal);
		},
		async writeText(path, workdir, content) {
			await ensureParent(path, workdir);
			const target = await fs.resolve(path, {
				cwd: workdir,
				signal
			});
			await fs.writeText(target, content, void 0, signal, policy);
		},
		async remove(path, workdir) {
			await helper(removeFileCommand(path), workdir);
		},
		async moveText(from, to, workdir, content) {
			await ensureParent(to, workdir);
			const target = await fs.resolve(to, {
				cwd: workdir,
				signal
			});
			await fs.writeText(target, content, void 0, signal, policy);
			await helper(removeFileCommand(from), workdir);
		}
	};
}
function recordingPatchIo(io) {
	const preimages = /* @__PURE__ */ new Map();
	const applied = /* @__PURE__ */ new Map();
	const keyOf = (path, workdir) => resolve(workdir, path);
	const optionalPreimage = (path, workdir) => io.readText(path, workdir).then((value) => value, () => void 0);
	const recordBefore = (path, workdir, before) => {
		const key = keyOf(path, workdir);
		const created = {
			path,
			before
		};
		preimages.set(key, created);
		return created;
	};
	return {
		io: {
			async readText(path, workdir) {
				const value = await io.readText(path, workdir);
				recordBefore(path, workdir, value);
				return value;
			},
			async writeText(path, workdir, content) {
				const key = keyOf(path, workdir);
				const change = preimages.get(key) ?? recordBefore(path, workdir, await optionalPreimage(path, workdir));
				await io.writeText(path, workdir, content);
				applied.set(key, {
					path,
					...change.before === void 0 ? {} : { before: change.before },
					after: content
				});
			},
			async remove(path, workdir) {
				const key = keyOf(path, workdir);
				const change = preimages.get(key) ?? recordBefore(path, workdir, await optionalPreimage(path, workdir));
				await io.remove(path, workdir);
				applied.set(key, {
					path,
					...change.before === void 0 ? {} : { before: change.before },
					after: ""
				});
			},
			async moveText(from, to, workdir, content) {
				const sourceKey = keyOf(from, workdir);
				const source = preimages.get(sourceKey) ?? recordBefore(from, workdir, await optionalPreimage(from, workdir));
				await io.moveText(from, to, workdir, content);
				preimages.delete(sourceKey);
				const targetKey = keyOf(to, workdir);
				preimages.set(targetKey, {
					path: to,
					before: source.before
				});
				applied.set(targetKey, {
					path: to,
					...source.before === void 0 ? {} : { before: source.before },
					after: content
				});
			}
		},
		changes: () => [...applied.values()]
	};
}
function patchDiffs(changes) {
	return changes.flatMap((change) => change.before === void 0 ? [{
		path: change.path,
		oldText: null,
		newText: change.after
	}] : computeHunkDiffs(change.path, change.before, change.after));
}
/**
* Handle an `apply_patch` invocation without spawning a process: parse, apply
* through the fs/shell-bound IO, and return the upstream summary as the
* command's output.
* @param runtime - the plugin's composition state.
* @param invocation - the classified invocation.
* @param baseCwd - the effective base directory for the patch's paths.
* @param policy - the resolved per-call sandbox policy.
* @param signal - the tool-call signal.
* @returns the canonical value carrying the summary.
*/
async function runIntercepted(runtime, invocation, baseCwd, policy, signal) {
	if (invocation.kind === "implicit-invocation") throw new Error("patch detected without explicit call to apply_patch. Rerun as [\"apply_patch\", \"<patch>\"]");
	if (invocation.kind === "malformed-invocation") throw new Error("apply_patch handler received invalid patch input");
	const fs = runtime.ctx.get("fs");
	if (fs === void 0) throw new Error("apply_patch requires the filesystem capability; no fs service is mounted in this composition");
	const startedAt = Date.now();
	try {
		const output = await applyPatchInput(runtime, fs, invocation.patch, baseCwd, policy, signal, invocation.workdir);
		return {
			chunkId: newChunkId(),
			wallTimeSeconds: (Date.now() - startedAt) / 1e3,
			output: output.summary
		};
	} catch (error) {
		rethrowUpstream(error);
	}
}
/**
* Parse and apply one raw patch body through the policy-fenced filesystem IO.
* @param runtime - the plugin's composition state.
* @param fs - the mounted filesystem service.
* @param input - the raw `*** Begin Patch` document.
* @param baseCwd - the effective base directory for relative patch paths.
* @param policy - the resolved per-call sandbox policy.
* @param signal - the tool-call signal.
* @param workdir - an optional workdir parsed from a shell interception.
* @returns the upstream patch summary and applied before/after texts.
*/
async function applyPatchInput(runtime, fs, input, baseCwd, policy, signal, workdir) {
	const parsed = parsePatch(input);
	const recording = recordingPatchIo(makePatchIo(runtime, fs, policy, signal));
	return {
		summary: formatSummary(await applyPatch({
			...parsed,
			...workdir !== void 0 ? { workdir } : {}
		}, baseCwd, recording.io)),
		changes: recording.changes()
	};
}
function presentApplyPatchCall(args) {
	try {
		const parsed = parsePatch(args.input);
		const locations = [...new Set(parsed.ops.map((op) => op.kind === "update" && op.moveTo !== void 0 ? op.moveTo : op.path))].map((path) => ({ path }));
		const diffs = parsed.ops.flatMap((op) => {
			if (op.kind === "add") return [{
				path: op.path,
				oldText: null,
				newText: op.lines.map((line) => `${line}\n`).join("")
			}];
			if (op.kind === "delete") return [];
			const path = op.moveTo ?? op.path;
			return op.chunks.map((chunk) => ({
				path,
				oldText: chunk.oldLines.join("\n"),
				newText: chunk.newLines.join("\n")
			}));
		});
		if (diffs.length === 0) return {
			card: "generic",
			title: "Apply patch",
			kind: "edit",
			rawInput: args.input,
			locations
		};
		return {
			card: "diff",
			title: "Apply patch",
			diffs,
			locations
		};
	} catch {
		return {
			card: "generic",
			title: "Apply patch",
			kind: "edit",
			rawInput: args.input
		};
	}
}
function presentApplyPatchResult(_args, result) {
	if (result.isError) return void 0;
	const diffs = diffsFromMeta(result.meta);
	return diffs === void 0 ? void 0 : {
		card: "diff",
		title: "Apply patch",
		diffs
	};
}
/**
* Present a `view_image` request as a read card on its requested path.
* @param args - the validated image-read arguments.
* @returns the generic image-read card.
*/
function presentViewImageCall(args) {
	return {
		card: "generic",
		title: `View image ${args.path}`,
		kind: "read",
		locations: [{ path: args.path }]
	};
}
/**
* Register the Codex unified-exec tools on `ctx.tools`.
* @param ctx - registrant context carrying the prompt, tool, and shell services.
*/
function apply(ctx) {
	const runtime = {
		ctx,
		sessions: new ExecSessionRegistry()
	};
	ctx.on("system-prompt/assemble", async (_assembly, _context, next) => {
		const assembled = await next();
		return {
			...assembled,
			tools: assembled.tools.filter((tool) => !APPLY_PATCH_ALIASES.has(tool.name))
		};
	});
	const defaultMode = ctx.shell.sandboxMode;
	const escalationModes = defaultMode === void 0 ? [] : ESCALATION_TARGETS;
	const sandboxPolicy = defaultMode === void 0 ? void 0 : ctx.get("sandboxPolicy");
	if (defaultMode !== void 0 && sandboxPolicy === void 0) throw new Error("tool-codex-exec: the mounted shell executor confines but ctx.sandboxPolicy is missing");
	/** Resolve the complete standing policy for this call when a confining executor is mounted. */
	const resolveSandboxPolicy = (exec) => sandboxPolicy?.resolve(exec.agent === void 0 ? {} : { session: exec.agent.session });
	/** Whether this exact session can route an escalation question. */
	const canAskForEscalation = (exec) => {
		const approval = ctx.get("approval");
		return exec.agent !== void 0 && approval !== void 0 && (approval.overrideOf(exec.agent.session) ?? approval.config.policy) === "ask";
	};
	/** Resolve a sandbox-escalation request through `ctx.approval`, mirroring the bash tool. */
	const approveExecEscalation = (mode, justification, exec, standingPolicy) => {
		if (escalationModes.length === 0) throw new Error("sandbox_permissions is not available in this composition (no sandboxing executor to escalate)");
		return approveEscalation({
			requestedMode: mode,
			justification,
			effectiveMode: standingPolicy.mode,
			subject: "command"
		}, {
			approver: ctx.get("approval"),
			agent: exec.agent,
			callId: exec.callId,
			toolName: "exec_command",
			signal: exec.signal
		});
	};
	for (const toolName of [
		"apply_patch",
		"apply-patch",
		"applypatch"
	]) ctx.tools.register(defineTool({
		name: toolName,
		description: toolName === "apply_patch" ? "Apply a patch to one or more files. The input must be a raw patch document beginning with *** Begin Patch and ending with *** End Patch." : "Compatibility alias for apply_patch. Apply a raw patch document through the input field.",
		parameters: { input: {
			type: "string",
			required: true,
			description: "Raw patch document. Do not wrap it in a shell command or heredoc."
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					summary: {
						type: "string",
						required: true
					},
					changes: {
						type: "array",
						required: true,
						items: {
							type: "object",
							additionalProperties: false,
							properties: {
								path: {
									type: "string",
									required: true
								},
								before: { type: "string" },
								after: {
									type: "string",
									required: true
								}
							}
						}
					}
				}
			},
			render: (_args, value) => [{
				type: "text",
				text: value.summary
			}],
			presentationMeta: (_args, value) => ({ diffs: patchDiffs(value.changes).map(({ path, oldText, newText }) => ({
				path,
				oldText,
				newText
			})) })
		},
		async execute(args, exec) {
			if (args.input.trim().length === 0) throw new Error(`${toolName} input must be a non-empty patch document`);
			const fs = ctx.get("fs");
			if (fs === void 0) throw new Error(`${toolName} requires the filesystem capability; no fs service is mounted in this composition`);
			const standingPolicy = resolveSandboxPolicy(exec);
			const cwd = standingPolicy?.workspaceRoot ?? exec.agent?.session.header.cwd;
			if (cwd === void 0) throw new Error(`${toolName} requires an owning agent unless the sandbox policy supplies a workspace root`);
			const baseCwd = canonicalPath(cwd);
			try {
				return await applyPatchInput(runtime, fs, args.input, baseCwd, standingPolicy, exec.signal);
			} catch (error) {
				rethrowUpstream(error);
			}
		},
		presentCall: presentApplyPatchCall,
		presentResult: presentApplyPatchResult
	}));
	ctx.inject(["attachments", "fs"], (imageCtx) => {
		imageCtx.tools.register(defineTool({
			name: "view_image",
			description: "View an image from the local filesystem. The image is added to the model context.",
			parameters: { path: {
				type: "string",
				required: true,
				description: "Path to the image file."
			} },
			output: {
				schema: {
					type: "object",
					additionalProperties: false,
					properties: {
						path: {
							type: "string",
							required: true
						},
						image: {
							type: "object",
							additionalProperties: false,
							required: true,
							properties: {
								attachmentId: {
									type: "string",
									required: true
								},
								mediaType: {
									type: "string",
									enum: [
										"image/png",
										"image/jpeg",
										"image/webp",
										"image/gif"
									],
									required: true
								},
								bytes: {
									type: "integer",
									required: true
								},
								width: {
									type: "integer",
									required: true
								},
								height: {
									type: "integer",
									required: true
								},
								name: { type: "string" }
							}
						}
					}
				},
				render: (_args, value) => imageReadContent(value)
			},
			execute: (args, exec) => readImage(imageCtx, exec, args.path),
			presentCall: presentViewImageCall
		}));
	});
	ctx.tools.register(defineTool({
		name: "exec_command",
		description: "Runs a shell command over pipes, returning output or a session ID for ongoing interaction.",
		parameters: {
			cmd: {
				type: "string",
				required: true,
				description: "Shell command to execute."
			},
			workdir: {
				type: "string",
				description: "Working directory for the command. Defaults to the turn cwd."
			},
			yield_time_ms: {
				type: "number",
				description: "Wait before yielding output. Defaults to 10000 ms; effective range is 250-30000 ms."
			},
			max_output_tokens: {
				type: "number",
				description: "Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy."
			},
			...escalationModes.length > 0 ? {
				sandbox_permissions: {
					type: "string",
					enum: [...escalationModes],
					description: "The wider sandbox mode this command needs. Only valid as a one-shot retry of a command the sandbox just denied; requires justification and user approval."
				},
				justification: {
					type: "string",
					description: "Required with sandbox_permissions: one sentence for the user explaining why this exact command needs the wider access."
				}
			} : {}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					chunkId: { type: "string" },
					wallTimeSeconds: {
						type: "number",
						required: true
					},
					exitCode: { type: "integer" },
					sessionId: { type: "integer" },
					originalTokenCount: { type: "integer" },
					output: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => renderExecOutput(value)
		},
		timeoutMs: 32e4,
		async execute(args, exec) {
			if (args.cmd.trim().length === 0) throw new Error("invalid cmd: expected a non-empty string");
			const standingPolicy = resolveSandboxPolicy(exec);
			validateEscalationArgs(args.sandbox_permissions, args.justification);
			const approvedMode = args.sandbox_permissions !== void 0 && args.justification !== void 0 ? await approveExecEscalation(args.sandbox_permissions, args.justification, exec, standingPolicy) : void 0;
			const policy = approvedMode === void 0 ? standingPolicy : {
				...standingPolicy,
				mode: approvedMode
			};
			const workdir = resolveWorkdir(args.workdir, exec, standingPolicy?.workspaceRoot);
			const invocation = parseInvocation(args.cmd);
			if (invocation.kind !== "none") {
				const baseCwd = workdir ?? canonicalPath(exec.agent?.session.header.cwd ?? process.cwd());
				return runIntercepted(runtime, invocation, baseCwd, policy, exec.signal);
			}
			const proc = ctx.shell.start(ctx.shell.resolve({
				command: args.cmd,
				...workdir !== void 0 ? { workdir } : {},
				env: UNIFIED_EXEC_ENV,
				...policy !== void 0 ? { sandboxPolicy: policy } : {}
			}));
			const startedAt = Date.now();
			const yieldMs = clampYield(args.yield_time_ms, 1e4, YIELD_MAX_MS);
			const maxTokens = resolveMaxOutputTokens(args.max_output_tokens);
			const drain = await drainWindow(proc, yieldMs, exec.signal);
			if (!drain.settled) {
				const agent = exec.agent;
				if (agent === void 0) {
					proc.kill();
					throw new Error("exec_command: a non-agent caller cannot hold a running session");
				}
				return toValue(drain, proc, startedAt, maxTokens, (await runtime.sessions.register(agent, proc)).id, canAskForEscalation(exec));
			}
			return toValue(drain, proc, startedAt, maxTokens, void 0, canAskForEscalation(exec));
		},
		presentCall: presentExecCall,
		presentResult: presentExecResult
	}));
	ctx.tools.register(defineTool({
		name: "write_stdin",
		description: "Polls a running unified exec session and returns recent output. The pinned upstream shell capability does not yet expose interactive stdin writes.",
		parameters: {
			session_id: {
				type: "integer",
				required: true,
				description: "Identifier of the running unified exec session."
			},
			chars: {
				type: "string",
				description: "Bytes to write to stdin. Defaults to empty, which polls without writing."
			},
			yield_time_ms: {
				type: "number",
				description: "Wait before yielding output. Non-empty writes default to 250 ms and cap at 30000 ms; empty polls wait 5000-300000 ms by default."
			},
			max_output_tokens: {
				type: "number",
				description: "Output token budget. Defaults to 10000 tokens; larger requests may be capped by policy."
			}
		},
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: {
					chunkId: { type: "string" },
					wallTimeSeconds: {
						type: "number",
						required: true
					},
					exitCode: { type: "integer" },
					sessionId: { type: "integer" },
					originalTokenCount: { type: "integer" },
					output: {
						type: "string",
						required: true
					}
				}
			},
			render: (_args, value) => renderExecOutput(value)
		},
		timeoutMs: 32e4,
		async execute(args, exec) {
			const agent = exec.agent;
			if (agent === void 0) throw new Error("write_stdin requires an owning agent session");
			const session = runtime.sessions.get(agent, args.session_id);
			if (session === void 0) throw new Error(`write_stdin: no exec session with id ${args.session_id}`);
			const write = args.chars ?? "";
			const yieldMs = clampYield(args.yield_time_ms, write.length > 0 ? 250 : 5e3, write.length > 0 ? YIELD_MAX_MS : POLL_MAX_MS);
			if (write.length > 0) throw new Error("write_stdin cannot send input: upstream DeepSeek Harness does not expose interactive stdin on ShellProcess");
			const startedAt = Date.now();
			const maxTokens = resolveMaxOutputTokens(args.max_output_tokens);
			const drain = await drainWindow(session.proc, yieldMs, exec.signal);
			if (drain.settled) {
				runtime.sessions.release(agent, args.session_id);
				return toValue(drain, session.proc, startedAt, maxTokens, void 0, canAskForEscalation(exec));
			}
			return toValue(drain, session.proc, startedAt, maxTokens, args.session_id, canAskForEscalation(exec));
		},
		presentCall: presentWriteStdinCall,
		presentResult: presentExecResult
	}));
}
//#endregion
export { apply, inject, name };
