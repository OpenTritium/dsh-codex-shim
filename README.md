# @opentritium/dsh-codex-shim

GPT 等模型的工具调用能力并不只取决于模型本身，也严重依赖它们训练和适配的
harness/agent 工具词汇、参数 schema、system prompt 和结果呈现方式。模型看到
熟悉的工具接口，通常更容易选择正确的工具、生成可执行的参数，并在工具失败后
继续完成任务。

## 提供的能力

### Shim 工具

下表是插件注册并在 Codex 路由上展示的工具。状态描述的是当前 shim 的真实能力，不代表与原生 Codex 完全等价。

默认的 `modelPatterns` 是 `gpt-5.6-*`，因此只有 GPT-5.6 系列会自动进入 Codex 环境模拟。用户可以在 profile 的 `opentritium-codex-gate` 配置或插件设置中将规则显式设为 `[]` 或空白以关闭默认匹配，也可以改为自己的 glob，例如 `deepseek-v4-*`。

| Codex 工具     | 当前状态       | DSH 接入                              | 说明                                                                                                                                      |
| -------------- | -------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `exec_command` | 可用           | `ctx.shell`、sandbox policy、approval | 执行命令、读取增量输出、保留后台 session；遵守 DSH 的 sandbox 和审批策略。                                                                |
| `write_stdin`  | 降级可用       | `ShellProcess` 增量读取               | 可以轮询已有 session；当前 DSH 没有 stdin 写入接口，`chars` 非空时会明确报错。                                                            |
| `apply_patch`  | 可用           | `ctx.fs`、`ctx.shell`                 | 支持 Codex patch marker、添加/删除/更新/移动文件和模糊匹配；`apply-patch`、`applypatch` 仅作为兼容别名注册，不在 Codex surface 中主展示。 |
| `view_image`   | 条件可用       | `ctx.fs`、attachment service          | 读取 PNG/JPEG/WebP/GIF 并保存为 DSH image attachment；缺少文件或 attachment capability 时不会假装成功。                                   |
| `update_plan`  | 可用           | `todo/write` session event            | 使用 DSH 持久化的 todo 事件，支持 `pending`、`in_progress`、`completed`，并限制同时只有一个进行中步骤。                                   |
| `web_run`      | 搜索-only 降级 | `ctx.web.search()`                    | 支持多个 `search_query`，返回来源 URL 和 provider answer；不实现网页打开、点击、查找、截图或任意 fetch。                                  |

### Mask 的上游工具

当 Codex route 激活且对应 shim 工具存在时，gate 会从该次 prompt assembly
的 tool advertisement 中隐藏下表工具。mask 只影响当前 Codex surface 的
展示和提示词；插件不会销毁上游注册，路由切换后仍可恢复 host surface。

| Shim 前提                      | Mask 的上游工具                                                                                         | 目的                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `exec_command`                 | `bash`、`pwsh`、`read`、`glob`、`grep`                                                                  | 避免同时暴露另一套命令、文件读取和搜索词汇。 |
| `exec_command` + `write_stdin` | `terminal_close`、`terminal_list`、`terminal_open`、`terminal_read`、`terminal_send`、`terminal_signal` | 避免与 Codex session 工具重复。              |
| `apply_patch`                  | `edit`、`str_replace_editor`、`write`                                                                   | 将文件修改入口统一到 Codex patch。           |
| `view_image`                   | `read_image`                                                                                            | 将图像读取入口统一到 `view_image`。          |
| `update_plan`                  | `todo_write`                                                                                            | 将计划入口统一到 `update_plan`。             |
| `web_run`                      | `web_search`                                                                                            | 将搜索入口统一到 `web_run`。                 |

如果某个前提工具没有在当前 scope 中解析出来，对应 mask 不会生效。这样
headless、部分 WebUI 或不同 profile composition 不会因为缺少可选能力而
错误宣称已经完成替换。

## 当前局限和降级能力

这些不是可以通过 shim 再包一层 JSON 就解决的问题，而是底层 DSH capability
尚未提供的能力。插件会明确拒绝或降级，不会把不支持的操作伪装成成功。

1. **`write_stdin` 不是完整交互终端。** 当前 `ShellProcess` 只支持增量读取和结束状态，没有通用 stdin write。需要真正的交互输入、信号和终端控制时，应先提供通用的 DSH shell Service Definition，再由独立 provider 实现，shim 只消费它。
2. **`web_run` 不是 Codex 全量 web tool。** 当前绑定的是 DSH 的 `ctx.web.search()` 定义者和 profile 选择的搜索 provider，只有搜索能力。未来的 Responses/web-fetch provider 应独立提供网页引用、导航和抓取能力，shim 再通过消费者选项接入；本包不内置 OpenAI hosted search provider。
3. **`apply_patch` 只拦截明确的调用形式。** raw patch、heredoc 和 `cd ... && apply_patch` 有专门解析路径；嵌在更大 shell script 中的 patch 不会被猜测拦截，而是交给 shell，保持失败行为诚实。
4. **工具能力受 profile composition 限制。** `view_image` 需要 filesystem 和 attachment capability，`exec_command` 需要 shell；缺失 capability 时工具不会提供虚假的 fallback。`apply_patch` 的目录创建和删除会通过当前 shell provider 使用对应平台的命令。

后续应把缺失能力放在独立的 DSH 定义者/提供者插件中，例如交互式 shell provider
和网页 fetch provider；不要把 provider-specific 逻辑继续堆进本 shim。这样同一
个定义者可以由多个 provider 实现，shim 也可以在设置中选择实际后端。

## 兼容性

| 项目 | 兼容范围或基线 |
| --- | --- |
| DeepSeek Harness | 基线是官方上游 commit `47f943859bef60e4160492346772ded9b24f765a` 对应的 `0.1.0-rc.5`；允许同一 `0.1.x` 系列的兼容更新。 |
| DSH 共享 API | 所有 `@deepseek-ai/dsh-*` peer dependency 使用 `^0.1.0-rc.5`，`@deepseek-ai/cordis` 使用 `^4.0.1`，避免引入第二个 Cordis runtime。 |
| Schemastery | `@deepseek-ai/schemastery` 为普通运行时依赖，基线为 `^3.18.1`。 |
| 构建与测试 | Node types `22.20.0`、Lightning CSS `1.32.0`、Oxlint `1.76.0`、tsdown `0.22.2`、TypeScript `6.0.3`、Vitest `4.1.8`；浏览器客户端经 Rolldown 压缩并保留 source map，服务端入口保持可读；Oxfmt 是 shim 独有的开发工具。 |
| Codex 参照实现 | `@openai/codex` / `codex-cli 0.147.0`；该版本用于工具名、`apply_patch` 行为和 app-server 产品测试基线，不表示本 shim 实现了完整 Codex。 |
| Node.js | `^22.19.0` 或 `>=24.0.0`。 |
| React/WebUI | React 18；浏览器功能通过 DSH client slots、locale、settings transport 等公开接口接入。 |
| 平台 | prompt、plan、web、UI 以及统一 `exec_command` / `write_stdin` 使用 DSH 当前平台的 shell provider；`write_stdin` 仍只支持轮询。 |

DSH 仍处于预发布阶段。本包的 peer range 接受 `0.1.x` 中与基线兼容的更新，但每个 shim 版本只对表中基线做组合验证；`0.2.0`、Cordis major 升级或公开 seam 变更需要新的 shim 版本。升级上游 Harness 后，应重新检查工具 schema、prompt 片段、approval/sandbox 字段与 WebUI slot contract，并运行本插件的组合测试；当前版本不跟踪 DSH 或 Codex `latest`。

## 安装和 profile 组合

在已经包含 `@deepseek-ai/dsh-base` 的 Harness checkout 或 profile 中：

```sh
dsh plugin --profile codex-shim-dev add https://github.com/OpenTritium/dsh-codex-shim.git
dsh --profile codex-shim-dev --dump-config
```

profile 会先加载 `@deepseek-ai/dsh-base`，再加载本 bundle。`dsh plugin` 会负责
维护 profile 的 `package.json` 和 `dsh.profile.bundles` 顺序；不要手写或覆盖这
两个字段。profile 自己负责模型凭据、provider 配置和环境变量，本包不保存这些信息。

移除 bundle 后应只剩上游 profile：

```sh
dsh plugin --profile codex-shim-dev remove @opentritium/dsh-codex-shim
dsh --profile codex-shim-dev --dump-config
```
