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
- `web_run` over `ctx.web.search()` and the profile's configured DSH search provider.
- Browser tool rows for Codex tool calls.
- A **Settings -> Plugins -> Plugin configuration** card that edits the
  `opentritium-codex` user layer. The profile overlay remains its composition
  default; browser saves never rewrite `cordis.patch.yml`.

Browser contributions are dependency-gated. Tool rows wait only for the common
`slots` and `locale` services; the settings card is mounted separately when
`settingsScope` and the `settings.plugin.item` slot are provided. A headless
profile therefore keeps the host tools and prompt without loading browser code,
and a partial WebUI does not lose tool rows because its settings surface is
absent.

`web_run` is deliberately search-only. It accepts `search_query: [{ q }]`; it does not support `open`, `click`, `find`, screenshots, or arbitrary page fetch. It delegates search to the provider selected by the DSH profile; the shim owns neither a web provider nor provider credentials.

## Upstream Seam Required

The pinned upstream's settings transport has an explicit namespace allowlist,
so an external settings card cannot use `ctx.settingsScope` for its own
namespace. The separately reviewable generic patch used for development adds
`expose: 'client'` to `settings.register()` and makes the Host API Proxy serve
only namespaces that explicitly opt in. This bundle declares that option for
`opentritium-codex`; no `@deepseek-ai` package contains Codex-specific rows.

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
