/** Route gate for the Codex prompt, tool advertisement, and policy surface. */

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
import { CODEX_PERSONA } from './codex-instructions.ts'
import { CODEX_SETTINGS_NS, type CodexModelOverride } from './codex-settings.ts'

export const name = 'opentritium-codex-gate'
export const inject = ['systemPrompt', 'tools']

export const CODEX_SETTINGS_NAMESPACE = settingsNamespace(CODEX_SETTINGS_NS)

export interface Config {
  enabled: boolean
  /** Empty disables automatic matching; the bundle defaults to `gpt-5.6-*`. */
  modelPatterns: string[]
  modelOverrides: CodexModelOverride[]
}

export const Config: z<Config> = z.object({
  enabled: z.boolean().default(true),
  modelPatterns: z.array(z.string()).default(['gpt-5.6-*']),
  modelOverrides: z.array(z.object({ provider: z.string(), model: z.string(), enabled: z.boolean() })).default([]),
})

const CODEX_TOOL_NAMES: ReadonlySet<string> = new Set([
  'exec_command',
  'write_stdin',
  'apply_patch',
  'apply-patch',
  'applypatch',
  'update_plan',
  'view_image',
  'web_run',
])

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
  { requires: ['exec_command'], masks: ['bash', 'pwsh', 'read', 'glob', 'grep'] },
  {
    requires: ['exec_command', 'write_stdin'],
    masks: ['terminal_close', 'terminal_list', 'terminal_open', 'terminal_read', 'terminal_send', 'terminal_signal'],
  },
  { requires: ['apply_patch'], masks: ['edit', 'str_replace_editor', 'write'] },
  { requires: ['view_image'], masks: ['read_image'] },
  { requires: ['update_plan'], masks: ['todo_write'] },
  { requires: ['web_run'], masks: ['web_search'] },
]

const CODEX_PERSONA_SECTION = 'codex:persona'

const CODEX_WEB_RUN_GUIDANCE = [
  '## Web search',
  'Use `web_run` when current public information is needed. Pass one or more concise `search_query` entries such as `{ "q": "..." }`.',
  'This tool searches only. Do not request `open`, `click`, or `find` operations; cite returned source URLs as Markdown links.',
].join('\n')

const CODEX_ENVIRONMENT_CONTEXT = 'codex:environment'

const SANDBOX_POLICY_CONTEXT = 'sandbox:policy'
const APPROVAL_POLICY_CONTEXT = 'approval:policy'

interface CodexPermissions {
  sandbox: SandboxExecutionPolicy | undefined
  approval: ApprovalPolicy | undefined
}

interface RouteActivation {
  active: boolean
  reason: string
}

function compilePattern(pattern: string): ((model: string) => boolean) | undefined {
  if (pattern.length === 0 || pattern === '*') return undefined
  const source = pattern
    .split('*')
    .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*')
  const regex = new RegExp(source)
  return model => regex.test(model)
}

export function modelMatches(model: string, patterns: readonly string[]): boolean {
  return patterns.some(pattern => compilePattern(pattern)?.(model) ?? true)
}

function resolveRoute(
  assembled: PromptAssembly['variables'],
  context: AssembleContext,
): { provider: string | undefined; model: string | undefined } {
  const agent: Agent | undefined = context.agent
  const header = agent?.session.requestHeader()?.config
  return {
    provider: assembled.provider ?? header?.provider ?? agent?.options.provider,
    model: assembled.model ?? header?.model ?? agent?.options.model,
  }
}

function modelOverrideFor(config: Config, provider: string | undefined, model: string): boolean | undefined {
  if (provider === undefined) return undefined
  return config.modelOverrides.find(override => override.provider === provider && override.model === model)?.enabled
}

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

function personaFor(tools: PromptAssembly['tools']): string {
  return tools.some(tool => tool.name === 'web_run') ? `${CODEX_PERSONA}\n\n${CODEX_WEB_RUN_GUIDANCE}` : CODEX_PERSONA
}

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

function resolvePermissions(ctx: Context, context: AssembleContext): CodexPermissions {
  const agent = context.agent
  const sandboxPolicy = ctx.get('sandboxPolicy')
  const approval = ctx.get('approval')
  return {
    sandbox:
      agent === undefined || sandboxPolicy === undefined
        ? undefined
        : sandboxPolicy.resolve({ session: agent.session }),
    approval:
      agent === undefined || approval === undefined
        ? undefined
        : (approval.overrideOf(agent.session) ?? approval.config.policy),
  }
}

function widerModes(mode: SandboxMode): readonly SandboxMode[] {
  switch (mode) {
    case 'read-only':
      return ['workspace-write', 'danger-full-access']
    case 'workspace-write':
      return ['danger-full-access']
    case 'danger-full-access':
      return []
    /* v8 ignore next 4 -- SandboxMode is a closed typed same-process union. */
    default: {
      const unreachable: never = mode
      throw new Error(`unreachable sandbox mode: ${String(unreachable)}`)
    }
  }
}

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

function renderApprovalPolicy(policy: ApprovalPolicy): string {
  return policy === 'never'
    ? 'Approval policy is currently never. Do not provide `sandbox_permissions` for any reason; commands that request escalation are rejected.'
    : 'Approval policy is currently ask. After a command fails because of sandboxing, retry that exact command once with `sandbox_permissions` set to the narrowest advertised wider mode and include a one-sentence `justification`. The request fails closed when no approval channel is available.'
}

function adaptToolSchema(
  tool: PromptAssembly['tools'][number],
  permissions: CodexPermissions,
): PromptAssembly['tools'][number] {
  if (tool.name !== 'exec_command') return tool
  const parameters = tool.parameters
  const properties = parameters.properties as Record<string, unknown>

  const nextProperties = { ...properties }
  delete nextProperties.prefix_rule
  const modes =
    permissions.approval === 'ask' && permissions.sandbox !== undefined ? widerModes(permissions.sandbox.mode) : []
  const sandboxPermissions = properties.sandbox_permissions as Record<string, unknown> | undefined
  if (modes.length === 0 || sandboxPermissions === undefined) {
    delete nextProperties.sandbox_permissions
    delete nextProperties.justification
  } else {
    nextProperties.sandbox_permissions = { ...sandboxPermissions, enum: [...modes] }
  }
  return { ...tool, parameters: { ...parameters, properties: nextProperties } }
}

function adaptContexts(
  contexts: PromptAssembly['contexts'],
  permissions: CodexPermissions,
): PromptAssembly['contexts'] {
  return contexts.map(context => {
    if (context.name === SANDBOX_POLICY_CONTEXT && permissions.sandbox !== undefined) {
      return { ...context, text: renderSandboxPolicy(permissions.sandbox) }
    }
    if (context.name === APPROVAL_POLICY_CONTEXT && permissions.approval !== undefined) {
      return { ...context, text: renderApprovalPolicy(permissions.approval) }
    }
    return context
  })
}

function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function apply(ctx: Context, config: Config): void {
  let source: () => Config = () => config
  const logger = ctx.logger('codex-gate')
  installSettingsSection(ctx, CODEX_SETTINGS_NAMESPACE, Config, config, {
    expose: 'client',
    validate: assertServiceableConfig,
    setSource: current => {
      source = current
    },
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
      return { ...assembled, tools: assembled.tools.filter(tool => !CODEX_TOOL_NAMES.has(tool.name)) }
    }
    const permissions = resolvePermissions(ctx, context)
    const maskedHostTools = maskedHostToolNames(assembled.tools)
    return {
      ...assembled,
      sections: [{ name: CODEX_PERSONA_SECTION, text: personaFor(assembled.tools) }],
      contexts: [
        { name: CODEX_ENVIRONMENT_CONTEXT, text: renderEnvironmentContext(context) },
        ...adaptContexts(
          assembled.contexts.filter(entry => entry.name !== CODEX_ENVIRONMENT_CONTEXT),
          permissions,
        ),
      ],
      tools: assembled.tools
        .filter(tool => {
          if (CODEX_TOOL_NAMES.has(tool.name)) return CODEX_ADVERTISED_TOOL_NAMES.has(tool.name)
          return !maskedHostTools.has(tool.name)
        })
        .map(tool => adaptToolSchema(tool, permissions)),
    }
  })
}

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
