/** Locale dictionaries for the Codex tool rows. */

/** Dictionary namespace owned by this plugin. */
export const NS = 'codex'

/** Simplified Chinese dictionary (the key-set source of truth). */
export const zh = {
  'row.running': '正在运行 Codex 工具',
  'row.failed': 'Codex 工具失败',
  'row.stopped': 'Codex 工具已中止',
  'row.execCommand': '命令',
  'row.writeStdin': '终端',
  'row.applyPatch': '补丁',
  'row.viewImage': '图像',
  'row.updatePlan': '计划',
  'row.command': '执行命令',
  'row.session': '会话 {id}',
  'row.patch': '应用补丁',
  'row.image': '查看图像',
  'row.plan': '更新计划',
  'row.planSteps': '{count} 个步骤',
  'row.input': '输入',
  'row.output': '输出',
  'row.inspect': '检查',
} satisfies Record<string, string>

/** Codex dictionary key union. */
export type CodexKey = keyof typeof zh

/** English dictionary, checked complete against the zh key set. */
export const en = {
  'row.running': 'Running Codex tool',
  'row.failed': 'Codex tool failed',
  'row.stopped': 'Codex tool stopped',
  'row.execCommand': 'Command',
  'row.writeStdin': 'Terminal',
  'row.applyPatch': 'Patch',
  'row.viewImage': 'Image',
  'row.updatePlan': 'Plan',
  'row.command': 'Run command',
  'row.session': 'Session {id}',
  'row.patch': 'Apply patch',
  'row.image': 'View image',
  'row.plan': 'Update plan',
  'row.planSteps': '{count} steps',
  'row.input': 'Input',
  'row.output': 'Output',
  'row.inspect': 'Inspect',
} satisfies Record<CodexKey, string>
