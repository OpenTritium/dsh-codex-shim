import { resolve } from "node:path";
//#region src/apply-patch.ts
/**
* Codex `apply_patch` patch-format engine: patch parser, shell-invocation
* detector, and fuzzy-matching applier over an injected file-IO surface.
*
* Ported from the Apache-2.0 `codex-rs/apply-patch` crate (upstream commit
* `636e505c`). Marker strings, chunk semantics, the four-pass line matching,
* and error wording follow upstream so models trained on Codex recognize the
* results. File IO stays injected: consumers bind reads/writes to the fs
* capability and removals/moves to the shell capability, so sandbox and
* filesystem policy apply at the consumer's boundary, not here.
* @module @opentritium/dsh-codex-shim/apply-patch
*/
/** Patch marker starting the patch body. */
const BEGIN_PATCH_MARKER = "*** Begin Patch";
/** Patch marker ending the patch body. */
const END_PATCH_MARKER = "*** End Patch";
/** Marker prefix introducing an added file. */
const ADD_FILE_MARKER = "*** Add File: ";
/** Marker prefix introducing a deleted file. */
const DELETE_FILE_MARKER = "*** Delete File: ";
/** Marker prefix introducing an updated file. */
const UPDATE_FILE_MARKER = "*** Update File: ";
/** Marker prefix introducing the rename target inside an update hunk. */
const MOVE_TO_MARKER = "*** Move to: ";
/** Marker anchoring one update chunk at end of file. */
const EOF_MARKER = "*** End of File";
/** Marker prefix carrying one chunk's single context locator line. */
const CHANGE_CONTEXT_MARKER = "@@ ";
/** The same marker without a locator text. */
const EMPTY_CHANGE_CONTEXT_MARKER = "@@";
/** Marker selecting one Codex remote environment. */
const ENVIRONMENT_ID_MARKER = "*** Environment ID:";
/**
* Parse or apply failure with the wording upstream apply-patch reports. The
* consumer renders `apply_patch verification failed: {message}` around it.
*/
var ApplyPatchError = class extends Error {
	/**
	* @param message - upstream-worded failure detail.
	*/
	constructor(message) {
		super(message);
		this.name = "ApplyPatchError";
	}
};
/** File-update mode supported by the upstream apply-patch engine. */
const ApplyPatchFileUpdateMode = {
	NormalizeToLf: "normalize-to-lf",
	PreserveLineEndings: "preserve-line-endings"
};
/** Strict heredoc invocation: optional one-argument `cd <dir> &&`, then the command. */
const INVOCATION_START = /^(?:cd[ \t]+(?:'([^']*)'|"([^"]*)"|([^\s&]+))[ \t]*&&[ \t]*)?(?:apply_patch|apply-patch|applypatch)[ \t]*(<<-?)[ \t]*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\5[ \t]*$/;
/**
* Detect an apply-patch heredoc invocation in a shell script. A script
* that is itself a bare patch body reports {@link ApplyPatchInvocation} kind
* `implicit-invocation` (upstream rejects it with a rerun instruction); a
* script starting with `apply_patch` whose heredoc does not parse reports
* `malformed-invocation`; everything else reports `none`.
* @param script - the whole shell command text.
* @returns the invocation classification.
*/
function parseInvocation(script) {
	const lines = script.split("\n");
	/* v8 ignore next */
	const first = lines[0] ?? "";
	const match = INVOCATION_START.exec(first);
	if (match === null) return looksLikePatchBody(script) ? { kind: "implicit-invocation" } : { kind: "none" };
	const [, singleQuotedWorkdir, doubleQuotedWorkdir, bareWorkdir, arrows, , delimiter] = match;
	const workdir = singleQuotedWorkdir ?? doubleQuotedWorkdir ?? bareWorkdir;
	const stripTabs = arrows === "<<-";
	const body = [];
	let closed = false;
	for (const line of lines.slice(1)) {
		if (!closed) {
			if ((stripTabs ? line.replace(/^\t+/, "") : line).trim() === delimiter) {
				closed = true;
				continue;
			}
			body.push(line);
			continue;
		}
		if (line.trim() !== "") return { kind: "malformed-invocation" };
	}
	if (!closed) return { kind: "malformed-invocation" };
	return {
		kind: "invocation",
		patch: body.join("\n"),
		...workdir !== void 0 ? { workdir } : {}
	};
}
/**
* Whether a text starts and ends with the patch boundary markers.
* @param text - candidate patch body.
* @returns true when the boundary markers are present.
*/
function looksLikePatchBody(text) {
	const trimmed = text.trim();
	return trimmed.startsWith(BEGIN_PATCH_MARKER) && trimmed.endsWith(END_PATCH_MARKER);
}
/**
* Parse a patch body between its boundary markers into hunks.
* @param text - the patch body (`*** Begin Patch` … `*** End Patch`).
* @returns the parsed hunks without a working directory.
* @throws ApplyPatchError with upstream wording on malformed patches.
*/
function parsePatch(text) {
	const lines = text.trim().split("\n").map((line) => line.replace(/\r$/, ""));
	const first = lines[0]?.trim();
	const last = lines.at(-1)?.trim();
	if (first !== BEGIN_PATCH_MARKER) throw new ApplyPatchError(`invalid patch: The first line of the patch must be '${BEGIN_PATCH_MARKER}'`);
	if (last !== END_PATCH_MARKER) throw new ApplyPatchError(`invalid patch: The last line of the patch must be '${END_PATCH_MARKER}'`);
	const ops = [];
	let mode = { kind: "idle" };
	let environmentId;
	let canReadEnvironmentId = true;
	/** Current body line's 1-based position in the whole patch text. */
	let lineNumber = 1;
	/**
	* Reject an update hunk whose last chunk carries no lines, mirroring
	* upstream's two empty-hunk diagnostics.
	* @param line - the line about to be handled.
	*/
	const ensureUpdateNotEmpty = (line) => {
		if (mode.kind !== "update") return;
		if (mode.op.chunks.length === 0) throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Update file hunk for path '${mode.op.path}' is empty`);
		const tail = mode.op.chunks.at(-1);
		if (tail !== void 0 && tail.oldLines.length === 0 && tail.newLines.length === 0) throw new ApplyPatchError(line === END_PATCH_MARKER ? `invalid hunk at line ${lineNumber}, Update hunk does not contain any lines` : `invalid hunk at line ${lineNumber}, Unexpected line found in update hunk: '${line}'. Every line should start with ' ' (context line), '+' (added line), or '-' (removed line)`);
	};
	for (const line of lines.slice(1, -1)) {
		lineNumber++;
		const trimmed = line.trim();
		if (canReadEnvironmentId && mode.kind === "idle" && trimmed.startsWith(ENVIRONMENT_ID_MARKER)) {
			if (environmentId !== void 0) throw new ApplyPatchError("invalid patch: apply_patch environment_id cannot be specified more than once");
			const value = trimmed.slice(19).trim();
			if (value.length === 0) throw new ApplyPatchError("invalid patch: apply_patch environment_id cannot be empty");
			environmentId = value;
			continue;
		}
		canReadEnvironmentId = false;
		if (trimmed === END_PATCH_MARKER) throw new ApplyPatchError(`invalid patch: The last line of the patch must be '${END_PATCH_MARKER}'`);
		if (trimmed.startsWith(ADD_FILE_MARKER)) {
			ensureUpdateNotEmpty(trimmed);
			const op = {
				kind: "add",
				path: trimmed.slice(14),
				lines: []
			};
			ops.push(op);
			mode = {
				kind: "add",
				op
			};
			continue;
		}
		if (trimmed.startsWith(DELETE_FILE_MARKER)) {
			ensureUpdateNotEmpty(trimmed);
			const op = {
				kind: "delete",
				path: trimmed.slice(17)
			};
			ops.push(op);
			mode = {
				kind: "delete",
				op
			};
			continue;
		}
		if (trimmed.startsWith(UPDATE_FILE_MARKER)) {
			ensureUpdateNotEmpty(trimmed);
			const op = {
				kind: "update",
				path: trimmed.slice(17),
				moveTo: void 0,
				chunks: []
			};
			ops.push(op);
			mode = {
				kind: "update",
				op,
				chunk: void 0
			};
			continue;
		}
		if (mode.kind === "add") {
			if (!line.startsWith("+")) throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Invalid file line in Add File hunk: '${line}'. Lines in Add File hunks must start with '+'`);
			mode.op.lines.push(line.slice(1));
			continue;
		}
		if (mode.kind === "delete") throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected line in Delete File hunk: '${line}'`);
		if (mode.kind === "update") {
			if (trimmed.startsWith(MOVE_TO_MARKER) && mode.op.chunks.length === 0 && mode.chunk === void 0) {
				mode.op.moveTo = trimmed.slice(13);
				continue;
			}
			if (trimmed === EMPTY_CHANGE_CONTEXT_MARKER || trimmed.startsWith(CHANGE_CONTEXT_MARKER)) {
				const chunk = {
					changeContext: trimmed === EMPTY_CHANGE_CONTEXT_MARKER ? void 0 : trimmed.slice(3),
					oldLines: [],
					newLines: [],
					contextLineIndices: [],
					endOfFile: false
				};
				mode.op.chunks.push(chunk);
				mode = {
					kind: "update",
					op: mode.op,
					chunk
				};
				continue;
			}
			if (trimmed === EOF_MARKER) {
				if (mode.chunk === void 0) throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected '${EOF_MARKER}' with no change lines in update hunk for '${mode.op.path}'`);
				mode.chunk.endOfFile = true;
				continue;
			}
			const sigil = line[0];
			if (line === "" || sigil !== void 0 && (sigil === " " || sigil === "+" || sigil === "-")) {
				const text = line === "" ? "" : line.slice(1);
				const chunk = mode.chunk ?? {
					changeContext: void 0,
					oldLines: [],
					newLines: [],
					contextLineIndices: [],
					endOfFile: false
				};
				if (mode.chunk === void 0) mode.op.chunks.push(chunk);
				if (line === "" || sigil === " ") chunk.contextLineIndices.push([chunk.oldLines.length, chunk.newLines.length]);
				if (line === "" || sigil !== "+") chunk.oldLines.push(text);
				if (line === "" || sigil !== "-") chunk.newLines.push(text);
				mode = {
					kind: "update",
					op: mode.op,
					chunk
				};
				continue;
			}
			throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Unexpected line found in update hunk: '${line}'. Every line should start with ' ' (context line), '+' (added line), or '-' (removed line)`);
		}
		throw new ApplyPatchError(`invalid patch: Unexpected line outside any hunk: '${line}'`);
	}
	lineNumber++;
	ensureUpdateNotEmpty(END_PATCH_MARKER);
	for (const op of ops) if (op.kind === "add" && op.lines.length === 0) throw new ApplyPatchError(`invalid hunk at line ${lineNumber}, Add file hunk for path '${op.path}' has no lines`);
	return {
		ops,
		...environmentId !== void 0 ? { environmentId } : {}
	};
}
/**
* Parse an invocation and its patch body in one step.
* @param script - the whole shell command text.
* @returns the parsed patch for an `invocation` result.
* @throws ApplyPatchError when the invocation's patch body does not parse.
*/
function parseInvocationPatch(script) {
	const invocation = parseInvocation(script);
	if (invocation.kind !== "invocation") throw new ApplyPatchError("apply_patch invocation expected");
	return {
		...parsePatch(invocation.patch),
		...invocation.workdir !== void 0 ? { workdir: invocation.workdir } : {}
	};
}
/**
* Normalize one line for a matching pass.
* @param text - the raw line.
* @param pass - matching strictness; 0 exact, 1 trim-end, 2 trim-both, 3 punctuation-normalized.
* @returns the normalized comparison text.
*/
function normalizeForPass(text, pass) {
	if (pass === 0) return text;
	if (pass === 1) return text.trimEnd();
	if (pass === 2) return text.trim();
	return text.trim().replace(/[\u2010-\u2015\u2212]/g, "-").replace(/[\u2018-\u201B]/g, "'").replace(/[\u201C-\u201F]/g, "\"").replace(/[\u00A0\u2002-\u200A\u202F\u205F\u3000]/g, " ");
}
/**
* Find `pattern` inside `lines` at or after `start`, four passes of decreasing
* strictness (exact, trailing-whitespace, full trim, Unicode punctuation), the
* upstream seek_sequence port. An end-of-file pattern first tries the file
* tail.
* @param lines - the file's lines.
* @param pattern - the lines to locate.
* @param start - first candidate index.
* @param eof - whether the pattern anchors at end of file.
* @returns the match start index, or undefined when no pass matches.
*/
function seekSequence(lines, pattern, start, eof, updateFileMode = ApplyPatchFileUpdateMode.NormalizeToLf) {
	if (pattern.length === 0) return start;
	if (pattern.length > lines.length) return void 0;
	const eofStart = lines.length - pattern.length;
	const searchStart = eof ? updateFileMode === ApplyPatchFileUpdateMode.PreserveLineEndings ? Math.max(eofStart, start) : eofStart : start;
	for (let pass = 0; pass < 4; pass++) for (let i = searchStart; i + pattern.length <= lines.length; i++) {
		let ok = true;
		for (let p = 0; p < pattern.length; p++) {
			/* v8 ignore start */
			const fileLine = lines[i + p] ?? "";
			const patternLine = pattern[p] ?? "";
			/* v8 ignore stop */
			if (normalizeForPass(fileLine, pass) !== normalizeForPass(patternLine, pass)) {
				ok = false;
				break;
			}
		}
		if (ok) return i;
	}
}
var SourceFile = class SourceFile {
	lines;
	preferredEnding;
	constructor(lines, preferredEnding) {
		this.lines = lines;
		this.preferredEnding = preferredEnding;
	}
	static parse(contents) {
		const lines = [];
		let preferredEnding;
		let lineStart = 0;
		let cursor = 0;
		while (cursor < contents.length) {
			const code = contents.charCodeAt(cursor);
			let ending;
			let endingLength = 0;
			if (code === 13 && contents.charCodeAt(cursor + 1) === 10) {
				ending = "\r\n";
				endingLength = 2;
			} else if (code === 13) {
				ending = "\r";
				endingLength = 1;
			} else if (code === 10) {
				ending = "\n";
				endingLength = 1;
			}
			if (ending === void 0) {
				cursor++;
				continue;
			}
			preferredEnding ??= ending;
			lines.push({
				text: contents.slice(lineStart, cursor),
				ending
			});
			cursor += endingLength;
			lineStart = cursor;
		}
		if (lineStart < contents.length) lines.push({
			text: contents.slice(lineStart),
			ending: void 0
		});
		return new SourceFile(lines, preferredEnding ?? "\n");
	}
	lineTexts() {
		return this.lines.map((line) => line.text);
	}
	applyReplacements(replacements) {
		const next = [];
		let sourceIndex = 0;
		for (const replacement of replacements) {
			next.push(...this.lines.slice(sourceIndex, replacement.start));
			next.push(...replacement.newLines.map((text) => ({
				text,
				ending: this.preferredEnding
			})));
			sourceIndex = replacement.start + replacement.oldLength;
		}
		next.push(...this.lines.slice(sourceIndex));
		this.lines = next.map((line) => ({
			...line,
			ending: line.ending ?? this.preferredEnding
		}));
	}
	intoContents() {
		return this.lines.map((line) => `${line.text}${line.ending}`).join("");
	}
};
function computeReplacements(originalLines, path, chunks, updateFileMode) {
	const replacements = [];
	let lineIndex = 0;
	for (const chunk of chunks) {
		if (chunk.changeContext !== void 0) {
			const index = seekSequence(originalLines, [chunk.changeContext], lineIndex, false, updateFileMode);
			if (index === void 0) throw new ApplyPatchError(`Failed to find context '${chunk.changeContext}' in ${path}`);
			lineIndex = index + 1;
		}
		if (chunk.oldLines.length === 0) {
			const insertionIndex = updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf ? originalLines.at(-1) === "" ? originalLines.length - 1 : originalLines.length : originalLines.length;
			replacements.push({
				start: insertionIndex,
				oldLength: 0,
				newLines: chunk.newLines
			});
			continue;
		}
		let pattern = chunk.oldLines;
		let newSlice = chunk.newLines;
		let found = seekSequence(originalLines, pattern, lineIndex, chunk.endOfFile, updateFileMode);
		if (found === void 0 && pattern.at(-1) === "") {
			pattern = pattern.slice(0, -1);
			if (newSlice.at(-1) === "") newSlice = newSlice.slice(0, -1);
			found = seekSequence(originalLines, pattern, lineIndex, chunk.endOfFile, updateFileMode);
		}
		if (found === void 0) throw new ApplyPatchError(`Failed to find expected lines in ${path}:\n${chunk.oldLines.join("\n")}`);
		if (updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf) replacements.push({
			start: found,
			oldLength: pattern.length,
			newLines: newSlice
		});
		else {
			let oldStart = 0;
			let newStart = 0;
			for (const [oldContext, newContext] of chunk.contextLineIndices ?? []) {
				if (oldContext >= pattern.length || newContext >= newSlice.length) break;
				if (oldStart !== oldContext || newStart !== newContext) replacements.push({
					start: found + oldStart,
					oldLength: oldContext - oldStart,
					newLines: newSlice.slice(newStart, newContext)
				});
				oldStart = oldContext + 1;
				newStart = newContext + 1;
			}
			if (oldStart !== pattern.length || newStart !== newSlice.length) replacements.push({
				start: found + oldStart,
				oldLength: pattern.length - oldStart,
				newLines: newSlice.slice(newStart)
			});
		}
		lineIndex = found + pattern.length;
	}
	replacements.sort((left, right) => left.start - right.start);
	return replacements;
}
function applyReplacements(lines, replacements) {
	const updated = [...lines];
	for (const replacement of [...replacements].reverse()) updated.splice(replacement.start, replacement.oldLength, ...replacement.newLines);
	return updated;
}
/**
* Derive a file's post-patch content from its original content.
* @param original - the file's current full text.
* @param path - display path for error wording.
* @param chunks - the hunk's ordered chunks.
* @param updateFileMode - whether to normalize or retain source line endings.
* @returns the new full text in the selected upstream mode.
* @throws ApplyPatchError with upstream wording when a chunk does not match.
*/
function deriveUpdatedContent(original, path, chunks, updateFileMode = ApplyPatchFileUpdateMode.NormalizeToLf) {
	if (updateFileMode === ApplyPatchFileUpdateMode.NormalizeToLf) {
		const originalLines = original.split("\n");
		if (originalLines.at(-1) === "") originalLines.pop();
		const updated = applyReplacements(originalLines, computeReplacements(originalLines, path, chunks, updateFileMode));
		if (updated.at(-1) !== "") updated.push("");
		return updated.join("\n");
	}
	const sourceFile = SourceFile.parse(original);
	sourceFile.applyReplacements(computeReplacements(sourceFile.lineTexts(), path, chunks, updateFileMode));
	return sourceFile.intoContents();
}
/**
* Apply one parsed patch through the injected IO.
* @param patch - the parsed patch.
* @param cwd - the session working directory the patch resolves against.
* @param io - consumer-bound file operations.
* @returns the affected paths, as written in the patch.
* @throws ApplyPatchError with upstream wording on unresolvable hunks.
*/
async function applyPatch(patch, cwd, io, updateFileMode = ApplyPatchFileUpdateMode.NormalizeToLf) {
	const effectiveCwd = patch.workdir !== void 0 ? resolve(cwd, patch.workdir) : cwd;
	const seen = /* @__PURE__ */ new Set();
	for (const op of patch.ops) {
		const identity = resolve(effectiveCwd, op.kind === "update" && op.moveTo !== void 0 ? op.moveTo : op.path);
		if (seen.has(identity)) throw new ApplyPatchError(`invalid patch: multiple operations target ${identity}`);
		seen.add(identity);
	}
	if (patch.ops.length === 0) throw new ApplyPatchError("No files were modified.");
	const operations = [];
	const added = [];
	const modified = [];
	const deleted = [];
	for (const op of patch.ops) {
		if (op.kind === "add") {
			operations.push({
				kind: "add",
				path: op.path,
				content: op.lines.map((line) => `${line}\n`).join("")
			});
			added.push(op.path);
			continue;
		}
		if (op.kind === "delete") {
			try {
				await io.readText(op.path, effectiveCwd);
			} catch (error) {
				throw new ApplyPatchError(`Failed to read ${resolve(effectiveCwd, op.path)}: ${String(error)}`);
			}
			operations.push({
				kind: "delete",
				path: op.path
			});
			deleted.push(op.path);
			continue;
		}
		let original;
		try {
			original = await io.readText(op.path, effectiveCwd);
		} catch (error) {
			throw new ApplyPatchError(`Failed to read file to update ${op.path}: ${String(error)}`);
		}
		operations.push({
			kind: "update",
			path: op.path,
			moveTo: op.moveTo,
			content: deriveUpdatedContent(original, op.path, op.chunks, updateFileMode)
		});
		modified.push(op.moveTo ?? op.path);
	}
	for (const operation of operations) {
		if (operation.kind === "add") {
			await io.writeText(operation.path, effectiveCwd, operation.content);
			continue;
		}
		if (operation.kind === "delete") {
			await io.remove(operation.path, effectiveCwd);
			continue;
		}
		if (operation.moveTo !== void 0) {
			await io.moveText(operation.path, operation.moveTo, effectiveCwd, operation.content);
			continue;
		}
		await io.writeText(operation.path, effectiveCwd, operation.content);
	}
	return {
		added,
		modified,
		deleted
	};
}
/**
* Format the git-style success summary upstream prints after applying.
* @param affected - the affected paths.
* @returns the `Success. Updated the following files:` summary text.
*/
function formatSummary(affected) {
	const lines = ["Success. Updated the following files:"];
	for (const path of affected.added) lines.push(`A ${path}`);
	for (const path of affected.modified) lines.push(`M ${path}`);
	for (const path of affected.deleted) lines.push(`D ${path}`);
	return lines.join("\n");
}
//#endregion
export { ApplyPatchError, ApplyPatchFileUpdateMode, applyPatch, deriveUpdatedContent, formatSummary, parseInvocation, parseInvocationPatch, parsePatch, seekSequence };
