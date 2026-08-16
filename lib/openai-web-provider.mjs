import z from "@deepseek-ai/schemastery";
import { installSettingsSection, settingsNamespace } from "@deepseek-ai/dsh-settings";
import { credentialRef } from "@deepseek-ai/dsh-credentials";
import { launchEnvironmentOf } from "@deepseek-ai/dsh-launch-environment";
import { WebError } from "@deepseek-ai/dsh-web";
//#region src/openai-web-provider.ts
/** Cordis plugin name. */
const name = "opentritium-codex-openai-web";
/** The portable web capability this plugin provides. */
const inject = ["web"];
/** Stable web-provider id selected by a profile overlay. */
const OPENAI_RESPONSES_PROVIDER_ID = "opentritium-openai-responses";
/** Official OpenAI Responses API base URL. */
const OPENAI_RESPONSES_DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** Credential reference used by OpenAI SDKs and the official API. */
const OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF = "OPENAI_API_KEY";
/** A generally available Responses model that supports hosted web search. */
const OPENAI_RESPONSES_DEFAULT_MODEL = "gpt-5";
/** Balanced hosted search context size. */
const OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE = "medium";
/** Settings namespace for this provider's endpoint and credential reference. */
const OPENAI_RESPONSES_SETTINGS_NAMESPACE = settingsNamespace("opentritium-openai-web");
/** Runtime schema for {@link Config}. */
const Config = z.object({
	enabled: z.boolean().default(true),
	baseURL: z.string().default(OPENAI_RESPONSES_DEFAULT_BASE_URL),
	credentialRef: z.string().role("credential-ref").default(OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF),
	model: z.string().default(OPENAI_RESPONSES_DEFAULT_MODEL),
	searchContextSize: z.union([
		"low",
		"medium",
		"high"
	]).default(OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE)
});
/** Build an endpoint without accepting accidental double slashes. */
function responsesEndpoint(baseURL) {
	return `${baseURL.replace(/\/+$/u, "")}/responses`;
}
/** Convert one OpenAI Responses payload into portable search sources and answer text. */
function mapOpenAIResponsesPayload(payload) {
	const root = recordOf(payload);
	const output = root === void 0 || !Array.isArray(root.output) ? void 0 : root.output;
	if (output === void 0) throw new WebError("OpenAI Responses returned no output array", "WEB_PROVIDER_ERROR");
	const sources = /* @__PURE__ */ new Map();
	const answer = [];
	let usedWebSearch = false;
	for (const item of output) {
		const entry = recordOf(item);
		if (entry === void 0) continue;
		if (entry.type === "web_search_call") {
			usedWebSearch = true;
			const action = recordOf(entry.action);
			if (action?.type === "search") addActionSources(sources, action.sources);
			continue;
		}
		if (entry.type === "message") collectMessage(sources, answer, entry.content);
	}
	if (!usedWebSearch) throw new WebError("OpenAI Responses did not return a web_search_call; the configured backend did not execute hosted web search", "WEB_PROVIDER_ERROR");
	return {
		...answer.length > 0 ? { content: answer.join("\n") } : {},
		sources: [...sources.values()],
		truncated: false
	};
}
/** The OpenAI Responses hosted Web Search provider. */
var OpenAIResponsesSearchProvider = class {
	resolveOptions;
	id = OPENAI_RESPONSES_PROVIDER_ID;
	/** @param resolveOptions - snapshots current settings at the start of each search. */
	constructor(resolveOptions) {
		this.resolveOptions = resolveOptions;
	}
	available() {
		const options = this.resolveOptions();
		return options.enabled && URL.canParse(options.baseURL) && options.model.trim().length > 0 && isSearchContextSize(options.searchContextSize);
	}
	async search(request, signal) {
		const options = this.resolveOptions();
		throwIfAborted(signal);
		const apiKey = await resolveApiKey(options, signal);
		throwIfAborted(signal);
		const endpoint = responsesEndpoint(options.baseURL);
		const body = {
			model: options.model,
			input: request.query,
			tools: [{
				type: "web_search",
				search_context_size: options.searchContextSize
			}],
			tool_choice: "required",
			include: ["web_search_call.action.sources"],
			store: false
		};
		options.recordRequest?.({
			endpoint,
			body
		});
		throwIfAborted(signal);
		let response;
		try {
			response = await fetch(endpoint, {
				method: "POST",
				redirect: "error",
				headers: {
					authorization: `Bearer ${apiKey}`,
					"content-type": "application/json",
					accept: "application/json",
					"user-agent": "opentritium-dsh-codex-shim/0.1.0"
				},
				body: JSON.stringify(body),
				...signal === void 0 ? {} : { signal }
			});
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error);
			throw new WebError(`OpenAI Responses request failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
		if (!response.ok) throw await responseError(response, signal);
		try {
			return mapOpenAIResponsesPayload(await response.json());
		} catch (error) {
			if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error);
			if (error instanceof WebError) throw error;
			throw new WebError(`OpenAI Responses returned an unprocessable response body: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
		}
	}
};
/** Install the provider and make its settings available to WebUI when present. */
function apply(ctx, config) {
	let current = () => config;
	installSettingsSection(ctx, OPENAI_RESPONSES_SETTINGS_NAMESPACE, Config, config, {
		expose: "client",
		setSource: (source) => {
			current = source;
		},
		onChange: () => {}
	});
	ctx.web.registerSearchProvider(new OpenAIResponsesSearchProvider(() => resolveOptions(ctx, current())));
}
/** Resolve one current settings section to operation-local options. */
function resolveOptions(ctx, config) {
	const ref = credentialRef(config.credentialRef ?? "OPENAI_API_KEY");
	return {
		enabled: config.enabled ?? true,
		credentialRef: ref,
		resolveApiKey: async () => {
			const credentials = ctx.get("credentials");
			if (credentials !== void 0) return (await credentials.resolve(ref))?.value;
			return launchEnvironmentOf(ctx).get(ref)?.value;
		},
		baseURL: config.baseURL ?? "https://api.openai.com/v1",
		model: config.model ?? "gpt-5",
		searchContextSize: config.searchContextSize ?? "medium",
		recordRequest: (request) => {
			ctx.get("agents")?.currentInitiator()?.session.append("web/opentritium-openai-responses-request", request);
		}
	};
}
function recordOf(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function addActionSources(target, value) {
	if (!Array.isArray(value)) return;
	for (const item of value) {
		const source = recordOf(item);
		if (source?.type !== "url" || typeof source.url !== "string" || source.url.length === 0 || target.has(source.url)) continue;
		target.set(source.url, { url: source.url });
	}
}
function collectMessage(sources, answer, value) {
	if (!Array.isArray(value)) return;
	for (const item of value) {
		const content = recordOf(item);
		if (content?.type !== "output_text") continue;
		if (typeof content.text === "string" && content.text.length > 0) answer.push(content.text);
		if (!Array.isArray(content.annotations)) continue;
		for (const itemAnnotation of content.annotations) {
			const annotation = recordOf(itemAnnotation);
			if (annotation?.type !== "url_citation" || typeof annotation.url !== "string" || annotation.url.length === 0) continue;
			const existing = sources.get(annotation.url);
			sources.set(annotation.url, {
				url: annotation.url,
				...typeof annotation.title === "string" && annotation.title.length > 0 ? { title: annotation.title } : existing?.title === void 0 ? {} : { title: existing.title }
			});
		}
	}
}
async function resolveApiKey(options, signal) {
	let apiKey;
	try {
		apiKey = await abortable(options.resolveApiKey(), signal);
	} catch (error) {
		if (signal?.aborted === true || isAbortError(error)) throw aborted(signal, error);
		throw new WebError(`OpenAI Responses credential resolution failed: ${String(error)}`, "WEB_PROVIDER_ERROR", { cause: error });
	}
	if (apiKey !== void 0 && apiKey.length > 0) return apiKey;
	throw new WebError(`OpenAI Responses has no API key for "${options.credentialRef}"; configure that credential reference before enabling this provider`, "WEB_PROVIDER_CREDENTIAL_MISSING");
}
async function responseError(response, signal) {
	let message = `OpenAI Responses API error (HTTP ${response.status})`;
	try {
		const body = recordOf(await response.json());
		const error = recordOf(body?.error);
		const detail = typeof error?.message === "string" ? error.message : typeof body?.message === "string" ? body.message : void 0;
		if (detail !== void 0 && detail.length > 0) message = detail;
	} catch (error) {
		if (signal?.aborted === true || isAbortError(error)) return aborted(signal, error);
	}
	return new WebError(message, "WEB_PROVIDER_ERROR");
}
function isSearchContextSize(value) {
	return value === "low" || value === "medium" || value === "high";
}
function throwIfAborted(signal) {
	if (signal?.aborted === true) throw aborted(signal);
}
function aborted(signal, fallback) {
	return new WebError("OpenAI Responses search aborted", "WEB_ABORTED", { cause: signal?.aborted === true ? signal.reason : fallback });
}
function isAbortError(error) {
	return error instanceof DOMException && error.name === "AbortError";
}
function abortable(operation, signal) {
	if (signal === void 0) return operation;
	if (signal.aborted) return Promise.reject(aborted(signal));
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			reject(aborted(signal));
		};
		signal.addEventListener("abort", onAbort, { once: true });
		operation.then((value) => {
			signal.removeEventListener("abort", onAbort);
			resolve(value);
		}, (error) => {
			signal.removeEventListener("abort", onAbort);
			reject(error);
		});
	});
}
//#endregion
export { Config, OPENAI_RESPONSES_DEFAULT_BASE_URL, OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF, OPENAI_RESPONSES_DEFAULT_MODEL, OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE, OPENAI_RESPONSES_PROVIDER_ID, OPENAI_RESPONSES_SETTINGS_NAMESPACE, OpenAIResponsesSearchProvider, apply, inject, mapOpenAIResponsesPayload, name, responsesEndpoint };
