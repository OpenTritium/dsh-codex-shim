# @opentritium/dsh-codex-shim

Codex-compatible prompt and tool vocabulary for DeepSeek Harness, owned and published by OpenTritium.

## Compatibility

This release targets DeepSeek Harness commit `47f943859bef60e4160492346772ded9b24f765a`.

The bundle adds only `opentritium-codex-*` profile rows. It does not modify `@deepseek-ai/dsh-base`, and removing it restores the unmodified upstream profile.

## Install

From a Harness checkout or profile that already contains `@deepseek-ai/dsh-base`:

```sh
dsh plugin --profile codex-shim-dev add https://github.com/OpenTritium/dsh-codex-shim.git
dsh --profile codex-shim-dev --dump-config
```

For local development, replace the Git URL with the local repository path. Profile-specific credentials and providers remain in the profile, not in this bundle.

## Included Surface

- Route-aware Codex prompt and tool advertisement, configured by `opentritium-codex` settings.
- `exec_command`, `apply_patch`, `view_image`, and `update_plan` adapters over public Harness services.
- `web_run` over `ctx.web.search()`.
- Browser tool rows for Codex tool calls.

`web_run` is deliberately search-only. It accepts `search_query: [{ q }]`; it does not support `open`, `click`, `find`, screenshots, arbitrary page fetch, or an OpenAI-hosted search provider.

## Upstream Seam Required

Pinned upstream exposes `ShellProcess.start()`, incremental output reads, and termination, but not an interactive stdin write method. Consequently `write_stdin` can poll an existing session but rejects non-empty `chars`; it is not advertised as interactive input support.

Completing that compatibility slice requires a separately reviewable, generic upstream extension to `ShellProcess`, not Codex-specific logic. This package intentionally does not bypass `ctx.shell` through raw subprocess spawning because that would evade the configured shell sandbox policy.

The published Harness client dependency graph currently includes an unpublished `@deepseek-ai/dsh-compact` package. When developing this bundle against a source checkout, install the peer packages from the pinned Harness checkout; normal profile composition uses the already-installed Harness packages.

## Development

```sh
pnpm install --config.auto-install-peers=false
pnpm run typecheck
pnpm test
pnpm run build
pnpm pack
```

`prepare` builds `lib/` for Git installs. The package includes `lib/` and `cordis.patch.yml` in its packed artifact.
