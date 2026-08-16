# @opentritium/dsh-codex-shim

[English README](README.md)

本插件在选定的模型路由上模拟 Codex 风格的 prompt、tool vocabulary、工具结果和 WebUI 展示，帮助 GPT 系列及其他适配 Codex 的模型更可靠地调用工具。

本包是 shim，不是 Codex runtime。它不启动 Codex app-server，不处理 Codex OAuth，不提供模型、凭据、命令执行器或网页搜索后端。插件只通过 DSH 的公开 Service Definition、Consumer 和 UI slot 使用现有能力；模型不匹配或移除 bundle 后，DSH 会照常使用它原本的工具和行为。

## 在 profile 中安装

以下示例将 bundle 安装到 WebUI `web` profile。由 `dsh plugin` 维护 profile manifest 和依赖列表。

#### 使用 `gh` 下载 Release tarball

```sh
gh release download --repo OpenTritium/dsh-codex-shim --pattern 'opentritium-dsh-codex-shim-*.tgz'
pnpm dsh plugin --profile web add ./opentritium-dsh-codex-shim-*.tgz
pnpm dsh --profile web --dump-config
```

没有 GitHub CLI 时，可用 `curl` 与 `jq` 下载同一个最新 Release 资产：

```sh
curl -fsSL https://api.github.com/repos/OpenTritium/dsh-codex-shim/releases/latest \
  | jq -r '.assets[] | select(.name | endswith(".tgz")) | .browser_download_url' \
  | xargs -r curl -fLO
pnpm dsh plugin --profile web add ./opentritium-dsh-codex-shim-*.tgz
pnpm dsh --profile web --dump-config
```

**如果内置的 `gpt-5.6-*` 规则已经够用，无需阅读下面两个关于配置的小节。**

### 通过配置文件配置

通过 profile 的 settings provider 配置本插件。默认的文件 provider 使用 `$DSH_HOME/settings.yaml`（通常是 `~/.dsh/settings.yaml`）；在其中创建或编辑 `codex-shim:` 分节即可。在显式设置 `modelPatterns` 前，bundle 内置的 `gpt-5.6-*` 自动规则仍然生效。

```yaml
codex-shim:
  enabled: true
  modelPatterns:
    - gpt-5.6-*
    - deepseek-v4-*
  modelOverrides:
    - provider: openai
      model: gpt-5.6-luna
      enabled: true
    - provider: example-provider
      model: experimental-model
      enabled: false
```

`enabled: false` 会关闭全局 shim。`modelPatterns` 会替换自动启用规则列表；填 `modelPatterns: []` 可以关闭自动匹配。每条 `modelOverrides` 是精确的 provider/model 决策，优先于自动规则；未添加的模型仍遵循自动规则。provider 和 model 必须与 DSH 解析出的路由完全一致。

文件 settings provider 会监听合法的配置修改，因此路由策略会热更新。如果 profile 使用其他 settings provider，应通过该 provider 配置同一个 namespace。

### 补丁 WebUI 以提供可视化配置（可选）

DSH `47f943859bef60e4160492346772ded9b24f765a` 尚不能让外部 bundle 将 settings namespace 暴露给 WebUI。不需要设置卡时，只安装 tarball 并按上面的 `settings.yaml` 配置即可。若希望获得更好的 GUI 设置体验，对应 Release 会附带 `deepseek-harness-settings-client-exposure-47f9438.patch`：这是一个不包含 OpenTritium 或 Codex 行为的通用 WebUI settings 白名单扩展。

只在该精确、干净的 DSH commit 上应用 patch，重建 DSH 后再安装 Release tarball：

```sh
gh release download --repo OpenTritium/dsh-codex-shim --pattern 'opentritium-dsh-codex-shim-*.tgz' --pattern 'deepseek-harness-settings-client-exposure-47f9438.patch'
git clone https://github.com/deepseek-ai/deepseek-harness.git deepseek-harness
cd deepseek-harness
git checkout 47f943859bef60e4160492346772ded9b24f765a
git apply --check ../deepseek-harness-settings-client-exposure-47f9438.patch
git apply ../deepseek-harness-settings-client-exposure-47f9438.patch
pnpm install && pnpm run build
pnpm dsh plugin --profile web add ../opentritium-dsh-codex-shim-*.tgz
pnpm dsh --profile web --dump-config
```

该 patch 为 settings owner 增加显式的 `expose: 'client'` 选项；不会加载本 bundle、添加 OpenTritium row 或改变模型/工具行为。不要对 dirty checkout 或其他 commit 应用它；应等待上游提供等价能力。

### 卸载

移除 bundle 不需要 DSH patch，并会恢复纯上游的 profile 组合：

```sh
pnpm dsh plugin --profile web remove @opentritium/dsh-codex-shim
pnpm dsh --profile web --dump-config
```

若之前应用过可选的 WebUI patch，请先移除 bundle。只有确认没有其他本地外部 bundle 使用 `expose: 'client'` 时，才反向应用 patch：

```sh
pnpm dsh plugin --profile web remove @opentritium/dsh-codex-shim
git apply --reverse --check ../deepseek-harness-settings-client-exposure-47f9438.patch
git apply --reverse ../deepseek-harness-settings-client-exposure-47f9438.patch
pnpm run build
pnpm dsh --profile web --dump-config
```

`dsh plugin remove` 会删除 profile 依赖和 bundle layer。若也要清理已保存的 shim 偏好，删除 `$DSH_HOME/settings.yaml` 中完整的 `codex-shim:` 分节即可；文件 settings provider 会热更新合法修改。

## 路由和配置

bundle 会全局挂载 gate，但只有同时满足以下条件时才应用 Codex surface：

- 全局开关已启用；
- 当前模型匹配自动规则，或显式的 provider/model override 启用它；
- 当前 scope 中至少存在一个 shim tool。

默认自动规则是 `gpt-5.6-*`。用户可以改成 `deepseek-v4-*` 等规则，填入空列表关闭自动匹配，或使用显式 provider/model override。WebUI 设置页通过 DSH settings slot 提供相同配置。

## Shim 工具

下列工具由 bundle 注册，并只在激活的 Codex 路由中向模型展示。“降级”表示底层 DSH capability 尚未覆盖完整 Codex 操作。

| 工具           | 状态     | DSH capability                        | 说明                                                                                                                          |
| -------------- | -------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `exec_command` | 可用     | `ctx.shell`、sandbox policy、approval | 执行命令、限制输出，并保留 session 供后续轮询。                                                                               |
| `write_stdin`  | 降级可用 | `ShellProcess` 读取                   | 可以轮询已有 session。当前 DSH shell 定义没有 stdin 写入操作，非空 stdin 会明确拒绝。                                         |
| `apply_patch`  | 可用     | `ctx.fs`、`ctx.shell`                 | 支持 Codex patch marker、添加/删除/更新/移动文件和模糊匹配。删除二进制文件时不显示文本 diff。`apply-patch`、`applypatch` 仅作为兼容别名，不在 surface 中展示。 |
| `view_image`   | 条件可用 | `ctx.fs`、attachment service          | profile 提供 filesystem 和图片 attachment capability 时读取 PNG、JPEG、WebP、GIF。                                            |
| `update_plan`  | 可用     | 持久化 `todo/write` session event     | 保存 `pending`、`in_progress`、`completed` 步骤，最多一个进行中步骤。                                                         |
| `web_run`      | 仅搜索   | `ctx.web.search()`                    | 接收多个 `search_query` 并返回 provider 来源；不实现 `open`、`click`、`find`、截图或任意 fetch。                              |

## 被 Mask 的工具

当替代工具存在时，gate 会从当前 prompt advertisement 中隐藏重叠的上游工具。它不会注销这些工具，因此路由切换或移除 shim 后，上游 surface 会恢复。

| 已存在的 shim 工具             | 隐藏的上游工具                                                                                          |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- |
| `exec_command`                 | `bash`、`pwsh`、`read`、`glob`、`grep`                                                                  |
| `exec_command` + `write_stdin` | `terminal_close`、`terminal_list`、`terminal_open`、`terminal_read`、`terminal_send`、`terminal_signal` |
| `apply_patch`                  | `edit`、`str_replace_editor`、`write`                                                                   |
| `view_image`                   | `read_image`                                                                                            |
| `update_plan`                  | `todo_write`                                                                                            |
| `web_run`                      | `web_search`                                                                                            |

Mask 具有 scope 感知能力。如果前置工具无法在当前 composition 中解析，对应 mask 不会生效。

## 局限性

- `write_stdin` 只是轮询适配器，不是完整交互终端。要支持 stdin 写入、信号和终端控制，需要通用的 DSH shell 定义者和提供者。
- `web_run` 有意保持搜索-only。未来的网页引用或抓取 provider 应通过独立 DSH seam 提供这些能力；本包不携带 OpenAI hosted provider。
- 补丁拦截覆盖直接的 Codex patch 调用。隐藏在更大 shell script 中的 patch 会交给 shell，不会被猜测拦截。
- 工具可用性取决于 profile composition。缺少 shell、filesystem 或 attachment capability 时会明确失败，不模拟成功。

shim 只消费 capability 定义，不实现或选择 provider。实际 provider 由 DSH profile 负责选择。

## TODO / 路线图

以下是后续工作，不代表当前已经提供这些能力：

- **OpenAI Responses 网页抓取：** 新增独立的 DSH web 定义者/提供者，使用当前命中路由的 Responses 端点；只有 provider 真正支持时，才暴露网页引用、导航和抓取操作。不支持时继续保持 `web_run` 仅搜索。本 shim 不硬编码端点，也不加入 OpenAI hosted search provider。
- **交互式终端：** 扩展通用 DSH shell 定义者和提供者，支持 stdin 写入、信号、session 列出/打开/关闭、PTY 行为和跨平台一致性；再升级 `write_stdin` 与 session 管理，不宣称尚未支持的操作。
- **Windows 兼容性：** 在宣称支持 Windows 前，补充 Windows CI，覆盖 bundle 安装、profile 组合、已支持工具的行为和 WebUI 启动。
- **Codex 行为对齐：** 对照参照版本检查工具 schema、参数校验、错误、生命周期、权限请求、transcript event 和 WebUI 展示；每项能力先补 composition 和 acceptance 测试，再扩大 surface。

目标是在 DSH capability 之上尽可能接近 Codex 体验。Runtime、OAuth 和 Responses wire protocol 兼容仍不属于本包范围。

## 兼容性

| 组件             | 支持基线                                                                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| DeepSeek Harness | tarball 安装固定为 commit `47f943859bef60e4160492346772ded9b24f765a`（`0.1.0-rc.5`）。对应的 settings-client-exposure patch 是可选项，仅用于显示 WebUI 设置卡；不假定附近 commit 兼容。 |
| DSH peers        | `@deepseek-ai/dsh-*` peer 目标为 `^0.1.0-rc.5`；Cordis 目标为 `^4.0.1`，避免安装第二个 Cordis runtime。                                   |
| Node.js          | `^22.19.0` 或 `>=24.0.0`。                                                                                                                |
| React/WebUI      | React 18；浏览器代码使用 DSH 的 locale、settings、connection、runtime 和 slot API。                                                       |
| Codex 参照       | `@openai/codex` / `codex-cli 0.147.0`，用于工具名、patch 行为和 app-server 产品参照。本包不声明完整 Codex runtime 或 wire protocol 兼容。 |

每个 shim 版本都会针对表中的基线进行组合验证。升级 DSH 或 Codex 后，应重新检查工具 schema、prompt section、approval/sandbox 字段和 WebUI slot contract。

**Windows：** Windows 上的行为和兼容性尚未测试。当前开发和测试以 Unix 风格的 shell 与 filesystem 语义为目标；若在 Windows 上运行遇到问题，请反馈。

## 开发

```sh
pnpm install
pnpm run check
pnpm run bench
```

发布包包含 `lib/`、`cordis.patch.yml`、两份 README 和许可证。persona 与 locale 源文件会在 `tsdown` 构建时打包。

推送与 `package.json` 版本严格对应的 `vX.Y.Z` tag 会触发 GitHub Actions 发布流程。它会验证可选的源码集成、运行 `pnpm run check`，将打出的 tarball 和可选 GUI patch 附加到 GitHub Release，不会发布到 npm。

## 许可证

MIT，详见 [LICENSE](LICENSE)。
