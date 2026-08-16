import { bench, describe } from 'vitest'
import { parseInvocation, parsePatch } from '../src/apply-patch.ts'
import { modelMatches } from '../src/gate.ts'
import { renderExecOutput, truncateOutput, type CodexExecValue } from '../src/exec-output.ts'
import { changedPlanItems, parsePlanPresentation, type PlanItemPresentation } from '../src/client/plan-presentation.ts'
import { formatWebRunOutput, parseWebRunArgs, type WebRunArgs } from '../src/tool-web.ts'
import { parseWebRunView, type WebRunSearchGroup, type WebRunValue } from '../src/web-run-presentation.ts'

const model = 'gpt-5.6-luna'
const modelPatterns = ['gpt-5.6-*', 'deepseek-v4-*', 'claude-*', 'gemini-*']

const webArgs: WebRunArgs = {
  search_query: [
    { q: 'DeepSeek Harness plugin development' },
    { q: 'OpenAI Responses API web search' },
    { q: 'Model Context Protocol tools' },
    { q: 'TypeScript agent harness benchmark' },
  ],
}

const webValue: WebRunValue = {
  results: webArgs.search_query.map(({ q }, queryIndex) => ({
    query: q,
    content: `Answer for ${q}`,
    sources: Array.from({ length: 5 }, (_, sourceIndex) => ({
      url: `https://example.test/${queryIndex}/${sourceIndex}`,
      title: `Result ${sourceIndex} for ${q}`,
      snippet: 'A representative search result snippet for the benchmark.',
      publishedAt: '2026-08-16',
    })),
    truncated: false,
  })),
}

const webView = {
  card: 'web' as const,
  kind: 'searches' as const,
  results: webValue.results.map<WebRunSearchGroup>(result => ({
    query: result.query,
    answer: result.content,
    sources: result.sources,
    truncated: result.truncated,
  })),
}

const patch = `*** Begin Patch
*** Add File: src/bench-note.txt
+A representative added file.
*** Update File: src/tool.ts
@@
 export function run(): void {
-  return oldValue()
+  return newValue()
 }
*** End Patch`
const invocation = `apply_patch <<'PATCH'\n${patch}\nPATCH`

const currentPlan: PlanItemPresentation[] = [
  { step: 'Inspect the route', status: 'completed' },
  { step: 'Run the benchmark', status: 'in_progress' },
  { step: 'Document the result', status: 'pending' },
]
const previousPlan: PlanItemPresentation[] = [
  { step: 'Inspect the route', status: 'pending' },
  { step: 'Run the benchmark', status: 'pending' },
]
const planArgs = JSON.stringify({ explanation: 'Measure high-frequency Codex shim paths.', plan: currentPlan })

const execValue: CodexExecValue = {
  chunkId: 'bench01',
  wallTimeSeconds: 0.1234,
  exitCode: 0,
  output: Array.from({ length: 2048 }, (_, index) => `line ${index}: representative command output`).join('\n'),
}

describe('Codex shim hot paths', () => {
  bench('route model matching', () => {
    modelMatches(model, modelPatterns)
  })

  bench('web_run argument normalization', () => {
    parseWebRunArgs(webArgs, 4)
  })

  bench('web_run output formatting', () => {
    formatWebRunOutput(webValue)
  })

  bench('web_run presentation parsing', () => {
    parseWebRunView(webView)
  })

  bench('apply_patch invocation parsing', () => {
    parseInvocation(invocation)
  })

  bench('apply_patch body parsing', () => {
    parsePatch(patch)
  })

  bench('update_plan argument parsing', () => {
    parsePlanPresentation(planArgs)
  })

  bench('update_plan changed-step projection', () => {
    changedPlanItems(currentPlan, previousPlan)
  })

  bench('exec output truncation', () => {
    truncateOutput(execValue.output, 1000)
  })

  bench('exec output rendering', () => {
    renderExecOutput(execValue)
  })
})
