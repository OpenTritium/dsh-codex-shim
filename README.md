# @opentritium/dsh-codex-shim

[中文说明](README.zh.md)

`@opentritium/dsh-codex-shim` is an OpenTritium plugin for DeepSeek Harness (DSH). It gives selected model routes a Codex-style prompt, tool vocabulary, tool results, and WebUI presentation so GPT-family and other Codex-adapted models can make more reliable tool calls.

This is a shim, not a Codex runtime. It does not start a Codex app-server, handle Codex OAuth, provide models or credentials, execute commands by itself, or provide a web-search backend. It consumes DSH capabilities through their public service definitions and keeps the upstream behavior available when the route is inactive or the bundle is removed.

## Install in a profile

Install the bundle into the normal WebUI profile. `dsh plugin` owns the profile manifest and dependency list:

```sh
dsh plugin --profile web add https://github.com/OpenTritium/dsh-codex-shim.git
dsh --profile web --dump-config
```

The profile loads `@deepseek-ai/dsh-base` first and this bundle afterward. Keep model credentials, provider settings, and environment variables in the profile.

Remove it to return to the upstream composition:

```sh
dsh plugin --profile web remove @opentritium/dsh-codex-shim
dsh --profile web --dump-config
```

## Route and configuration

The bundle mounts the gate globally, but the Codex surface is applied only when all of these are true:

- the global switch is enabled;
- the resolved model matches an automatic pattern or an exact model override enables it;
- the current scope contains at least one shim tool.

The default automatic pattern is `gpt-5.6-*`. Users can replace it with patterns such as `deepseek-v4-*`, set it to an empty list to disable automatic matching, or use explicit provider/model overrides. The UI exposes the same settings through the DSH settings slot.

## Shim tools

The following tools are registered by the bundle and advertised only on an active Codex route. “Degraded” means the underlying DSH capability cannot provide the complete Codex operation.

| Tool           | Status      | DSH capability                        | Notes                                                                                                                                                                   |
| -------------- | ----------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `exec_command` | Available   | `ctx.shell`, sandbox policy, approval | Runs commands, returns bounded output, and keeps sessions for later polling.                                                                                            |
| `write_stdin`  | Degraded    | `ShellProcess` reads                  | Polls an existing session. Non-empty stdin is rejected because the current DSH shell definition has no stdin-write operation.                                           |
| `apply_patch`  | Available   | `ctx.fs`, `ctx.shell`                 | Supports Codex patch markers, file add/delete/update/move, and fuzzy hunk matching. `apply-patch` and `applypatch` remain compatibility aliases but are not advertised. |
| `view_image`   | Conditional | `ctx.fs`, attachment service          | Reads PNG, JPEG, WebP, and GIF files when the profile provides filesystem and image-attachment capabilities.                                                            |
| `update_plan`  | Available   | Durable `todo/write` session event    | Stores `pending`, `in_progress`, and `completed` steps with at most one active step.                                                                                    |
| `web_run`      | Search-only | `ctx.web.search()`                    | Accepts multiple `search_query` items and returns provider sources. It does not implement `open`, `click`, `find`, screenshots, or arbitrary fetch.                     |

## Masked host tools

When a replacement tool is present, the gate hides overlapping host tools from the active prompt advertisement. It does not unregister them, so the host surface returns when the route changes or the shim is removed.

| Shim tool present              | Masked host tools                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `exec_command`                 | `bash`, `pwsh`, `read`, `glob`, `grep`                                                                  |
| `exec_command` + `write_stdin` | `terminal_close`, `terminal_list`, `terminal_open`, `terminal_read`, `terminal_send`, `terminal_signal` |
| `apply_patch`                  | `edit`, `str_replace_editor`, `write`                                                                   |
| `view_image`                   | `read_image`                                                                                            |
| `update_plan`                  | `todo_write`                                                                                            |
| `web_run`                      | `web_search`                                                                                            |

Masking is scope-aware. If a prerequisite tool is not resolvable in the current composition, its mask is not applied.

## Limitations

- `write_stdin` is a polling adapter, not a full interactive terminal. A generic DSH shell definition and provider are required for stdin writes, signals, and terminal control.
- `web_run` is intentionally search-only. A future page-reference or web-fetch provider should add those capabilities through a separate DSH seam; this package does not ship an OpenAI-hosted provider.
- Patch interception covers direct Codex patch invocations. A patch hidden inside a larger shell script is left to the shell instead of being guessed.
- Tool availability follows profile composition. Missing shell, filesystem, or attachment capabilities produce explicit failures rather than simulated success.

The shim consumes capability definitions; it does not choose or implement providers. Provider selection remains the responsibility of the DSH profile.

## TODO / Roadmap

These items are deferred work; they are not current capabilities:

- **OpenAI Responses web fetch:** add a separate DSH web definition/provider that uses the active Responses endpoint for the matched route, then expose page references, navigation, and fetch operations only when the provider supports them. Keep `web_run` search-only when it does not. Do not hardcode an endpoint or add an OpenAI-hosted search provider to this shim.
- **Interactive terminal:** extend the generic DSH shell definition and providers with stdin writes, signals, session listing/open/close, PTY behavior, and cross-platform parity; then upgrade `write_stdin` and session handling without claiming unsupported operations.
- **Codex parity:** compare tool schemas, argument validation, errors, lifecycle behavior, permission prompts, transcript events, and WebUI presentation against the referenced Codex release. Add composition and acceptance tests for every supported capability before widening the surface.

The goal is the closest practical Codex experience over DSH capabilities. Runtime, OAuth, and Responses wire-protocol compatibility remain outside this package.

## Compatibility

| Component        | Supported baseline                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek Harness | Upstream commit `47f943859bef60e4160492346772ded9b24f765a`, corresponding to `0.1.0-rc.5`; compatible updates within the same `0.1.x` line may work.                                           |
| DSH peers        | `@deepseek-ai/dsh-*` peers target `^0.1.0-rc.5`; Cordis targets `^4.0.1` so the plugin does not install a second Cordis runtime.                                                               |
| Node.js          | `^22.19.0` or `>=24.0.0`.                                                                                                                                                                      |
| React/WebUI      | React 18; browser code uses DSH client locale, settings, connection, runtime, and slot APIs.                                                                                                   |
| Codex reference  | `@openai/codex` / `codex-cli 0.147.0`, used as the tool-name, patch-behavior, and app-server product reference. This package does not claim full Codex runtime or wire-protocol compatibility. |

Each shim release is composition-tested against the listed baseline. Recheck tool schemas, prompt sections, approval/sandbox fields, and WebUI slot contracts after upgrading DSH or Codex.

**Windows:** behavior and compatibility on Windows are not yet tested. Development and testing target Unix-style shell and filesystem semantics; please report issues if you run into problems on Windows.

## Development

```sh
pnpm install
pnpm run check
pnpm run bench
```

The published package includes `lib/`, `cordis.patch.yml`, both README files, and the license. Source persona and locale assets are bundled during `tsdown` build.

Pushing a `vX.Y.Z` tag that exactly matches `package.json` runs the GitHub Actions release workflow. It runs `pnpm run check`, attaches the packed tarball to a GitHub Release, and does not publish to npm.

## License

MIT. See [LICENSE](LICENSE).
