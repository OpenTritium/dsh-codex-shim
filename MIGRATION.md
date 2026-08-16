# Migration Inventory

Reference checkout: `/home/tritium/migration-archives/deepseek-harness-codex-reference-2026-08-15`.

| Reference area | Classification | External destination |
| --- | --- | --- |
| Codex route gate and persona | Public system-prompt/settings seam | `src/gate.ts` |
| Unified exec and patch parser | Public shell/fs/attachment/tool seams | `src/tool-exec.ts`, `src/apply-patch.ts` |
| Codex plan adapter | Public session/tool seam | `src/tool-plan.ts` |
| Web adapter | Public `ctx.web.search()` seam | `src/tool-web.ts` |
| Browser tool presentation | Public client slots and locale seam | `src/client/` |
| OpenAI Responses web-search provider | Public `ctx.web` provider seam | `src/openai-web-provider.ts` |
| Shell interactive stdin | Required upstream extension seam | Generic `ShellProcess.writeStdin` proposal |
| Host API settings namespace wiring | Required upstream extension seam | Generic `settings.register({ expose: 'client' })` opt-in; shim owns the `opentritium-codex` card through `settings.plugin.item` |

No OpenTritium product code is placed under the `@deepseek-ai` scope.
