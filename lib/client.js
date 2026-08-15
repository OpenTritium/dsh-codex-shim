window.__ModuleLoader__.load({
	id: "@opentritium/dsh-codex-shim",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _deepseek_ai_dsh_client_ui_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		let _deepseek_ai_dsh_client_runtime_client = require("@deepseek-ai/dsh-client-runtime/client");
		//#region \0opentritium-css-module:L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw
		const css$1 = ".JcK1UG_root{flex-direction:column;display:flex}.JcK1UG_row{align-items:center;min-width:0;height:24px;display:flex;position:relative;overflow:hidden}.JcK1UG_root[data-state=running] .JcK1UG_row:after{content:\"\";background:linear-gradient(90deg, transparent 0%, color-mix(in srgb, var(--dsw-alias-bg-base) 60%, transparent) 55%, transparent 100%);pointer-events:none;width:300px;animation:2.6s ease-out infinite JcK1UG_dsh-codex-row-sweep;position:absolute;inset:0 auto 0 0}@keyframes JcK1UG_dsh-codex-row-sweep{0%{left:-300px}90%,to{left:100%}}.JcK1UG_leading{width:16px;height:16px;color:var(--dsw-alias-label-tertiary);flex:none;justify-content:center;align-items:center;margin-right:6px;display:inline-flex;position:relative}.JcK1UG_chevron{color:var(--dsw-alias-label-secondary)}.JcK1UG_title{color:var(--dsw-alias-label-secondary);flex:none;font-size:14px;line-height:24px}.JcK1UG_separator{background:var(--dsw-alias-label-caption);border-radius:1px;flex:none;width:2px;height:2px;margin:0 8px}.JcK1UG_summary{text-overflow:ellipsis;white-space:nowrap;min-width:0;color:var(--dsw-alias-label-tertiary);flex:auto;font-size:14px;line-height:24px;overflow:hidden}.JcK1UG_errorSummary{color:var(--dsw-alias-state-error-primary)}.JcK1UG_bodyWrap{flex-direction:column;gap:4px;padding:4px 0 2px 4px;display:flex}.JcK1UG_ioCard{border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-markdown-code-block);border-radius:8px;grid-template-columns:32px minmax(0,1fr);min-width:0;display:grid;overflow:hidden}.JcK1UG_ioLabel{border-right:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-markdown-code-block-banner);color:var(--dsw-alias-label-caption);padding:8px 4px 8px 8px;font-size:10px;font-weight:600;line-height:16px}.JcK1UG_ioText{white-space:pre-wrap;overflow-wrap:anywhere;min-width:0;max-height:220px;font:var(--dsw-font-markdown-code-block-small);color:var(--dsw-alias-label-secondary);margin:0;padding:8px 10px;overflow:auto}.JcK1UG_ioText[data-error]{color:var(--dsw-alias-state-error-primary)}.JcK1UG_inspectButton{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-secondary);cursor:pointer;border-radius:8px;align-self:flex-start;align-items:center;gap:4px;margin:0 0 0 4px;padding:2px 8px;font-size:11px;line-height:16px;display:inline-flex}.JcK1UG_inspectButton:hover,.JcK1UG_inspectButton:focus-visible{background:var(--dsw-alias-interactive-bg-hover-solid);color:var(--dsw-alias-label-primary)}.JcK1UG_visuallyHidden{clip:rect(0 0 0 0);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}@media (prefers-reduced-motion:reduce){.JcK1UG_root[data-state=running] .JcK1UG_row:after{animation:none;display:none}}";
		const tag$1 = "@opentritium/dsh-codex-shim/CodexToolRow.module.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css='${tag$1}']`) === null) {
			const element = document.createElement("style");
			element.dataset.plugin = "@opentritium/dsh-codex-shim";
			element.dataset.pluginCss = tag$1;
			element.textContent = css$1;
			document.head.appendChild(element);
		}
		var _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFRvb2xSb3cubW9kdWxlLmNzcw_default = {
			"row": "JcK1UG_row",
			"ioCard": "JcK1UG_ioCard",
			"dsh-codex-row-sweep": "JcK1UG_dsh-codex-row-sweep",
			"ioLabel": "JcK1UG_ioLabel",
			"ioText": "JcK1UG_ioText",
			"leading": "JcK1UG_leading",
			"visuallyHidden": "JcK1UG_visuallyHidden",
			"bodyWrap": "JcK1UG_bodyWrap",
			"root": "JcK1UG_root",
			"summary": "JcK1UG_summary",
			"chevron": "JcK1UG_chevron",
			"inspectButton": "JcK1UG_inspectButton",
			"separator": "JcK1UG_separator",
			"title": "JcK1UG_title",
			"errorSummary": "JcK1UG_errorSummary"
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
		//#region \0opentritium-css-module:L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz
		const css = ".-d87GG_card{border:1px solid var(--dsw-alias-border-l2);border-radius:8px;list-style:none;overflow:hidden}.-d87GG_header{background:var(--dsw-alias-bg-base);width:100%;color:var(--dsw-alias-label-primary);text-align:left;cursor:pointer;border:0;align-items:center;gap:8px;padding:12px;display:flex}.-d87GG_header:hover{background:var(--dsw-alias-bg-layer-2)}.-d87GG_headText{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.-d87GG_name{font-size:14px;font-weight:600}.-d87GG_description,.-d87GG_hint{color:var(--dsw-alias-label-tertiary);font-size:12px}.-d87GG_body{padding:0 12px 12px}.-d87GG_field{flex-direction:column;gap:6px;padding:10px 0;display:flex}.-d87GG_field+.-d87GG_field{border-top:1px solid var(--dsw-alias-border-l2)}.-d87GG_label{color:var(--dsw-alias-label-primary);font-size:13px;font-weight:500}.-d87GG_input{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);min-height:34px;color:var(--dsw-alias-label-primary);font:inherit;border-radius:6px;padding:7px 9px}.-d87GG_inputInvalid{border-color:var(--dsw-alias-state-error-primary);}.-d87GG_footer{justify-content:flex-end;gap:8px;padding-top:10px;display:flex}.-d87GG_button{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);cursor:pointer;border-radius:6px;padding:5px 10px}.-d87GG_button:disabled{opacity:.5;cursor:default}.-d87GG_pending{color:var(--dsw-alias-label-warning);font-size:11px}.-d87GG_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px}";
		const tag = "@opentritium/dsh-codex-shim/CodexSettingsCard.module.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css='${tag}']`) === null) {
			const element = document.createElement("style");
			element.dataset.plugin = "@opentritium/dsh-codex-shim";
			element.dataset.pluginCss = tag;
			element.textContent = css;
			document.head.appendChild(element);
		}
		var _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default = {
			"error": "-d87GG_error",
			"description": "-d87GG_description",
			"headText": "-d87GG_headText",
			"name": "-d87GG_name",
			"input": "-d87GG_input",
			"inputInvalid": "-d87GG_inputInvalid",
			"header": "-d87GG_header",
			"label": "-d87GG_label",
			"footer": "-d87GG_footer",
			"hint": "-d87GG_hint",
			"field": "-d87GG_field",
			"button": "-d87GG_button",
			"pending": "-d87GG_pending",
			"body": "-d87GG_body",
			"card": "-d87GG_card"
		};
		//#endregion
		//#region src/client/CodexSettingsCard.tsx
		/** Render the OpenTritium Codex configuration card inside the upstream slot. */
		function CodexSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const state = props.useCodexSettings((snapshot) => snapshot);
			if (!state.available) return null;
			const field = (key) => state[key];
			const disabled = !state.writable || state.saving;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.header,
					"aria-expanded": open,
					onClick: () => setOpen((value) => !value),
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("span", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.headText,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.name,
								children: props.t("settings.title")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.description,
								children: props.t("settings.description")
							})]
						}),
						state.dirty ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.pending,
							children: props.t("settings.unsaved")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
							"aria-hidden": true,
							children: open ? "▴" : "▾"
						})
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.body,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
									children: props.t("settings.enabled")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
									type: "checkbox",
									checked: field("enabled").text === "true",
									disabled,
									onChange: (event) => props.edit("enabled", String(event.target.checked))
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
									children: props.t("settings.enabledHint")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
									children: props.t("settings.patterns")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: field("modelPatterns").invalid ? _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.inputInvalid : _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.input,
									value: field("modelPatterns").text,
									disabled,
									onChange: (event) => props.edit("modelPatterns", event.target.value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
									children: props.t("settings.patternsHint")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
									children: props.t("settings.overrides")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									className: field("modelOverrides").invalid ? _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.inputInvalid : _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.input,
									value: field("modelOverrides").text,
									disabled,
									onChange: (event) => props.edit("modelOverrides", event.target.value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
									children: props.t("settings.overridesHint")
								})
							]
						}),
						state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.error,
							role: "status",
							children: props.t("settings.failed")
						}) : null,
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.footer,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.button,
								disabled: !state.dirty || state.saving,
								onClick: props.discard,
								children: props.t("settings.discard")
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
								type: "button",
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.button,
								disabled: !state.dirty || state.saving || field("modelPatterns").invalid || field("modelOverrides").invalid,
								onClick: props.save,
								children: props.t(state.saving ? "settings.saving" : "settings.save")
							})]
						})
					]
				}) : null]
			});
		}
		function cardFace(controller) {
			return {
				hooks: { codexSettings: controller.getStore() },
				edit: (field, text) => controller.edit(field, text),
				reset: (field) => controller.reset(field),
				save: () => {
					controller.save();
				},
				discard: () => controller.discard()
			};
		}
		//#endregion
		//#region src/client/settings-card-controller.ts
		const CODEX_SETTINGS_NS = "opentritium-codex";
		function validOverrides(value) {
			return Array.isArray(value) && value.every((item) => {
				if (typeof item !== "object" || item === null) return false;
				const row = item;
				return typeof row.provider === "string" && row.provider.length > 0 && typeof row.model === "string" && row.model.length > 0 && typeof row.enabled === "boolean";
			});
		}
		function parseField(field, text) {
			if (field === "enabled") return text === "true" ? true : text === "false" ? false : void 0;
			if (field === "modelPatterns") {
				const values = text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
				return values.includes("*") && values.length > 1 ? void 0 : values;
			}
			try {
				const value = JSON.parse(text);
				return validOverrides(value) ? value : void 0;
			} catch {
				return;
			}
		}
		function formatField(field, value) {
			if (field === "enabled") return value === true ? "true" : value === false ? "false" : "";
			if (field === "modelPatterns") return Array.isArray(value) ? value.join("\n") : "";
			return JSON.stringify(validOverrides(value) ? value : [], null, 2);
		}
		/** Owns staged edits for the Codex settings card. */
		var CodexSettingsCardController = class {
			scope;
			drafts = /* @__PURE__ */ new Map();
			cleared = /* @__PURE__ */ new Set();
			store;
			saving = false;
			failed = false;
			constructor(scope) {
				this.scope = scope;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(this.snapshot());
				scope.subscribe(() => this.publish());
			}
			publish() {
				this.store.set(this.snapshot());
			}
			field(field) {
				const current = this.scope.getSnapshot();
				const draft = this.drafts.get(field);
				return {
					text: draft ?? formatField(field, current.value?.[field]),
					overridden: this.cleared.has(field) ? false : draft !== void 0 || current.user !== void 0 && field in current.user,
					invalid: draft !== void 0 && parseField(field, draft) === void 0
				};
			}
			snapshot() {
				const current = this.scope.getSnapshot();
				const fields = {
					enabled: this.field("enabled"),
					modelPatterns: this.field("modelPatterns"),
					modelOverrides: this.field("modelOverrides")
				};
				return {
					available: current.status === "ready",
					writable: current.writable,
					dirty: this.drafts.size > 0 || this.cleared.size > 0,
					saving: this.saving,
					failed: this.failed,
					...fields
				};
			}
			getStore() {
				return this.store;
			}
			edit(field, text) {
				this.drafts.set(field, text);
				this.cleared.delete(field);
				this.failed = false;
				this.publish();
			}
			reset(field) {
				this.drafts.delete(field);
				this.cleared.add(field);
				this.failed = false;
				this.publish();
			}
			discard() {
				this.drafts.clear();
				this.cleared.clear();
				this.failed = false;
				this.publish();
			}
			async save() {
				if (this.saving || !this.scope.getSnapshot().writable) return;
				const writes = [.../* @__PURE__ */ new Set([...this.drafts.keys(), ...this.cleared])];
				if (writes.some((field) => !this.cleared.has(field) && parseField(field, this.drafts.get(field)) === void 0)) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				try {
					for (const field of writes) if (this.cleared.has(field)) await this.scope.unset(field);
					else await this.scope.set(field, parseField(field, this.drafts.get(field)));
					this.drafts.clear();
					this.cleared.clear();
				} catch {
					this.failed = true;
				}
				this.saving = false;
				this.publish();
			}
		};
		//#endregion
		//#region src/client/locales.ts
		/** Locale dictionaries for the Codex tool rows. */
		/** Dictionary namespace owned by this plugin. */
		const NS = "codex";
		/** Simplified Chinese dictionary (the key-set source of truth). */
		const zh = {
			"settings.title": "Codex 环境",
			"settings.description": "为匹配的模型路由启用 Codex 工具与提示词界面。",
			"settings.enabled": "启用 Codex 环境",
			"settings.enabledHint": "关闭后所有路由继续使用宿主的工具与提示词界面。",
			"settings.patterns": "模型模式",
			"settings.patternsHint": "每行一个 glob 模式；* 不能与其他模式共用。",
			"settings.overrides": "模型覆盖（JSON）",
			"settings.overridesHint": "格式为 [{\"provider\":\"...\",\"model\":\"...\",\"enabled\":true}]。",
			"settings.unsaved": "未保存",
			"settings.discard": "放弃修改",
			"settings.save": "保存",
			"settings.saving": "保存中…",
			"settings.failed": "设置未被部署接受，请检查输入后重试。",
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
			"settings.title": "Codex environment",
			"settings.description": "Activates the Codex tool and prompt surface for matching routes.",
			"settings.enabled": "Enable Codex environment",
			"settings.enabledHint": "When off, all routes keep the host tool and prompt surface.",
			"settings.patterns": "Model patterns",
			"settings.patternsHint": "One glob pattern per line; * cannot be combined with another pattern.",
			"settings.overrides": "Model overrides (JSON)",
			"settings.overridesHint": "Use [{\"provider\":\"...\",\"model\":\"...\",\"enabled\":true}].",
			"settings.unsaved": "Unsaved",
			"settings.discard": "Discard",
			"settings.save": "Save",
			"settings.saving": "Saving…",
			"settings.failed": "The deployment did not accept these settings; check the values and retry.",
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
			ctx.inject(["settingsScope"], installSettings);
		}
		/** Mount the settings card once the settings transport is available. */
		function installSettings(ctx) {
			const settings = new CodexSettingsCardController(ctx.settingsScope.bind({ namespace: CODEX_SETTINGS_NS }));
			ctx.slots.inject("settings.plugin.item", () => ctx.slots.register({
				name: "settings.plugin.item",
				id: "opentritium-codex",
				order: 25,
				locale: NS,
				inject: () => cardFace(settings)
			}, CodexSettingsCard));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map