import z from "@deepseek-ai/schemastery";
import { CredentialRef } from "@deepseek-ai/dsh-credentials";
import { WebSearchProvider, WebSearchRequest, WebSearchResult } from "@deepseek-ai/dsh-web";
import { Context } from "@deepseek-ai/cordis";
//#region src/openai-web-provider.d.ts
/** Cordis plugin name. */
declare const name = "opentritium-codex-openai-web";
/** The portable web capability this plugin provides. */
declare const inject: string[];
/** Stable web-provider id selected by a profile overlay. */
declare const OPENAI_RESPONSES_PROVIDER_ID = "opentritium-openai-responses";
/** Official OpenAI Responses API base URL. */
declare const OPENAI_RESPONSES_DEFAULT_BASE_URL = "https://api.openai.com/v1";
/** Credential reference used by OpenAI SDKs and the official API. */
declare const OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF = "OPENAI_API_KEY";
/** A generally available Responses model that supports hosted web search. */
declare const OPENAI_RESPONSES_DEFAULT_MODEL = "gpt-5";
/** Balanced hosted search context size. */
declare const OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE = "medium";
/** Settings namespace for this provider's endpoint and credential reference. */
declare const OPENAI_RESPONSES_SETTINGS_NAMESPACE: import("@deepseek-ai/dsh-settings").SettingsNamespace;
/** Search-context sizes accepted by the OpenAI Responses web-search tool. */
type SearchContextSize = 'low' | 'medium' | 'high';
/** Provider configuration. Credentials are resolved by reference for every search. */
interface Config {
  /** Whether this provider may serve `ctx.web.search()` requests. */
  enabled?: boolean;
  /** Responses API base URL, with `/v1` when required by the selected backend. */
  baseURL?: string;
  /** Credentials service reference used for the API key. */
  credentialRef?: string;
  /** Model that executes the hosted Web Search tool. */
  model?: string;
  /** Hosted web-search context budget. */
  searchContextSize?: SearchContextSize;
}
/** Runtime schema for {@link Config}. */
declare const Config: z<Config>;
/** The exact secret-free request recorded before an auxiliary Responses call. */
interface OpenAIResponsesSearchRequest {
  /** Fully resolved endpoint. */
  readonly endpoint: string;
  /** Exact JSON body sent to the configured backend. */
  readonly body: {
    readonly model: string;
    readonly input: string;
    readonly tools: readonly [{
      readonly type: 'web_search';
      readonly search_context_size: SearchContextSize;
    }];
    readonly tool_choice: 'required';
    readonly include: readonly ['web_search_call.action.sources'];
    readonly store: false;
  };
}
declare module '@deepseek-ai/dsh-session/types' {
  interface SessionEventMap {
    /** Secret-free auxiliary OpenAI Responses request recorded before dispatch. */
    'web/opentritium-openai-responses-request': OpenAIResponsesSearchRequest;
  }
}
/** Fully resolved, single-operation provider inputs. */
interface OpenAIResponsesSearchProviderOptions {
  /** Whether this provider is enabled. */
  enabled: boolean;
  /** Resolve the credential for the next search without retaining its value. */
  resolveApiKey: () => Promise<string | undefined>;
  /** Credential reference for missing-key diagnostics. */
  credentialRef: CredentialRef;
  /** Responses API base URL. */
  baseURL: string;
  /** Hosted Web Search model. */
  model: string;
  /** Hosted Web Search context budget. */
  searchContextSize: SearchContextSize;
  /** Persist one secret-free request before network dispatch. */
  recordRequest?: (request: OpenAIResponsesSearchRequest) => void;
}
/** Build an endpoint without accepting accidental double slashes. */
declare function responsesEndpoint(baseURL: string): string;
/** Convert one OpenAI Responses payload into portable search sources and answer text. */
declare function mapOpenAIResponsesPayload(payload: unknown): WebSearchResult;
/** The OpenAI Responses hosted Web Search provider. */
declare class OpenAIResponsesSearchProvider implements WebSearchProvider {
  private readonly resolveOptions;
  readonly id = "opentritium-openai-responses";
  /** @param resolveOptions - snapshots current settings at the start of each search. */
  constructor(resolveOptions: () => OpenAIResponsesSearchProviderOptions);
  available(): boolean;
  search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult>;
}
/** Install the provider and make its settings available to WebUI when present. */
declare function apply(ctx: Context, config: Config): void;
//#endregion
export { Config, OPENAI_RESPONSES_DEFAULT_BASE_URL, OPENAI_RESPONSES_DEFAULT_CREDENTIAL_REF, OPENAI_RESPONSES_DEFAULT_MODEL, OPENAI_RESPONSES_DEFAULT_SEARCH_CONTEXT_SIZE, OPENAI_RESPONSES_PROVIDER_ID, OPENAI_RESPONSES_SETTINGS_NAMESPACE, OpenAIResponsesSearchProvider, OpenAIResponsesSearchProviderOptions, OpenAIResponsesSearchRequest, SearchContextSize, apply, inject, mapOpenAIResponsesPayload, name, responsesEndpoint };