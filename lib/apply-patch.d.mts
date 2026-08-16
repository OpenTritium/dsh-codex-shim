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
  constructor(message: string);
}
declare const ApplyPatchFileUpdateMode: {
  readonly NormalizeToLf: "normalize-to-lf";
  readonly PreserveLineEndings: "preserve-line-endings";
};
type ApplyPatchFileUpdateMode = (typeof ApplyPatchFileUpdateMode)[keyof typeof ApplyPatchFileUpdateMode];
interface PatchUpdateChunk {
  readonly changeContext: string | undefined;
  readonly oldLines: readonly string[];
  readonly newLines: readonly string[];
  readonly contextLineIndices?: readonly (readonly [number, number])[];
  readonly endOfFile: boolean;
}
interface PatchFileAdd {
  readonly kind: 'add';
  readonly path: string;
  readonly lines: readonly string[];
}
interface PatchFileDelete {
  readonly kind: 'delete';
  readonly path: string;
}
interface PatchFileUpdate {
  readonly kind: 'update';
  readonly path: string;
  readonly moveTo: string | undefined;
  readonly chunks: readonly PatchUpdateChunk[];
}
type PatchFileOp = PatchFileAdd | PatchFileDelete | PatchFileUpdate;
interface ParsedPatch {
  readonly ops: readonly PatchFileOp[];
  /** Codex's selected remote environment, parsed but not routed by dsh. */
  readonly environmentId?: string;
  readonly workdir?: string;
}
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
declare function parseInvocation(script: string): ApplyPatchInvocation;
declare function parsePatch(text: string): Omit<ParsedPatch, 'workdir'>;
/** Parse an invocation and its patch body; throws when either is malformed. */
declare function parseInvocationPatch(script: string): ParsedPatch;
/** Match through the four upstream normalization passes. */
declare function seekSequence(lines: readonly string[], pattern: readonly string[], start: number, eof: boolean, updateFileMode?: ApplyPatchFileUpdateMode): number | undefined;
declare function deriveUpdatedContent(original: string, path: string, chunks: readonly PatchUpdateChunk[], updateFileMode?: ApplyPatchFileUpdateMode): string;
interface ApplyPatchIo {
  readText(path: string, workdir: string): Promise<string>;
  writeText(path: string, workdir: string, content: string): Promise<void>;
  remove(path: string, workdir: string): Promise<void>;
  moveText(from: string, to: string, workdir: string, content: string): Promise<void>;
}
interface ApplyPatchAffected {
  readonly added: readonly string[];
  readonly modified: readonly string[];
  readonly deleted: readonly string[];
}
declare function applyPatch(patch: ParsedPatch, cwd: string, io: ApplyPatchIo, updateFileMode?: ApplyPatchFileUpdateMode): Promise<ApplyPatchAffected>;
declare function formatSummary(affected: ApplyPatchAffected): string;
//#endregion
export { ApplyPatchAffected, ApplyPatchError, ApplyPatchFileUpdateMode, ApplyPatchInvocation, ApplyPatchIo, ParsedPatch, PatchFileAdd, PatchFileDelete, PatchFileOp, PatchFileUpdate, PatchUpdateChunk, applyPatch, deriveUpdatedContent, formatSummary, parseInvocation, parseInvocationPatch, parsePatch, seekSequence };