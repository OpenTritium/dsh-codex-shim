import z from "@deepseek-ai/schemastery";
import { JsonValue, ToolResult, WebSearchResultView } from "@deepseek-ai/dsh-tools";
import { Context } from "@deepseek-ai/cordis";
//#region src/tool-web.d.ts
/** Cordis plugin name. */
declare const name = "opentritium-codex-web";
/** Services required by the Codex web-search adapter. */
declare const inject: string[];
/** Default number of independent `search_query` entries accepted per call. */
declare const DEFAULT_MAX_QUERIES = 4;
/** Default cap on citeable sources returned for each search query. */
declare const DEFAULT_SEARCH_MAX_RESULTS = 5;
/** Default cooperative tool-call timeout budget in milliseconds. */
declare const DEFAULT_SEARCH_TIMEOUT_MS = 30000;
/** Deployment configuration for the Codex web-search adapter. */
interface Config {
  /** Maximum independent `search_query` entries accepted in one call. Defaults to 4. */
  maxQueries?: number;
  /** Upper bound on citeable sources returned for each query. Defaults to 5. */
  searchMaxResults?: number;
  /** Cooperative timeout budget for the complete `web_run` call in milliseconds. Defaults to 30000. */
  searchTimeoutMs?: number;
}
/** Runtime schema for {@link Config}. */
declare const Config: z<Config>;
/** One Codex-style search request. */
interface SearchQuery {
  /** Query text sent to the configured search provider. */
  q: string;
}
/** Arguments accepted by `web_run`. */
interface WebRunArgs {
  /** One or more independent web-search requests. */
  search_query: SearchQuery[];
}
type WebRunSource = {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
};
type WebRunSearchResult = {
  query: string;
  content?: string;
  sources: WebRunSource[];
  truncated: boolean;
};
type WebRunValue = {
  results: WebRunSearchResult[];
};
/** Persisted presentation metadata for one completed `web_run` call. */
interface WebRunMeta {
  results: Array<{
    query: string;
    sources: WebRunSource[];
    answer?: string;
    truncated: boolean;
  }>;
}
/**
 * Validate the operation-specific limits the JSON schema cannot express.
 * @param args - schema-validated model arguments.
 * @param maxQueries - configured maximum number of independent searches.
 * @returns trimmed search-query arguments ready for provider dispatch.
 */
declare function parseWebRunArgs(args: WebRunArgs, maxQueries: number): WebRunArgs;
/**
 * Render all search responses into the model-visible `web_run` result text.
 * @param value - canonical execution result.
 * @returns source-linked text grouped by original query.
 */
declare function formatWebRunOutput(value: WebRunValue): string;
/**
 * Present a pending `web_run` call as a generic search card.
 * @param args - validated model arguments.
 * @returns the replay-safe call view.
 */
declare function presentWebRunCall(args: WebRunArgs): {
  card: 'generic';
  title: string;
  kind: 'search';
  rawInput: SearchQuery[];
};
/**
 * Project canonical output into the grouped web-card metadata retained on
 * `tool/result`.
 * @param value - the validated canonical `web_run` output.
 * @returns the JSON-safe query groups persisted with the result event.
 */
declare function webRunMetaFromValue(value: WebRunValue): JsonValue;
/**
 * Recover grouped search metadata from a durable result, or reject malformed
 * historical data so the generic text presentation can take over.
 * @param meta - opaque metadata from a live or replayed result event.
 * @returns the narrowed grouped metadata, or `undefined` for malformed data.
 */
declare function webRunMetaFromResult(meta: unknown): WebRunMeta | undefined;
/**
 * Present a settled `web_run` as the host's standard web card. Batched calls
 * use the grouped card so every source remains attributable to its query.
 * Error results and old logs without valid metadata keep the standard generic fallback.
 * @param _args - validated `web_run` arguments.
 * @param result - the durable model-facing result and projected metadata.
 * @returns the web result view, or `undefined` for generic fallback.
 */
declare function presentWebRunResult(_args: WebRunArgs, result: ToolResult): WebSearchResultView | undefined;
/**
 * Register the Codex-compatible `web_run` search adapter.
 * @param ctx - context carrying the scoped tool registry and configured web capability.
 * @param config - deployment limits after loader validation.
 */
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, DEFAULT_MAX_QUERIES, DEFAULT_SEARCH_MAX_RESULTS, DEFAULT_SEARCH_TIMEOUT_MS, SearchQuery, WebRunArgs, apply, formatWebRunOutput, inject, name, parseWebRunArgs, presentWebRunCall, presentWebRunResult, webRunMetaFromResult, webRunMetaFromValue };
