import personaSource from './codex-persona.md?raw'

/**
 * The Codex persona text: a port of upstream's default base instructions
 * (Apache-2.0, `codex-rs/protocol/src/prompts/base_instructions/default.md`
 * at commit `636e505c`), adapted where the dsh codex surface differs.
 * @module @opentritium/dsh-codex-shim/codex-instructions
 */

export const CODEX_PERSONA = personaSource.endsWith('\n') ? personaSource.slice(0, -1) : personaSource
