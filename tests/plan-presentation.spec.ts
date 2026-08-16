import { describe, expect, it } from 'vitest'
import { parsePlanPresentation } from '../src/client/plan-presentation.ts'

describe('parsePlanPresentation', () => {
  it('keeps a valid plan and its explanation', () => {
    expect(parsePlanPresentation(JSON.stringify({
      explanation: 'Finish the UI polish.',
      plan: [
        { step: 'Inspect the tool row', status: 'completed' },
        { step: 'Render plan steps', status: 'in_progress' },
        { step: 'Verify in the WebUI', status: 'pending' },
      ],
    }))).toEqual({
      explanation: 'Finish the UI polish.',
      items: [
        { step: 'Inspect the tool row', status: 'completed' },
        { step: 'Render plan steps', status: 'in_progress' },
        { step: 'Verify in the WebUI', status: 'pending' },
      ],
    })
  })

  it('falls back for malformed items instead of dropping their raw content', () => {
    expect(parsePlanPresentation('{"plan":[{"step":"Missing status"}]}')).toBeUndefined()
    expect(parsePlanPresentation('{"plan":[{"step":"Unexpected","status":"blocked"}]}')).toBeUndefined()
    expect(parsePlanPresentation('not json')).toBeUndefined()
  })
})
