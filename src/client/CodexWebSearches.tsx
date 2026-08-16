import { WebBlock } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WebSourceView } from '@deepseek-ai/dsh-client-ui-primitives'
import type { WebRunSearchGroup } from '../web-run-presentation.ts'
import css from './CodexToolRow.module.css'

interface Props {
  results: readonly WebRunSearchGroup[]
}

export function CodexWebSearches({ results }: Props) {
  return (
    <div className={css.webSearches}>
      {results.map((result, index) => (
        <section className={css.webSearchGroup} key={`${result.query}:${index}`}>
          <h4 className={css.webQuery}>{result.query}</h4>
          <WebBlock
            kind="search"
            answer={result.answer}
            sources={result.sources as WebSourceView[]}
            truncated={result.truncated}
            className={css.webSearchCard}
          />
        </section>
      ))}
    </div>
  )
}
