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
			"ioText": "JcK1UG_ioText",
			"ioLabel": "JcK1UG_ioLabel",
			"separator": "JcK1UG_separator",
			"leading": "JcK1UG_leading",
			"inspectButton": "JcK1UG_inspectButton",
			"chevron": "JcK1UG_chevron",
			"root": "JcK1UG_root",
			"dsh-codex-row-sweep": "JcK1UG_dsh-codex-row-sweep",
			"bodyWrap": "JcK1UG_bodyWrap",
			"row": "JcK1UG_row",
			"summary": "JcK1UG_summary",
			"errorSummary": "JcK1UG_errorSummary",
			"title": "JcK1UG_title",
			"ioCard": "JcK1UG_ioCard",
			"visuallyHidden": "JcK1UG_visuallyHidden"
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
		const css = ".-d87GG_card{border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);border-radius:8px;list-style:none;overflow:hidden}.-d87GG_header{width:100%;color:var(--dsw-alias-label-primary);font:inherit;text-align:left;cursor:pointer;background:0 0;border:0;align-items:center;gap:12px;padding:14px 16px;display:flex}.-d87GG_header:hover{background:var(--dsw-alias-bg-layer-2)}.-d87GG_header:focus-visible,.-d87GG_input:focus-visible,.-d87GG_switchInput:focus-visible+.-d87GG_switchTrack{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.-d87GG_headText{flex-direction:column;flex:1;gap:4px;min-width:0;display:flex}.-d87GG_name{font-size:15px;font-weight:600;line-height:1.4}.-d87GG_description,.-d87GG_hint{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.-d87GG_chevron{color:var(--dsw-alias-label-tertiary);flex:none;transition:transform .16s}.-d87GG_chevronOpen{transform:rotate(180deg)}.-d87GG_body{border-top:1px solid var(--dsw-alias-border-l2);margin:0 16px;padding-bottom:8px}.-d87GG_field{flex-direction:column;gap:7px;padding:12px 0;display:flex}.-d87GG_field+.-d87GG_field{border-top:1px solid var(--dsw-alias-border-l2)}.-d87GG_fieldHead{align-items:center;gap:8px;min-width:0;display:flex}.-d87GG_label{min-width:0;color:var(--dsw-alias-label-primary);flex:1;font-size:13px;font-weight:500;line-height:1.5}.-d87GG_input{box-sizing:border-box;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);width:100%;min-height:36px;color:var(--dsw-alias-label-primary);font:inherit;resize:vertical;border-radius:6px;padding:8px 10px;line-height:1.5}.-d87GG_input:disabled{color:var(--dsw-alias-label-tertiary);cursor:default}.-d87GG_inputInvalid{border-color:var(--dsw-alias-state-error-primary);}.-d87GG_switchField{gap:6px}.-d87GG_switch{cursor:pointer;flex:none;display:inline-flex}.-d87GG_switchInput{opacity:0;block-size:1px;inline-size:1px;position:absolute}.-d87GG_switchInput:disabled+.-d87GG_switchTrack{opacity:.5;cursor:default}.-d87GG_switchTrack{background:var(--dsw-alias-border-l2);border-radius:999px;width:34px;height:20px;transition:background .16s;display:block;position:relative}.-d87GG_switchTrack:after{background:var(--dsw-alias-bg-layer-3);content:\"\";border-radius:50%;width:16px;height:16px;transition:transform .16s;position:absolute;top:2px;left:2px}.-d87GG_switchInput:checked+.-d87GG_switchTrack{background:var(--dsw-alias-brand-primary)}.-d87GG_switchInput:checked+.-d87GG_switchTrack:after{transform:translate(14px)}.-d87GG_reset{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:0;padding:0;font-size:12px;line-height:1.5}.-d87GG_reset:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.-d87GG_reset:disabled{cursor:default;opacity:.5}.-d87GG_status{color:var(--dsw-alias-label-tertiary);margin:0;font-size:12px;line-height:1.5}.-d87GG_addButton{color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;white-space:nowrap;background:0 0;border:0;flex:none;align-items:center;gap:4px;padding:0;font-size:12px;line-height:1.5;display:inline-flex}.-d87GG_addButton:hover:not(:disabled){color:var(--dsw-alias-label-primary)}.-d87GG_addButton:disabled{cursor:default;opacity:.5}.-d87GG_addModel{align-items:center;gap:8px;display:flex}.-d87GG_selectInput{resize:none;flex:1;min-width:0}.-d87GG_visuallyHidden{clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap;width:1px;height:1px;position:absolute;overflow:hidden}.-d87GG_models{flex-direction:column;gap:6px;margin:0;padding:0;list-style:none;display:flex}.-d87GG_model{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;justify-content:space-between;align-items:center;gap:12px;min-width:0;padding:9px 10px;display:flex}.-d87GG_modelIdentity{flex-direction:column;flex:1;gap:2px;min-width:0;display:flex}.-d87GG_modelName{color:var(--dsw-alias-label-primary);text-overflow:ellipsis;white-space:nowrap;font-size:13px;line-height:1.4;overflow:hidden}.-d87GG_providerName{color:var(--dsw-alias-label-tertiary);text-overflow:ellipsis;white-space:nowrap;font-size:11px;line-height:1.4;overflow:hidden}.-d87GG_modelActions{flex:none;align-items:center;gap:6px;display:inline-flex}.-d87GG_decisions{border:1px solid var(--dsw-alias-border-l2);border-radius:6px;flex:none;display:inline-flex;overflow:hidden}.-d87GG_decision{border:0;border-left:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);color:var(--dsw-alias-label-secondary);font:inherit;cursor:pointer;white-space:nowrap;padding:4px 8px;font-size:12px;line-height:1.5}.-d87GG_decision:first-child{border-left:0}.-d87GG_decision:hover:not(:disabled){color:var(--dsw-alias-label-primary);background:var(--dsw-alias-bg-layer-2)}.-d87GG_decisionSelected{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3)}.-d87GG_decision:disabled{cursor:default;opacity:.5}.-d87GG_removeButton{width:28px;height:28px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:0 0;border:0;border-radius:4px;flex:none;justify-content:center;align-items:center;display:inline-flex}.-d87GG_removeButton:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}.-d87GG_removeButton:focus-visible,.-d87GG_addButton:focus-visible,.-d87GG_decision:focus-visible,.-d87GG_removeButton:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.-d87GG_removeButton:disabled{cursor:default;opacity:.5}@media (width<=640px){.-d87GG_model{flex-direction:column;align-items:stretch}.-d87GG_modelActions,.-d87GG_decisions{align-self:stretch}.-d87GG_decision{flex:1}.-d87GG_addModel{flex-direction:column;align-items:stretch}.-d87GG_addModel .-d87GG_reset{align-self:flex-end}}.-d87GG_footer{z-index:1;border-top:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-3);justify-content:flex-end;align-items:center;gap:8px;margin-top:4px;padding:10px 0;display:flex;position:sticky;bottom:0}.-d87GG_button{background:var(--dsw-alias-label-primary);color:var(--dsw-alias-bg-layer-3);font:inherit;cursor:pointer;border:1px solid #0000;border-radius:6px;padding:5px 12px;font-size:13px}.-d87GG_button:first-child{border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary);background:0 0}.-d87GG_button:disabled{opacity:.45;cursor:default}.-d87GG_pending{background:var(--dsw-alias-bg-module-platform);color:var(--dsw-alias-label-secondary);white-space:nowrap;border-radius:999px;padding:1px 8px;font-size:11px;font-weight:500;line-height:17px}.-d87GG_error{color:var(--dsw-alias-state-error-primary);margin:0;font-size:12px}";
		const tag = "@opentritium/dsh-codex-shim/CodexSettingsCard.module.css";
		if (typeof document !== "undefined" && document.querySelector(`style[data-plugin-css='${tag}']`) === null) {
			const element = document.createElement("style");
			element.dataset.plugin = "@opentritium/dsh-codex-shim";
			element.dataset.pluginCss = tag;
			element.textContent = css;
			document.head.appendChild(element);
		}
		var _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default = {
			"status": "-d87GG_status",
			"switchInput": "-d87GG_switchInput",
			"error": "-d87GG_error",
			"header": "-d87GG_header",
			"hint": "-d87GG_hint",
			"model": "-d87GG_model",
			"modelActions": "-d87GG_modelActions",
			"button": "-d87GG_button",
			"switchField": "-d87GG_switchField",
			"providerName": "-d87GG_providerName",
			"inputInvalid": "-d87GG_inputInvalid",
			"description": "-d87GG_description",
			"removeButton": "-d87GG_removeButton",
			"chevron": "-d87GG_chevron",
			"switch": "-d87GG_switch",
			"addModel": "-d87GG_addModel",
			"headText": "-d87GG_headText",
			"name": "-d87GG_name",
			"field": "-d87GG_field",
			"chevronOpen": "-d87GG_chevronOpen",
			"fieldHead": "-d87GG_fieldHead",
			"addButton": "-d87GG_addButton",
			"switchTrack": "-d87GG_switchTrack",
			"modelIdentity": "-d87GG_modelIdentity",
			"decisionSelected": "-d87GG_decisionSelected",
			"reset": "-d87GG_reset",
			"input": "-d87GG_input",
			"pending": "-d87GG_pending",
			"label": "-d87GG_label",
			"visuallyHidden": "-d87GG_visuallyHidden",
			"modelName": "-d87GG_modelName",
			"models": "-d87GG_models",
			"selectInput": "-d87GG_selectInput",
			"card": "-d87GG_card",
			"decisions": "-d87GG_decisions",
			"body": "-d87GG_body",
			"decision": "-d87GG_decision",
			"footer": "-d87GG_footer"
		};
		//#endregion
		//#region src/client/CodexSettingsCard.tsx
		/** Render the OpenTritium Codex simulation settings card. */
		function CodexSettingsCard(props) {
			const [open, setOpen] = (0, react.useState)(false);
			const [addingModel, setAddingModel] = (0, react.useState)(false);
			const state = props.useCodexSettings((snapshot) => snapshot);
			if (!state.available) return null;
			const field = (key) => state[key];
			const disabled = !state.writable || state.saving;
			const saveDisabled = !state.dirty || disabled || field("modelPatterns").invalid;
			return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
				className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.card,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
					type: "button",
					className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.header,
					"aria-expanded": open,
					"aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${props.t("settings.title")}`,
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
						/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconChevronDownOutline14, { className: `${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.chevron} ${open ? _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.chevronOpen : ""}` })
					]
				}), open ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
					className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.body,
					children: [
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: `${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field} ${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.switchField}`,
							children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.fieldHead,
								children: [
									/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
										children: props.t("settings.enabled")
									}),
									field("enabled").overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.reset,
										disabled,
										onClick: () => props.reset("enabled"),
										children: props.t("settings.reset")
									}) : null,
									/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("label", {
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.switch,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("input", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.switchInput,
											type: "checkbox",
											role: "switch",
											"aria-label": props.t("settings.enabled"),
											checked: field("enabled").text === "true",
											disabled,
											onChange: (event) => props.edit("enabled", String(event.target.checked))
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.switchTrack,
											"aria-hidden": true
										})]
									})
								]
							}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
								className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
								children: props.t("settings.enabledHint")
							})]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.fieldHead,
									children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
										htmlFor: "codex-model-patterns",
										children: props.t("settings.patterns")
									}), field("modelPatterns").overridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
										type: "button",
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.reset,
										disabled,
										onClick: () => props.reset("modelPatterns"),
										children: props.t("settings.reset")
									}) : null]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("textarea", {
									id: "codex-model-patterns",
									rows: 2,
									placeholder: props.t("settings.patternsPlaceholder"),
									className: field("modelPatterns").invalid ? _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.inputInvalid : _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.input,
									value: field("modelPatterns").text,
									disabled,
									onChange: (event) => props.edit("modelPatterns", event.target.value)
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
									children: props.t("settings.patternsHint")
								})
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.field,
							children: [
								/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.fieldHead,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.label,
											children: props.t("settings.models")
										}),
										state.modelOverridesOverridden ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.reset,
											disabled,
											onClick: () => props.reset("modelOverrides"),
											children: props.t("settings.reset")
										}) : null,
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("button", {
											type: "button",
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.addButton,
											disabled: disabled || state.modelsStatus !== "ready" || state.addableModels.length === 0,
											onClick: () => setAddingModel(true),
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconPlusOutline16, { size: 14 }), props.t("settings.modelsAdd")]
										})
									]
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.hint,
									children: props.t("settings.modelsHint")
								}),
								state.modelsStatus === "loading" ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.status,
									children: props.t("settings.modelsLoading")
								}) : null,
								state.modelsStatus === "error" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.error,
									role: "status",
									children: [
										props.t("settings.modelsFailed"),
										": ",
										state.modelsError
									]
								}) : null,
								addingModel && state.modelsStatus === "ready" ? /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.addModel,
									children: [
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("label", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.visuallyHidden,
											htmlFor: "codex-model-exception",
											children: props.t("settings.modelsPick")
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("select", {
											id: "codex-model-exception",
											className: `${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.input} ${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.selectInput}`,
											autoFocus: true,
											defaultValue: "",
											disabled,
											onChange: (event) => {
												const selected = state.addableModels.find((row) => modelKey$1(row.provider, row.model) === event.target.value);
												if (selected === void 0) return;
												props.addModelException(selected.provider, selected.model);
												setAddingModel(false);
											},
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("option", {
												value: "",
												disabled: true,
												children: props.t("settings.modelsPick")
											}), state.addableModels.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("option", {
												value: modelKey$1(row.provider, row.model),
												children: [
													row.providerName,
													" / ",
													row.modelName
												]
											}, modelKey$1(row.provider, row.model)))]
										}),
										/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
											type: "button",
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.reset,
											disabled,
											onClick: () => setAddingModel(false),
											children: props.t("settings.cancel")
										})
									]
								}) : null,
								state.models.length > 0 ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("ul", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.models,
									children: state.models.map((row) => /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("li", {
										className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.model,
										children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.modelIdentity,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.modelName,
												children: row.modelName
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
												className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.providerName,
												children: row.providerName
											})]
										}), /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
											className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.modelActions,
											children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
												className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.decisions,
												role: "radiogroup",
												"aria-label": `${row.providerName} / ${row.modelName}`,
												children: ["enabled", "disabled"].map((decision) => /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: `${_opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.decision} ${row.decision === decision ? _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.decisionSelected : ""}`,
													"aria-pressed": row.decision === decision,
													disabled,
													onClick: () => props.setModelDecision(row.provider, row.model, decision),
													children: props.t(`settings.decision.${decision}`)
												}, decision))
											}), /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.Tooltip, {
												label: props.t("settings.modelsRemove"),
												children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
													type: "button",
													className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.removeButton,
													"aria-label": `${props.t("settings.modelsRemove")}: ${row.providerName} / ${row.modelName}`,
													disabled,
													onClick: () => props.removeModelException(row.provider, row.model),
													children: /* @__PURE__ */ (0, react_jsx_runtime.jsx)(_deepseek_ai_dsh_client_ui_primitives.IconTrashOutline16, { size: 14 })
												})
											})]
										})]
									}, modelKey$1(row.provider, row.model)))
								}) : null
							]
						}),
						/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
							className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.footer,
							children: [
								state.failed ? /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.error,
									role: "status",
									children: props.t("settings.failed")
								}) : null,
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.button,
									disabled: !state.dirty || disabled,
									onClick: props.discard,
									children: props.t("settings.discard")
								}),
								/* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
									type: "button",
									className: _opentritium_css_module_L2hvbWUvdHJpdGl1bS9zcmMvb3BlbnRyaXRpdW0tZHNoLWNvZGV4LXNoaW0vc3JjL2NsaWVudC9Db2RleFNldHRpbmdzQ2FyZC5tb2R1bGUuY3Nz_default.button,
									disabled: saveDisabled,
									onClick: props.save,
									children: props.t(state.saving ? "settings.saving" : "settings.save")
								})
							]
						})
					]
				}) : null]
			});
		}
		function cardFace(controller) {
			return {
				hooks: { codexSettings: controller.getStore() },
				edit: (field, text) => controller.edit(field, text),
				setModelDecision: (provider, model, decision) => controller.setModelDecision(provider, model, decision),
				addModelException: (provider, model) => controller.addModelException(provider, model),
				removeModelException: (provider, model) => controller.removeModelException(provider, model),
				reset: (field) => controller.reset(field),
				save: () => {
					controller.save();
				},
				discard: () => controller.discard()
			};
		}
		function modelKey$1(provider, model) {
			return JSON.stringify([provider, model]);
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
		function parsePatterns(text) {
			const values = text.split(/\r?\n/).map((value) => value.trim()).filter(Boolean);
			return values.includes("*") && values.length > 1 ? void 0 : values;
		}
		function formatPatterns(value) {
			return Array.isArray(value) ? value.join("\n") : "";
		}
		function modelKey(provider, model) {
			return JSON.stringify([provider, model]);
		}
		function modelRows(groups, overrides) {
			const known = new Map(groups.flatMap((group) => group.models.map((model) => [modelKey(group.id, model.id), {
				providerName: group.name,
				modelName: model.name
			}])));
			return overrides.map((override) => {
				const labels = known.get(modelKey(override.provider, override.model));
				return {
					provider: override.provider,
					providerName: labels?.providerName ?? override.provider,
					model: override.model,
					modelName: labels?.modelName ?? override.model,
					decision: override.enabled ? "enabled" : "disabled"
				};
			});
		}
		function addableModels(groups, overrides) {
			const overridden = new Set(overrides.map((override) => modelKey(override.provider, override.model)));
			return groups.flatMap((group) => group.models.filter((model) => !overridden.has(modelKey(group.id, model.id))).map((model) => ({
				provider: group.id,
				providerName: group.name,
				model: model.id,
				modelName: model.name
			})));
		}
		function sameOverrides(left, right) {
			return left.length === right.length && left.every((item, index) => {
				const other = right[index];
				return other !== void 0 && item.provider === other.provider && item.model === other.model && item.enabled === other.enabled;
			});
		}
		/** Owns staged edits, model-directory loading, and persistence for the Codex settings card. */
		var CodexSettingsCardController = class {
			scope;
			api;
			drafts = /* @__PURE__ */ new Map();
			cleared = /* @__PURE__ */ new Set();
			store;
			saving = false;
			failed = false;
			modelsStatus = "loading";
			modelsError;
			groups = [];
			draftOverrides;
			constructor(scope, api) {
				this.scope = scope;
				this.api = api;
				this.store = (0, _deepseek_ai_dsh_client_runtime_client.createSnapshotStore)(this.snapshot());
				scope.subscribe(() => this.publish());
				this.loadModels();
			}
			publish() {
				this.store.set(this.snapshot());
			}
			current() {
				return this.scope.getSnapshot().value ?? {};
			}
			field(field) {
				const current = this.current();
				const user = this.scope.getSnapshot().user;
				const userHasField = user !== void 0 && field in user;
				const draft = this.drafts.get(field);
				return {
					text: draft ?? (field === "enabled" ? current.enabled === void 0 ? "" : String(current.enabled) : userHasField ? formatPatterns(user.modelPatterns) : ""),
					overridden: this.cleared.has(field) ? false : draft !== void 0 || this.scope.getSnapshot().user !== void 0 && field in this.scope.getSnapshot().user,
					invalid: field === "modelPatterns" && draft !== void 0 && parsePatterns(draft) === void 0
				};
			}
			overrides() {
				if (this.cleared.has("modelOverrides")) return [];
				if (this.draftOverrides !== void 0) return this.draftOverrides;
				return this.configuredOverrides();
			}
			configuredOverrides() {
				const configured = this.current().modelOverrides;
				return validOverrides(configured) ? configured : [];
			}
			stageOverrides(next) {
				this.draftOverrides = sameOverrides(next, this.configuredOverrides()) ? void 0 : next;
				this.cleared.delete("modelOverrides");
				this.failed = false;
				this.publish();
			}
			snapshot() {
				const current = this.scope.getSnapshot();
				const overrides = this.overrides();
				return {
					available: current.status === "ready",
					writable: current.writable,
					dirty: this.drafts.size > 0 || this.draftOverrides !== void 0 || this.cleared.size > 0,
					saving: this.saving,
					failed: this.failed,
					enabled: this.field("enabled"),
					modelPatterns: this.field("modelPatterns"),
					modelOverridesOverridden: !this.cleared.has("modelOverrides") && current.user !== void 0 && "modelOverrides" in current.user,
					modelsStatus: this.modelsStatus,
					modelsError: this.modelsError,
					models: modelRows(this.groups, overrides),
					addableModels: addableModels(this.groups, overrides)
				};
			}
			async loadModels() {
				try {
					const response = await this.api.llm.models({});
					if (!response.result.ok) throw new Error(response.result.error.message);
					this.groups = response.result.value.groups;
					this.modelsStatus = "ready";
					this.modelsError = response.result.value.failures.length > 0 ? response.result.value.failures.map((failure) => `${failure.name}: ${failure.message}`).join("; ") : void 0;
				} catch (error) {
					this.modelsStatus = "error";
					this.modelsError = error instanceof Error ? error.message : String(error);
				}
				this.publish();
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
			setModelDecision(provider, model, decision) {
				if (this.overrides().find((item) => item.provider === provider && item.model === model)?.enabled === (decision === "enabled")) return;
				const next = this.overrides().filter((item) => item.provider !== provider || item.model !== model);
				next.push({
					provider,
					model,
					enabled: decision === "enabled"
				});
				this.stageOverrides(next);
			}
			addModelException(provider, model) {
				if (this.overrides().some((item) => item.provider === provider && item.model === model)) return;
				this.stageOverrides([...this.overrides(), {
					provider,
					model,
					enabled: true
				}]);
			}
			removeModelException(provider, model) {
				const next = this.overrides().filter((item) => item.provider !== provider || item.model !== model);
				if (next.length === this.overrides().length) return;
				this.stageOverrides(next);
			}
			reset(field) {
				if (field !== "modelOverrides") this.drafts.delete(field);
				if (field === "modelOverrides") this.draftOverrides = void 0;
				this.cleared.add(field);
				this.failed = false;
				this.publish();
			}
			discard() {
				this.drafts.clear();
				this.draftOverrides = void 0;
				this.cleared.clear();
				this.failed = false;
				this.publish();
			}
			async save() {
				if (this.saving || !this.scope.getSnapshot().writable) return;
				const writes = /* @__PURE__ */ new Set([
					...this.drafts.keys(),
					...this.draftOverrides !== void 0 ? ["modelOverrides"] : [],
					...this.cleared
				]);
				if (writes.has("modelPatterns") && parsePatterns(this.drafts.get("modelPatterns") ?? "") === void 0) return;
				this.saving = true;
				this.failed = false;
				this.publish();
				try {
					for (const field of writes) if (this.cleared.has(field)) await this.scope.unset(field);
					else if (field === "enabled") await this.scope.set(field, this.drafts.get(field) === "true");
					else if (field === "modelPatterns") await this.scope.set(field, parsePatterns(this.drafts.get(field) ?? ""));
					else await this.scope.set(field, this.overrides());
					this.drafts.clear();
					this.draftOverrides = void 0;
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
			"settings.title": "Codex 环境模拟",
			"settings.description": "为选定的模型模拟 Codex Tool，让 GPT 系列模型感觉回家了一样。",
			"settings.enabled": "全局开关",
			"settings.enabledHint": "关闭后所有路由继续使用宿主的工具与提示词界面。",
			"settings.patterns": "自动启用规则",
			"settings.patternsPlaceholder": "例如：gpt-*\ncodex*\no1*",
			"settings.patternsHint": "匹配这些 glob 的模型默认启用；* 不能与其他规则共用。",
			"settings.models": "显式 Override",
			"settings.modelsHint": "未添加的模型遵循自动启用规则；添加后可明确设为启用或禁用。",
			"settings.modelsLoading": "正在加载模型…",
			"settings.modelsFailed": "模型目录不可用",
			"settings.modelsAdd": "添加模型例外",
			"settings.modelsPick": "选择模型",
			"settings.modelsRemove": "移除模型例外",
			"settings.decision.enabled": "启用",
			"settings.decision.disabled": "禁用",
			"settings.unsaved": "未保存",
			"settings.expand": "展开设置",
			"settings.collapse": "收起设置",
			"settings.reset": "恢复默认",
			"settings.discard": "放弃修改",
			"settings.cancel": "取消",
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
			"settings.title": "Codex environment simulation",
			"settings.description": "Simulates the familiar Codex Tool surface for selected models, so GPT-family models feel at home.",
			"settings.enabled": "Global switch",
			"settings.enabledHint": "When off, all routes keep the host tool and prompt surface.",
			"settings.patterns": "Automatic enable rules",
			"settings.patternsPlaceholder": "For example: gpt-*\ncodex*\no1*",
			"settings.patternsHint": "Models matching these globs are enabled by default; * cannot be combined with another rule.",
			"settings.models": "Explicit overrides",
			"settings.modelsHint": "Models not listed here follow the automatic enable rules; add a model to explicitly enable or disable it.",
			"settings.modelsLoading": "Loading models…",
			"settings.modelsFailed": "Model directory unavailable",
			"settings.modelsAdd": "Add model exception",
			"settings.modelsPick": "Select a model",
			"settings.modelsRemove": "Remove model exception",
			"settings.decision.enabled": "Enabled",
			"settings.decision.disabled": "Disabled",
			"settings.unsaved": "Unsaved",
			"settings.expand": "Expand settings",
			"settings.collapse": "Collapse settings",
			"settings.reset": "Reset to default",
			"settings.discard": "Discard",
			"settings.cancel": "Cancel",
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
			ctx.inject(["settingsScope", "connection"], installSettings);
		}
		/** Mount the settings card once the settings transport is available. */
		function installSettings(ctx) {
			const connection = ctx.get("connection");
			const settings = new CodexSettingsCardController(ctx.settingsScope.bind({ namespace: CODEX_SETTINGS_NS }), connection.api);
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