//#region src/apply-patch.d.ts
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
/**
 * Parse or apply failure with the wording upstream apply-patch reports. The
 * consumer renders `apply_patch verification failed: {message}` around it.
 */
declare class ApplyPatchError extends Error {
  /**
   * @param message - upstream-worded failure detail.
   */
  constructor(message: string);
}
/** File-update mode supported by the upstream apply-patch engine. */
declare const ApplyPatchFileUpdateMode: {
  readonly NormalizeToLf: "normalize-to-lf";
  readonly PreserveLineEndings: "preserve-line-endings";
};
/** One file-update mode supported by the upstream apply-patch engine. */
type ApplyPatchFileUpdateMode = (typeof ApplyPatchFileUpdateMode)[keyof typeof ApplyPatchFileUpdateMode];
/** One replacement block inside an update hunk. */
interface PatchUpdateChunk {
  /** Single locator line from `@@ text`, absent for a bare `@@` or no header. */
  readonly changeContext: string | undefined;
  /** Old-side lines: removed lines plus context lines, in order. */
  readonly oldLines: readonly string[];
  /** New-side lines: added lines plus context lines, in order. */
  readonly newLines: readonly string[];
  /** Paired old/new indices that came from explicit context lines. */
  readonly contextLineIndices?: readonly (readonly [number, number])[];
  /** Whether `*** End of File` anchored this chunk at the file tail. */
  readonly endOfFile: boolean;
}
/** Hunk creating a file with the given content lines. */
interface PatchFileAdd {
  readonly kind: 'add';
  /** Path as written in the patch, relative to the patch's working directory. */
  readonly path: string;
  /** Content lines, each a full line of the new file. */
  readonly lines: readonly string[];
}
/** Hunk deleting a file. */
interface PatchFileDelete {
  readonly kind: 'delete';
  /** Path as written in the patch. */
  readonly path: string;
}
/** Hunk updating and optionally renaming a file. */
interface PatchFileUpdate {
  readonly kind: 'update';
  /** Source path as written in the patch. */
  readonly path: string;
  /** Rename destination from `*** Move to:`, when present. */
  readonly moveTo: string | undefined;
  /** Ordered replacement chunks. */
  readonly chunks: readonly PatchUpdateChunk[];
}
/** One parsed hunk. */
type PatchFileOp = PatchFileAdd | PatchFileDelete | PatchFileUpdate;
/** A fully parsed patch body. */
interface ParsedPatch {
  /** Hunks in patch order. */
  readonly ops: readonly PatchFileOp[];
  /** Codex's selected remote environment, parsed but not routed by dsh. */
  readonly environmentId?: string;
  /** Working directory from a `cd <dir> &&` invocation prefix, when present. */
  readonly workdir?: string;
}
/**
 * Classify a shell script against the apply_patch invocation forms. Accepted
 * forms accept the upstream `apply_patch` and `applypatch` spellings plus the
 * common `apply-patch` executable spelling. The whole script is one command
 * with a heredoc, optionally behind one `cd <dir> &&`. A patch
 * body embedded in a larger script is NOT an invocation — upstream runs it in
 * the shell, which is exactly the `apply_patch: command not found` failure
 * this engine exists to intercept in its strict forms only.
 */
type ApplyPatchInvocation = {
  readonly kind: 'invocation';
  readonly patch: string;
  readonly workdir?: string;
} | {
  readonly kind: 'implicit-invocation';
} | {
  readonly kind: 'malformed-invocation';
} | {
  readonly kind: 'none';
};
/**
 * Detect an apply-patch heredoc invocation in a shell script. A script
 * that is itself a bare patch body reports {@link ApplyPatchInvocation} kind
 * `implicit-invocation` (upstream rejects it with a rerun instruction); a
 * script starting with `apply_patch` whose heredoc does not parse reports
 * `malformed-invocation`; everything else reports `none`.
 * @param script - the whole shell command text.
 * @returns the invocation classification.
 */
declare function parseInvocation(script: string): ApplyPatchInvocation;
/**
 * Parse a patch body between its boundary markers into hunks.
 * @param text - the patch body (`*** Begin Patch` … `*** End Patch`).
 * @returns the parsed hunks without a working directory.
 * @throws ApplyPatchError with upstream wording on malformed patches.
 */
declare function parsePatch(text: string): Omit<ParsedPatch, 'workdir'>;
/**
 * Parse an invocation and its patch body in one step.
 * @param script - the whole shell command text.
 * @returns the parsed patch for an `invocation` result.
 * @throws ApplyPatchError when the invocation's patch body does not parse.
 */
declare function parseInvocationPatch(script: string): ParsedPatch;
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
declare function seekSequence(lines: readonly string[], pattern: readonly string[], start: number, eof: boolean, updateFileMode?: ApplyPatchFileUpdateMode): number | undefined;
/**
 * Derive a file's post-patch content from its original content.
 * @param original - the file's current full text.
 * @param path - display path for error wording.
 * @param chunks - the hunk's ordered chunks.
 * @param updateFileMode - whether to normalize or retain source line endings.
 * @returns the new full text in the selected upstream mode.
 * @throws ApplyPatchError with upstream wording when a chunk does not match.
 */
declare function deriveUpdatedContent(original: string, path: string, chunks: readonly PatchUpdateChunk[], updateFileMode?: ApplyPatchFileUpdateMode): string;
/** File operations the applier needs; consumers bind them to their capabilities. */
interface ApplyPatchIo {
  /**
   * Read one file's full text.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   * @returns the file's current content.
   */
  readText(path: string, workdir: string): Promise<string>;
  /**
   * Create or replace one file's full text.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   * @param content - the complete new content.
   */
  writeText(path: string, workdir: string, content: string): Promise<void>;
  /**
   * Delete one file.
   * @param path - path as written in the patch.
   * @param workdir - working directory for relative paths.
   */
  remove(path: string, workdir: string): Promise<void>;
  /**
   * Write a renamed file and remove its source in that order.
   * @param from - source path as written in the patch.
   * @param to - destination path from `*** Move to:`.
   * @param workdir - working directory for relative paths.
   * @param content - the complete replacement content written to `to`.
   */
  moveText(from: string, to: string, workdir: string, content: string): Promise<void>;
}
/** Paths touched by one applied patch, in patch order per category. */
interface ApplyPatchAffected {
  /** Created files. */
  readonly added: readonly string[];
  /** Modified (and optionally renamed) files. */
  readonly modified: readonly string[];
  /** Deleted files. */
  readonly deleted: readonly string[];
}
/**
 * Apply one parsed patch through the injected IO.
 * @param patch - the parsed patch.
 * @param cwd - the session working directory the patch resolves against.
 * @param io - consumer-bound file operations.
 * @returns the affected paths, as written in the patch.
 * @throws ApplyPatchError with upstream wording on unresolvable hunks.
 */
declare function applyPatch(patch: ParsedPatch, cwd: string, io: ApplyPatchIo, updateFileMode?: ApplyPatchFileUpdateMode): Promise<ApplyPatchAffected>;
/**
 * Format the git-style success summary upstream prints after applying.
 * @param affected - the affected paths.
 * @returns the `Success. Updated the following files:` summary text.
 */
declare function formatSummary(affected: ApplyPatchAffected): string;
//#endregion
export { ApplyPatchAffected, ApplyPatchError, ApplyPatchFileUpdateMode, ApplyPatchInvocation, ApplyPatchIo, ParsedPatch, PatchFileAdd, PatchFileDelete, PatchFileOp, PatchFileUpdate, PatchUpdateChunk, applyPatch, deriveUpdatedContent, formatSummary, parseInvocation, parseInvocationPatch, parsePatch, seekSequence };