import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { defineConfig, type TsdownPlugin } from 'tsdown'
import { transform } from 'lightningcss'

const PACKAGE = '@opentritium/dsh-codex-shim'
const CLIENT_EXTERNALS = [
  'react',
  'react/jsx-runtime',
  'react-dom',
  'react-dom/client',
  '@deepseek-ai/cordis',
  '@deepseek-ai/dsh-client-runtime/client',
  '@deepseek-ai/dsh-client-ui-slots',
  '@deepseek-ai/dsh-client-ui-primitives',
  '@deepseek-ai/dsh-client-ui-attachment',
  '@deepseek-ai/dsh-client-web-react',
]
const VIRTUAL_CODEX_SHIM_PERSONA_PREFIX = '\0codex-shim-persona:'
const VIRTUAL_CODEX_SHIM_CSS_PREFIX = '\0codex-shim-css:'

function markdownRawPlugin(): TsdownPlugin {
  const files = new Map<string, string>()
  return {
    name: 'codex-shim-persona',
    resolveId(source: string, importer: string | undefined) {
      if (importer === undefined || !source.endsWith('.md?raw')) return null
      const id = `${VIRTUAL_CODEX_SHIM_PERSONA_PREFIX}${source.slice(0, -4)}`
      files.set(id, resolve(dirname(importer), source.slice(0, -4)))
      return id
    },
    async load(id: string) {
      const file = files.get(id)
      if (file === undefined) return null
      return `export default ${JSON.stringify(await readFile(file, 'utf8'))}`
    },
  }
}

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      gate: 'src/gate.ts',
      'tool-exec': 'src/tool-exec.ts',
      'tool-plan': 'src/tool-plan.ts',
      'tool-web': 'src/tool-web.ts',
      'apply-patch': 'src/apply-patch.ts',
    },
    outDir: 'lib',
    format: 'esm',
    platform: 'node',
    target: 'es2024',
    dts: true,
    clean: true,
    plugins: [markdownRawPlugin()],
    deps: { neverBundle: [/^@deepseek-ai\//] },
  },
  {
    entry: { client: 'src/client/index.ts' },
    outDir: 'lib',
    format: 'cjs',
    platform: 'browser',
    target: 'es2024',
    dts: true,
    sourcemap: true,
    minify: true,
    clean: false,
    deps: { neverBundle: CLIENT_EXTERNALS, alwaysBundle: id => (CLIENT_EXTERNALS.includes(id) ? undefined : true) },
    plugins: [
      {
        name: 'codex-shim-css-modules',
        resolveId(source, importer) {
          if (!source.endsWith('.module.css') || importer === undefined) return null
          return `${VIRTUAL_CODEX_SHIM_CSS_PREFIX}${Buffer.from(resolve(dirname(importer), source)).toString('base64url')}`
        },
        async load(id) {
          if (!id.startsWith(VIRTUAL_CODEX_SHIM_CSS_PREFIX)) return null
          const file = Buffer.from(id.slice(VIRTUAL_CODEX_SHIM_CSS_PREFIX.length), 'base64url').toString()
          const { code, exports } = transform({
            filename: file,
            code: await readFile(file),
            cssModules: { pattern: '[hash]_[local]' },
            minify: true,
          })
          const classes = Object.fromEntries(Object.entries(exports ?? {}).map(([key, value]) => [key, value.name]))
          const tag = `${PACKAGE}/${basename(file)}`
          return [
            `const css = ${JSON.stringify(code.toString())};`,
            `const tag = ${JSON.stringify(tag)};`,
            'function mount() {',
            "  if (typeof document === 'undefined' || document.querySelector(`style[data-plugin-css='${tag}']`) !== null) return;",
            "  const element = document.createElement('style');",
            `  element.dataset.plugin = ${JSON.stringify(PACKAGE)};`,
            '  element.dataset.pluginCss = tag;',
            '  element.textContent = css;',
            '  document.head.appendChild(element);',
            '}',
            'function dispose() {',
            "  if (typeof document === 'undefined') return;",
            "  document.querySelector(`style[data-plugin-css='${tag}']`)?.remove();",
            '}',
            `export default ${JSON.stringify(classes)};`,
            'export { mount, dispose };',
          ].join('\n')
        },
      },
    ],
    outputOptions: {
      entryFileNames: 'client.js',
      banner: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE)}, factory: (require) => {`,
      intro: 'var module = { exports: {} }; var exports = module.exports;',
      footer: 'return module.exports; } });',
    },
  },
])
