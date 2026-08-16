import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
//#region src/web-run-presentation.ts
function objectValue(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function sourceValue(value) {
	const source = objectValue(value);
	if (source === void 0 || typeof source.url !== "string") return void 0;
	if (source.title !== void 0 && typeof source.title !== "string") return void 0;
	if (source.snippet !== void 0 && typeof source.snippet !== "string") return void 0;
	if (source.publishedAt !== void 0 && typeof source.publishedAt !== "string") return void 0;
	return {
		url: source.url,
		...source.title === void 0 ? {} : { title: source.title },
		...source.snippet === void 0 ? {} : { snippet: source.snippet },
		...source.publishedAt === void 0 ? {} : { publishedAt: source.publishedAt }
	};
}
function sourceList(value) {
	if (!Array.isArray(value)) return void 0;
	const sources = value.map(sourceValue);
	return sources.some((source) => source === void 0) ? void 0 : sources;
}
function searchGroupValue(value) {
	const group = objectValue(value);
	if (group === void 0 || typeof group.query !== "string" || group.query.trim().length === 0 || typeof group.truncated !== "boolean") return void 0;
	const sources = sourceList(group.sources);
	if (sources === void 0 || group.answer !== void 0 && typeof group.answer !== "string") return void 0;
	return {
		query: group.query,
		sources,
		truncated: group.truncated,
		...group.answer === void 0 ? {} : { answer: group.answer }
	};
}
function parseWebRunMeta(value) {
	const object = objectValue(value);
	if (object === void 0 || !Array.isArray(object.results) || object.results.length === 0) return void 0;
	const results = object.results.map(searchGroupValue);
	return results.some((result) => result === void 0) ? void 0 : { results };
}
//#endregion
//#region src/tool-web.ts
const name = "opentritium-codex-web";
const inject = ["tools", "web"];
const DEFAULT_MAX_QUERIES = 4;
const DEFAULT_SEARCH_MAX_RESULTS = 5;
const DEFAULT_SEARCH_TIMEOUT_MS = 3e4;
const Config = z.object({
	maxQueries: z.number().default(4),
	searchMaxResults: z.number().default(5),
	searchTimeoutMs: z.number().default(DEFAULT_SEARCH_TIMEOUT_MS)
});
function assertPositiveInteger(field, value) {
	if (!Number.isInteger(value) || value < 1) throw new Error(`tool-codex-web: ${field} must be a positive integer`);
}
function parseWebRunArgs(args, maxQueries) {
	if (args.search_query.length === 0) throw new Error("search_query must contain at least one query");
	if (args.search_query.length > maxQueries) throw new Error(`search_query supports at most ${maxQueries} queries per call`);
	return { search_query: args.search_query.map(({ q }) => {
		const query = q.trim();
		if (query.length === 0) throw new Error("search_query.q must be a non-empty string");
		return { q: query };
	}) };
}
function sourceLabel(source) {
	if (source.title !== void 0 && source.title.length > 0) return source.title;
	try {
		return new URL(source.url).hostname;
	} catch {
		return source.url;
	}
}
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
function formatWebRunOutput(value) {
	return [...value.results.map(formatOneResult), "Cite the relevant source URLs as Markdown links in your response."].join("\n\n");
}
function presentWebRunCall(args) {
	return {
		card: "generic",
		title: "Web search",
		kind: "search",
		rawInput: args.search_query
	};
}
function projectSource(source) {
	return {
		url: source.url,
		...source.title === void 0 ? {} : { title: source.title },
		...source.snippet === void 0 ? {} : { snippet: source.snippet },
		...source.publishedAt === void 0 ? {} : { publishedAt: source.publishedAt }
	};
}
function projectSearchResult(query, result) {
	return {
		query,
		...result.content === void 0 ? {} : { content: result.content },
		sources: result.sources.map(projectSource),
		truncated: result.truncated
	};
}
function webRunMetaFromValue(value) {
	return { results: value.results.map((result) => ({
		query: result.query,
		sources: result.sources.map((source) => ({
			url: source.url,
			...source.title === void 0 ? {} : { title: source.title },
			...source.snippet === void 0 ? {} : { snippet: source.snippet },
			...source.publishedAt === void 0 ? {} : { publishedAt: source.publishedAt }
		})),
		truncated: result.truncated,
		...result.content === void 0 ? {} : { answer: result.content }
	})) };
}
function webRunMetaFromResult(meta) {
	return parseWebRunMeta(meta);
}
function presentWebRunResult(_args, result) {
	if (result.isError) return void 0;
	const meta = webRunMetaFromResult(result.meta);
	if (meta === void 0) return void 0;
	if (meta.results.length > 1) return {
		card: "web",
		kind: "searches",
		results: meta.results.map((search) => ({
			query: search.query,
			sources: search.sources,
			...search.answer === void 0 ? {} : { answer: search.answer },
			truncated: search.truncated
		}))
	};
	const [search] = meta.results;
	if (search === void 0) return void 0;
	return {
		card: "web",
		kind: "search",
		title: search.query,
		sources: search.sources,
		...search.answer === void 0 ? {} : { answer: search.answer },
		truncated: search.truncated
	};
}
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
