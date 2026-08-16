import enSource from './en.json' with { type: 'json' }
import zhSource from './zh.json' with { type: 'json' }

export const NS = 'codex'

type Locale = Readonly<Record<string, string>>

type ExactLocale<Base extends Locale, Candidate extends Locale> =
  Exclude<keyof Base, keyof Candidate> extends never
    ? Exclude<keyof Candidate, keyof Base> extends never
      ? Candidate
      : never
    : never

export const zh = zhSource satisfies Locale
export type CodexKey = keyof typeof zh
export const en = enSource satisfies ExactLocale<typeof zh, typeof enSource>
