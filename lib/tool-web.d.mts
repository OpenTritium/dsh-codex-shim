import z from "@deepseek-ai/schemastery";
import { JsonValue, ToolResult, WebSearchResultView } from "@deepseek-ai/dsh-tools";
import { Context } from "@deepseek-ai/cordis";

//#region src/web-run-presentation.d.ts
interface WebRunSource {
  url: string;
  title?: string;
  snippet?: string;
  publishedAt?: string;
}
interface WebRunSearchResult {
  query: string;
  content?: string;
  sources: WebRunSource[];
  truncated: boolean;
}
interface WebRunValue {
  results: WebRunSearchResult[];
}
interface WebRunSearchGroup {
  query: string;
  sources: WebRunSource[];
  answer?: string;
  truncated: boolean;
}
interface WebRunMeta {
  results: WebRunSearchGroup[];
}
//#endregion
//#region src/tool-web.d.ts
declare const name = "opentritium-codex-web";
declare const inject: string[];
declare const DEFAULT_MAX_QUERIES = 4;
declare const DEFAULT_SEARCH_MAX_RESULTS = 5;
declare const DEFAULT_SEARCH_TIMEOUT_MS = 30000;
/** Configuration for the Codex web-search adapter. */
interface Config {
  maxQueries?: number;
  searchMaxResults?: number;
  searchTimeoutMs?: number;
}
declare const Config: z<Config>;
interface SearchQuery {
  q: string;
}
interface WebRunArgs {
  search_query: SearchQuery[];
}
declare function parseWebRunArgs(args: WebRunArgs, maxQueries: number): WebRunArgs;
declare function formatWebRunOutput(value: WebRunValue): string;
declare function presentWebRunCall(args: WebRunArgs): {
  card: 'generic';
  title: string;
  kind: 'search';
  rawInput: SearchQuery[];
};
declare function webRunMetaFromValue(value: WebRunValue): JsonValue;
declare function webRunMetaFromResult(meta: unknown): WebRunMeta | undefined;
declare function presentWebRunResult(_args: WebRunArgs, result: ToolResult): WebSearchResultView | undefined;
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, DEFAULT_MAX_QUERIES, DEFAULT_SEARCH_MAX_RESULTS, DEFAULT_SEARCH_TIMEOUT_MS, SearchQuery, WebRunArgs, apply, formatWebRunOutput, inject, name, parseWebRunArgs, presentWebRunCall, presentWebRunResult, webRunMetaFromResult, webRunMetaFromValue };