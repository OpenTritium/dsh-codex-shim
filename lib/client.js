window.__ModuleLoader__.load({
	id: "@opentritium/dsh-codex-shim",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region \0opentritium-css-module:L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw
		const css = ".JcK1UG_root{flex-direction:column;display:flex}.JcK1UG_row{align-items:center;min-width:0;height:24px;display:flex;position:relative;overflow:hidden}.JcK1UG_root[data-state=running] .JcK1UG_row:after{content:\"\";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite JcK1UG_dsh-codex-row-sweep;position:absolute;inset:0 auto 0 0}@keyframes JcK1UG_dsh-codex-row-sweep{0%{left:-300px}90%,to{left:100%}}.JcK1UG_leading{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex;position:relative}.JcK1UG_chevron{color:var(--dsw-alias-label-secondary)}.JcK1UG_title{color:var(--dsw-alias-label-secondary);flex:none;font-size:14px;line-height:24px}.JcK1UG_separator{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.JcK1UG_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:14px;line-height:24px;overflow:hidden}.JcK1UG_errorSummary{color:var(--dsw-alias-state-error-primary)}.JcK1UG_bodyWrap{flex-direction:column;gap:4px;padding:4px 0 2px 4px;display:flex}.JcK1UG_ioCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);border-radius:8px;grid-template-columns:32px minmax(0,1fr);min-width:0;display:grid;overflow:hidden}.JcK1UG_ioLabel{border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-caption);padding:8px 4px 8px 8px;font-size:10px;font-weight:600;line-height:16px}.JcK1UG_ioText{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;max-height:220px;font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-secondary);margin:0;padding:8px 10px;overflow:auto}.JcK1UG_ioText[data-error]{color:var(--dsw-alias-state-error-primary)}.JcK1UG_inspectButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;align-self:flex-start;align-items:center;gap:4px;margin:0 0 0 4px;padding:2px 8px;font-size:11px;line-height:16px;display:inline-flex}.JcK1UG_inspectButton:hover,.JcK1UG_inspectButton:focus-visible{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.JcK1UG_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:reduce){.JcK1UG_root[data-state=running] .JcK1UG_row:after{animation:none;display:none}}";
		const tag = "@opentritium/dsh-codex-shim/CodexToolRow.module.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css='${tag}']`) === null) {
			const element = document.createElement("style");
			element.dataset.plugin = "@opentritium/dsh-codex-shim";
			element.dataset.pluginCss = tag;
			element.textContent = css;
			document.head.appendChild(element);
		}
		var _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default = {
			"title": "JcK1UG_title",
			"row": "JcK1UG_row",
			"ioText": "JcK1UG_ioText",
			"bodyWrap": "JcK1UG_bodyWrap",
			"separator": "JcK1UG_separator",
			"errorSummary": "JcK1UG_errorSummary",
			"summary": "JcK1UG_summary",
			"leading": "JcK1UG_leading",
			"inspectButton": "JcK1UG_inspectButton",
			"visuallyHidden": "JcK1UG_visuallyHidden",
			"chevron": "JcK1UG_chevron",
			"dsh-codex-row-sweep": "JcK1UG_dsh-codex-row-sweep",
			"ioCard": "JcK1UG_ioCard",
			"root": "JcK1UG_root",
			"ioLabel": "JcK1UG_ioLabel"
		};
		//#endregion
		//#region src/client/CodexToolRow.tsx
		function firstLine(value) {
			const newline = value.indexOf("\n");
			return newline === -1 ? value : value.slice(0, newline);
		}
		function argsOf(block) {
			return "kind" in block ? block.call?.argsRaw ?? "" : block.argsRaw;
		}
		function resultText(block) {
			if (!("kind" in block)) return null;
			const parts = block.content.map((item) => item.type === "text" ? item.text : JSON.stringify(item, null, 2));
			if (parts.length === 0 && block.error !== void 0) parts.push(`${block.error.name}: ${block.error.code}`);
			return parts.join("\n") || null;
		}
		function patchDiffs(block) {
			if (!("kind" in block)) return block.callView?.card === "diff" ? block.callView.diffs : null;
			return block.resultView?.card === "diff" ? block.resultView.diffs : null;
		}
		function contentLineCount(text) {
			if (text === null || text === "") return 0;
			return (text.endsWith("\n") ? text.slice(0, -1) : text).split("\n").length;
		}
		function patchSummary(diffs) {
			const paths = [...new Set(diffs.map((diff) => diff.path))];
			return `${paths.length <= 2 ? paths.join(", ") : `${paths.slice(0, 2).join(", ")} +${paths.length - 2}`} · +${diffs.reduce((total, diff) => total + contentLineCount(diff.newText), 0)} -${diffs.reduce((total, diff) => total + contentLineCount(diff.oldText), 0)}`;
		}
		function rowState(block) {
			if (!("kind" in block)) return "running";
			if (block.error?.code === "interrupted") return "stopped";
			return block.isError ? "error" : "ok";
		}
		function objectArgs(argsRaw) {
			try {
				const value = JSON.parse(argsRaw);
				return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
			} catch {
				return;
			}
		}
		function stringArg(args, key) {
			const value = args?.[key];
			return typeof value === "string" && value !== "" ? value : void 0;
		}
		function iconName(toolName) {
			switch (toolName) {
				case "exec_command":
				case "write_stdin": return "bash";
				case "apply_patch": return "edit";
				case "view_image": return "read";
				case "update_plan": return "checklist";
				default: return "other";
			}
		}
		function iconFor(toolName) {
			switch (toolName) {
				case "exec_command":
				case "write_stdin": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconApiOutline14, { size: 14 });
				case "apply_patch": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconEditOutline16, { size: 14 });
				case "view_image": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconBrowseOutline16, { size: 14 });
				case "update_plan": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChecklistOutline14, { size: 14 });
				default: return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconSparkle16, { size: 14 });
			}
		}
		function titleKey(toolName) {
			switch (toolName) {
				case "exec_command": return "row.execCommand";
				case "write_stdin": return "row.writeStdin";
				case "apply_patch": return "row.applyPatch";
				case "view_image": return "row.viewImage";
				case "update_plan": return "row.updatePlan";
				default: return "row.execCommand";
			}
		}
		function summaryFor(toolName, argsRaw, t) {
			const args = objectArgs(argsRaw);
			switch (toolName) {
				case "exec_command": return firstLine(stringArg(args, "cmd") ?? t("row.command"));
				case "write_stdin": {
					const sessionId = args?.session_id;
					return typeof sessionId === "number" ? t("row.session", { id: sessionId }) : t("row.writeStdin");
				}
				case "apply_patch": return t("row.patch");
				case "view_image": return firstLine(stringArg(args, "path") ?? t("row.image"));
				case "update_plan": {
					const plan = args?.plan;
					return Array.isArray(plan) ? t("row.planSteps", { count: plan.length }) : t("row.plan");
				}
				default: return firstLine(argsRaw);
			}
		}
		function stateLabel(state, t) {
			switch (state) {
				case "running": return t("row.running");
				case "error": return t("row.failed");
				case "stopped": return t("row.stopped");
				default: return null;
			}
		}
		function leadingFor(state, icon) {
			switch (state) {
				case "error": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "error" });
				case "stopped": return /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.StateDot, { state: "warning" });
				default: return icon;
			}
		}
		/**
		* Render one Codex tool call with a standard icon and a replay-stable body.
		* @param props - keyed toolview props and the Codex locale seat.
		* @returns the Codex tool row.
		*/
		function CodexToolRow({ toolName, block, inspect, t }) {
			const [expanded, setExpanded] = (0, react.useState)(false);
			const state = rowState(block);
			const argsRaw = argsOf(block);
			const output = resultText(block);
			const diff = toolName === "apply_patch" ? patchDiffs(block) : null;
			const expandable = diff !== null || argsRaw !== "" || output !== null;
			const open = expanded && expandable;
			const summary = (state === "error" && output !== null ? firstLine(output) : null) ?? (diff === null ? summaryFor(toolName, argsRaw, t) : patchSummary(diff));
			const status = stateLabel(state, t);
			const toggle = () => {
				setExpanded((value) => !value);
			};
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.root,
				"data-tool": toolName,
				"data-icon": iconName(toolName),
				"data-state": state,
				children: [status !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.visuallyHidden,
					children: status
				}) : null, /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DisclosureRow, {
					rowClassName: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.row,
					leadingClassName: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.leading,
					titleClassName: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.title,
					chevronClassName: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.chevron,
					icon: leadingFor(state, iconFor(toolName)),
					title: t(titleKey(toolName)),
					open,
					expandable,
					expandOnRowClick: true,
					keepContentWhenOpen: true,
					onToggle: toggle,
					collapsedContent: summary !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)(react_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.separator,
						"aria-hidden": true
					}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
						className: state === "error" ? `${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.summary} ${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.errorSummary}` : _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.summary,
						children: summary
					})] }) : void 0,
					children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
						className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.bodyWrap,
						children: [
							diff !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.DiffBlock, {
								diffs: diff,
								maxLines: 8
							}) : null,
							diff === null && argsRaw !== "" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioCard,
								"aria-label": t("row.input"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioLabel,
									children: t("row.input")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioText,
									children: argsRaw
								})]
							}) : null,
							diff === null && output !== null ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("section", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioCard,
								"aria-label": t("row.output"),
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioLabel,
									children: t("row.output")
								}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("pre", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.ioText,
									"data-error": state === "error" || void 0,
									children: output
								})]
							}) : null,
							inspect !== void 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
								type: "button",
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default.inspectButton,
								onClick: inspect,
								children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconInspectOutline12, {}), t("row.inspect")]
							}) : null
						]
					})
				})]
			});
		}
		//#endregion
		//#region src/client/locales.ts
		/** Locale dictionaries for the Codex tool rows. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "codex";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"row.running": "正在运行 Codex 工具",
			"row.failed": "Codex 工具失败",
			"row.stopped": "Codex 工具已中止",
			"row.execCommand": "命令",
			"row.writeStdin": "终端",
			"row.applyPatch": "补丁",
			"row.viewImage": "图像",
			"row.updatePlan": "计划",
			"row.command": "执行命令",
			"row.session": "会话 {id}",
			"row.patch": "应用补丁",
			"row.image": "查看图像",
			"row.plan": "更新计划",
			"row.planSteps": "{count} 个步骤",
			"row.input": "输入",
			"row.output": "输出",
			"row.inspect": "检查"
		};
		/** English dictionary, checked complete against the zh key set. */
		const en = {
			"row.running": "Running Codex tool",
			"row.failed": "Codex tool failed",
			"row.stopped": "Codex tool stopped",
			"row.execCommand": "Command",
			"row.writeStdin": "Terminal",
			"row.applyPatch": "Patch",
			"row.viewImage": "Image",
			"row.updatePlan": "Plan",
			"row.command": "Run command",
			"row.session": "Session {id}",
			"row.patch": "Apply patch",
			"row.image": "View image",
			"row.plan": "Update plan",
			"row.planSteps": "{count} steps",
			"row.input": "Input",
			"row.output": "Output",
			"row.inspect": "Inspect"
		};
		//#endregion
		//#region src/client/index.ts
		/** Browser services required by the keyed Codex tool rows. */
		const inject = ["slots", "locale"];
		const CODEX_TOOL_NAMES = [
			"exec_command",
			"write_stdin",
			"apply_patch",
			"view_image",
			"update_plan"
		];
		/**
		* Register Codex's keyed tool rows and their locale dictionaries.
		* @param ctx - browser root context carrying the slot and locale services.
		*/
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "ui-codex: dictionaries");
			ctx.slots.inject("tool.call.toolview", function* () {
				for (const key of CODEX_TOOL_NAMES) yield ctx.slots.register({
					name: "tool.call.toolview",
					key,
					locale: NS
				}, CodexToolRow);
			});
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map