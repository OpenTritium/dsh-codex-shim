import { describe, expect, it, vi } from 'vitest'

vi.mock(
  '@deepseek-ai/dsh-client-runtime/client',
  () => ({
    createSnapshotStore: <T>(initial: T) => {
      let value = initial
      return {
        get: () => value,
        set: (next: T) => {
          value = next
        },
        subscribe: () => () => {},
      }
    },
  }),
  { virtual: true },
)

const { CodexSettingsCardController } = await import('../src/client/settings-card-controller.ts')

function fixture() {
  let value: Record<string, unknown> = {
    enabled: true,
    modelPatterns: ['gpt-5.6-*'],
    modelOverrides: [],
  }
  let user: Record<string, unknown> | undefined
  let unsubscribed = false
  const scope = {
    getSnapshot: () => ({ status: 'ready', writable: true, value, user }),
    subscribe: () => () => {
      unsubscribed = true
    },
    set: async (field: string, next: unknown) => {
      value = { ...value, [field]: next }
      user = { ...user, [field]: next }
    },
    unset: async (field: string) => {
      const next = { ...value }
      delete next[field]
      value = next
      const nextUser = { ...user }
      delete nextUser[field]
      user = nextUser
    },
  }
  const api = {
    llm: {
      models: async () => ({
        result: {
          ok: true,
          value: {
            groups: [{ id: 'provider', name: 'Provider', models: [{ id: 'model-a', name: 'Model A' }] }],
            failures: [],
          },
        },
      }),
    },
  }
  const controller = new CodexSettingsCardController(scope as never, api as never)
  return { controller, getValue: () => value, wasUnsubscribed: () => unsubscribed }
}

describe('CodexSettingsCardController save and discard', () => {
  it('shows the composition default and persists an explicit pattern override', async () => {
    const { controller, getValue } = fixture()
    await new Promise((resolve) => setTimeout(resolve, 0))

    controller.edit('modelPatterns', '')
    await controller.save()
    expect(getValue().modelPatterns).toEqual([])
    expect(controller.getStore().get().modelPatterns.overridden).toBe(true)

    controller.edit('modelPatterns', 'deepseek-v4-*')
    await controller.save()
    expect(getValue().modelPatterns).toEqual(['deepseek-v4-*'])
    controller.dispose()
  })

  it('discards staged model exceptions and persists explicit decisions', async () => {
    const { controller, getValue, wasUnsubscribed } = fixture()
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(controller.getStore().get().models).toEqual([])
    expect(controller.getStore().get().modelPatterns.text).toBe('gpt-5.6-*')
    expect(controller.getStore().get().modelPatterns.overridden).toBe(false)

    controller.addModelException('provider', 'model-a')
    expect(controller.getStore().get().dirty).toBe(true)
    controller.discard()
    expect(controller.getStore().get().models).toEqual([])
    expect(controller.getStore().get().dirty).toBe(false)

    controller.addModelException('provider', 'model-a')
    await controller.save()
    expect(getValue().modelOverrides).toEqual([{ provider: 'provider', model: 'model-a', enabled: true }])
    expect(controller.getStore().get().dirty).toBe(false)

    controller.setModelDecision('provider', 'model-a', 'disabled')
    controller.discard()
    expect(controller.getStore().get().models[0]?.decision).toBe('enabled')

    controller.removeModelException('provider', 'model-a')
    await controller.save()
    expect(getValue().modelOverrides).toEqual([])
    expect(controller.getStore().get().models).toEqual([])
    controller.dispose()
    controller.dispose()
    expect(wasUnsubscribed()).toBe(true)
  })
})
