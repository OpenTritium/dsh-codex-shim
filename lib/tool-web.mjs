import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/tool-web.ts
/** Cordis plugin name. */
const name = "opentritium-codex-web";
/** Services required by the Codex web-search adapter. */
const inject = ["tools", "web"];
/** Default number of independent `search_query` entries accepted per call. */
const DEFAULT_MAX_QUERIES = 4;
/** Default cap on citeable sources returned for each search query. */
const DEFAULT_SEARCH_MAX_RESULTS = 5;
/** Default cooperative tool-call timeout budget in milliseconds. */
const DEFAULT_SEARCH_TIMEOUT_MS = 3e4;
/** Runtime schema for {@link Config}. */
const Config = z.object({
	maxQueries: z.number().default(4),
	searchMaxResults: z.number().default(5),
	searchTimeoutMs: z.number().default(DEFAULT_SEARCH_TIMEOUT_MS)
});
/**
* Validate a deployment-controlled numeric bound.
* @param field - configuration field being validated.
* @param value - resolved field value.
*/
function assertPositiveInteger(field, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`tool-codex-web: ${field} must be a positive integer`);
}
/**
* Validate the operation-specific limits the JSON schema cannot express.
* @param args - schema-validated model arguments.
* @param maxQueries - configured maximum number of independent searches.
* @returns trimmed search-query arguments ready for provider dispatch.
*/
function parseWebRunArgs(args, maxQueries) {
	if (args.search_query.length === 0) throw new Error("search_query must contain at least one query");
	if (args.search_query.length > maxQueries) throw new Error(`search_query supports at most ${maxQueries} queries per call`);
	return { search_query: args.search_query.map(({ q }) => {
		const query = q.trim();
		if (query.length === 0) throw new Error("search_query.q must be a non-empty string");
		return { q: query };
	}) };
}
/** Display label for a source: its title, else its hostname, else its raw URL. */
function sourceLabel(source) {
	if (source.title !== void 0 && source.title.length > 0) return source.title;
	try {
		return new URL(source.url).hostname;
	} catch {
		return source.url;
	}
}
/** Render one query's source list and optional provider answer. */
function formatOneResult(result) {
	const lines = [`Search results for ${JSON.stringify(result.query)}:`];
	if (result.content !== void 0 && result.content.length > 0) lines.push(result.content);
	if (result.sources.length > 0) {
		lines.push("Sources:");
		for (const source of result.sources) {
			const suffix = [source.snippet, source.publishedAt === void 0 ? void 0 : `(${source.publishedAt})`].filter((part) => part !== void 0 && part.length > 0).join(" ");
			lines.push(`- [${sourceLabel(source)}](${source.url})${suffix.length > 0 ? ` — ${suffix}` : ""}`);
		}
	} else if (result.content === void 0 || result.content.length === 0) lines.push("No results found.");
	if (result.truncated) lines.push(`Showing the first ${result.sources.length} sources for this query.`);
	return lines.join("\n");
}
/**
* Render all search responses into the model-visible `web_run` result text.
* @param value - canonical execution result.
* @returns source-linked text grouped by original query.
*/
function formatWebRunOutput(value) {
	return [...value.results.map(formatOneResult), "Cite the relevant source URLs as Markdown links in your response."].join("\n\n");
}
/**
* Present a pending `web_run` call as a generic search card.
* @param args - validated model arguments.
* @returns the replay-safe call view.
*/
function presentWebRunCall(args) {
	return {
		card: "generic",
		title: "Web search",
		kind: "search",
		rawInput: args.search_query
	};
}
/** Copy the portable web source fields into the persisted tool result. */
function projectSource(source) {
	return {
		url: source.url,
		...source.title === void 0 ? {} : { title: source.title },
		...source.snippet === void 0 ? {} : { snippet: source.snippet },
		...source.publishedAt === void 0 ? {} : { publishedAt: source.publishedAt }
	};
}
/** Bind one configured `ctx.web.search()` response to its originating query. */
function projectSearchResult(query, result) {
	return {
		query,
		...result.content === void 0 ? {} : { content: result.content },
		sources: result.sources.map(projectSource),
		truncated: result.truncated
	};
}
/**
* Project canonical output into the grouped web-card metadata retained on
* `tool/result`.
* @param value - the validated canonical `web_run` output.
* @returns the JSON-safe query groups persisted with the result event.
*/
function webRunMetaFromValue(value) {
	return { results: value.results.map((result) => ({
		query: result.query,
		sources: result.sources.map(projectSource),
		truncated: result.truncated,
		...result.content === void 0 ? {} : { answer: result.content }
	})) };
}
/** Narrow one source from opaque replay metadata. */
function isWebRunSource(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { url, title, snippet, publishedAt } = value;
	return typeof url === "string" && (title === void 0 || typeof title === "string") && (snippet === void 0 || typeof snippet === "string") && (publishedAt === void 0 || typeof publishedAt === "string");
}
/** Narrow one independently searched group from opaque replay metadata. */
function isWebSearchGroup(value) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
	const { query, sources, answer, truncated } = value;
	return typeof query === "string" && query.trim().length > 0 && Array.isArray(sources) && sources.every(isWebRunSource) && (answer === void 0 || typeof answer === "string") && typeof truncated === "boolean";
}
/**
* Recover grouped search metadata from a durable result, or reject malformed
* historical data so the generic text presentation can take over.
* @param meta - opaque metadata from a live or replayed result event.
* @returns the narrowed grouped metadata, or `undefined` for malformed data.
*/
function webRunMetaFromResult(meta) {
	if (typeof meta !== "object" || meta === null || Array.isArray(meta)) return void 0;
	const { results } = meta;
	if (!Array.isArray(results) || results.length === 0 || !results.every(isWebSearchGroup)) return void 0;
	return { results };
}
/**
* Present a settled `web_run` as one grouped web card. Error results and old
* logs without valid metadata keep the standard generic fallback.
* @param _args - validated `web_run` arguments (the grouped view needs no copy).
* @param result - the durable model-facing result and projected metadata.
* @returns the grouped web result view, or `undefined` for generic fallback.
*/
function presentWebRunResult(_args, result) {
	if (result.isError) return void 0;
	webRunMetaFromResult(result.meta);
}
/**
* Register the Codex-compatible `web_run` search adapter.
* @param ctx - context carrying the scoped tool registry and configured web capability.
* @param config - deployment limits after loader validation.
*/
function apply(ctx, config) {
	const resolved = config;
	assertPositiveInteger("maxQueries", resolved.maxQueries);
	assertPositiveInteger("searchMaxResults", resolved.searchMaxResults);
	assertPositiveInteger("searchTimeoutMs", resolved.searchTimeoutMs);
	ctx.tools.register(defineTool({
		name: "web_run",
		description: "Search current information on the web. Pass one or more concise search_query entries with q text. This tool supports searching only; use the returned source URLs for citations.",
		parameters: { search_query: {
			type: "array",
			required: true,
			description: "One or more independent web searches.",
			items: {
				type: "object",
				additionalProperties: false,
				properties: { q: {
					type: "string",
					required: true,
					description: "Search query."
				} }
			}
		} },
		output: {
			schema: {
				type: "object",
				additionalProperties: false,
				properties: { results: {
					type: "array",
					required: true,
					items: {
						type: "object",
						additionalProperties: false,
						properties: {
							query: {
								type: "string",
								required: true
							},
							content: { type: "string" },
							sources: {
								type: "array",
								required: true,
								items: {
									type: "object",
									additionalProperties: false,
									properties: {
										url: {
											type: "string",
											required: true
										},
										title: { type: "string" },
										snippet: { type: "string" },
										publishedAt: { type: "string" }
									}
								}
							},
							truncated: {
								type: "boolean",
								required: true
							}
						}
					}
				} }
			},
			render: (_args, value) => [{
				type: "text",
				text: formatWebRunOutput(value)
			}],
			presentationMeta: (_args, value) => webRunMetaFromValue(value)
		},
		timeoutMs: resolved.searchTimeoutMs,
		isConcurrencySafe: () => true,
		async execute(args, exec) {
			const input = parseWebRunArgs(args, resolved.maxQueries);
			return { results: await Promise.all(input.search_query.map(async ({ q }) => projectSearchResult(q, await ctx.web.search({
				query: q,
				maxResults: resolved.searchMaxResults
			}, exec.signal)))) };
		},
		presentCall: presentWebRunCall,
		presentResult: (args, result) => presentWebRunResult(args, result)
	}));
}
//#endregion
export { Config, DEFAULT_MAX_QUERIES, DEFAULT_SEARCH_MAX_RESULTS, DEFAULT_SEARCH_TIMEOUT_MS, apply, formatWebRunOutput, inject, name, parseWebRunArgs, presentWebRunCall, presentWebRunResult, webRunMetaFromResult, webRunMetaFromValue };
