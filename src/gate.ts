/**
 * Model-route activation gate for the Codex environment simulation. While the
 * resolved route is enabled by its exact override or the configured patterns,
 * the global switch is on, and the scope can resolve a Codex tool, its prompt
 * assemblies swap to the codex surface: the persona becomes the ported Codex
 * instructions, the advertised tool list keeps only compatible names, and the
 * same assembly receives Codex-form environment and permission contexts. Other
 * routes keep the host composition's own surface minus the codex tools. Both
 * sets stay registered and dispatchable either way, so a mid-session model
 * switch flips the advertisement on the next step without history
 * inconsistencies — the flip lands in the logged `request/header`.
 * @module @opentritium/dsh-codex-shim/gate
 */

import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import type { Agent } from '@deepseek-ai/dsh-agent'
import type {} from '@deepseek-ai/dsh-agent'
import type { SandboxExecutionPolicy, SandboxMode } from '@deepseek-ai/dsh-sandbox'
import type {} from '@deepseek-ai/dsh-sandbox-policy'
import { settingsNamespace, installSettingsSection } from '@deepseek-ai/dsh-settings'
import type {} from '@deepseek-ai/dsh-settings'
import type { AssembleContext, PromptAssembly } from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-system-prompt'
import type {} from '@deepseek-ai/dsh-tools'
import type { ApprovalPolicy } from '@deepseek-ai/dsh-user-approval'
import { CODEX_PERSONA } from './instructions.ts'

/** Cordis plugin name. */
export const name = 'opentritium-codex-gate'
/** The prompt registry whose assemblies this gate rewrites. */
export const inject = ['systemPrompt', 'tools']

/** Settings namespace of the codex simulation, layered under `settings.yaml`. */
export const CODEX_SETTINGS_NAMESPACE = settingsNamespace('opentritium-codex')

/** One exact provider/model decision that overrides the glob default. */
export interface CodexModelOverride {
  /** Registered provider route. */
  provider: string
  /** Provider-owned model id. */
  model: string
  /** Whether this exact route receives the Codex surface. */
  enabled: boolean
}

/** Gate configuration: composition base, user-overridable through settings. */
export interface Config {
  /** Global switch; false disables the simulation for every route. */
  enabled: boolean
  /**
   * Glob-style model patterns (`*` matches any character run, matched
   * anywhere in the model id). Any match activates the codex surface.
   */
  modelPatterns: string[]
  /** Exact route decisions that take precedence over {@link modelPatterns}. */
  modelOverrides: CodexModelOverride[]
}

/** Runtime schema for the gate row. */
export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  modelPatterns: z.array(z.string()).default(['gpt-*', 'codex*', 'o1*', 'o3*', 'o4*']),
  modelOverrides: z.array(z.object({
    provider: z.string(),
    model: z.string(),
    enabled: z.boolean(),
  })).default([]),
})

/** Tool names this family registers (hidden from advertisement while inactive). */
const CODEX_TOOL_NAMES: ReadonlySet<string> = new Set([
  'exec_command',
  'apply_patch',
  'apply-patch',
  'applypatch',
  'update_plan',
  'view_image',
  'web_run',
])

/** Canonical tools advertised while compatibility aliases remain executable. */
const CODEX_ADVERTISED_TOOL_NAMES: ReadonlySet<string> = new Set([
  'exec_command',
  'write_stdin',
  'apply_patch',
  'update_plan',
  'view_image',
  'web_run',
])

interface CodexShimReplacement {
  readonly requires: readonly string[]
  readonly masks: readonly string[]
}

const CODEX_SHIM_REPLACEMENTS: readonly CodexShimReplacement[] = [
  {
    requires: ['exec_command'],
    masks: ['bash', 'pwsh', 'read', 'glob', 'grep'],
  },
  {
    requires: ['exec_command', 'write_stdin'],
    masks: ['terminal_close', 'terminal_list', 'terminal_open', 'terminal_read', 'terminal_send', 'terminal_signal'],
  },
  {
    requires: ['apply_patch'],
    masks: ['edit', 'str_replace_editor', 'write'],
  },
  {
    requires: ['view_image'],
    masks: ['read_image'],
  },
  {
    requires: ['update_plan'],
    masks: ['todo_write'],
  },
  {
    requires: ['web_run'],
    masks: ['web_search'],
  },
]

/** Persona section name while the codex surface is active. */
const CODEX_PERSONA_SECTION = 'codex:persona'

/** Guidance appended only when the Codex web-search shim is visible. */
const CODEX_WEB_RUN_GUIDANCE = [
  '## Web search',
  'Use `web_run` when current public information is needed. Pass one or more concise `search_query` entries such as `{ "q": "..." }`.',
  'This tool searches only. Do not request `open`, `click`, or `find` operations; cite returned source URLs as Markdown links.',
].join('\n')

/** Dynamic-context name of the environment block. */
const CODEX_ENVIRONMENT_CONTEXT = 'codex:environment'

/** Host context names whose authoritative values receive Codex wording. */
const SANDBOX_POLICY_CONTEXT = 'sandbox:policy'
const APPROVAL_POLICY_CONTEXT = 'approval:policy'

/** Per-assembly permission state resolved from the same session as execution. */
interface CodexPermissions {
  /** Complete file policy, when that service is composed. */
  sandbox: SandboxExecutionPolicy | undefined
  /** Effective approval policy, when that service is composed. */
  approval: ApprovalPolicy | undefined
}

/** One prompt assembly's route decision and the fact that determined it. */
interface RouteActivation {
  /** Whether the Codex advertisement applies to the assembly. */
  active: boolean
  /** The decisive route-policy condition, suitable for debug diagnostics. */
  reason: string
}

/**
 * Compile one glob-style pattern into a matcher over model ids.
 * @param pattern - user/composition pattern; empty or `*` matches everything.
 * @returns a predicate over model ids, or undefined when the pattern matches all.
 */
function compilePattern(pattern: string): ((model: string) => boolean) | undefined {
  if (pattern.length === 0 || pattern === '*') return undefined
  const source = pattern.split('*').map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('.*')
  const regex = new RegExp(source)
  return model => regex.test(model)
}

/**
 * Whether one model id matches the configured patterns.
 * @param model - the resolved model id.
 * @param patterns - the configured glob-style patterns.
 * @returns true when any pattern matches.
 */
export function modelMatches(model: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => compilePattern(pattern)?.(model) ?? true)
}

/**
 * Resolve the route this assembly is for. Each field first reads the
 * assembly's own variables (which the model-selection waterfall may have
 * overridden), then the session's last logged request header, then the
 * agent's creation options.
 * @param assembled - the assembled prompt variables.
 * @param context - the per-assembly context.
 * @returns the provider/model pair, or empty fields on agent-less diagnostics assemblies.
 */
function resolveRoute(assembled: PromptAssembly['variables'], context: AssembleContext): {
  provider: string | undefined
  model: string | undefined
} {
  const agent: Agent | undefined = context.agent
  const header = agent?.session.requestHeader()?.config
  return {
    provider: assembled.provider ?? header?.provider ?? agent?.options.provider,
    model: assembled.model ?? header?.model ?? agent?.options.model,
  }
}

/**
 * Look up the exact setting for one complete provider/model route.
 * @param config - the currently authoritative gate settings.
 * @param provider - the route's registered provider.
 * @param model - the provider-owned model id.
 * @returns the route decision, or undefined when the glob list decides it.
 */
function modelOverrideFor(config: Config, provider: string | undefined, model: string): boolean | undefined {
  if (provider === undefined) return undefined
  return config.modelOverrides.find(override => override.provider === provider && override.model === model)?.enabled
}

/**
 * Whether this scope resolves any Codex tool. The gate mounts globally so the
 * settings namespace exists before an agent is created; only agent presets
 * that contribute Codex tools may receive the matching prompt surface.
 * @param ctx - context holding the scope-aware tool registry.
 * @param scope - scope for the assembly currently being built.
 * @returns true when a Codex tool is visible within the scope.
 */
function hasCodexTool(ctx: Context, scope: AssembleContext['scope']): boolean {
  return [...CODEX_TOOL_NAMES].some(toolName => ctx.tools.get(toolName, scope) !== undefined)
}

function maskedHostToolNames(tools: PromptAssembly['tools']): ReadonlySet<string> {
  const names = new Set(tools.map(tool => tool.name))
  const masked = new Set<string>()
  for (const replacement of CODEX_SHIM_REPLACEMENTS) {
    if (replacement.requires.every(name => names.has(name))) {
      for (const name of replacement.masks) masked.add(name)
    }
  }
  return masked
}

/**
 * Render the active persona with only the tool guidance available to this scope.
 * @param tools - unfiltered schemas resolved for this prompt assembly.
 * @returns the Codex persona text for the visible tool set.
 */
function personaFor(tools: PromptAssembly['tools']): string {
  return tools.some(tool => tool.name === 'web_run')
    ? `${CODEX_PERSONA}\n\n${CODEX_WEB_RUN_GUIDANCE}`
    : CODEX_PERSONA
}

/**
 * Resolve the Codex advertisement policy for one assembly.
 * @param ctx - context holding the scope-aware tool registry.
 * @param config - the currently authoritative gate settings.
 * @param route - the resolved provider/model pair.
 * @param scope - scope for the assembly currently being built.
 * @returns whether the surface swaps in and the condition that decided it.
 */
function activationFor(
  ctx: Context,
  config: Config,
  route: { provider: string | undefined; model: string | undefined },
  scope: AssembleContext['scope'],
): RouteActivation {
  if (!config.enabled) return { active: false, reason: 'the global switch is off' }
  if (route.model === undefined) return { active: false, reason: 'the model route is unavailable' }
  if (!hasCodexTool(ctx, scope)) return { active: false, reason: 'the scope has no Codex tools' }
  const override = modelOverrideFor(config, route.provider, route.model)
  if (override !== undefined) return { active: override, reason: 'an exact model override' }
  const active = modelMatches(route.model, config.modelPatterns)
  return { active, reason: active ? 'a model pattern match' : 'no model pattern match' }
}

/**
 * Render the Codex `<environment_context>` block for one active assembly.
 * @param context - the per-assembly context.
 * @returns the XML block.
 */
function renderEnvironmentContext(context: AssembleContext): string {
  const agent: Agent | undefined = context.agent
  const cwd = agent?.session.header.cwd ?? process.cwd()
  const now = new Date()
  return [
    '<environment_context>',
    `<cwd>${escapeXml(cwd)}</cwd>`,
    `<current_date>${now.toISOString().slice(0, 10)}</current_date>`,
    `<timezone>${escapeXml(Intl.DateTimeFormat().resolvedOptions().timeZone)}</timezone>`,
    '<shell>bash</shell>',
    '</environment_context>',
  ].join('\n')
}

/**
 * Resolve the file and approval policies that govern one active assembly.
 * @param ctx - context carrying optional policy services.
 * @param context - assembly context carrying the owning agent.
 * @returns both effective policies; absent services remain absent.
 */
function resolvePermissions(ctx: Context, context: AssembleContext): CodexPermissions {
  const agent = context.agent
  const sandboxPolicy = ctx.get('sandboxPolicy')
  const approval = ctx.get('approval')
  return {
    sandbox: agent === undefined || sandboxPolicy === undefined
      ? undefined
      : sandboxPolicy.resolve({ session: agent.session }),
    approval: agent === undefined || approval === undefined
      ? undefined
      : approval.overrideOf(agent.session) ?? approval.config.policy,
  }
}

/**
 * Return the strictly wider modes one command may request from a standing mode.
 * @param mode - the effective file policy.
 * @returns escalation targets in increasing access order.
 */
function widerModes(mode: SandboxMode): readonly SandboxMode[] {
  switch (mode) {
    case 'read-only': return ['workspace-write', 'danger-full-access']
    case 'workspace-write': return ['danger-full-access']
    case 'danger-full-access': return []
    /* v8 ignore next 4 -- SandboxMode is a closed typed same-process union. */
    default: {
      const unreachable: never = mode
      throw new Error(`unreachable sandbox mode: ${String(unreachable)}`)
    }
  }
}

/**
 * Render one effective file policy in the vocabulary Codex models expect.
 * @param policy - complete dsh file policy for this session.
 * @returns model-facing Codex sandbox text without claiming network policy.
 */
function renderSandboxPolicy(policy: SandboxExecutionPolicy): string {
  switch (policy.mode) {
    case 'read-only':
      return 'Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `read-only`: commands may read files but cannot modify them in the standing mode.'
    case 'workspace-write':
      return `Filesystem sandboxing defines which files can be read or written. \`sandbox_mode\` is \`workspace-write\`: commands may read files and modify files under the session workspace ${JSON.stringify(policy.workspaceRoot)}. Editing files elsewhere requires approval.`
    case 'danger-full-access':
      return 'Filesystem sandboxing defines which files can be read or written. `sandbox_mode` is `danger-full-access`: the DSH file sandbox does not restrict file modifications.'
    /* v8 ignore next 4 -- SandboxMode is a closed typed same-process union. */
    default: {
      const unreachable: never = policy.mode
      throw new Error(`unreachable sandbox mode: ${String(unreachable)}`)
    }
  }
}

/**
 * Render the effective approval policy against the fields the active schema exposes.
 * @param policy - session approval policy.
 * @returns model-facing Codex approval guidance.
 */
function renderApprovalPolicy(policy: ApprovalPolicy): string {
  return policy === 'never'
    ? 'Approval policy is currently never. Do not provide `sandbox_permissions` for any reason; commands that request escalation are rejected.'
    : 'Approval policy is currently ask. After a command fails because of sandboxing, retry that exact command once with `sandbox_permissions` set to the narrowest advertised wider mode and include a one-sentence `justification`. The request fails closed when no approval channel is available.'
}

/**
 * Make the advertised escalation fields truthful for this session.
 * @param tool - one already-filtered tool schema.
 * @param permissions - effective file and approval policies.
 * @returns the original tool or a detached schema with session-valid fields.
 */
function adaptToolSchema(tool: PromptAssembly['tools'][number], permissions: CodexPermissions): PromptAssembly['tools'][number] {
  if (tool.name !== 'exec_command') return tool
  const parameters = tool.parameters
  const properties = parameters.properties as Record<string, unknown>

  const nextProperties = { ...properties }
  delete nextProperties.prefix_rule
  const modes = permissions.approval === 'ask' && permissions.sandbox !== undefined
    ? widerModes(permissions.sandbox.mode)
    : []
  const sandboxPermissions = properties.sandbox_permissions as Record<string, unknown> | undefined
  if (modes.length === 0 || sandboxPermissions === undefined) {
    delete nextProperties.sandbox_permissions
    delete nextProperties.justification
  } else {
    nextProperties.sandbox_permissions = { ...sandboxPermissions, enum: [...modes] }
  }
  return { ...tool, parameters: { ...parameters, properties: nextProperties } }
}

/**
 * Replace host policy prose with Codex wording while retaining source names.
 * @param contexts - contexts assembled by authoritative host services.
 * @param permissions - values resolved from those same services.
 * @returns detached active-route contexts.
 */
function adaptContexts(contexts: PromptAssembly['contexts'], permissions: CodexPermissions): PromptAssembly['contexts'] {
  return contexts.map((context) => {
    if (context.name === SANDBOX_POLICY_CONTEXT && permissions.sandbox !== undefined) {
      return { ...context, text: renderSandboxPolicy(permissions.sandbox) }
    }
    if (context.name === APPROVAL_POLICY_CONTEXT && permissions.approval !== undefined) {
      return { ...context, text: renderApprovalPolicy(permissions.approval) }
    }
    return context
  })
}

/**
 * Escape one XML text node.
 * @param text - the raw text.
 * @returns the escaped text.
 */
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * Register the codex gate: settings section, environment-context contributor,
 * and the assembly waterfall that swaps the surface per model route.
 * @param ctx - registrant context inside the composition whose scope holds the codex rows.
 * @param config - composition entry config (schema defaults already applied); the settings layer overrides it.
 */
export function apply(ctx: Context, config: Config): void {
  /** The currently authoritative settings: the resolved scope, else the entry. */
  let source: () => Config = () => config
  const logger = ctx.logger('codex-gate')
  installSettingsSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, config, {
    expose: 'client',
    validate: assertServiceableConfig,
    setSource: (current) => {
      source = current
    },
    // Every field is read through the source at each assembly, so nothing
    // derived needs rebuilding when the document changes.
    onChange: () => {
      const current = source()
      logger.info(
        'codex-gate: applying route policy (enabled=%s, modelPatterns=%d, modelOverrides=%d)',
        current.enabled,
        current.modelPatterns.length,
        current.modelOverrides.length,
      )
    },
  })

  ctx.on('system-prompt/assemble', async (_assembly, context, next) => {
    const assembled = await next()
    const configNow = source()
    const route = resolveRoute(assembled.variables, context)
    const activation = activationFor(ctx, configNow, route, context.scope)
    logger.debug(
      'codex-gate: route %s/%s uses the %s advertisement (%s)',
      route.provider ?? '<unknown>',
      route.model ?? '<unknown>',
      activation.active ? 'Codex' : 'host',
      activation.reason,
    )
    if (!activation.active) {
      // Hide the codex family while the host's own surface serves this route.
      return {
        ...assembled,
        tools: assembled.tools.filter(tool => !CODEX_TOOL_NAMES.has(tool.name)),
      }
    }
    const permissions = resolvePermissions(ctx, context)
    const maskedHostTools = maskedHostToolNames(assembled.tools)
    return {
      ...assembled,
      sections: [{ name: CODEX_PERSONA_SECTION, text: personaFor(assembled.tools) }],
      contexts: [
        { name: CODEX_ENVIRONMENT_CONTEXT, text: renderEnvironmentContext(context) },
        ...adaptContexts(assembled.contexts.filter(entry => entry.name !== CODEX_ENVIRONMENT_CONTEXT), permissions),
      ],
      tools: assembled.tools
        .filter((tool) => {
          if (CODEX_TOOL_NAMES.has(tool.name)) return CODEX_ADVERTISED_TOOL_NAMES.has(tool.name)
          return !maskedHostTools.has(tool.name)
        })
        .map(tool => adaptToolSchema(tool, permissions)),
    }
  })
}

/**
 * Reject a resolved section this gate could not act on: patterns must be
 * usable, checked where the value is written.
 * @param config - the resolved section, schema-valid by construction.
 */
export function assertServiceableConfig(config: Config): void {
  if (config.modelPatterns.some(pattern => pattern.trim().length === 0 && pattern.length > 0)) {
    throw new Error('codex-gate: model patterns must not be whitespace-only')
  }
  if (config.modelPatterns.includes('') && config.modelPatterns.length > 1) {
    throw new Error('codex-gate: an empty pattern (match-all) cannot combine with other patterns')
  }
  const modelsByProvider = new Map<string, Set<string>>()
  for (const override of config.modelOverrides) {
    if (override.provider.trim().length === 0 || override.model.trim().length === 0) {
      throw new Error('codex-gate: model overrides require non-blank provider and model ids')
    }
    const models = modelsByProvider.get(override.provider) ?? new Set<string>()
    if (models.has(override.model)) {
      throw new Error(`codex-gate: model override for ${override.provider}/${override.model} is duplicated`)
    }
    models.add(override.model)
    modelsByProvider.set(override.provider, models)
  }
}
