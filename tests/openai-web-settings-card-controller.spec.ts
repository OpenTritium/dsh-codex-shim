import { describe, expect, it, vi } from 'vitest'

vi.mock('@deepseek-ai/dsh-client-runtime/client', () => ({
  createSnapshotStore: <T>(initial: T) => {
    let value = initial
    return { get: () => value, set: (next: T) => { value = next }, subscribe: () => () => {} }
  },
}), { virtual: true })

const { OpenAIWebSettingsCardController } = await import('../src/client/openai-web-settings-card-controller.ts')

function fixture() {
  let value: Record<string, unknown> = { enabled: true, baseURL: 'https://api.openai.com/v1', credentialRef: 'OPENAI_API_KEY', model: 'gpt-5', searchContextSize: 'medium' }
  let user: Record<string, unknown> | undefined
  const scope = {
    getSnapshot: () => ({ status: 'ready', writable: true, value, user }),
    subscribe: () => () => {},
    set: async (field: string, next: unknown) => { value = { ...value, [field]: next }; user = { ...user, [field]: next } },
    unset: async (field: string) => { const next = { ...value }; delete next[field]; value = next; const nextUser = { ...user }; delete nextUser[field]; user = nextUser },
  }
  return { controller: new OpenAIWebSettingsCardController(scope as never), getValue: () => value }
}

describe('OpenAIWebSettingsCardController', () => {
  it('stages, saves, and discards provider settings', async () => {
    const { controller, getValue } = fixture()
    controller.edit('model', 'gpt-5.6')
    controller.edit('searchContextSize', 'high')
    controller.discard()
    expect(controller.getStore().get().model.text).toBe('gpt-5')
    controller.edit('model', 'gpt-5.6')
    controller.edit('searchContextSize', 'high')
    await controller.save()
    expect(getValue()).toMatchObject({ model: 'gpt-5.6', searchContextSize: 'high' })
    controller.edit('baseURL', 'not a URL')
    expect(controller.getStore().get().baseURL.invalid).toBe(true)
    controller.discard()
    controller.reset('model')
    await controller.save()
    expect(getValue().model).toBeUndefined()
  })
})
