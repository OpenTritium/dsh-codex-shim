import personaSource from './codex-persona.md?raw'

/**
 * Codex-style persona text adapted from upstream's default instructions
 * (Apache-2.0, `codex-rs/protocol/src/prompts/base_instructions/default.md`
 * at commit `636e505c`) for the DSH tool surface.
 * @module @opentritium/dsh-codex-shim/codex-instructions
 */

export const CODEX_PERSONA = personaSource.endsWith('\n') ? personaSource.slice(0, -1) : personaSource
